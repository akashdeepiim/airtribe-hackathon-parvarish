# Ask Parvarish

The web chatbot appears only after authentication has finished and a user is signed in. It is mounted once in the root layout, stays available across pages, and clears its in-memory conversation on sign-out/account changes. Closing the panel keeps the conversation; refreshing or navigating with a full page load clears it. Nothing is added to browser storage.

The interface includes three one-tap opening suggestions, a multiline composer, message history, waiting/extended-wait states, stop, retry, edit-and-resend, a new-conversation confirmation, and a reply indicator if the panel was closed. Enter sends on desktop, Shift+Enter adds a line; on phones Enter adds a line and the send button submits. The native dialog provides keyboard focus containment and Escape dismissal. Native app design remains deferred per the existing web-first decision.

## Agent connection

The browser posts to `/api/chat` with the signed-in user's Supabase bearer token. The Vercel Node function validates the session with Supabase Auth before contacting the agent. Configure these **server-only** Vercel environment variables and redeploy:

```dotenv
AGENTICORG_BASE_URL=https://agenticorg.hackathon.pinelabs.com
AGENTICORG_AGENT_ID=<agent-uuid>
AGENTICORG_API_KEY=<secret>
AGENTICORG_TIMEOUT_SECONDS=120
```

The server also uses the existing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to validate sessions. No service-role key is needed. The agent key is never included in client source, an Expo public variable, or an API response.

The agent endpoint and request follow the supplied example:

```http
POST https://agenticorg.hackathon.pinelabs.com/api/v1/agents/{AGENTICORG_AGENT_ID}/run
Authorization: Bearer {AGENTICORG_API_KEY}
Content-Type: application/json
```

```json
{ "action": "process", "inputs": { "task": "the question" }, "context": {} }
```

For follow-ups, the task includes earlier chat messages as a JSON transcript followed by the latest question. No child profiles, photographs or health records are fetched or attached. Up to 40 recent messages are sent, with a 2,000-character user-message limit and an 80,000-character combined transcript limit.

The live API returns the parent-facing text in `output.reply`. This was verified with the supplied credentials. The adapter accepts that field, a nonempty output string, or an object with a `text`, `message`, `answer` or `content` string. It rejects error/failed/cancelled results and unreadable outputs. Confidence and internal reasoning are not returned to the browser. One observed response had `status: "hitl_triggered"` and `output.escalation: "none"`; its parent-facing reply is displayed, but no human-review workflow or outcome is claimed by the interface.

The upstream timeout uses `AGENTICORG_TIMEOUT_SECONDS` (default and maximum 120 seconds), inside a 135-second function budget; the browser allows 140 seconds. The base URL is restricted to the supplied AgenticOrg origin, preventing accidental credential forwarding to another service. Stopping a reply cancels the browser request, but an agent run may continue upstream if the hosting/provider does not propagate cancellation. No automatic retry is performed. Upstream credentials and error bodies are never shown or logged. Missing configuration produces a friendly unavailable state, never a fabricated answer.

The function uses Vercel's [Web Request/Response handler](https://vercel.com/docs/functions/runtimes/node-js#using-typescript-with-the-nodejs-runtime) and [function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration).

## Local review

Put the four server-only AgenticOrg variables in the ignored `.env.local`, alongside the existing local Supabase configuration. Then run:

```sh
npm run preview:web
```

This builds the website and serves both the exported pages and the production chat handler on loopback at `http://127.0.0.1:8082`. The local Supabase service must be running. Restart the preview after changing `.env.local` or the API handler. To change the local port, set `PARVARISH_PREVIEW_PORT`. No mock agent responses are used by this command.

`npm run web` remains the Expo UI development server on port 8081; it does not serve `/api/chat`. Transport and server contract tests run with `npm test` and use mocked HTTP responses, including authentication rejection and provider failures.

Conversation retention by the agent service and its deployed behaviour are not specified by the supplied example. The UI makes no claim that the provider deletes or privately retains chat messages.

## Verified on 24 October 2026

- `npm run check`: TypeScript, all 50 tests (33 chat checks plus 17 existing checks), and content validation passed.
- `npm run build:web`: all 17 static routes exported; metadata/private-route checks passed.
- Real local email OTP: chat is absent while signed out, appears after login, and is removed after sign-out.
- Browser checks: opening suggestions, disabled blank send, unavailable reply, retry without duplicate messages, edit/resend, new-chat confirmation, Escape dismissal and focus return.
- An isolated local harness exercised the production API handler with real local authentication and explicitly labelled synthetic agent replies. Successful replies, follow-up context, stop/cancel, close/reopen history, and the new-reply indicator were verified. The harness is ignored and is not shipped.
- Desktop and 390 × 844 mobile layouts were visually reviewed, with no horizontal overflow on mobile. Screenshots: [desktop](qa/chat-desktop.png), [phone](qa/chat-mobile.png).
- The exported client bundle was checked for the server credential variable and synthetic secret markers; none were present.

### Live connection follow-up

- Imported the supplied server configuration into the ignored `.env.local` without altering the existing local Supabase settings.
- The real agent returned HTTP 200; the authenticated local `/api/chat` endpoint also returned HTTP 200 with reply text.
- Verified a signed-in browser conversation against the real agent using the first suggested message. The response rendered correctly; the local preview remains available at `http://127.0.0.1:8082`. [Live browser check](qa/chat-live-local.png).
- Added a regression check for the actual `output.reply` response and invalid provider/timeout configuration. All 54 tests, TypeScript, content validation, and the production web build pass.
- Checked every exported website file for the actual secret value; it is absent.

Production Vercel function execution, human review behaviour at the provider, and an actual phone keyboard remain unverified.
