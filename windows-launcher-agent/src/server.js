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
function logError(msg) { writeLogLine('ERROR', msg); }

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5000);
const launchToken = process.env.LAUNCH_TOKEN || '';

// --- First-run setup: ensure config exists, create defaults, and optionally auto-install Scheduled Task on Windows
const configDir = path.join(appRoot, 'config');
const appsConfigPath = path.join(configDir, 'apps.json');

function ensureConfigDir() {
  try {
    fs.mkdirSync(configDir, { recursive: true });
  } catch (err) {
    logError(`Failed to create config directory: ${err.message}`);
  }
}

function createDefaultEnvIfMissing() {
  const envPath = path.join(appRoot, '.env');
  if (!fs.existsSync(envPath)) {
    const contents = [
      `# Auto-generated on first run`,
      `PORT=${port}`,
      `HOST=${host}`,
      `# LAUNCH_TOKEN=your-strong-token`,
      `# Set LAUNCH_TOKEN and restart the agent to require x-launch-token header`,
      `# Set AUTO_INSTALL_TASK=false to skip automatic Scheduled Task setup`,
    ].join('\n');
    try {
      fs.writeFileSync(envPath, contents, 'utf8');
      logInfo('Created .env with defaults');
    } catch (err) {
      logError(`Failed to create .env: ${err.message}`);
    }
  }
}

function createDefaultAppsIfMissing() {
  if (!fs.existsSync(appsConfigPath)) {
    const defaultApps = {
      apps: [
        { id: 'notepad', name: 'Notepad', path: 'C\\\\Windows\\\\System32\\\\notepad.exe', args: [] },
      ],
    };
    try {
      fs.writeFileSync(appsConfigPath, JSON.stringify(defaultApps, null, 2), 'utf8');
      logInfo(`Created default apps config at ${appsConfigPath}`);
    } catch (err) {
      logError(`Failed to create default apps.json: ${err.message}`);
    }
  }
}

function installScheduledTaskIfMissing() {
  const platform = os.platform();
  const autoInstall = String(process.env.AUTO_INSTALL_TASK || 'true').toLowerCase() !== 'false';
  if (!isPackaged || platform !== 'win32' || !autoInstall) {
    return;
  }

  // Attempt to register a Scheduled Task to auto-start the packaged EXE on logon
  const exePath = process.execPath;
  const taskName = process.env.TASK_NAME || 'GameNetAgent';

  // PowerShell script to check/install the task
  const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$tn = '${taskName}'
$existing = Get-ScheduledTask -TaskName $tn -ErrorAction SilentlyContinue
if ($existing) { exit 0 }
$action = New-ScheduledTaskAction -Execute '${exePath.replace(/'/g, "''")}'
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
try {
  Register-ScheduledTask -TaskName $tn -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
  Start-ScheduledTask -TaskName $tn | Out-Null
  exit 0
} catch {
  Write-Output $_
  exit 1
}`;

  try {
    const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      stdio: 'ignore',
      windowsHide: true,
      shell: false,
    });
    ps.on('exit', (code) => {
      if (code === 0) {
        logInfo(`Scheduled Task '${taskName}' ensured (auto-start on logon)`);
      } else {
        logError(`Failed to install Scheduled Task automatically. Run as Administrator or execute scripts/install-as-scheduled-task.ps1`);
      }
    });
  } catch (err) {
    logError(`Error invoking PowerShell for Scheduled Task: ${err.message}`);
  }
}

function runFirstRunSetup() {
  ensureConfigDir();
  createDefaultEnvIfMissing();
  createDefaultAppsIfMissing();
  installScheduledTaskIfMissing();
}

runFirstRunSetup();

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

const appsConfigPath_OLD = path.join(appRoot, 'config', 'apps.json');
let apps = [];
function loadAppsConfig() {
  try {
    const raw = fs.readFileSync(appsConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.apps)) {
      throw new Error('Invalid apps config format');
    }
    apps = parsed.apps;
    logInfo(`Loaded ${apps.length} apps from config`);
  } catch (err) {
    logError(`Failed to load apps config: ${err.message}`);
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