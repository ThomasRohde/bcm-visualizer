module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/browser.ts', // Exclude browser-specific code from Node.js tests
    '!src/cli.ts',     // Exclude CLI-specific code
    '!**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
