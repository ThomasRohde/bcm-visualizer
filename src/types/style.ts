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
  
  /** Internal padding within boxes */
  padding?: number;
}
