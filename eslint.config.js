import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import testingLibrary from 'eslint-plugin-testing-library';
import vitest from 'eslint-plugin-vitest';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map(
  (config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  }),
);

const testFiles = ['**/__tests__/**/*.test.{ts,tsx}'];

export default tseslint.config(
  {
    ignores: ['dist', 'docs', 'node_modules', 'working'],
  },
  js.configs.recommended,
  ...typeCheckedConfigs,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
        sourceType: 'module',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      // Redundant under TypeScript — the compiler already validates props, and
      // the rule false-positives on any local named `props`.
      'react/prop-types': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    ...testingLibrary.configs['flat/react'],
    files: testFiles,
  },
  {
    ...vitest.configs.recommended,
    files: testFiles,
  },
  {
    files: testFiles,
    rules: {
      // <picture> has no role or accessible name, so the flag component's
      // wrapper can only be reached through the container.
      'testing-library/no-node-access': 'off',
      'testing-library/no-container': 'off',
      'vitest/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'expect*'] },
      ],
    },
  },
  prettier,
);
