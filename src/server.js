const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const { captureCanvas } = require('./capture');

// Initialize the receiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
});

// Create Express app
const app = receiver.app;

// Add middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Pitch Deck Eater is running! 🎨');
});

// Initialize Slack app with the Express receiver
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver
});

// Handle Slack events
slackApp.message(/https:\/\/(pitch|miro)\.com\/.*/, async ({ message, say }) => {
  try {
    await say(`I'll capture that canvas for you! Processing...`);
    const pdfPath = await captureCanvas(message.text);
    
    // Upload to Slack
    await slackApp.client.files.upload({
      channels: message.channel,
      initial_comment: "Here's your canvas capture! 🎨",
      file: pdfPath,
    });
  } catch (error) {
    console.error('Error capturing canvas:', error);
    await say('Sorry, I had trouble capturing that canvas. 😕');
  }
});

// Start the app
(async () => {
  // Get port from environment variable or use 3000 as fallback
  const port = process.env.PORT || 3000;
  
  // Start the app
  await slackApp.start(port);
  console.log(`⚡️ Pitch Deck Eater is running on port ${port}!`);
})(); 