# Basecoat Chart Quality Inspection Checklist

- [ ] Series colors use `var(--chart-1)` through `var(--chart-5)`.
- [ ] No hardcoded hex color codes in series options.
- [ ] Responsive chart viewport wrapper specifies `w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]`.
- [ ] Outer container specifies `chart-container card p-6 flex flex-col gap-4 w-full` with `role="img"` and `aria-label`.
- [ ] Glassmorphic tooltip markup includes `data-chart-tooltip`, `bg-background/95`, `backdrop-blur-sm`, and `border-border`.
- [ ] Screen-reader accessible data table fallback (`<table class="sr-only">`) is present inside the chart container.
- [ ] Grid border colors use `var(--border)` or `var(--color-border)`.
- [ ] All numeric tooltips and axis labels use `tabular-nums`.
- [ ] Macro integration: `dashboard-01` and `svg-area-chart` bind to `data-chart-id="area-interactive"`.
