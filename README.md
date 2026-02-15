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

Rules: see RULES.md
Agent constraints: see AGENTS.md

## Repo Structure
- server/
- web/

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
# Web client
VITE_WS_URL=ws://localhost:3000/ws
```
