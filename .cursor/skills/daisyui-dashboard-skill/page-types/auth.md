---
name: page-types/auth
description: Strict layout rules for auth interfaces (login, signup, password reset).
---

# Authentication

## GUARDRAILS
* **Layout:** Default to a Split Screen layout (`grid-cols-1 lg:grid-cols-2`). Brand imagery and non-essential content should be hidden on mobile.
* **Split Screen Design:** The non-form side MUST feature a subtle CSS background pattern (e.g., grid, dots, or soft radial gradient) and include a prominent cards or overlay presenting business growth metrics or value propositions related to the admin panel.
* **Centered Card (Alternative):** If a centered layout is explicitly required, use a `max-w-md` card and apply a subtle CSS background pattern to the main wrapper.
* **Social Paths:** Visual dividers MUST be used between Email and Social authentication paths. Submit buttons MUST have loading states.
