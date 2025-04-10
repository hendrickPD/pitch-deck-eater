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
  console.log('Health check requested');
  res.send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('Root endpoint requested');
  res.send('Pitch Deck Eater is running! 🎨');
});

// Initialize Slack app with the receiver
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// Log all incoming messages
slackApp.message(async ({ message, next }) => {
  console.log('Received message:', message);
  await next();
});

// Handle Pitch/Miro links
slackApp.message(/https:\/\/(pitch|miro)\.com\/.*/, async ({ message, say }) => {
  try {
    console.log('Processing canvas link:', message.text);
    console.log('Message details:', {
      user: message.user,
      channel: message.channel,
      ts: message.ts
    });
    
    await say({
      text: `I see you shared a canvas link! I'll work on capturing that soon. 🎨`,
      thread_ts: message.thread_ts || message.ts
    });
    
    console.log('Response sent successfully');
  } catch (error) {
    console.error('Error processing message:', error);
    await say({
      text: 'Sorry, I had trouble processing that link. 😕',
      thread_ts: message.thread_ts || message.ts
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).send('Internal Server Error');
});

// Start the app
(async () => {
  try {
    const port = process.env.PORT || 3000;
    await slackApp.start(port);
    console.log(`⚡️ Pitch Deck Eater is running on port ${port}!`);
    console.log('Bot User ID:', (await slackApp.client.auth.test()).bot_id);
  } catch (error) {
    console.error('Failed to start the app:', error);
    process.exit(1);
  }
})(); 