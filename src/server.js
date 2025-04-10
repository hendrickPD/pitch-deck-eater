const { App, ExpressReceiver } = require('@slack/bolt');
const { captureCanvas } = require('./capture');

// Initialize the receiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  endpoints: '/slack/events'  // Add explicit endpoint for Slack events
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
  receiver,
  endpoints: '/slack/events'  // Match the receiver endpoint
});

// Log all incoming messages
slackApp.message(async ({ message, next }) => {
  console.log('Received message:', JSON.stringify(message, null, 2));
  await next();
});

// Handle Pitch/Miro links
slackApp.message(/https:\/\/(pitch|miro)\.com\/.*/, async ({ message, say }) => {
  try {
    console.log('Processing canvas link:', message.text);
    console.log('Message details:', JSON.stringify({
      user: message.user,
      channel: message.channel,
      ts: message.ts,
      type: message.type
    }, null, 2));
    
    // Initial response
    await say({
      text: `I'll capture that canvas for you! Processing... 🎨`,
      thread_ts: message.thread_ts || message.ts
    });

    // Extract URL from message
    const urlMatch = message.text.match(/https:\/\/(pitch|miro)\.com\/[^\s>]+/);
    if (!urlMatch) {
      throw new Error('No valid URL found in message');
    }

    // Capture canvas
    console.log('Starting canvas capture...');
    const { screenshotPath, pdfPath } = await captureCanvas(urlMatch[0]);
    
    // Upload files to Slack
    console.log('Uploading files to Slack...');
    const [screenshotUpload, pdfUpload] = await Promise.all([
      slackApp.client.files.upload({
        channels: message.channel,
        initial_comment: "Here's your canvas screenshot! 📸",
        file: screenshotPath,
        thread_ts: message.thread_ts || message.ts
      }),
      slackApp.client.files.upload({
        channels: message.channel,
        initial_comment: "And here's the PDF version! 📄",
        file: pdfPath,
        thread_ts: message.thread_ts || message.ts
      })
    ]);
    
    console.log('Files uploaded successfully');
  } catch (error) {
    console.error('Error processing message:', error);
    await say({
      text: 'Sorry, I had trouble capturing that canvas. 😕\nError: ' + error.message,
      thread_ts: message.thread_ts || message.ts
    });
  }
});

// Log all requests to /slack/events
app.use('/slack/events', (req, res, next) => {
  console.log('Slack event received:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  next();
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
    const authTest = await slackApp.client.auth.test();
    console.log('Bot User ID:', authTest.bot_id);
    console.log('Bot User Name:', authTest.user);
    console.log('Team Name:', authTest.team);
  } catch (error) {
    console.error('Failed to start the app:', error);
    process.exit(1);
  }
})(); 