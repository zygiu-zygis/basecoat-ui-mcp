// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import { defaultSemanticsStore } from '../semantics/index.js';

const SHADCN_DASHBOARD_GUIDANCE = `## Shadcn Aesthetic & Deterministic Quality

To achieve the precise, premium feel of shadcn/ui without React, you must act with a designer's intuition for proportions, typography, and contrast:
- **Card Borders:** Basecoat's \`.card\` class intrinsically applies a 1px ring shadow (e.g., \`shadow-sm ring-1 ring-border\`). **Never** add \`border\` or \`border-border\` to a \`.card\`, as this creates an ugly, thick 2px double border.
- **Header Proportions:** Dashboard headers and app bars should be compact and balanced. Use \`h-12\` or \`h-14\` for top header rows, never \`h-16\` or larger unless it's a prominent hero section.
- **Dashboard Typography Hierarchy:**
  - KPI Metric Numerals: \`text-2xl\` or \`text-3xl font-semibold tracking-tight tabular-nums\` for alignment stability.
  - Section Headers: \`text-lg font-semibold\` or \`text-xl font-semibold\`.
  - Body & Data Tables: \`text-sm\` for dense tables and forms.
  - Metadata & Secondary Labels: \`text-xs text-muted-foreground\` for helper text, trend timestamps, and table captions.
- **Whitespace Density Profiles:**
  - Compact: \`p-4\` card padding, \`gap-2\` controls, \`gap-4\` card grids, \`h-12\` headers.
  - Standard: \`p-6\` card padding, \`gap-4\` controls, \`gap-6\` sections, \`h-14\` headers.
  - Comfortable: \`p-8\` card padding, \`gap-6\` controls, \`gap-12\` sections.
- **Surface Elevation Layers:**
  - Ground: \`bg-background\` (canvas root).
  - Surface: \`bg-card text-card-foreground shadow-sm\` (panels, metric cards, table containers).
  - Elevated / Popovers / Dialogs: \`bg-popover text-popover-foreground shadow-md\` with \`border border-border\`.
- **Card Border-Contrast Ratios:**
  - Satisfy WCAG 2.1 AA (4.5:1 text contrast) and APCA Lc 60 surface contrast.
  - Never pair \`bg-primary\` with \`text-primary\`; use \`bg-primary text-primary-foreground\`.
- **Realistic Content Strategy:**
  - Real Domain Identifiers: Use actual invoice IDs (\`INV-2024-001\`), customer names, dates, amounts.
  - Actionable Verbs: \`Export CSV\`, \`Create Invoice\`, \`Save Changes\` instead of generic labels.
  - Zero Lorem Ipsum: Completely eliminate placeholder Latin or placeholder strings.`;

// Get rhythm text from compiled semantic profile, ensuring dashboard aesthetic guidance is included
function getRhythmText(): string {
  let base = '';
  try {
    const effectiveProfile = defaultSemanticsStore.getEffectiveRhythmProfile('default');
    base = effectiveProfile.rhythmText;
  } catch (error) {
    base = `# Basecoat composition guide

Follow this sequence without skipping the content decision:
Content Hierarchy -> Layout -> Component Selection -> Spacing -> Typography -> Final Composition.

1. Content hierarchy: identify the page purpose, primary task, essential evidence,
supporting information, and secondary actions. Remove decorative content that
does not help a decision. Give each section a descriptive heading and each control
a visible label. There should be one dominant action in a decision group.
2. Layout: choose the reading order before selecting widgets. Prefer one aligned
content column; introduce columns only for independent, comparable information.
Keep body copy and form labels aligned to the reading edge. Centered containers
are fine; centering every heading, paragraph, field, and action is forbidden.
Preserve logical DOM order when adapting a multi-column view for small screens.
3. Component selection: choose by intent. Use a table for comparable records,
tabs for peer views of one subject, and a dialog for a short interrupting task.
Use ordinary sections and whitespace for grouping. A card needs an independent
object or meaningful boundary; do not wrap every section in one.
4. Spacing: use the rhythm below consistently, then tune density globally.
5. Typography: create contrast with size, weight, line length, and muted supporting
text. Avoid increasing every heading or making every sentence bold.
6. Final composition: verify the primary action, reading order, alignment,
keyboard path, labels, narrow-screen behavior, and empty/error states.

## Rhythm and density

Use the Tailwind spacing scale deliberately: gap-2 (0.5rem), gap-4 (1rem),
gap-6 (1.5rem), and gap-12 (3rem) with the default Tailwind spacing token.
If the host changes that token, preserve these relative relationships.
- gap-2: label/control relationships, inline icon/text groups, compact actions.
- gap-4: neighboring fields, rows of related controls, local content groups.
- gap-6: section heading to content or separation of meaningful local groups.
- gap-12: major page sections with distinct purposes.

## Hard prohibitions

- No cards inside cards, including legacy .ui-card wrappers. Basecoat's modern
  class is .card; use semantic sections, separators, or rows inside it.
- No everything-centered pages. Reserve centered text for a short, intentional
  hero or empty state and keep reading-heavy content aligned to the start.
- No random spacing or arbitrary gaps; use the four composition tokens above.
- No every-button-is-primary groups.
- No random gradients, decorative metric cards, excessive rounded containers.
`;
  }

  if (!base.includes('## Shadcn Aesthetic & Deterministic Quality')) {
    base = base.trimEnd() + '\n\n' + SHADCN_DASHBOARD_GUIDANCE + '\n';
  }
  return base;
}

export const RHYTHM = getRhythmText();
