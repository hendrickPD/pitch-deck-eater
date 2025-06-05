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

    // Check if the message contains a Pitch, Miro, or DocSend link
    const pitchRegex = /https:\/\/pitch\.com\/[^\s<>]+/;
    const miroRegex = /https:\/\/(?:miro\.com|miro\.app)\/[^\s<>]+/;
    const docsendRegex = /https:\/\/docsend\.com\/[^\s<>]+/;
    
    const pitchMatch = messageText.match(pitchRegex);
    const miroMatch = messageText.match(miroRegex);
    const docsendMatch = messageText.match(docsendRegex);
    
    if (pitchMatch || miroMatch || docsendMatch) {
      // Clean the URL by removing any trailing characters
      let url, serviceType;
      if (pitchMatch) {
        url = pitchMatch[0].replace(/[<>]+$/, '');
        serviceType = 'Pitch.com';
      } else if (miroMatch) {
        url = miroMatch[0].replace(/[<>]+$/, '');
        serviceType = 'Miro';
      } else {
        url = docsendMatch[0].replace(/[<>]+$/, '');
        serviceType = 'DocSend';
      }
      
      console.log('Processing regular event');
      console.log(`Found ${serviceType} link: ${url}`);
      console.log('Processing URL:', url);
      
      // Send initial response
      await client.chat.postMessage({
        channel: event.channel,
        text: `I'll capture that ${serviceType.toLowerCase()} for you! Processing... 🎨`
      });
      
      // Capture the canvas
      const { pdfPath } = await captureCanvas(url);
      console.log('Capture completed:', { pdfPath });
      
      // Upload PDF to Slack
      try {
        const filename = serviceType === 'DocSend' ? 
          `docsend-document-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf` :
          `${serviceType.toLowerCase()}-capture-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;

        const pdfResult = await client.files.uploadV2({
          channel_id: event.channel,
          file: await fs.readFile(pdfPath),
          filename: filename,
          title: filename
        });
        console.log('PDF uploaded:', pdfResult);

        // Send success message
        await client.chat.postMessage({
          channel: event.channel,
          text: "Here's your PDF! 📄"
        });

        // Clean up files
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
      let errorMessage = "Sorry, I encountered an error while processing your request. Please try again later.";
      
      // Provide more specific error messages based on the error type
      if (error.message.includes('expired') || error.message.includes('not found') || error.message.includes('invalid')) {
        errorMessage = "❌ This link appears to be expired or invalid. Please check the link and try again with a valid presentation URL.";
      } else if (error.message.includes('No slides were captured')) {
        errorMessage = "❌ I couldn't capture any slides from this presentation. The link may be expired, private, or require special access.";
      } else if (error.message.includes('HTTP 4')) {
        errorMessage = "❌ I couldn't access this presentation (HTTP error). The link may be expired or require authentication.";
      } else if (error.message.includes('Navigation failed')) {
        errorMessage = "❌ I couldn't load this presentation. Please check that the link is valid and accessible.";
      }
      
      await client.chat.postMessage({
        channel: event.channel,
        text: errorMessage
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
    console.log(`⚡️ Pitch Deck Eater is running on port ${port}! Now supports Pitch.com, Miro, and DocSend URLs.`);
    
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