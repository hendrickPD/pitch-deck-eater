const { App } = require('@slack/bolt');
const { captureCanvas } = require('./capture');
const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');

// Initialize browser outside of message handler
let browser;
let isBrowserInitialized = false;

async function initializeBrowser() {
  if (!isBrowserInitialized) {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.NODE_ENV === 'production' 
        ? '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome'
        : undefined,
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
        '--mute-audio',
        '--disable-site-isolation-trials',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure'
      ]
    });
    isBrowserInitialized = true;
  }
  return browser;
}

// Track processed messages to avoid duplicates
const processedMessages = new Set();

// Clean up old message keys periodically
setInterval(() => {
  if (processedMessages.size > 1000) {
    const keysToDelete = Array.from(processedMessages).slice(0, processedMessages.size - 1000);
    keysToDelete.forEach(key => processedMessages.delete(key));
  }
}, 60000); // Clean up every minute

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.message(async ({ message, client }) => {
  try {
    // Skip if we've already processed this message
    const messageKey = `${message.channel}_${message.client_msg_id || message.ts}`;
    if (processedMessages.has(messageKey)) {
      console.log('Skipping duplicate message:', messageKey);
      return;
    }
    processedMessages.add(messageKey);

    // Check if message has text
    if (!message.text) {
      console.log('No text in message');
      return;
    }

    // Extract URL from message
    const urlMatch = message.text.match(/<https:\/\/pitch\.com\/v\/[^>]+>/);
    if (!urlMatch) {
      console.log('No Pitch.com URL found in message');
      return;
    }

    const url = urlMatch[0].slice(1, -1); // Remove < and >
    console.log('Processing URL:', url);

    // Initialize browser if not already done
    await initializeBrowser();

    // Send initial response
    await client.chat.postMessage({
      channel: message.channel,
      text: "I'll capture that canvas for you! Processing... 🎨"
    });
    
    // Capture the canvas
    const { pdfPath } = await captureCanvas(url, browser);
    console.log('Capture completed:', { pdfPath });
    
    // Upload files to Slack
    try {
      // Upload PDF
      const pdfResult = await client.files.uploadV2({
        channel_id: message.channel,
        file: await fs.readFile(pdfPath),
        filename: 'canvas.pdf',
        title: 'Canvas PDF'
      });
      console.log('PDF uploaded:', pdfResult);

      // Send success message
      await client.chat.postMessage({
        channel: message.channel,
        text: "Here's your PDF! 📄"
      });

      // Clean up files
      await fs.unlink(pdfPath);
    } catch (uploadError) {
      console.error('Error uploading files:', uploadError);
      await client.chat.postMessage({
        channel: message.channel,
        text: "Sorry, I couldn't upload the PDF. Please try again later."
      });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    try {
      await client.chat.postMessage({
        channel: message.channel,
        text: "Sorry, I encountered an error while processing your request. Please try again later."
      });
    } catch (postError) {
      console.error('Error sending error message:', postError);
    }
  }
});

// Start the app
(async () => {
  await app.start(process.env.PORT || 10000);
  console.log('⚡️ Pitch Deck Eater is running!');
})(); 