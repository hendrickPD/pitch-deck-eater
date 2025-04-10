#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Chromium
echo "Installing Chromium..."
sudo apt-get update
sudo apt-get install -y chromium chromium-common

# Verify Chromium installation
echo "Verifying Chromium installation..."
which chromium || echo "Chromium not in PATH"
ls -l /usr/bin/chromium* || echo "No Chromium binaries found"
chromium --version || echo "Cannot get Chromium version"

# Install dependencies
echo "Installing Node dependencies..."
npm install

echo "Build script completed." 