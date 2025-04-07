# Creating a New Layout Algorithm

This document provides a step-by-step guide for creating a new layout algorithm and integrating it into the bcm-visualizer codebase.

## Table of Contents

1. [Understanding the Layout System Architecture](#understanding-the-layout-system-architecture)
2. [Step 1: Create a New Layout Engine Class](#step-1-create-a-new-layout-engine-class)
3. [Step 2: Implement Required Methods](#step-2-implement-required-methods)
4. [Step 3: Add Advanced Features](#step-3-add-advanced-features)
5. [Step 4: Integration with the Project](#step-4-integration-with-the-project)
6. [Step 5: Testing Your Layout](#step-5-testing-your-layout)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Understanding the Layout System Architecture

The bcm-visualizer uses an abstract `LayoutEngine` class as the foundation for all layout algorithms. Each concrete implementation must calculate positions and dimensions for tree nodes.

### Key Components

- **LayoutEngine** (abstract class): Defines the interface for all layout engines
- **TreeNode**: The data structure representing nodes in the hierarchy
- **NodeLayout**: Contains position and dimension information for each node
- **LayoutOptions**: Configuration options for customizing layout behavior

### Layout Process Overview

1. The layout engine receives a tree structure (array of root nodes)
2. It calculates the position and size of each node
3. The calculated layout is used by renderers to create visual output

## Step 1: Create a New Layout Engine Class

Start by creating a new TypeScript file in the `src/layout` directory. Name it according to your layout algorithm (e.g., `RadialLayoutEngine.ts`).

```typescript
// src/layout/RadialLayoutEngine.ts
import { LayoutEngine } from './LayoutEngine.js';
import { TreeNode, NodeLayout, LayoutOptions } from '../types/index.js';
import textMeasurer from '../utils/textMeasure.js';

/**
 * Optional: Define extended layout options specific to your algorithm
 */
export interface RadialLayoutOptions extends LayoutOptions {
  // Add any additional options specific to radial layout
  radiusIncrement?: number;
  startAngle?: number;
  endAngle?: number;
}

/**
 * Layout engine that arranges nodes in a radial pattern
 */
export class RadialLayoutEngine extends LayoutEngine {
  // Define additional properties needed for your layout algorithm
  private styleOptions?: import('../types/index.js').StyleOptions;
  
  constructor(
    layoutOptions: RadialLayoutOptions = {},
    styleOptions?: import('../types/index.js').StyleOptions
  ) {
    // Pass layout options to parent class
    super(layoutOptions);
    // Store any additional options
    this.styleOptions = styleOptions;
  }

  // Implementation will be added in the next step
}
```

## Step 2: Implement Required Methods

Every layout engine must implement two methods from the abstract base class:

### 2.1 Implement `calculateLayout`

This method calculates the position and size for all nodes in the tree.

```typescript
/**
 * Calculate layout for a tree structure using a radial layout approach
 * 
 * @param rootNodes - Root nodes of the tree
 * @returns Root nodes with layout information added
 */
calculateLayout(rootNodes: TreeNode[]): TreeNode[] {
  // Implement your layout algorithm here
  
  // Example pseudocode for a radial layout:
  // 1. Determine the center point for the layout
  // 2. For each root node:
  //    - Position it at an angle around the center
  //    - Calculate its size based on content
  //    - Recursively position its children in sub-circles
  
  // Start with initial angle and radius
  let angle = 0;
  const centerX = 500; // Can be configured or calculated
  const centerY = 500; // Can be configured or calculated
  const spacing = this.options.spacing;
  
  // Process each root node
  for (const root of rootNodes) {
    // Calculate layout for this root and its descendants
    this.calculateNodeLayout(root, centerX, centerY, angle, 0);
    
    // Update angle for next root node
    if (root.layout) {
      angle += Math.PI / rootNodes.length * 2;
    }
  }
  
  return rootNodes;
}

/**
 * Calculate layout for a specific node and its children
 * 
 * @param node - The node to calculate layout for
 * @param centerX - Center X position
 * @param centerY - Center Y position
 * @param angle - Angle in radians for this node
 * @param level - Depth level in the tree (0 for roots)
 * @returns The calculated layout
 */
private calculateNodeLayout(
  node: TreeNode, 
  centerX: number, 
  centerY: number, 
  angle: number, 
  level: number
): NodeLayout {
  // Implement your node positioning algorithm
  
  // ... Your implementation here ...
  
  // Return the calculated layout
  return node.layout!;
}
```

### 2.2 Implement `getDiagramDimensions`

This method calculates the overall dimensions of the diagram.

```typescript
/**
 * Get the total dimensions of the diagram
 * 
 * @param rootNodes - Root nodes with layout information
 * @returns The width and height of the entire diagram
 */
getDiagramDimensions(rootNodes: TreeNode[]): { width: number; height: number } {
  if (rootNodes.length === 0 || !rootNodes[0]?.layout) {
    return { width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  // Helper function to find min/max bounds recursively
  const findBounds = (node: TreeNode) => {
    if (!node.layout) return;
    
    const { x, y, width, height } = node.layout;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
    
    // Process children
    node.children.forEach(findBounds);
  };
  
  // Process all roots
  rootNodes.forEach(findBounds);
  
  return {
    width: maxX - minX,
    height: maxY - minY
  };
}
```

## Step 3: Add Advanced Features

Consider adding advanced features to enhance your layout algorithm:

### 3.1 Node Size Calculation

Properly calculating node dimensions based on content:

```typescript
private calculateNodeSize(node: TreeNode): { width: number; height: number } {
  const fontSize = this.styleOptions?.fontSize ?? 14;
  const fontFamily = this.styleOptions?.fontFamily ?? 'Arial, sans-serif';
  const titleMetrics = textMeasurer.measureText(node.data.name, fontSize, fontFamily);
  const titleHeight = titleMetrics.height + this.options.padding * 2;
  
  const isLeaf = node.children.length === 0;
  const leafNodeWidth = this.styleOptions?.leafNodeWidth;
  
  if (isLeaf) {
    const width = (typeof leafNodeWidth === 'number' && leafNodeWidth > 0)
      ? leafNodeWidth
      : Math.max(titleMetrics.width + this.options.padding * 2, this.options.minNodeWidth);
    const height = Math.max(titleHeight, this.options.minNodeHeight);
    
    return { width, height };
  }
  
  // For non-leaf nodes, calculation may depend on children
  // ... Implementation depends on your layout algorithm ...
  
  return {
    width: Math.max(calculatedWidth, this.options.minNodeWidth),
    height: Math.max(calculatedHeight, this.options.minNodeHeight)
  };
}
```

### 3.2 Optimization Techniques

Optimize your layout for aesthetic appeal or specific requirements:

- Avoid node overlap
- Balance the tree
- Minimize edge crossings
- Optimize for specific aspect ratios or space constraints

### 3.3 Multi-Pass Layout

For complex layouts, consider using a multi-pass approach:

1. First pass: Calculate initial sizes without final positioning
2. Second pass: Use the size information to optimize the overall layout
3. Final pass: Set the definitive positions

## Step 4: Integration with the Project

### 4.1 Export Your Layout Engine

Update the `src/layout/index.ts` file to export your new layout engine:

```typescript
// Add this to the exports
export * from './RadialLayoutEngine.js';

// Add import
import { RadialLayoutEngine } from './RadialLayoutEngine.js';

// Update the createLayoutEngine function to include your new engine
export function createLayoutEngine(
  layoutOptions: LayoutOptions = {},
  styleOptions?: StyleOptions
): LayoutEngine {
  // Add logic to determine when to use your layout engine
  if (layoutOptions.layoutType === 'radial') {
    return new RadialLayoutEngine(layoutOptions, styleOptions);
  } else if (layoutOptions.targetAspectRatio !== undefined) {
    return new AspectRatioGridLayoutEngine(layoutOptions, styleOptions);
  }
  return new GridLayoutEngine(layoutOptions, styleOptions);
}
```

### 4.2 Update Type Definitions

If you've added new options, update the `src/types/layout.ts` file:

```typescript
/**
 * Configuration options for the layout engine
 */
export interface LayoutOptions {
  /** Number of columns for child layout */
  columns?: number;
  
  /** Internal padding within boxes */
  padding?: number;
  
  /** Spacing between sibling boxes */
  spacing?: number;
  
  /** Minimum width for a node */
  minNodeWidth?: number;
  
  /** Minimum height for a node */
  minNodeHeight?: number;
  
  /** Target aspect ratio (width/height) for the layout */
  targetAspectRatio?: number;
  
  /** Layout type identifier */
  layoutType?: 'grid' | 'aspect-ratio' | 'radial';
  
  // Add any other new options
}
```

## Step 5: Testing Your Layout

### 5.1 Create Unit Tests

Add unit tests in the `test` directory to verify your layout algorithm:

```typescript
// test/radial-layout.spec.ts
import { RadialLayoutEngine } from '../src/layout/RadialLayoutEngine';
import { TreeNode } from '../src/types';

describe('RadialLayoutEngine', () => {
  let engine: RadialLayoutEngine;
  let sampleTree: TreeNode[];
  
  beforeEach(() => {
    engine = new RadialLayoutEngine();
    
    // Create a simple test tree
    sampleTree = [
      {
        data: { id: 'root', name: 'Root Node', parent: null },
        children: [
          {
            data: { id: 'child1', name: 'Child 1', parent: 'root' },
            children: []
          },
          {
            data: { id: 'child2', name: 'Child 2', parent: 'root' },
            children: []
          }
        ]
      }
    ];
  });
  
  test('should calculate layout for all nodes', () => {
    const result = engine.calculateLayout(sampleTree);
    
    // Verify root has layout
    expect(result[0].layout).toBeDefined();
    
    // Verify children have layout
    expect(result[0].children[0].layout).toBeDefined();
    expect(result[0].children[1].layout).toBeDefined();
    
    // Add more specific tests for your algorithm
  });
  
  test('should calculate diagram dimensions correctly', () => {
    const result = engine.calculateLayout(sampleTree);
    const dimensions = engine.getDiagramDimensions(result);
    
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    
    // Add more specific tests for your algorithm
  });
  
  // Add more tests for specific behaviors of your layout
});
```

### 5.2 Visual Testing

Use the examples in the project to visually test your layout:

1. Update one of the example files to use your new layout engine
2. Run the example to generate visual output
3. Verify that the layout appears as expected

## Best Practices

### Performance Considerations

- Analyze the time complexity of your algorithm (especially for large trees)
- Use efficient data structures
- Consider using memoization for expensive calculations
- Optimize recursive operations that might be called frequently

### Code Quality

- Add thorough JSDoc comments to explain your algorithm
- Use meaningful variable and method names
- Break complex algorithms into smaller, focused methods
- Handle edge cases (empty trees, single nodes, etc.)

### Layout Aesthetics

- Ensure nodes don't overlap
- Maintain consistent spacing between nodes
- Make efficient use of available space
- Consider the readability of the final diagram

## Troubleshooting

### Common Issues

- **Node Overlap**: Ensure your algorithm allocates sufficient space between nodes
- **Inconsistent Sizing**: Verify that node size calculations correctly handle text measurements
- **Performance Problems**: Look for recursive operations that can be optimized
- **Layout Engine Not Selected**: Check that the `createLayoutEngine` function correctly identifies when to use your engine

### Debugging Tips

- Use `console.log` statements to trace the values of key variables
- Visualize intermediate steps of your algorithm
- Create simplified test cases to isolate issues
- Review the implementation of existing layout engines for reference