#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"

# Install dependencies
echo "Installing Node dependencies..."
npm install

# Verify Chromium installation
echo "Verifying Chromium installation..."
ls -l node_modules/puppeteer/.local-chromium/*/chrome-linux/chrome || echo "Chromium not found in puppeteer directory"

echo "Build script completed." 