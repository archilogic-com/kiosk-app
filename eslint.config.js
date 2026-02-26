import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/', 'eslint.config.js', 'prettier.config.js'],
  },
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // src/core holds the framework-agnostic half of the app: the domain model,
    // the theme, and everything that talks to the Floor Plan SDK. Keeping a
    // framework out of it is what lets a second UI reuse it unchanged.
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'src/core must stay framework-agnostic.',
            },
            {
              name: 'react-dom',
              message: 'src/core must stay framework-agnostic.',
            },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom/*', '#/hooks/*', '#/components/*'],
              message: 'src/core must stay framework-agnostic.',
            },
          ],
        },
      ],
    },
  },
)
