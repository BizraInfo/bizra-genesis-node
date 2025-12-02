/**
 * BIZRA Node0 - ESLint Configuration
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * Streamlined configuration for Next.js 14
 */

module.exports = {
  root: true,

  extends: [
    'next/core-web-vitals',
  ],

  rules: {
    // Relaxed for rapid development
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'warn',
  },

  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'build/',
    'dist/',
    'coverage/',
    'reports/',
    '*.min.js',
    'public/',
    'jest.setup.ts',
    'jest.config.ts',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ],
};
