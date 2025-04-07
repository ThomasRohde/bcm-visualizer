/**
 * Converts SVG to PNG format
 */
export class PngConverter {
  /**
   * Convert SVG to PNG
   * 
   * @param svgString - SVG content as string
   * @returns PNG image as Buffer
   */
  async convert(svgString: string): Promise<Buffer> {
    try {
      // Use resvg-js for conversion
      const { Resvg } = await import('@resvg/resvg-js');
      
      // Create a new Resvg instance
      const resvg = new Resvg(svgString);
      
      // Render to PNG
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      
      return pngBuffer;
    } catch (error) {
      console.error(`PNG conversion error: ${error}`);
      throw new Error(`Failed to convert SVG to PNG: ${error}. Note: This feature requires the @resvg/resvg-js package. Make sure it's installed correctly.`);
    }
  }
}
