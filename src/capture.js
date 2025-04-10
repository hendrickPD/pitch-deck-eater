const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

async function findBrowser() {
  const possiblePaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/lib/chromium/chromium',
    '/usr/lib/chromium-browser/chromium-browser'
  ];

  console.log('Searching for Chromium...');
  
  for (const browserPath of possiblePaths) {
    try {
      await fs.access(browserPath);
      console.log(`Found browser at: ${browserPath}`);
      return browserPath;
    } catch (error) {
      console.log(`Browser not found at: ${browserPath}`);
    }
  }

  throw new Error('No Chromium installation found');
}

async function captureCanvas(url) {
  console.log('Launching browser...');
  
  // Debug system info
  try {
    console.log('System info:', execSync('uname -a').toString());
    console.log('Directory contents:', execSync('ls -la /usr/bin/chromium*').toString());
  } catch (error) {
    console.error('Error getting system info:', error.message);
  }

  // Find browser
  const executablePath = await findBrowser();
  console.log('Using browser path:', executablePath);
  
  try {
    const stats = await fs.stat(executablePath);
    console.log('Browser executable exists:', stats.isFile());
    console.log('File permissions:', stats.mode.toString(8));
    
    // Try to run browser
    const version = execSync(`${executablePath} --version`).toString();
    console.log('Browser version:', version);
  } catch (error) {
    console.error('Error checking browser:', error.message);
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