export * from './PngConverter';
export * from './PdfConverter';

import { PngConverter } from './PngConverter';
import { PdfConverter } from './PdfConverter';
import { OutputFormat } from '../types';

/**
 * Convert SVG to the requested output format
 * 
 * @param svgString - SVG content as string
 * @param format - Desired output format
 * @returns Output in the requested format
 */
export async function convertOutput(
  svgString: string, 
  format: OutputFormat
): Promise<string | Buffer> {
  switch (format) {
    case 'svg':
      return svgString;
      
    case 'png': {
      const converter = new PngConverter();
      return await converter.convert(svgString);
    }
    
    case 'pdf': {
      const converter = new PdfConverter();
      return await converter.convert(svgString);
    }
    
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}
