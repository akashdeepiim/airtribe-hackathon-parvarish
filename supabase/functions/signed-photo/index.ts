import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { z } from 'npm:zod@4.6.7';
const input = z
  .object({
    path: z
      .string()
      .min(1)
      .max(512)
      .regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-zA-Z0-9_.-]+$/),
  })
  .strict();
const ttl = 900;
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const allowed = (
    Deno.env.get('APP_ORIGINS') ?? 'http://localhost:8081,http://127.0.0.1:8081'
  ).split(',');
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'Access-Control-Allow-Origin': origin && allowed.includes(origin) ? origin : allowed[0]!,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowed.includes(origin)) return respond({ error: 'Origin not allowed' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Sign in required' }, 401);
  try {
    const text = await req.text();
    if (text.length > 2048) return respond({ error: 'Request too large' }, 413);
    const parsed = input.safeParse(JSON.parse(text));
    if (!parsed.success) return respond({ error: 'Invalid photo request' }, 400);
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) return respond({ error: 'Sign in required' }, 401);
    const { data: allowedPhoto, error: accessError } = await userClient.rpc('authorize_photo', {
      object_path: parsed.data.path,
    });
    if (accessError || allowedPhoto !== true) return respond({ error: 'Photo unavailable' }, 403);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const { data, error } = await admin.storage
      .from('child-photos')
      .createSignedUrl(parsed.data.path, ttl);
    if (error || !data) return respond({ error: 'Photo unavailable' }, 404);
    // Internal Docker hostname must never reach the browser during local development.
    const publicOrigin = Deno.env.get('PUBLIC_SUPABASE_URL');
    const signed = publicOrigin ? data.signedUrl.replace(url, publicOrigin) : data.signedUrl;
    return respond({ url: signed, expiresAt: Date.now() + ttl * 1000 });
  } catch {
    return respond({ error: 'Unable to open photo' }, 400);
  }
});
