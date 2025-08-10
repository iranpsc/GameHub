const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

try {
  require('dotenv').config();
} catch (_) {}

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5000);
const launchToken = process.env.LAUNCH_TOKEN || '';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.use(express.json({ limit: '256kb' }));
app.use(
  cors({
    origin: [
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
      `http://[::1]:${port}`,
    ],
    methods: ['GET', 'POST'],
  })
);

function isLocalRequest(req) {
  const ip = req.ip || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

app.use((req, res, next) => {
  if (!isLocalRequest(req)) {
    return res.status(403).json({ error: 'Forbidden: local requests only' });
  }
  if (launchToken) {
    const headerToken = req.get('x-launch-token') || '';
    if (headerToken !== launchToken) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }
  }
  next();
});

const appsConfigPath = path.join(__dirname, '..', 'config', 'apps.json');
let apps = [];
function loadAppsConfig() {
  try {
    const raw = fs.readFileSync(appsConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.apps)) {
      throw new Error('Invalid apps config format');
    }
    apps = parsed.apps;
    console.log(`Loaded ${apps.length} apps from config`);
  } catch (err) {
    console.error('Failed to load apps config:', err.message);
    apps = [];
  }
}
loadAppsConfig();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: os.platform(), port, host });
});

app.get('/apps', (req, res) => {
  res.json({
    apps: apps.map((a) => ({ id: a.id, name: a.name, path: a.path })),
  });
});

app.post('/launch', (req, res) => {
  const platform = os.platform();
  if (platform !== 'win32') {
    return res
      .status(400)
      .json({ error: 'Launching .exe supported only on Windows' });
  }

  const { appId, args } = req.body || {};
  if (!appId || typeof appId !== 'string') {
    return res.status(400).json({ error: 'appId is required' });
  }

  const appDef = apps.find((a) => a.id === appId);
  if (!appDef) {
    return res.status(404).json({ error: 'App not found' });
  }

  const exePath = appDef.path;
  if (!exePath || !fs.existsSync(exePath)) {
    return res.status(400).json({ error: `Executable not found: ${exePath}` });
  }

  const finalArgs = Array.isArray(appDef.args) ? [...appDef.args] : [];
  if (Array.isArray(args)) {
    for (const val of args) {
      if (typeof val === 'string') finalArgs.push(val);
    }
  }

  try {
    const child = spawn(exePath, finalArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      shell: false,
    });
    child.unref();
    console.log(
      `Launched ${appDef.name} (${exePath}) with args: ${finalArgs.join(' ')}`
    );
    res.status(202).json({ ok: true, launched: appDef.id });
  } catch (e) {
    console.error('Failed to launch:', e);
    res.status(500).json({ error: 'Failed to launch', detail: String(e.message || e) });
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(port, host, () => {
  console.log(`Windows Launcher Agent listening at http://${host}:${port}`);
  if (launchToken) {
    console.log('Launch token is enabled (x-launch-token header)');
  }
});