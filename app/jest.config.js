/**
 * Logic-only test setup.
 *
 * The engines are deliberately free of React Native and Expo imports, so they
 * run under plain ts-jest with no native mocking. The few service modules that
 * do touch Expo or React Native are stubbed by moduleNameMapper so their pure
 * helpers stay testable.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__tests__/__mocks__/reactNativeStub.ts',
    '^expo-mail-composer$': '<rootDir>/__tests__/__mocks__/expoStub.ts',
    '^expo-notifications$': '<rootDir>/__tests__/__mocks__/expoStub.ts',
    '^expo-speech$': '<rootDir>/__tests__/__mocks__/expoStub.ts',
    '^expo-sqlite$': '<rootDir>/__tests__/__mocks__/expoStub.ts',
    '^expo-file-system$': '<rootDir>/__tests__/__mocks__/expoStub.ts',
    '^expo-secure-store$': '<rootDir>/__tests__/__mocks__/expoStub.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          types: ['jest', 'node'],
          strict: true,
        },
      },
    ],
  },
  collectCoverageFrom: ['src/engines/**/*.ts', 'src/data/**/*.ts'],
};
