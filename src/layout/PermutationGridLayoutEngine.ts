import { LayoutEngine } from './LayoutEngine.js';
import { TreeNode, NodeLayout, LayoutOptions, StyleOptions } from '../types/index.js';
import textMeasurer from '../utils/textMeasure.js';

/**
 * Layout options specific to the permutation grid layout engine
 */
export interface PermutationGridLayoutOptions extends LayoutOptions {
  /** Maximum number of child nodes for which permutations will be attempted */
  maxPermutationChildren?: number;
}

/**
 * Represents a node size with width and height
 */
interface NodeSize {
  width: number;
  height: number;
}

/**
 * Represents a grid layout for positioning child nodes
 */
interface GridLayout {
  rows: number;
  cols: number;
  width: number;
  height: number;
  deviation: number; // Deviation from target aspect ratio
  positions: { x: number, y: number, width: number, height: number }[];
}

/**
 * Represents a layout result with grid layout and permutation
 */
interface LayoutResult {
  layout: GridLayout;
  permutation: number[]; // Indices of child sizes in the best order
}

/**
 * Layout cache key for memoizing layout calculations
 */
class CacheKey {
  constructor(
    public nodeId: string, 
    public settingsHash: string
  ) {}

  hashCode(): string {
    return `${this.nodeId}:${this.settingsHash}`;
  }
}

/**
 * Cache for layout calculations to prevent redundant computation
 */
class LayoutCache {
  private sizeCache: Map<string, NodeSize> = new Map();
  private layoutCache: Map<string, LayoutResult> = new Map();
  
  getNodeSize(key: CacheKey): NodeSize | undefined {
    return this.sizeCache.get(key.hashCode());
  }
  
  setNodeSize(key: CacheKey, size: NodeSize): void {
    this.sizeCache.set(key.hashCode(), size);
  }
  
  getLayout(childIds: string[], settingsHash: string): LayoutResult | undefined {
    return this.layoutCache.get(`${childIds.join(',')}:${settingsHash}`);
  }
  
  setLayout(childIds: string[], settingsHash: string, result: LayoutResult): void {
    this.layoutCache.set(`${childIds.join(',')}:${settingsHash}`, result);
  }
}

/**
 * Layout engine that arranges nodes in a grid optimized for aspect ratio
 * using permutations to find the best layout
 */
export class PermutationGridLayoutEngine extends LayoutEngine {
  private styleOptions?: StyleOptions;
  private cache: LayoutCache;
  private settingsHash: string;
  private maxPermutationChildren: number;
  
  constructor(
    layoutOptions: PermutationGridLayoutOptions = {},
    styleOptions?: StyleOptions
  ) {
    super(layoutOptions);
    this.styleOptions = styleOptions;
    this.cache = new LayoutCache();
    this.settingsHash = this.hashSettings();
    this.maxPermutationChildren = layoutOptions.maxPermutationChildren || 8;
  }
  
  /**
   * Calculate layout for a tree structure
   * 
   * @param rootNodes - Root nodes of the tree
   * @returns Root nodes with layout information added
   */
  calculateLayout(rootNodes: TreeNode[]): TreeNode[] {
    // Process each root node
    for (let i = 0; i < rootNodes.length; i++) {
      this.layoutTree(rootNodes[i], 0, 0);
    }
    
    // Position root nodes horizontally with spacing
    let xOffset = 0;
    for (const root of rootNodes) {
      if (root.layout) {
        root.layout.x = xOffset;
        xOffset += root.layout.width + this.options.spacing;
      }
    }
    
    return rootNodes;
  }
  
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
    
    // Add padding around the entire diagram
    const padding = this.options.padding * 2;
    return {
      width: maxX - minX + padding,
      height: maxY - minY + padding
    };
  }
  
  /**
   * Recursively layout the tree starting from the given node, using cache
   * 
   * @param node - The node to layout
   * @param x - X position of node
   * @param y - Y position of node
   * @returns The node with layout applied
   */
  private layoutTree(node: TreeNode, x: number, y: number): TreeNode {
    if (!node.children || node.children.length === 0) {
      node.layout = this.calculateLeafNodeSize(node);
      node.layout.x = x;
      node.layout.y = y;
      return node;
    }
    
    // Calculate child sizes (using cache)
    const childSizes: NodeSize[] = node.children.map(child => {
      const cacheKey = new CacheKey(child.data.id, this.settingsHash);
      const cachedSize = this.cache.getNodeSize(cacheKey);
      
      if (cachedSize) {
        return cachedSize;
      }
      
      const size = this.calculateNodeSize(child);
      this.cache.setNodeSize(cacheKey, size);
      return size;
    });
    
    // Get layout from cache or compute it
    const childIds = node.children.map(child => child.data.id);
    let layoutResult = this.cache.getLayout(childIds, this.settingsHash);
    
    if (!layoutResult) {
      layoutResult = this.findBestLayout(childSizes, node.children.length);
      this.cache.setLayout(childIds, this.settingsHash, layoutResult);
    }
    
    // Reorder children according to best permutation
    node.children = layoutResult.permutation.map(i => node.children[i]);
    
    // Calculate node size based on the best layout
    node.layout = {
      x,
      y,
      width: layoutResult.layout.width,
      height: layoutResult.layout.height
    };
    
    // Place each child relative to the parent's position
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const pos = layoutResult.layout.positions[i];
      this.layoutTree(child, x + pos.x, y + pos.y);
      
      if (child.layout) {
        child.layout.width = pos.width;
        child.layout.height = pos.height;
      }
    }
    
    return node;
  }
  
  /**
   * Calculate size for a node, including space needed for its children
   * 
   * @param node - The node to calculate size for
   * @returns The calculated width and height
   */
  private calculateNodeSize(node: TreeNode): NodeSize {
    if (!node.children || node.children.length === 0) {
      return this.calculateLeafNodeSize(node);
    }
    
    // Calculate sizes for all children
    const childSizes: NodeSize[] = node.children.map(child => {
      const cacheKey = new CacheKey(child.data.id, this.settingsHash);
      const cachedSize = this.cache.getNodeSize(cacheKey);
      
      if (cachedSize) {
        return cachedSize;
      }
      
      const size = this.calculateNodeSize(child);
      this.cache.setNodeSize(cacheKey, size);
      return size;
    });
    
    // Find best layout for children
    const layoutResult = this.findBestLayout(childSizes, node.children.length);
    
    return {
      width: layoutResult.layout.width,
      height: layoutResult.layout.height
    };
  }
  
  /**
   * Calculate size for a leaf node based on content and style options
   * 
   * @param node - The leaf node to calculate size for
   * @returns The node layout with calculated width and height
   */  private calculateLeafNodeSize(node: TreeNode): NodeLayout {
    const fontSize = this.styleOptions?.fontSize ?? 14;
    const fontFamily = this.styleOptions?.fontFamily ?? 'Arial, sans-serif';
    const titleMetrics = textMeasurer.measureText(node.data.name, fontSize, fontFamily);
    const titleHeight = titleMetrics.height + this.options.padding * 2;
    
    // Check if this is a leaf node with fixed width
    const isLeaf = !node.children || node.children.length === 0;
    const leafNodeWidth = this.styleOptions?.leafNodeWidth;
    
    let width: number;
    if (isLeaf && typeof leafNodeWidth === 'number' && leafNodeWidth > 0) {
      width = leafNodeWidth;
    } else {
      width = Math.max(titleMetrics.width + this.options.padding * 2, this.options.minNodeWidth);
    }
    
    const height = Math.max(titleHeight, this.options.minNodeHeight);
    
    return {
      x: 0,
      y: 0,
      width,
      height
    };
  }
  
  /**
   * Create a stable hash of settings that affect layout
   * 
   * @returns A hash string representing the current settings
   */
  private hashSettings(): string {
    const relevantSettings = {
      minNodeWidth: this.options.minNodeWidth,
      minNodeHeight: this.options.minNodeHeight,
      spacing: this.options.spacing,
      padding: this.options.padding,
      targetAspectRatio: this.options.targetAspectRatio || 1.6,
      leafNodeWidth: this.styleOptions?.leafNodeWidth
    };
    
    return JSON.stringify(relevantSettings);
  }
  
  /**
   * Find the best grid layout for a list of child sizes
   * 
   * @param childSizes - Array of child node sizes
   * @param childCount - Number of children
   * @returns The best layout and permutation
   */
  private findBestLayout(childSizes: NodeSize[], childCount: number): LayoutResult {
    // Start with "worst" possible layout
    const bestLayout: GridLayout = {
      rows: 1,
      cols: childCount,
      width: Number.POSITIVE_INFINITY,
      height: Number.POSITIVE_INFINITY,
      deviation: Number.POSITIVE_INFINITY,
      positions: []
    };
    
    const bestPermutation = Array.from({ length: childCount }, (_, i) => i);
    
    // Decide if we brute-force permutations
    const doPermutations = childCount <= this.maxPermutationChildren;
    
    if (doPermutations) {
      // Generate all permutations
      const permutations = this.generatePermutations(childCount);
      
      for (const perm of permutations) {
        // Build the permuted child_sizes
        const permSizes = perm.map(i => childSizes[i]);
        const candidateLayout = this.tryLayoutForPermutation(permSizes, childCount);
        
        // Compare with best layout
        if (this.isBetterLayout(candidateLayout, bestLayout)) {
          Object.assign(bestLayout, candidateLayout);
          bestPermutation.length = 0;
          bestPermutation.push(...perm);
        }
      }
    } else {
      // For big sets, just use original order
      const candidateLayout = this.tryLayoutForPermutation(childSizes, childCount);
      if (this.isBetterLayout(candidateLayout, bestLayout)) {
        Object.assign(bestLayout, candidateLayout);
      }
    }
    
    return {
      layout: bestLayout,
      permutation: bestPermutation
    };
  }
  
  /**
   * Try different grid layouts for a given permutation of child sizes
   * 
   * @param permSizes - Child sizes in the current permutation
   * @param childCount - Number of children
   * @returns The best grid layout for this permutation
   */  private tryLayoutForPermutation(
    permSizes: NodeSize[],
    childCount: number
  ): GridLayout {
    // Get relevant settings
    const horizontalGap = this.options.spacing;
    const verticalGap = this.options.spacing;
    const padding = this.options.padding;
    const targetAspectRatio = this.options.targetAspectRatio || 1.6;
    // Additional vertical space for parent title to prevent label overlap with children
    const titleSpacing = this.styleOptions?.fontSize ? this.styleOptions.fontSize + 8 : 20;
    
    // Start with a "worst" possible layout
    const bestLayout: GridLayout = {
      rows: 1,
      cols: childCount,
      width: Number.POSITIVE_INFINITY,
      height: Number.POSITIVE_INFINITY,
      deviation: Number.POSITIVE_INFINITY,
      positions: []
    };
    
    for (let rowsTentative = 1; rowsTentative <= childCount; rowsTentative++) {
      // Try different column calculation methods
      const colsOptions = [
        Math.ceil(childCount / rowsTentative), // Ceiling approach
        Math.round(childCount / rowsTentative)  // Float division approach
      ];
      
      for (const cols of colsOptions) {
        if (cols <= 0) continue;
        
        // Figure out how many rows are needed if we have 'cols' columns
        const rows = Math.ceil(childCount / cols);
        
        const rowHeights = new Array(rows).fill(0);
        const colWidths = new Array(cols).fill(0);
          // Compute bounding box for each row & column
        for (let i = 0; i < childCount; i++) {
          const r = Math.floor(i / cols);
          const c = i % cols;
          rowHeights[r] = Math.max(rowHeights[r], permSizes[i].height);
          colWidths[c] = Math.max(colWidths[c], permSizes[i].width);
        }
        
        const gridWidth = colWidths.reduce((sum, w) => sum + w, 0) + (cols - 1) * horizontalGap;
        const gridHeight = rowHeights.reduce((sum, h) => sum + h, 0) + (rows - 1) * verticalGap;
          // Adjust for padding (top padding + titleSpacing and bottom padding)
        const totalWidth = gridWidth + 2 * padding;
        // Add extra padding at the bottom to ensure children fit inside their parent
        const totalHeight = gridHeight + padding + titleSpacing + padding;
        
        // Compute squared difference from target aspect ratio
        const aspectRatio = totalWidth / totalHeight;
        const deviation = Math.pow(aspectRatio - targetAspectRatio, 2);
          // Build child positions
        const positions: { x: number, y: number, width: number, height: number }[] = [];
        // Start yOffset with padding + titleSpacing to leave room for the parent node's title
        let yOffset = padding + titleSpacing;
        
        for (let r = 0; r < rows; r++) {
          let xOffset = padding;
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (idx < childCount) {
              const childSize = permSizes[idx];
              const pos = {
                x: xOffset,
                y: yOffset,
                width: childSize.width,
                height: childSize.height
              };
              positions.push(pos);
              xOffset += childSize.width + horizontalGap;
            }
          }
          yOffset += rowHeights[r] + verticalGap;
        }
        
        // Create current layout
        const currentLayout: GridLayout = {
          rows,
          cols,
          width: totalWidth,
          height: totalHeight,
          deviation,
          positions
        };
        
        // Compare with best layout
        if (this.isBetterLayout(currentLayout, bestLayout)) {
          Object.assign(bestLayout, currentLayout);
        }
      }
    }
    
    return bestLayout;
  }
  
  /**
   * Compare two layouts to determine which is better
   * 
   * @param a - First layout
   * @param b - Second layout
   * @returns True if layout a is better than layout b
   */
  private isBetterLayout(a: GridLayout, b: GridLayout): boolean {
    // First priority: aspect ratio deviation
    if (a.deviation < b.deviation) {
      return true;
    }
    
    // If deviations are very close, use total area as tiebreaker
    if (Math.abs(a.deviation - b.deviation) < 1e-9) {
      return a.width * a.height < b.width * b.height;
    }
    
    return false;
  }
  
  /**
   * Generate all permutations of indices 0..n-1
   * 
   * @param n - Number of elements
   * @returns Array of all possible permutations
   */
  private generatePermutations(n: number): number[][] {
    const result: number[][] = [];
    
    // Helper function for recursion
    function permute(arr: number[], start: number): void {
      if (start === arr.length - 1) {
        result.push([...arr]);
        return;
      }
      
      for (let i = start; i < arr.length; i++) {
        // Swap elements
        [arr[start], arr[i]] = [arr[i], arr[start]];
        
        // Recurse
        permute(arr, start + 1);
        
        // Backtrack (restore original order)
        [arr[start], arr[i]] = [arr[i], arr[start]];
      }
    }
    
    const indices = Array.from({ length: n }, (_, i) => i);
    permute(indices, 0);
    
    return result;
  }
}
