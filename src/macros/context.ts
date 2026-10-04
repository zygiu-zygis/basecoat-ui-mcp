// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Focused design-session context views. Pure reads; no filesystem writes.
import { LIMITS } from './schema.js';
import type {
  CompiledMacroRegistry,
  ContextRecord,
  ContextRequest,
  DesignPatchOp,
  DesignSession,
  Diagnostic,
  Id,
  MacroBlock,
  NextStep,
  PagePlan,
  Scalar,
  SessionSummary,
} from './types.js';
import { validateDesign, validatePage } from './validate.js';
import { calculateNodePlanDigest } from './store.js';


function clip(message: string): string {
  return message.length <= LIMITS.messageMax ? message : message.slice(0, LIMITS.messageMax);
}

function blockOf(registry: CompiledMacroRegistry, ref: string): MacroBlock | undefined {
  return registry.blocks[ref];
}

function pageStatus(pages: Record<Id, PagePlan>): SessionSummary['status'] {
  const statuses = Object.values(pages).map(page => page.status);
  if (statuses.length === 0) return 'draft';
  if (statuses.every(status => status === 'plan-ready')) return 'plan-ready';
  if (statuses.every(status => status === 'draft')) return 'draft';
  return 'mixed';
}

function revisionHeader(session: DesignSession): { designId: Id; designRevision: number } {
  return { designId: session.id, designRevision: session.revision };
}

function ancestorsOf(page: PagePlan, nodeId: Id): Id[] {
  const chain: Id[] = [];
  let current = page.nodes[nodeId];
  const seen = new Set<Id>();
  while (current?.parent) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    chain.push(current.parent.node);
    current = page.nodes[current.parent.node];
  }
  return chain;
}

function siblingsOf(page: PagePlan, nodeId: Id): Id[] {
  const node = page.nodes[nodeId];
  if (!node?.parent) return [];
  return Object.values(page.nodes)
    .filter(
      candidate =>
        candidate.id !== nodeId &&
        candidate.parent?.node === node.parent!.node &&
        candidate.parent.slot === node.parent!.slot,
    )
    .sort((a, b) => {
      const order = (a.parent?.order ?? 0) - (b.parent?.order ?? 0);
      return order !== 0 ? order : a.id.localeCompare(b.id);
    })
    .map(candidate => candidate.id);
}

function decisionProvenance(
  session: DesignSession,
  page: PagePlan | undefined,
  key: string,
  profileDefault: unknown,
): 'project' | 'page' | 'profile-default' | 'unset' {
  if (page && Object.hasOwn(page.decisions, key)) return 'page';
  if (Object.hasOwn(session.projectDecisions, key)) return 'project';
  if (profileDefault !== undefined) return 'profile-default';
  return 'unset';
}

function effectiveDecisions(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  pageId?: Id,
): ContextRecord[] {
  const profile = registry.profiles[session.profile];
  const page = pageId ? session.pages[pageId] : undefined;
  const keys = new Set<string>([
    ...Object.keys(profile?.allowedDecisions ?? {}),
    ...Object.keys(session.projectDecisions),
    ...Object.keys(page?.decisions ?? {}),
  ]);
  return [...keys]
    .sort()
    .map(key => {
      const spec = profile?.allowedDecisions[key];
      let value: Scalar | undefined;
      if (page && Object.hasOwn(page.decisions, key)) {
        value = page.decisions[key];
      } else if (Object.hasOwn(session.projectDecisions, key)) {
        value = session.projectDecisions[key];
      } else {
        value = spec?.defaultValue;
      }
      return {
        ...revisionHeader(session),
        key,
        value: value === undefined ? null : value,
        provenance: decisionProvenance(session, page, key, spec?.defaultValue),
        shared: Boolean(profile?.sharedDecisionKeys.includes(key)),
        allowPageOverride: spec?.allowPageOverride ?? false,
        ...(pageId ? { pageId } : {}),
      };
    });
}

/**
 * Build a sessions list from store summaries (tools layer). Each record includes designRevision.
 */
export function buildSessionsView(summaries: readonly SessionSummary[]): ContextRecord[] {
  return [...summaries]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(summary => ({
      designId: summary.id,
      designRevision: summary.revision,
      profile: summary.profile,
      pageCount: summary.pageCount,
      status: summary.status,
    }));
}

function overviewRecords(session: DesignSession, registry: CompiledMacroRegistry): ContextRecord[] {
  const pages = Object.values(session.pages)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(page => ({
      id: page.id,
      route: page.route,
      status: page.status,
      nodeCount: Object.keys(page.nodes).length,
      connectionCount: page.connections.length,
      ruleCount: page.rules.length,
    }));
  const records: ContextRecord[] = [
    {
      ...revisionHeader(session),
      kind: 'overview',
      registryRevision: session.registryRevision,
      profile: session.profile,
      profilePresent: Boolean(registry.profiles[session.profile]),
      pageCount: pages.length,
      status: pageStatus(session.pages),
      checkpointCount: session.checkpoints.length,
      routeLinkCount: session.routeLinks.length,
    },
  ];
  for (const page of pages) {
    records.push({
      ...revisionHeader(session),
      kind: 'overview-page',
      pageId: page.id,
      route: page.route,
      status: page.status,
      nodeCount: page.nodeCount,
      connectionCount: page.connectionCount,
      ruleCount: page.ruleCount,
    });
  }
  return records;
}


function graphRecords(session: DesignSession, request: ContextRequest): ContextRecord[] {
  const pages = Object.values(session.pages).sort((a, b) => a.id.localeCompare(b.id));
  const selected = request.pageId ? pages.filter(page => page.id === request.pageId) : pages;
  const records: ContextRecord[] = [];
  for (const page of selected) {
    for (const node of Object.values(page.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
      records.push({
        ...revisionHeader(session),
        kind: 'node',
        pageId: page.id,
        nodeId: node.id,
        block: node.block,
        parent: node.parent ?? null,
        bindings: node.bindings,
      });
    }
    for (const connection of [...page.connections].sort((a, b) => a.id.localeCompare(b.id))) {
      records.push({
        ...revisionHeader(session),
        kind: 'connection',
        pageId: page.id,
        connectionId: connection.id,
        relation: connection.relation,
        from: connection.from,
        to: connection.to,
      });
    }
  }
  return records;
}

function rulesRecords(session: DesignSession, request: ContextRequest): ContextRecord[] {
  const pages = Object.values(session.pages).sort((a, b) => a.id.localeCompare(b.id));
  const selected = request.pageId ? pages.filter(page => page.id === request.pageId) : pages;
  const records: ContextRecord[] = [];
  for (const page of selected) {
    for (const rule of [...page.rules].sort((a, b) => a.id.localeCompare(b.id))) {
      records.push({
        ...revisionHeader(session),
        kind: 'rule',
        pageId: page.id,
        rule,
      });
    }
  }
  return records;
}

function focusRecords(
  session: DesignSession,
  request: ContextRequest,
  registry: CompiledMacroRegistry,
): ContextRecord[] {
  const pageId = request.pageId;
  const nodeId = request.nodeId;
  if (!pageId || !nodeId) {
    return [
      {
        ...revisionHeader(session),
        kind: 'focus-error',
        code: 'FOCUS_TARGET_REQUIRED',
        message: clip('focus view requires pageId and nodeId.'),
      },
    ];
  }
  const page = session.pages[pageId];
  if (!page) {
    return [
      {
        ...revisionHeader(session),
        kind: 'focus-error',
        code: 'UNKNOWN_PAGE',
        message: clip(`Page "${pageId}" is not in this design.`),
      },
    ];
  }
  const node = page.nodes[nodeId];
  if (!node) {
    return [
      {
        ...revisionHeader(session),
        kind: 'focus-error',
        code: 'UNKNOWN_NODE',
        message: clip(`Node "${nodeId}" is not on page "${pageId}".`),
      },
    ];
  }

  const block = blockOf(registry, node.block);
  const report = validatePage(page, session, registry, 'draft');
  const obligations = report.diagnostics.filter(
    item =>
      item.severity === 'obligation' &&
      (item.node === nodeId ||
        item.node === undefined ||
        ancestorsOf(page, nodeId).includes(item.node ?? '') ||
        siblingsOf(page, nodeId).includes(item.node ?? '')),
  );
  const relatedConnections = page.connections.filter(
    connection => connection.from.node === nodeId || connection.to.node === nodeId,
  );
  const requiredPorts =
    block?.ports
      .filter(port => port.minLinks > 0)
      .map(port => ({
        id: port.id,
        direction: port.direction,
        kind: port.kind,
        contract: port.contract,
        minLinks: port.minLinks,
        maxLinks: port.maxLinks,
        scope: port.scope,
      })) ?? [];

  const compactObligations = obligations.map(compactDiagnostic);
  const planDigest = calculateNodePlanDigest(session, page, nodeId);
  const mainRecord: ContextRecord = {
    ...revisionHeader(session),
    kind: 'focus',
    pageId,
    nodeId,
    planDigest,
    block: node.block,
    role: block?.role ?? null,
    ancestors: ancestorsOf(page, nodeId),
    siblings: siblingsOf(page, nodeId),
    parent: node.parent ?? null,
    bindings: node.bindings,
    requiredPorts,
    slots: block?.slots.map(slot => ({
      id: slot.id,
      accepts: slot.accepts,
      min: slot.min,
      max: slot.max,
    })) ?? [],
    connections: relatedConnections.length <= 4 ? relatedConnections : [],
    obligations: compactObligations.length <= 4 ? compactObligations : [],
    connectionCount: relatedConnections.length,
    obligationCount: compactObligations.length,
  };

  const records: ContextRecord[] = [mainRecord];

  if (relatedConnections.length > 4) {
    for (const connection of relatedConnections) {
      records.push({
        ...revisionHeader(session),
        kind: 'focus-connection',
        pageId,
        nodeId,
        connection,
      });
    }
  }

  if (compactObligations.length > 4) {
    for (const obligation of compactObligations) {
      records.push({
        ...revisionHeader(session),
        kind: 'focus-obligation',
        pageId,
        nodeId,
        obligation,
      });
    }
  }

  return records;
}

function compactDiagnostic(item: Diagnostic): ContextRecord {
  return {
    code: item.code,
    severity: item.severity,
    message: item.message,
    ...(item.page ? { page: item.page } : {}),
    ...(item.node ? { node: item.node } : {}),
    ...(item.slot ? { slot: item.slot } : {}),
    ...(item.rule ? { rule: item.rule } : {}),
    repairs: item.repairs,
  };
}

function checkpointMissing(
  session: DesignSession,
  page: PagePlan,
  nodeId: Id,
): boolean {
  const currentDigest = calculateNodePlanDigest(session, page, nodeId);
  return !session.checkpoints.some(
    checkpoint =>
      checkpoint.page === page.id &&
      checkpoint.node === nodeId &&
      checkpoint.planDigest === currentDigest,
  );
}

function suggestedOpsFor(diagnostic: Diagnostic, pageId?: Id): DesignPatchOp[] | undefined {
  const repair = diagnostic.repairs[0];
  if (!repair || !pageId) return undefined;
  switch (repair.kind) {
    case 'attach_block':
      if (!repair.slot || !diagnostic.node || !repair.candidateRefs?.[0]) return undefined;
      return [
        {
          op: 'attach_block',
          page: pageId,
          parent: diagnostic.node,
          slot: repair.slot,
          node: `${diagnostic.node}-${repair.slot}-1`,
          block: repair.candidateRefs[0],
        },
      ];
    case 'connect_ports':
      return undefined;
    case 'set_decision':
      return undefined;
    case 'replace_block':
      if (!diagnostic.node || !repair.candidateRefs?.[0]) return undefined;
      return [
        {
          op: 'replace_block',
          page: pageId,
          node: diagnostic.node,
          block: repair.candidateRefs[0],
        },
      ];
    case 'other':
      return undefined;
    default: {
      const _exhaustive: never = repair.kind;
      return _exhaustive;
    }
  }
}

function priorityForCode(code: string): number {
  // 1 Blocking consistency
  if (
    code.startsWith('CONTAINMENT_') ||
    code.startsWith('UNKNOWN_') ||
    code.includes('CYCLE') ||
    (code.includes('MISMATCH') && !code.startsWith('SHELL_')) ||
    code === 'MISSING_ROOT' ||
    code === 'ROOT_HAS_PARENT' ||
    code === 'MULTIPLE_ROOTS' ||
    code === 'UNREACHABLE_NODE' ||
    code === 'SLOT_ROLE_REJECTED' ||
    code === 'SLOT_CAPACITY_EXCEEDED' ||
    code === 'PORT_CARDINALITY_EXCEEDED' ||
    code === 'PORT_DIRECTION_MISMATCH' ||
    code === 'PORT_CONTRACT_MISMATCH' ||
    code === 'PORT_KIND_MISMATCH' ||
    code === 'PORT_RELATION_MISMATCH' ||
    code === 'CROSS_SHELL_CONNECTION' ||
    code === 'LANDMARK_MAIN_DUPLICATE' ||
    code === 'LANDMARK_HEADING_DUPLICATE' ||
    code === 'SHARED_DATA_CROSS_TABLE' ||
    code === 'LAYOUT_BOUNDARY_CONFLICT' ||
    code === 'AUTH_NAV_CHROME_FORBIDDEN' ||
    code === 'AUTH_ENTRY_MISSING' ||
    code === 'AUTH_ROUTE_LINK_INVALID' ||
    code === 'COLLAPSIBLE_NAV_CROSS_SHELL' ||
    code === 'DECISION_UNKNOWN_KEY' ||
    code === 'DECISION_INVALID_VALUE' ||
    code === 'DECISION_OVERRIDE_FORBIDDEN' ||
    code === 'REGISTRY_REVISION_MISMATCH' ||
    code === 'PLAN_READY_INCOMPLETE' ||
    code.startsWith('RULE_') ||
    code === 'DUPLICATE_CONNECTION_ID' ||
    code === 'UNKNOWN_ENDPOINT_NODE' ||
    code === 'UNKNOWN_PORT' ||
    code === 'UNKNOWN_PARENT' ||
    code === 'UNKNOWN_SLOT'
  ) {
    return 1;
  }
  // 2 Missing shell structure
  if (code.startsWith('SHELL_')) return 2;
  // 3 Missing required slots and connections
  if (
    code === 'SLOT_CAPACITY_SHORT' ||
    code === 'PORT_MIN_LINKS_UNMET' ||
    code === 'COLLAPSIBLE_NAV_CONTROL_MISSING' ||
    code === 'COLLAPSIBLE_NAV_CONNECTION_MISSING'
  ) {
    return 3;
  }
  // 4 Page hierarchy and shared data bindings
  if (
    code === 'LANDMARK_MAIN_MISSING' ||
    code === 'LANDMARK_HEADING_MISSING' ||
    code === 'AUTH_FRAME_MISSING' ||
    code === 'AUTH_PAGE_UNREACHABLE' ||
    code.includes('SHARED_DATA')
  ) {
    return 4;
  }
  // 5 Write checkpoints (synthetic)
  if (code === 'CHECKPOINT_MISSING') return 5;
  // 6 Complete-plan validation leftovers / warnings
  return 6;
}

/**
 * Highest-priority next action. Priority order:
 * 1 blocking consistency, 2 shell structure, 3 required slots/connections,
 * 4 hierarchy/shared data, 5 missing checkpoints, 6 complete-plan leftovers.
 * Stable IDs break ties.
 */
export function selectNextStep(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  pageId?: Id,
): NextStep {
  const report = pageId && session.pages[pageId]
    ? validatePage(session.pages[pageId]!, session, registry, 'complete')
    : validateDesign(session, registry, 'complete');

  const candidates: NextStep[] = report.diagnostics
    .filter(item => item.severity === 'error' || item.severity === 'obligation')
    .map(item => {
      const suggestedOps = suggestedOpsFor(item, item.page);
      return {
        priority: priorityForCode(item.code),
        code: item.code,
        message: item.message,
        ...(item.page ? { page: item.page } : {}),
        ...(item.node ? { node: item.node } : {}),
        ...(suggestedOps ? { suggestedOps } : {}),
      };
    });

  // Priority 5: regions without a current-revision write checkpoint (only when structure is otherwise clear).
  const pages = pageId && session.pages[pageId]
    ? [session.pages[pageId]!]
    : Object.values(session.pages).sort((a, b) => a.id.localeCompare(b.id));
  for (const page of pages) {
    for (const node of Object.values(page.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
      if (!checkpointMissing(session, page, node.id)) continue;
      candidates.push({
        priority: 5,
        code: 'CHECKPOINT_MISSING',
        message: clip(`Node "${node.id}" has no valid write checkpoint for its current plan.`),
        page: page.id,
        node: node.id,
        suggestedOps: [
          {
            op: 'record_written',
            page: page.id,
            node: node.id,
            sourcePath: `src/pages/${page.id}/${node.id}.astro`,
            planDigest: calculateNodePlanDigest(session, page, node.id),
          },
        ],
      });
    }
  }

  if (candidates.length === 0) {
    return {
      priority: 6,
      code: 'DESIGN_COMPLETE',
      message: clip('No blocking issues or open obligations remain.'),
    };
  }

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const code = a.code.localeCompare(b.code);
    if (code !== 0) return code;
    const page = (a.page ?? '').localeCompare(b.page ?? '');
    if (page !== 0) return page;
    return (a.node ?? '').localeCompare(b.node ?? '');
  });

  return candidates[0]!;
}

/**
 * Build focused context records for a design session view.
 * Every record includes designRevision. Callers paginate the returned array.
 * For project-wide session lists, prefer buildSessionsView(summaries).
 */
export function buildContextView(
  session: DesignSession,
  request: ContextRequest,
  registry: CompiledMacroRegistry,
): ContextRecord[] {
  switch (request.view) {
    case 'sessions':
      return buildSessionsView([
        {
          id: session.id,
          revision: session.revision,
          profile: session.profile,
          pageCount: Object.keys(session.pages).length,
          status: pageStatus(session.pages),
        },
      ]);
    case 'overview':
      return overviewRecords(session, registry);
    case 'decisions':
      return effectiveDecisions(session, registry, request.pageId);
    case 'graph':
      return graphRecords(session, request);
    case 'rules':
      return rulesRecords(session, request);
    case 'focus':
      return focusRecords(session, request, registry);
    case 'next': {
      const step = selectNextStep(session, registry, request.pageId);
      return [{ ...revisionHeader(session), kind: 'next', ...step }];
    }
    default: {
      const _exhaustive: never = request.view;
      return [
        {
          ...revisionHeader(session),
          kind: 'error',
          code: 'UNKNOWN_VIEW',
          message: clip(`Unsupported context view: ${String(_exhaustive)}`),
        },
      ];
    }
  }
}
