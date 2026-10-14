# Dashboard Theming & Dark Mode Protocol

## Theme Tokens & Resolver

Basecoat dashboards rely on class-based theming (`html.dark`). All surfaces must reference semantic tokens:
- `bg-background` -> Primary ground
- `bg-card text-card-foreground` -> Surface panels and metric cards
- `bg-popover text-popover-foreground` -> Elevated overlays, menus, dialogs
- `border-border` -> 1px subtle divider strokes

## Head Bootstrap Script
```html
<script>
  try {
    var m = localStorage.getItem('themeMode');
    document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
  } catch (e) {}
</script>
```
