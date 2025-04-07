import { LayoutOptions, StyleOptions, DiagramOptions } from '../types/index.js';

/**
 * Default layout options
 */
export const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  columns: 2,
  padding: 10,
  spacing: 5,
  minNodeWidth: 100,
  minNodeHeight: 40,
  targetAspectRatio: 16 / 9,
  layoutType: 'aspectRatioGrid'
};

/**
 * Default style options
 */
export const DEFAULT_STYLE_OPTIONS: Required<StyleOptions> = {
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
  leafNodeWidth: 0, // Set to 0 to make leaf nodes auto-size to content
  parentLabelPaddingTop: 0
};

/**
 * Default diagram options
 */
export const DEFAULT_DIAGRAM_OPTIONS: Required<DiagramOptions> = {
  layout: DEFAULT_LAYOUT_OPTIONS,
  style: DEFAULT_STYLE_OPTIONS,
  format: 'svg',
  outputPath: 'diagram.svg'
};
