# Full-Stack Web Application (Laravel API + React + Tailwind)

## Structure

- `backend`: Laravel 12 RESTful API with versioned routes under `/api/v1`
- `frontend`: React (Vite) + TailwindCSS SPA consuming the API

## Backend

- PHP 8.4, Composer
- MySQL connection configured via `.env`
- CORS configured in `config/cors.php` with `FRONTEND_URL`

Useful commands:

- Install dependencies: `cd backend && composer install`
- Migrate: `php artisan migrate`
- Serve API: `php artisan serve` (serves at `http://localhost:8000`)
- Routes: `php artisan route:list`
- Tests: `composer test` (coverage: `composer run test:coverage`)

## Frontend

- Install: `cd frontend && npm install`
- Dev: `npm run dev` (default at `http://localhost:5173`)
- Tests: `npm test` (coverage: `npm run test:coverage`)

Tailwind is configured via `tailwind.config.js` and `postcss.config.js`. CSS imports are in `src/index.css`.

## Environment

- Backend `.env` includes MySQL:
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=3306`
  - `DB_DATABASE=app_db`
  - `DB_USERNAME=root`
  - `DB_PASSWORD=secret`
- `FRONTEND_URL` is set to `http://localhost:5173`
- Frontend `.env` sets `VITE_API_URL=http://localhost:8000/api/v1`

## API Examples

- Health: `GET /api/v1/health`
- Users: CRUD at `/api/v1/users`

## Unified tests

Run backend and frontend tests together with coverage:

```
bash -lc "cd backend && composer install && php -v && php -m | grep xdebug | cat; composer run test:coverage && cd ../frontend && npm ci && npm run test:coverage"
```

## GitHub

Initialize a repo and push:

```
cd /workspace
git init
git add .
git commit -m "feat: scaffold Laravel API and React frontend with Tailwind, API v1 routing"
# Create repo and push (requires GitHub auth):
# gh repo create <owner>/<repo> --private --source=. --remote=origin --push
```
