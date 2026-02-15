# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added — Database & Persistence Layer (#9)
- `@tractor/db` package: Drizzle ORM schema with PostgreSQL tables for `users`, `matches`, `match_players`, `rounds`, `round_events`, `user_ratings`
- `@tractor/models` package: repository layer with user CRUD (guest + OAuth), match/round recording, event stream capture, stats/aggregation queries, and ELO ratings
- OAuth-ready auth model (`oauth_provider` + `oauth_id` on users) for future social login (WeChat, Google, etc.)
- `round_events` table with hybrid design: `payload` jsonb for full replay data + `cards text[]` column with GIN index for queryable card analysis
- `user_ratings` table with ELO rating, deviation, match count, and peak tracking
- Level progression stats: `totalLevelUps`, `biggestLevelJump`
- Team-aware attacker/defender role detection in stats (uses banker's team, not just banker seat)

## 2025-02-15

### Changed — Restructure into pnpm Workspaces Monorepo (#7)
- Reorganized from two independent packages (`server/`, `web/`) into a pnpm workspaces monorepo under `packages/`
- Extracted `@tractor/engine` (pure game rules, zero deps) and `@tractor/protocol` (shared message/state types)
- Deduplicated `ClientMessage`/`ServerMessage`/`PublicRoomState` types into single `@tractor/protocol` package
- Added `@tractor/bot` and `@tractor/analytics` placeholder packages

### Changed — UI/UX Overhaul (#6)
- Green felt theme with radial gradient background, glass panels, wood-brown buttons
- SVG playing cards via `@heruka_urgyen/react-playing-cards` with custom joker rendering
- Elliptical felt table layout with `GameTable` + `SeatCard` components replacing `PlayersBar`
- Hand fan arc with per-card rotation, parabolic lift, and spring dealing animations
- Trick animations from player seats to table center with spring physics
- Mobile responsive: tablet (900px) and phone (600px) breakpoints, horizontal scroll hand, collapsible chat, 48px touch targets
- ScoreBoard restyled as slim top bar with Leave button

### Fixed — Server Startup (#5)
- Removed import of deleted `../rules/factory` in `ws.ts`; replaced with direct `new GameEngine()` construction
- Smart port detection in `dev.sh`: auto-increment ports if in use, dynamic `VITE_WS_URL`, proper cleanup of child processes
