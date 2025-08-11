# Windows Launcher Agent

Local HTTP agent to launch whitelisted Windows programs via a web UI.

## Quick start (Windows)

1. Install Node.js (LTS): https://nodejs.org
2. Clone or copy this folder to your machine.
3. Open PowerShell in the project folder and run:

```powershell
scripts\install-as-scheduled-task.ps1
```

This installs a Scheduled Task that starts the agent at logon and immediately starts it.

- Dashboard: http://localhost:5000
- API:
  - GET `/health`
  - GET `/apps`
  - POST `/launch` with JSON `{ "appId": "notepad", "args": ["optional", "args"] }`

## Security

- Listens only on 127.0.0.1 by default.
- Optionally enforce a token by setting `LAUNCH_TOKEN` in `.env` and adding header `x-launch-token` in requests.

## Configure apps

Edit `config/apps.json`:

```json
{
  "apps": [
    { "id": "notepad", "name": "Notepad", "path": "C:\\Windows\\System32\\notepad.exe", "args": [] }
  ]
}
```

## Uninstall

```powershell
scripts\uninstall-scheduled-task.ps1
```

## Manual run (for development)

```bash
npm install
npm start
```