import { StyleOptions } from '../types';

/**
 * Generates a contrasting text color (black or white) for a given background color
 * 
 * @param backgroundColor - Background color in hex format
 * @returns Black or white depending on which provides better contrast
 */
export function getContrastingTextColor(backgroundColor: string): string {
  // Default to black if invalid input
  if (!backgroundColor || !backgroundColor.startsWith('#')) {
    return '#000000';
  }
  
  // Convert hex to RGB
  let r: number;
  let g: number;
  let b: number;
  
  if (backgroundColor.length === 7) {
    // Standard hex format #RRGGBB
    r = parseInt(backgroundColor.substring(1, 3), 16);
    g = parseInt(backgroundColor.substring(3, 5), 16);
    b = parseInt(backgroundColor.substring(5, 7), 16);
  } else if (backgroundColor.length === 4) {
    // Short hex format #RGB
    r = parseInt(backgroundColor.substring(1, 2) + backgroundColor.substring(1, 2), 16);
    g = parseInt(backgroundColor.substring(2, 3) + backgroundColor.substring(2, 3), 16);
    b = parseInt(backgroundColor.substring(3, 4) + backgroundColor.substring(3, 4), 16);
  } else {
    return '#000000';
  }
  
  // Calculate perceived brightness using the formula from W3C
  // See: https://www.w3.org/TR/AERT/#color-contrast
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return black or white based on brightness
  return brightness > 125 ? '#000000' : '#ffffff';
}

/**
 * Applies automatic text color based on background color
 * 
 * @param style - Style options object
 * @returns Style options with auto text color applied if enabled
 */
export function applyAutoTextColor(style: StyleOptions): StyleOptions {
  if (!style.fontColor && style.backgroundColor) {
    return {
      ...style,
      fontColor: getContrastingTextColor(style.backgroundColor)
    };
  }
  
  return style;
}

/**
 * Generates a color palette with pastel colors for a set of root node IDs
 * 
 * @param rootIds - Array of root node IDs
 * @returns Mapping of root IDs to pastel colors
 */
export function generateColorPalette(rootIds: string[]): Record<string, string> {
  const palette: Record<string, string> = {};
  
  // Predefined set of pastel colors
  const colors = [
    '#d0e8f2', // Light blue
    '#e6f5d0', // Light green
    '#f9e2d2', // Light orange
    '#e8d0f2', // Light purple
    '#f2d0d0', // Light red
    '#d0f2e8', // Light teal
    '#f2ecd0', // Light yellow
    '#d0f2d2', // Light mint
    '#d2d2f2', // Light lavender
    '#e0d0f2'  // Light violet
  ];
  
  rootIds.forEach((id, index) => {
    palette[id] = colors[index % colors.length];
  });
  
  return palette;
}
