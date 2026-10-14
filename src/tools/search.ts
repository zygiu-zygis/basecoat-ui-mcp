import { metadata } from '../registry/index.js';

const synonyms: Record<string, string[]> = {
  modal: ['dialog'], confirm: ['dialog'], confirmation: ['dialog'], destructive: ['dialog'],
  action: ['button'], submit: ['button'], cta: ['button'],
  field: ['input'], email: ['input'], text: ['input'],
  views: ['tabs'], panels: ['tabs'],
  'theme-toggle': ['theme-switcher'],
  rows: ['table'], tabular: ['table'], compare: ['table'], invoices: ['table'],
  sheet: ['drawer'],
  dropdown: ['dropdown-menu'],
  menu: ['dropdown-menu'],
  nav: ['sidebar'],
  navigation: ['sidebar'],
  range: ['slider'],
  toggle: ['theme-switcher', 'switch'],
  check: ['checkbox'],
  radio: ['radio-group'],
  pill: ['badge'],
  chip: ['badge'],
  popup: ['popover', 'dialog'],
  flyout: ['drawer', 'popover'],
  palette: ['command'],
  notification: ['toast', 'alert'],
  banner: ['alert'],
  spinner: ['progress', 'skeleton'],
  loading: ['skeleton', 'progress'],
  kpi: ['card'],
  metric: ['card'],
};
function words(value: string): string[] {
  return value.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}-]+/gu) ?? [];
}

export interface SearchComponentsInput {
  intent?: string;
  query?: string;
  id?: string;
  componentId?: string;
  name?: string;
  environment?: 'html' | 'astro' | 'react' | 'vue' | 'svelte';
}

export function searchComponents(input: SearchComponentsInput = {}) {
  const identifier = input.id ?? input.componentId ?? input.name ?? '';
  const intent = input.intent ?? '';
  const query = input.query ?? identifier;
  const rawTerms = `${intent} ${query} ${identifier}`.trim();
  const terms = rawTerms ? [...new Set(words(rawTerms))] : [];
  if (terms.length === 0) {
    return [];
  }
  const expanded = [...new Set(terms.flatMap(term => [term, ...(synonyms[term] ?? [])]))];
  return metadata.map(component => {
    const fields = words([component.id, component.name, component.intent, ...component.categories, ...component.keywords].join(' '));
    const score = expanded.reduce((sum, term) => sum +
      (term === component.id ? 12 : fields.includes(term) ? 3 : 0), 0);
    return { component, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.component.id < b.component.id ? -1 : a.component.id > b.component.id ? 1 : 0))
    .slice(0, 8)
    .map(({ component: { id, name, intent: compIntent } }) => ({ id, name, intent: compIntent }));
}
