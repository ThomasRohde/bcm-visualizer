export * from './LayoutEngine';
export * from './GridLayoutEngine';

import { LayoutEngine } from './LayoutEngine';
import { GridLayoutEngine } from './GridLayoutEngine';
import { LayoutOptions } from '../types';

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
