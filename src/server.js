const express = require('express');
const { App } = require('@slack/bolt');
const { capturePitchDeck } = require('./capture');
const { handleMessage } = require('./bot');

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize Slack app
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  appToken: process.env.SLACK_APP_TOKEN,
  // Use the Express app as the receiver
  receiver: {
    app: app
  }
});

// Handle Slack events
slackApp.message(handleMessage);

// Start the server
(async () => {
  await slackApp.start();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Slack app is running!');
  });
})(); 