const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function captureCanvas(url) {
  let browser;
  try {
    // Log environment details
    console.log('Environment details:');
    console.log('- PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR);
    console.log('- Current directory:', process.cwd());
    console.log('- User:', process.env.USER);
    console.log('- Platform:', process.platform);
    console.log('- Architecture:', process.arch);

    // Set up cache directory
    const cacheDir = path.join(process.cwd(), '.cache', 'puppeteer');
    console.log('Cache directory created/exists:', cacheDir);
    
    try {
      const contents = await fs.readdir(cacheDir);
      console.log('Cache directory contents:', contents);
    } catch (err) {
      console.log('Cache directory is empty or not accessible');
    }

    // Check for Chrome binary
    const chromePath = path.join(cacheDir, 'chrome', 'linux-127.0.6533.88', 'chrome-linux64', 'chrome');
    console.log('Chrome binary not found at:', chromePath);
    console.log('Attempting to install Chrome...');

    // Launch browser with specific arguments
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();
    
    // Set desktop viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2
    });

    // Set desktop user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36');

    console.log('Creating new page...');
    console.log('Navigating to URL:', url);
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for the main content to load
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Ensure static directory exists
    const staticDir = path.join(process.cwd(), 'static');
    await fs.mkdir(staticDir, { recursive: true });
    
    const timestamp = Date.now();
    const screenshotPath = path.join(staticDir, `canvas-${timestamp}.jpg`);
    const pdfPath = path.join(staticDir, `canvas-${timestamp}.pdf`);
    
    // Take screenshot
    console.log('Taking screenshot...');
    await page.screenshot({
      path: screenshotPath,
      type: 'jpeg',
      quality: 90,
      fullPage: true
    });
    
    // Convert to PDF
    console.log('Converting to PDF...');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      scale: 0.8
    });
    
    console.log('Closing browser...');
    await browser.close();
    
    return { screenshotPath, pdfPath };
  } catch (error) {
    console.error('Error in captureCanvas:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

module.exports = { captureCanvas }; 