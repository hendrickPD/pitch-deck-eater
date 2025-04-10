const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

async function captureCanvas(url) {
  const chromePath = '/usr/bin/google-chrome';
  console.log('Launching browser...');

  // Verify Chrome exists
  try {
    await fs.access(chromePath);
    console.log('Chrome exists at:', chromePath);
    
    // Try to get Chrome version
    const version = execSync(`${chromePath} --version`).toString();
    console.log('Chrome version:', version);
  } catch (error) {
    console.error('Error verifying Chrome:', error.message);
    throw new Error(`Chrome verification failed: ${error.message}`);
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
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
}

module.exports = { captureCanvas }; 