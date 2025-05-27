const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

// Define static directory for file storage
const staticDir = path.join(process.cwd(), 'static');

// Create static directory if it doesn't exist
fs.mkdir(staticDir, { recursive: true }).catch(console.error);

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

    // Check for email entry form and handle it if present
    try {
      console.log('Checking for email entry form...');
      
      // Wait a bit more for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get all input elements for debugging
      const allInputs = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map(input => ({
          type: input.type,
          placeholder: input.placeholder || '',
          name: input.name || '',
          id: input.id || '',
          className: input.className || '',
          value: input.value || '',
          visible: input.offsetParent !== null
        }));
      });
      console.log('All inputs found:', JSON.stringify(allInputs, null, 2));
      
      // Look for email input with more comprehensive selectors
      let emailInput = null;
      
      // Try different email input selectors
      const emailSelectors = [
        'input[type="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]',
        'input[name*="email" i]',
        'input[id*="email" i]',
        'input[class*="email" i]',
        'input[placeholder*="address" i]',
        'input[placeholder*="Enter your email" i]',
        'input[placeholder*="work email" i]',
        'input[data-testid*="email" i]',
        'input[aria-label*="email" i]',
        // Generic text inputs that might be email fields
        'input[type="text"]'
      ];
      
      for (const selector of emailSelectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const isVisible = await element.evaluate(el => el.offsetParent !== null);
            if (isVisible) {
              console.log(`Found potential email input with selector: ${selector}`);
              emailInput = element;
              break;
            }
          }
          if (emailInput) break;
        } catch (e) {
          console.log(`Selector ${selector} failed:`, e.message);
        }
      }

      if (emailInput) {
        console.log('Email input found, attempting to fill...');
        
        // Scroll to the input to ensure it's visible
        await emailInput.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clear any existing text and enter the email
        await emailInput.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Select all existing text
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Type the email
        await emailInput.type('dorie@palmdrive.vc', { delay: 100 });
        console.log('Email entered: abbey@palmdrive.vc');
        
        // Verify the email was entered
        const enteredValue = await emailInput.evaluate(el => el.value);
        console.log('Verified email value:', enteredValue);
        
        // Wait a moment for any validation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for and click the continue/submit button
        let continueButton = null;
        
        // Get all buttons for debugging
        const allButtons = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));
          return buttons.map(button => ({
            textContent: button.textContent?.trim() || '',
            type: button.type || '',
            className: button.className || '',
            visible: button.offsetParent !== null,
            tagName: button.tagName
          }));
        });
        console.log('All buttons found:', JSON.stringify(allButtons, null, 2));
        
        try {
          // Try to find button by text content using XPath (case-insensitive)
          const agreeButtons = await page.$x('//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "agree and continue")]');
          if (agreeButtons.length > 0) {
            continueButton = agreeButtons[0];
            console.log('Found "agree and continue" button via XPath');
          }
        } catch (e) {
          console.log('XPath search for "agree and continue" failed:', e.message);
        }
        
        if (!continueButton) {
          try {
            // Try other button text variations
            const continueButtons = await page.$x('//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "continue")]');
            if (continueButtons.length > 0) {
              continueButton = continueButtons[0];
              console.log('Found "continue" button via XPath');
            }
          } catch (e) {
            console.log('XPath search for "continue" failed:', e.message);
          }
        }
        
        if (!continueButton) {
          try {
            // Try submit button
            continueButton = await page.$('button[type="submit"]');
            if (continueButton) {
              console.log('Found submit button');
            }
          } catch (e) {
            console.log('Submit button search failed:', e.message);
          }
        }
        
        if (!continueButton) {
          try {
            // Try input submit
            continueButton = await page.$('input[type="submit"]');
            if (continueButton) {
              console.log('Found input submit');
            }
          } catch (e) {
            console.log('Input submit search failed:', e.message);
          }
        }
        
        // Try to find any button that might be the submit button
        if (!continueButton) {
          try {
            const buttons = await page.$$('button');
            for (const button of buttons) {
              const isVisible = await button.evaluate(el => el.offsetParent !== null);
              const text = await button.evaluate(el => el.textContent?.trim().toLowerCase() || '');
              if (isVisible && (text.includes('continue') || text.includes('submit') || text.includes('agree') || text.includes('enter'))) {
                continueButton = button;
                console.log(`Found button with text: "${text}"`);
                break;
              }
            }
          } catch (e) {
            console.log('Generic button search failed:', e.message);
          }
        }

        if (continueButton) {
          console.log('Continue button found, clicking...');
          await continueButton.click();
          console.log('Continue button clicked');
          
          // Wait for navigation/form submission to complete
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('Waited for form submission to complete');
        } else {
          console.log('Continue button not found, trying Enter key...');
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Additional wait for content to load after email submission
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('Email form handling completed');
        
        // After successful email submission, ensure we're on the first slide
        console.log('Navigating to first slide...');
        
        // Try multiple methods to get to the first slide
        try {
          // Method 1: Press Home key to go to first slide
          await page.keyboard.press('Home');
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('Pressed Home key');
        } catch (e) {
          console.log('Home key failed:', e.message);
        }
        
        try {
          // Method 2: Press Left arrow multiple times to ensure we're at the beginning
          for (let i = 0; i < 20; i++) {
            await page.keyboard.press('ArrowLeft');
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          console.log('Pressed Left arrow 20 times');
        } catch (e) {
          console.log('Left arrow navigation failed:', e.message);
        }
        
        try {
          // Method 3: Look for and click a "first slide" or "beginning" button
          const firstSlideButton = await page.$('[aria-label*="first" i], [title*="first" i], [aria-label*="beginning" i]');
          if (firstSlideButton) {
            await firstSlideButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Clicked first slide button');
          }
        } catch (e) {
          console.log('First slide button search failed:', e.message);
        }
        
        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Navigation to first slide completed');
      } else {
        console.log('No email input found, proceeding with normal capture');
      }
    } catch (emailError) {
      console.log('Email entry failed or timed out, proceeding with normal capture:', emailError.message);
      // Continue with normal workflow even if email entry fails
    }

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
      
      // Wait 2 seconds before taking screenshot (1 second was already there, adding 1 more)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
        
        // Compare the new screenshot with the previous one
        const isSamePage = Buffer.compare(jpegBuffer, newJpegBuffer) === 0;
        
        if (isSamePage) {
          console.log('No more pages detected');
          hasNextPage = false;
        } else {
          console.log('New page detected, continuing...');
          pageNumber++;
        }
      } catch (error) {
        console.error('Error navigating to next page:', error);
        // If we can't navigate, assume we're at the end
        hasNextPage = false;
      }
    }
    
    console.log(`Captured ${pageNumber} pages`);
    
    // Create PDF from all screenshots
    const pdfDoc = await PDFDocument.create();
    
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
    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(staticDir, `pitch-deck-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
    await fs.writeFile(pdfPath, pdfBytes);
    
    console.log('PDF created successfully with', pageNumber, 'pages');
    
    return { pdfPath };
  } catch (error) {
    console.error('Error in captureCanvas:', error);
    throw error;
  } finally {
    // Don't close the page here, let the caller handle it
  }
}

module.exports = { captureCanvas }; 