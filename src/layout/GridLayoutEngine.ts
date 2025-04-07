import { LayoutEngine } from './LayoutEngine.js';
import { TreeNode, NodeLayout } from '../types/index.js';
import textMeasurer from '../utils/textMeasure.js';

/**
 * Layout engine that arranges children in a grid/flow layout
 */
export class GridLayoutEngine extends LayoutEngine {
  /**
   * Calculate layout for each node in the tree
   * 
   * @param rootNodes - Root nodes of the tree
   * @returns The same nodes with layout information added
   */
  calculateLayout(rootNodes: TreeNode[]): TreeNode[] {
    // Start with initial X position
    let startX = 0;
    let maxHeight = 0;
    
    // Process each root node
    for (const root of rootNodes) {
      // Calculate layout for this root and its descendants
      this.calculateNodeLayout(root, startX, 0);
      
      // Update starting position for next root node
      if (root.layout) {
        startX = root.layout.x + root.layout.width + this.options.spacing;
        maxHeight = Math.max(maxHeight, root.layout.height);
      }
    }
    
    return rootNodes;
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
    const { fontSize = 14, fontFamily = 'Arial, sans-serif' } = {};
    
    // Calculate title height (node name)
    const titleMetrics = textMeasurer.measureText(node.data.name, fontSize, fontFamily);
    const titleHeight = titleMetrics.height + this.options.padding * 2;
    
    // Start with minimum dimensions
    let width = Math.max(titleMetrics.width + this.options.padding * 2, this.options.minNodeWidth);
    
    // Calculate layout for children (if any)
    if (node.children.length > 0) {
      const childLayouts = this.calculateChildrenLayout(node.children, this.options.columns);
      
      // Content area starts after the title
      const contentX = x + this.options.padding;
      const contentY = y + titleHeight;
      
      // Update node width and height based on children
      width = Math.max(width, childLayouts.width + this.options.padding * 2);
      const height = titleHeight + childLayouts.height + this.options.padding;
      
      // Store layout information
      node.layout = {
        x,
        y,
        width,
        height,
        contentArea: {
          x: contentX,
          y: contentY,
          width: width - this.options.padding * 2,
          height: height - titleHeight - this.options.padding
        }
      };
      
      // Position children within the content area
      this.positionChildren(node.children, childLayouts, contentX, contentY);
    } else {
      // Leaf node - just use the minimum height
      const height = Math.max(titleHeight, this.options.minNodeHeight);
      
      // Store layout
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
    }
    
    return node.layout;
  }
  
  /**
   * Calculate the layout for a group of children
   * 
   * @param children - Child nodes
   * @param columns - Number of columns for layout
   * @returns The width and height of the area needed for the children
   */
  private calculateChildrenLayout(children: TreeNode[], columns: number): { width: number; height: number } {
    if (children.length === 0) {
      return { width: 0, height: 0 };
    }
    
    // Initial sizing - calculate space needed for each child
    const childSizes: { width: number; height: number }[] = children.map(child => {
      // Get text dimensions for this child
      const { fontSize = 14, fontFamily = 'Arial, sans-serif' } = {};
      const textMetrics = textMeasurer.measureText(child.data.name, fontSize, fontFamily);
      
      // Initial size based on text
      let width = Math.max(textMetrics.width + this.options.padding * 2, this.options.minNodeWidth);
      let height = Math.max(textMetrics.height + this.options.padding * 2, this.options.minNodeHeight);
      
      // If child has children, calculate their layout recursively
      if (child.children.length > 0) {
        const subLayout = this.calculateChildrenLayout(child.children, columns);
        width = Math.max(width, subLayout.width + this.options.padding * 2);
        height += subLayout.height + this.options.padding;
      }
      
      return { width, height };
    });
    
    // Calculate grid dimensions
    const rows = Math.ceil(children.length / columns);
    const columnWidths: number[] = new Array(columns).fill(0);
    const rowHeights: number[] = new Array(rows).fill(0);
    
    // Assign sizes to grid cells
    children.forEach((_, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      columnWidths[col] = Math.max(columnWidths[col], childSizes[index].width);
      rowHeights[row] = Math.max(rowHeights[row], childSizes[index].height);
    });
    
    // Calculate total width and height
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0) + 
      (columnWidths.length - 1) * this.options.spacing;
    
    const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0) + 
      (rowHeights.length - 1) * this.options.spacing;
    
    return {
      width: totalWidth,
      height: totalHeight
    };
  }
  
  /**
   * Position child nodes within their parent's content area
   * 
   * @param children - Child nodes to position
   * @param layout - Layout information for the children's area
   * @param startX - Starting X position for the children
   * @param startY - Starting Y position for the children
   */
  private positionChildren(
    children: TreeNode[],
    layout: { width: number; height: number },
    startX: number,
    startY: number
  ): void {
    if (children.length === 0) return;

    const columns = this.options.columns;
    const rows = Math.ceil(children.length / columns);

    // First, calculate layout for each child at dummy position to get final size
    children.forEach(child => {
      this.calculateNodeLayout(child, 0, 0);
    });

    // Compute max width/height per grid cell based on actual child layout sizes
    const columnWidths: number[] = new Array(columns).fill(0);
    const rowHeights: number[] = new Array(rows).fill(0);

    children.forEach((child, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      const childWidth = child.layout ? child.layout.width : 0;
      const childHeight = child.layout ? child.layout.height : 0;

      columnWidths[col] = Math.max(columnWidths[col], childWidth);
      rowHeights[row] = Math.max(rowHeights[row], childHeight);
    });

    // Calculate accumulated column positions
    const colPositions: number[] = [0];
    for (let i = 1; i < columns; i++) {
      colPositions[i] = colPositions[i - 1] + columnWidths[i - 1] + this.options.spacing;
    }

    // Calculate accumulated row positions
    const rowPositions: number[] = [0];
    for (let i = 1; i < rows; i++) {
      rowPositions[i] = rowPositions[i - 1] + rowHeights[i - 1] + this.options.spacing;
    }

    // Position each child at correct position
    children.forEach((child, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      const x = startX + colPositions[col];
      const y = startY + rowPositions[row];

      // Re-calculate layout at final position (sizes stay the same)
      this.calculateNodeLayout(child, x, y);
    });
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
    
    let maxWidth = 0;
    let maxHeight = 0;
    
    rootNodes.forEach(node => {
      if (node.layout) {
        const right = node.layout.x + node.layout.width;
        const bottom = node.layout.y + node.layout.height;
        
        maxWidth = Math.max(maxWidth, right);
        maxHeight = Math.max(maxHeight, bottom);
      }
    });
    
    return {
      width: maxWidth,
      height: maxHeight
    };
  }
}
