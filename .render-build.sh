#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"

# Set up cache directory
echo "Setting up cache directory..."
CACHE_DIR="/opt/render/.cache/puppeteer"
mkdir -p $CACHE_DIR
chmod -R 777 $CACHE_DIR
export PUPPETEER_CACHE_DIR=$CACHE_DIR

# Install dependencies
echo "Installing Node dependencies..."
npm install

# Verify Chrome installation
echo "Verifying Chrome installation..."
ls -la $PUPPETEER_CACHE_DIR || echo "Cache directory not found"
find $PUPPETEER_CACHE_DIR -name "chrome*" || echo "No Chrome found in cache"

# Print environment info
echo "Environment information:"
echo "PUPPETEER_CACHE_DIR=$PUPPETEER_CACHE_DIR"
echo "Directory contents:"
ls -la $PUPPETEER_CACHE_DIR

# Create a .env file with the cache directory
echo "PUPPETEER_CACHE_DIR=$CACHE_DIR" > .env

echo "Build script completed." 