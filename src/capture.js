const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

async function findChrome() {
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];

  console.log('Searching for Chrome...');
  
  for (const browserPath of possiblePaths) {
    try {
      await fs.access(browserPath);
      console.log(`Found browser at: ${browserPath}`);
      return browserPath;
    } catch (error) {
      console.log(`Browser not found at: ${browserPath}`);
    }
  }

  throw new Error('No Chrome installation found');
}

async function captureCanvas(url) {
  console.log('Launching browser...');
  
  // Debug system info
  try {
    console.log('System info:', execSync('uname -a').toString());
    console.log('Directory contents:', execSync('ls -la /usr/bin/').toString());
  } catch (error) {
    console.error('Error getting system info:', error.message);
  }

  // Find Chrome
  const executablePath = await findChrome();
  console.log('Using Chrome path:', executablePath);
  
  try {
    const stats = await fs.stat(executablePath);
    console.log('Chrome executable exists:', stats.isFile());
    console.log('File permissions:', stats.mode.toString(8));
    
    // Try to run Chrome
    const version = execSync(`${executablePath} --version`).toString();
    console.log('Chrome version:', version);
  } catch (error) {
    console.error('Error checking Chrome:', error.message);
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--headless'
    ]
  });

  try {
    console.log('Creating new page...');
    const page = await browser.newPage();
    
    // Set a larger viewport for better capture
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2
    });

    console.log('Navigating to URL:', url);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    // Wait for the main content to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Ensure static directory exists
    const staticDir = path.join(__dirname, '..', 'static');
    await fs.mkdir(staticDir, { recursive: true });
    
    // Take screenshot
    console.log('Taking screenshot...');
    const screenshotPath = path.join(staticDir, `canvas-${Date.now()}.jpg`);
    await page.screenshot({
      path: screenshotPath,
      type: 'jpeg',
      quality: 80,
      fullPage: true
    });

    // Convert to PDF
    console.log('Converting to PDF...');
    const pdfPath = path.join(staticDir, `canvas-${Date.now()}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return {
      screenshotPath,
      pdfPath
    };
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
}

module.exports = { captureCanvas }; 