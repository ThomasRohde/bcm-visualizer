import { HierarchyNode, DiagramOptions, OutputFormat } from '../types/index.js';
import { validateHierarchyInput, buildHierarchy } from './hierarchy.js';
import { createLayoutEngine } from '../layout/index.js';
import { SvgRenderer } from '../rendering/index.js';
import { convertOutput } from '../output/index.js';
import { DEFAULT_DIAGRAM_OPTIONS } from '../config/index.js';

/**
 * Generate a diagram from the input hierarchy data
 * 
 * @param nodes - Input hierarchy data
 * @param options - Configuration options
 * @returns The generated diagram in the specified format
 */
export async function generateDiagram(
  nodes: HierarchyNode[],
  options: DiagramOptions = {}
): Promise<string | Buffer> {
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
    
    // Convert to requested output format
    const output = await convertOutput(svgString, mergedOptions.format as OutputFormat);
    
    return output;
  } catch (error) {
    throw new Error(`Failed to generate diagram: ${error}`);
  }
}
