# CheckMeMS — hosted demo

This repository has two deployment modes:

| Mode | Compose file | Auth | Intended for |
|---|---|---|---|
| Full stack | `docker-compose.yml` | Keycloak + JWT | local development / portfolio code review |
| Public demo | `docker-compose.demo.yml` | no login | recruiters clicking a hosted link |

The demo does **not** delete or bypass the real authentication code. It adds a
Spring `demo` profile and an Angular `demo` build configuration, both selected
only by the demo stack. The full stack still runs the normal Keycloak/JWT path.

## Run the demo

```bash
docker compose -f docker-compose.demo.yml up -d --build
```

Then open `http://localhost` (or `http://<your-vps-ip>`).

Only the web container publishes a port. The API is served from the same origin
at `/api` by nginx, which forwards to the gateway inside the Compose network, so
there are no hardcoded hostnames and no CORS configuration in the demo.

Recommended VPS size: **4 GB RAM / 2 vCPU**. 8 GB is comfortable if you expect
several simultaneous Stockfish reviews.

## What works without login

- Play vs Stockfish
- Puzzles, openings, lessons
- Dashboard (games are stored per browser)
- Game review / Stockfish analysis
- Live move analysis while playing

`/auth/login` and `/auth/register` redirect to the home page.

## How the demo identity works

1. The Angular demo build (`app-config.demo.ts`) sets `demoMode: true`.
2. `AuthService` creates a stable per-browser id under `checkme.demo.user-id`
   and marks the session as authenticated without storing a JWT.
3. The auth interceptor sends `X-Demo-User: demo-<uuid>` on every API request.
4. `games-service` and `move-analysis-service` run the `demo` Spring profile.
   `DemoAuthenticationFilter` turns that header into a real
   `Authentication` principal with `ROLE_DEMO`.
5. `games-service` forwards the same header when it calls the analysis service,
   so game ownership and analysis ownership line up.

Because the principal is per browser, visitors do not see each other's game
history or analysis results. Clearing site data creates a new demo identity.

## TLS / custom domain

The demo Compose file publishes plain HTTP on `WEB_PORT`. If you use Caddy,
Traefik, or a host nginx for HTTPS, point it at `127.0.0.1:${WEB_PORT}` and keep
`/api` on the same hostname. The Angular bundle calls `/api` relatively, so no
rebuild is needed when the domain changes.

## Run the full authenticated stack

```bash
docker compose up -d --build
```

Keycloak is published at `http://localhost:8085`, the web app at
`http://localhost:4200`, and the gateway at `http://localhost:8081`.

## Local demo build

```bash
cd chess-web
npm install
npm run start:demo
```

The dev server uses `proxy.conf.json` to forward `/api` to
`http://localhost:8081`, so run the gateway (and the backend services) locally.

To produce the same bundle as the container:

```bash
npm run build:demo
```

## Demo defaults you may want to tune

Set these in a `.env` file next to the Compose file, or export them:

```dotenv
WEB_PORT=80
POSTGRES_PASSWORD=change-me
STOCKFISH_POOL_SIZE=1
STOCKFISH_THREADS=2
STOCKFISH_HASH=128
STOCKFISH_DEPTH=12
ANALYSIS_WORKER_CONCURRENCY=1
```

The defaults are deliberately conservative. A public analysis endpoint is
CPU-heavy; consider adding a reverse-proxy rate limit before sharing the link
widely.

## Why some services are missing from the demo stack

- `keycloak` — the demo profile never calls it.
- `user-profile-service` — only used by login/register/profile endpoints.
- `learning-service` — currently has no HTTP endpoints used by the web app.
- `kafka-service` (events) — not called by the web app; the Kafka broker is
  still present because live analysis uses it.

The full `docker-compose.yml` keeps all of them.
