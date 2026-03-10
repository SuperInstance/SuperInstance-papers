# POLLN Spreadsheet Chart Rendering Engine

A comprehensive, high-performance chart rendering system for POLLN spreadsheets. Built with TypeScript and optimized for canvas-based rendering with reactive updates, animations, and rich interactions.

## Features

- **15+ Chart Types**: Line, Bar, Pie, Scatter, Heatmap, Candlestick, Area, Radar, Histogram, Box Plot, Bubble, Funnel, Gauge, Treemap, Waterfall
- **Canvas Rendering**: High-performance rendering using HTML5 Canvas
- **Reactive Updates**: Automatically update when cell data changes
- **Animations**: Smooth transitions with customizable easing functions
- **Interactive**: Tooltips, hover states, click handling, zoom, pan, and selection
- **Export**: Export to PNG, JPEG, SVG, PDF, and WebP formats
- **Responsive**: Automatically resize to container dimensions
- **TypeScript**: Full type safety and IntelliSense support
- **Extensible**: Plugin system for custom functionality

## Installation

```bash
npm install @polln/spreadsheet
```

## Quick Start

```typescript
import { renderChart, ChartType, ChartData, ChartOptions } from '@polln/spreadsheet/charts';

// Get container element
const container = document.getElementById('chart-container');

// Define chart data
const data: ChartData = {
  labels: ['January', 'February', 'March', 'April', 'May'],
  datasets: [{
    label: 'Sales',
    data: [
      { x: 'Jan', y: 100 },
      { x: 'Feb', y: 120 },
      { x: 'Mar', y: 90 },
      { x: 'Apr', y: 140 },
      { x: 'May', y: 160 },
    ],
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
    borderWidth: 2,
  }],
};

// Define chart options
const options: ChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  title: {
    display: true,
    text: 'Monthly Sales Report',
  },
  legend: {
    display: true,
    position: 'top',
  },
  tooltip: {
    enabled: true,
  },
};

// Create and render chart
const renderer = renderChart(container, {
  type: ChartType.LINE,
  data,
  options,
});

// Update with new data
const newData: ChartData = { /* ... */ };
renderer.update(newData);

// Export to PNG
await renderer.exportChart({ format: 'png', width: 1920, height: 1080 });

// Destroy when done
renderer.destroy();
```

## Chart Types

### Line Chart

```typescript
const config = {
  type: ChartType.LINE,
  data: lineData,
  options: {
    elements: {
      line: {
        tension: 0.4, // Smooth curves
      },
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
  },
};
```

### Bar Chart

```typescript
const config = {
  type: ChartType.BAR,
  data: barData,
  options: {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
};
```

### Pie Chart

```typescript
const config = {
  type: ChartType.PIE,
  data: pieData,
  options: {
    legend: {
      position: 'right',
    },
  },
};
```

### Scatter Chart

```typescript
const config = {
  type: ChartType.SCATTER,
  data: scatterData,
  options: {
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
      },
    },
  },
};
```

### Heatmap Chart

```typescript
const config = {
  type: ChartType.HEATMAP,
  data: heatmapData,
  options: {
    plugins: [
      {
        id: 'colorScale',
        afterDraw: (chart) => {
          // Custom color scale logic
        },
      },
    ],
  },
};
```

### Candlestick Chart

```typescript
const candlestickData: ChartData = {
  datasets: [{
    label: 'Stock Price',
    data: [
      {
        x: '2024-01-01',
        y: 100,
        metadata: {
          open: 95,
          high: 110,
          low: 90,
          close: 100,
        },
      },
      // ... more data points
    ],
  }],
};

const config = {
  type: ChartType.CANDLESTICK,
  data: candlestickData,
};
```

## Configuration

### Chart Options

```typescript
interface ChartOptions {
  // Responsive settings
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  width?: number;
  height?: number;

  // Title
  title?: {
    display?: boolean;
    text?: string | string[];
    color?: string;
    font?: {
      family?: string;
      size?: number;
      weight?: string;
    };
  };

  // Legend
  legend?: {
    display?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    labels?: {
      boxWidth?: number;
      padding?: number;
      font?: { family?: string; size?: number };
    };
  };

  // Tooltip
  tooltip?: {
    enabled?: boolean;
    mode?: 'single' | 'multi' | 'nearest';
    backgroundColor?: string;
    titleColor?: string;
    bodyColor?: string;
    callbacks?: {
      title?: (items: TooltipItem[]) => string;
      label?: (item: TooltipItem) => string;
    };
  };

  // Animation
  animation?: {
    duration?: number;
    easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  };

  // Axes
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  secondaryYAxis?: AxisConfig;

  // Plugins
  plugins?: ChartPlugin[];
}
```

### Axis Configuration

```typescript
interface AxisConfig {
  id: string;
  type: 'linear' | 'logarithmic' | 'time' | 'category';
  position: 'top' | 'bottom' | 'left' | 'right';
  display?: boolean;
  title?: string;
  min?: number | Date;
  max?: number | Date;
  ticks?: {
    callback?: (value: number) => string;
    maxTicksLimit?: number;
    stepSize?: number;
  };
  grid?: {
    display?: boolean;
    color?: string | string[];
    borderWidth?: number;
  };
}
```

## Reactive Updates

Charts can automatically update when spreadsheet cell data changes:

```typescript
const config = {
  type: ChartType.LINE,
  data: chartData,
  options: chartOptions,
  bindings: [
    {
      cellId: 'A1:A10',
      property: 'data',
      transform: (values) => {
        return values.map((v, i) => ({
          x: i,
          y: Number(v),
        }));
      },
    },
  ],
};
```

## Interactions

### Click Events

```typescript
renderer.on('click', (event) => {
  console.log('Chart clicked:', event);
});
```

### Hover Events

```typescript
renderer.on('hover', (event) => {
  console.log('Chart hovered:', event);
});
```

### Zoom and Pan

```typescript
const options: ChartOptions = {
  interaction: {
    mode: 'zoom',
  },
};

// Or use InteractionManager directly
import { InteractionManager } from '@polln/spreadsheet/charts';

const interactionManager = new InteractionManager(canvas);
interactionManager.setMode('zoom');
```

## Export

### Export to PNG

```typescript
const blob = await renderer.exportChart({
  format: 'png',
  width: 1920,
  height: 1080,
  quality: 1.0,
});

// Download
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'chart.png';
link.click();
```

### Export to PDF

```typescript
const blob = await renderer.exportChart({
  format: 'pdf',
  width: 1920,
  height: 1080,
  title: 'Sales Report',
  author: 'POLLN',
});
```

### High-Resolution Export

```typescript
const blob = await renderer.exportChart({
  format: 'png',
  width: 3840, // 2x resolution
  height: 2160,
});
```

## Customization

### Custom Colors

```typescript
import { generateDatasetColors } from '@polln/spreadsheet/charts';

const colors = generateDatasetColors(5);
// ['#2196F3', '#4CAF50', '#FFC107', '#FF5722', '#9C27B0']
```

### Custom Tooltip Formatters

```typescript
const options: ChartOptions = {
  tooltip: {
    callbacks: {
      title: (items) => {
        return `Data for ${items[0].label}`;
      },
      label: (item) => {
        return `${item.datasetIndex}: ${item.value.toLocaleString()}`;
      },
    },
  },
};
```

### Custom Plugins

```typescript
const customPlugin: ChartPlugin = {
  id: 'customPlugin',
  beforeDraw: (chart) => {
    // Custom drawing logic before chart is drawn
  },
  afterDraw: (chart) => {
    // Custom drawing logic after chart is drawn
  },
};

const options: ChartOptions = {
  plugins: [customPlugin],
};
```

## Performance

The chart engine is optimized for performance:

- **Virtual Rendering**: Only render visible elements for large datasets
- **Object Pooling**: Reuse objects to reduce garbage collection
- **Batch Updates**: Batch multiple updates together
- **RequestAnimationFrame**: Use RAF for smooth animations
- **Offscreen Canvas**: Use offscreen canvas for complex operations

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions, please use the GitHub issue tracker.
