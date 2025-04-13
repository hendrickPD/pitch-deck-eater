const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

async function createPDFFromScreenshot(jpegBuffer) {
  console.log('Creating PDF from screenshot...');
  const pdfDoc = await PDFDocument.create();
  
  // Set PDF compression options
  pdfDoc.setProducer('Pitch Deck Eater');
  pdfDoc.setCreator('Pitch Deck Eater');
  
  try {
    // Load the JPEG image
    const jpegImage = await pdfDoc.embedJpg(jpegBuffer);
    console.log(`Successfully loaded JPEG image, dimensions: ${jpegImage.width}x${jpegImage.height}`);
    
    // Add a new page with the same dimensions as the image
    const page = pdfDoc.addPage([jpegImage.width, jpegImage.height]);
    
    // Draw the image on the page
    page.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: jpegImage.width,
      height: jpegImage.height,
    });
    
    console.log('Successfully added page as JPEG');
  } catch (error) {
    console.error('Error processing screenshot:', error);
    throw new Error(`Failed to process screenshot: ${error.message}`);
  }
  
  console.log('Saving PDF...');
  try {
    // Save with compression options
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false
    });
    const pdfBuffer = Buffer.from(pdfBytes);  // Convert Uint8Array to Buffer
    
    console.log('PDF created successfully, size:', pdfBuffer.length, 'bytes');
    
    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is invalid or empty');
    }
    
    // Additional validation - check if it's a valid PDF
    if (pdfBuffer.length < 100 || !pdfBuffer.toString('utf8', 0, 5).includes('%PDF-')) {
      throw new Error('Generated PDF buffer does not contain valid PDF data');
    }
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw new Error(`Failed to save PDF: ${error.message}`);
  }
}

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
      const chromePath = path.join('/opt/render/.cache/puppeteer', 'chrome', 'linux-127.0.6533.88', 'chrome-linux64', 'chrome');
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
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--metrics-recording-only',
        '--mute-audio'
      ]
    });

    const page = await browser.newPage();
    
    // Set a larger viewport for better capture
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    // Set desktop user agent and additional headers
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });

    // Override navigator.webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    console.log('Creating new page...');
    console.log('Navigating to URL:', url);

    let navigationSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!navigationSuccess && retryCount < maxRetries) {
      try {
        await page.goto(url, { 
          waitUntil: ['domcontentloaded', 'networkidle0'],
          timeout: 90000 
        });
        navigationSuccess = true;
      } catch (error) {
        console.error(`Navigation attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log(`Retrying navigation (attempt ${retryCount + 1})...`);
        } else {
          throw error;
        }
      }
    }

    // Wait for the main content to load
    await page.waitForSelector('body', { timeout: 30000 });
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Ensure we're in landscape mode
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isLandscape: true
    });

    // Add 1 second delay before taking screenshot
    await new Promise(resolve => setTimeout(resolve, 1000));

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

    // Read the JPEG file and convert to PDF
    const jpegBuffer = await fs.readFile(jpegPath);
    const pdfBuffer = await createPDFFromScreenshot(jpegBuffer);
    const pdfPath = path.join(staticDir, `canvas-${timestamp}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);

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