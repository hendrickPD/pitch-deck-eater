const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create chrome directory if it doesn't exist
const CHROME_PATH = path.join(__dirname, 'chrome');
if (!fs.existsSync(CHROME_PATH)) {
  fs.mkdirSync(CHROME_PATH, { recursive: true });
}

console.log('Installing Chrome...');

// Download and install Chrome
try {
  // Download Chrome
  execSync('wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -P chrome/');
  
  // Install dependencies
  execSync('sudo apt-get update && sudo apt-get install -y ./chrome/google-chrome-stable_current_amd64.deb');
  
  // Verify installation
  const version = execSync('google-chrome --version').toString();
  console.log('Chrome installed successfully:', version);
  
  // Clean up
  execSync('rm ./chrome/google-chrome-stable_current_amd64.deb');
} catch (error) {
  console.error('Error installing Chrome:', error);
  process.exit(1);
} 