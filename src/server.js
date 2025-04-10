const { App, ExpressReceiver } = require('@slack/bolt');
const { captureCanvas } = require('./capture');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;

// Validate required environment variables
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Initialize the receiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// Initialize Express
const expressApp = receiver.app;
expressApp.use(express.json());

// Serve static files
expressApp.use('/static', express.static(path.join(__dirname, '..', 'static')));

// Initialize Slack app with the receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver
});

// Handle Slack events
app.event('message', async ({ event, client }) => {
  try {
    // Log the full event for debugging
    console.log('Received message event:', JSON.stringify(event, null, 2));

    // Get the message text, handling different message types
    const messageText = event.text || event.message?.text || '';
    console.log('Message text:', messageText);

    // Check if the message contains a Pitch or Miro link
    const pitchRegex = /https:\/\/pitch\.com\/[^\s]+/;
    const miroRegex = /https:\/\/(?:miro\.com|miro\.app)\/[^\s]+/;
    
    const pitchMatch = messageText.match(pitchRegex);
    const miroMatch = messageText.match(miroRegex);
    
    if (pitchMatch || miroMatch) {
      const url = pitchMatch ? pitchMatch[0] : miroMatch[0];
      console.log('Processing URL:', url);
      
      // Send initial response
      await client.chat.postMessage({
        channel: event.channel,
        text: "I'll capture that canvas for you! Processing... 🎨"
      });
      
      // Capture the canvas
      const { screenshotPath, pdfPath } = await captureCanvas(url);
      console.log('Capture completed:', { screenshotPath, pdfPath });
      
      // Upload files to Slack
      try {
        // Upload screenshot
        const screenshotResult = await client.files.uploadV2({
          channels: event.channel,
          file: await fs.readFile(screenshotPath),
          filename: 'canvas-screenshot.jpg',
          title: 'Canvas Screenshot'
        });
        console.log('Screenshot uploaded:', screenshotResult);

        // Upload PDF
        const pdfResult = await client.files.uploadV2({
          channels: event.channel,
          file: await fs.readFile(pdfPath),
          filename: 'canvas.pdf',
          title: 'Canvas PDF'
        });
        console.log('PDF uploaded:', pdfResult);

        // Clean up files
        await fs.unlink(screenshotPath);
        await fs.unlink(pdfPath);
      } catch (uploadError) {
        console.error('Error uploading files:', uploadError);
        throw uploadError;
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
    // Optionally send an error message to the channel
    try {
      await client.chat.postMessage({
        channel: event.channel,
        text: `Sorry, I encountered an error while processing your request: ${error.message}`
      });
    } catch (postError) {
      console.error('Error posting error message:', postError);
    }
  }
});

// Start the app
(async () => {
  try {
    const port = process.env.PORT || 3000;
    await app.start(port);
    console.log(`⚡️ Pitch Deck Eater is running on port ${port}!`);
    
    // Verify bot token
    const authTest = await app.client.auth.test();
    console.log('Bot User ID:', authTest.bot_id);
    console.log('Bot User Name:', authTest.user);
    console.log('Team Name:', authTest.team);
  } catch (error) {
    console.error('Failed to start the app:', error);
    process.exit(1);
  }
})(); 