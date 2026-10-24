import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CHAT_TIMEOUT_MS,
  ChatError,
  chatErrorMessage,
  recentChatMessages,
  requestChatReply,
  type ChatMessage,
} from '../src/lib/chat';
import { handleChatRequest, replyFromAgent } from '../api/chat';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
const message: ChatMessage = { id: 'local-id', role: 'user', content: 'A simple play idea?' };
const request = (overrides: Partial<Parameters<typeof requestChatReply>[0]> = {}) =>
  requestChatReply({
    messages: [message],
    accessToken: 'test-session',
    signal: new AbortController().signal,
    ...overrides,
  });

describe('chat transport', () => {
  it('sends only chat roles/text and the session token to the same-origin endpoint', async () => {
    const http = vi.fn().mockResolvedValue(Response.json({ reply: '  A synthetic reply.  ' }));
    vi.stubGlobal('fetch', http);
    expect(await request()).toBe('A synthetic reply.');
    const [url, options] = http.mock.calls[0]!;
    expect(url).toBe('/api/chat');
    expect(options.headers.Authorization).toBe('Bearer test-session');
    expect(options.redirect).toBe('error');
    expect(JSON.parse(options.body)).toEqual({
      messages: [{ role: 'user', content: message.content }],
    });
  });
  it('does not make a request without a session token', async () => {
    const http = vi.fn();
    vi.stubGlobal('fetch', http);
    await expect(request({ accessToken: '' })).rejects.toMatchObject({ code: 'unauthorized' });
    expect(http).not.toHaveBeenCalled();
  });
  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [404, 'unavailable'],
    [429, 'busy'],
    [503, 'unavailable'],
    [504, 'timeout'],
    [500, 'network'],
  ])('maps HTTP %i without exposing the response body', async (status, code) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('secret upstream detail', { status: Number(status) })),
    );
    await expect(request()).rejects.toMatchObject({ code });
    expect(chatErrorMessage(new ChatError(code as ChatError['code']))).not.toContain('secret');
  });
  it.each([{}, { reply: '' }, { reply: 12 }, { reply: '   ' }])(
    'rejects unreadable replies: %j',
    async (data) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data)));
      await expect(request()).rejects.toMatchObject({ code: 'invalid' });
    },
  );
  it('recognises a static-server HTML fallback as an unavailable endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>not the API</html>')));
    await expect(request()).rejects.toMatchObject({ code: 'unavailable' });
  });
  function stalledFetch() {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(new Error('aborted')), {
              once: true,
            });
          }),
      ),
    );
  }
  it('cancels an in-flight reply', async () => {
    stalledFetch();
    const controller = new AbortController();
    const result = expect(request({ signal: controller.signal })).rejects.toMatchObject({
      code: 'cancelled',
    });
    controller.abort();
    await result;
  });
  it('times out a stalled reply', async () => {
    vi.useFakeTimers();
    stalledFetch();
    const result = expect(request()).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(CHAT_TIMEOUT_MS);
    await result;
  });
  it('keeps recent history within both server limits', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ ...message, id: String(i) }));
    expect(recentChatMessages(many)).toHaveLength(40);
    expect(recentChatMessages(many).at(-1)?.id).toBe('79');
    const long = many.map((item) => ({ ...item, content: 'x'.repeat(12000) }));
    const recent = recentChatMessages(long);
    expect(recent.reduce((size, item) => size + item.content.length, 0)).toBeLessThanOrEqual(80000);
    expect(recent.at(-1)?.id).toBe('79');
  });
});

const agentId = '6aa0ec71-1111-4111-8111-123456789abc';
function setupServer() {
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://auth.example.test');
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
  vi.stubEnv('AGENTICORG_AGENT_ID', agentId);
  vi.stubEnv('AGENTICORG_API_KEY', 'server-secret-never-public');
  vi.stubEnv('AGENTICORG_BASE_URL', 'https://agenticorg.hackathon.pinelabs.com');
  vi.stubEnv('AGENTICORG_TIMEOUT_SECONDS', '120');
}
function apiRequest(
  body: unknown = { messages: [{ role: 'user', content: 'Hello' }] },
  token = 'session-token',
) {
  return new Request('https://parvarish.example.test/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
describe('authenticated AgenticOrg proxy', () => {
  it('rejects signed-out callers before making an upstream request', async () => {
    setupServer();
    const http = vi.fn();
    vi.stubGlobal('fetch', http);
    expect((await handleChatRequest(apiRequest(undefined, ''))).status).toBe(401);
    expect(http).not.toHaveBeenCalled();
  });
  it('rejects expired/invalid sessions without invoking the agent', async () => {
    setupServer();
    const http = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', http);
    expect((await handleChatRequest(apiRequest())).status).toBe(401);
    expect(http).toHaveBeenCalledTimes(1);
    expect(http.mock.calls[0]![0]).toBe('https://auth.example.test/auth/v1/user');
  });
  it('validates authentication, then uses the documented agent request and returns only text', async () => {
    setupServer();
    const http = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 'verified-user' }))
      .mockResolvedValueOnce(
        Response.json({
          status: 'completed',
          confidence: 0.9,
          output: 'Synthetic reply',
          internal: 'private',
        }),
      );
    vi.stubGlobal('fetch', http);
    const response = await handleChatRequest(apiRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ reply: 'Synthetic reply' });
    const [url, options] = http.mock.calls[1]!;
    expect(url).toBe(`https://agenticorg.hackathon.pinelabs.com/api/v1/agents/${agentId}/run`);
    expect(options.headers.Authorization).toBe('Bearer server-secret-never-public');
    expect(JSON.parse(options.body)).toEqual({
      action: 'process',
      inputs: { task: 'Hello' },
      context: {},
    });
    expect(http.mock.calls[0]![1].headers.Authorization).toBe('Bearer session-token');
  });
  it('includes follow-up context without forwarding arbitrary account fields', async () => {
    setupServer();
    const http = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 'verified-user' }))
      .mockResolvedValueOnce(Response.json({ output: { text: 'Reply' } }));
    vi.stubGlobal('fetch', http);
    await handleChatRequest(
      apiRequest({
        messages: [
          { role: 'user', content: 'First question', childId: 'not-sent' },
          { role: 'assistant', content: 'First reply' },
          { role: 'user', content: 'Follow-up' },
        ],
        child: 'private-not-sent',
      }),
    );
    const payload = http.mock.calls[1]![1].body;
    expect(payload).toContain('First reply');
    expect(payload).toContain('Follow-up');
    expect(payload).not.toContain('not-sent');
  });
  it.each([
    { messages: [] },
    { messages: [{ role: 'system', content: 'Hello' }] },
    { messages: [{ role: 'user', content: '   ' }] },
    { messages: [{ role: 'assistant', content: 'Hello' }] },
    { messages: [{ role: 'user', content: 'x'.repeat(2001) }] },
  ])('rejects invalid input before calling external services', async (body) => {
    setupServer();
    const http = vi.fn();
    vi.stubGlobal('fetch', http);
    expect((await handleChatRequest(apiRequest(body))).status).toBe(400);
    expect(http).not.toHaveBeenCalled();
  });
  it('has a safe unconfigured state', async () => {
    setupServer();
    vi.stubEnv('AGENTICORG_AGENT_ID', '');
    const http = vi.fn().mockResolvedValue(Response.json({ id: 'verified-user' }));
    vi.stubGlobal('fetch', http);
    expect((await handleChatRequest(apiRequest())).status).toBe(503);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it.each([
    [401, 503],
    [403, 503],
    [429, 429],
    [500, 502],
  ])('redacts provider failures (%i)', async (upstream, expected) => {
    setupServer();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ id: 'verified-user' }))
        .mockResolvedValueOnce(new Response('provider-secret-detail', { status: upstream })),
    );
    const response = await handleChatRequest(apiRequest());
    expect(response.status).toBe(expected);
    expect(await response.text()).not.toContain('provider-secret-detail');
  });
  it('rejects malformed output and failed runs', async () => {
    expect(replyFromAgent({ status: 'failed', output: 'private error' })).toBeNull();
    expect(replyFromAgent({ status: 'completed', output: { unexpected: 123 } })).toBeNull();
    expect(replyFromAgent({ output: { answer: ' Answer ' } })).toBe('Answer');
  });
  it('reads the live provider output.reply without exposing internal metadata', () => {
    expect(
      replyFromAgent({
        status: 'hitl_triggered',
        output: { reply: ' A parent-facing reply. ', intent: 'other', escalation: 'none' },
        reasoning_trace: ['internal'],
      }),
    ).toBe('A parent-facing reply.');
  });
  it.each([
    ['AGENTICORG_BASE_URL', 'https://untrusted.example'],
    ['AGENTICORG_TIMEOUT_SECONDS', 'not-a-number'],
    ['AGENTICORG_TIMEOUT_SECONDS', '121'],
  ])('rejects unsafe server configuration: %s', async (key, value) => {
    setupServer();
    vi.stubEnv(key, value);
    const http = vi.fn().mockResolvedValue(Response.json({ id: 'verified-user' }));
    vi.stubGlobal('fetch', http);
    expect((await handleChatRequest(apiRequest())).status).toBe(503);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('limits the endpoint to POST', async () => {
    const response = await handleChatRequest(
      new Request('https://parvarish.example.test/api/chat'),
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
  });
});
