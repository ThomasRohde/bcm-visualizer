export * from './LayoutEngine.js';
export * from './GridLayoutEngine.js';
export * from './AspectRatioGridLayoutEngine.js';
export * from './PermutationGridLayoutEngine.js';
export * from './FlowGridAspectLayout.js';

import { LayoutEngine } from './LayoutEngine.js';
import { GridLayoutEngine } from './GridLayoutEngine.js';
import { AspectRatioGridLayoutEngine } from './AspectRatioGridLayoutEngine.js';
import { PermutationGridLayoutEngine } from './PermutationGridLayoutEngine.js';
import { FlowGridAspectLayout } from './FlowGridAspectLayout.js';
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
  // First, check for explicit layout type
  if (layoutOptions.layoutType) {
    switch (layoutOptions.layoutType.toLowerCase()) {
      case 'grid':
        return new GridLayoutEngine(layoutOptions, styleOptions);
      case 'aspectratio':
      case 'aspect-ratio':
        return new AspectRatioGridLayoutEngine(layoutOptions, styleOptions);
      case 'flowgrid':
      case 'flow-grid':
      case 'flow-aspect':
        return new FlowGridAspectLayout(layoutOptions, styleOptions);
      case 'optimized':
      case 'permutation':
      case 'permutation-grid':
        return new PermutationGridLayoutEngine(layoutOptions, styleOptions);
      default:
        console.warn(`Unknown layout type: ${layoutOptions.layoutType}, falling back to grid layout`);
        return new GridLayoutEngine(layoutOptions, styleOptions);
    }
  }
  
  // For backward compatibility: use AspectRatioGridLayoutEngine if targetAspectRatio is provided
  if (layoutOptions.targetAspectRatio !== undefined) {
    return new AspectRatioGridLayoutEngine(layoutOptions, styleOptions);
  }
  
  // Default to GridLayoutEngine
  return new GridLayoutEngine(layoutOptions, styleOptions);
}
