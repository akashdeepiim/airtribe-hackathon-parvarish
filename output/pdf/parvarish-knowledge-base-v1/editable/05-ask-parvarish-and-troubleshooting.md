# Using Ask Parvarish

Document: PAR-KB-05 | Version: 1.0 | Reviewed: 24 October 2026

Scope: Help with the signed-in web chatbot and common problems. Service availability depends on the environment's configuration.

## Where do I find Ask Parvarish?

Sign in to Parvarish, then select Ask Parvarish. The chat appears only after your signed-in session is ready. It is not offered on the signed-out experience. The reviewed chatbot is for the web, including a full-screen layout on smaller screens; a separate native app chat has not been confirmed.

## What can I ask first?

The opening screen offers three one-tap questions:

- A little play: Help me think of a simple play idea for my child.
- The everyday magic: How can I make everyday moments with my child more meaningful?
- Our family story: What are some little memories I could capture in our family journal?

Selecting a suggestion sends that question. You can also type your own question about Parvarish, a gentle play idea, a routine or a memory prompt. A reference to a family journal in a prompt does not mean Parvarish currently has a private journal editor.

## How do I send a message or start over?

Write in What's on your mind? and use the send button. On desktop, Enter sends and Shift+Enter adds a new line. On phones, Enter adds a line; use the send button to submit. Each message can contain up to 2,000 characters.

Close the panel to return to your page. Reopening it keeps the same conversation while that page remains loaded. A small indicator can show that a new reply arrived while the panel was closed.

Use the new-chat control, then Start fresh, to clear the conversation from the current page. Keep chatting cancels. Copy anything you want to keep before clearing or reloading; this interface has no saved chat-history browser.

## What information does the chatbot already know?

The connection sends conversation text, not your child profile or photos. Ask Parvarish cannot see your child's name, age, city or permissions merely because you are signed in. You may share a broad age and interest when relevant. It should not ask for identifying details just to suggest a game.

Follow-up messages include recent conversation, up to 40 messages. If an earlier detail is missing, briefly restate it. Reloading or signing out clears the page's conversation. Clearing it locally does not establish deletion by the agent service.

<!-- pagebreak -->

## Can Ask Parvarish save something or change my account?

No. This version provides text replies. It can explain how to use visible controls or draft text to copy. It cannot create or edit profiles, save memories, upload photos, invite or remove relatives, change consent, delete data, book appointments or send messages for you.

A reply saying that something was saved, sent, scheduled or reviewed is not confirmation of an action. Check the actual product screen. No verified human-review or clinician-escalation workflow is exposed by this chat integration.

## What if a response takes a long time?

The panel shows a waiting message and then a longer-wait message. The agent may take up to about two minutes before a timeout. You can use Stop to end the browser's request. Stopping does not guarantee the remote agent has stopped processing. Avoid repeatedly resending while waiting.

If the request fails, Try again retries the last question. Edit message puts the failed question back in the composer so you can change it. The chat does not automatically retry a failed request.

## What if chat is unavailable or asks me to sign in again?

- Sign in again: your session may need renewal. Use the provided control and complete email sign-in. Never send the sign-in code in chat.
- Unavailable or configuration error: retry later. The service may need configuration or may be temporarily unavailable; the chatbot cannot confirm the cause from the message alone.
- Network failure: check the connection, then use Try again. If the problem persists, use a verified support contact from the current privacy page if one is available.
- No Ask Parvarish button: confirm you are signed in and that the current release includes the web chat. The bot is intentionally absent when signed out.

Refreshing can clear an unsaved chat. Copy useful text first when possible. A chat error does not by itself mean child data is lost.

## What are the limits of parenting answers?

Ask Parvarish supports everyday, non-clinical ideas. It cannot diagnose, assess milestones, interpret medical results, give medicine doses, prescribe treatment, or provide fertility or pregnancy advice. It can help you organise a question to ask a qualified professional.

If you are worried about health or development, contact a qualified professional rather than treating reassurance from chat as an assessment. If someone may be in immediate danger, seek local emergency help directly; the chat cannot call for you and is not monitored as an emergency service.

## Basis for this document

Verified against the Ask Parvarish web widget, client transport, server adapter and implementation notes on 24 October 2026. Related: PAR-KB-04 for chat data, PAR-KB-06 for connection, PAR-KB-07 for play, and PAR-KB-08 for memory prompts.
