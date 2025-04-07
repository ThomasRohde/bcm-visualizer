import { HierarchyNode, TreeNode } from '../types/index.js';

/**
 * Builds a tree structure from flat node data
 * 
 * @param nodes - Flat array of hierarchy nodes
 * @returns Root nodes of the tree
 * @throws Error if circular dependencies or invalid parent references are found
 */
export function buildHierarchy(nodes: HierarchyNode[]): TreeNode[] {
  // Create a map of nodes by ID for easy lookup
  const nodeMap = new Map<string, TreeNode>();
  
  // Initialize TreeNode objects
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      data: { ...node },
      children: []
    });
  });
  
  // Track visited nodes to detect circular dependencies
  const visiting = new Set<string>();
  const visited = new Set<string>();
  
  // Helper to check for cycles
  function detectCycle(nodeId: string, path: string[] = []): boolean {
    if (visited.has(nodeId)) return false;
    if (visiting.has(nodeId)) {
      throw new Error(`Circular dependency detected: ${[...path, nodeId].join(' -> ')}`);
    }
    
    visiting.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);
    
    const parent = node.data.parent;
    if (parent && !visited.has(parent)) {
      return detectCycle(parent, [...path, nodeId]);
    }
    
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }
  
  // Check for cycles and build parent-child relationships
  const rootNodes: TreeNode[] = [];
  
  nodes.forEach(node => {
    const treeNode = nodeMap.get(node.id);
    if (!treeNode) throw new Error(`Node ${node.id} not found in map`);
    
    // Check for cycles
    if (!visited.has(node.id)) {
      detectCycle(node.id);
    }
    
    // Set up parent-child relationship
    if (node.parent === null) {
      // This is a root node
      rootNodes.push(treeNode);
      treeNode.rootAncestor = node.id; // Root node is its own ancestor
    } else {
      const parentNode = nodeMap.get(node.parent);
      if (!parentNode) {
        throw new Error(`Parent node ${node.parent} not found for node ${node.id}`);
      }
      
      parentNode.children.push(treeNode);
      
      // Set root ancestor based on parent's root ancestor
      treeNode.rootAncestor = parentNode.rootAncestor;
    }
  });
  
  return rootNodes;
}

/**
 * Flattens a tree structure into an array, with each node's full ancestry path
 * 
 * @param rootNodes - Root nodes of the tree
 * @returns Flattened array of nodes with their ancestry paths
 */
export function flattenHierarchy(rootNodes: TreeNode[]): { node: TreeNode; path: string[] }[] {
  const result: { node: TreeNode; path: string[] }[] = [];
  
  function traverse(node: TreeNode, path: string[] = []) {
    const currentPath = [...path, node.data.id];
    result.push({ node, path: currentPath });
    
    node.children.forEach(child => traverse(child, currentPath));
  }
  
  rootNodes.forEach(root => traverse(root));
  
  return result;
}

/**
 * Validates the input hierarchy data
 * 
 * @param nodes - Flat array of hierarchy nodes to validate
 * @throws Error if validation fails
 */
export function validateHierarchyInput(nodes: HierarchyNode[]): void {
  if (!Array.isArray(nodes)) {
    throw new Error('Input must be an array of nodes');
  }
  
  // Check for empty input
  if (nodes.length === 0) {
    throw new Error('Input array cannot be empty');
  }
  
  // Track node IDs to check for duplicates
  const nodeIds = new Set<string>();
  
  // Validate each node
  nodes.forEach((node, index) => {
    if (!node.id) {
      throw new Error(`Node at index ${index} is missing an id`);
    }
    
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }
    
    nodeIds.add(node.id);
    
    if (typeof node.name !== 'string') {
      throw new Error(`Node ${node.id} has an invalid name`);
    }
    
    if (node.parent !== null && typeof node.parent !== 'string') {
      throw new Error(`Node ${node.id} has an invalid parent reference`);
    }
  });
}
