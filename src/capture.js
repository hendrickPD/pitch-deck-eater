const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function captureCanvas(url) {
  console.log('Launching browser...');
  
  // Log environment info
  console.log('Environment details:');
  console.log('- PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR);
  console.log('- Current directory:', process.cwd());
  console.log('- User:', process.env.USER);
  console.log('- Platform:', process.platform);
  console.log('- Architecture:', process.arch);

  try {
    // Check cache directory
    const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      console.log('Cache directory created/exists:', cacheDir);
      const contents = await fs.readdir(cacheDir);
      console.log('Cache directory contents:', contents);
      
      // Check for Chrome binary
      const chromePath = path.join(cacheDir, 'chrome', 'linux-127.0.6533.88', 'chrome-linux64', 'chrome');
      try {
        const stats = await fs.stat(chromePath);
        console.log('Chrome binary found at:', chromePath);
        console.log('Chrome binary size:', stats.size);
      } catch (error) {
        console.error('Chrome binary not found at:', chromePath);
      }
    } catch (error) {
      console.error('Error with cache directory:', error.message);
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
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
  } catch (error) {
    console.error('Error during capture:', error);
    console.log('Chrome error details:');
    console.log('- Error message:', error.message);
    console.log('- Stack trace:', error.stack);
    throw error;
  }
}

module.exports = { captureCanvas }; 