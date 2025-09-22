#!/bin/sh

# Xcode Cloud Post-Clone Script
# This script runs after Xcode Cloud clones the repository
# It installs CocoaPods dependencies before building

set -e  # Exit on any error

echo "🚀 Xcode Cloud: Starting post-clone setup..."
echo "📍 Current directory: $(pwd)"
echo "📂 Directory contents:"
ls -la

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    echo "📂 Looking for package.json in current directory..."
    find . -name "package.json" -type f 2>/dev/null || echo "No package.json found"
    exit 1
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm ci

# Navigate to iOS directory and install CocoaPods
echo "🍎 Navigating to iOS directory..."
cd ios

echo "📂 iOS directory contents:"
ls -la

# Verify Podfile exists
if [ ! -f "Podfile" ]; then
    echo "❌ Error: Podfile not found in ios directory"
    exit 1
fi

# Check if CocoaPods is available
if ! command -v pod &> /dev/null; then
    echo "📱 Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Install pods
echo "📱 Running pod install..."
pod install --verbose

echo "✅ Post-clone setup completed successfully!"
echo "📁 iOS workspace ready at: ios/PolyLingo.xcworkspace"

# Verify the workspace was created
if [ -f "PolyLingo.xcworkspace" ]; then
    echo "✅ Workspace verified: PolyLingo.xcworkspace exists"
else
    echo "❌ Warning: Workspace not found after pod install"
    ls -la *.xc*
fi