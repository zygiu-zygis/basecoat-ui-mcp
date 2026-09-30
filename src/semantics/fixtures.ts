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
          id: 'gap-rhythm-sm',
          value: 'gap-2',
          description: 'Label/control relationships, inline icon/text groups, compact actions (0.5rem)',
        },
        {
          id: 'gap-rhythm-md',
          value: 'gap-4',
          description: 'Neighboring fields, rows of related controls, local content groups (1rem)',
        },
        {
          id: 'gap-rhythm-lg',
          value: 'gap-6',
          description: 'Section heading to content or separation of meaningful local groups (1.5rem)',
        },
        {
          id: 'gap-rhythm-xl',
          value: 'gap-12',
          description: 'Major page sections with distinct purposes (3rem)',
        },
      ],
    },
    {
      id: 'typography',
      description: 'Semantic typography tokens for visual hierarchy.',
      mappings: [
        {
          id: 'text-heading-1',
          value: 'text-3xl',
          description: 'Page title (h1) - primary heading',
        },
        {
          id: 'text-heading-2',
          value: 'text-xl',
          description: 'Section title (h2) - major sections',
        },
        {
          id: 'text-body',
          value: 'text-base',
          description: 'Body text - default readable content',
        },
        {
          id: 'text-muted',
          value: 'text-sm',
          description: 'Muted supporting text and metadata',
        },
      ],
    },
    {
      id: 'surfaces',
      description: 'Semantic surface and background tokens.',
      mappings: [
        {
          id: 'bg-surface-primary',
          value: 'bg-background',
          description: 'Page background - base canvas',
        },
        {
          id: 'bg-surface-secondary',
          value: 'bg-card',
          description: 'Card background - elevated content',
        },
      ],
    },
    {
      id: 'borders',
      description: 'Semantic border and divider tokens.',
      mappings: [
        {
          id: 'border-subtle',
          value: 'border-border',
          description: 'Muted border - subtle dividers',
        },
      ],
    },
    {
      id: 'density',
      description: 'Density variants for different contexts.',
      mappings: [
        {
          id: 'p-density-base',
          value: 'p-4',
          description: 'Base padding density for readable content',
        },
        {
          id: 'p-density-compact',
          value: 'p-2',
          description: 'Compact padding density for data-rich content',
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