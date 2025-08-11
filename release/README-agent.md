# Windows Launcher Agent

Local HTTP agent to launch whitelisted Windows programs via a web UI.

## Quick start (packaged EXE)

- Place `GameNet_Agent.exe` anywhere (e.g., `C:\GameNet`).
- On first run, the agent will automatically:
  - Create `logs\agent.log`
  - Ensure `config\apps.json` exists (a default with Notepad is created if missing)
  - Create `.env` with default `PORT`/`HOST` if missing
  - On Windows, when running as an EXE, attempt to install a Scheduled Task to auto-start at logon (can be disabled with `AUTO_INSTALL_TASK=false` in `.env`).
- Dashboard: http://localhost:5000
- API:
  - GET `/health`
  - GET `/apps`
  - POST `/launch` with JSON `{ "appId": "notepad", "args": ["optional", "args"] }`

Notes:
- To require an auth token, set `LAUNCH_TOKEN` in `.env` and include header `x-launch-token` in requests.
- To change the scheduled task name, set `TASK_NAME=GameNetAgent` in `.env`.

## Quick start (Node.js source)

1. Install Node.js (LTS): https://nodejs.org
2. Clone or copy this folder to your machine.
3. Optional: Install as a Scheduled Task (auto-start at logon):

```powershell
scripts\install-as-scheduled-task.ps1
```

This installs a Scheduled Task that starts the agent at logon and immediately starts it.

## Configure apps

Edit `config/apps.json`:

```json
{
  "apps": [
    { "id": "notepad", "name": "Notepad", "path": "C:\\Windows\\System32\\notepad.exe", "args": [] }
  ]
}
```

## Security

- Listens only on 127.0.0.1 by default.
- Optionally enforce a token by setting `LAUNCH_TOKEN` in `.env` and adding header `x-launch-token` in requests.

## Uninstall (Node.js task)

```powershell
scripts\uninstall-scheduled-task.ps1
```

## Manual run (for development)

```bash
npm install
npm start
```