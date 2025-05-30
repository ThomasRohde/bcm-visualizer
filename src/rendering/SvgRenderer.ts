import { TreeNode, StyleOptions } from '../types/index.js';
import { getDefaultMutedColorPalette } from '../utils/styleUtils.js';

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
    padding: 10,
    leafNodeWidth: 120,
    parentLabelPaddingTop: 5, // New option for parent label vertical offset
    pngLabelYOffset: 0 // Default no offset for PNG label positioning
  };

  private style: Required<StyleOptions>;
  private leafColor: string | null = null;
  private levelColors: string[] = [];
  private fontSizeScale: number = 1.2; // Scale factor between hierarchy levels
  private maxDepth: number = 0; // To be calculated during first render pass

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
    
    // Calculate the maximum depth in the hierarchy tree
    this.maxDepth = this.calculateMaxDepth(rootNodes);

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
    
    // Calculate appropriate font size based on node depth
    const fontSize = this.calculateFontSize(isLeaf, level);

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

    // Check if this is a leaf node with a fixed width that needs text wrapping
    if (isLeaf && this.style.leafNodeWidth) {
      this.renderWrappedText(group, node.data.name, x, y, width, height, fontSize);
    } else {
      const centerX = x + width / 2;
      let titleY: number;
      let dominantBaseline: string | null = null;

      if (isLeaf) {
        // Apply PNG label vertical offset for leaf nodes
        titleY = y + height / 2 - fontSize / 2 + this.style.pngLabelYOffset; // adjust for better vertical centering
        dominantBaseline = 'middle';
      } else {
        // Apply PNG label vertical offset for parent nodes
        titleY = y + this.style.parentLabelPaddingTop + this.style.pngLabelYOffset + 2;
        dominantBaseline = 'hanging';
      }

      const title = group.text(node.data.name)
        .font({
          family: this.style.fontFamily,
          size: fontSize, // Use the calculated font size
          anchor: 'start', // start to allow manual centering
          leading: '1.2em'
        })
        .fill(this.style.fontColor)
        .move(x, titleY);

      if (dominantBaseline) {
        title.attr('dominant-baseline', dominantBaseline);
      }

      // Measure bbox and center horizontally
      const bbox = title.bbox();
      const centeredX = x + (width - bbox.width) / 2;
      title.move(centeredX, titleY);
    }

    // If this node has children, render them recursively
    if (node.children.length > 0) {
      for (const child of node.children) {
        this.renderNode(child, level + 1);
      }
    }
  }

  /**
   * Render text with word wrapping, centered horizontally and vertically
   * within the node's bounds for fixed-width nodes.
   *
   * @param group - SVG group to add the text to
   * @param text - Text content to render
   * @param x - X position of the node
   * @param y - Y position of the node
   * @param width - Width of the node
   * @param height - Height of the node
   * @param fontSize - Font size to use for the text
   */
  private renderWrappedText(group: any, text: string, x: number, y: number, width: number, height: number, fontSize: number = this.style.fontSize): void {
    // Calculate effective width (account for padding)
    const effectiveWidth = width - (this.style.padding * 2);
    const lineHeight = fontSize * 1.2;
    
    // Split the text into words
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    // Calculate line breaks
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      // Check if adding this word would exceed the width
      const estimatedWidth = this.estimateTextWidth(testLine, fontSize, this.style.fontFamily);
      
      if (estimatedWidth > effectiveWidth && i > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    // Add the last line if there's anything left
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Calculate vertical position to center the text block
    const totalTextHeight = lines.length * lineHeight;
    // Apply PNG label Y-offset for wrapped text
    const startY = y + (height - totalTextHeight) / 2 + this.style.pngLabelYOffset;
    const centerX = x + width / 2;
    
    // For debugging - add a small indicator of the calculated position
    // group.rect(5, 5).move(centerX - 2.5, startY - 2.5).fill('#ff0000');
    
    // Create separate text elements for each line for maximum compatibility
    lines.forEach((line, index) => {
      const lineY = startY + (index * lineHeight);

      const textElement = group.text(line)
        .font({
          family: this.style.fontFamily,
          size: fontSize,
          anchor: 'start',
        })
        .attr('dominant-baseline', 'hanging')
        .fill(this.style.fontColor)
        .move(0, lineY) // temporarily at x=0
        .opacity(0); // hide initially

      const bbox = textElement.bbox();
      const centeredX = x + (width - bbox.width) / 2;

      textElement.move(centeredX, lineY).opacity(1);
    });
  }

  /**
   * Estimate width of text for wrapping calculations
   * This is a simple estimate as exact measurement depends on the font
   *
   * @param text - Text to measure
   * @param fontSize - Font size
   * @param fontFamily - Font family
   * @returns Estimated width in pixels
   */
  private estimateTextWidth(text: string, fontSize: number, fontFamily: string): number {
    // More accurate estimation of text width
    // Different characters have different widths, so we account for that
    const charWidthFactors: Record<string, number> = {
      // Wide characters
      'w': 0.9, 'm': 1.0, 'W': 1.1, 'M': 1.2,
      // Medium characters
      'a': 0.7, 'b': 0.7, 'c': 0.7, 'd': 0.7, 'e': 0.7, 'g': 0.7, 'h': 0.7, 'k': 0.7,
      'n': 0.7, 'o': 0.7, 'p': 0.7, 'q': 0.7, 'u': 0.7, 'v': 0.7, 'x': 0.7, 'y': 0.7,
      'z': 0.7, 'A': 0.9, 'B': 0.8, 'C': 0.8, 'D': 0.9, 'E': 0.8, 'F': 0.7,
      'G': 0.9, 'H': 0.9, 'K': 0.8, 'N': 0.9, 'O': 0.9, 'P': 0.8, 'Q': 0.9,
      'R': 0.8, 'S': 0.8, 'U': 0.9, 'V': 0.9, 'X': 0.8, 'Y': 0.8, 'Z': 0.8,
      // Narrow characters
      'i': 0.4, 'j': 0.4, 'l': 0.4, 'r': 0.4, 's': 0.5, 't': 0.4, 'I': 0.4, 'J': 0.5,
      'L': 0.6, 'T': 0.7,
      // Numbers
      '0': 0.7, '1': 0.5, '2': 0.7, '3': 0.7, '4': 0.7, '5': 0.7, '6': 0.7, '7': 0.7,
      '8': 0.7, '9': 0.7,
      // Special characters
      ' ': 0.4, '-': 0.5, '.': 0.3, ',': 0.3, ':': 0.3, ';': 0.3, '!': 0.4,
      '?': 0.7, '(': 0.5, ')': 0.5, '/': 0.5, '\\': 0.5, '&': 0.9
    };

    // Calculate width based on character width factors
    let totalWidth = 0;
    for (const char of text) {
      // Use the character's width factor if defined, or use a default factor
      const factor = charWidthFactors[char] || 0.7;
      totalWidth += fontSize * factor;
    }

    // Add a small buffer (e.g., 2-5%) for better wrapping reliability,
    // as font rendering can vary slightly.
    return totalWidth * 1.02 - 2; // Slightly reduce buffer and subtract 2px for better centering
  }

  /**
   * Calculate the maximum depth of the hierarchy
   * 
   * @param rootNodes - Root nodes of the tree
   * @returns Maximum depth of the hierarchy
   */
  private calculateMaxDepth(rootNodes: TreeNode[]): number {
    let maxDepth = 0;
    
    const traverseNode = (node: TreeNode, currentDepth: number) => {
      maxDepth = Math.max(maxDepth, currentDepth);
      node.children.forEach(child => traverseNode(child, currentDepth + 1));
    };
    
    rootNodes.forEach(root => traverseNode(root, 0));
    
    return maxDepth;
  }

  /**
   * Calculate the font size based on node depth
   * Leaf nodes use the configured fontSize
   * Non-leaf nodes use a larger font size based on their depth
   * 
   * @param isLeaf - Whether the node is a leaf node
   * @param level - Current level in the hierarchy (0 = root)
   * @returns Font size in pixels
   */
  private calculateFontSize(isLeaf: boolean, level: number): number {
    if (isLeaf) {
      return this.style.fontSize; // Use configured font size for leaf nodes
    }
    
    // For non-leaf nodes, scale font size based on level
    // Higher levels (closer to root) get larger font sizes
    // Start from the leaf font size and work backwards
    const levelsFromLeaf = Math.max(0, this.maxDepth - level);
    return this.style.fontSize * Math.pow(this.fontSizeScale, levelsFromLeaf);
  }
}