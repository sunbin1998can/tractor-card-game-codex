import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createWsServer } from './server/ws.js';
import { initDb } from './db.js';
import { handleApi } from './api.js';

await initDb();

const port = Number(process.env.PORT ?? 3000);
const wsPath = '/ws';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const staticDir = path.resolve(import.meta.dirname ?? __dirname, '../../web/dist');

const server = http.createServer(async (req, res) => {
  // Handle API routes first
  try {
    const handled = await handleApi(req, res);
    if (handled) return;
  } catch (err) {
    console.error('[api] Unhandled error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  let filePath = path.join(staticDir, url.pathname);

  // Prevent path traversal
  if (!filePath.startsWith(staticDir)) {
    res.writeHead(403);
    res.end();
    return;
  }

  // If it's a directory or doesn't exist with extension, serve index.html (SPA fallback)
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    // File doesn't exist — SPA fallback to index.html
    if (!path.extname(filePath)) {
      filePath = path.join(staticDir, 'index.html');
    }
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Final fallback to index.html for SPA routes
      fs.readFile(path.join(staticDir, 'index.html'), (err2, fallback) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fallback);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

createWsServer(server, wsPath);

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
  console.log(`WebSocket endpoint: ws://0.0.0.0:${port}${wsPath}`);
});
