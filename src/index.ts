// Re-export core functionality
export * from './types';
export * from './core';
export * from './layout';
export * from './rendering';
export * from './output';
export * from './config';

// Export browser renderer for direct use in Node.js environment
export { BrowserDiagramRenderer } from './browser';
