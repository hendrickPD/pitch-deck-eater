#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Verify installation
echo "Verifying Chrome installation..."
ls -l /usr/bin/google-chrome || echo "Chrome not found in /usr/bin"
/usr/bin/google-chrome --version || echo "Cannot get Chrome version"

# Install dependencies
npm install

echo "Build script completed." 