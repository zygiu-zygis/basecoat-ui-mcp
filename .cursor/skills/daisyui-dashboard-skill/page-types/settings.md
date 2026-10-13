---
name: page-types/settings
description: Rules for macro-layouts, grouping, action flows, and mutations on settings pages.
---

# Settings Rules

## GUARDRAILS
* **Layout:** You MUST use tabs to organize and separate category-wise settings.
* **Settings:** Chunk related controls into bordered panels. Primary actions at bottom-left/right. Isolate destructive actions (Danger Zone) at the bottom with semantic error cues.
* **Placement:** Primary actions (Save, Cancel) at bottom-left/right of form group, OR sticky bottom bar for page-level saves.
* **Isolation:** Place destructive actions (e.g., Delete Account) in an isolated section at page bottom.
* **Layout Options:** Simple or Complex
  * **Complex:** 2-column layout. Fixed side-navigation (`w-48` or `w-64`) with wider main content.
  * **Simple:** Single-column, centered, constrained to `max-w-3xl`.
* **Warning Styling Constraints:** Use semantic error cues (e.g., red borders/text) to distinguish warning states from standard settings. You are **FORBIDDEN** from applying error (or light error) background colors to large content areas like entire cards or heavy-sized elements. Restrict error backgrounds strictly to small UI components or use borders/text instead.
