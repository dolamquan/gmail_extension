# Inbox Copilot MVP

Inbox Copilot is a full-stack MVP that connects Gmail OAuth to a Chrome Extension and analyzes an email thread with the OpenAI Responses API.

## Features

- Google OAuth 2.0 web-server flow
- Gmail API read access for profile + thread retrieval
- Thread cleaning/parsing before AI analysis
- OpenAI Responses API output as strict JSON:
  - summary
  - sender_intent
  - action_items
  - deadlines
  - suggested_reply
- Gmail draft creation (no sending)
- Chrome Extension (Manifest V3): popup + background + content script

## Project Structure

inbox-copilot/
- backend/
  - src/
    - server.ts
    - routes/auth.ts
    - routes/gmail.ts
    - routes/ai.ts
    - services/googleOAuth.ts
    - services/gmailService.ts
    - services/openaiService.ts
    - services/parseEmail.ts
    - middleware/requireAuth.ts
    - utils/decodeBase64Url.ts
    - utils/stripHtml.ts
    - types/ai.ts
    - types/gmail.ts
  - package.json
  - tsconfig.json
  - .env.example
- extension/
  - manifest.json
  - popup.html
  - popup.css
  - popup.js
  - background.js
  - content.js

## Prerequisites

- Node.js 18+
- Google account with Gmail
- OpenAI API key
- Chrome browser

## 1) Backend Setup

1. Open terminal in `inbox-copilot/backend`.
2. Install dependencies:

```bash
npm install
```

3. Create `.env` from `.env.example` and fill values:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
OPENAI_API_KEY=...
SESSION_SECRET=replace_with_a_long_random_secret
PORT=4000
OPENAI_MODEL=gpt-4.1-mini
```

4. Start backend in dev mode:

```bash
npm run dev
```

Backend runs on `http://localhost:4000`.

## 2) Create Google OAuth Credentials

1. Go to Google Cloud Console.
2. Create or select a project.
3. Enable the Gmail API for the project.
4. Configure OAuth consent screen (External or Internal).
5. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
6. Create OAuth Client ID of type **Web application**.
7. Add Authorized redirect URI:
   - `http://localhost:4000/auth/google/callback`
8. Copy Client ID + Client Secret into backend `.env`.

## 3) Enable Gmail API

1. In Google Cloud Console, open **APIs & Services > Library**.
2. Search for **Gmail API**.
3. Click **Enable**.

## 4) Load Chrome Extension (Unpacked)

1. Open Chrome at `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select folder: `inbox-copilot/extension`.

## 5) Test Analyze + Draft Flow

1. Ensure backend is running.
2. Open Gmail and select a thread.
3. Open extension popup.
4. Click **Connect Gmail** and complete OAuth login in the new tab.
5. Return to popup and click **Analyze Current Thread**.
6. Review summary, intent, action items, deadlines, and suggested reply.
7. Click **Create Draft**.
8. Verify draft appears in Gmail Drafts.

## API Endpoints

- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /auth/status`
- `GET /gmail/profile`
- `GET /gmail/thread/:threadId`
- `POST /ai/analyze-thread`
- `POST /gmail/draft`

## Notes

- Secrets are only stored in backend `.env`.
- OpenAI API key never appears in extension files.
- Google OAuth tokens are stored in server-side session only.
- Current setup is optimized for local development on `http://localhost:4000`.
- For production, use HTTPS and set secure session cookie settings.
