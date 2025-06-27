const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro config optimizations for better development experience
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
};

// Enable watchman for better file watching
config.watchFolders = [__dirname];

module.exports = config;