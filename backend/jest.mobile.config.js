module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/mobile/src'],
  testMatch: [
    '<rootDir>/mobile/src/**/__tests__/**/*.test.ts',
    '<rootDir>/mobile/src/**/__tests__/**/*.test.tsx',
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
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/mobile/src/__mocks__/fileMock.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/mobile/src/__mocks__/asyncStorage.ts',
    '^expo-secure-store$': '<rootDir>/mobile/src/__mocks__/expo-secure-store.ts',
    '^expo-file-system$': '<rootDir>/mobile/src/__mocks__/expo-file-system.ts',
    '^expo-file-system/(.*)$': '<rootDir>/mobile/src/__mocks__/expo-file-system.ts',
    '^expo-sharing$': '<rootDir>/mobile/src/__mocks__/expo-sharing.ts',
    '^expo-image-manipulator$': '<rootDir>/mobile/src/__mocks__/expo-image-manipulator.ts',
    '^react-native$': '<rootDir>/mobile/src/__mocks__/react-native.ts',
  },
};
