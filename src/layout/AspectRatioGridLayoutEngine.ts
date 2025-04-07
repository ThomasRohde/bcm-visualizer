import { LayoutEngine } from './LayoutEngine.js';
import { TreeNode, NodeLayout, LayoutOptions } from '../types/index.js';
import textMeasurer from '../utils/textMeasure.js';

// Define extended LayoutOptions to include targetAspectRatio
export interface AspectRatioLayoutOptions extends LayoutOptions {
  targetAspectRatio?: number;
}

/**
 * Layout engine that arranges nodes aiming for a specific overall aspect ratio (e.g., 16:9).
 * It uses adaptive grids for children and arranges root nodes intelligently.
 */
export class AspectRatioGridLayoutEngine extends LayoutEngine {
  // Use the ! non-null assertion operator to tell TypeScript that this will be assigned in the constructor
  protected options!: Required<AspectRatioLayoutOptions>;
  private styleOptions?: import('../types/index.js').StyleOptions;

  constructor(
    layoutOptions: AspectRatioLayoutOptions = {},
    styleOptions?: import('../types/index.js').StyleOptions
  ) {
    // Create options without using this.options as a starting point
    const baseOptions = {
      columns: layoutOptions.columns ?? 2,
      padding: layoutOptions.padding ?? 10,
      spacing: layoutOptions.spacing ?? 15, // Enhanced default spacing
      minNodeWidth: layoutOptions.minNodeWidth ?? 120, // Enhanced default width
      minNodeHeight: layoutOptions.minNodeHeight ?? 50, // Enhanced default height
      targetAspectRatio: layoutOptions.targetAspectRatio ?? 16 / 9
    };
    
    // Pass the complete options object to parent
    super(baseOptions);
    
    // Store style options
    this.styleOptions = styleOptions;
  }

  /**
   * Calculate layout for the entire tree structure, aiming for the target aspect ratio.
   *
   * @param rootNodes - Root nodes of the tree
   * @returns The same nodes with layout information added
   */
  calculateLayout(rootNodes: TreeNode[]): TreeNode[] {
    if (rootNodes.length === 0) {
      return [];
    }

    // --- Pass 1: Calculate intrinsic sizes for all nodes (ignoring final position) ---
    // We need the sizes to determine the best arrangement, especially for root nodes.
    rootNodes.forEach(root => {
      this.calculateNodeLayoutRecursive(root, 0, 0, true); // isInitialCalculation = true
    });

    // --- Arrange Root Nodes ---
    if (rootNodes.length === 1) {
      // If only one root, its position is (0, 0), final layout calculation happens below
      // Reset its position before final calculation
       this.calculateNodeLayoutRecursive(rootNodes[0], 0, 0, false); // isInitialCalculation = false
    } else {
      // Multiple roots: Arrange them in a grid aiming for the target aspect ratio
      const rootArrangement = this.findBestGridArrangement(
        rootNodes.map(r => r.layout!), // Use calculated initial sizes
        this.options.targetAspectRatio
      );

      const rootPositions = this.calculateGridPositions(
        rootArrangement.gridConfig,
        rootNodes.length,
        0, // Start X
        0  // Start Y
      );

      // --- Pass 2: Calculate final layout with correct root positions ---
      rootNodes.forEach((root, index) => {
        const pos = rootPositions[index];
         // Recalculate layout starting from the determined root position
        this.calculateNodeLayoutRecursive(root, pos.x, pos.y, false); // isInitialCalculation = false
      });
    }

    return rootNodes;
  }

  /**
   * Recursively calculates the layout for a node and its children.
   * Can operate in two modes:
   *  - Initial calculation: Determines sizes without setting final positions deep in the tree.
   *  - Final calculation: Sets the definitive x, y positions based on parent's final position.
   *
   * @param node - The node to calculate layout for
   * @param x - Starting X position for this node
   * @param y - Starting Y position for this node
   * @param isInitialCalculation - If true, only calculates size; if false, calculates final position.
   * @returns The calculated layout for the current node.
   */
  private calculateNodeLayoutRecursive(node: TreeNode, x: number, y: number, isInitialCalculation: boolean): NodeLayout {
    // --- 1. Calculate Node's Intrinsic Size (Title) ---
    const fontSize = this.styleOptions?.fontSize ?? 14;
    const fontFamily = this.styleOptions?.fontFamily ?? 'Arial, sans-serif';
    const titleMetrics = textMeasurer.measureText(node.data.name, fontSize, fontFamily);
    const titleHeight = titleMetrics.height + this.options.padding * 2; // Includes top/bottom padding for title

    // --- 2. Handle Leaf Nodes ---
    if (node.children.length === 0) {
      const leafNodeWidthOption = this.styleOptions?.leafNodeWidth;
      const width = (typeof leafNodeWidthOption === 'number' && leafNodeWidthOption > 0)
        ? leafNodeWidthOption
        : Math.max(titleMetrics.width + this.options.padding * 2, this.options.minNodeWidth);
      const height = Math.max(titleHeight, this.options.minNodeHeight);

      node.layout = {
        x,
        y,
        width,
        height,
        // Content area is essentially zero for leaves in this model, or could be defined differently
        contentArea: { x: x + this.options.padding, y: y + titleHeight, width: 0, height: 0 }
      };
      return node.layout;
    }

    // --- 3. Handle Non-Leaf Nodes ---

    // --- 3a. Recursively Calculate Child Sizes (if needed) ---
    // Ensure all children have their layout calculated first (for size information)
    // Only run the recursive call if the child doesn't have a layout yet or if it's the initial pass
    node.children.forEach(child => {
        if (isInitialCalculation || !child.layout) {
            this.calculateNodeLayoutRecursive(child, 0, 0, isInitialCalculation); // Use dummy positions for size calculation
        }
        // If not initial calculation, the child layout *should* exist from pass 1,
        // but we will update its position later.
    });


    // --- 3b. Find Best Grid Arrangement for Children ---
    const childLayouts = node.children.map(child => child.layout!); // Assume layout exists now
    const bestChildArrangement = this.findBestGridArrangement(childLayouts, this.options.targetAspectRatio);
    const { gridConfig, totalWidth: childrenTotalWidth, totalHeight: childrenTotalHeight } = bestChildArrangement;

    // --- 3c. Calculate Parent Node Size ---
    const contentWidth = childrenTotalWidth;
    const contentHeight = childrenTotalHeight;

    const requiredWidth = contentWidth + this.options.padding * 2;
    const requiredHeight = titleHeight + contentHeight + this.options.padding; // Padding below title, no padding below content area? Add one more for bottom padding.
    const finalHeight = requiredHeight + this.options.padding; // Add bottom padding for the node itself

    const width = Math.max(
      requiredWidth,
      titleMetrics.width + this.options.padding * 2, // Ensure title fits
      this.options.minNodeWidth
    );
    const height = Math.max(finalHeight, this.options.minNodeHeight);

    // Define the content area box where children will be placed
    const contentArea = {
      x: x + this.options.padding,
      y: y + titleHeight,
      width: width - this.options.padding * 2, // Available width for content
      height: height - titleHeight - this.options.padding // Available height for content
    };

    // Center the children block within the available content area if the node is wider/taller than needed
     const childrenStartX = contentArea.x + Math.max(0, (contentArea.width - childrenTotalWidth) / 2);
     const childrenStartY = contentArea.y; // Usually align children to the top of the content area

    // --- 3d. Update Parent Layout Object ---
     // Only create/update if it's the final calculation or doesn't exist
     if (!isInitialCalculation || !node.layout) {
         node.layout = { x, y, width, height, contentArea };
     } else {
         // If initial calculation, just update size, keep x/y at 0,0 (or whatever they were)
         // This size is used for parent/root arrangement calculations.
         node.layout.width = width;
         node.layout.height = height;
         // Update contentArea dimensions but not position yet
         node.layout.contentArea = { ...contentArea, x: this.options.padding, y: titleHeight };
     }


    // --- 3e. Position Children (Only during Final Calculation) ---
    if (!isInitialCalculation) {
        const childPositions = this.calculateGridPositions(
            gridConfig,
            node.children.length,
            childrenStartX,
            childrenStartY
        );

        node.children.forEach((child, index) => {
            const childPos = childPositions[index];
            // Recursively call for the child at its *final* position
            // This ensures the child's own children are positioned relative to its final spot.
            this.calculateNodeLayoutRecursive(child, childPos.x, childPos.y, false);
        });
    }


    return node.layout; // Return the calculated/updated layout
  }

   /**
   * Helper to find the best grid arrangement (columns, widths, heights) for a set of items
   * based on their dimensions, aiming for a target aspect ratio.
   *
   * @param items - Array of objects with width and height properties (like NodeLayout)
   * @param targetAspectRatio - The desired width/height ratio
   * @returns An object containing the best grid configuration and total dimensions.
   */
    private findBestGridArrangement(
        items: Array<{ width: number; height: number }>,
        targetAspectRatio: number
    ): { gridConfig: GridConfig; totalWidth: number; totalHeight: number } {
        let bestConfig: GridConfig | null = null;
        let minAspectRatioDiff = Infinity;
        let bestTotalWidth = 0;
        let bestTotalHeight = 0;

        const n = items.length;
        if (n === 0) {
            return { gridConfig: { columns: 0, columnWidths: [], rowHeights: [] }, totalWidth: 0, totalHeight: 0 };
        }

        // Iterate through possible column counts (1 to n)
        for (let numCols = 1; numCols <= n; numCols++) {
            const numRows = Math.ceil(n / numCols);
            const columnWidths = new Array(numCols).fill(0);
            const rowHeights = new Array(numRows).fill(0);

            // Determine max width per column and max height per row
            items.forEach((item, index) => {
                const col = index % numCols;
                const row = Math.floor(index / numCols);
                columnWidths[col] = Math.max(columnWidths[col], item.width);
                rowHeights[row] = Math.max(rowHeights[row], item.height);
            });

            // Calculate total dimensions for this grid configuration
            const currentTotalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, numCols - 1) * this.options.spacing;
            const currentTotalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, numRows - 1) * this.options.spacing;

            if (currentTotalHeight === 0) continue; // Avoid division by zero

            const currentAspectRatio = currentTotalWidth / currentTotalHeight;
            const aspectRatioDiff = Math.abs(currentAspectRatio - targetAspectRatio);

             // Preference for grids closer to the target ratio.
             // Can add secondary criteria here (e.g., prefer squarer grids if diffs are equal)
            if (aspectRatioDiff < minAspectRatioDiff) {
                minAspectRatioDiff = aspectRatioDiff;
                bestConfig = { columns: numCols, columnWidths, rowHeights };
                bestTotalWidth = currentTotalWidth;
                bestTotalHeight = currentTotalHeight;
            }
             // Optional: Add a small tolerance and prefer fewer columns/rows if similar aspect ratio
             // else if (Math.abs(aspectRatioDiff - minAspectRatioDiff) < 0.1) { // Example tolerance
             //    // Prefer grid with fewer columns (often looks cleaner)
             //    if (numCols < bestConfig!.columns) {
             //       bestConfig = { columns: numCols, columnWidths, rowHeights };
             //       bestTotalWidth = currentTotalWidth;
             //       bestTotalHeight = currentTotalHeight;
             //    }
             // }
        }

        // Fallback if no best config found (shouldn't happen if n > 0)
        if (!bestConfig) {
             const fallbackCols = Math.ceil(Math.sqrt(n));
              console.warn("Could not find best grid arrangement, using fallback.");
             // Recalculate for fallback (simplified version)
             const numRows = Math.ceil(n / fallbackCols);
             const columnWidths = new Array(fallbackCols).fill(0);
             const rowHeights = new Array(numRows).fill(0);
             items.forEach((item, index) => {
                 const col = index % fallbackCols;
                 const row = Math.floor(index / fallbackCols);
                 columnWidths[col] = Math.max(columnWidths[col], item.width);
                 rowHeights[row] = Math.max(rowHeights[row], item.height);
             });
             bestTotalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, fallbackCols - 1) * this.options.spacing;
             bestTotalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, numRows - 1) * this.options.spacing;
             bestConfig = { columns: fallbackCols, columnWidths, rowHeights };
        }


        return { gridConfig: bestConfig!, totalWidth: bestTotalWidth, totalHeight: bestTotalHeight };
    }

    /**
     * Calculates the (x, y) positions for items arranged in a grid.
     *
     * @param gridConfig - The configuration of the grid (columns, widths, heights).
     * @param itemCount - The total number of items to position.
     * @param startX - The starting X coordinate for the grid.
     * @param startY - The starting Y coordinate for the grid.
     * @returns An array of {x, y} positions for each item.
     */
    private calculateGridPositions(
        gridConfig: GridConfig,
        itemCount: number,
        startX: number,
        startY: number
    ): Array<{ x: number; y: number }> {
        const positions: Array<{ x: number; y: number }> = [];
        const { columns, columnWidths, rowHeights } = gridConfig;

        if (columns === 0 || itemCount === 0) return [];

        // Pre-calculate cumulative row starting Y positions
        const rowStartY = [startY];
        for (let i = 0; i < rowHeights.length - 1; i++) {
            rowStartY.push(rowStartY[i] + rowHeights[i] + this.options.spacing);
        }

        // Pre-calculate cumulative column starting X positions
        const colStartX = [startX];
        for (let i = 0; i < columnWidths.length - 1; i++) {
            colStartX.push(colStartX[i] + columnWidths[i] + this.options.spacing);
        }

        for (let i = 0; i < itemCount; i++) {
            const col = i % columns;
            const row = Math.floor(i / columns);

            // Center item within its cell (optional, but often looks better)
            // This requires knowing the actual item's width/height which we don't have here.
            // So, we position at the top-left of the cell defined by max widths/heights.
             // If you had the actual item sizes here, you could add:
             // const itemWidth = items[i].width; // Need items array passed in
             // const itemHeight = items[i].height;
             // const cellWidth = columnWidths[col];
             // const cellHeight = rowHeights[row];
             // const offsetX = (cellWidth - itemWidth) / 2;
             // const offsetY = (cellHeight - itemHeight) / 2;
             // positions.push({ x: colStartX[col] + offsetX, y: rowStartY[row] + offsetY });

            // Position at top-left of the allocated grid cell
            positions.push({ x: colStartX[col], y: rowStartY[row] });
        }

        return positions;
    }


  /**
   * Get the total dimensions of the diagram after layout calculation.
   *
   * @param rootNodes - Root nodes with final layout information.
   * @returns The width and height of the entire diagram.
   */
  getDiagramDimensions(rootNodes: TreeNode[]): { width: number; height: number } {
    if (rootNodes.length === 0 || !rootNodes[0]?.layout) { // Check if layout exists
      return { width: 0, height: 0 };
    }

    let totalWidth = 0;
    let totalHeight = 0;

    // Helper function to find max bounds recursively
     const findMaxBounds = (node: TreeNode) => {
         if (!node.layout) return;
         totalWidth = Math.max(totalWidth, node.layout.x + node.layout.width);
         totalHeight = Math.max(totalHeight, node.layout.y + node.layout.height);
         node.children.forEach(findMaxBounds);
     };

     // Find bounds starting from all root nodes
     rootNodes.forEach(findMaxBounds);

    // Add final padding around the entire diagram? Optional.
    // totalWidth += this.options.padding;
    // totalHeight += this.options.padding;

    return {
      width: totalWidth,
      height: totalHeight
    };
  }
}

// Helper type for grid configuration
interface GridConfig {
  columns: number;
  columnWidths: number[];
  rowHeights: number[];
}