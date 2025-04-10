#!/usr/bin/env bash
# exit on error
set -o errexit

# Install prerequisites
echo "Installing prerequisites..."
sudo apt-get update
sudo apt-get install -y wget gnupg2 apt-transport-https ca-certificates

# Add Google Chrome package repository
echo "Adding Chrome repository..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'

# Install Chrome
echo "Installing Chrome..."
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Verify Chrome installation
echo "Verifying Chrome installation..."
which google-chrome || echo "Chrome not in PATH"
ls -l /usr/bin/google-chrome* || echo "No Chrome binaries found"
google-chrome --version || echo "Cannot get Chrome version"

# Install dependencies
echo "Installing Node dependencies..."
npm install

echo "Build script completed." 