/**
 * Jest configuration for frontend unit tests.
 *
 * @module jest.config
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Setup files to run after test framework is installed
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Use jsdom for testing browser-like environment
  testEnvironment: 'jest-environment-jsdom',

  // Module path aliases (matching tsconfig.json paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  // Files to collect coverage from
  collectCoverageFrom: [
    'lib/**/*.ts',
    'lib/**/*.tsx',
    'components/**/*.ts',
    'components/**/*.tsx',
    'hooks/**/*.ts',
    'hooks/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Verbose output
  verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config
module.exports = createJestConfig(customJestConfig);
