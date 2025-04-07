#!/usr/bin/env node
// Metis - Hierarchical Diagram Generator
import fs from 'fs/promises';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateDiagram } from '../core/index.js';
import { DiagramOptions, HierarchyNode, OutputFormat } from '../types/index.js';
import { DEFAULT_DIAGRAM_OPTIONS } from '../config/index.js';

// Define CLI options
const argv = yargs(hideBin(process.argv))
  .options({
    'input': {
      alias: 'i',
      describe: 'Input JSON file path',
      type: 'string',
      demandOption: true
    },
    'output': {
      alias: 'o',
      describe: 'Output file path',
      type: 'string',
      default: 'diagram.svg'
    },
    'format': {
      alias: 'f',
      describe: 'Output format (svg, png, pdf)',
      choices: ['svg', 'png', 'pdf'],
      default: 'svg'
    },
    'layout-type': {
      describe: 'Layout algorithm to use (grid or aspectRatio)',
      choices: ['grid', 'aspectRatio'],
      default: 'grid'
    },
    'target-aspect-ratio': {
      describe: 'Target aspect ratio for aspectRatio layout (width/height)',
      type: 'number',
      default: 1.78
    },
    'columns': {
      describe: 'Number of columns for child layout',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.layout.columns
    },
    'padding': {
      describe: 'Internal padding within boxes',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.layout.padding
    },
    'spacing': {
      describe: 'Spacing between sibling boxes',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.layout.spacing
    },
    'min-node-width': {
      describe: 'Minimum width for nodes',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.layout.minNodeWidth
    },
    'min-node-height': {
      describe: 'Minimum height for nodes',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.layout.minNodeHeight
    },
    'font-family': {
      describe: 'Font family for node text',
      type: 'string',
      default: DEFAULT_DIAGRAM_OPTIONS.style.fontFamily
    },
    'font-size': {
      describe: 'Font size for node text',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.style.fontSize
    },
    'font-color': {
      describe: 'Color for node text',
      type: 'string',
      default: DEFAULT_DIAGRAM_OPTIONS.style.fontColor
    },
    'border-width': {
      describe: 'Width of node borders',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.style.borderWidth
    },
    'border-color': {
      describe: 'Color of node borders',
      type: 'string',
      default: DEFAULT_DIAGRAM_OPTIONS.style.borderColor
    },
    'border-radius': {
      describe: 'Radius for rounded corners',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.style.borderRadius
    },
    'background-color': {
      describe: 'Default background color for nodes',
      type: 'string',
      default: DEFAULT_DIAGRAM_OPTIONS.style.backgroundColor
    },
    'color-palette': {
      describe: 'JSON string mapping top-level node IDs to colors',
      type: 'string',
      default: '{}'
    },
    'color-by-level': {
      describe: 'Enable level-based coloring',
      type: 'boolean',
      default: false
    },
    'leaf-node-width': {
      describe: 'Fixed width for leaf nodes (overrides minNodeWidth)',
      type: 'number',
      default: DEFAULT_DIAGRAM_OPTIONS.style.leafNodeWidth
    },
    'png-label-offset': {
      describe: 'Vertical offset for labels in PNG format (fixes alignment issues)',
      type: 'number',
      default: 0
    }
  })
  .help()
  .parseSync(); // Use parseSync() instead of argv

async function run() {
  try {
    // Read input file
    const inputPath = path.resolve(process.cwd(), argv.input as string);
    const inputData = await fs.readFile(inputPath, 'utf-8');
    
    // Parse input JSON
    let nodes: HierarchyNode[];
    try {
      nodes = JSON.parse(inputData);
    } catch (error) {
      console.error('Error parsing input JSON:', error);
      process.exit(1);
    }
    
    // Parse color palette
    let colorPalette = {};
    try {
      colorPalette = JSON.parse((argv as any)['color-palette'] as string);
    } catch (error) {
      console.error('Error parsing color palette JSON:', error);
      process.exit(1);
    }
    
    // Configure options
    const options: DiagramOptions = {
      layout: {
        layoutType: (argv as any)['layout-type'] as string,
        columns: argv.columns as number,
        padding: argv.padding as number,
        spacing: argv.spacing as number,
        targetAspectRatio: (argv as any)['target-aspect-ratio'] as number,
        minNodeWidth: (argv as any)['min-node-width'] as number,
        minNodeHeight: (argv as any)['min-node-height'] as number
      },
      style: {
        fontFamily: (argv as any)['font-family'] as string,
        fontSize: (argv as any)['font-size'] as number,
        fontColor: (argv as any)['font-color'] as string,
        borderWidth: (argv as any)['border-width'] as number,
        borderColor: (argv as any)['border-color'] as string,
        borderRadius: (argv as any)['border-radius'] as number,
        backgroundColor: (argv as any)['background-color'] as string,
        colorPalette,
        colorByLevel: (argv as any)['color-by-level'] as boolean,
        leafNodeWidth: (argv as any)['leaf-node-width'] !== undefined ? 
          (argv as any)['leaf-node-width'] as number : 
          DEFAULT_DIAGRAM_OPTIONS.style.leafNodeWidth,
        pngLabelYOffset: (argv as any)['png-label-offset'] as number
      },
      format: argv.format as OutputFormat,
      outputPath: argv.output as string
    };
    
    // Generate diagram
    const output = await generateDiagram(nodes, options);
    
    // Write output to file
    const outputPath = path.resolve(process.cwd(), argv.output as string);
    
    if (typeof output === 'string') {
      await fs.writeFile(outputPath, output, 'utf-8');
    } else {
      await fs.writeFile(outputPath, output);
    }
    
    console.log(`Diagram successfully generated: ${outputPath}`);
  } catch (error) {
    console.error('Error generating diagram:', error);
    process.exit(1);
  }
}

run();
