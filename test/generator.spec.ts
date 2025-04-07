import fs from 'fs/promises';
import path from 'path';
import { generateDiagram } from '../src/core';
import { HierarchyNode } from '../src/types';

describe('Diagram Generator', () => {
  it('should generate an SVG diagram from sample data', async () => {
    // Load sample data
    const sampleDataPath = path.join(__dirname, 'fixtures', 'sample-hierarchy.json');
    const sampleDataJson = await fs.readFile(sampleDataPath, 'utf-8');
    const sampleData: HierarchyNode[] = JSON.parse(sampleDataJson);
    
    // Generate diagram
    const result = await generateDiagram(sampleData);
    
    // Verify result is a string (SVG format)
    expect(typeof result).toBe('string');
    
    // Verify it contains SVG elements
    expect(result).toContain('<svg');
    expect(result).toContain('</svg>');
    
    // Verify it contains node names
    expect(result).toContain('Channels');
    expect(result).toContain('Digital Self-Service Channels');
    expect(result).toContain('Communication Channels');
    expect(result).toContain('Human Channels');
  });
  
  it('should throw error for invalid input', async () => {
    // Test with empty array
    await expect(generateDiagram([])).rejects.toThrow();
    
    // Test with invalid node structure
    const invalidData = [
      { id: 'test', name: 'Test', parent: 'nonexistent' }
    ];
    
    await expect(generateDiagram(invalidData)).rejects.toThrow();
  });
});
