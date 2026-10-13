---
name: block-patterns/forms
description: STRICT RULES for form fields, input controls, states, validation, and accessibility. Deviation from these rules is forbidden.
---

# Form Component

## GUARDRAILS
* **FORBIDDEN:** Do not build naked inputs. Forms MUST NOT be purely static HTML.
* **INSTEAD:** All fields MUST be constructed as a complete form-field. Wrap EVERY field inside a DaisyUI `form-control`. Every `<label>` MUST explicitly link to its input using strictly matching `for` and `id` attributes.
* **Dynamic Validation Logic:** Every form MUST be connected to form submission logic. Form fields must dynamically respond to submission attempts or input changes, ensuring the interface feels interactive ("little-dynamic") and handles real-time or submit-triggered validation.
* **Submission & Navigation:** Upon successful form validation (zero errors), the submit button MUST enter a loading state (e.g., displaying a spinner and becoming disabled) for a simulated duration of 1 to 2 seconds before programmatically navigating to the expected destination page.
* **Validation & Errors:** You MUST show appropriate error messages for all fields tied to the form's logic. Apply semantic validation classes (e.g., `input-error`, `input-success`) directly to the input element during validation states. You MUST render explicit, actionable feedback text directly below the input using the `text-error` utility.
* **Form Field Consistency:** All form fields (including inputs, selects, textareas, and pickers) MUST strictly adhere to a unified visual design language. The use of mismatched border radii, padding, typography, or color states across different field types is FORBIDDEN. All interactive elements must exhibit consistent styling to ensure a cohesive and predictable user experience.
* **Icons:** Internal input icons MUST be descriptive, vertically centered, and sized strictly in proportion to the input element (e.g., `size-4` or `size-5`).
