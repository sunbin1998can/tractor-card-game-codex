# Plan: Fix All Game Engine Gaps and Bugs

## Context

The Shengji/Tractor engine in `server/src/engine/` has 12 documented gaps (RULES.md Appendix A) ranging from bugs in existing logic to missing standard rules. This plan addresses all of them, organized into phases that each leave tests passing.

## Phase 1: Foundation Fixes (isolated, no cross-dependencies)

### 1A: Gap bridging for tractor sequences (RULES.md #1, Bug)
**Files**: `RulesEngine.ts`, `RulesEngine.test.ts`

`seqRankForTractor()` returns null for levelRank but doesn't compress the gap. When level=7, ranks 6 and 8 have seqRanks 6 and 8 — they fail the `+1` consecutive check.

**Fix**: Adjust ranks above levelRank down by 1:
```ts
export function seqRankForTractor(rank: Rank, levelRank: Rank): number | null {
  if (rank === 'BJ' || rank === 'SJ') return null;
  if (rank === levelRank) return null;
  const rv = RANK_VALUE[rank];
  const lv = RANK_VALUE[levelRank];
  return rv > lv ? rv - 1 : rv;
}
```

All callers in `Follow.ts` (`maxTractorLen`, `buildExpectedInsufficient`) and `Throw.ts` (`bestTractorTopKey`) use seqRanks only for consecutiveness checks, so they benefit automatically.

**Tests**: Update expected value in `seqRankForTractor excludes level and jokers`; add tests for gap-bridged tractors (6-6-8-8 at level=7).

### 1B: Kitty multiplier — exponential (RULES.md #10)
**Files**: `GameEngine.ts`, `GameEngine.test.ts`

Currently flat 2x/4x. Standard: `2 × 2^(numPairs)`.

**Fix**: Add `lastTrickLeadPairCount` field to GameEngine. Set it in `finishTrick()` based on lead pattern kind/length. In `finishRound()`: `killMultiplier = 2 * Math.pow(2, this.lastTrickLeadPairCount)`.

**Tests**: Update pair test to set pairCount=1; add 2-pair tractor (8x) and 3-pair tractor (16x) tests.

### 1C: `trumpSuitFromCards` returns null for joker bids (RULES.md #4 prerequisite)
**Files**: `GameEngine.ts`, `GameEngine.test.ts`

The `_fallback` parameter is unused. Joker-only bids silently fail.

**Fix**: Use the fallback when all cards are jokers: `return fallback;`

**Tests**: Add `flipTrump accepts BJ pair`, `flipTrump accepts SJ pair`, `flipTrump accepts single BJ`.

### 1D: Partner reinforcement restriction (RULES.md #7)
**Files**: `GameEngine.ts`, `GameEngine.test.ts`

`flipTrump()` doesn't check whether bidder is partner of current candidate.

**Fix**: After computing strength, check `teamOfSeat(seat) === teamOfSeat(candidate.seat) && seat !== candidate.seat` → reject.

**Tests**: Partner can't reinforce; opponent can override; original bidder can self-reinforce.

### 1E: No-bids fallback (RULES.md #9)
**Files**: `GameEngine.ts`, `GameEngine.test.ts`, `ws.ts`

If no one declares trump, the game is stuck.

**Fix**: Add `finalizeTrumpFallback()` — if no candidate exists, use first kitty card's suit (skip jokers). Server calls this after a dealing timeout.

**Tests**: No-bid fallback uses first kitty suit; joker kitty card falls through to next card.

---

## Phase 2: Scoring and Game Lifecycle Overhaul

### 2A: 8-tier scoring thresholds (RULES.md #11)
**Files**: `GameEngine.ts`, `GameEngine.test.ts`

Replace 4-tier system with standard 8 tiers from §9.3:

| Defender Points | Who levels up | Delta |
|----------------|--------------|-------|
| 0 | Banker | +3 |
| 5–35 | Banker | +2 |
| 40–75 | Banker | +1 |
| 80–115 | No one (swap banker) | 0 |
| 120–155 | Defender | +1 |
| 160–195 | Defender | +2 |
| ≥ 200 | Defender | +3 |

**Tests**: Rewrite all scoring tests to match new tiers. Add shutout, banker+2, swap-banker (delta=0), and ≥200 tests.

### 2B: Per-team independent levels (RULES.md #3) + GAME_OVER bug fix
**Files**: `GameEngine.ts`, `GameEngine.test.ts`, `ws.ts`

Currently one shared `levelRank`. GAME_OVER always emits `defenderTeam`.

**Fix**:
- Add `teamLevels: [Rank, Rank]` to GameEngine
- `levelRank` derived from banker's team level each round
- `finishRound()` applies delta to correct team's level
- Add `advancingTeam` and `nextBankerSeat` to ROUND_RESULT event
- GAME_OVER emits the team that actually reached A

### 2C: Banker succession (RULES.md #12)
**Files**: `GameEngine.ts`, `GameEngine.test.ts`

**Fix** (standard simplified per RULES.md §9.4 current impl, just needs per-team level awareness):
- Banker team levels up → banker stays
- Defender team levels up → last trick winner becomes banker
- Swap (delta=0) → last trick winner becomes banker
- Update `config.bankerSeat` and derive `config.levelRank` from new banker's team level

**Tests**: Banker stays on own team levelup; trick winner becomes banker on defender levelup; banker swaps at 80-115.

---

## Phase 3: Trump System Enhancements

### 3A: No-trump rounds (RULES.md #4)
**Files**: `GameEngine.ts`, `types.ts`, `RulesEngine.ts`, `GameEngine.test.ts`

Joker pair (BJ-BJ or SJ-SJ) declares a no-trump round where only jokers and level-rank cards are trump (no trump suit).

**Fix**:
- Allow `trumpSuit` to be `null` or add sentinel value `'NONE'`
- Update `suitGroup()`: when trumpSuit is null, only jokers and level-rank are TRUMP
- Update `cardKey()`: no trump-suit bonus when trumpSuit is null
- `trumpSuitFromCards` returns null for joker-only bids (rather than fallback) when no-trump is intended
- Add a `noTrump` flag to TrumpCandidate

**Tests**: No-trump round via BJ pair; suitGroup with no trump suit; cardKey ordering in no-trump.

### 3B: Progressive self-reinforcement (RULES.md #8)
**Files**: `GameEngine.ts`, `GameEngine.test.ts`

Original declarer can upgrade their own bid (single → pair of same suit).

**Fix**: Already partially handled by Phase 1D (original bidder not blocked). Ensure `flipTrump` allows same-seat bids with higher strength. Currently it does — `candidate.strength > this.trumpCandidate.strength` already handles this. Just need to verify same-suit constraint for self-reinforcement.

**Tests**: Original bidder upgrades single to pair of same suit; rejected if different suit.

---

## Phase 4: Trump Tractors (RULES.md #2)

### 4A: Extend `seqRankForTractor` for trump cards
**Files**: `RulesEngine.ts`, `Follow.ts`, `Throw.ts`, all test files

This is the most complex change. Jokers and level-rank cards must participate in trump tractor sequences.

**Fix**: Change `seqRankForTractor` signature to accept full card context:
```ts
seqRankForTractor(card: Card, levelRank: Rank, trumpSuit: Suit | null): number | null
```

For trump cards, assign special high seqRanks preserving the hierarchy:
- Regular trump ranks: gap-bridged values (2..13 range)
- Off-suit level-rank: max_regular + 1 (e.g., 14)
- Trump-suit level-rank: max_regular + 2 (e.g., 15)
- SJ: max_regular + 3 (e.g., 16)
- BJ: max_regular + 4 (e.g., 17)

For non-trump cards: same gap-bridged values as Phase 1A.

**Cascading changes** (signature update in all callers):
- `RulesEngine.ts`: `analyze()` line 125, `bestDecomposition()` line 170
- `Follow.ts`: `maxTractorLen()` line 39, `buildExpectedInsufficient()` line 109
- `Throw.ts`: `bestTractorTopKey()` line 59

**Also**: Remove `TRACTOR_HAS_LEVEL_OR_JOKER` rejection in `analyze()` line 126 — these cards now have valid seqRanks.

**Tests**: BJ-BJ + SJ-SJ tractor; SJ-SJ + trump-level pair tractor; trump-level + A-trump tractor; off-suit level + trump-suit level tractor; bestDecomposition finds trump tractors.

---

## Phase 5: Follow Validation for THROW Leads

### 5A: Handle THROW pattern in validateFollowPlay
**Files**: `Follow.ts`, `Follow.test.ts`

Currently rejects THROW leads. When a throw stands, followers must follow the combined suit group.

**Fix**: Add THROW handling in `validateFollowPlay`:
- Total card count must match throw size
- If follower has ≥ throw.size cards in lead suit group → must play only from that group
- If follower has fewer → must play all suit-group cards, fill rest with any
- For structural enforcement: follower must match throw parts structure where possible (tractor parts first, then pairs, then singles) — same template logic as insufficient tractor but generalized

**Tests**: Follow throw with sufficient suit-group cards; follow when void; follow with insufficient cards.

---

## Phase 6: Low Priority Items

### 6A: Dealing cadence (RULES.md #5) — cosmetic
No engine change needed. This is a presentation concern — the server can emit individual DEAL events with delays. Current batch dealing is functionally correct.

### 6B: Redeal conditions (RULES.md #6) — optional rule
**Files**: `GameEngine.ts`, `GameEngine.test.ts`

Add `requestRedeal(seat)` method. Check if hand has no trump cards OR no point cards. If valid, trigger a redeal. Low priority — some groups don't use this rule.

---

## Critical Files Summary

| File | Phases |
|------|--------|
| `server/src/engine/RulesEngine.ts` | 1A, 3A, 4A |
| `server/src/engine/GameEngine.ts` | 1B, 1C, 1D, 1E, 2A, 2B, 2C, 3A, 3B, 6B |
| `server/src/engine/Follow.ts` | 4A (signature), 5A |
| `server/src/engine/Throw.ts` | 4A (signature) |
| `server/src/engine/types.ts` | 3A (trumpSuit nullable) |
| `server/src/server/ws.ts` | 1E, 2B (event changes) |
| All `.test.ts` files | Every phase |

## Verification

After each phase:
1. `cd server && pnpm test` — all tests must pass
2. After Phase 2B: verify ROUND_RESULT events include `advancingTeam` and `nextBankerSeat`
3. After Phase 4A: verify `analyze()` returns TRACTOR for BJ-BJ+SJ-SJ
4. End-to-end: start server (`pnpm dev`), play through a full round in the web client, verify scoring and level progression

## Implementation Order

1A → 1B → 1C → 1D → 1E → 2A → 2B → 2C → 3A → 3B → 4A → 5A → 6A → 6B

Each step is a commit-worthy unit with passing tests.
