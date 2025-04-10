const { App } = require('@slack/bolt');
const express = require('express');
const { captureCanvas } = require('./capture');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false
});

// Create Express app
const expressApp = express();
expressApp.use(express.json());

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.send('OK');
});

// Handle Slack events
app.message(/https:\/\/(pitch|miro)\.com\/.*/, async ({ message, say }) => {
  try {
    await say(`I'll capture that canvas for you! Processing...`);
    const pdfPath = await captureCanvas(message.text);
    
    // Upload to Slack
    await app.client.files.upload({
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
  // Start the Express server
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Pitch Deck Eater is running on port ${port}!`);
})(); 