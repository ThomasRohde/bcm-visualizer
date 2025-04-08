import { LayoutEngine } from './LayoutEngine.js'; // Assuming LayoutEngine path
import { TreeNode, NodeLayout, LayoutOptions, StyleOptions } from '../types/index.js'; // Assuming types path
import textMeasurer from '../utils/textMeasure.js'; // Assuming textMeasurer path

/**
 * Extended layout options specific to the Treemap layout
 */
export interface TreemapLayoutOptions extends LayoutOptions {
  // Add any specific options if needed in the future
  targetLeafAspectRatio?: number; // Ideal aspect ratio for wrapped text (e.g., 1.0 for square)
}

// Internal interface for treemap processing
interface TreemapNode extends TreeNode {
  value: number; // Area value used for treemap calculation
  layout: NodeLayout; // Ensure layout is always present during processing
}

/**
 * Layout engine that arranges nodes using a squarified treemap algorithm.
 * Leaf node sizes are determined by their label text, with word-wrapping applied.
 */
export class TreemapLayoutEngine extends LayoutEngine {
  private styleOptions?: StyleOptions;
  private targetLeafAspectRatio: number;

  constructor(
    layoutOptions: TreemapLayoutOptions = {},
    styleOptions?: StyleOptions
  ) {
    // Define default options specific to TreemapLayoutEngine
    const defaultTreemapOptions: Partial<TreemapLayoutOptions> = {
      targetLeafAspectRatio: 1.0, // Default to aiming for square leaves
      layoutType: 'treemap', // Identify layout type
      padding: 10,
      spacing: 5,
      minNodeWidth: 5, // Treemaps can have small nodes
      minNodeHeight: 5
    };
    
    // Merge defaults with user options
    const mergedOptions = {
      ...defaultTreemapOptions,
      ...layoutOptions // User options override defaults
    };
    
    super(mergedOptions); // Pass merged options to base class constructor
    
    // Store additional properties
    this.styleOptions = styleOptions;
    this.targetLeafAspectRatio = mergedOptions.targetLeafAspectRatio!;

  }

  /**
   * Calculate layout for a tree structure using a squarified treemap approach.
   *
   * @param rootNodes - Root nodes of the tree.
   * @returns Root nodes with layout information added.
   */
  calculateLayout(rootNodes: TreeNode[]): TreeNode[] {
    if (rootNodes.length === 0) {
      return [];
    }

    const valuedNodes = rootNodes.map(root => this.calculateNodeValues(root));

    const initialBounds = { x: 0, y: 0, width: 1000, height: 1000 };

    valuedNodes.forEach(root => {
      this.layoutNodeRecursive(root as TreemapNode, initialBounds.x, initialBounds.y, initialBounds.width, initialBounds.height);
    });

    let currentX = 0;
    for (const root of valuedNodes) {
      if (root.layout) {
        const offsetX = currentX - root.layout.x;
        this.offsetNodeLayout(root, offsetX, 0);
        currentX = root.layout.x + root.layout.width + (this.options.spacing * 2);
      }
    }

    return valuedNodes;
  }

  /**
   * Get the total dimensions required for the diagram.
   *
   * @param rootNodes - Root nodes with layout information.
   * @returns The width and height of the entire diagram.
   */
  getDiagramDimensions(rootNodes: TreeNode[]): { width: number; height: number } {
     if (rootNodes.length === 0 || !rootNodes[0]?.layout) {
       return { width: 0, height: 0 };
     }

     let minX = Infinity;
     let minY = Infinity;
     let maxX = -Infinity;
     let maxY = -Infinity;

     const findBounds = (node: TreeNode) => {
       if (!node.layout) return;
       const { x, y, width, height } = node.layout;
       minX = Math.min(minX, x);
       minY = Math.min(minY, y);
       maxX = Math.max(maxX, x + width);
       maxY = Math.max(maxY, y + height);

       node.children.forEach(findBounds);
     };

     rootNodes.forEach(findBounds);

     // Add padding around the entire diagram
     const padding = this.options.padding;
     const finalWidth = (maxX === -Infinity) ? 0 : maxX - minX + padding * 2;
     const finalHeight = (maxY === -Infinity) ? 0 : maxY - minY + padding * 2;

        // Adjust final layout positions to start at padding offset
     if (finalWidth > 0 || finalHeight > 0) {
        const offsetX = padding - minX;
        const offsetY = padding - minY;
         rootNodes.forEach(root => this.offsetNodeLayout(root, offsetX, offsetY));
     }


     return {
       width: finalWidth,
       height: finalHeight
     };
  }

   // --- Helper Methods ---

   /**
   * Recursively calculates the 'value' (area) for each node.
   * Leaf node values are based on wrapped text size.
   * Parent node values are the sum of their children's values.
   */
  private calculateNodeValues(node: TreeNode): TreemapNode {
    // Ensure layout object exists
    if (!node.layout) {
        node.layout = { x: 0, y: 0, width: 0, height: 0 };
    }

    let value: number;
    if (!node.children || node.children.length === 0) {
      // Leaf Node: Calculate size based on wrapped text
      const { width, height } = this.calculateLeafNodeSize(node as TreemapNode);
      // Use area as the value
      value = Math.max(width * height, 1); // Ensure value is at least 1
       // Store calculated size directly in layout for leaves
       node.layout.width = width;
       node.layout.height = height;

    } else {
      // Parent Node: Sum of children values
      value = node.children
        .map(child => this.calculateNodeValues(child).value)
        .reduce((sum, v) => sum + v, 0);
        // Parent node dimensions will be determined by treemap algorithm later
    }

    // Add 'value' property to the node (casting to TreemapNode)
    const treemapNode = node as TreemapNode;
    treemapNode.value = value;
    return treemapNode;
  }

  /**
   * Calculates the optimal width and height for a leaf node's label,
   * applying word wrapping to approach the target aspect ratio.
   */  private calculateLeafNodeSize(node: TreemapNode): { width: number; height: number } {
    const label = node.data.name || '';
    const fontSize = this.styleOptions?.fontSize ?? 14; // Default font size
    const fontFamily = this.styleOptions?.fontFamily ?? 'Arial, sans-serif'; // Default font family
    const padding = this.options.padding;
    const targetAspectRatio = this.targetLeafAspectRatio; // e.g., 1.0 for square

    if (!label) {
      return { width: this.options.minNodeWidth, height: this.options.minNodeHeight };
    }

    // Estimate total text area without wrapping
    const singleLineMetrics = textMeasurer.measureText(label, fontSize, fontFamily); //
    const singleLineWidth = singleLineMetrics.width;
    const singleLineHeight = singleLineMetrics.height;
    const targetTotalArea = singleLineWidth * singleLineHeight; // Target area based on unwrapped text

    // Estimate ideal width/height based on target aspect ratio and area
    // area = w * h; ratio = w / h => w = ratio * h
    // area = (ratio * h) * h = ratio * h^2 => h = sqrt(area / ratio)
    // w = area / h
    const idealHeight = Math.sqrt(targetTotalArea / targetAspectRatio);
    const idealWidth = targetTotalArea / idealHeight;

    // --- Basic Word Wrapping Logic ---
    // This is a simplified approach. A more robust solution might involve
    // iteratively testing widths or using a dedicated text wrapping library.
    // Inspired by Stack Overflow example [cite: Stack Overflow]

    const words = label.split(/[\s-]+/); // Split by space or hyphen
    let currentLine = '';
    const lines: string[] = [];
    let maxLineWidth = 0;

    // Try to wrap close to the idealWidth
    const testWidth = Math.max(idealWidth, this.options.minNodeWidth - padding * 2);

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = textMeasurer.measureText(testLine, fontSize, fontFamily);

      if (metrics.width <= testWidth || !currentLine) {
        currentLine = testLine;
      } else {
        // Add the previous line
        lines.push(currentLine);
         maxLineWidth = Math.max(maxLineWidth, textMeasurer.measureText(currentLine, fontSize, fontFamily).width);
        // Start new line
        currentLine = word;
      }
    }
     // Add the last line
     lines.push(currentLine);
     maxLineWidth = Math.max(maxLineWidth, textMeasurer.measureText(currentLine, fontSize, fontFamily).width);


    // Calculate final dimensions based on wrapped lines
    const wrappedWidth = Math.max(maxLineWidth + padding * 2, this.options.minNodeWidth);
    // Estimate height based on number of lines and font size/line height
     // Use measured height of a single line as an approximation for line height
    const wrappedHeight = Math.max(lines.length * singleLineHeight + padding * 2, this.options.minNodeHeight);


    return { width: wrappedWidth, height: wrappedHeight };
  }


   /**
    * Applies the squarified treemap algorithm recursively.
    * Based on the algorithm by Bruls, Huizing, and van Wijk.
    * Adapted from concepts seen in huy-nguyen/squarify [cite: GitHub].
    *
    * @param nodes Nodes to layout in the current rectangle.
    * @param x Current rectangle left coordinate.
    * @param y Current rectangle top coordinate.
    * @param w Current rectangle width.
    * @param h Current rectangle height.
    */
   private squarify(nodes: TreemapNode[], x: number, y: number, w: number, h: number): void {
       if (nodes.length === 0) {
           return;
       }

        // Sort nodes by value descending (important for the algorithm)
       // The calculateNodeValues should ideally preserve order, but sorting ensures correctness.
       // If calculateNodeValues guarantees original child order, sorting might be skipped
       // IF the original data was already appropriately sorted. Assuming not sorted here.
        nodes.sort((a, b) => b.value - a.value);


       let totalValue = nodes.reduce((sum, node) => sum + node.value, 0);
       let currentNodes: TreemapNode[] = [];
       let currentValue = 0;
       let bestScore = Infinity; // Lower score is better (closer to 1)

       // Find the best prefix of nodes to layout in the current row/column
       for (let i = 0; i < nodes.length; i++) {
           const node = nodes[i];
           const potentialNodes = [...currentNodes, node];
           const potentialValue = currentValue + node.value;

           const score = this.calculateWorstAspectRatio(potentialNodes, potentialValue, w, h, totalValue);

           if (score <= bestScore) {
               currentNodes = potentialNodes;
               currentValue = potentialValue;
               bestScore = score;
           } else {
               // Score started getting worse, layout the currentNodes
               break;
           }
       }

        // Layout the selected nodes (currentNodes)
        const remainingNodes = nodes.slice(currentNodes.length);
        const areaRatio = currentValue / totalValue;

        let currentX = x;
        let currentY = y;

        if (w >= h) { // Layout horizontally
            const rowWidth = w;
            const rowHeight = h * areaRatio;
            let nodeX = x;
            for (const node of currentNodes) {
                const nodeWidth = rowWidth * (node.value / currentValue);
                node.layout = { x: nodeX, y: currentY, width: nodeWidth, height: rowHeight };
                 this.squarify(node.children as TreemapNode[], nodeX, currentY, nodeWidth, rowHeight); // Recurse into children
                nodeX += nodeWidth;
            }
             // Update bounds for remaining nodes
             y += rowHeight;
             h -= rowHeight;

        } else { // Layout vertically
            const colWidth = w * areaRatio;
            const colHeight = h;
            let nodeY = y;
            for (const node of currentNodes) {
                const nodeHeight = colHeight * (node.value / currentValue);
                node.layout = { x: currentX, y: nodeY, width: colWidth, height: nodeHeight };
                 this.squarify(node.children as TreemapNode[], currentX, nodeY, colWidth, nodeHeight); // Recurse into children
                nodeY += nodeHeight;
            }
            // Update bounds for remaining nodes
            x += colWidth;
            w -= colWidth;
        }

        // Layout remaining nodes in the adjusted rectangle
        if (remainingNodes.length > 0) {
            this.squarify(remainingNodes, x, y, w, h);
        }
   }

    /**
     * Calculates the worst aspect ratio for a given row/column of nodes.
     */
    private calculateWorstAspectRatio(nodes: TreemapNode[], totalValue: number, w: number, h: number, parentTotalValue: number): number {
        if (totalValue === 0 || nodes.length === 0) {
            return Infinity;
        }

         const areaRatio = totalValue / parentTotalValue;
        let length: number; // Length of the side the row/column occupies
        let rowLength: number; // Length of the row/column itself

         if (w >= h) { // Laying out horizontally
            length = h * areaRatio; // This is the height of the row
            rowLength = w; // The row occupies the full width
         } else { // Laying out vertically
            length = w * areaRatio; // This is the width of the column
            rowLength = h; // The column occupies the full height
         }

        let maxAspectRatio = 0;
        for (const node of nodes) {
            const nodeLength = rowLength * (node.value / totalValue);
            const aspectRatio = Math.max(length / nodeLength, nodeLength / length);
            maxAspectRatio = Math.max(maxAspectRatio, aspectRatio);
        }
        return maxAspectRatio;
    }


     /**
     * Recursively finds the min/max bounds of a node and its children.
     */
    private getNodeBounds(node: TreeNode): { minX: number; minY: number; maxX: number; maxY: number } {
        let minX = node.layout?.x ?? Infinity;
        let minY = node.layout?.y ?? Infinity;
        let maxX = node.layout ? (node.layout.x + node.layout.width) : -Infinity;
        let maxY = node.layout ? (node.layout.y + node.layout.height) : -Infinity;

        for (const child of node.children) {
            const childBounds = this.getNodeBounds(child);
            minX = Math.min(minX, childBounds.minX);
            minY = Math.min(minY, childBounds.minY);
            maxX = Math.max(maxX, childBounds.maxX);
            maxY = Math.max(maxY, childBounds.maxY);
        }
        return { minX, minY, maxX, maxY };
    }

     /**
     * Recursively applies an offset to a node and its children's layouts.
     */
    private offsetNodeLayout(node: TreeNode, dx: number, dy: number): void {
        if (node.layout) {
            node.layout.x += dx;
            node.layout.y += dy;
        }
        node.children.forEach(child => this.offsetNodeLayout(child, dx, dy));
    }

  /**
   * Recursively layout a node and its children with padding.
   */
  private layoutNodeRecursive(node: TreemapNode, x: number, y: number, width: number, height: number): void {
    const padding = this.options.padding;
    const spacing = this.options.spacing;

    // Set node layout to full area
    node.layout = { x, y, width, height };

    if (!node.children || node.children.length === 0) {
      return; // Leaf done
    }

    // Shrink bounds for children by padding
    const innerX = x + padding;
    const innerY = y + padding;
    const innerWidth = Math.max(0, width - 2 * padding);
    const innerHeight = Math.max(0, height - 2 * padding);

    this.squarify(node.children as TreemapNode[], innerX, innerY, innerWidth, innerHeight);

    // Apply spacing by shrinking each child rectangle
    for (const child of node.children as TreemapNode[]) {
      if (!child.layout) continue;
      child.layout.x += spacing;
      child.layout.y += spacing;
      child.layout.width = Math.max(0, child.layout.width - 2 * spacing);
      child.layout.height = Math.max(0, child.layout.height - 2 * spacing);

      // Recursively layout children inside their rectangles
      this.layoutNodeRecursive(child, child.layout.x, child.layout.y, child.layout.width, child.layout.height);
    }
  }

}

// --- Integration Example (in your project's layout factory) ---
/*
// In src/layout/index.ts or similar

import { TreemapLayoutEngine, TreemapLayoutOptions } from './TreemapLayoutEngine.js'; // Adjust path

export function createLayoutEngine(
  layoutOptions: LayoutOptions = {},
  styleOptions?: StyleOptions
): LayoutEngine {
  // ... other layout engine checks (grid, radial, etc.)

  // Check if treemap layout is requested
  if (layoutOptions.layoutType === 'treemap') {
    return new TreemapLayoutEngine(layoutOptions as TreemapLayoutOptions, styleOptions);
  }

  // ... fallback to default layout engine
  return new GridLayoutEngine(layoutOptions, styleOptions); // Example fallback
}
*/