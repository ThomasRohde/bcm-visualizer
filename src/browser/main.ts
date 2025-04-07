import { HierarchyNode, DiagramOptions } from '../types/index.js';
import { validateHierarchyInput, buildHierarchy } from '../core/hierarchy.js';
import { createLayoutEngine } from '../layout/index.js';
import { SvgRenderer } from '../rendering/index.js';
import { DEFAULT_DIAGRAM_OPTIONS } from '../config/index.js';

/**
 * Render a diagram into a DOM element
 * 
 * @param nodes - Input hierarchy data
 * @param targetElement - DOM element to render into
 * @param options - Configuration options
 */
export async function render(
  nodes: HierarchyNode[],
  targetElement: HTMLElement,
  options: DiagramOptions = {}
): Promise<void> {
  try {
    // Merge with default options
    const mergedOptions = {
      ...DEFAULT_DIAGRAM_OPTIONS,
      ...options,
      layout: { ...DEFAULT_DIAGRAM_OPTIONS.layout, ...options.layout },
      style: { ...DEFAULT_DIAGRAM_OPTIONS.style, ...options.style }
    };
    
    // Validate input
    validateHierarchyInput(nodes);
    
    // Build hierarchy
    const rootNodes = buildHierarchy(nodes);
    
    // Calculate layout
    const layoutEngine = createLayoutEngine(mergedOptions.layout);
    const nodesWithLayout = layoutEngine.calculateLayout(rootNodes);
    
    // Get diagram dimensions
    const dimensions = layoutEngine.getDiagramDimensions(nodesWithLayout);
    
    // Render to SVG
    const renderer = new SvgRenderer(mergedOptions.style);
    const svgString = await renderer.render(
      nodesWithLayout,
      dimensions.width,
      dimensions.height
    );
    
    // Set the SVG content in the target element
    targetElement.innerHTML = svgString;
  } catch (error) {
    console.error('Failed to render diagram:', error);
    throw error;
  }
}

/**
 * Browser-specific renderer for hierarchical diagrams
 * @deprecated Use the render function directly instead
 */
export class BrowserDiagramRenderer {
  /**
   * Render a diagram into a DOM element
   * 
   * @param nodes - Input hierarchy data
   * @param targetElement - DOM element to render into
   * @param options - Configuration options
   */
  static async render(
    nodes: HierarchyNode[],
    targetElement: HTMLElement,
    options: DiagramOptions = {}
  ): Promise<void> {
    return render(nodes, targetElement, options);
  }
}

// Main export - will be available as DiagramGenerator global in UMD
export default {
  render
};
