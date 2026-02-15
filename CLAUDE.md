# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online Tractor/Shengji (升级拖拉机) card game — 2 decks, 4 or 6 players. Server-authoritative architecture where the client never computes game logic. Full game rules are in docs/RULES.md; agent constraints are in docs/AGENTS.md.

## Commands

### From repo root
- `pnpm install` — install all workspace dependencies (single lockfile)
- `pnpm -r build` — topological build of all packages
- `pnpm --filter @tractor/engine test` — run engine tests (vitest)
- `pnpm --filter @tractor/server dev` — start WebSocket server (tsx)
- `pnpm --filter @tractor/web dev` — start Vite dev server
- `bash scripts/dev.sh` — start both server and web in parallel

### Running a single test
- `pnpm --filter @tractor/engine exec vitest run src/RulesEngine.test.ts`
- `pnpm --filter @tractor/engine exec vitest run -t "test name"`

## Architecture

pnpm workspaces monorepo under `packages/`:

### `packages/engine/` (`@tractor/engine`) — Pure game rules (zero deps, unit tested)
- **types.ts** — Shared types: `Card`, `Pattern`, `PatternKind`, `Suit`, `SuitGroup`, `Rank`.
- **RulesEngine.ts** — Pure functions: `suitGroup()`, `cardKey()`, `pairKey()`, `seqRankForTractor()`, `analyze()` (pattern detection).
- **Follow.ts** — `validateFollowPlay()`: enforces strict follow rules including tractor fill template.
- **Throw.ts** — `handleLeaderThrow()`: decomposes throws, checks standing, applies strict punish.
- **GameEngine.ts** — Stateful game lifecycle: phases (DEALING → FLIP_TRUMP → BURY_KITTY → TRICK_PLAY → ROUND_SCORE → GAME_OVER).
- **index.ts** — Barrel re-export of all public types and functions.

### `packages/protocol/` (`@tractor/protocol`) — Shared message/state types (zero runtime deps)
- **index.ts** — `ClientMessage`, `ServerMessage`, `PublicRoomState`, `PublicSeat`, `RoundResult`.

### `packages/server/` (`@tractor/server`) — WebSocket + HTTP server
- Depends on `@tractor/engine`, `@tractor/protocol`, `ws`.
- **src/server/ws.ts** — WebSocket room server.
- **src/index.ts** — HTTP static file server + WS bootstrap.

### `packages/web/` (`@tractor/web`) — React + Zustand + Vite
- Depends on `@tractor/protocol`.
- **src/store.ts** — Zustand store for game state.
- **src/wsClient.ts** — WebSocket client with auto-reconnect, TTS, and sessionToken.

### `packages/db/` (`@tractor/db`) — Drizzle ORM schema + PostgreSQL connection
- **src/schema.ts** — Drizzle table definitions: `users`, `matches`, `matchPlayers`, `rounds`, `roundEvents`.
- **src/client.ts** — `createDb(url)` connection factory using `postgres` driver.
- **drizzle.config.ts** — Drizzle Kit migration config.

### `packages/models/` (`@tractor/models`) — Domain repository layer
- **src/users.ts** — User CRUD: guest creation, registration, lookup.
- **src/matches.ts** — Match/round recording and history queries.
- **src/events.ts** — Round event stream recording for replay.
- **src/stats.ts** — Win rate, point aggregation queries.

### `packages/bot/` (`@tractor/bot`) — Placeholder for bot agent
### `packages/analytics/` (`@tractor/analytics`) — Placeholder for analytics

## Dependency Graph

```
engine (0 deps)     protocol (0 deps)
   ↑                    ↑
   ├── server ──────────┤
   ├── bot ─────────────┤
   │                    ├── web
   │                    ├── analytics
   │                    │
   │    db (drizzle+pg) │
   │      ↑             │
   │    models ─────────┘
   │      ↑
   └── server (future integration)
```

## Key Design Rules
- Server is the single source of truth — client must not compute legality.
- Pattern analysis and follow templates must be deterministic (tie-break: low-to-high by key, then lexical by cardId).
- Level-rank cards and jokers do NOT participate in tractor sequences.
- Trump fairness window (default 2000ms) prevents bot speed advantage.
