const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

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
    const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), '.cache', 'puppeteer');
    console.log('Cache directory created/exists:', cacheDir);
    
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      const contents = await fs.readdir(cacheDir);
      console.log('Cache directory contents:', contents);
    } catch (err) {
      console.log('Cache directory is empty or not accessible');
    }

    // Check for Chrome binary
    const chromePath = path.join(cacheDir, 'chrome', 'linux-127.0.6533.88', 'chrome-linux64', 'chrome');
    console.log('Checking Chrome binary at:', chromePath);
    
    try {
      await fs.access(chromePath);
      console.log('Chrome binary found at:', chromePath);
    } catch (error) {
      console.log('Chrome binary not found, attempting to install...');
      try {
        // Set the cache directory for the installation
        process.env.PUPPETEER_CACHE_DIR = cacheDir;
        execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
        console.log('Chrome installation completed');
      } catch (installError) {
        console.error('Failed to install Chrome:', installError.message);
        throw new Error('Chrome installation failed: ' + installError.message);
      }
    }

    // Launch browser with specific arguments
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=3840,2160',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      executablePath: chromePath
    });

    const page = await browser.newPage();
    
    // Set desktop viewport with increased width
    await page.setViewport({
      width: 3840,  // Ultra-wide viewport
      height: 2160, // 4K height
      deviceScaleFactor: 2
    });

    // Set desktop user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36');

    // Disable animations and transitions
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = `
        * {
          transition: none !important;
          animation: none !important;
        }
        /* Hide common overlays */
        .intercom-launcher, .intercom-messenger, .popup-overlay {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    });

    // Enable request interception to log network activity
    await page.setRequestInterception(true);
    page.on('request', request => {
      console.log('Request:', request.method(), request.url());
      request.continue();
    });

    page.on('response', response => {
      console.log('Response:', response.status(), response.url());
    });

    console.log('Creating new page...');
    console.log('Navigating to URL:', url);
    
    // Navigate to the page and wait for it to load
    await page.goto(url, { 
      waitUntil: 'networkidle0'
    });
    console.log('Page loaded');
    
    // Wait for the main content to be visible
    await page.waitForSelector('.slide', { timeout: 10000 });
    console.log('Presentation content detected');
    
    // Ensure static directory exists
    const staticDir = path.join(process.cwd(), 'static');
    await fs.mkdir(staticDir, { recursive: true });
    
    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const timestamp = Date.now();
    const screenshotPath = path.join(staticDir, `${filename}-${timestamp}.jpg`);
    const pdfPath = path.join(staticDir, `${filename}-${timestamp}.pdf`);
    
    // Take screenshot
    console.log('Taking screenshot...');
    await page.screenshot({
      path: screenshotPath,
      type: 'jpeg',
      quality: 90,
      fullPage: true
    });
    console.log('Screenshot captured successfully');
    
    // Convert to PDF with improved settings
    console.log('Converting to PDF...');
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      landscape: true,
      width: '3840px',
      height: '2160px',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      scale: 1,
      preferCSSPageSize: true
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