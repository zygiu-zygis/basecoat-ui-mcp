// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Deterministic composition validation. Diagnostics suggest repairs; never mutate state.
import { registry as componentRegistry } from '../registry/index.js';
import { findContainmentCycle, isContainmentAncestor } from './relations.js';
import { LIMITS } from './schema.js';
import type {
  BoundRule,
  CompiledMacroRegistry,
  Connection,
  DesignSession,
  Diagnostic,
  Id,
  MacroBlock,
  NodeInstance,
  PagePlan,
  Port,
  Recipe,
  Ref,
  RepairSuggestion,
  Slot,
  ValidationReport,
} from './types.js';

const COMPONENT_IDS = new Set(componentRegistry.index.map(item => item.id));

const SHELL_SLOTS = ['navigation', 'header', 'content'] as const;
const DATA_ROLES = new Set(['filters', 'table', 'data-table', 'selection-summary', 'pagination']);
const DATA_BINDING_KEY = 'data-context';
const NAV_CONTROL_CONTRACT = 'nav-toggle';
const AUTH_FRAME_ROLES = new Set(['auth-frame', 'auth-shell']);
const APP_CHROME_ROLES = new Set([
  'application-shell',
  'shell',
  'navigation',
  'sidebar',
  'collapsible-sidebar',
  'persistent-sidebar',
  'workspace-header',
]);

export type ValidationMode = 'draft' | 'complete';

function clip(message: string): string {
  return message.length <= LIMITS.messageMax ? message : message.slice(0, LIMITS.messageMax);
}

function diag(
  code: string,
  severity: Diagnostic['severity'],
  message: string,
  extras: Omit<Diagnostic, 'code' | 'severity' | 'message' | 'repairs'> & {
    repairs?: RepairSuggestion[];
  } = {},
): Diagnostic {
  return {
    code,
    severity,
    message: clip(message),
    repairs: extras.repairs ?? [],
    ...(extras.page !== undefined ? { page: extras.page } : {}),
    ...(extras.node !== undefined ? { node: extras.node } : {}),
    ...(extras.slot !== undefined ? { slot: extras.slot } : {}),
    ...(extras.rule !== undefined ? { rule: extras.rule } : {}),
  };
}

function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  const sev = severityRank(a.severity) - severityRank(b.severity);
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  const page = (a.page ?? '').localeCompare(b.page ?? '');
  if (page !== 0) return page;
  const node = (a.node ?? '').localeCompare(b.node ?? '');
  if (node !== 0) return node;
  return (a.slot ?? '').localeCompare(b.slot ?? '');
}

function severityRank(severity: Diagnostic['severity']): number {
  switch (severity) {
    case 'error':
      return 0;
    case 'obligation':
      return 1;
    case 'warning':
      return 2;
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

function blockOf(
  registry: CompiledMacroRegistry,
  ref: Ref,
): MacroBlock | undefined {
  return registry.blocks[ref];
}

function slotById(block: MacroBlock, slotId: Id): Slot | undefined {
  return block.slots.find(slot => slot.id === slotId);
}

function portById(block: MacroBlock, portId: Id): Port | undefined {
  return block.ports.find(port => port.id === portId);
}

function childrenInSlot(page: PagePlan, parentId: Id, slotId: Id): NodeInstance[] {
  return Object.values(page.nodes)
    .filter(node => node.parent?.node === parentId && node.parent.slot === slotId)
    .sort((a, b) => {
      const order = (a.parent?.order ?? 0) - (b.parent?.order ?? 0);
      return order !== 0 ? order : a.id.localeCompare(b.id);
    });
}

function isShellBlock(block: MacroBlock): boolean {
  if (block.role === 'application-shell' || block.family === 'shell') return true;
  if (block.tags.includes('application-shell') || block.tags.includes('shell')) return true;
  const slotIds = new Set(block.slots.map(slot => slot.id));
  return SHELL_SLOTS.every(id => slotIds.has(id));
}

function isCollapsibleNav(block: MacroBlock): boolean {
  if (block.tags.includes('persistent-sidebar') || block.role === 'persistent-sidebar') {
    return false;
  }
  if (block.tags.includes('collapsible-nav') || block.role === 'collapsible-sidebar') {
    return true;
  }
  return block.ports.some(
    port =>
      port.contract === NAV_CONTROL_CONTRACT ||
      (port.kind === 'region' && port.direction === 'in' && port.scope === 'shell'),
  );
}

function isPersistentNav(block: MacroBlock): boolean {
  return block.tags.includes('persistent-sidebar') || block.role === 'persistent-sidebar';
}

function isAuthRecipe(recipe: Recipe | undefined, block?: MacroBlock): boolean {
  if (recipe?.kind === 'flow') {
    if (recipe.id.includes('auth') || recipe.id.includes('sign-in')) return true;
  }
  if (block && (AUTH_FRAME_ROLES.has(block.role) || block.family === 'auth' || block.tags.includes('auth'))) {
    return true;
  }
  return Boolean(recipe && (recipe.id.includes('auth') || recipe.id.includes('sign-in')));
}

function authForbidsAppChrome(recipe: Recipe | undefined, session: DesignSession): boolean {
  if (!recipe) return false;
  if (recipe.kind === 'flow' && (recipe.id.includes('auth') || recipe.id.includes('sign-in'))) {
    return true;
  }
  const decision = session.projectDecisions['auth-chrome'] ?? session.projectDecisions.authChrome;
  return decision === false || decision === 'forbidden';
}

function candidatesForAccepts(
  registry: CompiledMacroRegistry,
  accepts: readonly string[],
): Ref[] {
  const acceptSet = new Set(accepts);
  return Object.entries(registry.blocks)
    .filter(([, block]) => acceptSet.has(block.role))
    .map(([ref]) => ref)
    .sort()
    .slice(0, 8);
}

function shellRootFor(page: PagePlan, registry: CompiledMacroRegistry): NodeInstance | undefined {
  const root = page.nodes[page.root];
  if (!root) return undefined;
  const rootBlock = blockOf(registry, root.block);
  if (rootBlock && isShellBlock(rootBlock)) return root;
  for (const node of Object.values(page.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
    const block = blockOf(registry, node.block);
    if (block && isShellBlock(block)) return node;
  }
  return undefined;
}

function findShellAncestor(
  page: PagePlan,
  registry: CompiledMacroRegistry,
  nodeId: Id,
): Id | undefined {
  let current: NodeInstance | undefined = page.nodes[nodeId];
  const seen = new Set<Id>();
  while (current) {
    if (seen.has(current.id)) return undefined;
    seen.add(current.id);
    const block = blockOf(registry, current.block);
    if (block && isShellBlock(block)) return current.id;
    current = current.parent ? page.nodes[current.parent.node] : undefined;
  }
  return undefined;
}

function frameRefOf(registry: CompiledMacroRegistry, node: NodeInstance): Id | undefined {
  return blockOf(registry, node.block)?.layout.frameRef;
}

function reachableFromRoot(page: PagePlan): Set<Id> {
  const seen = new Set<Id>();
  const queue: Id[] = [];
  if (page.nodes[page.root]) {
    queue.push(page.root);
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const child of Object.values(page.nodes)) {
      if (child.parent?.node === id && !seen.has(child.id)) {
        queue.push(child.id);
      }
    }
  }
  return seen;
}

function connectionLinks(
  page: PagePlan,
  nodeId: Id,
  portId: Id,
): Connection[] {
  return page.connections.filter(
    connection =>
      (connection.from.node === nodeId && connection.from.port === portId) ||
      (connection.to.node === nodeId && connection.to.port === portId),
  );
}

function validateReferences(
  page: PagePlan,
  session: DesignSession,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  if (session.registryRevision !== registry.revision) {
    out.push(
      diag('REGISTRY_REVISION_MISMATCH', 'error', 'Session registry revision does not match loaded registry.', {
        page: page.id,
      }),
    );
  }
  if (!registry.profiles[session.profile]) {
    out.push(
      diag('UNKNOWN_PROFILE', 'error', `Pinned profile ref is missing from registry.`, {
        page: page.id,
        repairs: [{ kind: 'other', message: clip('Pin a profile present in the compiled registry.') }],
      }),
    );
  }
  if (!registry.recipes[page.recipe]) {
    out.push(
      diag('UNKNOWN_RECIPE', 'error', `Page recipe ref is missing from registry.`, {
        page: page.id,
      }),
    );
  }
  for (const node of Object.values(page.nodes)) {
    const block = blockOf(registry, node.block);
    if (!block) {
      out.push(
        diag('UNKNOWN_BLOCK_REF', 'error', `Node block ref is missing from registry.`, {
          page: page.id,
          node: node.id,
          repairs: [{ kind: 'replace_block', message: clip('Replace with a known block ref from the pinned registry.') }],
        }),
      );
      continue;
    }
    for (const ruleRef of block.ruleRefs) {
      if (!registry.rules[ruleRef]) {
        out.push(
          diag('UNKNOWN_RULE_REF', 'error', `Block rule ref is missing from registry.`, {
            page: page.id,
            node: node.id,
          }),
        );
      }
    }
    for (const componentRef of block.componentRefs) {
      if (!COMPONENT_IDS.has(componentRef)) {
        out.push(
          diag('UNKNOWN_COMPONENT_REF', 'warning', `Component ref "${componentRef}" is not in the approved catalog.`, {
            page: page.id,
            node: node.id,
          }),
        );
      }
    }
  }
}

function validateGraphShape(
  page: PagePlan,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  const root = page.nodes[page.root];
  if (!root) {
    out.push(
      diag('MISSING_ROOT', 'error', `Page root "${page.root}" is not present in nodes.`, {
        page: page.id,
      }),
    );
  } else if (root.parent) {
    out.push(
      diag('ROOT_HAS_PARENT', 'error', `Page root must not declare a parent.`, {
        page: page.id,
        node: root.id,
      }),
    );
  }

  const parentless = Object.values(page.nodes)
    .filter(node => !node.parent && node.id !== page.root)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const node of parentless) {
    out.push(
      diag('MULTIPLE_ROOTS', 'error', `Non-root node "${node.id}" has no parent.`, {
        page: page.id,
        node: node.id,
        repairs: [{ kind: 'attach_block', message: clip('Attach this node under the page root or remove it.') }],
      }),
    );
  }

  const cycle = findContainmentCycle(page);
  if (cycle) {
    out.push(
      diag('CONTAINMENT_CYCLE', 'error', `Containment cycle detected: ${cycle.join(' -> ')}.`, {
        page: page.id,
        node: cycle[0],
      }),
    );
  }

  const reachable = reachableFromRoot(page);
  for (const node of Object.values(page.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
    if (!reachable.has(node.id)) {
      out.push(
        diag('UNREACHABLE_NODE', 'error', `Node is not reachable from page root via containment.`, {
          page: page.id,
          node: node.id,
        }),
      );
    }
    if (node.parent) {
      const parent = page.nodes[node.parent.node];
      if (!parent) {
        out.push(
          diag('UNKNOWN_PARENT', 'error', `Parent node "${node.parent.node}" does not exist.`, {
            page: page.id,
            node: node.id,
            slot: node.parent.slot,
          }),
        );
        continue;
      }
      const parentBlock = blockOf(registry, parent.block);
      if (!parentBlock) continue;
      const slot = slotById(parentBlock, node.parent.slot);
      if (!slot) {
        out.push(
          diag('UNKNOWN_SLOT', 'error', `Parent block has no slot "${node.parent.slot}".`, {
            page: page.id,
            node: node.id,
            slot: node.parent.slot,
          }),
        );
        continue;
      }
      const childBlock = blockOf(registry, node.block);
      if (childBlock && slot.accepts.length > 0 && !slot.accepts.includes(childBlock.role)) {
        out.push(
          diag('SLOT_ROLE_REJECTED', 'error', `Role "${childBlock.role}" is not accepted by slot "${slot.id}".`, {
            page: page.id,
            node: node.id,
            slot: slot.id,
            repairs: [
              {
                kind: 'replace_block',
                message: clip(`Use a block whose role is one of: ${slot.accepts.join(', ')}.`),
                candidateRefs: candidatesForAccepts(registry, slot.accepts),
                slot: slot.id,
              },
            ],
          }),
        );
      }
    }
  }

  // Slot capacity per parent/slot.
  const parents = new Set(
    Object.values(page.nodes)
      .map(node => node.parent?.node)
      .filter((id): id is Id => Boolean(id)),
  );
  if (page.nodes[page.root]) parents.add(page.root);
  for (const parentId of [...parents].sort()) {
    const parent = page.nodes[parentId];
    if (!parent) continue;
    const parentBlock = blockOf(registry, parent.block);
    if (!parentBlock) continue;
    for (const slot of parentBlock.slots) {
      const kids = childrenInSlot(page, parentId, slot.id);
      if (kids.length > slot.max) {
        out.push(
          diag('SLOT_CAPACITY_EXCEEDED', 'error', `Slot "${slot.id}" has ${kids.length} children; max is ${slot.max}.`, {
            page: page.id,
            node: parentId,
            slot: slot.id,
          }),
        );
      }
      if (kids.length < slot.min) {
        out.push(
          diag('SLOT_CAPACITY_SHORT', 'obligation', `Slot "${slot.id}" needs at least ${slot.min} child; has ${kids.length}.`, {
            page: page.id,
            node: parentId,
            slot: slot.id,
            repairs: [
              {
                kind: 'attach_block',
                message: clip(`Attach an approved block into slot "${slot.id}".`),
                candidateRefs: candidatesForAccepts(registry, slot.accepts),
                slot: slot.id,
              },
            ],
          }),
        );
      }
    }
  }
}

function validatePortsAndConnections(
  page: PagePlan,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  const seenConnectionIds = new Set<Id>();
  for (const connection of page.connections) {
    if (seenConnectionIds.has(connection.id)) {
      out.push(
        diag('DUPLICATE_CONNECTION_ID', 'error', `Duplicate connection id "${connection.id}".`, {
          page: page.id,
        }),
      );
    }
    seenConnectionIds.add(connection.id);

    const fromNode = page.nodes[connection.from.node];
    const toNode = page.nodes[connection.to.node];
    if (!fromNode) {
      out.push(
        diag('UNKNOWN_ENDPOINT_NODE', 'error', `Connection from-node is missing.`, {
          page: page.id,
        }),
      );
      continue;
    }
    if (!toNode) {
      out.push(
        diag('UNKNOWN_ENDPOINT_NODE', 'error', `Connection to-node is missing.`, {
          page: page.id,
        }),
      );
      continue;
    }
    const fromBlock = blockOf(registry, fromNode.block);
    const toBlock = blockOf(registry, toNode.block);
    if (!fromBlock || !toBlock) continue;
    const fromPort = portById(fromBlock, connection.from.port);
    const toPort = portById(toBlock, connection.to.port);
    if (!fromPort) {
      out.push(
        diag('UNKNOWN_PORT', 'error', `From-port "${connection.from.port}" is not declared.`, {
          page: page.id,
          node: fromNode.id,
          repairs: [{ kind: 'connect_ports', message: clip('Use a declared out port.'), port: connection.from.port }],
        }),
      );
      continue;
    }
    if (!toPort) {
      out.push(
        diag('UNKNOWN_PORT', 'error', `To-port "${connection.to.port}" is not declared.`, {
          page: page.id,
          node: toNode.id,
          repairs: [{ kind: 'connect_ports', message: clip('Use a declared in port.'), port: connection.to.port }],
        }),
      );
      continue;
    }
    if (fromPort.direction !== 'out' || toPort.direction !== 'in') {
      out.push(
        diag('PORT_DIRECTION_MISMATCH', 'error', `Connection must run out -> in.`, {
          page: page.id,
          node: fromNode.id,
        }),
      );
    }
    if (fromPort.contract !== toPort.contract) {
      out.push(
        diag('PORT_CONTRACT_MISMATCH', 'error', `Port contracts differ ("${fromPort.contract}" vs "${toPort.contract}").`, {
          page: page.id,
          node: fromNode.id,
        }),
      );
    }
    if (fromPort.kind !== toPort.kind) {
      out.push(
        diag('PORT_KIND_MISMATCH', 'error', `Port kinds differ ("${fromPort.kind}" vs "${toPort.kind}").`, {
          page: page.id,
          node: fromNode.id,
        }),
      );
    }
    const expectedRelation = fromPort.kind === 'data' || toPort.kind === 'data' ? 'data' : 'controls';
    if (connection.relation !== expectedRelation && !(fromPort.kind === 'control' && connection.relation === 'controls')) {
      if (
        (fromPort.kind === 'data' && connection.relation !== 'data') ||
        (fromPort.kind !== 'data' && connection.relation === 'data')
      ) {
        out.push(
          diag('PORT_RELATION_MISMATCH', 'error', `Connection relation "${connection.relation}" does not match port kind.`, {
            page: page.id,
            node: fromNode.id,
          }),
        );
      }
    }

    if (fromPort.scope === 'shell' || toPort.scope === 'shell') {
      const fromShell = findShellAncestor(page, registry, fromNode.id);
      const toShell = findShellAncestor(page, registry, toNode.id);
      if (!fromShell || !toShell || fromShell !== toShell) {
        out.push(
          diag('CROSS_SHELL_CONNECTION', 'error', `Shell-scoped ports must connect within the same shell instance.`, {
            page: page.id,
            node: fromNode.id,
          }),
        );
      }
    }
  }

  for (const node of Object.values(page.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
    const block = blockOf(registry, node.block);
    if (!block) continue;
    for (const port of block.ports) {
      const links = connectionLinks(page, node.id, port.id);
      if (links.length > port.maxLinks) {
        out.push(
          diag('PORT_CARDINALITY_EXCEEDED', 'error', `Port "${port.id}" has ${links.length} links; max is ${port.maxLinks}.`, {
            page: page.id,
            node: node.id,
            repairs: [{ kind: 'connect_ports', message: clip('Disconnect excess links.'), port: port.id }],
          }),
        );
      }
      if (links.length < port.minLinks) {
        out.push(
          diag('PORT_MIN_LINKS_UNMET', 'obligation', `Port "${port.id}" needs at least ${port.minLinks} link(s).`, {
            page: page.id,
            node: node.id,
            repairs: [
              {
                kind: 'connect_ports',
                message: clip(`Connect port "${port.id}" (${port.direction}/${port.kind}/${port.contract}).`),
                port: port.id,
              },
            ],
          }),
        );
      }
    }
  }
}

function validateShellStructure(
  page: PagePlan,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  const shell = shellRootFor(page, registry);
  if (!shell) return;
  const shellBlock = blockOf(registry, shell.block);
  if (!shellBlock || !isShellBlock(shellBlock)) return;

  for (const slotId of SHELL_SLOTS) {
    const slot = slotById(shellBlock, slotId);
    if (!slot) continue;
    const kids = childrenInSlot(page, shell.id, slotId);
    if (kids.length === 0 && slot.min > 0) {
      // SLOT_CAPACITY_SHORT already covers min; add shell-specific code for next-step priority.
      out.push(
        diag(`SHELL_${slotId.toUpperCase()}_MISSING`, 'obligation', `Application shell is missing required "${slotId}" content.`, {
          page: page.id,
          node: shell.id,
          slot: slotId,
          repairs: [
            {
              kind: 'attach_block',
              message: clip(`Attach a ${slotId} block into the shell.`),
              candidateRefs: candidatesForAccepts(registry, slot.accepts),
              slot: slotId,
            },
          ],
        }),
      );
    }
  }

  const headerKids = childrenInSlot(page, shell.id, 'header');
  const contentKids = childrenInSlot(page, shell.id, 'content');
  const navKids = childrenInSlot(page, shell.id, 'navigation');

  // Header and content must share one layout frame (explicit same-frame rule or identical frameRef).
  if (headerKids.length > 0 && contentKids.length > 0) {
    const paired = [...headerKids, ...contentKids];
    const covered = page.rules.some(
      rule =>
        rule.type === 'same-frame' &&
        headerKids.every(h => rule.nodes.includes(h.id)) &&
        contentKids.every(c => rule.nodes.includes(c.id)),
    );
    if (!covered) {
      const frames = new Set(
        paired.map(kid => frameRefOf(registry, kid)).filter((frame): frame is Id => Boolean(frame)),
      );
      if (frames.size > 1) {
        out.push(
          diag('SHELL_FRAME_MISMATCH', 'error', 'Header and content do not share an approved content frame.', {
            page: page.id,
            node: shell.id,
            repairs: [
              {
                kind: 'other',
                message: clip('Align header/content frameRef values or add a same-frame bound rule.'),
              },
            ],
          }),
        );
      }
    }
  }

  // Collapsible navigation ports (skip persistent sidebars).
  for (const nav of navKids) {
    const navBlock = blockOf(registry, nav.block);
    if (!navBlock || isPersistentNav(navBlock) || !isCollapsibleNav(navBlock)) continue;

    const regionPort = navBlock.ports.find(
      port =>
        port.direction === 'in' &&
        (port.contract === NAV_CONTROL_CONTRACT || port.kind === 'region') &&
        port.scope === 'shell',
    );
    const headerWithControl = headerKids.find(header => {
      const headerBlock = blockOf(registry, header.block);
      return headerBlock?.ports.some(
        port =>
          port.direction === 'out' &&
          port.kind === 'control' &&
          (port.contract === NAV_CONTROL_CONTRACT || (regionPort && port.contract === regionPort.contract)) &&
          port.scope === 'shell',
      );
    });

    if (!headerWithControl) {
      out.push(
        diag('COLLAPSIBLE_NAV_CONTROL_MISSING', 'obligation', `Collapsible navigation requires a header control port.`, {
          page: page.id,
          node: nav.id,
          repairs: [
            {
              kind: 'replace_block',
              message: clip('Use a workspace header that exposes a shell-scoped nav control port.'),
              slot: 'header',
            },
          ],
        }),
      );
      continue;
    }

    const headerBlock = blockOf(registry, headerWithControl.block)!;
    const controlPort = headerBlock.ports.find(
      port =>
        port.direction === 'out' &&
        port.kind === 'control' &&
        port.scope === 'shell' &&
        (port.contract === NAV_CONTROL_CONTRACT || (regionPort && port.contract === regionPort.contract)),
    );
    if (!controlPort || !regionPort) continue;

    const linked = page.connections.some(
      connection =>
        connection.relation === 'controls' &&
        connection.from.node === headerWithControl.id &&
        connection.from.port === controlPort.id &&
        connection.to.node === nav.id &&
        connection.to.port === regionPort.id,
    );
    if (!linked) {
      out.push(
        diag('COLLAPSIBLE_NAV_CONNECTION_MISSING', 'obligation', `Header control must connect to collapsible navigation region.`, {
          page: page.id,
          node: nav.id,
          repairs: [
            {
              kind: 'connect_ports',
              message: clip('Connect header nav-control out port to sidebar region in port.'),
              port: controlPort.id,
            },
          ],
        }),
      );
    }

    const headerShell = findShellAncestor(page, registry, headerWithControl.id);
    const navShell = findShellAncestor(page, registry, nav.id);
    if (headerShell && navShell && headerShell !== navShell) {
      out.push(
        diag('COLLAPSIBLE_NAV_CROSS_SHELL', 'error', `Collapsible nav endpoints must belong to the same shell.`, {
          page: page.id,
          node: nav.id,
        }),
      );
    }
  }
}

function validateLandmarks(
  page: PagePlan,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  let mainTotal = 0;
  let headingTotal = 0;
  const mains: Id[] = [];
  const headings: Id[] = [];
  for (const node of Object.values(page.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
    const block = blockOf(registry, node.block);
    if (!block) continue;
    if (block.landmarks.main > 0) {
      mainTotal += block.landmarks.main;
      mains.push(node.id);
    }
    if (block.landmarks.primaryHeading > 0) {
      headingTotal += block.landmarks.primaryHeading;
      headings.push(node.id);
    }
  }
  if (mainTotal === 0) {
    out.push(
      diag('LANDMARK_MAIN_MISSING', 'obligation', `Page needs exactly one main landmark.`, {
        page: page.id,
        repairs: [{ kind: 'attach_block', message: clip('Attach a content block that declares main landmark=1.') }],
      }),
    );
  } else if (mainTotal > 1) {
    out.push(
      diag('LANDMARK_MAIN_DUPLICATE', 'error', `Page has ${mainTotal} main landmarks; exactly one is required.`, {
        page: page.id,
        node: mains[1],
        repairs: [{ kind: 'replace_block', message: clip('Remove or replace extra main-landmark blocks.') }],
      }),
    );
  }
  if (headingTotal === 0) {
    out.push(
      diag('LANDMARK_HEADING_MISSING', 'obligation', `Page needs a primary heading landmark.`, {
        page: page.id,
        repairs: [{ kind: 'attach_block', message: clip('Attach a title/header block with primaryHeading=1.') }],
      }),
    );
  } else if (headingTotal > 1) {
    out.push(
      diag('LANDMARK_HEADING_DUPLICATE', 'error', `Page has ${headingTotal} primary headings; exactly one is required.`, {
        page: page.id,
        node: headings[1],
      }),
    );
  }
}

function validateSharedData(
  page: PagePlan,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  const dataNodes = Object.values(page.nodes)
    .filter(node => {
      const block = blockOf(registry, node.block);
      return Boolean(block && (DATA_ROLES.has(block.role) || block.tags.includes('data-workspace')));
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  if (dataNodes.length === 0) return;

  // Accidental cross-table sharing: distinct table instances must not share binding unless a shared-data rule says so.
  const tables = dataNodes.filter(node => {
    const role = blockOf(registry, node.block)?.role;
    return role === 'table' || role === 'data-table';
  });
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const a = tables[i]!;
      const b = tables[j]!;
      const bindA = a.bindings[DATA_BINDING_KEY];
      const bindB = b.bindings[DATA_BINDING_KEY];
      if (!bindA || !bindB || bindA !== bindB) continue;
      const allowed = page.rules.some(
        rule =>
          rule.type === 'shared-data' &&
          rule.binding === bindA &&
          rule.nodes.includes(a.id) &&
          rule.nodes.includes(b.id),
      );
      if (!allowed) {
        out.push(
          diag('SHARED_DATA_CROSS_TABLE', 'error', `Tables "${a.id}" and "${b.id}" share binding "${bindA}" without a shared-data rule.`, {
            page: page.id,
            node: a.id,
            repairs: [
              {
                kind: 'other',
                message: clip('Use distinct data-context bindings, or declare an explicit shared-data rule.'),
              },
            ],
          }),
        );
      }
    }
  }
}

function validateBoundRule(
  rule: BoundRule,
  page: PagePlan,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  switch (rule.type) {
    case 'same-shell': {
      const shells = new Set<Id>();
      for (const nodeId of rule.nodes) {
        if (!page.nodes[nodeId]) {
          out.push(
            diag('RULE_UNKNOWN_NODE', 'error', `Rule references missing node "${nodeId}".`, {
              page: page.id,
              rule: rule.id,
              node: nodeId,
            }),
          );
          continue;
        }
        const shell = findShellAncestor(page, registry, nodeId);
        if (!shell) {
          out.push(
            diag('RULE_SAME_SHELL_VIOLATION', 'error', `Node "${nodeId}" is not under a shell.`, {
              page: page.id,
              rule: rule.id,
              node: nodeId,
            }),
          );
        } else {
          shells.add(shell);
        }
      }
      if (shells.size > 1) {
        out.push(
          diag('RULE_SAME_SHELL_VIOLATION', 'error', `Nodes in rule are not under one shell.`, {
            page: page.id,
            rule: rule.id,
          }),
        );
      }
      break;
    }
    case 'same-frame': {
      const frames = new Set<string>();
      for (const nodeId of rule.nodes) {
        const node = page.nodes[nodeId];
        if (!node) {
          out.push(
            diag('RULE_UNKNOWN_NODE', 'error', `Rule references missing node "${nodeId}".`, {
              page: page.id,
              rule: rule.id,
              node: nodeId,
            }),
          );
          continue;
        }
        const frame = frameRefOf(registry, node);
        if (frame) frames.add(frame);
      }
      if (frames.size > 1) {
        out.push(
          diag('RULE_SAME_FRAME_VIOLATION', 'error', `Nodes in rule do not share one layout frame.`, {
            page: page.id,
            rule: rule.id,
          }),
        );
      }
      break;
    }
    case 'ordered': {
      if (!page.nodes[rule.parent]) {
        out.push(
          diag('RULE_UNKNOWN_NODE', 'error', `Ordered rule parent is missing.`, {
            page: page.id,
            rule: rule.id,
            node: rule.parent,
          }),
        );
        break;
      }
      const actual = childrenInSlot(page, rule.parent, rule.slot).map(node => node.id);
      const expected = rule.nodes;
      const prefix = expected.every((id, index) => actual[index] === id);
      if (!prefix || actual.length < expected.length) {
        out.push(
          diag('RULE_ORDERED_VIOLATION', 'error', `Slot "${rule.slot}" order does not match ordered rule.`, {
            page: page.id,
            rule: rule.id,
            node: rule.parent,
            slot: rule.slot,
            repairs: [{ kind: 'other', message: clip(`Expected order: ${expected.join(', ')}.`) }],
          }),
        );
      }
      break;
    }
    case 'single-owner': {
      const owners: Id[] = [];
      for (const nodeId of rule.nodes) {
        const node = page.nodes[nodeId];
        if (!node) {
          out.push(
            diag('RULE_UNKNOWN_NODE', 'error', `Rule references missing node "${nodeId}".`, {
              page: page.id,
              rule: rule.id,
              node: nodeId,
            }),
          );
          continue;
        }
        const block = blockOf(registry, node.block);
        if (!block) continue;
        const boundary =
          rule.property === 'gutter' ? block.layout.gutterBoundary : block.layout.scrollBoundary;
        if (boundary === rule.boundary) {
          owners.push(nodeId);
        }
      }
      if (owners.length > 1) {
        out.push(
          diag('RULE_SINGLE_OWNER_VIOLATION', 'error', `Multiple nodes claim ${rule.property} ownership of "${rule.boundary}".`, {
            page: page.id,
            rule: rule.id,
            node: owners[1],
            repairs: [{ kind: 'replace_block', message: clip('Keep a single gutter/scroll owner per boundary.') }],
          }),
        );
      }
      // Nested region silently introducing conflicting owner for same boundary.
      for (const node of Object.values(page.nodes)) {
        if (rule.nodes.includes(node.id)) continue;
        const block = blockOf(registry, node.block);
        if (!block) continue;
        const boundary =
          rule.property === 'gutter' ? block.layout.gutterBoundary : block.layout.scrollBoundary;
        if (boundary !== rule.boundary) continue;
        const underOwner = rule.nodes.some(ownerId => isContainmentAncestor(page, ownerId, node.id));
        if (underOwner || rule.nodes.some(ownerId => isContainmentAncestor(page, node.id, ownerId))) {
          out.push(
            diag('LAYOUT_BOUNDARY_CONFLICT', 'error', `Nested region redeclares ${rule.property} owner for "${rule.boundary}".`, {
              page: page.id,
              rule: rule.id,
              node: node.id,
            }),
          );
        }
      }
      break;
    }
    case 'shared-data': {
      for (const nodeId of rule.nodes) {
        const node = page.nodes[nodeId];
        if (!node) {
          out.push(
            diag('RULE_UNKNOWN_NODE', 'error', `Rule references missing node "${nodeId}".`, {
              page: page.id,
              rule: rule.id,
              node: nodeId,
            }),
          );
          continue;
        }
        const binding = node.bindings[DATA_BINDING_KEY];
        if (binding !== rule.binding) {
          out.push(
            diag('RULE_SHARED_DATA_VIOLATION', 'error', `Node "${nodeId}" binding does not match shared-data rule.`, {
              page: page.id,
              rule: rule.id,
              node: nodeId,
              repairs: [
                {
                  kind: 'other',
                  message: clip(`Set bindings.${DATA_BINDING_KEY} to "${rule.binding}".`),
                },
              ],
            }),
          );
        }
      }
      break;
    }
    default: {
      const _exhaustive: never = rule;
      out.push(
        diag('RULE_UNKNOWN_TYPE', 'error', `Unsupported bound rule type.`, {
          page: page.id,
          rule: (_exhaustive as BoundRule).id,
        }),
      );
    }
  }
}

function validateLayoutBoundaries(
  page: PagePlan,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  type Key = string;
  const owners = new Map<Key, Id[]>();
  for (const node of Object.values(page.nodes)) {
    const block = blockOf(registry, node.block);
    if (!block) continue;
    if (block.layout.gutterBoundary) {
      const key = `gutter:${block.layout.gutterBoundary}`;
      const list = owners.get(key) ?? [];
      list.push(node.id);
      owners.set(key, list);
    }
    if (block.layout.scrollBoundary) {
      const key = `scroll:${block.layout.scrollBoundary}`;
      const list = owners.get(key) ?? [];
      list.push(node.id);
      owners.set(key, list);
    }
  }
  for (const [key, nodes] of [...owners.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (nodes.length <= 1) continue;
    // Allow multiple only when not nested against each other; nested conflict is an error.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        if (isContainmentAncestor(page, a, b) || isContainmentAncestor(page, b, a)) {
          const [property, boundary] = key.split(':') as ['gutter' | 'scroll', string];
          out.push(
            diag('LAYOUT_BOUNDARY_CONFLICT', 'error', `Nested ${property} ownership conflict on "${boundary}".`, {
              page: page.id,
              node: b,
            }),
          );
        }
      }
    }
  }
}

function validateAuthFlow(
  page: PagePlan,
  session: DesignSession,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  const recipe = registry.recipes[page.recipe];
  const root = page.nodes[page.root];
  const rootBlock = root ? blockOf(registry, root.block) : undefined;
  if (!isAuthRecipe(recipe, rootBlock ?? undefined)) return;

  if (recipe && !recipe.pages.some(candidate => candidate.id === recipe.entryPage) && !session.pages[recipe.entryPage]) {
    // Entry may be namespaced in the session; check session pages that share this recipe.
  }
  if (recipe && !Object.values(session.pages).some(p => p.id === recipe.entryPage || p.recipe === page.recipe)) {
    // no-op; reachability checked below against session route graph
  }

  if (rootBlock && !AUTH_FRAME_ROLES.has(rootBlock.role) && rootBlock.family !== 'auth' && !rootBlock.tags.includes('auth-frame')) {
    const hasAuthFrame = Object.values(page.nodes).some(node => {
      const block = blockOf(registry, node.block);
      return Boolean(
        block &&
          (AUTH_FRAME_ROLES.has(block.role) || block.family === 'auth' || block.tags.includes('auth-frame')),
      );
    });
    if (!hasAuthFrame) {
      out.push(
        diag('AUTH_FRAME_MISSING', 'obligation', `Auth page should use the selected auth frame.`, {
          page: page.id,
          node: page.root,
          repairs: [{ kind: 'replace_block', message: clip('Use an auth-frame root block for this flow page.') }],
        }),
      );
    }
  }

  if (authForbidsAppChrome(recipe, session)) {
    for (const node of Object.values(page.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
      const block = blockOf(registry, node.block);
      if (!block) continue;
      if (APP_CHROME_ROLES.has(block.role) || block.tags.includes('app-chrome')) {
        out.push(
          diag('AUTH_NAV_CHROME_FORBIDDEN', 'error', `Auth recipe forbids application navigation chrome.`, {
            page: page.id,
            node: node.id,
            repairs: [{ kind: 'other', message: clip('Remove shell/sidebar chrome from auth pages.') }],
          }),
        );
      }
    }
  }

  // Route link integrity for this page's endpoints.
  for (const link of session.routeLinks) {
    if (link.fromPage !== page.id && link.toPage !== page.id) continue;
    if (!session.pages[link.fromPage]) {
      out.push(
        diag('AUTH_ROUTE_LINK_INVALID', 'error', `Route link fromPage "${link.fromPage}" is missing.`, {
          page: page.id,
        }),
      );
    }
    if (!session.pages[link.toPage]) {
      out.push(
        diag('AUTH_ROUTE_LINK_INVALID', 'error', `Route link toPage "${link.toPage}" is missing.`, {
          page: page.id,
        }),
      );
    }
    const fromPage = session.pages[link.fromPage];
    if (fromPage) {
      const fromNode = Object.values(fromPage.nodes).find(node => {
        const block = blockOf(registry, node.block);
        return block?.fragments.some(fragment => fragment.id === link.fromAnchor.fragment);
      });
      // Soft check: anchor fragment should exist on some block on the from page.
      const anchorOk = Object.values(fromPage.nodes).some(node => {
        const block = blockOf(registry, node.block);
        return Boolean(block?.fragments.some(fragment => fragment.id === link.fromAnchor.fragment));
      });
      if (!anchorOk) {
        out.push(
          diag('AUTH_ROUTE_LINK_INVALID', 'error', `Route link anchor fragment "${link.fromAnchor.fragment}" is missing on from page.`, {
            page: link.fromPage,
            node: fromNode?.id,
          }),
        );
      }
    }
  }
}

function validateAuthReachability(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  const authPages = Object.values(session.pages)
    .filter(page => {
      const recipe = registry.recipes[page.recipe];
      const root = page.nodes[page.root];
      const rootBlock = root ? blockOf(registry, root.block) : undefined;
      return isAuthRecipe(recipe, rootBlock);
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  if (authPages.length === 0) return;

  // Prefer recipe entry pages; fall back to lexicographically first auth page.
  const entryIds = new Set<Id>();
  for (const page of authPages) {
    const recipe = registry.recipes[page.recipe];
    if (!recipe?.entryPage) continue;
    const entryCandidates = Object.values(session.pages)
      .filter(
        candidate =>
          candidate.recipe === page.recipe &&
          (candidate.id === recipe.entryPage || candidate.id.endsWith(`-${recipe.entryPage}`)),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    if (entryCandidates.length > 0) {
      for (const candidate of entryCandidates) entryIds.add(candidate.id);
    } else {
      // Keep the authored id so the missing-entry diagnostic remains explicit.
      entryIds.add(recipe.entryPage);
    }
  }
  if (entryIds.size === 0 && authPages[0]) entryIds.add(authPages[0].id);

  for (const entry of [...entryIds].sort()) {
    if (!session.pages[entry]) {
      out.push(
        diag('AUTH_ENTRY_MISSING', 'error', `Auth flow entry page "${entry}" is missing from the session.`, {}),
      );
    }
  }

  const adjacency = new Map<Id, Id[]>();
  for (const page of authPages) adjacency.set(page.id, []);
  for (const link of session.routeLinks) {
    if (!adjacency.has(link.fromPage) || !adjacency.has(link.toPage)) continue;
    adjacency.get(link.fromPage)!.push(link.toPage);
  }

  const reachable = new Set<Id>();
  const queue = [...entryIds].filter(id => session.pages[id]);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (!reachable.has(next)) queue.push(next);
    }
  }

  for (const page of authPages) {
    if (!reachable.has(page.id)) {
      out.push(
        diag('AUTH_PAGE_UNREACHABLE', 'obligation', `Auth page is not reachable from the flow entry.`, {
          page: page.id,
          repairs: [{ kind: 'other', message: clip('Add routeLinks from the entry (or prior step) to this page.') }],
        }),
      );
    }
  }
}

function validateDecisions(
  page: PagePlan,
  session: DesignSession,
  registry: CompiledMacroRegistry,
  out: Diagnostic[],
): void {
  const profile = registry.profiles[session.profile];
  if (!profile) return;

  for (const [key, value] of Object.entries(page.decisions).sort(([a], [b]) => a.localeCompare(b))) {
    const spec = profile.allowedDecisions[key];
    if (!spec) {
      out.push(
        diag('DECISION_UNKNOWN_KEY', 'error', `Decision "${key}" is not allowed by the profile.`, {
          page: page.id,
          repairs: [{ kind: 'set_decision', message: clip('Remove or replace with a profile-approved key.') }],
        }),
      );
      continue;
    }
    if (!spec.allowPageOverride && Object.hasOwn(session.projectDecisions, key)) {
      // page override of a shared key without permission
      if (session.projectDecisions[key] !== value) {
        out.push(
          diag('DECISION_OVERRIDE_FORBIDDEN', 'error', `Page cannot override shared decision "${key}".`, {
            page: page.id,
            repairs: [{ kind: 'set_decision', message: clip('Align page decision with the project value.') }],
          }),
        );
      }
    }
    if (spec.type === 'enum' && spec.values && !spec.values.some(candidate => candidate === value)) {
      out.push(
        diag('DECISION_INVALID_VALUE', 'error', `Decision "${key}" value is not in the allowed enum.`, {
          page: page.id,
          repairs: [{ kind: 'set_decision', message: clip('Pick an allowed enum value.') }],
        }),
      );
    }
  }
}

function finalizeReport(mode: ValidationMode, diagnostics: Diagnostic[]): ValidationReport {
  const sorted = [...diagnostics].sort(compareDiagnostics);
  const errorCount = sorted.filter(item => item.severity === 'error').length;
  const obligationCount = sorted.filter(item => item.severity === 'obligation').length;
  const warningCount = sorted.filter(item => item.severity === 'warning').length;
  const ok = mode === 'draft' ? errorCount === 0 : errorCount === 0 && obligationCount === 0;
  return {
    mode,
    ok,
    errorCount,
    obligationCount,
    warningCount,
    diagnostics: sorted,
  };
}

/**
 * Validate one page graph. Totals cover the full diagnostic set (callers paginate later).
 */
export function validatePage(
  page: PagePlan,
  session: DesignSession,
  registry: CompiledMacroRegistry,
  mode: ValidationMode,
): ValidationReport {
  const out: Diagnostic[] = [];
  validateReferences(page, session, registry, out);
  validateGraphShape(page, registry, out);
  validatePortsAndConnections(page, registry, out);
  validateShellStructure(page, registry, out);
  validateLandmarks(page, registry, out);
  validateSharedData(page, registry, out);
  validateLayoutBoundaries(page, registry, out);
  for (const rule of page.rules) {
    validateBoundRule(rule, page, registry, out);
  }
  validateAuthFlow(page, session, registry, out);
  validateDecisions(page, session, registry, out);

  if (page.status === 'plan-ready') {
    const provisional = finalizeReport('complete', out);
    if (!provisional.ok) {
      out.push(
        diag('PLAN_READY_INCOMPLETE', 'error', `Page is marked plan-ready but complete validation fails.`, {
          page: page.id,
        }),
      );
    }
  }

  return finalizeReport(mode, out);
}

/**
 * Validate an entire design session. Totals are computed before any pagination.
 */
export function validateDesign(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  mode: ValidationMode,
): ValidationReport {
  const out: Diagnostic[] = [];
  if (session.registryRevision !== registry.revision) {
    out.push(
      diag('REGISTRY_REVISION_MISMATCH', 'error', 'Session registry revision does not match loaded registry.', {}),
    );
  }
  if (!registry.profiles[session.profile]) {
    out.push(diag('UNKNOWN_PROFILE', 'error', 'Pinned profile ref is missing from registry.', {}));
  }

  for (const page of Object.values(session.pages).sort((a, b) => a.id.localeCompare(b.id))) {
    const report = validatePage(page, session, registry, mode);
    out.push(...report.diagnostics);
  }

  validateAuthReachability(session, registry, out);

  for (const link of session.routeLinks) {
    if (!session.pages[link.fromPage] || !session.pages[link.toPage]) {
      out.push(
        diag('AUTH_ROUTE_LINK_INVALID', 'error', `Route link references a missing page.`, {
          page: link.fromPage,
        }),
      );
    }
  }

  // Deduplicate identical diagnostics that validatePage and session-level checks may both emit.
  const seen = new Set<string>();
  const unique: Diagnostic[] = [];
  for (const item of out) {
    const key = [item.code, item.severity, item.page ?? '', item.node ?? '', item.slot ?? '', item.rule ?? '', item.message].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return finalizeReport(mode, unique);
}
