#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"

# Create cache directory
echo "Creating cache directory..."
mkdir -p .cache/puppeteer
chmod -R 777 .cache

# Install dependencies
echo "Installing Node dependencies..."
npm install

# Install Chrome
echo "Installing Chrome..."
npx puppeteer browsers install chrome

# Verify Chrome installation
echo "Verifying Chrome installation..."
ls -la .cache/puppeteer || echo "Cache directory not found"
find .cache/puppeteer -name "chrome*" || echo "No Chrome found in cache"

echo "Build script completed." 