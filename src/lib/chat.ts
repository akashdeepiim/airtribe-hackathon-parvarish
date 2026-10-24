export const CHAT_MESSAGE_LIMIT = 2000;
export const CHAT_HISTORY_LIMIT = 40;
export const CHAT_TIMEOUT_MS = 140_000;

export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
export type ChatErrorCode =
  'unavailable' | 'unauthorized' | 'busy' | 'timeout' | 'network' | 'invalid' | 'cancelled';

export class ChatError extends Error {
  constructor(public code: ChatErrorCode) {
    super(code);
    this.name = 'ChatError';
  }
}

export function chatErrorMessage(error: unknown) {
  const code = error instanceof ChatError ? error.code : 'network';
  return {
    unavailable: 'Our chat is getting ready. Please try again a little later.',
    unauthorized: 'Your session has expired. Please sign in again to continue.',
    busy: 'Lots of conversations right now. Give us a moment, then try again.',
    timeout: 'That reply took a little too long. Your message is still here — try again.',
    network: 'We couldn’t get a reply. Check your connection and try again.',
    invalid: 'We couldn’t read that reply. Please try again.',
    cancelled: 'Reply stopped. You can try this message again whenever you’re ready.',
  }[code];
}

export function recentChatMessages(messages: ChatMessage[]) {
  let characters = 0;
  const recent: ChatMessage[] = [];
  for (const message of messages.slice(-CHAT_HISTORY_LIMIT).reverse()) {
    if (characters + message.content.length > 80000) break;
    recent.unshift(message);
    characters += message.content.length;
  }
  return recent;
}

/** Only the authenticated application endpoint is called by the browser. */
export async function requestChatReply({
  messages,
  accessToken,
  signal,
}: {
  messages: ChatMessage[];
  accessToken: string;
  signal: AbortSignal;
}): Promise<string> {
  if (!accessToken) throw new ChatError('unauthorized');
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CHAT_TIMEOUT_MS);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      body: JSON.stringify({
        messages: recentChatMessages(messages).map(({ role, content }) => ({ role, content })),
      }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new ChatError('unauthorized');
      if (response.status === 429) throw new ChatError('busy');
      if (response.status === 504) throw new ChatError('timeout');
      if (response.status === 503 || response.status === 404) throw new ChatError('unavailable');
      throw new ChatError('network');
    }
    // Static/Expo development servers can return an HTML fallback for /api/chat.
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new ChatError('unavailable');
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new ChatError('invalid');
    }
    if (
      !data ||
      typeof data !== 'object' ||
      !('reply' in data) ||
      typeof data.reply !== 'string' ||
      !data.reply.trim()
    ) {
      throw new ChatError('invalid');
    }
    return data.reply.trim();
  } catch (error) {
    if (controller.signal.aborted) throw new ChatError(timedOut ? 'timeout' : 'cancelled');
    if (error instanceof ChatError) throw error;
    throw new ChatError('network');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
