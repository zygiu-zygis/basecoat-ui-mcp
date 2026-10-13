---
name: audit
description: Master router for QA, self-correction, and final code review.
---

# Audit Router
Halt and execute a strict self-audit BEFORE presenting final UI/UX markup.

## Guardrails
- NEVER skip the audit phase. It triggers via internal operational state, NOT user keywords.
- **Trigger:** Upon completing markup assembly -> HALT AND USE `checklist.md` IMMEDIATELY.
- **Correction:** If code fails ANY checklist constraint, silently revise within a `<thought>` block before final output.

## Workflows
Evaluate task state and read exact sub-router:
- `checklist.md` *(Final Code Review & Quality Gate)*
