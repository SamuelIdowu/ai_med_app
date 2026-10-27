module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
  // These suites provision real Supabase Auth users, database rows, and storage
  // objects. Keep the default `npm test` hermetic; run them explicitly with
  // `npm run test:live` against a disposable project.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/tests/e2e_all_features.test.ts',
    '<rootDir>/src/tests/e2e_streaming.test.ts',
    '<rootDir>/src/controllers/__tests__/streamController.test.ts',
    '<rootDir>/src/db/__tests__/rpcMatch.test.ts',
  ],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  // Only enforced when coverage is collected (CI gates with `--coverage`)
  coverageThreshold: {
    global: { statements: 40, branches: 25, functions: 35, lines: 45 },
  },
};
