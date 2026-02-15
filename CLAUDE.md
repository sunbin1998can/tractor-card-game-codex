# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online Tractor/Shengji (升级拖拉机) card game — 2 decks, 4 or 6 players. Server-authoritative architecture where the client never computes game logic. Full game rules are in RULES.md; agent constraints are in AGENTS.md.

## Commands

### Server (from `server/`)
- `pnpm test` — run all tests (vitest)
- `pnpm vitest run src/engine/RulesEngine.test.ts` — run a single test file
- `pnpm vitest run -t "test name"` — run a single test by name
- `pnpm dev` — start WebSocket server (tsx)

### Web client (from `web/`)
- `pnpm dev` — start Vite dev server
- `pnpm build` — production build
- Env: `VITE_WS_URL=ws://localhost:3000/ws`

## Architecture

Two independent packages (no monorepo tooling — run pnpm install separately in each):

### `server/src/engine/` — Core game logic (unit tested)
- **RulesEngine.ts** — Pure functions: `suitGroup()`, `cardKey()`, `pairKey()`, `seqRankForTractor()`, `analyze()` (pattern detection). Determines card ordering, trump membership, and pattern classification (SINGLE/PAIR/TRACTOR/THROW).
- **Follow.ts** — `validateFollowPlay()`: enforces strict follow rules including tractor fill template (longest tractor segment → pairs → singles, low-to-high).
- **Throw.ts** — `handleLeaderThrow()`: decomposes throws, checks standing against all opponents' hands, applies strict punish (smallest part) if not standing.
- **GameEngine.ts** — Stateful game lifecycle: phases (DEALING → FLIP_TRUMP → BURY_KITTY → TRICK_PLAY → ROUND_SCORE → GAME_OVER), trick management, scoring (5/10/K points), kitty multipliers (2x/4x), level upgrades (80/120/160 thresholds).
- **types.ts** — Shared types: `Card`, `Pattern`, `PatternKind`, `Suit`, `SuitGroup`, `Rank`.

### `server/src/server/ws.ts` — WebSocket room server

### `web/src/` — React + Zustand + Vite
- **store.ts** — Zustand store for game state
- **wsClient.ts** — WebSocket client with auto-reconnect and sessionToken

## Key Design Rules
- Server is the single source of truth — client must not compute legality.
- Pattern analysis and follow templates must be deterministic (tie-break: low-to-high by key, then lexical by cardId).
- Level-rank cards and jokers do NOT participate in tractor sequences.
- Trump fairness window (default 2000ms) prevents bot speed advantage.
