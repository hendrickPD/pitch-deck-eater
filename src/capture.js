const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function captureCanvas(url) {
  console.log('Launching browser...');
  
  // Set cache directory
  process.env.PUPPETEER_CACHE_DIR = path.join(process.cwd(), '.cache', 'puppeteer');
  
  // Ensure cache directory exists
  await fs.mkdir(process.env.PUPPETEER_CACHE_DIR, { recursive: true });
  console.log('Using cache directory:', process.env.PUPPETEER_CACHE_DIR);
  
  try {
    // Try to find Chrome installation
    const browserFetcher = puppeteer.createBrowserFetcher();
    const revisionInfo = await browserFetcher.download();
    console.log('Chrome downloaded to:', revisionInfo.folderPath);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--headless'
      ],
      // Use the downloaded Chrome
      executablePath: revisionInfo.executablePath
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
    if (error.message.includes('Could not find Chrome')) {
      console.log('Chrome installation details:');
      console.log('- Cache directory:', process.env.PUPPETEER_CACHE_DIR);
      console.log('- Current directory:', process.cwd());
      console.log('- User:', process.env.USER);
      console.log('- Platform:', process.platform);
      console.log('- Architecture:', process.arch);
    }
    throw error;
  }
}

module.exports = { captureCanvas }; 