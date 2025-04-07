import { TreeNode, StyleOptions } from '../types';
import { getDefaultMutedColorPalette } from '../utils/styleUtils';

/**
 * Renderer that outputs SVG format
 */
export class SvgRenderer {
  private svg: any; // SVG.js instance
  private document: any; // SVG document
  private window: any; // Window object (if in Node.js)
  
  // Default style options
  private static readonly DEFAULT_STYLE: Required<StyleOptions> = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    fontColor: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    colorPalette: {},
    colorByLevel: false,
    padding: 10
  };
  
  private style: Required<StyleOptions>;
  private leafColor: string | null = null;
  private levelColors: string[] = [];
  
  /**
   * Create a new SVG renderer
   * 
   * @param styleOptions - Style configuration options
   */
  constructor(styleOptions: StyleOptions = {}) {
    this.style = { ...SvgRenderer.DEFAULT_STYLE, ...styleOptions };
    
    // Initialize level colors from palette if available
    if (this.style.colorPalette && Object.keys(this.style.colorPalette).length > 0) {
      this.levelColors = Object.values(this.style.colorPalette);
    } else {
      // Use the default muted color palette when no custom palette is provided
      this.levelColors = getDefaultMutedColorPalette();
    }
  }
  
  /**
   * Render a tree structure to SVG
   * 
   * @param rootNodes - Root nodes with layout information
   * @param width - Width of the diagram
   * @param height - Height of the diagram
   * @returns SVG string representation
   */
  async render(rootNodes: TreeNode[], width: number, height: number): Promise<string> {
    // Initialize SVG.js (differently for Node.js and browser)
    await this.initializeSvg();
    
    // Create an SVG document with the specified dimensions
    this.document = this.svg.SVG().size(width, height);
    
    // Render each root node and its children
    for (const root of rootNodes) {
      this.renderNode(root, 0);
    }
    
    // Convert to string and clean up
    const svgString = this.document.svg();
    this.cleanUp();
    
    return svgString;
  }
  
  /**
   * Initialize SVG.js (differs between Node.js and browser)
   */
  private async initializeSvg(): Promise<void> {
    if (typeof window !== 'undefined' && window.document) {
      // Browser environment - check if SVG.js is already available globally
      if (typeof (window as any).SVG !== 'undefined') {
        // Use the globally loaded SVG.js
        this.svg = { SVG: (window as any).SVG };
      } else {
        // Fallback to dynamic import
        try {
          this.svg = await import('@svgdotjs/svg.js');
        } catch (err) {
          console.error('Error loading SVG.js:', err);
          throw new Error('Failed to load SVG.js. Make sure it is included in your HTML or properly bundled.');
        }
      }
    } else {
      // Node.js environment
      try {
        const { SVG, registerWindow } = await import('@svgdotjs/svg.js');
        const { createSVGWindow } = await import('svgdom');
        
        this.window = createSVGWindow();
        const document = this.window.document;
        
        // Register window and document with SVG.js
        registerWindow(this.window, document);
        
        this.svg = { SVG };
      } catch (err) {
        console.error('Error loading SVG.js or svgdom:', err);
        throw new Error('Failed to load required libraries for Node.js rendering.');
      }
    }
  }
  
  /**
   * Clean up resources
   */
  private cleanUp(): void {
    // In Node.js, we might need to clean up the SVGDOM window
    if (this.window) {
      // No explicit cleanup needed for svgdom at this point
    }
    
    // Clear references
    this.document = null;
  }
  
  /**
   * Render a single node and its children
   * 
   * @param node - The node to render
   * @param level - Current hierarchy level (0 = root)
   */
  private renderNode(node: TreeNode, level: number): void {
    if (!node.layout) {
      console.warn(`Node ${node.data.id} has no layout information`);
      return;
    }
    
    const { x, y, width, height } = node.layout;
    
    // Create a group for this node
    const group = this.document.group();
    
    // Determine if this is a leaf node (no children)
    const isLeaf = node.children.length === 0;
    
    // Determine background color based on styling options
    let bgColor = this.style.backgroundColor;
    
    // Use colorByLevel property to determine coloring strategy
    if (this.style.colorByLevel) {
      // Color based on hierarchy level
      if (this.style.colorPalette) {
        if (isLeaf && this.style.colorPalette['leaf']) {
          // Special color for leaf nodes if specified
          bgColor = this.style.colorPalette['leaf'];
        } else if (this.style.colorPalette[level.toString()]) {
          // Color based on exact level match
          bgColor = this.style.colorPalette[level.toString()];
        }
      }
    } else {
      // Original coloring logic based on root ancestor
      if (node.rootAncestor && this.style.colorPalette[node.rootAncestor]) {
        bgColor = this.style.colorPalette[node.rootAncestor];
      } else if (isLeaf) {
        // For leaf nodes, use the last color in the palette as a special leaf color
        if (this.levelColors.length > 0) {
          // Use the last color in the palette for leaf nodes
          // If we haven't cached the leaf color yet, do so
          if (this.leafColor === null) {
            this.leafColor = this.levelColors[this.levelColors.length - 1];
          }
          bgColor = this.leafColor;
        }
      } else if (this.levelColors.length > 0) {
        // For non-leaf nodes, use color based on level
        // Exclude the last color (reserved for leaves)
        const nonLeafColors = this.levelColors.length > 1 ? 
                              this.levelColors.slice(0, -1) : 
                              this.levelColors;
        
        if (nonLeafColors.length > 0) {
          // Use the level to determine the color
          const colorIndex = level % nonLeafColors.length;
          bgColor = nonLeafColors[colorIndex];
        }
      }
    }
    
    // Draw the rectangle for this node
    const rect = group.rect(width, height)
      .move(x, y)
      .fill(bgColor)
      .stroke({ color: this.style.borderColor, width: this.style.borderWidth })
      .radius(this.style.borderRadius);
    
    // Add the title text
    const title = group.text(node.data.name)
      .font({
        family: this.style.fontFamily,
        size: this.style.fontSize,
        anchor: 'middle',
        leading: '1.5em'
      })
      .fill(this.style.fontColor)
      .move(x + width / 2, y + this.style.padding);
    
    // Center text horizontally
    title.cx(x + width / 2);
    
    // If this node has children, render them
    if (node.children.length > 0) {
      for (const child of node.children) {
        this.renderNode(child, level + 1);
      }
    }
  }
}
