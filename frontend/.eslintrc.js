module.exports = {
  extends: [
    '@react-native',
    '@typescript-eslint/recommended'
  ],
  rules: {
    'no-global-assign': 'error',
    'prefer-const': 'error',
    'no-unused-vars': 'warn',
    'no-console': 'warn'
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint']
};
