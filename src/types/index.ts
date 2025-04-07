export * from './input';
export * from './layout';
export * from './style';

/**
 * Output format options
 */
export type OutputFormat = 'svg' | 'png' | 'pdf';

/**
 * Complete configuration options for the diagram generator
 */
export interface DiagramOptions {
  /** Layout configuration */
  layout?: import('./layout').LayoutOptions;
  
  /** Style configuration */
  style?: import('./style').StyleOptions;
  
  /** Output format */
  format?: OutputFormat;
  
  /** Output path (for CLI) */
  outputPath?: string;
}
