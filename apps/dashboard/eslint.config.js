import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base configuration extending recommended settings
  js.configs.recommended,
  prettierConfig, // Use Prettier config instead of plugin
  {
    name: 'base',
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.next/**',
      'out/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/_archive_*',
      '**/_legacy_*',
      '**/archive/**',
      'eslint.config.js',
      '*.config.js',
      '*.config.ts',
      'vite.config.js',
    ],
  },
  {
    name: 'source',
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: [
      '**/__tests__/**',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/_archive_*',
      '**/_legacy_*',
    ],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        browser: true,
        es2022: true,
        node: true,
        jest: true,
        // Jest globals for test files
        describe: true,
        it: true,
        test: true,
        expect: true,
        beforeEach: true,
        beforeAll: true,
        afterEach: true,
        afterAll: true,
        // Testing Library globals
        screen: true,
        render: true,
        waitFor: true,
        within: true,
        userEvent: true,
        // Browser globals
        fetch: true,
        console: true,
        setTimeout: true,
        clearTimeout: true,
        clearInterval: true,
        setInterval: true,
        requestAnimationFrame: true,
        cancelAnimationFrame: true,
        performance: true,
        process: true,
        global: true,
        window: true,
        document: true,
        localStorage: true,
        alert: true,
        confirm: true,
        HTMLElement: true,
        HTMLInputElement: true,
        HTMLButtonElement: true,
        EventTarget: true,
        // React globals
        React: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',

      // React specific rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/jsx-uses-react': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General rules
      'no-unused-vars': 'off', // Use TypeScript version instead
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-undef': 'off', // TypeScript handles this
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-template': 'off',
      'no-nested-ternary': 'off',
      'no-unneeded-ternary': 'warn',
      'spaced-comment': 'off',
    },
  },
];
