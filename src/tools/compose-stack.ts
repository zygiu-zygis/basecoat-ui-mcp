// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export interface ComponentStackItem {
  id: string;
  category: string;
  name: string;
  description: string;
  slotTarget?: string;
  components: string[];
  fsmContracts: string[];
  dependencies: { js: string[]; css?: string[] };
  html: string;
}

export interface ComponentStacksCatalog {
  schemaVersion: number;
  totalStacks: number;
  categories: string[];
  stacks: ComponentStackItem[];
}

function loadStacksCatalog(): ComponentStacksCatalog {
  const urlPath = fileURLToPath(new URL('../data/catalog/component-stacks.json', import.meta.url));
  if (existsSync(urlPath)) {
    return JSON.parse(readFileSync(urlPath, 'utf-8'));
  }
  const altPath = urlPath.includes('/dist/')
    ? urlPath.replace('/dist/', '/src/')
    : urlPath.replace('/src/', '/dist/');
  if (existsSync(altPath)) {
    return JSON.parse(readFileSync(altPath, 'utf-8'));
  }
  return JSON.parse(readFileSync(urlPath, 'utf-8'));
}

const stacksCatalog: ComponentStacksCatalog = loadStacksCatalog();

export const composeStackInputShape = {
  shellId: z
    .string()
    .max(80)
    .optional()
    .describe(
      'Shell architecture ID from shell-stacks: sidebar-01..sidebar-16, topbar-shell, inset-shell, or split-shell. Defaults to sidebar-07.',
    ),
  headerId: z
    .string()
    .max(80)
    .optional()
    .describe(
      'Optional header stack ID from header-stacks: breadcrumb-command-header, tabs-filter-header, or date-range-export-header.',
    ),
  stacks: z
    .array(z.string().max(80))
    .max(12)
    .optional()
    .describe(
      'Ordered list of component stack IDs to hydrate into the shell slots (e.g., ["kpi-4-col-delta", "area-revenue-stack", "data-table-full-crud", "detail-inspector-drawer", "field-group-settings"]). Also accepts category shorthands: "kpi", "chart", "table", "form", "overlay".',
    ),
  title: z
    .string()
    .max(120)
    .optional()
    .describe('Optional workspace/page title to inject into the shell header.'),
  density: z
    .enum(['compact', 'standard', 'comfortable'])
    .optional()
    .describe('Optical spacing density mode. Defaults to standard.'),
};

export type ComposeStackInput = z.infer<z.ZodObject<typeof composeStackInputShape>>;

export interface ComposeStackOutput {
  shellId: string;
  headerId?: string;
  appliedStacks: string[];
  density: 'compact' | 'standard' | 'comfortable';
  componentsUsed: string[];
  fsmContracts: string[];
  dependencies: { js: string[]; css?: string[] };
  html: string;
  availableStacksByCategory: Record<string, string[]>;
  nextStep: string;
}

const CATEGORY_SHORTHANDS: Record<string, string> = {
  kpi: 'kpi-4-col-delta',
  chart: 'area-revenue-stack',
  table: 'data-table-full-crud',
  form: 'field-group-settings',
  overlay: 'detail-inspector-drawer',
  header: 'breadcrumb-command-header',
};

function replaceSlot(
  html: string,
  slotName: string,
  replacementHtml: string,
): { html: string; replaced: boolean } {
  const regex = new RegExp(
    `<([a-zA-Z0-9\\-]+)([^>]*\\bdata-slot=["']${slotName}["'][^>]*)>`,
    'i',
  );
  const match = regex.exec(html);
  if (!match) return { html, replaced: false };

  const startIndex = match.index;
  const tagName = match[1]!.toLowerCase();
  const startTagEnd = startIndex + match[0].length;

  if (match[0].endsWith('/>')) {
    return {
      html: html.slice(0, startIndex) + replacementHtml + html.slice(startTagEnd),
      replaced: true,
    };
  }

  let depth = 1;
  const openOrClose = new RegExp(`<\/${tagName}[^>]*>|<${tagName}\\b[^>]*>`, 'gi');
  openOrClose.lastIndex = startTagEnd;

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = openOrClose.exec(html)) !== null) {
    if (tagMatch[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        const endIndex = tagMatch.index + tagMatch[0].length;
        return {
          html: html.slice(0, startIndex) + replacementHtml + html.slice(endIndex),
          replaced: true,
        };
      }
    } else {
      if (!tagMatch[0].endsWith('/>')) depth++;
    }
  }

  return { html, replaced: false };
}

function insertInsideSlot(
  html: string,
  slotName: string,
  contentToInsert: string,
): { html: string; inserted: boolean } {
  const regex = new RegExp(
    `<([a-zA-Z0-9\\-]+)([^>]*\\bdata-slot=["']${slotName}["'][^>]*)>`,
    'i',
  );
  const match = regex.exec(html);
  if (!match) return { html, inserted: false };

  const tagName = match[1]!.toLowerCase();
  const startTagEnd = match.index + match[0].length;
  let depth = 1;
  const openOrClose = new RegExp(`<\/${tagName}[^>]*>|<${tagName}\\b[^>]*>`, 'gi');
  openOrClose.lastIndex = startTagEnd;

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = openOrClose.exec(html)) !== null) {
    if (tagMatch[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        const closingTagStart = tagMatch.index;
        return {
          html:
            html.slice(0, closingTagStart) +
            '\n' +
            contentToInsert +
            '\n' +
            html.slice(closingTagStart),
          inserted: true,
        };
      }
    } else {
      if (!tagMatch[0].endsWith('/>')) depth++;
    }
  }

  return { html, inserted: false };
}

export function runComposeStack(input: ComposeStackInput): ComposeStackOutput {
  const shellStacks = stacksCatalog.stacks.filter(s => s.category === 'shell-stacks');
  const validShellIds = shellStacks.map(s => s.id);

  const rawShellId = input.shellId ?? 'sidebar-07';
  const shell = shellStacks.find(s => s.id === rawShellId);
  if (!shell) {
    throw new Error(
      `Unknown shell ID: "${rawShellId}". Valid shell IDs: ${validShellIds.join(', ')}`,
    );
  }

  const headerStacks = stacksCatalog.stacks.filter(s => s.category === 'header-stacks');
  const validHeaderIds = headerStacks.map(s => s.id);

  let resolvedHeaderId: string | undefined = undefined;
  let headerStack: ComponentStackItem | undefined = undefined;
  if (input.headerId) {
    const rawHeaderId =
      CATEGORY_SHORTHANDS[input.headerId.toLowerCase()] ?? input.headerId;
    headerStack = headerStacks.find(s => s.id === rawHeaderId);
    if (!headerStack) {
      throw new Error(
        `Unknown header stack ID: "${input.headerId}". Valid header IDs: ${validHeaderIds.join(', ')}`,
      );
    }
    resolvedHeaderId = headerStack.id;
  }

  let composedHtml = shell.html;
  const appliedStacks: string[] = [];
  const componentsUsed = new Set<string>(shell.components);
  const fsmContracts = new Set<string>(shell.fsmContracts);
  const jsDependencies = new Set<string>(shell.dependencies?.js ?? []);

  // Hydrate header if specified
  if (headerStack) {
    const headerReplace = replaceSlot(composedHtml, 'header', headerStack.html);
    if (headerReplace.replaced) {
      composedHtml = headerReplace.html;
    } else {
      const headerInsert = insertInsideSlot(composedHtml, 'main-content', headerStack.html);
      if (headerInsert.inserted) composedHtml = headerInsert.html;
    }
    appliedStacks.push(headerStack.id);
    for (const c of headerStack.components) componentsUsed.add(c);
    for (const f of headerStack.fsmContracts) fsmContracts.add(f);
    for (const js of headerStack.dependencies?.js ?? []) jsDependencies.add(js);
  }

  // Hydrate content stacks
  const requestedStacks = input.stacks ?? [];
  for (const rawStackId of requestedStacks) {
    const normalizedId =
      CATEGORY_SHORTHANDS[rawStackId.toLowerCase()] ?? rawStackId;
    const stack = stacksCatalog.stacks.find(s => s.id === normalizedId);
    if (!stack) {
      const validIds = stacksCatalog.stacks
        .filter(s => s.category !== 'shell-stacks')
        .map(s => s.id);
      throw new Error(
        `Unknown stack ID: "${rawStackId}". Valid stack IDs: ${validIds.join(', ')} (or shorthands: ${Object.keys(CATEGORY_SHORTHANDS).join(', ')})`,
      );
    }

    const slotTarget = stack.slotTarget ?? 'main-content';

    if (slotTarget === 'overlays') {
      const overlayInsert = insertInsideSlot(composedHtml, 'overlays', stack.html);
      if (overlayInsert.inserted) {
        composedHtml = overlayInsert.html;
      } else {
        const lastDiv = composedHtml.lastIndexOf('</div>');
        if (lastDiv !== -1) {
          composedHtml =
            composedHtml.slice(0, lastDiv) +
            '\n' +
            stack.html +
            '\n' +
            composedHtml.slice(lastDiv);
        } else {
          composedHtml += '\n' + stack.html;
        }
      }
    } else {
      const slotReplace = replaceSlot(composedHtml, slotTarget, stack.html);
      if (slotReplace.replaced) {
        composedHtml = slotReplace.html;
      } else {
        const mainInsert = insertInsideSlot(composedHtml, 'main-content', stack.html);
        if (mainInsert.inserted) {
          composedHtml = mainInsert.html;
        } else {
          const lastDiv = composedHtml.lastIndexOf('</div>');
          if (lastDiv !== -1) {
            composedHtml =
              composedHtml.slice(0, lastDiv) +
              '\n' +
              stack.html +
              '\n' +
              composedHtml.slice(lastDiv);
          } else {
            composedHtml += '\n' + stack.html;
          }
        }
      }
    }

    appliedStacks.push(stack.id);
    for (const c of stack.components) componentsUsed.add(c);
    for (const f of stack.fsmContracts) fsmContracts.add(f);
    for (const js of stack.dependencies?.js ?? []) jsDependencies.add(js);
  }

  // Inject title if specified
  if (input.title) {
    if (/<span class="font-medium text-foreground">[^<]+<\/span>/i.test(composedHtml)) {
      composedHtml = composedHtml.replace(
        /<span class="font-medium text-foreground">[^<]+<\/span>/i,
        `<span class="font-medium text-foreground">${input.title}</span>`,
      );
    } else if (/<h1[^>]*>[^<]+<\/h1>/i.test(composedHtml)) {
      composedHtml = composedHtml.replace(
        /<h1([^>]*)>[^<]+<\/h1>/i,
        `<h1$1>${input.title}</h1>`,
      );
    }
  }

  // Apply optical density adjustments
  const density = input.density ?? 'standard';
  if (density === 'compact') {
    composedHtml = composedHtml
      .replace(/\bp-6\b/g, 'p-4')
      .replace(/\bgap-6\b/g, 'gap-4')
      .replace(/\bh-14\b/g, 'h-12')
      .replace(/\bpx-6\b/g, 'px-4');
  } else if (density === 'comfortable') {
    composedHtml = composedHtml
      .replace(/\bp-6\b/g, 'p-8')
      .replace(/\bgap-6\b/g, 'gap-8');
  }

  // Prepare catalog categorization overview
  const availableStacksByCategory: Record<string, string[]> = {};
  for (const cat of stacksCatalog.categories) {
    availableStacksByCategory[cat] = stacksCatalog.stacks
      .filter(s => s.category === cat)
      .map(s => s.id);
  }

  return {
    shellId: shell.id,
    headerId: resolvedHeaderId,
    appliedStacks,
    density,
    componentsUsed: Array.from(componentsUsed).sort(),
    fsmContracts: Array.from(fsmContracts).sort(),
    dependencies: {
      js: Array.from(jsDependencies).sort(),
    },
    html: composedHtml,
    availableStacksByCategory,
    nextStep:
      "Stack composed successfully. Call 'basecoat_quality_inspector' with html to verify accessibility and token compliance, or retrieve charts via 'basecoat_get_chart_blueprint'.",
  };
}
