module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    // Context providers are intentionally co-located with their hooks
    // (e.g. AuthContext + useAuth) — a common, readable pattern. Fast-refresh
    // treats these as full-reloads, which is acceptable; not a correctness issue.
    'react-refresh/only-export-components': 'off',
  },
};