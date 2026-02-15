# AGENTS.md — Project Rules for Codex / Agents

This repo implements an online Tractor (升级/拖拉机) game.
Agents MUST follow the rules in RULES.md and the engineering constraints below.

## 1) Golden Rules
1. **Server authoritative**:
   - The server is the only source of truth for legality, scoring, phase, turn, and outcomes.
   - The client MUST NOT compute legality beyond matching selected cards to server-provided `legalActions`.

2. **Public vs Private data**:
   - Server broadcasts public events to all players (e.g., TRICK_UPDATE, TRICK_END, ROUND_RESULT).
   - Private data (hand cards, legal actions) MUST be sent only to the owning player.
   - Never leak other players' hand contents to clients.

3. **Determinism**:
   - Pattern analysis, decomposition, follow templates, and throw decomposition must be deterministic.
   - If multiple valid choices exist, define a stable tie-break (e.g., low-to-high by key, then lexical by cardId).

4. **Fairness window for trump**:
   - Flip/snatch trump uses a server-enforced fairness window (default 2000ms).
   - Trump locks only after the window ends, choosing the strongest candidate.
   - This prevents bot speed advantage.

5. **Level cards do not form tractor sequences**:
   - Level-rank cards are TRUMP but **do not participate in tractor consecutive sequence**.
   - Jokers also do not participate in tractor sequences.

6. **Strict follow**:
   - Must follow suitGroup when possible.
   - Must follow structure (PAIR/TRACTOR) when possible.
   - When following a tractor but cannot match full tractor:
     - Enforce deterministic fill template: longest tractor segment → pairs → singles (low-to-high).
     - Mixed (pairs+singles) is allowed only for this insufficient-tractor case.

7. **Throw (甩牌) strict punish**:
   - Only leader may attempt throw.
   - Throw must be one suitGroup only.
   - Validate “standing” using server-known hands.
   - If not standing: strict punish to the smallest part; broadcast `THROW_PUNISHED`.

8. **Scoring and upgrading**:
   - Points: 5/10/K.
   - Kitty kill multiplier: 2x, double-kill 4x (PAIR/TRACTOR last trick).
   - Upgrade thresholds: 80(+1), 120(+2), 160(+3); else banker +1.
   - Game ends when reaching/passing A.

## 2) Repo Structure

pnpm workspaces monorepo under `packages/`:

- `packages/engine/` (`@tractor/engine`) — Pure game rules, zero deps, unit tested
  - `types.ts`, `RulesEngine.ts`, `Follow.ts`, `Throw.ts`, `GameEngine.ts`
- `packages/protocol/` (`@tractor/protocol`) — Shared message/state types, zero deps
  - `ClientMessage`, `ServerMessage`, `PublicRoomState`, `PublicSeat`, `RoundResult`
- `packages/server/` (`@tractor/server`) — WebSocket + HTTP server
  - `src/server/ws.ts` — WebSocket room server
  - `src/index.ts` — HTTP static file server + WS bootstrap
- `packages/web/` (`@tractor/web`) — React + Zustand + Vite
  - Zustand store, GameTable/SeatCard/Hand components, SVG playing cards
  - ws client with auto-reconnect, TTS, and sessionToken
- `packages/db/` (`@tractor/db`) — Drizzle ORM schema + PostgreSQL connection
  - `users`, `matches`, `matchPlayers`, `rounds`, `roundEvents`, `userRatings` tables
- `packages/models/` (`@tractor/models`) — Domain repository layer
  - User CRUD (guest + OAuth), match/round recording, event replay, stats, ratings
- `packages/bot/` (`@tractor/bot`) — Placeholder for bot agent
- `packages/analytics/` (`@tractor/analytics`) — Placeholder for analytics

## 3) Event Protocol Requirements
...
(continued — same as full AGENTS.md you received earlier)
