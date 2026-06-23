import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

const cameraHttpsAgent = new https.Agent({ rejectUnauthorized: false });
const configPath = path.resolve(process.cwd(), 'config.json');

let _configCache = null;

function readConfig() {
  if (_configCache !== null) return _configCache;
  try {
    if (fs.existsSync(configPath)) {
      _configCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      _configCache = {};
    }
  } catch (err) {
    console.error('[server.js] Failed to read config.json:', err.message);
    _configCache = {};
  }
  return _configCache;
}

function invalidateConfigCache() {
  _configCache = null;
}

function getReolinkConfig() {
  const data = readConfig();
  return data?.reolink
    ? { ip: data.reolink.ip || '', username: data.reolink.username || '', password: data.reolink.password || '' }
    : { ip: '', username: '', password: '' };
}

function getHueConfig() {
  const data = readConfig();
  return data?.hue
    ? { ip: data.hue.ip || '', username: data.hue.username || '' }
    : { ip: '', username: '' };
}

let token = null;
let tokenExpiry = 0;

function fetchCamera(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...options, agent: cameraHttpsAgent }, (res) => {
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
    hostname: camConfig.ip.split(':')[0], port: parseInt(camConfig.ip.split(':')[1] || 443, 10),
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

// Middleware to parse raw body
app.use(express.text({ type: '*/*' }));
app.use(cors());

// --- API Routes ---

app.all('/api/config', (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(data);
      } else {
        return res.status(200).json(null);
      }
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read config: ' + err.message });
    }
  } else if (req.method === 'POST') {
    try {
      const parsed = JSON.parse(req.body);
      fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf8');
      invalidateConfigCache();
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid config: ' + err.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      invalidateConfigCache();
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete config: ' + err.message });
    }
  } else {
    return res.status(405).send('Method Not Allowed');
  }
});

app.get('/api/forecast', async (req, res) => {
  try {
    const lat = req.query.lat || '51.83';
    const lon = req.query.lon || '4.68';
    const targetUrl = `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civillight&output=json`;

    const targetRes = await fetch(targetUrl);
    if (!targetRes.ok) throw new Error('7timer status ' + targetRes.status);
    const data = await targetRes.json();

    res.json(data);
  } catch (err) {
    console.error('[forecast proxy] Error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/energy', async (req, res) => {
  try {
    const ip = req.query.ip;
    if (!ip) {
      return res.status(400).json({ error: 'IP is required' });
    }
    const targetRes = await fetch(`http://${ip}/api/v1/data`);
    if (!targetRes.ok) throw new Error('HomeWizard status ' + targetRes.status);
    const data = await targetRes.json();
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/snap', async (req, res) => {
  try {
    const tok = await getToken();
    const camConfig = getReolinkConfig();
    const snap = await fetchCamera({
      hostname: camConfig.ip.split(':')[0], port: parseInt(camConfig.ip.split(':')[1] || 443, 10),
      path: `/cgi-bin/api.cgi?cmd=Snap&channel=0&rs=${Date.now()}&token=${tok}`,
      method: 'GET',
    });

    if (snap.status !== 200) {
      token = null;
      const tok2 = await getToken();
      const snap2 = await fetchCamera({
        hostname: camConfig.ip.split(':')[0], port: parseInt(camConfig.ip.split(':')[1] || 443, 10),
        path: `/cgi-bin/api.cgi?cmd=Snap&channel=0&rs=${Date.now()}&token=${tok2}`,
        method: 'GET',
      });
      res.status(snap2.status).set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' }).send(snap2.body);
      return;
    }

    res.status(200).set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' }).send(snap.body);
  } catch (err) {
    console.error('[reolink] Snap error:', err.message);
    res.status(502).send(err.message);
  }
});

app.get('/api/rss', async (req, res) => {
  try {
    const feedUrl = req.query.url;
    if (!feedUrl) {
      return res.status(400).json({ error: 'url param required' });
    }
    const feedRes = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (HomeOS/1.0; RSS reader)' }
    });
    if (!feedRes.ok) throw new Error(`Feed returned ${feedRes.status}`);
    const xml = await feedRes.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (err) {
    console.error('[rss proxy] Error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.use('/api/hue', async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const hueConfig = getHueConfig();
    if (!hueConfig.ip || !hueConfig.username) {
      return res.status(400).json({ error: 'Hue is not configured' });
    }

    // Inside app.use('/api/hue'), req.url contains the remaining path (e.g., '/groups')
    const targetUrl = `http://${hueConfig.ip}/api/${hueConfig.username}${req.url}`;

    if (req.method === 'GET') {
      const targetRes = await fetch(targetUrl);
      if (!targetRes.ok) throw new Error('Hue Bridge status ' + targetRes.status);
      const data = await targetRes.json();
      return res.json(data);
    } else if (req.method === 'PUT') {
      const targetRes = await fetch(targetUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: req.body
      });
      if (!targetRes.ok) throw new Error('Hue Bridge status ' + targetRes.status);
      const data = await targetRes.json();
      return res.json(data);
    } else {
      return res.status(405).send('Method Not Allowed');
    }
  } catch (err) {
    console.error('[hue proxy] Error:', err.message);
    return res.status(502).json({ error: err.message });
  }
});

// Serve static frontend files from 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router (SPA)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[HomeOS] Production server running on http://0.0.0.0:${PORT}`);
});
