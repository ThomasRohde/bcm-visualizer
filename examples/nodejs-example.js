// Updated to use ES Modules
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDiagram } from '../dist/node/index.js';

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      format: 'svg',
      outputPath: path.join(__dirname, 'example-output.svg')
    };
    
    // Generate diagram
    const result = await generateDiagram(sampleData, options);
    
    // Save the output
    await fs.writeFile(options.outputPath, result, 'utf-8');
    
    console.log(`Diagram generated successfully: ${options.outputPath}`);
  } catch (error) {
    console.error('Error in example:', error);
  }
}

example();
