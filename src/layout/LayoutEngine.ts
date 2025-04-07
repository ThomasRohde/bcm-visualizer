import { TreeNode, LayoutOptions } from '../types/index.js';

/**
 * Abstract base class for layout engines
 */
export abstract class LayoutEngine {
  protected options: Required<LayoutOptions>;
  
  // Default layout options
  private static readonly DEFAULT_OPTIONS: Required<LayoutOptions> = {
    columns: 2,
    padding: 10,
    spacing: 5,
    minNodeWidth: 100,
    minNodeHeight: 40,
    targetAspectRatio: 16 / 9,
    layoutType: 'grid'
  };
  
  /**
   * Creates a new layout engine with the specified options
   * 
   * @param options - Layout configuration options
   */
  constructor(options: LayoutOptions = {}) {
    this.options = { ...LayoutEngine.DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Calculate layout for a tree structure
   * 
   * @param rootNodes - Root nodes of the tree
   * @returns Root nodes with layout information added
   */
  abstract calculateLayout(rootNodes: TreeNode[]): TreeNode[];
  
  /**
   * Get the total dimensions of the diagram
   * 
   * @param rootNodes - Root nodes with layout information
   * @returns The width and height of the entire diagram
   */
  abstract getDiagramDimensions(rootNodes: TreeNode[]): { width: number; height: number };
}
