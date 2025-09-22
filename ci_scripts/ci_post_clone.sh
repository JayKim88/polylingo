#!/bin/sh

# Xcode Cloud Post-Clone Script
# This script runs after Xcode Cloud clones the repository
# It installs CocoaPods dependencies before building

set -e  # Exit on any error

echo "🚀 Starting Xcode Cloud post-clone setup..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Install Node.js dependencies (if needed for any build scripts)
echo "📦 Installing Node.js dependencies..."
npm ci

# Navigate to iOS directory and install CocoaPods
echo "🍎 Installing iOS CocoaPods dependencies..."
cd ios

# Verify Podfile exists
if [ ! -f "Podfile" ]; then
    echo "❌ Error: Podfile not found in ios directory"
    exit 1
fi

# Install pods
echo "📱 Running pod install..."
pod install

echo "✅ Post-clone setup completed successfully!"
echo "📁 iOS workspace ready at: ios/PolyLingo.xcworkspace"