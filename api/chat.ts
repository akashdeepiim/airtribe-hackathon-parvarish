import { z } from 'zod';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(12000),
});
const requestSchema = z
  .object({
    messages: z.array(messageSchema).min(1).max(40),
  })
  .refine(({ messages }) => messages.at(-1)?.role === 'user')
  .refine(({ messages }) =>
    messages.every((message) => message.role !== 'user' || message.content.length <= 2000),
  )
  .refine(
    ({ messages }) =>
      messages.reduce((total, message) => total + message.content.length, 0) <= 80000,
  );

function json(status: number, body: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

/** Normalise AgenticOrg's structured output at the server boundary. */
export function replyFromAgent(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const result = data as Record<string, unknown>;
  if (['error', 'failed', 'cancelled'].includes(String(result.status).toLowerCase())) return null;
  if (typeof result.output === 'string') return result.output.trim() || null;
  if (result.output && typeof result.output === 'object') {
    const output = result.output as Record<string, unknown>;
    for (const field of ['reply', 'text', 'message', 'answer', 'content']) {
      if (typeof output[field] === 'string' && output[field].trim()) return output[field].trim();
    }
  }
  return null;
}

export async function handleChatRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    const response = json(405, { error: 'method_not_allowed' });
    response.headers.set('Allow', 'POST');
    return response;
  }
  const authorization = request.headers.get('authorization');
  if (!authorization || !/^Bearer \S+$/i.test(authorization))
    return json(401, { error: 'unauthorized' });
  if (!request.headers.get('content-type')?.includes('application/json'))
    return json(415, { error: 'json_required' });
  // Do not accept large chat transcripts or blindly forward arbitrary JSON to the agent.
  if (Number(request.headers.get('content-length')) > 350000)
    return json(413, { error: 'message_too_large' });
  let input: z.infer<typeof requestSchema>;
  try {
    const raw = await request.text();
    if (raw.length > 350000) return json(413, { error: 'message_too_large' });
    const parsed = requestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return json(400, { error: 'invalid_message' });
    input = parsed.data;
  } catch {
    return json(400, { error: 'invalid_message' });
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return json(503, { error: 'unavailable' });

  // Validate with Supabase Auth. A client-supplied user id or decoded JWT is not sufficient.
  try {
    const auth = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: supabaseKey },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      redirect: 'error',
      cache: 'no-store',
    });
    if (!auth.ok)
      return json(auth.status >= 500 ? 503 : 401, {
        error: auth.status >= 500 ? 'unavailable' : 'unauthorized',
      });
    const user = await auth.json();
    if (typeof user?.id !== 'string' || !user.id) return json(401, { error: 'unauthorized' });
  } catch {
    return json(503, { error: 'unavailable' });
  }

  const agentId = process.env.AGENTICORG_AGENT_ID;
  const apiKey = process.env.AGENTICORG_API_KEY;
  const agentBase = (
    process.env.AGENTICORG_BASE_URL || 'https://agenticorg.hackathon.pinelabs.com'
  ).replace(/\/$/, '');
  const timeoutSeconds = Number(process.env.AGENTICORG_TIMEOUT_SECONDS || 120);
  if (!agentId || !z.uuid().safeParse(agentId).success || !apiKey)
    return json(503, { error: 'unavailable' });
  // Credentials are only sent to the provider supplied for this integration.
  if (
    agentBase !== 'https://agenticorg.hackathon.pinelabs.com' ||
    !Number.isInteger(timeoutSeconds) ||
    timeoutSeconds < 1 ||
    timeoutSeconds > 120
  )
    return json(503, { error: 'unavailable' });

  const latest = input.messages.at(-1)!;
  const history = input.messages.slice(0, -1);
  // Use the documented task input for context, without assuming a provider-specific
  // conversation/session API. Only chat text is sent; no family profiles are fetched.
  const task = history.length
    ? `Previous conversation (JSON):\n${JSON.stringify(history)}\n\nCurrent question:\n${latest.content}`
    : latest.content;
  const timeout = AbortSignal.timeout(timeoutSeconds * 1000);
  try {
    const response = await fetch(`${agentBase}/api/v1/agents/${agentId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'process', inputs: { task }, context: {} }),
      signal: AbortSignal.any([request.signal, timeout]),
      redirect: 'error',
      cache: 'no-store',
    });
    if (response.status === 429) return json(429, { error: 'busy' });
    // Upstream credentials and error payloads never reach the browser or logs.
    if (response.status === 401 || response.status === 403)
      return json(503, { error: 'unavailable' });
    if (!response.ok) return json(502, { error: 'upstream_error' });
    const reply = replyFromAgent(await response.json());
    if (!reply || reply.length > 12000) return json(502, { error: 'invalid_reply' });
    return json(200, { reply });
  } catch {
    return json(timeout.aborted ? 504 : 502, {
      error: timeout.aborted ? 'timeout' : 'upstream_error',
    });
  }
}

// Vercel's Node runtime supports Web Request/Response handlers alongside static Expo exports.
export default { fetch: handleChatRequest };
