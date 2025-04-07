/**
 * Utility script to help convert hierarchical data to the required JSON format
 * 
 * Usage:
 * node convert-to-json.js > output.json
 */

// Example of how to define a hierarchy programmatically
function generateSampleHierarchy() {
  // Define the hierarchy in a more readable format
  const hierarchy = {
    'Channels': {
      'Digital Self-Service Channels': {
        'Web & Mobile Banking': {},
        'External Information Exchange': {},
        'Open Banking': {},
        'Homepages': {}
      },
      'Communication Channels': {
        'Chat': {},
        'Physical Mail': {},
        'Online Meetings': {},
        'Electronic Mail': {},
        'SMS': {}
      },
      'Human Channels': {
        'Contact Centres': {},
        'Help Desk': {},
        'Branch Services': {}
      },
      'ATMs': {}
    },
    'Relationships': {
      'Partner Relationship Management': {
        'Partner Management': {},
        'Partner Programs': {}
      },
      // ... more nodes
    }
    // ... more top-level sections
  };

  // Convert to the required JSON format
  return convertToJson(hierarchy);
}

/**
 * Converts a nested object hierarchy to the flat JSON format required by the generator
 * 
 * @param {Object} hierarchy - Nested hierarchy object
 * @returns {Array} Flat array of nodes in the required format
 */
function convertToJson(hierarchy) {
  const nodes = [];
  let idCounter = 1;
  
  // Generate a safe ID from a name
  function nameToId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Process the hierarchy recursively
  function processNode(node, parentId = null, level = 0) {
    Object.entries(node).forEach(([name, children]) => {
      const id = nameToId(name);
      
      // Add this node
      nodes.push({
        id,
        name,
        parent: parentId
      });
      
      // Process children
      if (Object.keys(children).length > 0) {
        processNode(children, id, level + 1);
      }
    });
  }
  
  processNode(hierarchy);
  return nodes;
}

// Generate and output the JSON
const hierarchy = generateSampleHierarchy();
console.log(JSON.stringify(hierarchy, null, 2));
