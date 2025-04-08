import { LayoutEngine } from './LayoutEngine.js';
import { TreeNode, NodeLayout } from '../types/index.js';
import textMeasurer from '../utils/textMeasure.js';

/**
 * Layout engine that arranges children in a grid/flow layout
 */
export class GridLayoutEngine extends LayoutEngine {
  private styleOptions?: import('../types/index.js').StyleOptions;

  constructor(
    layoutOptions: import('../types/index.js').LayoutOptions = {},
    styleOptions?: import('../types/index.js').StyleOptions
  ) {
    super(layoutOptions);
    this.styleOptions = styleOptions;
  }

  /**
   * Calculate layout for each node in the tree
   * 
   * @param rootNodes - Root nodes of the tree
   * @returns The same nodes with layout information added
   */
  calculateLayout(rootNodes: TreeNode[]): TreeNode[] {
    if (rootNodes.length === 0) {
      return [];
    }

    // Pre-calculate node sizes to determine total space requirements
    let totalWidth = 0;
    let totalHeight = 0;
    let maxNodeWidth = 0;
    let maxNodeHeight = 0;
    let totalNodes = 0;

    // First pass: calculate sizes without positioning
    const preCalculatedNodes = rootNodes.map(root => {
      // Calculate layout at a dummy position (0,0)
      this.calculateNodeLayout(root, 0, 0);
      
      if (root.layout) {
        totalWidth += root.layout.width;
        totalHeight = Math.max(totalHeight, root.layout.height);
        maxNodeWidth = Math.max(maxNodeWidth, root.layout.width);
        maxNodeHeight = Math.max(maxNodeHeight, root.layout.height);
        
        // Count total nodes including descendants
        const countNodes = (node: TreeNode): number => {
          return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
        };
        
        totalNodes += countNodes(root);
      }
      
      return root;
    });
    
    // Add spacing between root nodes
    if (rootNodes.length > 1) {
      totalWidth += (rootNodes.length - 1) * this.options.spacing;
    }
    
    // Determine appropriate initial bounds and scaling
    // For very large models with many nodes, provide more space
    const baseSize = 1000;
    const nodeCountFactor = Math.sqrt(totalNodes / 50) * 0.5; // Scale based on node count
    const sizeFactor = Math.max(
      1, 
      Math.sqrt((totalWidth * totalHeight) / (baseSize * baseSize)) * 0.8,
      nodeCountFactor
    );
    
    // Calculate dimensions that maintain aspect ratio of content
    const contentAspectRatio = totalWidth / Math.max(totalHeight, 1);
    
    // Adjust for extreme aspect ratios
    let horizontalAdjustment = 1.0;
    let verticalAdjustment = 1.0;
    
    if (contentAspectRatio > 2.5) {
      // Very wide content - increase width scaling
      horizontalAdjustment = 1.2;
    } else if (contentAspectRatio < 0.4) {
      // Very tall content - increase height scaling
      verticalAdjustment = 1.2;
    }
    
    // Start with initial X position using adaptive scaling
    let startX = this.options.padding;
    let startY = this.options.padding;
    let maxHeight = 0;
    
    // Second pass: Position each root node with the adaptive bounds
    for (const root of preCalculatedNodes) {
      // Apply the layout with our adaptive dimensions
      this.calculateNodeLayout(root, startX, startY);
      
      // Update starting position for next root node
      if (root.layout) {
        startX = root.layout.x + root.layout.width + this.options.spacing;
        maxHeight = Math.max(maxHeight, root.layout.height);
      }
    }
    
    return preCalculatedNodes;
  }
  
  /**
   * Calculate layout for a specific node and its children
   * 
   * @param node - The node to calculate layout for
   * @param x - Starting X position
   * @param y - Starting Y position
   * @returns The calculated layout
   */
  private calculateNodeLayout(node: TreeNode, x: number, y: number): NodeLayout {
    const fontSize = this.styleOptions?.fontSize ?? 14;
    const fontFamily = this.styleOptions?.fontFamily ?? 'Arial, sans-serif';
    const titleMetrics = textMeasurer.measureText(node.data.name, fontSize, fontFamily);
    const titleHeight = titleMetrics.height + this.options.padding * 2;

    const isLeaf = node.children.length === 0;
    const leafNodeWidth = this.styleOptions?.leafNodeWidth;

    let width: number;
    let height: number;

    if (isLeaf) {
      width = (typeof leafNodeWidth === 'number' && leafNodeWidth > 0)
        ? leafNodeWidth
        : Math.max(titleMetrics.width + this.options.padding * 2, this.options.minNodeWidth);
      height = Math.max(titleHeight, this.options.minNodeHeight);

      node.layout = {
        x,
        y,
        width,
        height,
        contentArea: {
          x: x + this.options.padding,
          y: y + titleHeight,
          width: width - this.options.padding * 2,
          height: height - titleHeight - this.options.padding
        }
      };
      return node.layout;
    }

    // First, pre-calculate child sizes by calling calculateNodeLayout at dummy positions
    // This gives us the true size requirements for each child
    const childSizes = node.children.map(child => {
      const layout = this.calculateNodeLayout(child, 0, 0);
      return { width: layout.width, height: layout.height };
    });

    // Arrange children in grid
    const columns = this.options.columns;
    const rows = Math.ceil(node.children.length / columns);
    
    // Calculate the maximum width for each column and height for each row
    const columnWidths = new Array(columns).fill(0);
    const rowHeights = new Array(rows).fill(0);

    childSizes.forEach((size, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      
      // Find maximum width needed for this column
      columnWidths[col] = Math.max(columnWidths[col], size.width);
      
      // Find maximum height needed for this row
      rowHeights[row] = Math.max(rowHeights[row], size.height);
    });

    // Calculate the total required width and height for the children
    const totalChildWidth = columnWidths.reduce((sum, w) => sum + w, 0) + 
                           ((columnWidths.length - 1) * this.options.spacing);
    const totalChildHeight = rowHeights.reduce((sum, h) => sum + h, 0) + 
                            ((rowHeights.length - 1) * this.options.spacing);

    // Calculate the required size for this node
    width = Math.max(
      totalChildWidth + this.options.padding * 2, 
      titleMetrics.width + this.options.padding * 2, 
      this.options.minNodeWidth
    );
    height = titleHeight + totalChildHeight + this.options.padding;

    // Create layout object for this node
    node.layout = {
      x,
      y,
      width,
      height,
      contentArea: {
        x: x + this.options.padding,
        y: y + titleHeight,
        width: width - this.options.padding * 2,
        height: height - titleHeight - this.options.padding
      }
    };

    // Now position the children within the content area
    const startX = node.layout.contentArea!.x;
    const startY = node.layout.contentArea!.y;
    
    // Calculate the starting position for each column and row
    const colPositions = [0]; // First column starts at x=0 relative to content area
    for (let i = 1; i < columns; i++) {
      colPositions[i] = colPositions[i-1] + columnWidths[i-1] + this.options.spacing;
    }
    
    const rowPositions = [0]; // First row starts at y=0 relative to content area
    for (let i = 1; i < rows; i++) {
      rowPositions[i] = rowPositions[i-1] + rowHeights[i-1] + this.options.spacing;
    }

    // Position each child at its final location
    node.children.forEach((child, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      
      // Calculate absolute position for the child
      const childX = startX + colPositions[col];
      const childY = startY + rowPositions[row];
      
      // Re-apply the layout at the final position
      this.calculateNodeLayout(child, childX, childY);
    });

    return node.layout;
  }
  
  /**
   * Get the total dimensions of the diagram
   * 
   * @param rootNodes - Root nodes with layout information
   * @returns The width and height of the entire diagram
   */
  getDiagramDimensions(rootNodes: TreeNode[]): { width: number; height: number } {
    if (rootNodes.length === 0) {
      return { width: 0, height: 0 };
    }
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    // Find the full bounds of all nodes and their children
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
      
      // A helper to offset node positions
      const offsetNodeLayout = (node: TreeNode, dx: number, dy: number) => {
        if (node.layout) {
          node.layout.x += dx;
          node.layout.y += dy;
          
          // Update content area as well if it exists
          if (node.layout.contentArea) {
            node.layout.contentArea.x += dx;
            node.layout.contentArea.y += dy;
          }
        }
        
        node.children.forEach(child => offsetNodeLayout(child, dx, dy));
      };
      
      rootNodes.forEach(root => offsetNodeLayout(root, offsetX, offsetY));
    }
    
    return {
      width: finalWidth,
      height: finalHeight
    };
  }
}
