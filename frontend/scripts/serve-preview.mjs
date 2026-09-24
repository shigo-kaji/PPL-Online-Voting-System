import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as proxyRequest } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const dist = resolve(import.meta.dirname, '../dist/online-voting-frontend/browser');
const port = Number(process.env.PORT || 4200);
const backend = { hostname: '127.0.0.1', port: 8000 };
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('Build Angular first with npm run build.');
}

createServer((incoming, outgoing) => {
  const pathname = new URL(incoming.url || '/', 'http://localhost').pathname;
  if (pathname.startsWith('/api/') || pathname.startsWith('/media/')) {
    const upstream = proxyRequest(
      {
        ...backend,
        method: incoming.method,
        path: incoming.url,
        headers: incoming.headers,
      },
      (response) => {
        outgoing.writeHead(response.statusCode || 502, response.headers);
        response.pipe(outgoing);
      },
    );
    upstream.on('error', () => {
      outgoing.writeHead(502, { 'content-type': 'application/json' });
      outgoing.end(JSON.stringify({ detail: 'The voting API is unavailable.' }));
    });
    incoming.pipe(upstream);
    return;
  }

  let target;
  try {
    target = resolve(dist, decodeURIComponent(pathname).replace(/^[/\\]+/, ''));
  } catch {
    outgoing.writeHead(400).end();
    return;
  }
  if (target !== dist && !target.startsWith(dist + sep)) {
    outgoing.writeHead(403).end();
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) target = join(dist, 'index.html');
  outgoing.writeHead(200, {
    'content-type': contentTypes[extname(target)] || 'application/octet-stream',
  });
  createReadStream(target).pipe(outgoing);
}).listen(port, '127.0.0.1', () => {
  console.log(`Angular preview available at http://127.0.0.1:${port}`);
});
