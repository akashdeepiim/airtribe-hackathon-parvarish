import { copyFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
// Vercel serves this for unknown paths while preserving HTTP 404.
await copyFile('dist/+not-found.html', 'dist/404.html');
for (const route of [
  'index',
  'about',
  'privacy',
  'stories/index',
  'stories/before-we-meet',
  'stories/the-ordinary-days',
  'stories/your-little-village',
]) {
  const html = await readFile(`dist/${route}.html`, 'utf8');
  assert.match(html, /<h1[\s>]/, `${route} must have a rendered heading`);
  assert.match(html, /name="description"/, `${route} must have a description`);
  assert.match(html, /rel="canonical"/, `${route} must have a canonical link`);
}
for (const route of [
  'family',
  'invite',
  'sign-in',
  'children/new',
  'children/[id]',
  'children/[id]/family',
  'children/[id]/privacy',
]) {
  const html = await readFile(`dist/${route}.html`, 'utf8');
  assert.match(
    html,
    /name="robots" content="noindex,nofollow"/,
    `${route} must stay out of search`,
  );
}
console.log('Static public metadata, private-route noindex and 404 output verified.');
