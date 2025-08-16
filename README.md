# Web-based GameNet Management System

A full-stack system for managing an internet/gaming café: users can register, log in, view and recharge their balances, and launch approved Windows programs from a kiosk-like dashboard. Admins can manage users, review logs/sessions, and perform account recharges. The system consists of a Laravel REST API, a React SPA frontend, and a Windows Launcher Agent (local Node.js service) to safely launch whitelisted applications.

## Architecture

- Backend: Laravel 12 REST API under `/api` and `/api/v1` (PHP 8.2+)
- Frontend: React (Vite) + TailwindCSS SPA
- Windows Agent: Local Node.js HTTP service to launch whitelisted programs on Windows
- Database: MySQL
- Payments: Zarinpal only

---

## Features

Based on use cases 1–7:

1. User Registration & Authentication
   - Register, Login, Logout (Sanctum tokens)
   - Password reset (initiation endpoint)
2. User Account & Balance
   - View current balance via `/api/user/balance` or `/api/v1/user/balance`
3. Online Recharge (Payments)
   - Start payment via `/api/payment/start` (Zarinpal)
   - Handle gateway callback via `/api/payment/callback`
4. Program Launching (Windows Agent)
   - Local agent exposes `/health`, `/apps`, and `/launch` to start whitelisted apps
   - Optional token protection via `LAUNCH_TOKEN`
5. Admin Operations
   - Admin recharge: `/api/admin/recharge`
   - Admin logs: `/api/admin/logs`
   - User sessions: `/api/admin/sessions`
6. Kiosk Mode Operation (Front-of-house terminals)
   - Run the frontend in full-screen kiosk mode, integrated with the Windows Agent
7. Health & Monitoring
   - API health endpoint: `/api/v1/health`

Technologies: Laravel, React, TailwindCSS, MySQL, Node.js (Windows Agent), Zarinpal

---

## Installation Guide

### Download Windows Agent

- Download the prebuilt Windows Agent: [Download Windows Agent](./release/GameNet_Agent.exe)

Steps to install on each GameNet PC:
- Place `GameNet_Agent.exe` anywhere (e.g., `C:\GameNet`)
- First run will automatically:
  - Create a `logs` folder and `logs/agent.log`
  - Ensure `config\apps.json` exists (a default with Notepad is created if missing)
  - Create `.env` with default `PORT`/`HOST` if missing
  - Attempt to auto-install a Scheduled Task to start at logon (disable with `AUTO_INSTALL_TASK=false` in `.env`)
- Agent endpoints (on the same PC):
  - `GET http://localhost:5000/health`
  - `GET http://localhost:5000/apps`
  - `POST http://localhost:5000/launch` with JSON `{ "appId": "notepad", "args": [] }`
- Optional security: next to the exe, create `.env` with `LAUNCH_TOKEN=your-strong-token`, then add header `x-launch-token` to requests

Manual Scheduled Task setup (if auto-install is disabled or fails):

```powershell
$exe = "C:\\GameNet\\GameNet_Agent.exe"  # update path as needed
$action = New-ScheduledTaskAction -Execute $exe
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "GameNetAgent" -Action $action -Trigger $trigger -Principal $principal -Settings $settings
Start-ScheduledTask -TaskName "GameNetAgent"
```

### Prerequisites

- PHP 8.2+ and Composer
- MySQL 8+
- Node.js 18+ and npm
- Git
- Windows machine (for the Windows Launcher Agent)

### 1) Backend (Laravel API)

```bash
cd backend
composer install
cp .env.example .env  # if not present
php artisan key:generate
```

Edit `backend/.env` (production values shown):

```env
APP_NAME="GameNet"
APP_URL=https://gatehide.com
FRONTEND_URL=https://gatehide.com

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gatehide_db
DB_USERNAME=gatehide_user
DB_PASSWORD=your-db-password

# Payments (Zarinpal only)
PAYMENT_GATEWAY=zarinpal
PAYMENT_CALLBACK_URL="${APP_URL}/api/payment/callback"
ZARINPAL_MERCHANT_ID=
ZARINPAL_BASE_URL=https://api.zarinpal.com/pg/v4
ZARINPAL_GATEWAY_BASE=https://www.zarinpal.com/pg/StartPay
ZARINPAL_SANDBOX=false
```

Run migrations:

```bash
php artisan migrate
```

Start the API (dev):

```bash
php artisan serve  # http://localhost:8000
```

### 2) Frontend (React + Vite)

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=https://gatehide.com/api
```

Run the dev server:

```bash
npm run dev  # http://localhost:5173
```

Build for production:

```bash
npm run build
npm run preview  # optional local preview
```

### 3) Windows Launcher Agent (Node.js)

On the Windows machine where programs should be launched:

- Install Node.js (LTS)
- Copy the folder `windows-launcher-agent` to the Windows machine

Configure allowed apps in `windows-launcher-agent/config/apps.json`:

```json
{
  "apps": [
    { "id": "notepad", "name": "Notepad", "path": "C:\\Windows\\System32\\notepad.exe", "args": [] }
  ]
}
```

Optional security (recommended): set a token in `windows-launcher-agent/.env`:

```env
LAUNCH_TOKEN=choose-a-strong-random-token
```

Install as a Scheduled Task (auto-start at logon):

```powershell
# In PowerShell from windows-launcher-agent folder
scripts\install-as-scheduled-task.ps1
```

Uninstall:

```powershell
scripts\uninstall-scheduled-task.ps1
```

Manual dev run:

```bash
cd windows-launcher-agent
npm install
npm start  # http://localhost:5000
```

---

## Usage Instructions

### Development mode

- Start backend: `cd backend && php artisan serve` → `http://localhost:8000`
- Start frontend: `cd frontend && npm run dev` → `http://localhost:5173`
- Start Windows Agent on the Windows kiosk PC: `npm start` in `windows-launcher-agent` → `http://localhost:5000`

Ensure `backend/.env` has `FRONTEND_URL=https://gatehide.com` for CORS, and `frontend/.env` uses `VITE_API_URL=https://gatehide.com/api` (or `https://api.gatehide.com` if using subdomain).

### Production mode (outline)

- Backend
  - Set `APP_ENV=production` and `APP_DEBUG=false`
  - `php artisan config:cache && php artisan route:cache`
  - Serve `backend/public` via Nginx/Apache with HTTPS
- Frontend
  - `npm run build` and serve the built `frontend/dist` via the same domain
  - Set `VITE_API_URL` to the public API URL
- Windows Agent
  - Install Scheduled Task via `scripts/install-as-scheduled-task.ps1`
  - Set `LAUNCH_TOKEN` and configure allowed apps

### Nginx configuration (gatehide.com)

Use the canonical config in `release/config/gatehide.nginx.conf`. Place under `/etc/nginx/sites-available/gatehide.com` and symlink to `sites-enabled`.

```
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name gatehide.com www.gatehide.com;
    return 301 https://gatehide.com$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gatehide.com;

    # SSL certs (replace with your actual paths or use Certbot)
    ssl_certificate /etc/letsencrypt/live/gatehide.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gatehide.com/privkey.pem;

    # Default document root for PHP (Laravel)
    root /var/www/gatehide/backend/public;
    index index.php index.html;

    # Frontend (Vite build) served at root
    location / {
        root /var/www/gatehide/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Laravel API under /api
    location ^~ /api {
        try_files $uri /index.php?$query_string;
    }

    # PHP handling
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock; # adjust PHP version/socket
        fastcgi_index index.php;
    }

    # Security headers (tune as needed)
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

Quick commands (run on the server after deploying to `/var/www/gatehide`):

```bash
sudo ln -sf /var/www/gatehide/release/config/gatehide.nginx.conf /etc/nginx/sites-available/gatehide.com
sudo ln -sf /etc/nginx/sites-available/gatehide.com /etc/nginx/sites-enabled/gatehide.com
sudo nginx -t && sudo systemctl reload nginx
# SSL (if not using DirectAdmin's built-in Let's Encrypt)
sudo certbot --nginx -d gatehide.com -d www.gatehide.com
```

### DirectAdmin with Nginx (preferred and fastest)

- Enable Nginx Reverse Proxy in DirectAdmin (Admin Level → CustomBuild → `nginx_apache` or pure `nginx`).
- Create domain `gatehide.com`.
- Upload build artifacts and backend to:
  - `/domains/gatehide.com/public_html/` → frontend `dist` files
  - `/domains/gatehide.com/private/backend` → entire `backend/` project (outside web root)
- Install PHP 8.2 for the domain.
- Run from SSH (User level):
  ```bash
  cd ~/domains/gatehide.com/private/backend
  composer install --no-dev --optimize-autoloader --no-interaction
  cp .env.example .env && php artisan key:generate
  php artisan migrate --force
  php artisan config:cache && php artisan route:cache
  ```
- Configure Nginx per-domain custom config snippet (DirectAdmin → Custom HTTPD Config → Nginx):
  - Paste the `server` block content from `release/config/gatehide.nginx.conf` but adjust paths to:
    - `root /home/USERNAME/domains/gatehide.com/public_html;` for frontend
    - PHP location uses `fastcgi_pass unix:/var/run/php/php8.2-fpm-USERNAME.sock;` (DirectAdmin path varies)
    - Map `/api` to `alias /home/USERNAME/domains/gatehide.com/private/backend/public;` OR set `document_root` to backend public and serve frontend via `location / { root ... }`
- Set envs:
  - Backend `.env`: `APP_URL=https://gatehide.com`, `FRONTEND_URL=https://gatehide.com`, DB creds, Zarinpal keys
  - Frontend `.env`: `VITE_API_URL=https://gatehide.com/api`
- SSL: enable Let’s Encrypt in DirectAdmin for `gatehide.com` and `www.gatehide.com`.

### DirectAdmin (Apache-only fallback)

- Use subdomain `api.gatehide.com` for Laravel; point document root to `private/backend/public`.
- Frontend `dist` → `public_html/` of `gatehide.com`.
- Add SPA fallback rules to `public_html/.htaccess` from `release/config/htaccess-frontend-spa.txt`.
- Backend `.env`: `APP_URL=https://api.gatehide.com`, `FRONTEND_URL=https://gatehide.com`.
- Frontend `.env`: `VITE_API_URL=https://api.gatehide.com`.

Notes:
- Ensure PHP 8.2 is selected and `composer install` is run in `backend/`.
- Create DB in DirectAdmin and set creds in `.env`.
- Run `php artisan migrate --force`.

---

## Testing

### Backend

```bash
cd backend
composer test            # runs test suite
composer run test:coverage  # requires Xdebug for coverage
```

### Frontend

```bash
cd frontend
npm test
npm run test:coverage
```

### Unified (both)

```bash
./test-all.sh
```

Coverage tips:
- Ensure Xdebug is installed and enabled for PHP to get backend coverage

---

## Contribution Guidelines

- Branching
  - Use feature branches: `feature/<short-description>`
  - Keep `main` stable; open PRs from feature branches
- Pull Requests
  - Write clear descriptions and link related issues
  - Require passing tests and linters before merge
  - Use code review; address comments before merging
- Coding Standards
  - Backend: follow Laravel conventions; run `vendor/bin/pint` if configured
  - Frontend: ESLint rules; prefer functional components and hooks
- Tests
  - Add/maintain unit and integration tests for new features

---

## License

License: TBD (provided by the project owner). Update this section once the license is chosen.
