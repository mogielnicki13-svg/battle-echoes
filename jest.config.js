module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    // Mock React Native modules
    '^react-native$': '<rootDir>/src/__tests__/__mocks__/react-native.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__tests__/__mocks__/async-storage.ts',
    '^expo-web-browser$': '<rootDir>/src/__tests__/__mocks__/expo-web-browser.ts',
    '^expo-haptics$': '<rootDir>/src/__tests__/__mocks__/expo-haptics.ts',
    '^expo-notifications$': '<rootDir>/src/__tests__/__mocks__/expo-notifications.ts',
    '^expo-constants$': '<rootDir>/src/__tests__/__mocks__/expo-constants.ts',
    '^firebase/app$': '<rootDir>/src/__tests__/__mocks__/firebase.ts',
    '^firebase/firestore$': '<rootDir>/src/__tests__/__mocks__/firebase.ts',
    '^firebase/firestore/lite$': '<rootDir>/src/__tests__/__mocks__/firebase.ts',
    '^react-i18next$': '<rootDir>/src/__tests__/__mocks__/react-i18next.ts',
  },
};
