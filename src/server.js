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
  await app.start();
  console.log('⚡️ Pitch Deck Eater is running!');
})(); 