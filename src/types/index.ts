export * from './input.js';
export * from './layout.js';
export * from './style.js';

/**
 * Output format options
 */
export type OutputFormat = 'svg' | 'png' | 'pdf';

/**
 * Complete configuration options for the diagram generator
 */
export interface DiagramOptions {
  /** Layout configuration */
  layout?: import('./layout.js').LayoutOptions;
  
  /** Style configuration */
  style?: import('./style.js').StyleOptions;
  
  /** Output format */
  format?: OutputFormat;
  
  /** Output path (for CLI) */
  outputPath?: string;
}
