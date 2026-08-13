// Lokalni dev server (ne deployuje se) — služi statiku + mock /api/loyalty-join
// Pokreni: node tools-dev-server.js  →  http://127.0.0.1:4173
const http = require('http');
const fs = require('fs');
const path = require('path');

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json'
};

http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  // Ruta bez ekstenzije → .html, isto kao "rewrites" u vercel.json.
  // Time /usluge, /premium-pranje, /radovi itd. rade i lokalno.
  if (!path.extname(p) && !p.startsWith('/api/') && fs.existsSync(path.join(__dirname, p + '.html'))) {
    p = p + '.html';
  }
  if (p === '/api/loyalty-join') {
    // Mock config — simulira podešen Google client ID da se vidi dugme
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ google_client_id: 'test-client-id.apps.googleusercontent.com', apple_service_id: null }));
    return;
  }
  const root = __dirname;
  const f = path.join(root, decodeURIComponent(p));
  if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(process.env.PORT || 4173, () => console.log(`Dev server: http://127.0.0.1:${process.env.PORT || 4173}`));
