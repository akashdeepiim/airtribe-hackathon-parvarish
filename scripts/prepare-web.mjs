import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { z } from 'zod';
if (!process.env.EXPO_NO_DOTENV && existsSync('.env.local')) loadEnvFile('.env.local');
if (
  process.env.VERCEL &&
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(process.env.EXPO_PUBLIC_SUPABASE_URL)
) {
  throw new Error('Vercel must use hosted Supabase. Local development URLs cannot be deployed.');
}
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (publicKey) {
  let isPublic = publicKey.startsWith('sb_publishable_');
  try {
    isPublic ||=
      JSON.parse(Buffer.from(publicKey.split('.')[1] ?? '', 'base64url').toString()).role ===
      'anon';
  } catch {
    /* A publishable key is not a JWT. */
  }
  if (!isPublic)
    throw new Error('Only a Supabase publishable or anon key may enter the frontend build.');
}
// A design preview must build without secrets. Public launch has separate, explicit checks.
const site = z.url().parse(process.env.EXPO_PUBLIC_SITE_URL || 'https://parvarish.akash-deep.com');
const origin = new URL(site).origin;
const live = process.env.EXPO_PUBLIC_LAUNCH_READY === 'true';
if (live) {
  if (!origin.startsWith('https://')) throw new Error('Public launch requires an HTTPS site URL.');
  z.email().parse(process.env.EXPO_PUBLIC_SUPPORT_EMAIL);
  z.string().min(2).parse(process.env.EXPO_PUBLIC_OPERATOR_NAME);
  const api = z.url().parse(process.env.EXPO_PUBLIC_SUPABASE_URL);
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(api))
    throw new Error('Public launch requires a hosted Supabase URL.');
  z.string().min(20).parse(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  if (process.env.EXPO_PUBLIC_APP_URL !== origin)
    throw new Error('The app URL must match the public site URL.');
}
await mkdir('public/fonts', { recursive: true });
for (const [src, dest] of [
  ['fraunces/files/fraunces-latin-full-normal.woff2', 'fraunces-latin.woff2'],
  ['fraunces/files/fraunces-latin-full-italic.woff2', 'fraunces-latin-italic.woff2'],
  ['dm-sans/files/dm-sans-latin-standard-normal.woff2', 'dm-sans-latin.woff2'],
  ['fraunces/LICENSE', 'fraunces-LICENSE.txt'],
  ['dm-sans/LICENSE', 'dm-sans-LICENSE.txt'],
])
  await copyFile(`node_modules/@fontsource-variable/${src}`, `public/fonts/${dest}`);
const paths = [
  '/',
  '/about',
  '/privacy',
  '/stories',
  '/stories/the-ordinary-days',
  '/stories/before-we-meet',
  '/stories/your-little-village',
];
await writeFile(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}\n</urlset>\n`,
);
await writeFile(
  'public/robots.txt',
  live
    ? `User-agent: *\nAllow: /\nDisallow: /children/\nDisallow: /family\nDisallow: /invite\nDisallow: /sign-in\nDisallow: /_sitemap\nSitemap: ${origin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n',
);
console.log(
  live
    ? 'Public-site metadata prepared; hosted acceptance checks remain required.'
    : 'Design preview prepared; search indexing is disabled.',
);
