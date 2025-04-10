const { App, ExpressReceiver } = require('@slack/bolt');

// Initialize the receiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
});

// Get the Express app
const app = receiver.app;

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Pitch Deck Eater is running! 🎨');
});

// Initialize Slack app with the receiver
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// Handle Slack events
slackApp.message(/https:\/\/(pitch|miro)\.com\/.*/, async ({ message, say }) => {
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
  await slackApp.start(port);
  console.log(`⚡️ Pitch Deck Eater is running on port ${port}!`);
})(); 