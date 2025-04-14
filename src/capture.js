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

async function captureCanvas(url, browser) {
  try {
    // Log environment details
    console.log('Environment details:');
    console.log('- PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR);
    console.log('- Current directory:', process.cwd());
    console.log('- User:', process.env.USER);
    console.log('- Platform:', process.platform);
    console.log('- Architecture:', process.arch);

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
      'Sec-Fetch-User': '?1',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0'
    });

    // Override navigator.webdriver and other automation detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel',
      });
    });

    console.log('Creating new page...');
    console.log('Navigating to URL:', url);

    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      console.log('Initial navigation successful');
    } catch (error) {
      console.error('Navigation failed:', error);
      throw error;
    }

    // Wait for the main content to load
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('Body loaded');
    
    // Wait 5 seconds for content to settle
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Initial wait complete');

    // Ensure we're in landscape mode
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isLandscape: true
    });
    console.log('Viewport set to landscape');

    // Array to store all JPEG buffers
    const jpegBuffers = [];
    let pageNumber = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`Processing page ${pageNumber}...`);
      
      // Wait 1 second before taking screenshot
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take JPEG screenshot
      console.log(`Taking JPEG screenshot of page ${pageNumber}...`);
      const jpegBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 100,
        fullPage: true
      });
      jpegBuffers.push(jpegBuffer);
      console.log(`Screenshot taken for page ${pageNumber}`);
      
      // Wait 1 second after taking screenshot
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to navigate to next page
      try {
        // Click center of screen to ensure focus
        const viewport = await page.viewport();
        await page.mouse.click(viewport.width / 2, viewport.height / 2);
        console.log('Clicked center of screen');
        
        // Press right arrow key
        await page.keyboard.press('ArrowRight');
        console.log('Pressed right arrow key');
        
        // Wait for potential animation/transition
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Waited 2 seconds after navigation');
        
        // Additional wait for content to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Waited 1 second for content to settle');
        
        // Check if we're still on the same page by comparing screenshots
        const newJpegBuffer = await page.screenshot({
          type: 'jpeg',
          quality: 100,
          fullPage: true
        });
        
        if (Buffer.compare(jpegBuffer, newJpegBuffer) === 0) {
          console.log('No more pages detected');
          hasNextPage = false;
        } else {
          console.log('New page detected, continuing...');
          pageNumber++;
        }
      } catch (error) {
        console.error('Error navigating to next page:', error);
        hasNextPage = false;
      }
    }

    console.log(`Captured ${pageNumber} pages`);

    // Create a single PDF with all pages
    const pdfDoc = await PDFDocument.create();
    
    // Set PDF metadata
    pdfDoc.setProducer('Pitch Deck Eater');
    pdfDoc.setCreator('Pitch Deck Eater');
    
    // Add each JPEG as a page
    for (const jpegBuffer of jpegBuffers) {
      const jpegImage = await pdfDoc.embedJpg(jpegBuffer);
      const page = pdfDoc.addPage([jpegImage.width, jpegImage.height]);
      page.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: jpegImage.width,
        height: jpegImage.height,
      });
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false
    });
    const pdfBuffer = Buffer.from(pdfBytes);
    
    // Save the PDF file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pdfPath = path.join(staticDir, `pitch-deck-${timestamp}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);
    
    console.log('PDF created successfully with', pageNumber, 'pages');
    
    return { pdfPath };
  } catch (error) {
    console.error('Error in captureCanvas:', error);
    throw error;
  }
}

module.exports = { captureCanvas }; 