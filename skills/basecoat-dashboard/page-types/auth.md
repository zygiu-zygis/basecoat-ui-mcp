---
name: page-types/auth
description: Strict rules for Basecoat authentication interfaces, split-screens, social sign-ins, and FSM submission states.
---

# Authentication Flows & Split-Screen Layout

## Guardrails

* **Layout Standard**:
  * Default to a balanced **Split-Screen Layout** (`min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground`).
  * On mobile viewports, hide the brand hero column (`hidden lg:flex`) to eliminate vertical clutter and let the user focus immediately on authentication.
* **Form Column Specifications**:
  * Center the form vertically and horizontally within its column (`flex flex-col items-center justify-center p-6 md:p-12`).
  * Constrain the form width strictly to `w-full max-w-sm space-y-6`.
  * Visual separation between social OAuth and email/password credentials:
    ```html
    <div class="relative my-4">
      <div class="absolute inset-0 flex items-center" aria-hidden="true"><div class="w-full border-t border-border"></div></div>
      <div class="relative flex justify-center text-xs uppercase"><span class="bg-background px-2 text-muted-foreground">Or continue with</span></div>
    </div>
    ```
* **Brand Hero Column Specifications**:
  * Fill the non-form side with a modern, low-contrast background: `bg-muted/30 border-s border-border flex flex-col justify-between p-12`.
  * Add a subtle CSS texture (e.g., radial gradient or fine grid) rather than heavy imagery.
  * Feature an elevated proof card (`.card p-6 bg-card/80 backdrop-blur`) displaying key platform value propositions, customer testimonials, or live uptime/trust metrics.
* **Alternative: Centered Card Layout**:
  * When a modal or compact auth flow is explicitly required, center a single card: `<div class="card w-full max-w-md mx-auto p-8 bg-card shadow-lg">`.
* **FSM Interactive States (`data-fsm-recipe="auth-flow"`)**:
  * The form container must declare `data-fsm-recipe="auth-flow"` and reflect its current state via `data-state`:
    * Idle / Default: `data-state="idle"`
    * Submitting: `data-state="submitting"` (submit button displays loading spinner and disables inputs)
    * Authenticated: `data-state="authenticated"` (brief success banner prior to redirect)
    * Error: `data-state="error"` (accessible alert banner summarizing credentials failure)

## Reference Basecoat Auth Split-Screen Layout

```html
<div class="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground" data-fsm-recipe="auth-flow" data-state="idle">
  <!-- Left Column: Authentication Form -->
  <main class="flex flex-col items-center justify-center p-6 md:p-12">
    <div class="w-full max-w-sm space-y-6">
      <!-- Brand Logo & Header -->
      <header class="space-y-2 text-center">
        <div class="inline-flex size-10 rounded-lg bg-primary items-center justify-center text-primary-foreground font-bold">
          BC
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p class="text-sm text-muted-foreground">Sign in to your Basecoat enterprise console.</p>
      </header>

      <!-- Social Provider Sign-in -->
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="btn btn-outline flex items-center justify-center gap-2 text-sm w-full">
          <svg class="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
          GitHub
        </button>
        <button type="button" class="btn btn-outline flex items-center justify-center gap-2 text-sm w-full">
          <svg class="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
          Google
        </button>
      </div>

      <!-- Divider -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center" aria-hidden="true"><div class="w-full border-t border-border"></div></div>
        <div class="relative flex justify-center text-xs uppercase"><span class="bg-background px-2 text-muted-foreground font-medium">Or continue with</span></div>
      </div>

      <!-- Form Inputs -->
      <form class="space-y-4">
        <div class="flex flex-col gap-1.5">
          <label for="email" class="text-sm font-medium text-foreground">Work Email</label>
          <input id="email" type="email" class="input w-full text-sm" placeholder="name@company.com" required />
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label for="password" class="text-sm font-medium text-foreground">Password</label>
            <a href="/forgot-password" class="text-xs text-primary hover:underline">Forgot password?</a>
          </div>
          <input id="password" type="password" class="input w-full text-sm" required />
        </div>

        <button type="submit" class="btn btn-primary w-full text-sm flex items-center justify-center gap-2" data-state="default">
          <span>Sign In</span>
        </button>
      </form>

      <p class="text-center text-xs text-muted-foreground">
        Don't have an account? <a href="/signup" class="text-primary font-medium hover:underline">Sign up</a>
      </p>
    </div>
  </main>

  <!-- Right Column: Hero Media & Proof (Hidden on Mobile) -->
  <aside class="hidden lg:flex flex-col justify-between p-12 bg-muted/30 border-s border-border relative overflow-hidden">
    <div class="flex items-center gap-2 font-semibold text-foreground">
      <span class="size-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">BC</span>
      <span>Basecoat Cloud</span>
    </div>

    <!-- Proof Card -->
    <article class="card p-6 bg-card/90 backdrop-blur text-card-foreground shadow-lg max-w-md">
      <blockquote class="text-sm italic text-foreground leading-relaxed">
        “Basecoat gave us the crisp, headless aesthetic of shadcn/ui across our entire web property with zero runtime bloat.”
      </blockquote>
      <div class="flex items-center gap-3 mt-4 pt-4 border-t border-border">
        <div class="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
          EK
        </div>
        <div>
          <p class="text-xs font-medium text-foreground">Elena Rostova</p>
          <p class="text-xs text-muted-foreground">Principal Architect, NeuralCore</p>
        </div>
      </div>
    </article>

    <footer class="text-xs text-muted-foreground">
      &copy; 2026 Basecoat UI. Built for modern high-performance engineering.
    </footer>
  </aside>
</div>
```
