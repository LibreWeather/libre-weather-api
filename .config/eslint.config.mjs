import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { importX } from 'eslint-plugin-import-x';
import jsonc from 'eslint-plugin-jsonc';
import yml from 'eslint-plugin-yml';
import globals from 'globals';

const stylisticConfig = stylistic.configs.customize({
  indent: 2,
  quotes: 'single',
  semi: true,
  jsx: false,
  arrowParens: true,
  braceStyle: '1tbs',
  quoteProps: 'as-needed',
  commaDangle: 'always-multiline',
  blockSpacing: true,
  bracketSpacing: true,
});

export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'tmp/**', 'package-lock.json', 'CHANGELOG.md'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    plugins: {
      '@stylistic': stylistic,
      'import-x': importX,
    },
    rules: {
      ...stylisticConfig.rules,
      '@stylistic/max-len': [
        'error',
        { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreComments: true },
      ],
      '@stylistic/comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'never',
        },
      ],
      'no-underscore-dangle': 'off',
      strict: ['error', 'safe'],
      'no-restricted-syntax': 'off',
      'no-await-in-loop': 'off',
      'no-fallthrough': 'off',
      'no-param-reassign': 'off',
      'no-case-declarations': 'off',
      'class-methods-use-this': 'off',
      'no-continue': 'off',
      'import-x/order': 'off',
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    files: ['test/**/*.{js,cjs}'],
    languageOptions: {
      globals: globals.mocha,
    },
  },
  ...jsonc.configs['flat/recommended-with-json'],
  ...yml.configs['flat/recommended'],
  {
    files: ['**/*.{yml,yaml}'],
    rules: {
      'yml/indent': 'error',
      'yml/quotes': ['error', { prefer: 'single' }],
      'yml/plain-scalar': 'error',
      'yml/key-spacing': 'error',
      'yml/spaced-comment': 'error',
    },
  },
];
