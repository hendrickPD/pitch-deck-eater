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
    const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/project/src/.cache/puppeteer';
    console.log('Cache directory created/exists:', cacheDir);

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
        // If Chrome is not found, try to install it
        console.log('Attempting to install Chrome...');
        const { execSync } = require('child_process');
        try {
          execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
          console.log('Chrome installation completed');
        } catch (installError) {
          console.error('Failed to install Chrome:', installError.message);
        }
      }
    } catch (error) {
      console.error('Error with cache directory:', error.message);
    }

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--headless'
      ]
    });

    const page = await browser.newPage();
    
    // Set a larger viewport for better capture
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    // Set desktop user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36');

    console.log('Creating new page...');
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
    
    // Generate timestamp for filenames
    const timestamp = Date.now();
    
    // Take JPEG screenshot
    console.log('Taking JPEG screenshot...');
    const jpegPath = path.join(staticDir, `canvas-${timestamp}.jpg`);
    await page.screenshot({
      path: jpegPath,
      type: 'jpeg',
      quality: 100,
      fullPage: true
    });

    // Convert to PDF with high quality
    console.log('Converting to PDF...');
    const pdfPath = path.join(staticDir, `canvas-${timestamp}.pdf`);
    await page.pdf({
      path: pdfPath,
      width: '1920px',
      height: '1080px',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      },
      preferCSSPageSize: true,
      scale: 0.8
    });

    return { jpegPath, pdfPath };
  } catch (error) {
    console.error('Error in captureCanvas:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

module.exports = { captureCanvas }; 