/**
 * Represents a node in the input hierarchy
 */
export interface HierarchyNode {
  /** Unique identifier for the node */
  id: string;
  
  /** Display name for the node */
  name: string;
  
  /** Parent node ID, or null for root nodes */
  parent: string | null;
}
