/**
 * Style configuration for the diagram
 */
export interface StyleOptions {
  /** Font family for node text */
  fontFamily?: string;
  
  /** Font size for node text */
  fontSize?: number;
  
  /** Color for node text */
  fontColor?: string;
  
  /** Width of node borders */
  borderWidth?: number;
  
  /** Color of node borders */
  borderColor?: string;
  
  /** Radius for rounded corners */
  borderRadius?: number;
  
  /** Default background color for nodes */
  backgroundColor?: string;
  
  /** Mapping of top-level node IDs to background colors */
  colorPalette?: Record<string, string>;
  
  /** Whether to color nodes based on their level in the hierarchy instead of root ancestor */
  colorByLevel?: boolean;
  
  /** Internal padding within boxes */
  padding?: number;

  /** Fixed width for leaf nodes (overrides minNodeWidth for leaves if set) */
  leafNodeWidth?: number;

  /** Vertical padding for parent node labels from the top edge */
  parentLabelPaddingTop?: number;
  
  /** Additional vertical offset for labels in PNG format (fixes alignment issues) */
  pngLabelYOffset?: number;
}
