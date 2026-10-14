# Authentication Blueprints: Complete Catalog

## 1. Login Archetypes (`login-01..05`)
- `login-01`: Clean centered card with email/password and OAuth buttons.
- `login-02`: Split-screen branded hero (left promotional testimonial, right login form).
- `login-03`: Minimal single-column auth with floating labels and magic link toggle.
- `login-04`: Enterprise SSO login with auto-domain detection and SAML redirect.
- `login-05`: Modal dialog login overlay with smooth backdrop blur.

## 2. Signup Archetypes (`signup-01..05`)
- `signup-01`: Standard onboarding signup card with terms checkbox and password strength bar.
- `signup-02`: Split-screen signup with customer testimonial and product showcase.
- `signup-03`: Multi-step wizard signup (Account -> Workspace -> Plan selection).
- `signup-04`: Team invite-accept signup with pre-filled email and workspace badge.
- `signup-05`: Minimal waitlist early-access signup with email and referral code.

## 3. OTP Verification Archetypes (`otp-01..05`)
- `otp-01`: 6-digit segmented input-otp card with auto-focus and resend countdown timer.
- `otp-02`: Split-screen two-factor authentication (2FA) verification.
- `otp-03`: Recovery backup code entry with switch to SMS/authenticator app.
- `otp-04`: In-app step-up security verification modal for sensitive operations.
- `otp-05`: Email verification confirmation screen with 6-digit PIN input.

---

## Canonical Blueprint: `login-02` (Split-Screen Branded Auth)

```html
<div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
  <!-- Left Column: Branded Hero Showcase -->
  <div class="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
    <div class="flex items-center gap-2 font-semibold">
      <div class="flex size-8 items-center justify-center rounded-lg bg-primary-foreground text-primary font-bold">A</div>
      <span>Acme Platform</span>
    </div>
    <div class="space-y-2">
      <blockquote class="text-lg font-medium leading-relaxed">
        &ldquo;Basecoat UI enabled us to deliver high-performance enterprise dashboards with zero JavaScript runtime overhead.&rdquo;
      </blockquote>
      <footer class="text-sm opacity-80">&mdash; Sofia Davis, VP of Engineering</footer>
    </div>
  </div>

  <!-- Right Column: Login Form -->
  <div class="flex items-center justify-center p-8">
    <div class="w-full max-w-sm space-y-6">
      <header class="flex flex-col space-y-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p class="text-sm text-muted-foreground">Enter your credentials to access your workspace</p>
      </header>

      <form class="space-y-4" novalidate>
        <div class="field flex flex-col gap-2" data-invalid="false">
          <label for="email" class="label text-sm font-medium">Email</label>
          <input id="email" type="email" class="input" placeholder="name@company.com" required />
        </div>
        <div class="field flex flex-col gap-2" data-invalid="false">
          <div class="flex items-center justify-between">
            <label for="password" class="label text-sm font-medium">Password</label>
            <a href="/forgot-password" class="text-xs text-muted-foreground hover:underline">Forgot password?</a>
          </div>
          <input id="password" type="password" class="input" required />
        </div>
        <button type="submit" class="btn w-full" data-variant="default" data-state="default">
          Sign In
        </button>
      </form>
    </div>
  </div>
</div>
```
