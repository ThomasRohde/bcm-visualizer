const fs = require('fs').promises;
const path = require('path');
const { generateDiagram } = require('../dist');

/**
 * Converts a diagram between formats
 */
async function convertFormat(inputJsonPath, outputFormat, outputPath) {
  try {
    // Load input data
    const inputData = await fs.readFile(inputJsonPath, 'utf-8');
    const hierarchyData = JSON.parse(inputData);
    
    // Generate diagram in the requested format
    const result = await generateDiagram(hierarchyData, {
      format: outputFormat
    });
    
    // Write the output
    await fs.writeFile(outputPath, result);
    
    console.log(`Converted to ${outputFormat.toUpperCase()}: ${outputPath}`);
  } catch (error) {
    console.error('Conversion error:', error);
  }
}

// Example usage
// node format-converter.js ../test/fixtures/sample-hierarchy.json png ./sample-diagram.png
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.error('Usage: node format-converter.js <input-json> <format> <output-path>');
    console.error('Formats: svg, png, pdf');
    process.exit(1);
  }
  
  const [inputPath, format, outputPath] = args;
  
  if (!['svg', 'png', 'pdf'].includes(format)) {
    console.error('Invalid format. Use svg, png, or pdf');
    process.exit(1);
  }
  
  convertFormat(inputPath, format, outputPath);
}

module.exports = convertFormat;
