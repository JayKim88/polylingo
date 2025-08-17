const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Disable web platform to prevent bundling errors
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  platforms: ['ios'], // Explicitly exclude web
};

// Enable watchman for better file watching
config.watchFolders = [__dirname];

module.exports = withNativeWind(config, { input: './global.css' });
