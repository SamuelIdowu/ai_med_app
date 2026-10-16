module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/mobile/src'],
  testMatch: [
    '<rootDir>/mobile/src/services/**/__tests__/**/*.test.ts',
    '<rootDir>/mobile/src/theme/**/__tests__/**/*.test.ts',
  ],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': [require.resolve('ts-jest'), {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        skipLibCheck: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/mobile/src/__mocks__/asyncStorage.ts',
    '^expo-secure-store$': '<rootDir>/mobile/src/__mocks__/expo-secure-store.ts',
    '^react-native$': '<rootDir>/mobile/src/__mocks__/react-native.ts',
  },
};
