const { App } = require('@slack/bolt');
const express = require('express');
const { captureCanvas } = require('./capture');

// Create Express app
const expressApp = express();
expressApp.use(express.json());

// Initialize Slack app with the Express receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  customRoutes: [
    {
      path: '/',
      method: ['GET', 'HEAD'],
      handler: (req, res) => {
        res.send('Pitch Deck Eater is running! 🎨');
      },
    },
  ],
});

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.send('OK');
});

// Root endpoint
expressApp.get('/', (req, res) => {
  res.send('Pitch Deck Eater is running! 🎨');
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
  // Get port from environment variable or use 3000 as fallback
  const port = process.env.PORT || 3000;
  
  // Start the app
  await app.start(port);
  console.log(`⚡️ Pitch Deck Eater is running on port ${port}!`);
  
  // Mount the Slack app routes on the Express app
  expressApp.use('/', app.receiver.router);
  
  // Start Express server on the same port
  expressApp.listen(port, () => {
    console.log(`Express server is running on port ${port}`);
  });
})(); 