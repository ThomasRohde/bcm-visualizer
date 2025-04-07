# Hierarchical Diagram Generator

A flexible tool to automatically create visual diagrams representing hierarchical data structures. The generator takes structured JSON data as input and produces diagrams styled with nested, colored, rectangular boxes. This is perfect for visualizing:

- Organizational charts
- Capability maps
- Feature breakdowns
- System architectures
- Business domain models
- Business Capability Models (BCM)

## Features

- **Automated Generation**: Eliminate manual effort in creating and updating hierarchical diagrams
- **Flexible Input**: Accept a clearly defined JSON structure representing the hierarchy
- **Multiple Formats**: Generate diagrams in SVG, PNG, and PDF formats
- **Customizable Styling**: Configure colors, fonts, spacing, and layout behavior
- **Level-based Coloring**: Apply different colors based on the hierarchy level
- **Multiple Usage Modes**:
  - Node.js library for direct integration into code
  - Command-line tool for quick diagram generation
  - Browser bundle for client-side visualization

## Installation

```bash
# As a library
npm install hierarchical-diagram-generator

# As a global CLI tool
npm install -g hierarchical-diagram-generator
```

## Input Format

The generator accepts an array of JSON objects with the following structure:

```json
[
  { "id": "root", "name": "Root Node", "parent": null },
  { "id": "child1", "name": "Child 1", "parent": "root" },
  { "id": "child2", "name": "Child 2", "parent": "root" },
  { "id": "grandchild1", "name": "Grandchild 1", "parent": "child1" }
]
```

Each node requires:
- `id`: A unique string identifier
- `name`: Display text for the node
- `parent`: ID of the parent node, or `null` for root nodes

See more examples in the `docs-input-format.md` file.

## Usage

### As a Node.js Library

```javascript
import { generateDiagram } from 'hierarchical-diagram-generator';

const data = [
  { id: 'root', name: 'Root Node', parent: null },
  { id: 'child1', name: 'Child 1', parent: 'root' },
  { id: 'child2', name: 'Child 2', parent: 'root' }
];

const options = {
  layout: {
    columns: 2,
    padding: 10,
    spacing: 5
  },
  style: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    backgroundColor: '#f0f0f0',
    colorByLevel: true,
    colorPalette: {
      0: '#f0f0f0',      // Root level
      1: '#d0e8f2',      // First level
      2: '#e6f5d0',      // Second level
      'leaf': '#ffe6e6'  // Special color for leaf nodes
    }
  },
  format: 'svg'
};

// Generate SVG
const svg = await generateDiagram(data, options);
fs.writeFileSync('diagram.svg', svg);
```

### As a CLI Tool

```bash
hierarchical-diagram-generator -i input.json -o diagram.svg --format svg --columns 3 --color-palette '{"0":"#f0f0f0","1":"#d0e8f2","2":"#e6f5d0","leaf":"#ffe6e6"}' --color-by-level
```

Available options:
```
Options:
  --input, -i         Input JSON file path                       [string] [required]
  --output, -o        Output file path               [string] [default: "diagram.svg"]
  --format, -f        Output format (svg, png, pdf)
                                                  [choices: "svg", "png", "pdf"] [default: "svg"]
  --columns           Number of columns for child layout         [number] [default: 2]
  --padding           Internal padding within boxes              [number] [default: 10]
  --spacing           Spacing between sibling boxes              [number] [default: 5]
  --font-family       Font family for node text      [string] [default: "Arial, sans-serif"]
  --font-size         Font size for node text                    [number] [default: 14]
  --font-color        Color for node text                  [string] [default: "#000000"]
  --border-width      Width of node borders                       [number] [default: 1]
  --border-color      Color of node borders                [string] [default: "#000000"]
  --border-radius     Radius for rounded corners                  [number] [default: 5]
  --background-color  Default background color for nodes   [string] [default: "#f0f0f0"]
  --color-palette     JSON string mapping node IDs or levels to colors
                                                           [string] [default: "{}"]
  --color-by-level    Enable level-based coloring          [boolean] [default: false]
  --help              Show help                                            [boolean]
```

### In Browser

```html
<div id="diagram-container"></div>

<script src="diagram-generator.umd.js"></script>
<script>
  const data = [
    { id: 'root', name: 'Root Node', parent: null },
    { id: 'child1', name: 'Child 1', parent: 'root' },
    { id: 'child2', name: 'Child 2', parent: 'root' }
  ];
  
  const options = {
    layout: { columns: 2 },
    style: { 
      fontFamily: 'Arial, sans-serif',
      colorByLevel: true,
      colorPalette: {
        0: '#f0f0f0',      // Root level
        1: '#d0e8f2',      // First level
        2: '#e6f5d0',      // Second level
        'leaf': '#ffe6e6'  // Special color for leaf nodes
      }
    }
  };
  
  DiagramGenerator.default.render(data, document.getElementById('diagram-container'), options);
</script>
```

## Configuration Options

### Layout Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | number | 2 | Number of columns for child nodes layout |
| `padding` | number | 10 | Internal padding within boxes (px) |
| `spacing` | number | 5 | Spacing between sibling boxes (px) |
| `minNodeWidth` | number | 100 | Minimum width for a node (px) |
| `minNodeHeight` | number | 40 | Minimum height for a node (px) |

### Style Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fontFamily` | string | 'Arial, sans-serif' | Font for node text |
| `fontSize` | number | 14 | Font size for node text (px) |
| `fontColor` | string | '#000000' | Text color |
| `borderWidth` | number | 1 | Width of node borders (px) |
| `borderColor` | string | '#000000' | Color of node borders |
| `borderRadius` | number | 5 | Rounded corner radius for nodes (px) |
| `backgroundColor` | string | '#f0f0f0' | Default background color |
| `colorPalette` | object | {} | Maps node IDs or hierarchy levels to colors |
| `colorByLevel` | boolean | false | When true, uses colorPalette keys as hierarchy levels (0, 1, 2, etc.) instead of node IDs |
| `padding` | number | 10 | Internal padding within nodes (px) |

## Coloring Strategies

This library supports two different strategies for coloring diagram nodes:

### 1. Node ID-based Coloring (Default)

When `colorByLevel` is `false`, the `colorPalette` maps top-level node IDs to colors. All descendants of a top-level node will inherit its color.

Example:
```javascript
const options = {
  style: {
    colorPalette: {
      "digital-self-service": "#cce5ff",
      "communication": "#d4edda",
      "human": "#fff3cd",
      "atms": "#f8d7da"
    }
  }
};
```

### 2. Level-based Coloring

When `colorByLevel` is `true`, the `colorPalette` maps hierarchy levels to colors. Level 0 represents root nodes, level 1 represents their direct children, and so on.

Example:
```javascript
const options = {
  style: {
    colorByLevel: true,
    colorPalette: {
      0: "#f0f0f0",      // Root level
      1: "#d0e8f2",      // First level
      2: "#e6f5d0",      // Second level
      3: "#f9e2d2",      // Third level
      "leaf": "#ffe6e6"  // Special color for leaf nodes (nodes with no children)
    }
  }
};
```

## Examples

See the `examples` directory for sample code and usage patterns:

- `nodejs-example.js`: Example Node.js library usage
- `browser-example.html`: Example browser usage
- `bcm-style-example.js`: Example of Business Capability Model style diagram
- `bcm-style-example.svg`: Output of the BCM example
- `format-converter.js`: Utility for converting between formats
- `generate-bcm-diagram.js`: Script to generate a BCM diagram
- `convert-to-json.js`: Utility to convert data to JSON format

## Development

### Project Structure

```
hierarchical-diagram-generator/
├── src/                      # TypeScript source code
│   ├── types/                # Shared TypeScript interfaces
│   ├── core/                 # Core logic: hierarchy building, orchestration
│   ├── layout/               # Layout calculation logic
│   ├── rendering/            # SVG rendering
│   ├── output/               # Format conversion (SVG -> PNG, PDF)
│   ├── utils/                # Utility functions
│   ├── config/               # Default configurations
│   ├── cli.ts                # Entry point for CLI tool
│   ├── index.ts              # Main library exports
│   └── browser.ts            # Entry point for browser bundle
├── test/                     # Unit and integration tests
│   ├── fixtures/             # Sample input JSON files
│   └── *.spec.ts             # Test files
└── examples/                 # Usage examples
```

### Building the Project

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Create browser bundle
npm run bundle
```

## License

MIT
