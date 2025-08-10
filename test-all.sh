#!/usr/bin/env bash
set -euo pipefail

# Backend
cd "$(dirname "$0")/backend"
if ! command -v composer >/dev/null 2>&1; then
  echo "[warn] composer not found; skipping backend install. Ensure PHP/Composer/Xdebug are installed for coverage." >&2
else
  composer install --no-interaction --no-progress
  php -d xdebug.mode=coverage -d xdebug.start_with_request=yes vendor/bin/phpunit --coverage-text
fi

# Frontend
cd ../frontend
npm install --no-audit --no-fund
npm run test:coverage