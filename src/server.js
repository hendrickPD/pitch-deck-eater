const { App } = require('@slack/bolt');
const { handleMessage } = require('./bot');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false
});

// Handle Slack events
app.message(handleMessage);

// Start the app
(async () => {
  // Use the PORT environment variable provided by Render
  const port = process.env.PORT || 10000;
  await app.start(port);
  console.log(`⚡️ Pitch Deck Eater is running on port ${port}!`);
})(); 