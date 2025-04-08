import { LayoutEngine } from './LayoutEngine.js';
import { TreeNode, NodeLayout, LayoutOptions, StyleOptions } from '../types/index.js';
import textMeasurer from '../utils/textMeasure.js';

// Define extended LayoutOptions to include targetAspectRatio
export interface FlowGridAspectLayoutOptions extends LayoutOptions {
  targetAspectRatio?: number;
}

/**
 * Layout engine that arranges nodes aiming for a specific overall aspect ratio (e.g., 16:9).
 * It uses adaptive grids for children, chosen to best match the target aspect ratio,
 * and arranges root nodes intelligently. This approach minimizes whitespace and handles
 * wide, shallow hierarchies effectively, producing a structured, grid-like layout.
 */
export class FlowGridAspectLayout extends LayoutEngine {
  // Use the ! non-null assertion operator to tell TypeScript that this will be assigned in the constructor
  protected options!: Required<FlowGridAspectLayoutOptions>;
  private styleOptions?: StyleOptions;

  constructor(
    layoutOptions: FlowGridAspectLayoutOptions = {},
    styleOptions?: StyleOptions
  ) {
    // Establish default values specific to this engine or override base defaults
    const baseOptions = {
      columns: layoutOptions.columns ?? 2, // Default columns (less relevant here, but kept for compatibility)
      padding: layoutOptions.padding ?? 10, // Padding inside node bounds
      spacing: layoutOptions.spacing ?? 10, // Spacing between sibling nodes in a grid
      minNodeWidth: layoutOptions.minNodeWidth ?? 100, // Minimum width for any node
      minNodeHeight: layoutOptions.minNodeHeight ?? 40, // Minimum height for any node
      targetAspectRatio: layoutOptions.targetAspectRatio ?? 16 / 9 // Target W/H ratio for grids
    };
    // Pass the complete options object to parent
    super(baseOptions);
    // Store style options for text measurement etc.
    this.styleOptions = styleOptions;
  }

  /**
   * Calculate layout for the entire tree structure, aiming for the target aspect ratio.
   * Uses a two-pass approach:
   * 1. Calculate intrinsic sizes recursively without final positions.
   * 2. Arrange root nodes based on their sizes.
   * 3. Calculate final positions recursively based on root arrangement.
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
    let rootPositions: Array<{ x: number; y: number }> = [];
    if (rootNodes.length === 1) {
      // Single root starts at (0,0)
      rootPositions = [{ x: 0, y: 0 }];
    } else {
      // Multiple roots: Arrange them in a grid aiming for the target aspect ratio
      const rootLayouts = rootNodes.map(r => r.layout!); // Use calculated initial sizes
      const rootArrangement = this.findBestGridArrangement(
        rootLayouts,
        this.options.targetAspectRatio
      );
      rootPositions = this.calculateGridPositions(
        rootArrangement.gridConfig,
        rootNodes.length,
        0, // Start X at origin
        0  // Start Y at origin
      );
    }

    // --- Pass 2: Calculate final layout with correct root positions ---
    rootNodes.forEach((root, index) => {
      const pos = rootPositions[index];
      // Recalculate layout starting from the determined root position, this time setting final coords
      this.calculateNodeLayoutRecursive(root, pos.x, pos.y, false); // isInitialCalculation = false
    });

    return rootNodes;
  }

  /**
   * Recursively calculates the layout for a node and its children.
   * Can operate in two modes:
   *  - Initial calculation (isInitialCalculation = true): Determines sizes without setting final positions deep in the tree.
   *                                                     Node's x/y are kept at 0 for size calculation purposes.
   *  - Final calculation (isInitialCalculation = false): Sets the definitive x, y positions based on parent's final position.
   *
   * @param node - The node to calculate layout for
   * @param x - Starting X position for this node (used only in final calculation)
   * @param y - Starting Y position for this node (used only in final calculation)
   * @param isInitialCalculation - If true, only calculates size; if false, calculates final position.
   * @returns The calculated layout for the current node.
   */
  private calculateNodeLayoutRecursive(node: TreeNode, x: number, y: number, isInitialCalculation: boolean): NodeLayout {
    // --- 1. Calculate Node's Intrinsic Size Contribution (Title) ---
    const fontSize = this.styleOptions?.fontSize ?? 14;
    const fontFamily = this.styleOptions?.fontFamily ?? 'Arial, sans-serif';
    const titleMetrics = textMeasurer.measureText(node.data.name, fontSize, fontFamily);
    // Height needed for the title area including top/bottom padding for the title itself
    const titleAreaHeight = titleMetrics.height + this.options.padding * 2;
    // Width needed for the title area
    const titleAreaWidth = titleMetrics.width + this.options.padding * 2;

    // --- 2. Handle Leaf Nodes ---
    if (node.children.length === 0) {
      const leafNodeWidthOption = this.styleOptions?.leafNodeWidth;
      const width = (typeof leafNodeWidthOption === 'number' && leafNodeWidthOption > 0)
        ? leafNodeWidthOption
        : Math.max(titleAreaWidth, this.options.minNodeWidth);
      const height = Math.max(titleAreaHeight, this.options.minNodeHeight);

      // Use 0,0 during initial calculation for size aggregation
      const nodeX = isInitialCalculation ? 0 : x;
      const nodeY = isInitialCalculation ? 0 : y;

      node.layout = {
        x: nodeX,
        y: nodeY,
        width,
        height,
        // Content area is not relevant for leaves in this model, or represents the title area
        contentArea: {
            x: nodeX + this.options.padding,
            y: nodeY + this.options.padding, // Title starts after top padding
            width: width - this.options.padding * 2,
            height: height - this.options.padding * 2
        }
      };
      return node.layout;
    }

    // --- 3. Handle Non-Leaf Nodes ---

    // --- 3a. Recursively Calculate Child Sizes (if needed) ---
    // Ensure all children have their layout calculated first (for size information)
    // This is always needed in Pass 1, and potentially needed in Pass 2 if layout doesn't exist (shouldn't happen with 2 passes)
    node.children.forEach(child => {
        // Always run initial calculation for children if we are in the initial pass,
        // or if the child somehow missed getting a layout in pass 1.
        if (isInitialCalculation || !child.layout) {
            // Use dummy positions (0,0) for size calculation during the initial pass
            this.calculateNodeLayoutRecursive(child, 0, 0, true);
        }
        // In the final pass (!isInitialCalculation), we assume child.layout exists from Pass 1
        // and contains the correct size. We will update its position later.
    });

    // --- 3b. Find Best Grid Arrangement for Children ---
    // Children layouts (with sizes) must exist at this point from step 3a or Pass 1.
    const childLayouts = node.children.map(child => child.layout!);
    const bestChildArrangement = this.findBestGridArrangement(childLayouts, this.options.targetAspectRatio);
    const { gridConfig, totalWidth: childrenTotalWidth, totalHeight: childrenTotalHeight } = bestChildArrangement;

    // --- 3c. Calculate Parent Node Size ---
    // Parent size is determined by the space needed for its title and the arranged children grid.
    const contentWidth = childrenTotalWidth;
    const contentHeight = childrenTotalHeight;

    // Calculate required width: content width + side paddings. Must also fit title and meet min width.
    const requiredWidth = contentWidth + this.options.padding * 2;
    const finalWidth = Math.max(requiredWidth, titleAreaWidth, this.options.minNodeWidth);

    // Calculate required height: title area height + content height + padding between title and content + bottom padding.
    // Note: titleAreaHeight already includes top/bottom padding for the title text itself.
    // We need space for: Title Area + Content Area + Padding below content
    // Let's simplify: Height = Title Area Height + Content Height + Padding below title area
    // The description implies parent size aggregates child grid size + padding.
    // Let's use: Height = Title Height + Padding + Child Grid Height + Padding
    // titleMetrics.height + padding + childrenTotalHeight + padding
    const requiredHeight = titleMetrics.height + this.options.padding + contentHeight + this.options.padding;
    const finalHeight = Math.max(requiredHeight, this.options.minNodeHeight);


    // Use 0,0 during initial calculation for size aggregation
    const nodeX = isInitialCalculation ? 0 : x;
    const nodeY = isInitialCalculation ? 0 : y;

    // --- 3d. Define Content Area and Update Parent Layout Object ---
    // Content area is where children will be placed, below the title area.
    const contentAreaX = nodeX + this.options.padding;
    const contentAreaY = nodeY + titleMetrics.height + this.options.padding * 2; // Below title text and its padding
    const contentAreaWidth = finalWidth - this.options.padding * 2;
    const contentAreaHeight = finalHeight - (titleMetrics.height + this.options.padding * 2) - this.options.padding; // Remaining height after title area and bottom padding

    const contentArea = {
        x: contentAreaX,
        y: contentAreaY,
        width: contentAreaWidth,
        height: contentAreaHeight
    };

    // Create or update the layout object
    if (!node.layout) { // Should only happen if called directly without initial pass? Unlikely.
         node.layout = { x: nodeX, y: nodeY, width: finalWidth, height: finalHeight, contentArea };
    } else {
        // Update existing layout
        node.layout.x = nodeX;
        node.layout.y = nodeY;
        node.layout.width = finalWidth;
        node.layout.height = finalHeight;
        node.layout.contentArea = contentArea;
    }


    // --- 3e. Position Children (Only during Final Calculation) ---
    if (!isInitialCalculation) {
        // Center the children block within the available content area
        const childrenStartX = contentArea.x + Math.max(0, (contentArea.width - childrenTotalWidth) / 2);
        const childrenStartY = contentArea.y + Math.max(0, (contentArea.height - childrenTotalHeight) / 2); // Center vertically too

        const childPositions = this.calculateGridPositions(
            gridConfig,
            node.children.length,
            childrenStartX,
            childrenStartY
        );

        node.children.forEach((child, index) => {
            const childPos = childPositions[index];
            // Recursively call for the child at its *final* position.
            // This ensures the child's own children are positioned relative to its final spot.
            // Pass `false` for isInitialCalculation.
            this.calculateNodeLayoutRecursive(child, childPos.x, childPos.y, false);
        });
    }

    // Return the calculated/updated layout (primarily for the initial pass return value, though not strictly used later)
    return node.layout;
  }

   /**
   * Helper to find the best grid arrangement (columns, widths, heights) for a set of items
   * based on their dimensions, aiming for a target aspect ratio.
   * Iterates through possible column counts (1 to N), calculates the resulting grid dimensions
   * for each, and selects the configuration whose aspect ratio is closest to the target.
   *
   * @param items - Array of objects with width and height properties (like NodeLayout).
   * @param targetAspectRatio - The desired width/height ratio (e.g., 16/9).
   * @returns An object containing the best grid configuration and its total dimensions.
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

            // Determine max width per column and max height per row based on item sizes
            items.forEach((item, index) => {
                const col = index % numCols;
                const row = Math.floor(index / numCols);
                // Use Math.max with the item's dimension and the minimum node dimensions as a floor
                columnWidths[col] = Math.max(columnWidths[col], item.width, this.options.minNodeWidth);
                rowHeights[row] = Math.max(rowHeights[row], item.height, this.options.minNodeHeight);
            });

            // Calculate total dimensions for this grid configuration, including spacing
            const currentTotalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, numCols - 1) * this.options.spacing;
            const currentTotalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, numRows - 1) * this.options.spacing;

            if (currentTotalHeight === 0) continue; // Avoid division by zero

            const currentAspectRatio = currentTotalWidth / currentTotalHeight;
            const aspectRatioDiff = Math.abs(currentAspectRatio - targetAspectRatio);

            // Select the configuration with the minimum difference from the target aspect ratio
            // Simple tie-breaking: the first one found with the minimum difference wins.
            // Could add secondary criteria (e.g., prefer squarer, fewer columns/rows) if needed.
            if (aspectRatioDiff < minAspectRatioDiff) {
                minAspectRatioDiff = aspectRatioDiff;
                bestConfig = { columns: numCols, columnWidths, rowHeights };
                bestTotalWidth = currentTotalWidth;
                bestTotalHeight = currentTotalHeight;
            }
            // Example of secondary tie-breaker (prefer fewer columns if aspect ratio diff is very close)
            /*
            else if (Math.abs(aspectRatioDiff - minAspectRatioDiff) < 0.01) { // Tolerance
               if (numCols < bestConfig!.columns) {
                  minAspectRatioDiff = aspectRatioDiff; // Update diff just in case slightly better
                  bestConfig = { columns: numCols, columnWidths, rowHeights };
                  bestTotalWidth = currentTotalWidth;
                  bestTotalHeight = currentTotalHeight;
               }
            }
            */
        }

        // Fallback if no best config found (should not happen if n > 0)
        if (!bestConfig) {
             console.warn("AspectRatioGridLayoutEngine: Could not find best grid arrangement, using fallback (sqrt).");
             const fallbackCols = Math.max(1, Math.ceil(Math.sqrt(n))); // Ensure at least 1 column
             const numRows = Math.ceil(n / fallbackCols);
             const columnWidths = new Array(fallbackCols).fill(0);
             const rowHeights = new Array(numRows).fill(0);
             items.forEach((item, index) => {
                 const col = index % fallbackCols;
                 const row = Math.floor(index / fallbackCols);
                 columnWidths[col] = Math.max(columnWidths[col], item.width, this.options.minNodeWidth);
                 rowHeights[row] = Math.max(rowHeights[row], item.height, this.options.minNodeHeight);
             });
             bestTotalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, fallbackCols - 1) * this.options.spacing;
             bestTotalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, numRows - 1) * this.options.spacing;
             bestConfig = { columns: fallbackCols, columnWidths, rowHeights };
        }

        return { gridConfig: bestConfig!, totalWidth: bestTotalWidth, totalHeight: bestTotalHeight };
    }

    /**
     * Calculates the (x, y) positions for items arranged in a grid, placing them
     * at the top-left corner of their allocated cell.
     *
     * @param gridConfig - The configuration of the grid (columns, widths, heights).
     * @param itemCount - The total number of items to position.
     * @param startX - The starting X coordinate for the grid (top-left corner).
     * @param startY - The starting Y coordinate for the grid (top-left corner).
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

        // Pre-calculate cumulative row starting Y positions (top edge of each row)
        const rowStartY: number[] = [startY];
        for (let i = 0; i < rowHeights.length - 1; i++) {
            rowStartY.push(rowStartY[i] + rowHeights[i] + this.options.spacing);
        }

        // Pre-calculate cumulative column starting X positions (left edge of each column)
        const colStartX: number[] = [startX];
        for (let i = 0; i < columnWidths.length - 1; i++) {
            colStartX.push(colStartX[i] + columnWidths[i] + this.options.spacing);
        }

        // Calculate position for each item
        for (let i = 0; i < itemCount; i++) {
            const col = i % columns;
            const row = Math.floor(i / columns);

            // Position item at the top-left corner of its calculated grid cell.
            // Centering within the cell could be added but requires passing item dimensions.
            // const itemWidth = items[i].width; // Requires items array
            // const itemHeight = items[i].height;
            // const cellWidth = columnWidths[col];
            // const cellHeight = rowHeights[row];
            // const offsetX = (cellWidth - itemWidth) / 2;
            // const offsetY = (cellHeight - itemHeight) / 2;
            // positions.push({ x: colStartX[col] + offsetX, y: rowStartY[row] + offsetY });

            // Simple top-left alignment within the cell defined by max widths/heights
            positions.push({ x: colStartX[col], y: rowStartY[row] });
        }

        return positions;
    }

  /**
   * Get the total dimensions (bounding box) of the diagram after layout calculation.
   * Traverses the tree from the roots to find the maximum extent.
   *
   * @param rootNodes - Root nodes with final layout information.
   * @returns The width and height of the entire diagram.
   */
  getDiagramDimensions(rootNodes: TreeNode[]): { width: number; height: number } {
    if (rootNodes.length === 0) {
      return { width: 0, height: 0 };
    }

    let maxX = 0;
    let maxY = 0;

    // Helper function to find max bounds recursively
     const findMaxBounds = (node: TreeNode) => {
         if (!node.layout) return; // Skip nodes without layout (shouldn't happen after calculateLayout)
         maxX = Math.max(maxX, node.layout.x + node.layout.width);
         maxY = Math.max(maxY, node.layout.y + node.layout.height);
         node.children.forEach(findMaxBounds);
     };

     // Find bounds starting from all root nodes
     rootNodes.forEach(findMaxBounds);

    // The dimensions are simply the maximum x and y coordinates reached.
    // Optional: Add overall padding around the diagram here if desired.
    // maxX += this.options.padding;
    // maxY += this.options.padding;

    return {
      width: maxX,
      height: maxY
    };
  }
}

// Helper type for grid configuration determined by findBestGridArrangement
interface GridConfig {
  columns: number;        // Number of columns in the grid
  columnWidths: number[]; // Width of each column (max width of items in that column)
  rowHeights: number[];   // Height of each row (max height of items in that row)
}