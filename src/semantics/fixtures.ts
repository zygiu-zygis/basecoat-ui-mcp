// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Authored semantic fixtures: default rhythm profiles and structural FSM recipes.
import type {
  AuthoringSemanticsInput,
  AuthoringRhythmProfile,
  AuthoringFsmRecipe,
} from './types.js';

/** Default rhythm profile with semantic spacing, typography, and surface tokens. */
export const DEFAULT_RHYTHM_PROFILE: AuthoringRhythmProfile = {
  schemaVersion: 1,
  id: 'default',
  description: 'Default Basecoat rhythm profile with semantic spacing, typography, and surface tokens.',
  families: [
    {
      id: 'spacing',
      description: 'Semantic spacing tokens for consistent layout rhythm.',
      mappings: [
        {
          id: 'spacing-tight',
          value: 'gap-2',
          description: 'Label/control relationships, inline icon/text groups, compact actions (0.5rem)',
        },
        {
          id: 'spacing-normal',
          value: 'gap-4',
          description: 'Neighboring fields, rows of related controls, local content groups (1rem)',
        },
        {
          id: 'spacing-loose',
          value: 'gap-6',
          description: 'Section heading to content or separation of meaningful local groups (1.5rem)',
        },
        {
          id: 'spacing-section',
          value: 'gap-12',
          description: 'Major page sections with distinct purposes (3rem)',
        },
        {
          id: 'padding-tight',
          value: 'p-2',
          description: 'Compact padding for dense layouts',
        },
        {
          id: 'padding-normal',
          value: 'p-4',
          description: 'Standard padding for controls and content areas',
        },
        {
          id: 'padding-loose',
          value: 'p-6',
          description: 'Generous padding for prominent sections',
        },
        {
          id: 'margin-auto',
          value: 'mx-auto',
          description: 'Auto horizontal margin for centering containers',
        },
      ],
    },
    {
      id: 'typography',
      description: 'Semantic typography tokens for visual hierarchy.',
      mappings: [
        {
          id: 'text-page-title',
          value: 'text-3xl',
          description: 'Page title (h1) - primary heading',
        },
        {
          id: 'text-section-title',
          value: 'text-xl',
          description: 'Section title (h2) - major sections',
        },
        {
          id: 'text-subsection-title',
          value: 'text-lg',
          description: 'Subsection title (h3) - minor sections',
        },
        {
          id: 'text-body',
          value: 'text-base',
          description: 'Body text - default readable content',
        },
        {
          id: 'text-caption',
          value: 'text-sm',
          description: 'Caption text - supporting metadata and labels',
        },
        {
          id: 'text-fine-print',
          value: 'text-xs',
          description: 'Fine print - secondary information',
        },
        {
          id: 'font-normal',
          value: 'font-normal',
          description: 'Normal font weight for body text',
        },
        {
          id: 'font-medium',
          value: 'font-medium',
          description: 'Medium font weight for emphasis',
        },
        {
          id: 'font-semibold',
          value: 'font-semibold',
          description: 'Semibold font weight for headings',
        },
      ],
    },
    {
      id: 'surfaces',
      description: 'Semantic surface and background tokens.',
      mappings: [
        {
          id: 'bg-page',
          value: 'bg-background',
          description: 'Page background - base canvas',
        },
        {
          id: 'bg-card',
          value: 'bg-card',
          description: 'Card background - elevated content',
        },
        {
          id: 'bg-muted',
          value: 'bg-muted',
          description: 'Muted background - secondary areas',
        },
        {
          id: 'bg-accent',
          value: 'bg-accent',
          description: 'Accent background - highlights',
        },
        {
          id: 'text-primary',
          value: 'text-foreground',
          description: 'Primary text color',
        },
        {
          id: 'text-secondary',
          value: 'text-muted-foreground',
          description: 'Secondary text color',
        },
        {
          id: 'text-accent',
          value: 'text-accent-foreground',
          description: 'Accent text color',
        },
      ],
    },
    {
      id: 'borders',
      description: 'Semantic border and divider tokens.',
      mappings: [
        {
          id: 'border-default',
          value: 'border',
          description: 'Default border - standard dividers',
        },
        {
          id: 'border-muted',
          value: 'border-muted',
          description: 'Muted border - subtle dividers',
        },
        {
          id: 'border-accent',
          value: 'border-accent',
          description: 'Accent border - emphasis',
        },
        {
          id: 'rounded-default',
          value: 'rounded-md',
          description: 'Default border radius',
        },
        {
          id: 'rounded-full',
          value: 'rounded-full',
          description: 'Full border radius for circular elements',
        },
      ],
    },
    {
      id: 'density',
      description: 'Density variants for different contexts.',
      mappings: [
        {
          id: 'density-compact',
          value: 'space-y-1',
          description: 'Compact vertical spacing for dense data',
        },
        {
          id: 'density-normal',
          value: 'space-y-4',
          description: 'Normal vertical spacing for readable content',
        },
        {
          id: 'density-comfortable',
          value: 'space-y-6',
          description: 'Comfortable vertical spacing for promotional content',
        },
      ],
    },
  ],
};

/** Dialog FSM recipe for modal interaction patterns. */
export const DIALOG_FSM_RECIPE: AuthoringFsmRecipe = {
  schemaVersion: 1,
  id: 'dialog',
  description: 'Modal dialog FSM recipe for interrupting tasks and confirmations.',
  states: [
    {
      id: 'closed',
      description: 'Dialog is closed and not visible',
      initial: true,
    },
    {
      id: 'opening',
      description: 'Dialog is in the process of opening (animation)',
    },
    {
      id: 'open',
      description: 'Dialog is fully open and interactive',
    },
    {
      id: 'closing',
      description: 'Dialog is in the process of closing (animation)',
    },
  ],
  events: [
    {
      id: 'trigger-open',
      description: 'User action to open the dialog',
    },
    {
      id: 'animation-complete',
      description: 'Opening or closing animation has completed',
    },
    {
      id: 'confirm',
      description: 'User confirms the dialog action',
    },
    {
      id: 'cancel',
      description: 'User cancels or dismisses the dialog',
    },
    {
      id: 'escape-key',
      description: 'User presses Escape key',
    },
    {
      id: 'backdrop-click',
      description: 'User clicks outside the dialog content',
    },
  ],
  guards: [
    {
      id: 'can-close-on-escape',
      description: 'Check if dialog allows closing via Escape key',
    },
    {
      id: 'can-close-on-backdrop',
      description: 'Check if dialog allows closing via backdrop click',
    },
  ],
  actions: [
    {
      id: 'focus-dialog',
      description: 'Set focus to the dialog content',
      metadata: {
        focusTarget: 'first-interactive',
        trapFocus: true,
      },
    },
    {
      id: 'restore-focus',
      description: 'Restore focus to the trigger element',
      metadata: {
        restoreTarget: 'trigger-element',
      },
    },
    {
      id: 'emit-confirm',
      description: 'Emit confirmation event with dialog result',
      metadata: {
        eventType: 'confirm',
      },
    },
    {
      id: 'emit-cancel',
      description: 'Emit cancellation event',
      metadata: {
        eventType: 'cancel',
      },
    },
  ],
  transitions: [
    {
      id: 'start-opening',
      from: 'closed',
      to: 'opening',
      event: 'trigger-open',
      action: 'focus-dialog',
    },
    {
      id: 'finish-opening',
      from: 'opening',
      to: 'open',
      event: 'animation-complete',
    },
    {
      id: 'confirm-and-close',
      from: 'open',
      to: 'closing',
      event: 'confirm',
      action: 'emit-confirm',
    },
    {
      id: 'cancel-and-close',
      from: 'open',
      to: 'closing',
      event: 'cancel',
      action: 'emit-cancel',
    },
    {
      id: 'escape-to-close',
      from: 'open',
      to: 'closing',
      event: 'escape-key',
      guard: 'can-close-on-escape',
      action: 'emit-cancel',
    },
    {
      id: 'backdrop-to-close',
      from: 'open',
      to: 'closing',
      event: 'backdrop-click',
      guard: 'can-close-on-backdrop',
      action: 'emit-cancel',
    },
    {
      id: 'finish-closing',
      from: 'closing',
      to: 'closed',
      event: 'animation-complete',
      action: 'restore-focus',
    },
  ],
};

/** Collapsible navigation FSM recipe for hierarchical menu patterns. */
export const COLLAPSIBLE_NAVIGATION_FSM_RECIPE: AuthoringFsmRecipe = {
  schemaVersion: 1,
  id: 'collapsible-navigation',
  description: 'Collapsible navigation FSM recipe for hierarchical menu and disclosure patterns.',
  states: [
    {
      id: 'collapsed',
      description: 'Navigation section is collapsed (content hidden)',
      initial: true,
    },
    {
      id: 'expanding',
      description: 'Navigation section is expanding (animation in progress)',
    },
    {
      id: 'expanded',
      description: 'Navigation section is fully expanded (content visible)',
    },
    {
      id: 'collapsing',
      description: 'Navigation section is collapsing (animation in progress)',
    },
  ],
  events: [
    {
      id: 'toggle',
      description: 'User toggles the navigation section',
    },
    {
      id: 'expand',
      description: 'Explicit expand action',
    },
    {
      id: 'collapse',
      description: 'Explicit collapse action',
    },
    {
      id: 'animation-complete',
      description: 'Expand or collapse animation has completed',
    },
    {
      id: 'focus-child',
      description: 'Focus moves to a child element',
    },
    {
      id: 'blur-all',
      description: 'Focus leaves the entire navigation section',
    },
  ],
  guards: [
    {
      id: 'auto-collapse-on-blur',
      description: 'Check if navigation should auto-collapse when focus leaves',
    },
    {
      id: 'preserve-on-child-focus',
      description: 'Check if navigation should stay expanded when child is focused',
    },
  ],
  actions: [
    {
      id: 'update-aria-expanded',
      description: 'Update aria-expanded attribute',
      metadata: {
        attribute: 'aria-expanded',
        source: 'state',
      },
    },
    {
      id: 'announce-state',
      description: 'Announce state change to screen readers',
      metadata: {
        liveRegion: 'polite',
      },
    },
  ],
  transitions: [
    {
      id: 'toggle-to-expand',
      from: 'collapsed',
      to: 'expanding',
      event: 'toggle',
      action: 'update-aria-expanded',
    },
    {
      id: 'explicit-expand',
      from: 'collapsed',
      to: 'expanding',
      event: 'expand',
      action: 'update-aria-expanded',
    },
    {
      id: 'finish-expanding',
      from: 'expanding',
      to: 'expanded',
      event: 'animation-complete',
      action: 'announce-state',
    },
    {
      id: 'toggle-to-collapse',
      from: 'expanded',
      to: 'collapsing',
      event: 'toggle',
      action: 'update-aria-expanded',
    },
    {
      id: 'explicit-collapse',
      from: 'expanded',
      to: 'collapsing',
      event: 'collapse',
      action: 'update-aria-expanded',
    },
    {
      id: 'auto-collapse',
      from: 'expanded',
      to: 'collapsing',
      event: 'blur-all',
      guard: 'auto-collapse-on-blur',
      action: 'update-aria-expanded',
    },
    {
      id: 'finish-collapsing',
      from: 'collapsing',
      to: 'collapsed',
      event: 'animation-complete',
      action: 'announce-state',
    },
    {
      id: 'maintain-on-child-focus',
      from: 'expanded',
      to: 'expanded',
      event: 'focus-child',
      guard: 'preserve-on-child-focus',
    },
  ],
};

/** Complete authored semantics input with default fixtures. */
export const DEFAULT_SEMANTICS_INPUT: AuthoringSemanticsInput = {
  schemaVersion: 1,
  rhythmProfiles: [DEFAULT_RHYTHM_PROFILE],
  fsmRecipes: [DIALOG_FSM_RECIPE, COLLAPSIBLE_NAVIGATION_FSM_RECIPE],
};