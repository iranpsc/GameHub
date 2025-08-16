# Deploying Frontend (Vite)

Build:

```bash
npm run build
```

Env:

```
VITE_API_URL=https://gatehide.com/api
```

Serve `dist/` via the same domain as Laravel (gatehide.com). Example Nginx is provided in `release/config/gatehide.nginx.conf`.