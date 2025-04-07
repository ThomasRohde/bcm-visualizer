const fs = require('fs').promises;
const path = require('path');
const { generateDiagram } = require('../dist');

async function generateBcmDiagram() {
  try {
    // Load sample BCM data
    const sampleDataPath = path.join(__dirname, '..', 'test', 'fixtures', 'bcm-diagram.json');
    const sampleDataJson = await fs.readFile(sampleDataPath, 'utf-8');
    const sampleData = JSON.parse(sampleDataJson);
    
    // Configure options with custom color palette for main sections
    const options = {
      layout: {
        columns: 3,
        padding: 12,
        spacing: 10
      },
      style: {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: 14,
        borderRadius: 8,
        // Color palette based on the main sections
        colorPalette: {
          'channels': '#d0e8f2',
          'relationships': '#e6f5d0',
          'business-support': '#f9e2d2',
          'business-control': '#e8d0f2',
          'risk-management': '#f2d0d0',
          'products-services': '#d0f2e8',
          'business-direction': '#f2ecd0',
          'organisational-support': '#d0f2d2',
          'it-platform': '#d2d2f2',
          'data-platform': '#e0d0f2'
        }
      },
      format: 'svg'
    };
    
    // Generate diagram
    const result = await generateDiagram(sampleData, options);
    
    // Save the output
    const outputPath = path.join(__dirname, 'bcm-diagram.svg');
    await fs.writeFile(outputPath, result, 'utf-8');
    
    console.log(`BCM diagram generated successfully: ${outputPath}`);
    
    // Also generate PNG version
    const pngOptions = { ...options, format: 'png' };
    const pngResult = await generateDiagram(sampleData, pngOptions);
    
    const pngOutputPath = path.join(__dirname, 'bcm-diagram.png');
    await fs.writeFile(pngOutputPath, pngResult);
    
    console.log(`BCM diagram PNG generated successfully: ${pngOutputPath}`);
  } catch (error) {
    console.error('Error generating BCM diagram:', error);
  }
}

generateBcmDiagram();
