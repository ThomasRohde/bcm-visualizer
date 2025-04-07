/**
 * Converts SVG to PDF format
 */
export class PdfConverter {
  /**
   * Convert SVG to PDF
   * 
   * @param svgString - SVG content as string
   * @returns PDF document as Buffer
   */
  async convert(svgString: string): Promise<Buffer> {
    try {
      // First convert to PNG as an intermediate step
      const { PngConverter } = await import('./PngConverter.js');
      const pngConverter = new PngConverter();
      const pngBuffer = await pngConverter.convert(svgString);
      
      // Now convert PNG to PDF using PDFKit
      try {
        const PDFDocument = (await import('pdfkit')).default;
        const { Resvg } = await import('@resvg/resvg-js');
        
        // Get dimensions from the SVG
        const resvg = new Resvg(svgString);
        const bbox = resvg.getBBox();
        // Handle potentially undefined bbox
        const width = bbox?.width ?? 800;  // Default width if missing
        const height = bbox?.height ?? 600; // Default height if missing
        
        // Create a new PDF document
        const doc = new PDFDocument({ 
          size: [width, height],
          margin: 0
        });
        
        // Add the PNG to the document
        doc.image(pngBuffer, 0, 0, { 
          width, 
          height 
        });
        
        // Finalize the PDF and convert to buffer
        doc.end();
        
        return new Promise((resolve, reject) => {
          // Collect PDF data chunks
          const chunks: Buffer[] = [];
          
          doc.on('data', (chunk) => {
            chunks.push(Buffer.from(chunk));
          });
          
          doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            resolve(pdfBuffer);
          });
          
          doc.on('error', (err) => {
            reject(new Error(`PDF generation error: ${err}`));
          });
        });
      } catch (pdfError) {
        throw new Error(`PDF generation failed: ${pdfError}. Make sure pdfkit is installed correctly.`);
      }
    } catch (error) {
      console.error(`PDF conversion error: ${error}`);
      throw new Error(`Failed to convert SVG to PDF: ${error}. This feature requires @resvg/resvg-js and pdfkit packages.`);
    }
  }
}
