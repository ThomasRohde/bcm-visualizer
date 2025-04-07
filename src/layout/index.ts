export * from './LayoutEngine.js';
export * from './GridLayoutEngine.js';
export * from './AspectRatioGridLayoutEngine.js';

import { LayoutEngine } from './LayoutEngine.js';
import { GridLayoutEngine } from './GridLayoutEngine.js';
import { AspectRatioGridLayoutEngine } from './AspectRatioGridLayoutEngine.js';
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
      // Add new layout engines here as they are implemented
      // case 'radial':
      //   return new RadialLayoutEngine(layoutOptions, styleOptions);
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
