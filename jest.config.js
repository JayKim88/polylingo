module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)', '**/*.test.(ts|tsx|js)'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-iap|@invertase|lucide-react-native|nativewind))',
  ],
  // Performance optimizations
  maxWorkers: '50%', // Use half the available CPU cores
  // Skip slow integration tests by default (use --testNamePattern to run specific ones)
  testPathIgnorePatterns: ['/node_modules/'],
};
