import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import prettierConfig from 'eslint-config-prettier'

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
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/sort-type-constituents': 'error',
      'sort-keys': [
        'error',
        'asc',
        { caseSensitive: true, natural: false, minKeys: 2 },
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
            ['^.+\\.(gif|png|svg|jpg)$'],
          ],
        },
      ],
    },
  },
])
