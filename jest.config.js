module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js)',
    '**/*.test.(ts|tsx|js)',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-iap|@invertase))',
  ],
};