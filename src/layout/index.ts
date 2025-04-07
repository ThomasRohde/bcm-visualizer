export * from './LayoutEngine.js';
export * from './GridLayoutEngine.js';

import { LayoutEngine } from './LayoutEngine.js';
import { GridLayoutEngine } from './GridLayoutEngine.js';
import { LayoutOptions, StyleOptions } from '../types/index.js';

/**
 * Create a layout engine based on the provided options
 * 
 * @param layoutOptions - Layout configuration options
 * @param styleOptions - Style configuration options
 * @returns An appropriate layout engine instance
 */
export function createLayoutEngine(
  layoutOptions: LayoutOptions = {},
  styleOptions?: StyleOptions
): LayoutEngine {
  return new GridLayoutEngine(layoutOptions, styleOptions);
}
