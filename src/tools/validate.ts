// Copyright Žygimantas Jasiulionis / Intellmedia.
import { parseHtmlWithDiagnostics, scriptImports, type HtmlNode } from './html.js';
import { registry } from '../registry/index.js';
import { defaultSemanticsStore } from '../semantics/index.js';
import type { Id } from '../semantics/types.js';

export interface CompositionIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column?: number;
  repair?: string;
  semanticToken?: string;
  approvedUtility?: string;
}

/** Options for composition validation. */
export interface ValidationOptions {
  /** Semantic rhythm profile ID to validate against (e.g., 'default'). */
  semanticProfile?: Id;
  /** Project root path for rhythm overrides. */
  projectRoot?: string;
  /** Spacing density profile. Compact allows denser dashboard chrome. */
  densityProfile?: 'comfortable' | 'compact';
}

/** Shared UTF-8 byte limit for validate_composition input (validator + server schema). */
export const VALIDATE_COMPOSITION_MAX_BYTES = 262_144;

const LIMITATIONS = 'Static HTML/Framework heuristic: cannot resolve dynamic classes, imported layouts, external scripts, CSS overrides or runtime DOM. Missing imports may be supplied by a parent layout. This is not an accessibility or browser conformance audit.';
const RUNTIME_NETWORK = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|\b(?:axios|ky|graphql)\s*\(/;
const REACT_RUNTIME = /(?:^|[<\s])(?:import\s+React\b|from\s+['"]react(?:['"]|\/)|createRoot\s*\(|hydrateRoot\s*\(|useState\s*\(|useEffect\s*\(|<\s*[A-Z][\w.]*(?:\s|\/?>))/;
const SPACING_COMFORTABLE = new Set(['0', '2', '4', '6', '8', '12']);
const SPACING_COMPACT = new Set(['0', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '8', '12']);
const MICRO_SPACING = new Set(['1', '1.5', '2.5', '3', '5']);
const VARIANTS = new Set(['default', 'primary', 'secondary', 'outline', 'ghost', 'destructive', 'link']);
const ITEM_ANATOMY_CLASSES = new Set([
  'item-title', 'item-description', 'item-media', 'item-content', 'item-actions', 'item-header',
  'card-compact', 'subcard',
]);
// Curated local anatomy used by the offline dashboard fixture. These are
// deliberately metadata-backed project classes, not additions to Basecoat CSS.
const CURATED_COMPOSITION_CLASSES = new Set(['sidebar-backdrop', 'sidebar-icon']);
const ISSUE_CAP = 24;
const SIZES = new Set(['xs', 'default', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg']);
const BASECOAT_CLASSES = new Set(registry.upstream.css_classes);
const TAILWIND_OVERLAP = /^(?:table-(?:auto|fixed|caption|cell|column|column-group|footer-group|header-group|row|row-group)|select-(?:auto|all|none|text)|field-sizing-(?:content|fixed))$/;
// Reserve Basecoat component namespaces; unrelated project and Tailwind classes are allowed.
const COMPONENT_FAMILY = /^(?:ui-(?:card|button|input|dialog|tabs|table|select|textarea|badge|alert)(?:-[\w-]+)?|(?:btn|card|dialog|tabs|alert|alert-dialog|avatar|badge|breadcrumb|button-group|chart|combobox|command|drawer|dropdown-menu|empty|field|input|item|kbd|popover|progress|select|sidebar|skeleton|table|textarea|toast|toaster)-[\w-]+)$/;
const SEMANTIC_TOKEN = /^(?:p-density-|gap-rhythm-|text-(?:heading-|body$|muted$)|bg-surface-|border-subtle$)/;
const SAFE_ANCHOR = /^[a-z][a-z0-9-]*$/;
const TYPOGRAPHY_UTILITY = /^text-(?:xs|sm|base|lg|xl|[2-9]xl)$/;
const ARBITRARY_COLOR = /^(?:bg|border|text|from|via|to)-\[(?:#|rgba?\(|hsla?\(|oklch\(|lab\(|lch\(|color:|var\(--)/i;
const ARBITRARY_DIMENSION = /^(?:w|h|min-w|max-w|min-h|max-h|size|p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left)-\[\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|ch|dvh|svh|lvh)\]$/i;
const COLOR_NAMES = /^(?:transparent|current|inherit|black|white|background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring|chart-[1-5]|sidebar(?:-[a-z-]+)?|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))(?:\/\d{1,3})?$/;
const NON_COLOR_TEXT = /^(?:left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|xs|sm|base|lg|xl|[2-9]xl)$/;
const NON_COLOR_BORDER = /^(?:0|2|4|8|x|y|s|e|t|r|b|l|x-0|x-2|x-4|x-8|y-0|y-2|y-4|y-8|s-0|s-2|s-4|s-8|e-0|e-2|e-4|e-8|t-0|t-2|t-4|t-8|r-0|r-2|r-4|r-8|b-0|b-2|b-4|b-8|l-0|l-2|l-4|l-8|solid|dashed|dotted|double|hidden|none|collapse|separate)$/;
const NON_COLOR_BACKGROUND = /^(?:auto|cover|contain|fixed|local|scroll|clip-(?:border|padding|content|text)|origin-(?:border|padding|content)|(?:center|top|right|bottom|left)(?:-(?:top|bottom|left|right))?|no-repeat|repeat(?:-x|-y|-round|-space)?)$/;

/**
 * Canonical relative luminance (sRGB Y in [0, 1]) for Basecoat default neutral tokens in Light mode.
 * Used for deterministic WCAG 2.1 contrast ratio & APCA Lc evaluation of semantic token pairings.
 */
const SEMANTIC_TOKEN_LUMINANCE_LIGHT: Record<string, number> = {
  background: 1.0,
  card: 1.0,
  popover: 1.0,
  surface: 1.0,
  white: 1.0,
  secondary: 0.91,
  muted: 0.91,
  accent: 0.91,
  border: 0.82,
  input: 0.82,
  'muted-foreground': 0.175,
  destructive: 0.14,
  foreground: 0.008,
  'card-foreground': 0.008,
  'popover-foreground': 0.008,
  'secondary-foreground': 0.012,
  'accent-foreground': 0.012,
  primary: 0.012,
  black: 0.0,
  'primary-foreground': 0.97,
  'destructive-foreground': 0.97,
};

const EXPECTED_FOREGROUND_FOR_BG: Record<string, string> = {
  primary: 'text-primary-foreground',
  destructive: 'text-destructive-foreground',
  secondary: 'text-secondary-foreground',
  accent: 'text-accent-foreground',
  card: 'text-card-foreground (or text-foreground)',
  popover: 'text-popover-foreground (or text-foreground)',
  background: 'text-foreground',
  muted: 'text-foreground (or text-muted-foreground)',
};

function wcagContrastRatio(lumA: number, lumB: number): number {
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function apcaContrastLc(textLum: number, bgLum: number): number {
  const txtY = Math.max(0, textLum);
  const bgY = Math.max(0, bgLum);
  const sapc = bgY > txtY
    ? (Math.pow(bgY, 0.56) - Math.pow(txtY, 0.57)) * 1.14
    : (Math.pow(bgY, 0.65) - Math.pow(txtY, 0.62)) * 1.14;
  if (Math.abs(sapc) < 0.1) return 0;
  return Number(((sapc > 0 ? sapc - 0.027 : sapc + 0.027) * 100).toFixed(1));
}

function parseSemanticColorToken(cls: string, prefix: 'bg' | 'text'): { token: string; alpha: number } | null {
  if (!cls.startsWith(`${prefix}-`)) return null;
  const raw = cls.slice(prefix.length + 1).replace(/^color-/, '');
  const [tokenPart, alphaPart] = raw.split('/');
  if (!tokenPart || !(tokenPart in SEMANTIC_TOKEN_LUMINANCE_LIGHT)) return null;
  const alpha = alphaPart !== undefined ? Number(alphaPart) / 100 : 1;
  if (Number.isNaN(alpha) || alpha <= 0 || alpha > 1) return null;
  return { token: tokenPart, alpha };
}

function isMicroChromeContext(node: HtmlNode, nodes: HtmlNode[]): boolean {
  if (node.tag === 'a' || node.tag === 'nav' || node.tag === 'header' || node.tag === 'td' || node.tag === 'th') return true;
  const classes = node.classes.map(utility);
  if (classes.includes('badge') || classes.includes('sidebar') || classes.some(c => c.startsWith('badge-'))) {
    return true;
  }
  let parent = node.parent;
  while (parent !== null) {
    const ancestor = nodes[parent]!;
    if (
      ancestor.tag === 'nav' || ancestor.tag === 'header' ||
      ancestor.tag === 'td' ||
      ancestor.tag === 'th' ||
      ancestor.tag === 'table' ||
      ancestor.classes.map(utility).some(c => c === 'badge' || c === 'sidebar' || c.startsWith('badge-'))
    ) {
      return true;
    }
    parent = ancestor.parent;
  }
  return false;
}

function importedModule(value: string): string | undefined {
  const bare = /^basecoat-css\/([\w-]+)(?:\.min)?(?:\.js)?$/.exec(value);
  if (bare) return bare[1];
  return /(?:^|\/)([\w-]+)(?:\.min)?\.js(?:[?#].*)?$/.exec(value)?.[1];
}

/** Tailwind variants may contain colons in arbitrary selectors or values. */
function utility(token: string): string {
  let depth = 0; let start = 0;
  for (let i = 0; i < token.length; i++) {
    if (token[i] === '[' || token[i] === '(') depth++;
    else if (token[i] === ']' || token[i] === ')') depth = Math.max(0, depth - 1);
    else if (token[i] === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!|!$/g, '');
}

function isPrimary(node: HtmlNode): boolean {
  return node.classes.includes('btn-primary') || (node.classes.includes('btn') && (!node.attrs['data-variant'] || ['default', 'primary'].includes(node.attrs['data-variant']!)));
}

/** Get semantic token mappings for validation. */
interface SemanticContext {
  byUtility: Map<string, string>;
  byToken: Map<string, string>;
}

function getSemanticMappings(profileId?: Id, projectRoot?: string): SemanticContext | null {
  if (!profileId) return null;
  const profile = defaultSemanticsStore.getEffectiveRhythmProfile(profileId, projectRoot);
  const mappings = profile.families
    .flatMap(family => family.mappings)
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    byUtility: new Map(mappings.map(mapping => [mapping.value, mapping.id])),
    byToken: new Map(mappings.map(mapping => [mapping.id, mapping.value])),
  };
}

/** Check if a utility class has a semantic equivalent. */
function checkSemanticViolation(token: string, semanticMappings: SemanticContext | null): {
  message: string;
  repair: string;
  semanticToken: string;
  approvedUtility: string;
} | null {
  if (!semanticMappings) return null;
  const direct = semanticMappings.byUtility.get(token);
  if (direct) {
    return {
      message: `Approved implementation utility '${token}' maps to semantic token '${direct}'.`,
      repair: `Keep '${token}' as the executable class and record semantic token '${direct}' in design metadata.`,
      semanticToken: direct,
      approvedUtility: token,
    };
  }
  return null;
}

function isColorUtility(token: string): boolean {
  const match = /^(bg|border|text)-(.+)$/.exec(token);
  if (!match) return false;
  const [, family, value] = match;
  if (family === 'text' && NON_COLOR_TEXT.test(value!)) return false;
  if (family === 'border' && NON_COLOR_BORDER.test(value!)) return false;
  if (family === 'bg' && NON_COLOR_BACKGROUND.test(value!)) return false;
  return COLOR_NAMES.test(value!);
}

export function validateComposition(code: string, options: ValidationOptions = {}) {
  const issues: CompositionIssue[] = [];
  let truncated = false;
  let hasErrors = false;
  let droppedErrors = 0;
  const densityProfile = options.densityProfile === 'compact' ? 'compact' : 'comfortable';
  const spacingSteps = densityProfile === 'compact' ? SPACING_COMPACT : SPACING_COMFORTABLE;
  const seenSemanticUtilities = new Set<string>();
  const report = (
    rule: string,
    severity: CompositionIssue['severity'],
    message: string,
    line: number,
    repair?: string,
    details: Pick<CompositionIssue, 'column' | 'semanticToken' | 'approvedUtility'> = {},
  ) => {
    if (rule === 'semantic-token-available' && details.approvedUtility) {
      if (seenSemanticUtilities.has(details.approvedUtility)) return;
      seenSemanticUtilities.add(details.approvedUtility);
    }
    if (severity === 'error') hasErrors = true;
    if (issues.length >= ISSUE_CAP) {
      truncated = true;
      if (severity === 'error') droppedErrors++;
      if (severity !== 'info') {
        let infoIdx = -1;
        for (let idx = issues.length - 1; idx >= 0; idx--) {
          if (issues[idx]!.severity === 'info') {
            infoIdx = idx;
            break;
          }
        }
        if (infoIdx !== -1) {
          issues.splice(infoIdx, 1);
        } else {
          return;
        }
      } else {
        return;
      }
    }
    issues.push({
      rule,
      severity,
      message: message.slice(0, 240),
      line,
      ...details,
      ...(repair ? { repair: repair.slice(0, 240) } : {}),
    });
  };
  if (Buffer.byteLength(code, 'utf8') > VALIDATE_COMPOSITION_MAX_BYTES) {
    report('input-size', 'error', 'Code exceeds the 256 KiB UTF-8 limit. Validate a smaller component.', 1);
    return { valid: false, issues, truncated: true, limitations: LIMITATIONS };
  }
  if (/\p{Extended_Pictographic}/u.test(code)) {
    report('emoji-usage', 'error', 'Emojis are strictly forbidden. Use inline SVG (e.g., Phosphor Icons) instead.', 1);
  }
  if (/<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i.test(code)) {
    report('cdn-dependency', 'error', 'External dependencies (e.g. CDNs) for scripts or stylesheets are forbidden. Use local modules or inline SVGs.', 1);
  }
  if (RUNTIME_NETWORK.test(code)) {
    report(
      'runtime-network',
      'error',
      'Runtime network access is forbidden in offline compositions; keep data loading and transport in the host application.',
      1,
      'Remove fetch/XHR/WebSocket/EventSource and network client calls from the static composition.',
    );
  }
  if (REACT_RUNTIME.test(code)) {
    report(
      'react-runtime',
      'error',
      'React imports, runtime mounting, hooks, and JSX component output are forbidden in Basecoat compositions.',
      1,
      'Use framework-neutral Astro/HTML and keep runtime behavior in the host application.',
    );
  }
  const parsedHtml = parseHtmlWithDiagnostics(code);
  const nodes = parsedHtml.nodes;
  for (const diagnostic of parsedHtml.diagnostics) {
    report(
      `html-parser-${diagnostic.code}`,
      diagnostic.severity,
      diagnostic.message,
      diagnostic.line,
      undefined,
      { column: diagnostic.column },
    );
  }
  const scripts = nodes.filter(node => node.tag === 'script' && ['', 'module', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'].includes((node.attrs.type ?? '').trim().toLowerCase()));
  const importOrder = scripts.flatMap(node => node.attrs.src ? [node.attrs.src] : scriptImports(node.content ?? ''));
  const imported = new Set(importOrder);
  // A literal script src identifies an actual script, unlike a URL in prose or comments.
  for (const script of scripts) if (script.attrs.src) imported.add(script.attrs.src);

  // Initialize semantic validation if profile is specified
  let semanticMappings: SemanticContext | null = null;
  if (options.semanticProfile) {
    try {
      semanticMappings = getSemanticMappings(options.semanticProfile, options.projectRoot);
    } catch {
      report(
        'semantic-profile-invalid',
        'error',
        `Unknown or invalid semantic profile '${options.semanticProfile}'.`,
        1,
        'Use a compiled rhythm profile returned by get_rhythm_rules.',
      );
    }
  }
  const hasImport = (name: string) => [...imported].some(value => importedModule(value) === name);
  const bundle = hasImport('all');
  const required = new Map<string, number>();
  const primaryByParent = new Map<number | null, HtmlNode[]>();
  for (const script of scripts) {
    if (scriptImports(script.content ?? '').some(value => value.startsWith('basecoat-css/') && importedModule(value) === 'all')) {
      report('all-js-bundle', 'error', 'Do not import "basecoat-css/all". Import "basecoat-css/basecoat" followed by the granular modules the page uses.', script.line);
    }
    if (('is:inline' in script.attrs || script.attrs.type === 'module') && scriptImports(script.content ?? '').some(value => value.startsWith('basecoat-css/'))) {
      report('unbundled-bare-import', 'warning', 'In Astro, is:inline or explicit type="module" bypasses script bundling. Use a plain processed <script> for bare Basecoat imports; HTML needs an import map or browser URLs.', script.line);
    }
  }
  const DARK_CLASS_JS = /classList\.(?:toggle|add)\(\s*['"`]dark['"`]/;
  const THEME_KEY = /theme|mode|scheme|dark|appearance/i;
  const darkScript = scripts.find(script => DARK_CLASS_JS.test(script.content ?? ''));
  const darkMedia = nodes.find(node => node.tag === 'style' && /prefers-color-scheme\s*:\s*dark/i.test(node.content ?? ''));
  if (darkMedia && (darkScript || /\.dark(?![\w-])/.test(darkMedia.content ?? ''))) {
    report('theme-strategy-mixed', 'warning', 'Both @media (prefers-color-scheme: dark) and a .dark class strategy are present; dark tokens leak into light mode on dark-OS clients.', darkMedia.line, 'Keep class-based html.dark only. See basecoat://design/theming.');
  }
  for (const script of scripts) {
    const content = script.content ?? '';
    if (!DARK_CLASS_JS.test(content)) continue;
    const key = [...content.matchAll(/localStorage\.(?:get|set)Item\(\s*['"`]([^'"`]+)['"`]/g)]
      .map(match => match[1]!)
      .find(name => name !== 'themeMode' && THEME_KEY.test(name));
    if (key) report('theme-storage-key', 'warning', `Theme persisted under "${key}", but basecoat.theme.set() uses "themeMode"; two resolvers drift apart.`, script.line, 'Read/write "themeMode" with one shared default, or call window.basecoat.theme.set().');
  }
  const hasDarkClassStrategy = Boolean(
    darkScript ||
    nodes.some(n => n.classes.some(c => utility(c) === 'dark')) ||
    nodes.some(n => n.tag === 'style' && /\.dark(?![\w-])/.test(n.content ?? ''))
  );
  for (const node of nodes) {
    if (node.tag === 'meta' && node.attrs.name?.toLowerCase() === 'color-scheme') {
      const content = node.attrs.content?.toLowerCase() ?? '';
      if (content.includes('dark') && hasDarkClassStrategy) {
        report(
          'theme-meta-color-scheme',
          'warning',
          '<meta name="color-scheme" content="light dark"> leaks dark OS scrollbars/controls into light mode when using class-based html.dark. Set color-scheme: light on :root and color-scheme: dark on .dark instead.',
          node.line,
          'Set color-scheme: light on :root and color-scheme: dark on .dark in CSS instead of using meta color-scheme.',
        );
      }
    }
  }

  // Check responsive obligations
  for (const node of nodes) {
    const bp = node.attrs['data-mobile-breakpoint'];
    if (bp) {
      // Find node or any descendants
      let hasResponsive = node.classes.some(c => c.startsWith(`${bp}:`));
      if (!hasResponsive) {
        for (const descendant of nodes) {
          if (descendant === node) continue;
          let p = descendant.parent;
          let isChild = false;
          while (p !== null) {
            if (nodes[p] === node) { isChild = true; break; }
            p = nodes[p]!.parent;
          }
          if (isChild && descendant.classes.some(c => c.startsWith(`${bp}:`))) {
            hasResponsive = true;
            break;
          }
        }
      }
      if (!hasResponsive) {
        report('missing-responsive-utility', 'warning', `Node declares data-mobile-breakpoint="${bp}" but neither it nor its descendants use ${bp}: utility classes.`, node.line, `Add responsive utilities like ${bp}:hidden or ${bp}:grid-cols-*.`);
      }
    }
  }

  for (const node of nodes) {
    if (node.dynamic) report('dynamic-attributes', 'warning', 'Dynamic attributes cannot be checked completely; inspect their rendered classes and states.', node.line);
    const classes = node.classes.map(utility);
    const isSubcard =
      (classes.includes('card') || classes.includes('ui-card')) &&
      (node.attrs['data-variant'] === 'subcard' ||
        node.attrs['variant'] === 'subcard' ||
        node.attrs['data-role'] === 'subcard' ||
        classes.includes('card-compact') ||
        classes.includes('subcard'));
    if (classes.includes('card') || classes.includes('ui-card')) {
      if (!isSubcard) {
        let parent = node.parent;
        while (parent !== null) {
          const ancestor = nodes[parent]!;
          const isCanvas =
            ancestor.attrs['data-role'] === 'canvas' || ancestor.attrs['data-macro'] === 'canvas';
          if (
            !isCanvas &&
            ancestor.classes.some(value => ['card', 'ui-card'].includes(utility(value)))
          ) {
            report(
              'nested-cards',
              'warning',
              'Cards inside cards are discouraged. Use a flat section, list or divider, or mark with data-variant="subcard" or card-compact.',
              node.line,
              'Add data-variant="subcard", class "card-compact", or replace inner card with a section/divider.',
            );
            break;
          }
          parent = ancestor.parent;
        }

        const hasBorderUtility = classes.some(
          c => (c === 'border' || c === 'border-border' || c.startsWith('border-[')) && c !== 'border-0' && c !== 'border-none'
        );
        if (hasBorderUtility) {
          report(
            'card-double-border',
            'error',
            'The .card component inherently provides a 1px ring shadow (in Vega pack). Adding border utilities creates an ugly thick 2px double border.',
            node.line,
            'Remove the border utilities (e.g. border, border-border) from the .card element.',
          );
        }
      }
    }

    const isHeaderLandmark =
      node.tag === 'header' ||
      classes.includes('page-header') ||
      node.attrs['data-role'] === 'header' ||
      node.attrs['role'] === 'banner';
    if (isHeaderLandmark && classes.includes('h-16')) {
      report(
        'oversized-header',
        'warning',
        'Dashboard headers and app bars should be compact and balanced (shadcn aesthetic). h-16 is generally too tall for a data-dense UI.',
        node.line,
        'Change h-16 to h-12 or h-14.',
      );
    }
    for (const token of classes) {
      if (
        COMPONENT_FAMILY.test(token) &&
        !BASECOAT_CLASSES.has(token) &&
        !TAILWIND_OVERLAP.test(token) &&
        !ITEM_ANATOMY_CLASSES.has(token) &&
        !CURATED_COMPOSITION_CLASSES.has(token)
      ) report('invalid-basecoat-class', 'error', `Unknown Basecoat class ${token}; use the current component anatomy and data-variant/data-size attributes. Custom project classes should use a separate namespace.`, node.line);
      const spacing = /^(-?)(gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(.+)$/.exec(token);
      if (spacing) {
        const [, negative, family, value] = spacing;
        const allowedAuto = family!.startsWith('m') && value === 'auto' && !negative;
        const microAllowed =
          densityProfile === 'compact' &&
          !negative &&
          MICRO_SPACING.has(value!);
        const sidebarOffsetAllowed =
          !negative &&
          ['60', '64', '72'].includes(value!) &&
          /^[mp][selr]$/.test(family!);
        if ((!spacingSteps.has(value!) || !!negative) && !allowedAuto && !microAllowed && !sidebarOffsetAllowed) {
          if (!semanticMappings) {
            const allowed = [...spacingSteps].join(', ');
            report(
              'spacing-rhythm',
              'warning',
              `Use ${allowed} spacing steps; replace ${token}. Margin auto is allowed for alignment.`,
              node.line,
            );
          }
        }
      }
      if (/^(?:bg-(?:gradient|linear|radial|conic)(?:-|$)|bg-\[.*gradient\(|(?:from|via|to)-)/.test(token)) report('random-gradient', 'warning', `Remove decorative gradient utility ${token}; use a neutral surface and hierarchy.`, node.line);

      // Semantic validation: check for hardcoded utilities that have semantic equivalents
      if (semanticMappings) {
        const semanticUtility = semanticMappings.byToken.get(token);
        if (semanticUtility) {
          report(
            'semantic-token-as-utility',
            'error',
            `Semantic token '${token}' is an identity, not an executable Tailwind utility.`,
            node.line,
            `Use approved utility '${semanticUtility}' in class and keep '${token}' in design metadata.`,
            { semanticToken: token, approvedUtility: semanticUtility },
          );
          continue;
        }
        const semanticViolation = checkSemanticViolation(token, semanticMappings);
        if (semanticViolation) {
          report(
            'semantic-token-available',
            'info',
            semanticViolation.message,
            node.line,
            semanticViolation.repair,
            {
              semanticToken: semanticViolation.semanticToken,
              approvedUtility: semanticViolation.approvedUtility,
            },
          );
        }
        if (SEMANTIC_TOKEN.test(token) && !semanticMappings.byToken.has(token)) {
          report(
            'semantic-token-invalid',
            'error',
            `Semantic token '${token}' is not defined by profile '${options.semanticProfile}'.`,
            node.line,
            'Use an approved utility from get_rhythm_rules and keep its token ID in design metadata.',
          );
        }
        const hardcodedSpacing = semanticMappings.byToken.has(token)
          ? null
          : /^-?(?:gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(.+)$/.exec(token);
        if (hardcodedSpacing && hardcodedSpacing[1] !== '0' && hardcodedSpacing[1] !== 'auto' && !semanticMappings.byUtility.has(token)) {
          const val = hardcodedSpacing[1]!;
          const isMicroCompact = densityProfile === 'compact' && MICRO_SPACING.has(val);
          const isSidebarOffset = ['60', '64', '72'].includes(val) && !token.startsWith('-') && /^[mp][selr]-(?:60|64|72)$/.test(utility(token));
          if (!spacingSteps.has(val) && !isMicroCompact && !isSidebarOffset) {
            const allowed = [...spacingSteps].join(', ');
            report(
              'semantic-hardcoded-spacing',
              'warning',
              `Hardcoded spacing utility '${token}' is outside the selected semantic profile '${options.semanticProfile}'. Use approved steps (${allowed}) from get_rhythm_rules.`,
              node.line,
              'Choose a spacing or density mapping from get_rhythm_rules and apply its approved utility.',
            );
          }
        }
        if (TYPOGRAPHY_UTILITY.test(token) && !semanticMappings.byToken.has(token) && !semanticMappings.byUtility.has(token)) {
          report(
            'semantic-hardcoded-typography',
            'warning',
            `Hardcoded typography utility '${token}' is outside the selected semantic profile.`,
            node.line,
            'Choose a typography mapping from get_rhythm_rules and apply its approved utility.',
          );
        }
        if (isColorUtility(token) && !semanticMappings.byToken.has(token) && !semanticMappings.byUtility.has(token) && !/-(?:transparent|current|inherit)$/.test(token)) {
          report(
            'semantic-hardcoded-color',
            'warning',
            `Hardcoded color utility '${token}' is outside the selected semantic profile.`,
            node.line,
            'Choose a surface or border mapping from get_rhythm_rules and apply its approved utility.',
          );
        }
      }
      if (ARBITRARY_COLOR.test(token)) {
        report(
          'arbitrary-color',
          'error',
          `Arbitrary color utility '${token}' bypasses the approved theme.`,
          node.line,
          'Replace it with a semantic surface, text, or border token.',
        );
      }
      if (ARBITRARY_DIMENSION.test(token)) {
        report(
          'arbitrary-dimension',
          'error',
          `Arbitrary sizing utility '${token}' violates the 4px/8px optical rhythm scale.`,
          node.line,
          'Replace arbitrary bracket dimensions with standard Tailwind v4 spacing/sizing utilities (e.g. w-40, w-80, max-w-md, h-12, p-6).',
        );
      }
    }

    // --- WCAG 2.1 & APCA Semantic Token Contrast Validation ---
    const bgTokenInfo = classes.map(c => parseSemanticColorToken(c, 'bg')).find(Boolean) ?? null;
    const textTokenInfo = classes.map(c => parseSemanticColorToken(c, 'text')).find(Boolean) ?? null;
    let effectiveBg = bgTokenInfo;
    if (!effectiveBg && textTokenInfo) {
      let p = node.parent;
      while (p !== null) {
        const ancestorBg = nodes[p]!.classes.map(utility).map(c => parseSemanticColorToken(c, 'bg')).find(Boolean);
        if (ancestorBg) {
          effectiveBg = ancestorBg;
          break;
        }
        p = nodes[p]!.parent;
      }
      if (!effectiveBg) {
        effectiveBg = { token: 'background', alpha: 1 };
      }
    }
    if (effectiveBg && textTokenInfo) {
      const bgLum = SEMANTIC_TOKEN_LUMINANCE_LIGHT[effectiveBg.token]!;
      const rawTextLum = SEMANTIC_TOKEN_LUMINANCE_LIGHT[textTokenInfo.token]!;
      const blendedTextLum = rawTextLum * textTokenInfo.alpha + bgLum * (1 - textTokenInfo.alpha);
      const ratio = wcagContrastRatio(bgLum, blendedTextLum);
      const lc = Math.abs(apcaContrastLc(blendedTextLum, bgLum));
      const isLargeText = classes.some(c => /^text-(?:lg|xl|[2-9]xl)$/.test(c)) || /^h[1-3]$/.test(node.tag);
      const minRatio = isLargeText ? 3.0 : 4.5;
      const minLc = isLargeText ? 45 : 60;
      if (ratio < minRatio || lc < minLc) {
        const suggested = EXPECTED_FOREGROUND_FOR_BG[effectiveBg.token] ?? 'text-foreground';
        report(
          'color-contrast-wcag',
          'error',
          `Insufficient contrast between 'bg-${effectiveBg.token}' and 'text-${textTokenInfo.token}${textTokenInfo.alpha < 1 ? `/${Math.round(textTokenInfo.alpha * 100)}` : ''}' (WCAG ${ratio}:1 < ${minRatio}:1, APCA Lc ${lc} < ${minLc}).`,
          node.line,
          `Pair 'bg-${effectiveBg.token}' with '${suggested}' to satisfy WCAG 2.1 AA and APCA contrast.`,
        );
      }
    }

    if (classes.includes('btn')) {
      const variant = node.attrs['data-variant'];
      const size = node.attrs['data-size'];
      if (variant !== undefined && !VARIANTS.has(variant)) report('button-variant', 'error', `Unknown button data-variant ${JSON.stringify(variant)}. Use default, primary, secondary, outline, ghost, destructive or link.`, node.line);
      if (size !== undefined && !SIZES.has(size)) report('button-size', 'error', `Unknown button data-size ${JSON.stringify(size)}. Use xs, sm, default, lg, icon, icon-xs, icon-sm or icon-lg.`, node.line);
    }
    if (isPrimary(node)) {
      const group = primaryByParent.get(node.parent) ?? [];
      group.push(node); primaryByParent.set(node.parent, group);
    }
    // These components have dedicated Basecoat behavior; native dialog uses application JS.
    for (const component of ['tabs', 'accordion', 'select', 'combobox', 'dropdown-menu', 'popover', 'sidebar', 'drawer', 'command', 'toast', 'range']) {
      const isRangeInput = component === 'range' && node.tag === 'input' && node.attrs.type?.toLowerCase() === 'range';
      if ((classes.includes(component) || (component === 'range' && classes.includes('slider')) || isRangeInput) && !(component === 'select' && node.tag === 'select') && !required.has(component)) required.set(component, node.line);
    }

    // --- Accessibility (a11y) structural heuristics for generated macros ---
    if (node.tag === 'img' && node.attrs.alt === undefined) {
      report('a11y-img-alt', 'warning', 'Image is missing an alt attribute. Provide alt="" for decorative images or a description for meaningful ones.', node.line);
    }
    if (node.tag === 'button' || node.attrs.role === 'button') {
      const hasAriaLabel = node.attrs['aria-label'] || node.attrs['aria-labelledby'];
      const isIconSize = node.attrs['data-size'] && node.attrs['data-size']!.startsWith('icon');
      if (isIconSize && !hasAriaLabel) {
        report('a11y-button-icon-label', 'error', 'Icon button must have an aria-label for screen readers.', node.line);
      }
    }
    if (node.tag === 'nav' || node.tag === 'aside') {
      const hasAriaLabel = node.attrs['aria-label'] || node.attrs['aria-labelledby'];
      if (!hasAriaLabel) {
        report('a11y-landmark-label', 'warning', `The <${node.tag}> landmark should have an aria-label or aria-labelledby to distinguish it from other landmarks.`, node.line);
      }
    }
    if (node.tag === 'input' && !['hidden', 'submit', 'button', 'reset'].includes(node.attrs.type?.toLowerCase() || '')) {
      const hasId = !!node.attrs.id;
      const hasAriaLabel = node.attrs['aria-label'] || node.attrs['aria-labelledby'];
      let isInsideLabel = false;
      let p = node.parent;
      while (p !== null) {
        if (nodes[p]!.tag === 'label') { isInsideLabel = true; break; }
        p = nodes[p]!.parent;
      }
      if (!hasId && !hasAriaLabel && !isInsideLabel) {
        report('a11y-input-label', 'warning', 'Input field should have an id (to bind with <label for="id">), an aria-label, or be nested inside a <label>.', node.line);
      }
    }

    // --- ARIA Expanded / Controls Binding Check ---
    if (node.attrs['aria-expanded'] !== undefined) {
      const controlsId = node.attrs['aria-controls']?.trim();
      let insideManagedController = false;
      let p: number | null = node.index;
      while (p !== null) {
        const anc: HtmlNode = nodes[p]!;
        const ancClasses = anc.classes.map(utility);
        if (
          anc.tag === 'details' ||
          anc.tag === 'dialog' ||
          ancClasses.some((c: string) => ['dropdown-menu', 'popover', 'select', 'combobox', 'accordion', 'sidebar'].includes(c))
        ) {
          insideManagedController = true;
          break;
        }
        p = anc.parent;
      }
      if (controlsId) {
        const targetExists = nodes.some(n => n.attrs.id === controlsId);
        if (!targetExists) {
          report(
            'a11y-aria-controls-binding',
            'warning',
            `Trigger declares aria-controls="${controlsId}", but no element with id="${controlsId}" exists in the composition.`,
            node.line,
            `Add id="${controlsId}" to the controlled panel or menu element.`,
          );
        }
      } else if (!insideManagedController) {
        report(
          'a11y-aria-controls-binding',
          'warning',
          'Interactive trigger with aria-expanded is missing an aria-controls="<panel-id>" binding.',
          node.line,
          'Add aria-controls="<target-id>" on the trigger and matching id="<target-id>" on the controlled region.',
        );
      }
    }

    // --- Modal Dialog Keyboard Focus Trap Heuristic ---
    const isModalDialog =
      node.attrs.role === 'dialog' ||
      node.attrs.role === 'alertdialog' ||
      classes.includes('dialog') ||
      classes.includes('alert-dialog');
    if (isModalDialog) {
      const descendants = nodes.filter(candidate => {
        if (candidate === node) return false;
        let ptr = candidate.parent;
        while (ptr !== null) {
          if (nodes[ptr] === node) return true;
          ptr = nodes[ptr]!.parent;
        }
        return false;
      });
      const hasFocusableControl = descendants.some(
        d =>
          ['button', 'input', 'select', 'textarea', 'a'].includes(d.tag) ||
          d.attrs.tabindex !== undefined ||
          d.attrs.autofocus !== undefined,
      );
      if (node.tag !== 'dialog' && node.attrs['aria-modal'] !== 'true') {
        report(
          'a11y-dialog-focus-trap',
          'warning',
          'Non-native dialog container is missing aria-modal="true" for keyboard focus trapping.',
          node.line,
          'Use native <dialog class="dialog"> or add role="dialog" aria-modal="true" with a focusable close button.',
        );
      } else if (descendants.length > 0 && !hasFocusableControl) {
        report(
          'a11y-dialog-focus-trap',
          'warning',
          'Dialog container has no focusable control (<button>, <input>, or [tabindex]) for keyboard focus trapping and dismissal.',
          node.line,
          'Include at least one focusable action or close <button type="button" class="btn"> inside the dialog.',
        );
      }
    }
  }
  const mains = nodes.filter(node => node.tag === 'main');
  const primaryHeadings = nodes.filter(node => node.tag === 'h1');
  if (mains.length > 1) {
    report('duplicate-main-landmark', 'error', `Found ${mains.length} main landmarks; exactly one is allowed.`, mains[1]!.line, 'Keep one main element and convert the others to sections.');
  }
  if (primaryHeadings.length > 1) {
    report('duplicate-primary-heading', 'error', `Found ${primaryHeadings.length} h1 elements; exactly one is allowed.`, primaryHeadings[1]!.line, 'Keep one h1 and demote later headings to h2.');
  }
  const pageLandmarks = nodes.filter(node => node.parent === null);
  const header = pageLandmarks.find(node => node.tag === 'header');
  const main = pageLandmarks.find(node => node.tag === 'main');
  const footer = pageLandmarks.find(node => node.tag === 'footer');
  if (header && main && header.index > main.index) {
    report('structural-order', 'error', 'Header appears after main in source order.', header.line, 'Move header before main.');
  }
  if (footer && main && footer.index < main.index) {
    report('structural-order', 'error', 'Footer appears before main in source order.', footer.line, 'Move footer after main.');
  }
  const anchors = new Map<string, HtmlNode>();
  for (const node of nodes) {
    const anchor = node.attrs['data-macro-anchor'];
    if (anchor === undefined) continue;
    if (!SAFE_ANCHOR.test(anchor)) {
      report('macro-anchor-invalid', 'error', `Invalid macro anchor '${anchor}'.`, node.line, 'Use a lowercase ASCII ID such as data-macro-anchor="content-main".');
    } else if (anchors.has(anchor)) {
      report('macro-anchor-duplicate', 'error', `Duplicate macro anchor '${anchor}'.`, node.line, 'Give every macro anchor a unique ID.');
    } else {
      anchors.set(anchor, node);
    }
  }
  const semanticsRegistry = defaultSemanticsStore.getRegistry();
  for (const node of nodes) {
    const recipeId = node.attrs['data-fsm-recipe'];
    const stateId = node.attrs['data-fsm-state'];
    if (stateId !== undefined && recipeId === undefined) {
      report('fsm-binding-missing', 'error', 'data-fsm-state requires data-fsm-recipe on the same element.', node.line, 'Bind both the recipe and one of its declared states.');
      continue;
    }
    if (recipeId === undefined) continue;
    const recipeRef = semanticsRegistry.aliases[recipeId];
    const recipe = recipeRef ? semanticsRegistry.fsmRecipes[recipeRef] : undefined;
    if (!recipe) {
      report('fsm-recipe-invalid', 'error', `Unknown FSM recipe '${recipeId}'.`, node.line, 'Use a recipe ID returned by get_fsm_recipe.');
    } else if (stateId === undefined) {
      report('fsm-state-missing', 'error', `FSM recipe '${recipeId}' has no bound data-fsm-state.`, node.line, `Set data-fsm-state="${recipe.initialStates[0]}".`);
    } else if (!recipe.states.some(state => state.id === stateId)) {
      report('fsm-state-invalid', 'error', `State '${stateId}' is not declared by FSM recipe '${recipeId}'.`, node.line, `Use one of: ${recipe.states.map(state => state.id).sort().join(', ')}.`);
    }
  }
  for (const [parent, buttons] of primaryByParent) {
    if (buttons.length > 1) report('primary-hierarchy', 'warning', `This ${parent === null ? 'root' : nodes[parent]!.tag} action group has ${buttons.length} primary buttons. Keep one primary; use secondary or ghost for alternatives.`, buttons[1]!.line);
  }
  const textNodes = nodes.filter(node => /^(?:h[1-6]|p|li|label|th|td)$/.test(node.tag));
  const centered = (node: HtmlNode) => {
    let current: HtmlNode | undefined = node;
    while (current) {
      if (current.classes.includes('text-left') || current.classes.includes('text-start')) return false;
      if (current.classes.includes('text-center')) return true;
      current = current.parent === null ? undefined : nodes[current.parent];
    }
    return false;
  };
  if (textNodes.length >= 2 && textNodes.every(centered)) report('everything-centered', 'warning', 'All detected content is centered. Use left aligned body text and reserve centering for a small focal element.', textNodes[0]!.line);
  for (const [component, line] of required) {
    if (!bundle && !hasImport(component)) report('missing-js-module', 'warning', `Import "basecoat-css/${component}" in a processed Astro script, or supply its HTML script; omit this warning if a parent layout already loads it.`, line);
  }
  if (required.size && !bundle && !hasImport('basecoat')) report('missing-js-runtime', 'warning', 'Load "basecoat-css/basecoat" before selective component modules; a parent layout may already supply it.', [...required.values()][0]!);
  if (required.size && !bundle && hasImport('basecoat')) {
    const runtime = importOrder.findIndex(value => importedModule(value) === 'basecoat');
    const module = importOrder.findIndex(value => required.has(importedModule(value) ?? ''));
    if (module >= 0 && runtime > module) report('js-import-order', 'warning', 'Load the Basecoat runtime before component modules so window.basecoat exists when modules register.', [...required.values()][0]!);
  }
  if (droppedErrors > 0) {
    const notice: CompositionIssue = {
      rule: 'issues-truncated',
      severity: 'error',
      message: `${droppedErrors} additional error(s) omitted; fix listed issues and re-validate.`,
      line: 1,
    };
    if (issues.length >= ISSUE_CAP) {
      let slot = ISSUE_CAP - 1;
      for (let i = ISSUE_CAP - 1; i >= 0; i--) {
        if (issues[i]!.severity === 'warning') { slot = i; break; }
      }
      issues[slot] = notice;
    } else {
      issues.push(notice);
    }
  }
  return {
    valid: !hasErrors,
    issues,
    truncated,
    errorsOmitted: droppedErrors > 0,
    limitations: LIMITATIONS,
  };
}
