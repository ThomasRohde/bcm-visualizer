// Example demonstrating the TreemapLayoutEngine
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
    
    // Configure options with treemap layout
    const options = {
      layout: {
        layoutType: 'treemap', // Specify treemap layout
        padding: 10,
        spacing: 5,
        targetLeafAspectRatio: 1.0 // Try to make leaf nodes square-ish
      },
      style: {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: 14,
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
        // Custom color palette for top-level nodes
        colorPalette: {
          'channels': '#e3f2fd',
          'products': '#e8f5e9',
          'services': '#fff3e0'
        }
      },
      format: 'svg',
      outputPath: path.join(__dirname, 'treemap-output.svg')
    };
    
    // Generate diagram
    const result = await generateDiagram(sampleData, options);
    
    // Save the output
    await fs.writeFile(options.outputPath, result, 'utf-8');
    
    console.log(`Treemap diagram generated successfully: ${options.outputPath}`);
  } catch (error) {
    console.error('Error generating treemap:', error);
  }
}

example();
