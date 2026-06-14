import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';
import fs from 'fs';
import path from 'path';

// Ignore self-signed cert on the camera
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const configPath = path.resolve(process.cwd(), 'config.json');

function getReolinkConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data?.reolink) {
        return {
          ip: data.reolink.ip || '',
          username: data.reolink.username || '',
          password: data.reolink.password || ''
        };
      }
    }
  } catch (err) {
    console.error('[vite.config.js] Failed to read config.json:', err.message);
  }
  return { ip: '', username: '', password: '' };
}

function getHueConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data?.hue) {
        return {
          ip: data.hue.ip || '',
          username: data.hue.username || ''
        };
      }
    }
  } catch (err) {
    console.error('[vite.config.js] Failed to read config.json:', err.message);
  }
  return { ip: '', username: '' };
}

// Token cache
let token = null;
let tokenExpiry = 0;

function fetchCamera(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;

  const camConfig = getReolinkConfig();
  const body = JSON.stringify([{
    cmd: 'Login', action: 0,
    param: { User: { Version: '0', userName: camConfig.username, password: camConfig.password } }
  }]);

  const res = await fetchCamera({
    hostname: camConfig.ip.split(':')[0], port: 443,
    path: '/api.cgi?cmd=Login&token=null',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, body);

  const json = JSON.parse(res.body.toString());
  const t = json?.[0]?.value?.Token;
  if (!t) throw new Error('Login failed: ' + res.body.toString().slice(0, 200));

  token = t.name;
  tokenExpiry = Date.now() + (t.leaseTime - 60) * 1000;
  console.log(`[reolink] Token acquired (expires in ${t.leaseTime}s)`);
  return token;
}

/** Vite plugin: serves snaps, energy, forecast and settings configuration */
function reolinkPlugin() {
  return {
    name: 'reolink-proxy',
    configureServer(server) {
      server.middlewares.use('/api/config', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.method === 'GET') {
          try {
            if (fs.existsSync(configPath)) {
              const data = fs.readFileSync(configPath, 'utf8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(data);
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(null));
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read config: ' + err.message }));
          }
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid config: ' + err.message }));
            }
          });
        } else {
          res.writeHead(405);
          res.end('Method Not Allowed');
        }
      });

      server.middlewares.use('/api/forecast', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const lat = url.searchParams.get('lat') || '51.83';
          const lon = url.searchParams.get('lon') || '4.68';
          const targetUrl = `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civillight&output=json`;

          const targetRes = await fetch(targetUrl);
          if (!targetRes.ok) throw new Error('7timer status ' + targetRes.status);
          const data = await targetRes.json();

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(data));
        } catch (err) {
          console.error('[forecast proxy] Error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use('/api/energy', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const ip = url.searchParams.get('ip');
          if (!ip) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'IP is required' }));
            return;
          }
          const targetRes = await fetch(`http://${ip}/api/v1/data`);
          if (!targetRes.ok) throw new Error('HomeWizard status ' + targetRes.status);
          const data = await targetRes.json();
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          });
          res.end(JSON.stringify(data));
        } catch (err) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use('/api/snap', async (req, res) => {
        try {
          const tok = await getToken();
          const camConfig = getReolinkConfig();
          const snap = await fetchCamera({
            hostname: camConfig.ip.split(':')[0], port: 443,
            path: `/cgi-bin/api.cgi?cmd=Snap&channel=0&rs=${Date.now()}&token=${tok}`,
            method: 'GET',
          });

          if (snap.status !== 200) {
            // Token may have expired — clear and retry once
            token = null;
            const tok2 = await getToken();
            const snap2 = await fetchCamera({
              hostname: camConfig.ip.split(':')[0], port: 443,
              path: `/cgi-bin/api.cgi?cmd=Snap&channel=0&rs=${Date.now()}&token=${tok2}`,
              method: 'GET',
            });
            res.writeHead(snap2.status, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
            res.end(snap2.body);
            return;
          }

          res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
          res.end(snap.body);
        } catch (err) {
          console.error('[reolink] Snap error:', err.message);
          res.writeHead(502);
          res.end(err.message);
        }
      });
      server.middlewares.use('/api/rss', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        try {
          const url = new URL(req.url, 'http://localhost');
          const feedUrl = url.searchParams.get('url');
          if (!feedUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'url param required' }));
            return;
          }
          const feedRes = await fetch(feedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (HomeOS/1.0; RSS reader)' }
          });
          if (!feedRes.ok) throw new Error(`Feed returned ${feedRes.status}`);
          const xml = await feedRes.text();
          res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
          res.end(xml);
        } catch (err) {
          console.error('[rss proxy] Error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      server.middlewares.use('/api/hue', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        try {
          const hueConfig = getHueConfig();
          if (!hueConfig.ip || !hueConfig.username) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Hue is not configured' }));
            return;
          }

          const url = new URL(req.url, 'http://localhost');
          const targetUrl = `http://${hueConfig.ip}/api/${hueConfig.username}${url.pathname}${url.search}`;

          if (req.method === 'GET') {
            const targetRes = await fetch(targetUrl);
            if (!targetRes.ok) throw new Error('Hue Bridge status ' + targetRes.status);
            const data = await targetRes.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          } else if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const targetRes = await fetch(targetUrl, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: body
                });
                if (!targetRes.ok) throw new Error('Hue Bridge status ' + targetRes.status);
                const data = await targetRes.json();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              } catch (err) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Hue Bridge error: ' + err.message }));
              }
            });
          } else {
            res.writeHead(405);
            res.end('Method Not Allowed');
          }
        } catch (err) {
          console.error('[hue proxy] Error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), reolinkPlugin()],
});
