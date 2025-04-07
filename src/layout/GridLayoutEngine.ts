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
