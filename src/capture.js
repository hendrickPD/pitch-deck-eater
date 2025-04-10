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
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      executablePath: chromePath,
      timeout: 60000
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
    
    // Try multiple navigation strategies
    try {
      console.log('Attempting first navigation strategy...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      console.log('Initial navigation completed');
    } catch (error) {
      console.log('First navigation attempt failed:', error.message);
      throw error;
    }

    // Wait for either the main content or a reasonable amount of time
    try {
      console.log('Waiting for page content...');
      await Promise.race([
        page.waitForSelector('main', { timeout: 30000 }),
        page.waitForSelector('body', { timeout: 30000 }),
        page.waitForSelector('div[role="main"]', { timeout: 30000 }),
        page.waitForSelector('article', { timeout: 30000 }),
        new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds as fallback
      ]);
      console.log('Page content detected');
    } catch (error) {
      console.log('No specific selectors found, but page might still be loaded');
    }

    // Check if the page has any content
    const hasContent = await page.evaluate(() => {
      return document.body && document.body.innerHTML.length > 0;
    });
    
    if (!hasContent) {
      throw new Error('Page appears to be empty');
    }
    
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