# Deploying frontend for gatehide.com

- Ensure `.env.production` contains:

```
VITE_API_URL=https://gatehide.com/api
```

- Build:

```
npm run build
```

- Serve `dist/` via your web server at `https://gatehide.com/`.

- For local testing, add to your hosts file:

```
127.0.0.1 gatehide.com
```

and serve with HTTPS locally (self-signed) or use a reverse proxy.