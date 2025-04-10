const { App } = require('@slack/bolt');
const express = require('express');

// Initialize Express app
const expressApp = express();

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.send('OK');
});

// Root endpoint
expressApp.get('/', (req, res) => {
  res.send('Pitch Deck Eater is running! 🎨');
});

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false
});

// Handle Slack events
app.message(/https:\/\/(pitch|miro)\.com\/.*/, async ({ message, say }) => {
  try {
    await say(`I see you shared a canvas link! I'll work on capturing that soon. 🎨`);
  } catch (error) {
    console.error('Error:', error);
    await say('Sorry, I had trouble processing that link. 😕');
  }
});

// Start the app
(async () => {
  const port = process.env.PORT || 3000;
  
  // Start the app
  await app.start(port);
  console.log(`⚡️ Pitch Deck Eater is running on port ${port}!`);
  
  // Start Express server
  expressApp.listen(port, () => {
    console.log(`Express server is running on port ${port}`);
  });
})(); 