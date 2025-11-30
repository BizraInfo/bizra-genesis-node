/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        moduleResolution: 'node',
      },
    }],
  },
  // Transform ESM modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs|until-async)/)',
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock import.meta.env references
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Path alias
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Inject import.meta.env as globals
  injectGlobals: true,
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      // Starting thresholds - will increase as coverage improves
      // Current baseline: statements=16.7%, branches=9.6%, lines=16.8%, functions=11.3%
      branches: 8,
      functions: 10,
      lines: 15,
      statements: 15,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

module.exports = config;
