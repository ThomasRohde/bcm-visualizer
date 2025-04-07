/**
 * Utility for measuring text dimensions
 */
export interface TextMeasurer {
  /**
   * Measure the width and height of text with given style
   * 
   * @param text - The text to measure
   * @param fontSize - Font size in pixels
   * @param fontFamily - Font family
   * @returns The width and height of the text
   */
  measureText(text: string, fontSize: number, fontFamily: string): { width: number; height: number };
}

/**
 * Text measurer implementation for Node.js environment using canvas
 */
export class NodeTextMeasurer implements TextMeasurer {
  private canvas: any;
  private context: any;
  
  constructor() {
    try {
      // Try to load the canvas module (optional dependency)
      const { createCanvas } = require('canvas');
      this.canvas = createCanvas(100, 100);
      this.context = this.canvas.getContext('2d');
    } catch (err) {
      console.warn('Canvas module not available. Text measurements will be estimated.');
    }
  }
  
  measureText(text: string, fontSize: number, fontFamily: string): { width: number; height: number } {
    if (this.context) {
      // Use actual canvas text measurement
      this.context.font = `${fontSize}px ${fontFamily}`;
      const metrics = this.context.measureText(text);
      
      // Height calculation is an approximation as Canvas doesn't provide direct height metrics
      // Use approximation of 1.2 times font size for line height
      const height = fontSize * 1.2;
      
      return {
        width: metrics.width,
        height
      };
    } else {
      // Fallback approximation when canvas is not available
      return this.approximateTextSize(text, fontSize);
    }
  }
  
  private approximateTextSize(text: string, fontSize: number): { width: number; height: number } {
    // Simple approximation: 0.6 * fontSize per character width on average
    const width = text.length * fontSize * 0.6;
    const height = fontSize * 1.2;
    
    return { width, height };
  }
}

/**
 * Text measurer implementation for browser environment
 */
export class BrowserTextMeasurer implements TextMeasurer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context for text measurement');
    }
    this.context = ctx;
  }
  
  measureText(text: string, fontSize: number, fontFamily: string): { width: number; height: number } {
    this.context.font = `${fontSize}px ${fontFamily}`;
    const metrics = this.context.measureText(text);
    
    // More accurate height calculation in browsers with newer Canvas text metrics
    let height: number;
    
    if (metrics.actualBoundingBoxAscent && metrics.actualBoundingBoxDescent) {
      height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    } else {
      // Fallback to approximation
      height = fontSize * 1.2;
    }
    
    return {
      width: metrics.width,
      height
    };
  }
}

/**
 * Factory function to create the appropriate text measurer for the current environment
 */
export function createTextMeasurer(): TextMeasurer {
  if (typeof window !== 'undefined' && window.document) {
    return new BrowserTextMeasurer();
  } else {
    return new NodeTextMeasurer();
  }
}

// Create singleton instance
const textMeasurer = createTextMeasurer();

export default textMeasurer;
