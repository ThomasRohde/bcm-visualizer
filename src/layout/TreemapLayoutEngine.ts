import { LayoutEngine } from './LayoutEngine.js'; // Assuming LayoutEngine path
import { TreeNode, NodeLayout, LayoutOptions, StyleOptions } from '../types/index.js'; // Assuming types path
import textMeasurer from '../utils/textMeasure.js'; // Assuming textMeasurer path

/**
 * Extended layout options specific to the Treemap layout
 */
export interface TreemapLayoutOptions extends LayoutOptions {
  // Specific options for treemap layout
  targetLeafAspectRatio?: number; // Ideal aspect ratio for leaf nodes (width/height, e.g., 1.0 for square)
  aspectRatioWeight?: number; // Weight factor for aspect ratio influence (0-1, higher means stronger enforcement)
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
export class TreemapLayoutEngine extends LayoutEngine {  private styleOptions?: StyleOptions;
  private targetLeafAspectRatio: number;
  private aspectRatioWeight: number;

  constructor(
    layoutOptions: TreemapLayoutOptions = {},
    styleOptions?: StyleOptions
  ) {
    // Define default options specific to TreemapLayoutEngine
    const defaultTreemapOptions: Partial<TreemapLayoutOptions> = {
      targetLeafAspectRatio: 1.0, // Default to aiming for square leaves
      aspectRatioWeight: 0.7, // Default weight for aspect ratio enforcement (70%)
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
    this.aspectRatioWeight = mergedOptions.aspectRatioWeight ?? 0.7;
  }

  /**
   * Calculate layout for a tree structure using a squarified treemap approach.
   *
   * @param rootNodes - Root nodes of the tree.
   * @returns Root nodes with layout information added.
   */  calculateLayout(rootNodes: TreeNode[]): TreeNode[] {
    if (rootNodes.length === 0) {
      return [];
    }

    // First calculate node values to determine space requirements
    const valuedNodes = rootNodes.map(root => this.calculateNodeValues(root));
    
    // Calculate adaptive initial bounds based on total content size
    // instead of a fixed 1000x1000 area
    let totalArea = 0;
    let maxLeafWidth = 0;
    let maxLeafHeight = 0;
    
    // Calculate the total area needed and find maximum leaf dimensions
    const calculateAreaNeeded = (node: TreemapNode) => {
      totalArea += node.value;
      
      if (node.children.length === 0 && node.layout) {
        maxLeafWidth = Math.max(maxLeafWidth, node.layout.width);
        maxLeafHeight = Math.max(maxLeafHeight, node.layout.height);
      }
      
      node.children.forEach(child => calculateAreaNeeded(child as TreemapNode));
    };
    
    valuedNodes.forEach(root => calculateAreaNeeded(root as TreemapNode));
      // Determine appropriate initial bounds based on content
    // For very large models, use moderate scaling from a reasonable base size
    const baseSize = 800; // Smaller base size to prevent huge SVGs
    // More controlled scaling with a maximum cap to prevent excessive growth
    const scaleFactor = Math.min(2.0, Math.max(1, Math.sqrt(totalArea / 10000) * 0.5)); 
    
    // Calculate dimensions that maintain a reasonable aspect ratio
    let initialWidth = baseSize * scaleFactor;
    let initialHeight = baseSize * scaleFactor;
    
    // Adjust aspect ratio based on leaf nodes (which often determine layout constraints)
    if (maxLeafWidth > 0 && maxLeafHeight > 0) {
      const leafAspectRatio = maxLeafWidth / maxLeafHeight;
      // Make more subtle adjustments to the aspect ratio
      if (leafAspectRatio > 1.5) {
        // Wider content - increase width moderately
        initialWidth *= 1.1;
      } else if (leafAspectRatio < 0.67) {
        // Taller content - increase height moderately
        initialHeight *= 1.1;
      }
    }
    
    // Use these adaptive bounds for initial layout
    const initialBounds = { 
      x: 0, 
      y: 0, 
      width: Math.max(initialWidth, 1000),  // Ensure minimum size
      height: Math.max(initialHeight, 1000) // Ensure minimum size
    };
    
    // Apply the layout with our adaptive bounds
    valuedNodes.forEach(root => {
      this.layoutNodeRecursive(root as TreemapNode, initialBounds.x, initialBounds.y, initialBounds.width, initialBounds.height);
    });

    // Position root nodes side by side
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
    let wrappedWidth = maxLineWidth + padding * 2;
    let wrappedHeight = lines.length * singleLineHeight + padding * 2;

    wrappedWidth = Math.max(wrappedWidth, this.options.minNodeWidth);
    wrappedHeight = Math.max(wrappedHeight, this.options.minNodeHeight);

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
    */   private squarify(nodes: TreemapNode[], x: number, y: number, w: number, h: number): void {
       if (nodes.length === 0) {
           return;
       }

        // Ensure we have valid dimensions to work with
        if (w <= 0 || h <= 0) {
            console.warn('Invalid dimensions for squarify layout', { x, y, w, h });
            return;
        }

        // Sort nodes by value descending (important for the algorithm)
        // The calculateNodeValues should ideally preserve order, but sorting ensures correctness.
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
        let currentY = y;        if (w >= h) { // Layout horizontally
            const rowWidth = w;
            const rowHeight = h * areaRatio;
            let nodeX = x;
            
            // Add a tiny gap between nodes to prevent overlap - a fraction of a pixel is enough
            const gapAdjustment = 0.1; 
            
            for (const node of currentNodes) {
                // Calculate node width, ensuring it doesn't exceed available space
                const calculatedWidth = rowWidth * (node.value / currentValue);
                const nodeWidth = Math.min(calculatedWidth, (x + w) - nodeX);
                
                if (nodeWidth <= 0) continue; // Skip nodes that would have zero width
                
                // Apply the layout with a small gap adjustment to prevent exact edge touching
                node.layout = { 
                    x: nodeX, 
                    y: currentY, 
                    width: Math.max(0, nodeWidth - gapAdjustment), 
                    height: Math.max(0, rowHeight - gapAdjustment) 
                };
                
                // Only recurse if we have actual space
                if (nodeWidth > this.options.minNodeWidth && rowHeight > this.options.minNodeHeight) {
                    this.squarify(node.children as TreemapNode[], nodeX, currentY, nodeWidth, rowHeight);
                }
                
                // Move to next position exactly (without subtracting the gap) to maintain proper spacing
                nodeX += nodeWidth;
            }
            
            // Update bounds for remaining nodes, ensuring we don't exceed original bounds
            const newY = y + rowHeight;
            const newH = h - rowHeight;
            
            // Only continue if we have actual space left
            if (newH > 0) {
                y = newY;
                h = newH;
            }

        } else { // Layout vertically
            const colWidth = w * areaRatio;
            const colHeight = h;
            let nodeY = y;
            
            // Add a tiny gap between nodes to prevent overlap
            const gapAdjustment = 0.1;
            
            for (const node of currentNodes) {
                // Calculate node height, ensuring it doesn't exceed available space
                const calculatedHeight = colHeight * (node.value / currentValue);
                const nodeHeight = Math.min(calculatedHeight, (y + h) - nodeY);
                
                if (nodeHeight <= 0) continue; // Skip nodes that would have zero height
                
                // Apply the layout with a small gap adjustment to prevent exact edge touching
                node.layout = { 
                    x: currentX, 
                    y: nodeY, 
                    width: Math.max(0, colWidth - gapAdjustment), 
                    height: Math.max(0, nodeHeight - gapAdjustment) 
                };
                
                // Only recurse if we have actual space
                if (colWidth > this.options.minNodeWidth && nodeHeight > this.options.minNodeHeight) {
                    this.squarify(node.children as TreemapNode[], currentX, nodeY, colWidth, nodeHeight);
                }
                
                // Move to next position exactly (without subtracting the gap) to maintain proper spacing
                nodeY += nodeHeight;
            }
            
            // Update bounds for remaining nodes, ensuring we don't exceed original bounds
            const newX = x + colWidth;
            const newW = w - colWidth;
            
            // Only continue if we have actual space left
            if (newW > 0) {
                x = newX;
                w = newW;
            }
        }

        // Layout remaining nodes in the adjusted rectangle
        if (remainingNodes.length > 0) {
            this.squarify(remainingNodes, x, y, w, h);
        }
   }    /**
     * Calculates the worst aspect ratio for a given row/column of nodes,
     * taking into account the target aspect ratio preference.
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
            
            // Calculate the raw aspect ratio (always >= 1)
            const rawAspectRatio = Math.max(length / nodeLength, nodeLength / length);
            
            // Calculate how far this aspect ratio is from our target
            // Convert to width/height format (may be < 1)
            const nodeWidthToHeight = (w >= h) ? nodeLength / length : length / nodeLength;
            
            // Distance from target (where 0 is perfect)
            const targetDistance = Math.abs(nodeWidthToHeight - this.targetLeafAspectRatio);
            
            // Combine raw aspect ratio with target distance, weighted by aspectRatioWeight
            const weightedAspectRatio = 
                (1 - this.aspectRatioWeight) * rawAspectRatio + 
                this.aspectRatioWeight * (rawAspectRatio * (1 + targetDistance));
                
            maxAspectRatio = Math.max(maxAspectRatio, weightedAspectRatio);
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

    node.layout = { x, y, width, height };

    if (!node.children || node.children.length === 0) {
      node.layout.width = Math.max(node.layout.width, this.options.minNodeWidth);
      node.layout.height = Math.max(node.layout.height, this.options.minNodeHeight);
      return;
    }

    const innerX = x + padding;
    const innerY = y + padding;
    const innerWidth = Math.max(0, width - 2 * padding);
    const innerHeight = Math.max(0, height - 2 * padding);

    this.squarify(node.children as TreemapNode[], innerX, innerY, innerWidth, innerHeight);

    for (const child of node.children as TreemapNode[]) {
      if (!child.layout) continue;

      child.layout.x += spacing;
      child.layout.y += spacing;
      child.layout.width = Math.max(0, child.layout.width - 2 * spacing);
      child.layout.height = Math.max(0, child.layout.height - 2 * spacing);

      child.layout.width = Math.max(child.layout.width, this.options.minNodeWidth);
      child.layout.height = Math.max(child.layout.height, this.options.minNodeHeight);
    }

    // After enforcing minimums, check if children overflow parent
    let maxRight = innerX;
    let maxBottom = innerY;
    for (const child of node.children as TreemapNode[]) {
      if (!child.layout) continue;
      maxRight = Math.max(maxRight, child.layout.x + child.layout.width);
      maxBottom = Math.max(maxBottom, child.layout.y + child.layout.height);
    }

    const parentRight = innerX + innerWidth;
    const parentBottom = innerY + innerHeight;

    const overflowX = maxRight > parentRight;
    const overflowY = maxBottom > parentBottom;

    if (overflowX || overflowY) {
      const scaleX = overflowX ? (innerWidth / (maxRight - innerX)) : 1;
      const scaleY = overflowY ? (innerHeight / (maxBottom - innerY)) : 1;
      const scale = Math.min(scaleX, scaleY);

      for (const child of node.children as TreemapNode[]) {
        if (!child.layout) continue;
        const relX = child.layout.x - innerX;
        const relY = child.layout.y - innerY;

        child.layout.width = Math.max(child.layout.width * scale, this.options.minNodeWidth);
        child.layout.height = Math.max(child.layout.height * scale, this.options.minNodeHeight);
        child.layout.x = innerX + relX * scale;
        child.layout.y = innerY + relY * scale;
      }
    }    // Update parent's size to fully enclose children plus padding
    // Only adjust if we have children with layouts
    if (node.children.length > 0 && node.children.some(child => child.layout)) {
      let minX = Infinity;
      let minY = Infinity;
      maxRight = -Infinity;
      maxBottom = -Infinity;
      
      for (const child of node.children as TreemapNode[]) {
        if (!child.layout) continue;
        minX = Math.min(minX, child.layout.x);
        minY = Math.min(minY, child.layout.y);
        maxRight = Math.max(maxRight, child.layout.x + child.layout.width);
        maxBottom = Math.max(maxBottom, child.layout.y + child.layout.height);
      }
      
      // Only update if we found valid bounds
      if (minX !== Infinity && minY !== Infinity && maxRight !== -Infinity && maxBottom !== -Infinity) {
        // Apply padding around the children's collective bounds
        const newX = minX - padding;
        const newY = minY - padding;
        const newWidth = (maxRight - minX) + (2 * padding);
        const newHeight = (maxBottom - minY) + (2 * padding);
        
        // Update the node's layout
        node.layout.x = newX;
        node.layout.y = newY;
        node.layout.width = Math.max(newWidth, this.options.minNodeWidth);
        node.layout.height = Math.max(newHeight, this.options.minNodeHeight);
      }
    }

    for (const child of node.children as TreemapNode[]) {
      if (!child.layout) continue;

      const childRight = child.layout.x + child.layout.width;
      const childBottom = child.layout.y + child.layout.height;

      if (childRight > maxRight) {
        child.layout.width = Math.max(0, maxRight - child.layout.x);
      }
      if (childBottom > maxBottom) {
        child.layout.height = Math.max(0, maxBottom - child.layout.y);
      }

      this.layoutNodeRecursive(child, child.layout.x, child.layout.y, child.layout.width, child.layout.height);
    }
  }

}