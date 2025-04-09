import { LayoutEngine } from './LayoutEngine.js';
import { TreeNode, NodeLayout, LayoutOptions, StyleOptions } from '../types/index.js';
import textMeasurer from '../utils/textMeasure.js'; // Assuming textMeasurer exists and works

// Define extended LayoutOptions if needed (optional, can reuse existing ones)
// export interface PackingLayoutOptions extends LayoutOptions {
//   // Add any specific options for this engine if required
// }

// --- Helper Function for Text Wrapping ---
// (This is a simplified example. A more robust implementation might be needed)
function measureTextWithWrapping(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string
): { width: number; height: number; lines: string[] } {
  const words = text.split(' ');
  let currentLine = '';
  const lines: string[] = [];
  let maxLineWidth = 0;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = textMeasurer.measureText(testLine, fontSize, fontFamily);

    if (metrics.width > maxWidth && currentLine) {
      // Finish the current line
      const currentLineMetrics = textMeasurer.measureText(currentLine, fontSize, fontFamily);
      maxLineWidth = Math.max(maxLineWidth, currentLineMetrics.width);
      lines.push(currentLine);
      // Start a new line
      currentLine = word;
    } else {
      // Add word to the current line
      currentLine = testLine;
    }
  }

  // Add the last line
  if (currentLine) {
     const lastLineMetrics = textMeasurer.measureText(currentLine, fontSize, fontFamily);
     maxLineWidth = Math.max(maxLineWidth, lastLineMetrics.width);
     lines.push(currentLine);
  }

  // Calculate total height based on line count and estimated line height
  // Assuming measureText gives a reasonable height for a single line
  const singleLineHeight = textMeasurer.measureText('Tg', fontSize, fontFamily).height; // Estimate line height
  const totalHeight = lines.length * singleLineHeight * 1.2; // Add some line spacing factor

  return {
    width: maxLineWidth, // The width of the longest line after wrapping
    height: totalHeight, // Total height needed for all wrapped lines
    lines: lines // The actual wrapped lines (useful for rendering)
  };
}


/**
 * Layout engine that arranges nodes using a packing algorithm.
 * Optimizes for minimal whitespace and maximum packing density.
 * Leaf node dimensions are determined by their label text with wrapping.
 * Respects padding, spacing, and aspect ratio hints.
 */
export class PackingLayoutEngine extends LayoutEngine {
  // Use the ! non-null assertion operator
  protected options!: Required<LayoutOptions>; // Can use PackingLayoutOptions if defined
  private styleOptions?: StyleOptions;

  constructor(
    layoutOptions: LayoutOptions = {}, // Use PackingLayoutOptions if defined
    styleOptions?: StyleOptions
  ) {
    // Define default options specific to this engine or rely on base defaults
    const baseOptions: Required<LayoutOptions> = {
      columns: layoutOptions.columns ?? 1, // Default might differ, packing determines columns
      padding: layoutOptions.padding ?? 10,
      spacing: layoutOptions.spacing ?? 10, // Packing might use spacing differently
      minNodeWidth: layoutOptions.minNodeWidth ?? 80, // Smaller default might be ok
      minNodeHeight: layoutOptions.minNodeHeight ?? 40, // Smaller default might be ok
      targetAspectRatio: layoutOptions.targetAspectRatio ?? 1, // Default to square-ish packing
      layoutType: layoutOptions.layoutType ?? 'packing' // Identify layout type
    };

    super(baseOptions);
    this.options = baseOptions; // Ensure options are correctly typed and assigned
    this.styleOptions = styleOptions;
  }

  /**
   * Calculate layout for the entire tree structure using packing.
   */
  calculateLayout(rootNodes: TreeNode[]): TreeNode[] {
    if (rootNodes.length === 0) {
      return [];
    }

    // --- Pass 1: Calculate intrinsic sizes (including text wrapping) ---
    rootNodes.forEach(root => {
      this.calculateNodeSizeRecursive(root);
    });

    // --- Arrange Root Nodes ---
    // Use a packing/gridding strategy similar to AspectRatioGridLayoutEngine
    // but based on the *actual calculated sizes* from Pass 1.
    if (rootNodes.length === 1) {
      // Calculate final layout for the single root starting at (0, 0)
      this.calculateNodeLayoutRecursive(rootNodes[0], 0, 0);
    } else {
      // Arrange multiple roots
      const rootLayouts = rootNodes.map(r => r.layout!); // Sizes calculated in Pass 1
      const rootArrangement = this.findBestPackingArrangement(
        rootLayouts,
        this.options.targetAspectRatio
      );

      const rootPositions = this.calculatePackedPositions(
        rootArrangement.arrangement, // Use the detailed arrangement
        rootLayouts,             // Pass the layouts to get dimensions
        0,                       // Start X
        0                        // Start Y
      );

      // --- Pass 2: Calculate final positions ---
      rootNodes.forEach((root, index) => {
        const pos = rootPositions[index];
        this.calculateNodeLayoutRecursive(root, pos.x, pos.y); // Calculate final positions
      });
    }

    return rootNodes;
  }

  /**
   * Pass 1: Recursively calculate node sizes based on content and children.
   * This pass determines width/height but not final x/y.
   */
  private calculateNodeSizeRecursive(node: TreeNode): NodeLayout {
    const fontSize = this.styleOptions?.fontSize ?? 14;
    const fontFamily = this.styleOptions?.fontFamily ?? 'Arial, sans-serif';
    const nodePadding = this.options.padding;
    const nodeSpacing = this.options.spacing;
    const minWidth = this.options.minNodeWidth;
    const minHeight = this.options.minNodeHeight;
    // Use style options for leaf dimensions guide if available
    const leafNodeWidthOption = this.styleOptions?.leafNodeWidth; // Guiding width

    // --- 1. Leaf Node Size Calculation ---
    if (node.children.length === 0) {
      // Use a guiding width, but allow text to expand if needed, consider minWidth
      const targetWidth = (typeof leafNodeWidthOption === 'number' && leafNodeWidthOption > 0)
        ? leafNodeWidthOption - 2 * nodePadding // Available width for text
        : minWidth - 2 * nodePadding; // Fallback to minWidth

      const textMetrics = measureTextWithWrapping(
        node.data.name,
        Math.max(10, targetWidth), // Ensure a minimum wrap width
        fontSize,
        fontFamily
      );

      // Final dimensions include padding
      const width = Math.max(
         minWidth,
         textMetrics.width + 2 * nodePadding // Ensure text fits
      );
      const height = Math.max(
         minHeight,
         textMetrics.height + 2 * nodePadding // Ensure text fits
      );

      // Store the calculated size (position is temporary 0,0)
      node.layout = {
        x: 0, y: 0, width, height,
        // Store wrapped lines if needed for rendering
        // wrappedLines: textMetrics.lines,
        contentArea: { x: nodePadding, y: nodePadding, width: width - 2*nodePadding, height: height-2*nodePadding } // Content area is the whole node for leaves
      };
      return node.layout;
    }

    // --- 2. Non-Leaf Node Size Calculation ---
    // --- 2a. Recursively Calculate Child Sizes ---
    const childLayouts = node.children.map(child => this.calculateNodeSizeRecursive(child));

    // --- 2b. Find Best Packing Arrangement for Children ---
    // Use the packing algorithm to determine how children fit together
    const bestChildArrangement = this.findBestPackingArrangement(
      childLayouts,
      1 // Aim for square-ish packing within nodes initially, or use parent's target?
    );
    const { totalWidth: childrenTotalWidth, totalHeight: childrenTotalHeight } = bestChildArrangement;

    // --- 2c. Calculate Parent's Intrinsic Size (Title + Children Area) ---
     // Measure parent title (assume no wrapping for parent titles for simplicity, or add wrapping)
     const titleMetrics = textMeasurer.measureText(node.data.name, fontSize, fontFamily);
     const titleHeight = titleMetrics.height + nodePadding; // Padding below title

     // Required content area size based on packed children
     const contentWidth = childrenTotalWidth;
     const contentHeight = childrenTotalHeight;

     // Parent size needs to accommodate title and packed children + padding
     const requiredWidth = Math.max(
       titleMetrics.width + 2 * nodePadding, // Ensure title fits
       contentWidth + 2 * nodePadding        // Ensure packed children fit
     );
     const requiredHeight = titleHeight + contentHeight + nodePadding * 2; // Padding top, between title/content, bottom

    const width = Math.max(minWidth, requiredWidth);
    const height = Math.max(minHeight, requiredHeight);

    // Store the calculated size (position is temporary 0,0)
    node.layout = {
      x: 0, y: 0, width, height,
      // Content area excludes title area and padding
      contentArea: {
        x: nodePadding,
        y: titleHeight + nodePadding, // Start below title and its padding
        width: width - 2 * nodePadding,
        height: height - titleHeight - 2 * nodePadding // Available space for children
      }
    };
    return node.layout;
  }


   /**
   * Pass 2: Recursively calculates the final layout positions (x, y) for a node
   * and its children, using the sizes calculated in Pass 1.
   */
  private calculateNodeLayoutRecursive(node: TreeNode, x: number, y: number): void {
     // Update the node's own position
     if (!node.layout) {
         console.error("Layout not calculated in Pass 1 for node:", node.data.name);
         // Attempt to calculate size now (less efficient)
         node.layout = this.calculateNodeSizeRecursive(node);
     }
     node.layout.x = x;
     node.layout.y = y;

     if (node.children.length > 0) {
         const childLayouts = node.children.map(child => child.layout!); // Assume layout exists

         // Re-evaluate packing arrangement based on final parent content area size
         // (Could reuse Pass 1 arrangement if content area hasn't changed significantly)
         const parentContentArea = node.layout.contentArea!;
         const arrangement = this.findBestPackingArrangement(
            childLayouts,
            parentContentArea.width / (parentContentArea.height || 1) // Target parent content AR
         );

         // Calculate child positions *within the parent's content area*
         const childPositions = this.calculatePackedPositions(
             arrangement.arrangement,
             childLayouts,
             x + parentContentArea.x, // Start relative to parent's content area X
             y + parentContentArea.y  // Start relative to parent's content area Y
         );

         // Center the packed children block within the content area (optional)
         const childrenBlockWidth = arrangement.totalWidth;
         const childrenBlockHeight = arrangement.totalHeight;
         const offsetX = Math.max(0, (parentContentArea.width - childrenBlockWidth) / 2);
         const offsetY = Math.max(0, (parentContentArea.height - childrenBlockHeight) / 2);


         // Recursively call for children with their final positions
         node.children.forEach((child, index) => {
             const childPos = childPositions[index];
             this.calculateNodeLayoutRecursive(child, childPos.x + offsetX, childPos.y + offsetY);
         });
     }
 }

  /**
   * Finds the best arrangement (e.g., grid-like packing) for items.
   * This is a placeholder for a potentially more complex packing algorithm.
   * Currently adapts the grid-finding logic from AspectRatioGridLayoutEngine.
   *
   * @param items - Array of NodeLayouts (needs width/height)
   * @param targetAspectRatio - Desired width/height ratio for the arrangement
   * @returns Arrangement details and total dimensions.
   */
  private findBestPackingArrangement(
    items: Array<{ width: number; height: number }>,
    targetAspectRatio: number
  ): { arrangement: GridConfig; totalWidth: number; totalHeight: number } {
    // --- Using AspectRatioGridLayoutEngine's Grid Logic as a starting point ---
    // This finds a grid that *fits* the items and is close to the aspect ratio.
    // A true packing algorithm might place items more dynamically (not strict grid).
    let bestConfig: GridConfig | null = null;
    let minAspectRatioDiff = Infinity;
    let bestTotalWidth = 0;
    let bestTotalHeight = 0;
    const n = items.length;
    if (n === 0) {
      return { arrangement: { columns: 0, columnWidths: [], rowHeights: [] }, totalWidth: 0, totalHeight: 0 };
    }

    // Iterate through possible column counts
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

      const currentTotalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, numCols - 1) * this.options.spacing;
      const currentTotalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, numRows - 1) * this.options.spacing;

      if (currentTotalHeight === 0) continue;

      const currentAspectRatio = currentTotalWidth / currentTotalHeight;
      const aspectRatioDiff = Math.abs(currentAspectRatio - targetAspectRatio);

      // Simple preference for closest aspect ratio
      // TODO: Could add secondary criteria (e.g., minimize area, prefer fewer columns)
      if (aspectRatioDiff < minAspectRatioDiff) {
        minAspectRatioDiff = aspectRatioDiff;
        bestConfig = { columns: numCols, columnWidths, rowHeights };
        bestTotalWidth = currentTotalWidth;
        bestTotalHeight = currentTotalHeight;
      }
       // Optional: Tolerance and preference for simpler grids
      else if (bestConfig && Math.abs(aspectRatioDiff - minAspectRatioDiff) < 0.1 && numCols < bestConfig.columns) {
           minAspectRatioDiff = aspectRatioDiff;
           bestConfig = { columns: numCols, columnWidths, rowHeights };
           bestTotalWidth = currentTotalWidth;
           bestTotalHeight = currentTotalHeight;
      }
    }

    // Fallback if no config found
    if (!bestConfig) {
      const fallbackCols = Math.max(1, Math.ceil(Math.sqrt(n)));
      console.warn("Could not find best packing arrangement, using fallback grid.");
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

    return { arrangement: bestConfig, totalWidth: bestTotalWidth, totalHeight: bestTotalHeight };
  }

  /**
   * Calculates the (x, y) positions for items based on a grid-like packing arrangement.
   * Uses the pre-calculated column widths and row heights.
   *
   * @param gridConfig - The configuration of the grid (columns, widths, heights).
   * @param items - Array of item layouts (needed for potential centering).
   * @param startX - The starting X coordinate for the arrangement.
   * @param startY - The starting Y coordinate for the arrangement.
   * @returns An array of {x, y} positions for each item.
   */
  private calculatePackedPositions(
    gridConfig: GridConfig,
    items: Array<{ width: number; height: number }>, // Pass items for potential centering
    startX: number,
    startY: number
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const { columns, columnWidths, rowHeights } = gridConfig;
    if (columns === 0 || items.length === 0) return [];

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

    for (let i = 0; i < items.length; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);

      // --- Alignment within the cell ---
      // Option 1: Top-left alignment (simpler)
       const cellX = colStartX[col];
       const cellY = rowStartY[row];

      // Option 2: Center alignment (often looks better)
      // const itemWidth = items[i].width;
      // const itemHeight = items[i].height;
      // const cellWidth = columnWidths[col];
      // const cellHeight = rowHeights[row];
      // const offsetX = Math.max(0, (cellWidth - itemWidth) / 2);
      // const offsetY = Math.max(0, (cellHeight - itemHeight) / 2);
      // const cellX = colStartX[col] + offsetX;
      // const cellY = rowStartY[row] + offsetY;

      positions.push({ x: cellX, y: cellY });
    }
    return positions;
  }


  /**
   * Get the total dimensions of the diagram after layout calculation.
   */
  getDiagramDimensions(rootNodes: TreeNode[]): { width: number; height: number } {
    if (rootNodes.length === 0) {
      return { width: 0, height: 0 };
    }

    let maxX = 0;
    let maxY = 0;

    // Iterate through all nodes to find the maximum extent
    const findMaxBounds = (node: TreeNode) => {
      if (node.layout) {
        maxX = Math.max(maxX, node.layout.x + node.layout.width);
        maxY = Math.max(maxY, node.layout.y + node.layout.height);
      }
      node.children.forEach(findMaxBounds);
    };

    rootNodes.forEach(findMaxBounds);

    // Add overall padding? (Optional, based on requirements)
    // maxX += this.options.padding;
    // maxY += this.options.padding;

    return { width: maxX, height: maxY };
  }
}

// Helper type (can reuse from AspectRatioGridLayoutEngine if identical)
interface GridConfig {
  columns: number;
  columnWidths: number[];
  rowHeights: number[];
}

// --- How to integrate into src/layout/index.ts ---
/*
Add the import:
import { PackingLayoutEngine } from './PackingLayoutEngine.js'; // Adjust path if needed

Add a case in the switch statement within createLayoutEngine:

export function createLayoutEngine(
  layoutOptions: LayoutOptions = {},
  styleOptions?: StyleOptions
): LayoutEngine {
  // First, check for explicit layout type
  if (layoutOptions.layoutType) {
    switch (layoutOptions.layoutType.toLowerCase()) {
      // ... other cases
      case 'packing': // Add this case
        return new PackingLayoutEngine(layoutOptions, styleOptions);
      // ... other cases
      default:
        // ... fallback
    }
  }
  // ... rest of the function
}
*/