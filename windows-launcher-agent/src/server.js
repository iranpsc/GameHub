const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

// Determine application root depending on whether running from pkg executable or source
const isPackaged = !!process.pkg;
const appRoot = isPackaged
  ? path.dirname(process.execPath)
  : path.join(__dirname, '..');

// Load environment from .env located next to the executable/source root
try {
  require('dotenv').config({ path: path.join(appRoot, '.env') });
} catch (_) {}

// Setup basic file logging
const logsDir = path.join(appRoot, 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch (_) {}
const logFilePath = path.join(logsDir, 'agent.log');
let logStream;
try {
  logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
} catch (_) {}

function writeLogLine(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  try { process.stdout.write(line + '\n'); } catch (_) {}
  try { if (logStream) logStream.write(line + '\n'); } catch (_) {}
}

function logInfo(msg) { writeLogLine('INFO', msg); }
function logWarn(msg) { writeLogLine('WARN', msg); }
function logError(msg) { writeLogLine('ERROR', msg); }

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

// Resolve apps.json path (env override or default next to executable)
const envConfigPath = process.env.APP_CONFIG_PATH && String(process.env.APP_CONFIG_PATH).trim() !== ''
  ? path.resolve(process.env.APP_CONFIG_PATH)
  : '';
const defaultAppsConfigPath = path.join(appRoot, 'config', 'apps.json');
const appsConfigPath = envConfigPath || defaultAppsConfigPath;

let apps = [];

function getDefaultConfigArray() {
  return [
    {
      name: 'VLC Player',
      path: 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    },
    {
      name: 'Notepad',
      path: 'C:\\Windows\\System32\\notepad.exe',
    },
  ];
}

function writeDefaultConfig(targetPath, isDefaultLocation) {
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  } catch (_) {}
  const defaultArray = getDefaultConfigArray();
  const json = JSON.stringify(defaultArray, null, 2);
  try {
    fs.writeFileSync(targetPath, json, 'utf8');
  } catch (e) {
    logError(`Failed to write default apps.json at ${targetPath}: ${e.message}`);
    return;
  }
  if (isDefaultLocation) {
    // Required exact warning message for default location
    logWarn('apps.json not found. A default config has been created in ./config/apps.json. Please update it with your applications.');
  } else {
    logWarn(`apps.json not found at ${targetPath}. A default config has been created there. Please update it with your applications.`);
  }
}

function slugifyNameToId(name, existingIds) {
  const base = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app';
  let candidate = base;
  let counter = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${counter++}`;
  }
  existingIds.add(candidate);
  return candidate;
}

function normalizeApps(rawList) {
  const existingIds = new Set();
  const normalized = [];
  for (const entry of rawList) {
    if (!entry || typeof entry !== 'object') continue;
    const name = String(entry.name || '').trim();
    const exePath = String(entry.path || '').trim();
    if (!name || !exePath) continue;
    let id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : '';
    if (!id) {
      id = slugifyNameToId(name, existingIds);
    } else if (existingIds.has(id)) {
      id = slugifyNameToId(`${name}-${id}`, existingIds);
    } else {
      existingIds.add(id);
    }
    const args = Array.isArray(entry.args) ? entry.args.filter((a) => typeof a === 'string') : [];
    normalized.push({ id, name, path: exePath, args });
  }
  return normalized;
}

function loadAppsConfig() {
  const isDefaultLocation = appsConfigPath === defaultAppsConfigPath;

  // Create default if missing
  try {
    if (!fs.existsSync(appsConfigPath)) {
      writeDefaultConfig(appsConfigPath, isDefaultLocation);
    }
  } catch (_) {}

  // Load and parse
  try {
    const raw = fs.readFileSync(appsConfigPath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      logError(`Invalid JSON in apps config (${appsConfigPath}): ${e.message}`);
      writeDefaultConfig(appsConfigPath, isDefaultLocation);
      parsed = getDefaultConfigArray();
    }

    let list;
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && Array.isArray(parsed.apps)) {
      list = parsed.apps;
    } else {
      logError(`Invalid apps config format in ${appsConfigPath}. Replacing with default.`);
      writeDefaultConfig(appsConfigPath, isDefaultLocation);
      list = getDefaultConfigArray();
    }

    apps = normalizeApps(list);
    logInfo(`Loaded ${apps.length} apps from config (${appsConfigPath})`);
  } catch (err) {
    logError(`Failed to load apps config: ${err.message}`);
    // Ensure we still have at least defaults in memory
    try {
      apps = normalizeApps(getDefaultConfigArray());
    } catch (_) {
      apps = [];
    }
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
    logInfo(
      `Launched ${appDef.name} (${exePath}) with args: ${finalArgs.join(' ')}`
    );
    res.status(202).json({ ok: true, launched: appDef.id });
  } catch (e) {
    logError(`Failed to launch: ${String(e && e.message ? e.message : e)}`);
    res.status(500).json({ error: 'Failed to launch', detail: String(e.message || e) });
  }
});

const publicDir = path.join(appRoot, 'public');
app.use(express.static(publicDir));

app.use((req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const server = app.listen(port, host, () => {
  logInfo(`Windows Launcher Agent listening at http://${host}:${port}`);
  if (launchToken) {
    logInfo('Launch token is enabled (x-launch-token header)');
  }
});

function gracefulShutdown(signal) {
  logInfo(`Received ${signal}. Shutting down gracefully...`);
  try { if (logStream) { logStream.write(''); } } catch (_) {}
  server.close(() => {
    logInfo('HTTP server closed. Exiting.');
    try { if (logStream) logStream.end(); } catch (_) {}
    process.exit(0);
  });
  // Force exit if not closed in time
  setTimeout(() => {
    logError('Forcing shutdown after timeout');
    try { if (logStream) logStream.end(); } catch (_) {}
    process.exit(1);
  }, 5000).unref();
}

['SIGINT', 'SIGTERM'].forEach((sig) => {
  try { process.on(sig, () => gracefulShutdown(sig)); } catch (_) {}
});

process.on('uncaughtException', (err) => {
  logError(`Uncaught exception: ${err && err.stack ? err.stack : err}`);
});

process.on('unhandledRejection', (reason) => {
  logError(`Unhandled rejection: ${reason}`);
});