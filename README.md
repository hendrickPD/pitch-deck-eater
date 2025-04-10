# Pitch Deck Eater 🎨

A Slack bot that automatically captures Pitch and Miro canvases when links are shared in channels.

## Features

- Automatically detects Pitch and Miro canvas URLs in Slack messages
- Captures full-page screenshots as PDFs
- Uploads the captured PDFs back to the Slack channel

## Setup

1. Create a Slack App at https://api.slack.com/apps
   - Add the following OAuth scopes:
     - `chat:write`
     - `files:write`
     - `channels:history`
     - `groups:history`
     - `im:history`
     - `mpim:history`
   - Enable Event Subscriptions
   - Subscribe to the `message.channels` event

2. Set up environment variables:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-signing-secret
   ```

3. Deploy to Render:
   - Fork this repository
   - Create a new Web Service in Render
   - Connect your GitHub repository
   - Add the environment variables

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run locally:
   ```bash
   npm run dev
   ```

## Docker

Build and run locally:
```bash
docker build -t pitch-deck-eater .
docker run -p 3000:3000 pitch-deck-eater
```

## License

MIT 