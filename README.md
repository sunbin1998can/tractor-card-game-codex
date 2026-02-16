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
- `server/` — Node.js WebSocket server + game engine (TypeScript, Vitest)
- `web/` — React SPA client (Vite, Zustand)
- `Dockerfile` — Multi-stage production build
- `railway.toml` — Railway deployment config
- `flake.nix` / `.envrc` — Nix dev environment

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

## Quick Start (Local)
```bash
cd server
pnpm install
pnpm test
pnpm dev

# In another terminal:
cd web
pnpm install
pnpm dev
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
