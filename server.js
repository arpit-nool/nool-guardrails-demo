import http from 'node:http';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { DemoWorkflow, root } from './scripts/workflow.js';
import { lookupWeather } from './src/weather.js';

// A dummy server-side value for the local fixture provider, never a real key.
process.env.WEATHER_API_KEY ||= 'local-fixture-value';
let workflow = new DemoWorkflow(), busy = false;
const port = Number(process.env.PORT || 4175);
const assets = { '/': ['public/index.html', 'text/html'], '/app.js': ['public/app.js', 'text/javascript'], '/style.css': ['public/style.css', 'text/css'] };
const json = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'GET' && assets[url.pathname]) {
      const [file, type] = assets[url.pathname];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      return res.end(await readFile(path.join(root, file)));
    }
    if (req.method === 'GET' && url.pathname === '/api/source') {
      return json(res, 200, {
        unsafe: await readFile(path.join(root, 'scenarios/unsafe.txt'), 'utf8'),
        fixed: await readFile(path.join(root, 'src/weather.js'), 'utf8'),
        policy: await readFile(path.join(root, 'policies/no-weather-key.yaml'), 'utf8')
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/results') {
      try { return json(res, 200, JSON.parse(await readFile(path.join(root, 'artifacts/latest-run.json'), 'utf8'))); }
      catch { return json(res, 200, {}); }
    }
    if (req.method === 'GET' && url.pathname === '/api/weather') {
      try { return json(res, 200, lookupWeather(url.searchParams.get('city') || 'Delhi')); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'POST' && ['/api/reset', '/api/unsafe', '/api/fixed'].includes(url.pathname)) {
      // The browser must explicitly send JSON from this local origin.
      if (req.headers['content-type'] !== 'application/json' ||
          (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) return json(res, 403, { error: 'Local requests only.' });
      if (busy) return json(res, 409, { error: 'A Nool check is already running.' });
      busy = true;
      try {
        if (url.pathname === '/api/reset') {
          await workflow.reset(); workflow = new DemoWorkflow();
          await rm(path.join(root, 'artifacts/latest-run.json'), { force: true });
          return json(res, 200, { ok: true });
        }
        const result = url.pathname === '/api/unsafe' ? await workflow.checkUnsafe() : await workflow.checkFixed();
        return json(res, 200, result);
      } finally { busy = false; }
    }
    json(res, 404, { error: 'Not found' });
  } catch (error) { json(res, 500, { error: error.message }); }
});

server.listen(port, '127.0.0.1', () => console.log(`Nool guardrails demo: http://127.0.0.1:${port}`));
