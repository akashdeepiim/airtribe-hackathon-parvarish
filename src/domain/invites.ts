import { z } from 'zod';
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export function inviteUrl(origin: string, token: string): string {
  const url = new URL('/invite', z.url().parse(origin));
  url.hash = `token=${tokenSchema.parse(token)}`;
  return url.toString();
}
export function extractInviteToken(url: string): string | null {
  try {
    const candidate = new URLSearchParams(new URL(url).hash.slice(1)).get('token');
    const parsed = tokenSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function whatsappInvite(url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`Join our private family space on Parvarish. Sign in with the email this invitation was sent to.\n${url}`)}`;
}
