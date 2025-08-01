import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  globalIgnores(['dist']),
  eslintPluginPrettierRecommended,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite
    ],
    plugins: ['validate-jsx-nesting'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    rules: {
      'validate-jsx-nesting/no-invalid-jsx-nesting': 'error',
      '@typescript-eslint/sort-type-constituents': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: true,
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports'
        }
      ],
      'sort-keys': [
        'error',
        'asc',
        { caseSensitive: true, natural: false, minKeys: 2 }
      ],
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. Side effect imports at the start. For me this is important because I want to import reset.css and global styles at the top of my main file.
            ['^\\u0000'],
            // 2. `react` and packages: Things that start with a letter (or digit or underscore), or `@` followed by a letter.
            ['^react$', '^@?\\w'],
            // 3. Absolute imports and other imports such as Vue-style `@/foo`.
            // Anything not matched in another group. (also relative imports starting with "../")
            ['^@', '^'],
            // 4. relative imports from same folder "./" (I like to have them grouped together)
            ['^\\./'],
            // 5. style module imports always come last, this helps to avoid CSS order issues
            ['^.+\\.(module.css|module.scss)$'],
            // 6. media imports
            ['^.+\\.(gif|png|svg|jpg)$']
          ]
        }
      ]
    }
  }
])
