const fs = require('fs').promises;
const path = require('path');
const { generateDiagram } = require('../dist');

async function example() {
  try {
    // Load sample data
    const sampleDataPath = path.join(__dirname, '..', 'test', 'fixtures', 'sample-hierarchy.json');
    const sampleDataJson = await fs.readFile(sampleDataPath, 'utf-8');
    const sampleData = JSON.parse(sampleDataJson);
    
    // Configure options
    const options = {
      layout: {
        columns: 2,
        padding: 12,
        spacing: 8
      },
      style: {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: 14,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        // Custom color palette for top-level nodes
        colorPalette: {
          'channels': '#e3f2fd'
        }
      },
      format: 'svg'
    };
    
    // Generate diagram
    const result = await generateDiagram(sampleData, options);
    
    // Save the output
    const outputPath = path.join(__dirname, 'example-output.svg');
    await fs.writeFile(outputPath, result, 'utf-8');
    
    console.log(`Diagram generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('Error in example:', error);
  }
}

example();
