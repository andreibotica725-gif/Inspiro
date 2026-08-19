/* ============================================================
   INSPIRO — NOTES SERVER
   Serves the site and persists reviewer notes to notes.json.

     node notes-server.js          -> http://localhost:4000
     node notes-server.js 8080     -> custom port

   No dependencies. Node 14+.
   Without this server the site still works: notes are kept in
   the visitor's browser and can be exported with the panel's
   "Download notes.json" button.
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FILE = path.join(ROOT, 'notes.json');
const PORT = Number(process.argv[2]) || 4000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4'
};

function readNotes() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(raw.notes) ? raw : { updated: null, notes: [] };
  } catch (e) {
    return { updated: null, notes: [] };
  }
}

function writeNotes(payload) {
  const data = {
    updated: new Date().toISOString(),
    notes: Array.isArray(payload.notes) ? payload.notes : []
  };
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = decodeURIComponent(url.pathname);

  /* ---- notes API ---- */
  if (route === '/api/notes') {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': TYPES['.json'] });
      return res.end(JSON.stringify(readNotes()));
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      let body = '';
      req.on('data', c => {
        body += c;
        if (body.length > 5e6) req.destroy();
      });
      req.on('end', () => {
        try {
          const saved = writeNotes(JSON.parse(body || '{}'));
          console.log(`saved ${saved.notes.length} note(s) -> notes.json`);
          res.writeHead(200, { 'Content-Type': TYPES['.json'] });
          res.end(JSON.stringify({ ok: true, count: saved.notes.length }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': TYPES['.json'] });
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
        }
      });
      return;
    }

    res.writeHead(405).end();
    return;
  }

  /* ---- static files ---- */
  let rel = route === '/' ? 'index.html' : route.replace(/^\/+/, '');
  const file = path.join(ROOT, rel);

  if (!file.startsWith(ROOT)) {          // path traversal guard
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found: ' + rel);
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  if (!fs.existsSync(FILE)) writeNotes({ notes: [] });
  console.log(`Inspiro site + notes server running at http://localhost:${PORT}`);
  console.log(`Reviewer notes are written to ${FILE}`);
});
