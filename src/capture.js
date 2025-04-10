const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs').promises;

async function captureCanvas(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ],
    executablePath: '/usr/bin/google-chrome'
  });

  try {
    const page = await browser.newPage();
    
    // Set a larger viewport for better capture
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2
    });

    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Ensure static directory exists
    const staticDir = path.join(__dirname, '..', 'static');
    await fs.mkdir(staticDir, { recursive: true });
    
    const pdfPath = path.join(staticDir, `canvas-${Date.now()}.pdf`);
    
    // Capture as PDF
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

    return pdfPath;
  } finally {
    await browser.close();
  }
}

module.exports = { captureCanvas }; 