/**
 * Represents a node in the processed tree structure
 */
export interface TreeNode {
  /** Original node data */
  data: {
    id: string;
    name: string;
    parent: string | null;
  };
  
  /** Direct children of this node */
  children: TreeNode[];
  
  /** Root ancestor node ID (used for coloring) */
  rootAncestor?: string;
  
  /** Calculated layout information */
  layout?: NodeLayout;
}

/**
 * Layout information for a node
 */
export interface NodeLayout {
  /** X position (top-left corner) */
  x: number;
  
  /** Y position (top-left corner) */
  y: number;
  
  /** Width of the node box */
  width: number;
  
  /** Height of the node box */
  height: number;
  
  /** Content area (excludes the title area at the top) */
  contentArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Configuration options for the layout engine
 */
export interface LayoutOptions {
  /** Number of columns for child layout */
  columns?: number;
  
  /** Internal padding within boxes */
  padding?: number;
  
  /** Spacing between sibling boxes */
  spacing?: number;
  
  /** Minimum width for a node */
  minNodeWidth?: number;
  
  /** Minimum height for a node */
  minNodeHeight?: number;
  
  /** Target aspect ratio (width/height) for the layout */
  targetAspectRatio?: number;
  
  /** The type of layout algorithm to use */
  layoutType?: string;
}
