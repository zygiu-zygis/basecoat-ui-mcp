import { metadata } from '../registry/index.js';

const synonyms: Record<string, string[]> = {
  modal: ['dialog'], confirm: ['dialog'], confirmation: ['dialog'], destructive: ['dialog'],
  action: ['button'], submit: ['button'], cta: ['button'],
  field: ['input'], email: ['input'], text: ['input'],
  switch: ['tabs'], views: ['tabs'], panels: ['tabs'],
  rows: ['table'], tabular: ['table'], compare: ['table'], invoices: ['table'],
};
function words(value: string): string[] {
  return value.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}-]+/gu) ?? [];
}

export function searchComponents(input: { intent: string; query: string }) {
  const terms = [...new Set(words(`${input.intent} ${input.query}`))];
  const expanded = [...new Set(terms.flatMap(term => [term, ...(synonyms[term] ?? [])]))];
  return metadata.map(component => {
    const fields = words([component.id, component.name, component.intent, ...component.categories, ...component.keywords].join(' '));
    const score = expanded.reduce((sum, term) => sum +
      (term === component.id ? 12 : fields.includes(term) ? 3 : 0), 0);
    return { component, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.component.id < b.component.id ? -1 : a.component.id > b.component.id ? 1 : 0))
    .slice(0, 8)
    .map(({ component: { id, name, intent } }) => ({ id, name, intent }));
}
