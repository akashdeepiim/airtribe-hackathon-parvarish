// Serve the exported app and the real chat handler together, on loopback only.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { handleChatRequest } from '../api/chat.ts';

const project = fileURLToPath(new URL('../', import.meta.url));
const envFile = resolve(project, '.env.local');
if (existsSync(envFile)) loadEnvFile(envFile);
const root = resolve(project, 'dist');
if (!existsSync(resolve(root, 'index.html'))) throw new Error('Run npm run build:web first.');
const port = Number(process.env.PARVARISH_PREVIEW_PORT || 8082);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid preview port.');
const mime = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === '/api/chat') {
      const controller = new AbortController();
      res.on('close', () => controller.abort());
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 350000) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'message_too_large' }));
          return;
        }
        chunks.push(chunk);
      }
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}),
        signal: controller.signal,
      });
      const response = await handleChatRequest(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    let route = decodeURIComponent(url.pathname);
    if (route.includes('\0')) throw new Error('Invalid route');
    route = route.replace(/\/children\/[0-9a-fA-F-]{36}(?=\/|$)/, '/children/[id]');
    let target = resolve(root, `.${route === '/' ? '/index.html' : route}`);
    if (!target.startsWith(root + sep)) {
      res.writeHead(404);
      res.end();
      return;
    }
    if (!extname(target)) {
      target = existsSync(target + '.html') ? target + '.html' : resolve(target, 'index.html');
    }
    let body;
    let status = 200;
    try {
      body = await readFile(target);
    } catch {
      body = await readFile(resolve(root, '404.html'));
      target = '404.html';
      status = 404;
    }
    res.writeHead(status, {
      'Content-Type': mime[extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'preview_error' }));
  }
});
server.requestTimeout = 140000;
server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use.`
      : 'Local preview could not start.',
  );
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Parvarish with live chat: http://127.0.0.1:${port}`),
);
