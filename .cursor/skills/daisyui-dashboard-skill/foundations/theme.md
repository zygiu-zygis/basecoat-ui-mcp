---
title: foundations/theme
description: Strict rules and directives for the agent regarding the implementation of light and dark themes using predefined variables.
---

# Theme

## GUARDRAILS
* **Theme Prioritization & Custom Variables:** You MUST use DaisyUI's built-in themes directly via the plugin configuration as your primary styling method. Only create themes using custom CSS variables if you explicitly need a different theme (e.g., the user specifies exact custom colors, or if you need to fallback to the custom themes outlined in the `theme.md` file). When applying custom themes, you MUST set the variables exactly as provided.
* **Highest Weight Placement:** If custom theme variables are utilized, you MUST inject or append them at the very bottom of all plugin declarations. This placement is mandatory to ensure the variables hold the highest weight and correctly override any default plugin styles.
* **Multi-Theme Requirement:** When implementing a theme changer/toggler, you MUST provide exactly 4 to 5 high-quality DaisyUI themes (e.g., `light`, `dark`, `corporate`, `dim`, `nord`). Defaulting to a simple binary light/dark toggle is FORBIDDEN.
* **CSS Configuration:** To support multiple themes, you MUST explicitly define your chosen themes in the `daisyui` plugin configuration. Your implementation architecture must support the dynamic injection of the `data-theme` attribute at the `<html>` or `<body>` level to trigger the CSS style changes.
* **System Preference Inclusion & Logic:** The theme toggler MUST explicitly include a `system` option. This `system` option MUST dynamically listen to the user's OS-level preferences via the `prefers-color-scheme` media query to set the active theme to light or dark. Faking this state or hardcoding a fallback is FORBIDDEN.

```css
@plugin "daisyui/theme" {
    name: "dark";
    color-scheme: dark;
    prefersdark: true;
    --root-bg: #121416;
    --color-base-100: oklch(0.224 0.01 248.267);
    --color-base-200: oklch(0.266 0.009 248.183);
    --color-base-300: oklch(0.307 0.009 248.126);
    --color-base-content: #f0f4f8;
    --color-primary: oklch(0.653 0.137 234.006);
    --color-primary-content: #ffffff;
    --color-secondary: oklch(0.668 0.141 55.107);
    --color-secondary-content: #ffffff;
    --color-accent: oklch(0.779 0.132 199.114);
    --color-accent-content: #f3fbf6;
    --color-neutral: oklch(0.907 0.009 247.922);
    --color-neutral-content: #1e2832;
    --color-info: oklch(0.662 0.186 250.923);
    --color-info-content: #ffffff;
    --color-success: oklch(0.662 0.202 145.757);
    --color-success-content: #ffffff;
    --color-warning: oklch(0.782 0.158 72.327);
    --color-warning-content: #150a00;
    --color-error: oklch(0.629 0.238 30.78);
    --color-error-content: #ffffff;
    --radius-selector: 0.5rem;
    --radius-field: 0.25rem;
    --radius-box: 0.5rem;
    --size-selector: 0.25rem;
    --size-field: 0.25rem;
    --border: 1px;
    --depth: 0;
    --noise: 0;
}

@plugin "daisyui/theme" {
    name: "light";
    default: true;
    color-scheme: light;
    --root-bg: #fafbfc;
    --color-base-100: #ffffff;
    --color-base-200: #eef0f2;
    --color-base-300: #dcdee0;
    --color-base-content: #1e2328;
    --color-primary: oklch(0.51 0.121 242.478);
    --color-primary-content: #ffffff;
    --color-secondary: oklch(0.703 0.149 55.4);
    --color-secondary-content: #ffffff;
    --color-accent: oklch(0.677 0.132 228.142);
    --color-accent-content: #f3fbf6;
    --color-neutral: oklch(0.272 0.023 248.699);
    --color-neutral-content: #fafcff;
    --color-info: oklch(0.662 0.186 250.923);
    --color-info-content: #ffffff;
    --color-success: oklch(0.685 0.223 143.713);
    --color-success-content: #ffffff;
    --color-warning: oklch(0.782 0.158 72.327);
    --color-warning-content: #150a00;
    --color-error: oklch(0.629 0.238 30.78);
    --color-error-content: #ffffff;
    --radius-selector: 0.5rem;
    --radius-field: 0.25rem;
    --radius-box: 0.5rem;
    --size-selector: 0.25rem;
    --size-field: 0.25rem;
    --border: 1px;
    --depth: 0;
    --noise: 0;
}
```
