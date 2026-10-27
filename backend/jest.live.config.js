module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/tests/e2e_all_features.test.ts',
    '<rootDir>/src/tests/e2e_streaming.test.ts',
    '<rootDir>/src/controllers/__tests__/streamController.test.ts',
    '<rootDir>/src/db/__tests__/rpcMatch.test.ts',
  ],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  testTimeout: 60000,
};
