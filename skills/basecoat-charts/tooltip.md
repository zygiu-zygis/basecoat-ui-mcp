# Custom Basecoat Chart Tooltips

## Custom HTML Tooltip Blueprint
ApexCharts allows rendering custom HTML tooltips. Basecoat styles tooltips using semantic popover tokens:

```javascript
const options = {
  tooltip: {
    custom: function({ series, seriesIndex, dataPointIndex, w }) {
      const value = series[seriesIndex][dataPointIndex];
      const label = w.globals.labels[dataPointIndex];
      return `
        <div class="popover rounded-md bg-popover p-2 text-popover-foreground shadow-md border border-border text-xs">
          <span class="font-medium">${label}</span>:
          <strong class="tabular-nums font-semibold ml-1">${value}</strong>
        </div>
      `;
    }
  }
};
```
