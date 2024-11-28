module.exports = {
  // ... existing config ...
  rules: {
    '@typescript-eslint/no-explicit-any': 'error', // or 'warn' if you want to just get warnings
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
  },
} 