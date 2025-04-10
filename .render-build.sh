#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"

# Install prerequisites
echo "Installing prerequisites..."
sudo apt-get update
sudo apt-get install -y wget gnupg2

# Install Chrome
echo "Installing Chrome..."
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Verify Chrome installation
echo "Verifying Chrome installation..."
which google-chrome
ls -l $(which google-chrome) || echo "Chrome binary not found"
google-chrome --version || echo "Cannot get Chrome version"

# Create symlink if needed
if [ ! -f "/usr/bin/google-chrome" ]; then
    echo "Creating symlink to Chrome..."
    CHROME_PATH=$(which google-chrome-stable || which google-chrome)
    if [ -n "$CHROME_PATH" ]; then
        sudo ln -s "$CHROME_PATH" /usr/bin/google-chrome
    fi
fi

# Final verification
echo "Final Chrome verification..."
ls -l /usr/bin/google-chrome || echo "Chrome not found in /usr/bin"
/usr/bin/google-chrome --version || echo "Cannot get Chrome version"

# Install dependencies
echo "Installing Node dependencies..."
npm install

echo "Build script completed." 