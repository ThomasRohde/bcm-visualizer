const fs = require('fs').promises;
const path = require('path');
const { generateDiagram } = require('../dist');

/**
 * Generates a diagram in the style of the BCM example
 */
async function generateBcmStyleDiagram() {
  try {
    // Create a simple hierarchy similar to the BCM example
    const data = [
      // Top level
      { id: "root", name: "Banking Capability Model", parent: null },
      
      // Main sections
      { id: "customer", name: "Customer Experience", parent: "root" },
      { id: "products", name: "Products & Services", parent: "root" },
      { id: "operations", name: "Operations", parent: "root" },
      
      // Customer Experience section
      { id: "onboarding", name: "Customer Onboarding", parent: "customer" },
      { id: "id-verification", name: "Identity Verification", parent: "onboarding" },
      { id: "document-upload", name: "Document Upload", parent: "onboarding" },
      { id: "account-setup", name: "Account Setup", parent: "onboarding" },
      
      { id: "self-service", name: "Self-Service", parent: "customer" },
      { id: "mobile-app", name: "Mobile App", parent: "self-service" },
      { id: "web-portal", name: "Web Portal", parent: "self-service" },
      { id: "atm-services", name: "ATM Services", parent: "self-service" },
      
      // Products & Services section
      { id: "accounts", name: "Accounts", parent: "products" },
      { id: "checking", name: "Checking Accounts", parent: "accounts" },
      { id: "savings", name: "Savings Accounts", parent: "accounts" },
      { id: "business", name: "Business Accounts", parent: "accounts" },
      
      { id: "loans", name: "Loans", parent: "products" },
      { id: "mortgage", name: "Mortgage Loans", parent: "loans" },
      { id: "personal", name: "Personal Loans", parent: "loans" },
      { id: "auto", name: "Auto Loans", parent: "loans" },
      
      // Operations section
      { id: "risk", name: "Risk Management", parent: "operations" },
      { id: "credit-risk", name: "Credit Risk", parent: "risk" },
      { id: "fraud", name: "Fraud Management", parent: "risk" },
      { id: "compliance", name: "Compliance", parent: "risk" },
      
      { id: "it", name: "IT Services", parent: "operations" },
      { id: "infrastructure", name: "Infrastructure", parent: "it" },
      { id: "security", name: "Security", parent: "it" },
      { id: "data", name: "Data Management", parent: "it" }
    ];
    
    // Configure options with custom color palette
    const options = {
      layout: {
        columns: 2,
        padding: 12,
        spacing: 8
      },
      style: {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: 14,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#888888',
        // Color palette for main sections
        colorPalette: {
          'customer': '#d0e8f2',  // Light blue for customer
          'products': '#e6f5d0',  // Light green for products
          'operations': '#f9e2d2' // Light orange for operations
        }
      },
      format: 'svg'
    };
    
    // Generate diagram
    const result = await generateDiagram(data, options);
    
    // Save the output
    const outputPath = path.join(__dirname, 'bcm-style-example.svg');
    await fs.writeFile(outputPath, result, 'utf-8');
    
    console.log(`Example diagram generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('Error generating example diagram:', error);
  }
}

generateBcmStyleDiagram();
