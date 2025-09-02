module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['./tsconfig.json', './server/tsconfig.json'], extraFileExtensions: ['.astro'] },
  plugins: ['@typescript-eslint'],
  extends: ['standard-with-typescript'],
  overrides: [
    { files: ['*.astro'], parser: 'astro-eslint-parser' }
  ],
};
