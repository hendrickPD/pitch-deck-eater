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

// Message deduplication cache
const processedMessages = new Set();

// Handle Slack events
app.event('message', async ({ event, client }) => {
  try {
    // Check if we've already processed this message
    const messageKey = `${event.channel}_${event.ts}`;
    if (processedMessages.has(messageKey)) {
      console.log('Skipping duplicate message:', messageKey);
      return;
    }
    processedMessages.add(messageKey);

    // Log the full event for debugging
    console.log('Received message event:', JSON.stringify(event, null, 2));

    // Get the message text, handling different message types
    const messageText = event.text || event.message?.text || '';
    console.log('Message text:', messageText);

    // Check if the message contains a Pitch or Miro link
    const pitchRegex = /https:\/\/pitch\.com\/[^\s<>]+/;
    const miroRegex = /https:\/\/(?:miro\.com|miro\.app)\/[^\s<>]+/;
    
    const pitchMatch = messageText.match(pitchRegex);
    const miroMatch = messageText.match(miroRegex);
    
    if (pitchMatch || miroMatch) {
      // Clean the URL by removing any trailing characters
      const url = (pitchMatch ? pitchMatch[0] : miroMatch[0]).replace(/[<>]+$/, '');
      console.log('Processing URL:', url);
      
      // Send initial response
      await client.chat.postMessage({
        channel: event.channel,
        text: "I'll capture that canvas for you! Processing... 🎨"
      });
      
      // Capture the canvas
      const { jpegPath } = await captureCanvas(url);
      console.log('Capture completed:', { jpegPath });
      
      // Upload file to Slack
      try {
        // Upload JPEG
        const jpegResult = await client.files.uploadV2({
          channel_id: event.channel,
          file: await fs.readFile(jpegPath),
          filename: 'canvas.jpg',
          title: 'Canvas JPEG'
        });
        console.log('JPEG uploaded:', jpegResult);

        // Clean up file
        await fs.unlink(jpegPath);
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
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