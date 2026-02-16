# Tractor Online (升级拖拉机) — Two Decks

Online Tractor/Shengji game:
- 2 decks
- 4 or 6 players
- Flip/Snatch trump with fairness window
- Strict follow + tractor fill template
- Scoring 5/10/K
- Kitty multipliers 2x/4x
- Upgrade thresholds 80(+1), 120(+2), 160(+3)
- Game ends when reaching/passing A

Rules: see [docs/RULES.md](docs/RULES.md)
Agent constraints: see [docs/AGENTS.md](docs/AGENTS.md)
Game guide: see [docs/game-guide.md](docs/game-guide.md)

## Repo Structure

pnpm workspaces monorepo under `packages/`:

| Package | Description |
|---------|-------------|
| `packages/engine/` (`@tractor/engine`) | Pure game rules — zero deps, unit tested (types, pattern analysis, follow/throw logic, game lifecycle) |
| `packages/protocol/` (`@tractor/protocol`) | Shared message & state types — zero runtime deps |
| `packages/server/` (`@tractor/server`) | WebSocket + HTTP server (depends on engine, protocol, ws) |
| `packages/web/` (`@tractor/web`) | React + Zustand + Vite SPA client |
| `packages/db/` (`@tractor/db`) | Kysely schema + PostgreSQL connection + migrations |
| `packages/models/` (`@tractor/models`) | Domain repository layer (users, matches, stats, ratings) |
| `packages/bot/` (`@tractor/bot`) | Placeholder for bot agent |
| `packages/analytics/` (`@tractor/analytics`) | Placeholder for analytics |

Other top-level files:
- `Dockerfile` — Multi-stage production build
- `railway.toml` — Railway deployment config
- `flake.nix` / `.envrc` — Nix dev environment
- `scripts/dev.sh` — One-command local dev startup (see Development below)

## Prerequisites

**Option A — Nix + direnv (recommended)**

The repo includes a Nix flake that provides Node.js 22 and pnpm. If you have [Nix](https://nixos.org/download/) (with flakes enabled) and [direnv](https://direnv.net/):

```bash
# First time: allow the .envrc
direnv allow

# That's it — node and pnpm are now available in this directory
node --version   # v22.x
pnpm --version   # latest
```

> If you don't use direnv, you can manually enter the shell with `nix develop`.

**Option B — Manual install**

Install [Node.js](https://nodejs.org/) (v22+) and [pnpm](https://pnpm.io/) (v9+) yourself.

## Development

### One-command startup

```bash
bash scripts/dev.sh
```

`dev.sh` handles everything: installs dependencies, starts PostgreSQL, runs migrations, seeds sample users, and launches both the server and Vite web client with hot reload.

**PostgreSQL backends** (tried in order):
1. **Docker** (default) — creates/starts a `tractor-pg` container with PostgreSQL 16
2. **pg_ctl** fallback — used automatically inside a Nix shell (`nix develop`) when Docker isn't available
3. **`--no-db`** flag — skip PostgreSQL entirely and run in memory-only mode: `bash scripts/dev.sh --no-db`

**Port auto-finding:** If ports 3000 (server) or 5173 (web) are in use, `dev.sh` auto-increments to find an available port.

**Debug page:** In dev mode, navigate to `/#/debug` for a component showcase / visual test page. A toast linking to it appears briefly on startup.

### Manual startup

```bash
pnpm install
pnpm -r build

# Terminal 1 — server
pnpm --filter @tractor/server dev

# Terminal 2 — web
pnpm --filter @tractor/web dev
```

### Env
```bash
# Web client (defaults to ws://localhost:3000/ws)
VITE_WS_URL=ws://localhost:3000/ws
```

## Deployment (Railway)

The app is deployed on [Railway](https://railway.com/) using a multi-stage Dockerfile. Both the static SPA and WebSocket server run on a single port (3000).

**Docker build locally:**
```bash
docker build -t tractor-game .
docker run -p 3000:3000 tractor-game
# Visit http://localhost:3000
```

**Railway settings:**
- **Builder**: Dockerfile
- **Root Directory**: `/`
- **Public Networking**: Generate a domain, target port `3000`
- Build and start commands are handled by the Dockerfile — leave them blank
