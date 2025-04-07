# Hierarchical Diagram Generator: Input Format Specification

This document details the required JSON input format for the Hierarchical Diagram Generator.

## Basic Structure

The generator expects an array of node objects, each with the following properties:

```json
[
  { "id": "node1", "name": "Node 1", "parent": null },
  { "id": "node2", "name": "Node 2", "parent": "node1" },
  { "id": "node3", "name": "Node 3", "parent": "node1" }
]
```

## Required Properties

Each node object must include:

| Property | Type | Description |
|----------|------|-------------|
| `id`     | string | A unique identifier for the node. Used for establishing parent-child relationships. |
| `name`   | string | The display text that will appear in the node's box. |
| `parent` | string or null | The `id` of the parent node, or `null` for root nodes (nodes at the top level). |

## Rules and Constraints

1. **Unique IDs**: Each node must have a unique `id`. Duplicate IDs will cause validation errors.

2. **Valid Parents**: Every `parent` value (except `null`) must correspond to the `id` of another node in the array.

3. **No Circular References**: The hierarchy cannot contain circular references (e.g., A → B → C → A).

4. **At Least One Root**: The array must contain at least one node with `parent: null`.

5. **ID Format**: While any string is technically allowed for `id`, it's recommended to use simple alphanumeric identifiers with hyphens (e.g., `customer-service`, `product-123`).

## Example

```json
[
  { "id": "root", "name": "Organization", "parent": null },
  
  { "id": "dept1", "name": "Sales Department", "parent": "root" },
  { "id": "team1-1", "name": "Direct Sales", "parent": "dept1" },
  { "id": "team1-2", "name": "Channel Sales", "parent": "dept1" },
  { "id": "team1-3", "name": "Inside Sales", "parent": "dept1" },
  
  { "id": "dept2", "name": "Marketing Department", "parent": "root" },
  { "id": "team2-1", "name": "Brand Marketing", "parent": "dept2" },
  { "id": "team2-2", "name": "Product Marketing", "parent": "dept2" },
  { "id": "team2-3", "name": "Digital Marketing", "parent": "dept2" },
  
  { "id": "dept3", "name": "Engineering Department", "parent": "root" },
  { "id": "team3-1", "name": "Product Development", "parent": "dept3" },
  { "id": "team3-2", "name": "Quality Assurance", "parent": "dept3" },
  { "id": "team3-3", "name": "DevOps", "parent": "dept3" }
]
```

This example creates a three-level hierarchy representing an organization with departments and teams.

## Converting from Other Formats

If your data is currently in a different format, you may need to transform it to match this specification. Common conversions include:

### From Nested Objects

```javascript
// From nested object format
const nestedData = {
  "Organization": {
    "Sales Department": {
      "Direct Sales": {},
      "Channel Sales": {},
      "Inside Sales": {}
    },
    "Marketing Department": {
      "Brand Marketing": {},
      "Product Marketing": {},
      "Digital Marketing": {}
    }
  }
};

// To flat array format
const flatData = [
  { id: "org", name: "Organization", parent: null },
  { id: "sales", name: "Sales Department", parent: "org" },
  { id: "direct", name: "Direct Sales", parent: "sales" },
  // ...and so on
];
```

### From CSV

A CSV file with columns `id,name,parent` can be easily converted to the required JSON format using common CSV parsing libraries.

## Tips for Creating IDs

When creating ids, consider:

1. **Readability**: Use descriptive IDs that reflect the content (e.g., `marketing-team` rather than `mt01`).

2. **Consistency**: Follow a consistent naming pattern for similar entities.

3. **Simplicity**: Avoid special characters other than hyphens or underscores.

4. **Future-proofing**: Consider how the IDs might need to evolve if the hierarchy changes.

## Validation

Before processing, the generator will validate your input data against these requirements and report specific errors if the validation fails.
