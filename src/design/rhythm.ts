// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
export const RHYTHM = `# Basecoat composition guide

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
Use the corresponding space-x/space-y, margin, and padding values when gap is
unsuitable. Keep touching content closer than unrelated content. Do not sprinkle
gap-3, gap-5, gap-7, arbitrary pixel gaps, or ad hoc spacing overrides into a page.
Zero spacing and auto alignment are valid structural choices. Borders and focus
rings are not spacing. Responsive changes should move between approved tokens.
Do not override every Basecoat component's intrinsic padding; apply this rhythm
to composition around components. This is the MCP design policy, not a claim
that upstream Basecoat examples all use this restricted spacing scale.

Comfortable default: gap-2 within fields, gap-4 between fields, gap-6 between
local groups, gap-12 between page sections. Dense data screens may use gap-2
between rows and gap-4 between groups while retaining labels and clear targets.
Choose density once per context. Never compress interactive targets merely to
fit more decoration. Use an agreed container width and consistent page gutters;
read basecoat://project/context for DESIGN.md before introducing new tokens.

## Typography and visual hierarchy

Use one page h1, then meaningful h2/h3 levels. Keep headings concise and body
text readable. Use a restrained progression such as text-3xl for the page,
text-xl for sections, text-base for body, and text-sm for supporting metadata.
Avoid muted text for essential instructions and preserve adequate contrast.
Keep long prose near 60-75 characters per line. Tables and code may be wider.
Prefer theme tokens over hard-coded colors. Let content and typography provide
hierarchy before adding borders, shadows, backgrounds, or more wrappers.

## Hard prohibitions

- No cards inside cards, including legacy .ui-card wrappers. Basecoat's modern
  class is .card; use semantic sections, separators, or rows inside it.
- No everything-centered pages. Reserve centered text for a short, intentional
  hero or empty state and keep reading-heavy content aligned to the start.
- No random spacing or arbitrary gaps; use the four composition tokens above.
- No every-button-is-primary groups. Use one default .btn for the principal
  action, data-variant="outline" or "secondary" for alternatives, and "ghost"
  for tertiary actions. Use "destructive" only for a destructive operation.
- No random gradients, decorative metric cards, excessive rounded containers,
  repeated shadows, or nested bordered panels without an information purpose.

Prefer a page header, a useful action row, and direct content over a dashboard
of empty wrappers. Treat validation findings as review guidance: static source
cannot establish visual contrast, computed spacing, or actual keyboard behavior.

## Component families

- Navigable entity lists: use .item rows inside .item-group. Do not render one .card per row.
- Zero results: use the .empty component with one next action. Do not invent a centered paragraph or a nested card.
- Labeled controls: each sits in .field with a visible .label. Use .input-group only for addons, not instead of .field.
- Badges: keep visually smaller than adjacent buttons. Do not mix a large badge with a small button in the same row.
- Filters and primary action: one toolbar above the table or list, with gap-4 under the toolbar, not inside each row.

## Measure

- On an operate (work) surface, the first viewport shows at most three regions, five actions, and about twenty-five text fragments. Persuade and read surfaces may use more whitespace, but not more competing actions.
- Space inside a label, control, and action group is at most one third of the space between sections, so related controls stay attached.
- Size a control to the value it holds (a year, a price, a short name). Do not stretch every input to the full row.
- No eyebrow or kicker above a heading. One short heading and one supporting line.

## Surface

- A hero image is optional and only one; do not place a card row under the hero in the same viewport.
- A feed row is a title, one supporting line, and small meta inside .item. Do not put a gallery in the row.
- Use one icon source and one stroke weight. Do not use emoji as icons.
- On each control, check hover, focus-visible, disabled, and loading. A disabled control must not remain actionable.
- Accent color is for hover and quiet highlights. The primary action carries the main fill.
- Build surfaces from the theme background and card tokens. Do not invent one-off background utilities.
- Text on a tinted fill uses that fill's foreground, not a generic muted gray.

## Visitor job

Let the visitor's goal set density before you pick components.

- Operate: dense and scannable; a table, list, or filters belong in the first viewport.
- Persuade: generous whitespace; avoid defaulting to a hero plus three equal cards.
- Read: a single column; more space above each heading than between that heading and its text.
- Experience: let imagery lead; keep labels, nav, and chrome in the background.

## Structural clarity

A divider earns its place when adjacent groups remain ambiguous after spacing;
otherwise leave the boundary unmarked. Check rendered text and icon edges for
optical alignment; equal CSS bounds need not look aligned. Give a heading more
separation from the preceding group than from the content it introduces.
Name the layout skeleton explicitly: one column, toolbar plus table, or sidebar
plus content. On a working screen, put the task controls and relevant records
at the start; a promotional hero must not push the work down.
`;
