import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- Storage (In-memory ring buffers) ---
const MAX_LOGS = 200;
const MAX_VISITORS = 100;

const consoleLogs = [];
const sseClients = new Set();
const recentVisitors = [];
const visitorStats = new Map(); // ip -> { count, firstSeen, lastSeen }

// Helper: Normalize and extract Public IP address
function getClientIp(req) {
  // Cloudflare & Render edge proxy header (gives real client public IP)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return cfIp.trim();

  // Reverse proxy headers
  const realIp = req.headers['x-real-ip'] || req.headers['x-client-ip'];
  if (realIp) return realIp.trim();

  // Standard forwarded list (first IP is the client public IP)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = forwarded.split(',').map(s => s.trim());
    if (list.length > 0 && list[0]) return list[0];
  }

  let ip = req.socket.remoteAddress;
  if (!ip) return '127.0.0.1';
  // Normalize IPv6 localhost or IPv4-mapped IPv6
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  return ip;
}

// Log broadcasting
function broadcastLog(entry) {
  consoleLogs.push(entry);
  if (consoleLogs.length > MAX_LOGS) consoleLogs.shift();

  const data = `data: ${JSON.stringify(entry)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Intercept server console outputs
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function recordServerLog(type, args) {
  const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  const entry = {
    id: Date.now() + Math.random().toString(36).substr(2, 5),
    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    type: type.toUpperCase(),
    source: 'SERVER',
    message
  };
  broadcastLog(entry);
}

console.log = (...args) => {
  originalLog(...args);
  recordServerLog('LOG', args);
};
console.warn = (...args) => {
  originalWarn(...args);
  recordServerLog('WARN', args);
};
console.error = (...args) => {
  originalError(...args);
  recordServerLog('ERROR', args);
};

// Record Visitor IP
function recordVisitor(req, overrideIp = null) {
  const ip = overrideIp || getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'UNKNOWN';
  const reqPath = req.url || '/';
  const method = req.method;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Update stats
  const stat = visitorStats.get(ip) || { count: 0, firstSeen: now, lastSeen: now };
  stat.count += 1;
  stat.lastSeen = now;
  visitorStats.set(ip, stat);

  const visitorEntry = {
    id: Date.now() + Math.random().toString(36).substr(2, 5),
    ip,
    method,
    path: reqPath,
    time: now,
    userAgent,
    totalHits: stat.count
  };

  recentVisitors.unshift(visitorEntry);
  if (recentVisitors.length > MAX_VISITORS) recentVisitors.pop();

  return visitorEntry;
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

// HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Track page / resource hits (excluding internal SSE stream to avoid infinite loop)
  if (pathname !== '/api/admin/console-stream') {
    const visitor = recordVisitor(req);
    // Only log distinct page loads or API calls in console to prevent flooding
    if (!pathname.startsWith('/games/') && !pathname.endsWith('.css') && !pathname.endsWith('.js')) {
      console.log(`[HTTP] ${req.method} ${pathname} from IP: ${visitor.ip}`);
    }
  }

  // --- API Endpoints ---
  if (pathname === '/api/admin/console-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`data: ${JSON.stringify({ type: 'SYS', time: new Date().toISOString().replace('T', ' ').substring(0, 19), source: 'STREAM', message: 'Connected to Admin Console Stream' })}\n\n`);

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (pathname === '/api/admin/console-history' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(consoleLogs));
    return;
  }

  if (pathname === '/api/admin/visitors' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalUniqueIps: visitorStats.size,
      totalHits: Array.from(visitorStats.values()).reduce((sum, v) => sum + v.count, 0),
      recent: recentVisitors
    }));
    return;
  }

  if (pathname === '/api/admin/clear-console' && req.method === 'POST') {
    consoleLogs.length = 0;
    console.log('[SYS] Console logs cleared by admin');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (pathname === '/api/admin/clear-visitors' && req.method === 'POST') {
    recentVisitors.length = 0;
    visitorStats.clear();
    console.log('[SYS] Visitor IP log cleared by admin');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (pathname === '/api/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const entry = {
          id: Date.now() + Math.random().toString(36).substr(2, 5),
          time: new Date().toISOString().replace('T', ' ').substring(0, 19),
          type: (data.type || 'LOG').toUpperCase(),
          source: (data.source || 'CLIENT').toUpperCase(),
          message: String(data.message || '')
        };
        broadcastLog(entry);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (pathname === '/api/visitor-ping' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.publicIp) {
          const visitor = recordVisitor(req, data.publicIp);
          console.log(`[HTTP] Client Public IP verified: ${visitor.ip}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // --- Static Files Serving ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[SYS] Server running on http://localhost:${PORT}`);
  console.log(`[SYS] Admin panel available at http://localhost:${PORT}/#admin`);
});
