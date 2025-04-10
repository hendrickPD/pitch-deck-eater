const express = require('express');
const { App, ExpressReceiver } = require('@slack/bolt');
const { capturePitchDeck } = require('./capture');
const { handleMessage } = require('./bot');

const port = process.env.PORT || 3000;

// Create an ExpressReceiver
const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events'
});

// Create an Express app
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize Slack app
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver
});

// Handle Slack events
slackApp.message(handleMessage);

// Use the ExpressReceiver's router
app.use(expressReceiver.router);

// Start the server
(async () => {
  await slackApp.start();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Slack app is running!');
  });
})(); 