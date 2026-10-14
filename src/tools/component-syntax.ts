// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { registry } from '../registry/index.js';
import type { Registry } from '../registry/schema.js';
import { defaultSemanticsStore } from '../semantics/index.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';
import { resolveComponentId, suggestComponentId } from './component-id.js';

export const COMPONENT_STATES = [
  'default',
  'active',
  'loading',
  'disabled',
  'open',
  'closed',
  'invalid',
  'open/closed',
] as const;

export type ComponentStateVariant = (typeof COMPONENT_STATES)[number];

export const componentSyntaxInputShape = {
  component: z
    .string()
    .max(80)
    .optional()
    .describe('Component name or alias to retrieve canonical FSM-bound syntax for (e.g. "dialog", "tabs", "button", "input", "select", "metric-card", "data-table", "sidebar-shell", "field", "field-group").'),
  id: z
    .string()
    .max(80)
    .optional()
    .describe('Alternative identifier alias for the component (matches component argument).'),
  componentId: z
    .string()
    .max(80)
    .optional()
    .describe('Alternative identifier alias for the component.'),
  name: z
    .string()
    .max(80)
    .optional()
    .describe('Alternative identifier alias for the component.'),
  orientation: z
    .enum(['vertical', 'horizontal', 'inline'])
    .optional()
    .describe('Spatial orientation: "vertical" (standard stacked), "horizontal" (grid 2-column for settings), or "inline" (checkbox/switch/radio).'),
  state: z
    .enum(COMPONENT_STATES)
    .optional()
    .describe('Target interactive state variant to bind to markup: "default", "active", "loading", "disabled", "open", "closed", "invalid", or "open/closed".'),
  variant: z
    .string()
    .max(40)
    .optional()
    .describe('Visual variant token (e.g. "outline", "ghost", "secondary", "destructive", "subcard", "horizontal", "inline", "error").'),
  environment: z
    .enum(['html', 'astro', 'react', 'vue', 'svelte'])
    .optional()
    .describe('Target output environment: "html", "astro", "react", "vue", or "svelte". Defaults to "html".'),
  icon: z
    .enum(['plus', 'edit', 'trash', 'search', 'chevron-down', 'check', 'external-link'])
    .optional()
    .describe('Verified Lucide action icon to inject with canonical data-icon="inline-start|inline-end" positioning.'),
};

export type ComponentSyntaxInput = z.infer<z.ZodObject<typeof componentSyntaxInputShape>>;

const SYNTAX_ALIASES: Record<string, string> = {
  dropdown: 'dropdown-menu',
  modal: 'dialog',
  nav: 'sidebar',
  toggle: 'theme-switcher',
  sheet: 'drawer',
  range: 'slider',
  'metric-card': 'metric-card',
  'metrics-card': 'metric-card',
  'metrics-summary': 'metric-card',
  'kpi-card': 'metric-card',
  'data-table': 'data-table',
  datatable: 'data-table',
  'sidebar-shell': 'sidebar-shell',
  'sidebar-dashboard-shell': 'sidebar-shell',
};

const COMPONENT_TO_FSM_RECIPE: Record<string, string> = {
  dialog: 'dialog',
  'alert-dialog': 'dialog',
  drawer: 'dialog',
  command: 'dialog',
  accordion: 'collapsible-navigation',
  'dropdown-menu': 'collapsible-navigation',
  popover: 'collapsible-navigation',
  select: 'collapsible-navigation',
  combobox: 'collapsible-navigation',
  tabs: 'tabs',
  sidebar: 'navigation',
  'sidebar-shell': 'navigation',
};

interface CompositePatternDetail {
  id: string;
  markup_template: string;
  dependencies: { css: string[]; js: string[] };
  composition_rules: string;
  native_script?: string;
}

const COMPOSITE_PATTERNS: Record<string, CompositePatternDetail> = {
  'metric-card': {
    id: 'metric-card',
    markup_template: `<article class="card flex min-w-0 flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
  <header class="flex items-center justify-between">
    <span class="text-sm font-medium text-muted-foreground">Total Revenue</span>
    <span class="badge" data-variant="outline">+12.5%</span>
  </header>
  <div class="flex flex-col gap-1">
    <strong class="text-2xl font-semibold tracking-tight tabular-nums">$45,231.89</strong>
    <p class="text-xs text-muted-foreground">+20.1% from last month</p>
  </div>
</article>`,
    dependencies: { css: ['basecoat-css/card', 'basecoat-css/badge'], js: [] },
    composition_rules: 'KPI metric card: use text-2xl font-semibold tabular-nums for numeric values. Never add border class to .card in Vega style pack.',
  },
  'data-table': {
    id: 'data-table',
    markup_template: `<div class="overflow-x-auto rounded-md border border-border">
  <table class="table w-full text-sm">
    <thead class="sticky top-0 bg-background/90 backdrop-blur">
      <tr class="border-b border-border text-xs font-medium text-muted-foreground">
        <th class="h-10 px-4 py-2 text-left">Invoice</th>
        <th class="h-10 px-4 py-2 text-left">Status</th>
        <th class="h-10 px-4 py-2 text-left">Method</th>
        <th class="h-10 px-4 py-2 text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-border/50 transition-colors hover:bg-muted/50">
        <td class="px-4 py-3 font-medium">INV-001</td>
        <td class="px-4 py-3"><span class="badge" data-variant="outline">Paid</span></td>
        <td class="px-4 py-3">Credit Card</td>
        <td class="px-4 py-3 text-right tabular-nums font-medium">$250.00</td>
      </tr>
    </tbody>
  </table>
</div>`,
    dependencies: { css: ['basecoat-css/table', 'basecoat-css/badge'], js: [] },
    composition_rules: 'Data table: always wrap in overflow-x-auto container. Use text-right tabular-nums on numeric columns and sticky header.',
  },
  'sidebar-shell': {
    id: 'sidebar-shell',
    markup_template: `<aside class="sidebar w-64 border-e border-border bg-background md:sticky md:top-0 md:h-screen" aria-label="Sidebar" data-slot="sidebar-host" data-side="left" data-mobile-breakpoint="md">
  <nav class="flex h-full flex-col justify-between p-2" aria-label="Main">
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2 p-2 text-sm font-semibold">Workspace</div>
      <a class="btn btn-ghost btn-sm w-full justify-start" href="#dashboard">Dashboard</a>
      <a class="btn btn-ghost btn-sm w-full justify-start" href="#analytics">Analytics</a>
      <a class="btn btn-ghost btn-sm w-full justify-start" href="#settings">Settings</a>
    </div>
    <div class="mt-auto flex flex-col gap-2 border-t border-border pt-2">
      <a class="btn btn-ghost btn-sm w-full justify-start" href="#profile">Profile</a>
    </div>
  </nav>
</aside>`,
    dependencies: { css: ['basecoat-css/sidebar', 'basecoat-css/button'], js: ['basecoat-css/sidebar'] },
    composition_rules: 'Sidebar shell: sticky 16rem desktop navigation with responsive flyout below md.',
  },
};

const VERIFIED_ACTION_ICONS: Record<string, string> = {
  plus: '<svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  edit: '<svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  trash: '<svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  search: '<svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  'chevron-down': '<svg data-icon="inline-end" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  check: '<svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  'external-link': '<svg data-icon="inline-end" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
};

function mapToFsmState(recipeId: string, state: ComponentStateVariant): string {
  switch (recipeId) {
    case 'dialog':
      if (state === 'open' || state === 'active') return 'open';
      if (state === 'loading') return 'opening';
      return 'closed';
    case 'collapsible-navigation':
      if (state === 'open' || state === 'active') return 'expanded';
      if (state === 'loading') return 'expanding';
      return 'collapsed';
    case 'navigation':
      if (state === 'closed' || state === 'disabled') return 'collapsed';
      if (state === 'loading') return 'mobile-closing';
      return 'expanded';
    case 'tabs':
      if (state === 'loading') return 'switching';
      if (state === 'closed' || state === 'disabled') return 'inactive';
      return 'active';
    case 'auth-flow':
      if (state === 'loading') return 'submitting';
      if (state === 'active' || state === 'open') return 'authenticated';
      if (state === 'disabled' || state === 'invalid') return 'error';
      return 'idle';
    default:
      return state;
  }
}

export function applyStateVariant(
  markup: string,
  state: ComponentStateVariant,
  fsmRecipe?: string,
  fsmState?: string,
  variant?: string,
): string {
  let result = markup.replace(/^(\s*<([a-zA-Z][a-zA-Z0-9-]*)\b)([^>]*)(>)/, (_match, prefix: string, tagName: string, attrs: string, close: string) => {
    const tag = tagName.toLowerCase();
    let updatedAttrs = attrs;

    const setAttr = (name: string, value: string) => {
      const pattern = new RegExp(`\\s+${name}=(?:"[^"]*"|'[^']*')`, 'i');
      if (pattern.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(pattern, ` ${name}="${value}"`);
      } else {
        updatedAttrs += ` ${name}="${value}"`;
      }
    };

    const setBoolAttr = (name: string) => {
      const pattern = new RegExp(`(?:^|\\s)${name}(?==|\\s|$)`, 'i');
      if (!pattern.test(updatedAttrs)) {
        updatedAttrs += ` ${name}`;
      }
    };

    setAttr('data-state', state);
    if (fsmRecipe && fsmState) {
      setAttr('data-fsm-recipe', fsmRecipe);
      setAttr('data-fsm-state', fsmState);
    }
    if (variant) {
      setAttr('data-variant', variant);
    }

    if (state === 'loading') {
      setAttr('aria-busy', 'true');
      setAttr('data-loading', 'true');
      if (tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea') {
        setBoolAttr('disabled');
      }
    } else if (state === 'disabled') {
      setAttr('aria-disabled', 'true');
      if (tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'fieldset') {
        setBoolAttr('disabled');
      }
    } else if (state === 'open') {
      if (tag === 'dialog' || tag === 'details') {
        setBoolAttr('open');
      } else {
        setAttr('aria-expanded', 'true');
      }
    } else if (state === 'closed') {
      updatedAttrs = updatedAttrs.replace(/\s+open(?==["'][^"']*["']|\s|$)/gi, '');
    } else if (state === 'active') {
      setAttr('data-active', 'true');
    } else if (state === 'invalid') {
      setAttr('data-invalid', 'true');
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        setAttr('aria-invalid', 'true');
      }
    }

    return `${prefix}${updatedAttrs}${close}`;
  });

  if (state === 'open') {
    result = result.replace(/\baria-expanded="false"/g, 'aria-expanded="true"');
    result = result.replace(/<(dialog|details)\b(?![^>]*\bopen\b)([^>]*)>/i, '<$1$2 open>');
  } else if (state === 'closed') {
    result = result.replace(/\baria-expanded="true"/g, 'aria-expanded="false"');
    result = result.replace(/(<(?:dialog|details)\b[^>]*?)\s+open(?==["'][^"']*["']|\s|>)/gi, '$1');
  } else if (state === 'invalid') {
    result = result.replace(/(<(?:div|section|fieldset)\b[^>]*\b(?:class|data-component)=["'][^"']*\b(?:field|form|radio-group|switch|combobox|date-picker|input-otp)\b[^"']*["'])([^>]*)(>)/gi, (match, p1, p2, p3) => {
      if (!/data-invalid=/i.test(match)) {
        return `${p1} data-invalid="true"${p2}${p3}`;
      }
      return match;
    });
    result = result.replace(/(<(?:input|textarea|select)\b)([^>]*)(>)/gi, (match, p1, p2, p3) => {
      if (!/aria-invalid=/i.test(match)) {
        return `${p1} aria-invalid="true"${p2}${p3}`;
      }
      return match;
    });
    result = result.replace(/(<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*\brole=["']combobox["'])([^>]*)(>)/gi, (match, p1, p2, p3) => {
      if (!/aria-invalid=/i.test(match)) {
        return `${p1} aria-invalid="true"${p2}${p3}`;
      }
      return match;
    });
  }

  return result;
}

function getFieldMarkupTemplate(orientation: 'vertical' | 'horizontal' | 'inline', isInvalid: boolean): string {
  if (orientation === 'horizontal') {
    return isInvalid
      ? `<div class="field grid grid-cols-2 items-center gap-4" data-orientation="horizontal" data-invalid="true">
  <label class="label text-sm font-medium" for="username">Username</label>
  <div class="grid gap-1.5">
    <input class="input" id="username" type="text" placeholder="Enter username" aria-describedby="username-description username-error" aria-invalid="true">
    <p id="username-description" class="field-description text-sm text-muted-foreground">Your public display username.</p>
    <p id="username-error" class="field-error text-sm font-medium text-destructive" role="alert">Please enter a valid username.</p>
  </div>
</div>`
      : `<div class="field grid grid-cols-2 items-center gap-4" data-orientation="horizontal">
  <label class="label text-sm font-medium" for="username">Username</label>
  <div class="grid gap-1.5">
    <input class="input" id="username" type="text" placeholder="Enter username" aria-describedby="username-description">
    <p id="username-description" class="field-description text-sm text-muted-foreground">Your public display username.</p>
  </div>
</div>`;
  }
  if (orientation === 'inline') {
    return isInvalid
      ? `<div class="field flex items-start gap-2" data-orientation="inline" data-invalid="true">
  <input class="checkbox" id="terms" type="checkbox" aria-describedby="terms-description terms-error" aria-invalid="true">
  <div class="grid gap-1 leading-none">
    <label class="label text-sm font-medium" for="terms">Accept terms and conditions</label>
    <p id="terms-description" class="field-description text-sm text-muted-foreground">You agree to our terms of service.</p>
    <p id="terms-error" class="field-error text-sm font-medium text-destructive" role="alert">You must accept the terms.</p>
  </div>
</div>`
      : `<div class="field flex items-center gap-2" data-orientation="inline">
  <input class="checkbox" id="terms" type="checkbox" aria-describedby="terms-description">
  <div class="grid gap-1 leading-none">
    <label class="label text-sm font-medium" for="terms">Accept terms and conditions</label>
    <p id="terms-description" class="field-description text-sm text-muted-foreground">You agree to our terms of service.</p>
  </div>
</div>`;
  }
  return isInvalid
    ? `<div class="field grid gap-2" data-orientation="vertical" data-invalid="true">
  <label class="label text-sm font-medium" for="username">Username</label>
  <input class="input" id="username" type="text" placeholder="Enter username" aria-describedby="username-description username-error" aria-invalid="true">
  <p id="username-description" class="field-description text-sm text-muted-foreground">Your public display username.</p>
  <p id="username-error" class="field-error text-sm font-medium text-destructive" role="alert">Please enter a valid username.</p>
</div>`
    : `<div class="field grid gap-2" data-orientation="vertical">
  <label class="label text-sm font-medium" for="username">Username</label>
  <input class="input" id="username" type="text" placeholder="Enter username" aria-describedby="username-description">
  <p id="username-description" class="field-description text-sm text-muted-foreground">Your public display username.</p>
</div>`;
}

function getFieldGroupMarkupTemplate(orientation: 'vertical' | 'horizontal' | 'inline', isInvalid: boolean): string {
  if (orientation === 'horizontal') {
    return isInvalid
      ? `<div role="group" class="field-group flex flex-col gap-6" data-orientation="horizontal" data-invalid="true">
  <fieldset class="fieldset space-y-4">
    <legend class="field-legend text-sm font-medium leading-none">Account Settings</legend>
    <div class="field grid grid-cols-2 items-center gap-4" data-orientation="horizontal" data-invalid="true">
      <label class="label text-sm font-medium" for="account-name">Account Name</label>
      <div class="grid gap-1.5">
        <input class="input" id="account-name" type="text" placeholder="Account name" aria-describedby="account-name-description account-name-error" aria-invalid="true">
        <p id="account-name-description" class="field-description text-sm text-muted-foreground">Team account name.</p>
        <p id="account-name-error" class="field-error text-sm font-medium text-destructive" role="alert">Account name is required.</p>
      </div>
    </div>
  </fieldset>
</div>`
      : `<div role="group" class="field-group flex flex-col gap-6" data-orientation="horizontal">
  <fieldset class="fieldset space-y-4">
    <legend class="field-legend text-sm font-medium leading-none">Account Settings</legend>
    <div class="field grid grid-cols-2 items-center gap-4" data-orientation="horizontal">
      <label class="label text-sm font-medium" for="account-name">Account Name</label>
      <div class="grid gap-1.5">
        <input class="input" id="account-name" type="text" placeholder="Account name" aria-describedby="account-name-description">
        <p id="account-name-description" class="field-description text-sm text-muted-foreground">Team account name.</p>
      </div>
    </div>
  </fieldset>
</div>`;
  }
  if (orientation === 'inline') {
    return isInvalid
      ? `<div role="group" class="field-group flex flex-wrap gap-4" data-orientation="inline" data-invalid="true">
  <fieldset class="fieldset space-y-4">
    <legend class="field-legend text-sm font-medium leading-none">Notifications</legend>
    <div class="field flex items-start gap-2" data-orientation="inline" data-invalid="true">
      <input class="checkbox" id="pref-email" type="checkbox" aria-describedby="pref-email-desc pref-email-error" aria-invalid="true">
      <div class="grid gap-1 leading-none">
        <label class="label text-sm font-medium" for="pref-email">Email Notifications</label>
        <p id="pref-email-desc" class="field-description text-sm text-muted-foreground">Receive weekly digests.</p>
        <p id="pref-email-error" class="field-error text-sm font-medium text-destructive" role="alert">Please verify notification settings.</p>
      </div>
    </div>
  </fieldset>
</div>`
      : `<div role="group" class="field-group flex flex-wrap gap-4" data-orientation="inline">
  <fieldset class="fieldset space-y-4">
    <legend class="field-legend text-sm font-medium leading-none">Notifications</legend>
    <div class="field flex items-center gap-2" data-orientation="inline">
      <input class="checkbox" id="pref-email" type="checkbox" aria-describedby="pref-email-desc">
      <div class="grid gap-1 leading-none">
        <label class="label text-sm font-medium" for="pref-email">Email Notifications</label>
        <p id="pref-email-desc" class="field-description text-sm text-muted-foreground">Receive weekly digests.</p>
      </div>
    </div>
  </fieldset>
</div>`;
  }
  return isInvalid
    ? `<div role="group" class="field-group flex flex-col gap-6" data-orientation="vertical" data-invalid="true">
  <fieldset class="fieldset space-y-4">
    <legend class="field-legend text-sm font-medium leading-none">Profile Settings</legend>
    <div class="field grid gap-2" data-orientation="vertical" data-invalid="true">
      <label class="label text-sm font-medium" for="profile-name">Name</label>
      <input class="input" id="profile-name" type="text" placeholder="Your name" aria-describedby="profile-name-description profile-name-error" aria-invalid="true">
      <p id="profile-name-description" class="field-description text-sm text-muted-foreground">Displayed on your public profile.</p>
      <p id="profile-name-error" class="field-error text-sm font-medium text-destructive" role="alert">Please enter your profile name.</p>
    </div>
  </fieldset>
</div>`
    : `<div role="group" class="field-group flex flex-col gap-6" data-orientation="vertical">
  <fieldset class="fieldset space-y-4">
    <legend class="field-legend text-sm font-medium leading-none">Profile Settings</legend>
    <div class="field grid gap-2" data-orientation="vertical">
      <label class="label text-sm font-medium" for="profile-name">Name</label>
      <input class="input" id="profile-name" type="text" placeholder="Your name" aria-describedby="profile-name-description">
      <p id="profile-name-description" class="field-description text-sm text-muted-foreground">Displayed on your public profile.</p>
    </div>
    <div class="field grid gap-2" data-orientation="vertical">
      <label class="label text-sm font-medium" for="profile-email">Email</label>
      <input class="input" id="profile-email" type="email" placeholder="you@example.com" aria-describedby="profile-email-error" aria-invalid="true">
      <p id="profile-email-error" class="field-error text-sm font-medium text-destructive" role="alert">Please enter a valid email address.</p>
    </div>
  </fieldset>
</div>`;
}

export const injectRootAttributes = applyStateVariant;

export interface ComponentSyntaxOutput {
  stage?: string;
  id: string;
  environment: string;
  state: string;
  markup: string;
  dependencies: {
    css: string[];
    js: string[];
  };
  composition_rules: string;
  orientation?: string;
  toggleStates?: string[];
  availableStates?: readonly string[];
  fsmContract?: {
    recipe: string;
    boundState?: string;
    validStates: string[];
  };
  fsm?: { recipe: string; state?: string };
  icon?: string;
  iconSvg?: string;
  nextStep?: string;
}

export interface ComponentSyntaxCatalogIndex {
  stage: string;
  totalComponents: number;
  components: string[];
  availableStates: readonly string[];
  supportedEnvironments: readonly string[];
  supportedOrientations: readonly string[];
  nextStep: string;
}

export function runComponentSyntax(
  input: ComponentSyntaxInput & ({ component: string } | { id: string } | { componentId: string } | { name: string }),
  source?: Registry,
): ComponentSyntaxOutput;
export function runComponentSyntax(
  input?: ComponentSyntaxInput,
  source?: Registry,
): ComponentSyntaxOutput | ComponentSyntaxCatalogIndex;
export function runComponentSyntax(
  input: ComponentSyntaxInput = {},
  source: Registry = registry,
): ComponentSyntaxOutput | ComponentSyntaxCatalogIndex {
  const rawId = (input.component ?? input.id ?? input.componentId ?? input.name ?? '').trim();
  if (!rawId) {
    const allIds = Array.from(new Set([
      ...source.index.map(c => c.id),
      ...Object.keys(COMPOSITE_PATTERNS),
    ])).sort();
    const catalogIndex = {
      stage: '3-component-syntax',
      totalComponents: allIds.length,
      components: allIds,
      availableStates: COMPONENT_STATES,
      supportedEnvironments: ['html', 'astro', 'react', 'vue', 'svelte'] as const,
      supportedOrientations: ['vertical', 'horizontal', 'inline'] as const,
      nextStep: 'Provide id or component (e.g. { id: "field", orientation: "vertical" }).',
    };
    assertDetailBudget(catalogIndex);
    return catalogIndex;
  }
  const needle = rawId.toLowerCase();
  const isDirectRegistryMatch = input.state !== undefined && (needle in source.details || needle in COMPOSITE_PATTERNS);
  const aliasResolved = isDirectRegistryMatch
    ? needle
    : (SYNTAX_ALIASES[needle] ?? resolveComponentId(needle));
  const entry = COMPOSITE_PATTERNS[aliasResolved] ?? source.details[aliasResolved];
  if (!entry) {
    const hint = suggestComponentId(aliasResolved);
    const suffix = hint ? ` Did you mean ${hint}?` : '';
    throw new Error(`Unknown component: ${rawId.slice(0, 80)}.${suffix} Use search_components.`);
  }

  const id = isDirectRegistryMatch
    ? needle
    : ('id' in entry && typeof (entry as { id?: unknown }).id === 'string'
        ? (entry as { id: string }).id
        : aliasResolved);
  let state: ComponentStateVariant = input.state ?? 'default';
  if ((input.variant === 'error' || input.state === 'invalid') && state !== 'invalid') {
    state = 'invalid';
  }
  const effectiveState = state === 'open/closed' ? 'open' : state;
  const environment = input.environment ?? 'html';
  const orientation = input.orientation ?? (input.variant === 'horizontal' ? 'horizontal' : input.variant === 'inline' ? 'inline' : 'vertical');
  const isInvalid = effectiveState === 'invalid' || input.variant === 'error';

  let rawTemplate = entry.markup_template;
  if (id === 'field') {
    rawTemplate = getFieldMarkupTemplate(orientation, isInvalid);
  } else if (id === 'field-group') {
    rawTemplate = getFieldGroupMarkupTemplate(orientation, isInvalid);
  }

  const fsmRecipeId = COMPONENT_TO_FSM_RECIPE[id];
  const semantics = defaultSemanticsStore.getRegistry();
  const fsmRecipeRef = fsmRecipeId ? semantics.aliases[fsmRecipeId] : undefined;
  const fsmRecipe = fsmRecipeRef ? semantics.fsmRecipes[fsmRecipeRef] : undefined;
  const fsmState = fsmRecipeId ? mapToFsmState(fsmRecipeId, effectiveState) : undefined;

  const transformedTemplate = injectRootAttributes(
    rawTemplate,
    effectiveState,
    fsmRecipeId,
    fsmState,
    input.variant,
  );

  const scripts =
    environment === 'astro'
      ? entry.dependencies.js.map(path => `import '${path}';`).join('\n')
      : '';
  const native = entry.native_script ?? '';
  const inline = [scripts, native].filter(Boolean).join('\n');
  const assets =
    environment === 'html'
      ? entry.dependencies.js
          .map(path => `<script src="/assets/${path.split('/').at(-1)}.min.js" defer></script>`)
          .join('\n')
      : '';
  const frameworkComment =
    environment === 'react'
      ? `<!-- React: replace class with className; import styles in layout -->`
      : environment === 'vue'
        ? `<!-- Vue: place in template section; import styles in main.ts -->`
        : environment === 'svelte'
          ? `<!-- Svelte: place in component markup; import styles in +layout.svelte -->`
          : '';
  const markup = [
    frameworkComment,
    transformedTemplate,
    assets,
    inline
      ? environment === 'astro'
        ? `<!-- Add to your layout or component script, not <head> -->\n<script>\n${inline}\n</script>`
        : environment === 'html'
          ? `<script>\n${inline}\n</script>`
          : `<!-- Framework script setup: ${entry.dependencies.js.join(', ')} -->`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const iconSvg = input.icon ? VERIFIED_ACTION_ICONS[input.icon] : undefined;

  const fullResult = {
    stage: '3-component-syntax',
    id,
    environment,
    state,
    ...(state === 'open/closed' ? { toggleStates: ['open', 'closed'] } : {}),
    ...(input.orientation || id === 'field' || id === 'field-group' ? { orientation } : {}),
    availableStates: COMPONENT_STATES,
    ...(fsmRecipe
      ? {
          fsmContract: {
            recipe: fsmRecipe.id,
            boundState: fsmState,
            validStates: fsmRecipe.states.map(s => s.id),
          },
        }
      : {}),
    ...(iconSvg ? { icon: input.icon, iconSvg } : {}),
    markup,
    dependencies: entry.dependencies,
    composition_rules: entry.composition_rules,
    nextStep: 'Audit assembled page/component markup with basecoat_quality_inspector.',
  };

  if (responseBytes(fullResult) <= MAX_DETAIL_BYTES) {
    return fullResult;
  }

  // Fallback for tight budget components (like theme-switcher with dual inline SVGs)
  const compactResult = {
    id,
    environment,
    state,
    ...(state === 'open/closed' ? { toggleStates: ['open', 'closed'] } : {}),
    ...(fsmRecipe ? { fsm: { recipe: fsmRecipe.id, state: fsmState } } : {}),
    ...(iconSvg ? { icon: input.icon, iconSvg } : {}),
    markup,
    dependencies: entry.dependencies,
    composition_rules: entry.composition_rules,
  };
  while (responseBytes(compactResult) > MAX_DETAIL_BYTES && compactResult.composition_rules.length > 20) {
    compactResult.composition_rules = compactResult.composition_rules.slice(0, Math.max(0, compactResult.composition_rules.length - 24)).trimEnd();
  }
  assertDetailBudget(compactResult);
  return compactResult;
}
