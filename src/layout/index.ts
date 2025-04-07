export * from './LayoutEngine.js';
export * from './GridLayoutEngine.js';

import { LayoutEngine } from './LayoutEngine.js';
import { GridLayoutEngine } from './GridLayoutEngine.js';
import { LayoutOptions } from '../types/index.js';

/**
 * Create a layout engine based on the provided options
 * 
 * @param options - Layout configuration options
 * @returns An appropriate layout engine instance
 */
export function createLayoutEngine(options: LayoutOptions = {}): LayoutEngine {
  // Currently only GridLayoutEngine is implemented
  // In the future, this could switch based on a 'type' option
  return new GridLayoutEngine(options);
}
