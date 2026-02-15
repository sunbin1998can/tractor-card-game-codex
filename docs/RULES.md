# Tractor / Shengji (升级拖拉机) Complete Rules

## 0. Scope & Status

This document describes the complete rules for the online Tractor (升级/拖拉机) card game implemented in this project:

- **2 standard decks** (108 cards total, including 4 jokers)
- **4-player or 6-player** selectable
- **Server-authoritative** architecture — the client never computes game logic

### Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented and tested |
| ⚠️ | **Not yet implemented** — standard rule documented for future work |

---

## 1. Overview & Objective

Tractor (拖拉机), also called Shengji (升级, "Level Up"), is a team-based trick-taking card game. The objective is to advance your team's level from **2** through **Ace**. The first team to reach or pass Ace wins the game.

Each round, one team is **declaring** (banker's team, 庄家) and the other is **defending** (抓分方). Defenders try to collect point cards in tricks; declarers try to prevent this. The round outcome determines which team levels up and by how much.

---

## 2. The Deck

### 2.1 Cards ✅

Two standard 54-card decks shuffled together = **108 cards**. Each card has a unique ID encoding deck number, suit, and rank:

- Format: `D{deck}_{suit}_{rank}` — e.g., `D1_H_10`, `D2_S_A`
- Jokers: `D1_BJ`, `D2_BJ`, `D1_SJ`, `D2_SJ`
- Ranks: `2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, SJ, BJ`
- Suits: `S` (Spades), `H` (Hearts), `D` (Diamonds), `C` (Clubs), `J` (Jokers)

### 2.2 Point Cards ✅

Only three ranks carry points. Total across 2 decks = **200 points**.

| Rank | Points per card | Count (2 decks) | Subtotal |
|------|----------------|-----------------|----------|
| 5    | 5              | 8               | 40       |
| 10   | 10             | 8               | 80       |
| K    | 10             | 8               | 80       |

All other ranks = 0 points.

### 2.3 Card Ordering ✅

Cards are ordered by a numeric **cardKey** value. Within the trump suit group, the hierarchy has 6 tiers (highest to lowest):

1. **Big Joker** (BJ) — cardKey 1000
2. **Small Joker** (SJ) — cardKey 900
3. **Trump-suit level-rank** (e.g., 7♠ when level=7 and trump=♠) — cardKey 850+
4. **Off-suit level-rank** (e.g., 7♥, 7♦, 7♣ when level=7 and trump=♠) — cardKey 800+, equally ranked with each other
5. **Trump suit by rank** (A high, skipping level rank) — cardKey 700+
6. **Non-trump suits by rank** (A high, skipping level rank) — natural rank value

Within the same cardKey, ties are broken lexicographically by card ID.

### 2.4 Suit Groups ✅

Every card belongs to exactly one **SuitGroup**, determined at the start of each round:

- **TRUMP**: Big Jokers, Small Jokers, all level-rank cards (any suit), all cards of the trump suit
- **Natural suit** (S/H/D/C): all other cards retain their printed suit

```
SuitGroup(card):
  if BJ or SJ       → TRUMP
  if rank == level   → TRUMP
  if suit == trump   → TRUMP
  else               → card's natural suit
```

### 2.5 Rank Adjacency

For tractor sequences, cards follow the natural rank order `2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A` (Ace high), with the **level rank removed** from the sequence.

⚠️ **Gap bridging**: When level=N, ranks N-1 and N+1 should be considered adjacent. For example, when level=7, the sequence is `…5, 6, 8, 9…` and 6→8 is a valid consecutive step. The current implementation returns `null` for the level rank's sequence position but does **not** bridge the gap — ranks on either side of the level rank are treated as non-consecutive.

---

## 3. Teams & Levels

### 3.1 Team Formation ✅

Teams are determined by **seat parity** (alternating seats):

| Mode | Team 0 (even seats) | Team 1 (odd seats) |
|------|---------------------|---------------------|
| 4-player | Seats 0, 2 | Seats 1, 3 |
| 6-player | Seats 0, 2, 4 | Seats 1, 3, 5 |

Teammates sit across from each other, never adjacent.

### 3.2 Levels

Levels progress through the ranks: **2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → J → Q → K → A**

Ace is the cap. Reaching or passing Ace ends the game.

⚠️ **Per-team independent levels**: In standard Shengji, each team maintains its own level independently. The trump rank for a given round equals the **banker's team's** level. The current implementation uses a single shared level for the entire game.

### 3.3 Banker (庄家) ✅

The **banker** (庄家, also called "declarer") is the player whose team is defending their level. The banker's team tries to prevent defenders from collecting points.

- The banker leads the first trick of each round
- The banker receives and buries the kitty
- The **banker team** = team containing the banker seat
- The **defender team** = the opposing team (抓分方, "point catchers")

---

## 4. Dealing

### 4.1 Deal Process ✅

Cards are dealt from the shuffled double deck. Each player receives cards until the kitty remainder is reached.

⚠️ **Dealing direction and cadence**: Standard rules specify dealing counter-clockwise, one card at a time. The current implementation deals all cards at once (server sets hands directly).

### 4.2 Kitty (底牌) ✅

A set of cards is reserved as the **kitty** before dealing completes:

| Mode | Kitty size | Cards per player |
|------|-----------|-----------------|
| 4-player | 8 | 25 |
| 6-player | 12 | 16 |

The kitty is set aside face-down and given to the banker after trump is declared.

### 4.3 Redeal

⚠️ **Not yet implemented.** In standard rules, a player may request a redeal if their hand contains:
- No trump cards at all, or
- No point cards (no 5s, 10s, or Ks)

This is an optional rule that varies by house rules.

---

## 5. Trump Declaration (亮主/抢主)

### 5.1 Flip / Snatch ✅

During dealing (or a dedicated FLIP_TRUMP phase), players declare the trump suit by revealing **level-rank cards**:

- Showing a level-rank card proposes that card's suit as trump
- Jokers alone cannot set a trump suit (they have no natural suit)

### 5.2 Strength Hierarchy ✅

Trump declarations have a strength ordering. A new declaration must be **strictly stronger** than the current best to override it:

| Strength | Declaration | Value |
|----------|------------|-------|
| 6 (strongest) | Pair of Big Jokers | 60 |
| 5 | Pair of Small Jokers | 50 |
| 4 | Single Big Joker | 40 |
| 3 | Single Small Joker | 30 |
| 2 | Pair of level-rank cards | 20 |
| 1 (weakest) | Single level-rank card | 10 |

### 5.3 Override Bidding

Players may override (snatch, 抢主) a previous trump declaration by showing a strictly stronger combination per §5.2.

⚠️ **Partner reinforcement restriction**: In standard rules, a player's partner cannot reinforce (strengthen) their bid — only opponents or the original bidder can override. This restriction is not currently enforced.

⚠️ **Progressive override**: Standard rules allow the original declarer to "reinforce" their own bid (e.g., upgrade from single to pair of the same suit). This specific mechanic is not explicitly implemented.

### 5.4 No-Trump Rounds

⚠️ **Not yet implemented.** In standard rules, declaring a pair of identical jokers (e.g., two Big Jokers or two Small Jokers) establishes a **no-trump round** where there is no trump suit — only jokers and level-rank cards are trump. The current implementation rejects joker-only bids since `trumpSuitFromCards()` returns null for them.

### 5.5 Fairness Window ✅

To prevent bot speed advantage, trump is not locked immediately:

1. When a player flips/snatches, the server starts a **fairness window** (default: 2000ms)
2. During the window, any player may counter with a strictly stronger declaration
3. When the window expires, trump locks to the strongest candidate
4. `TRUMP_CANDIDATE` events broadcast during the window; `PHASE` update after lock

### 5.6 No Bids Fallback

⚠️ **Not yet implemented.** In standard rules, if no player declares trump during dealing, the first card of the kitty determines the trump suit. The current implementation requires an explicit trump declaration via the game config.

---

## 6. Kitty & Burying (底牌/埋底)

### 6.1 Banker Bury Phase ✅

After trump is declared and locked:

1. The banker receives the kitty cards into their hand
2. The banker selects exactly `kittySize` cards to **bury** (埋底) face-down
3. The buried cards replace the kitty for end-of-round scoring
4. Any cards may be buried, including point cards and trump cards

### 6.2 Hidden During Play ✅

During trick play, the kitty contents are hidden from all players. Only the count is visible. The kitty is revealed at round end for scoring purposes.

---

## 7. Patterns

All plays consist of cards from a single suit group. The server recognizes four valid pattern kinds:

### 7.1 SINGLE ✅

One card. Any single card is a valid single.

### 7.2 PAIR ✅

Two cards with the **same pairKey** — identical rank and suit (with suit group context). In a 2-deck game, every rank/suit combination has exactly one possible pair.

PairKey equivalence: `suitGroup|rank|suit` (jokers use `J` as suit).

### 7.3 TRACTOR (拖拉机) ✅ (partial)

Two or more **consecutive pairs** in the same suit group. Minimum length: 2 pairs (4 cards).

**Requirements:**
- Even number of cards ≥ 4
- All cards form valid pairs (each pairKey bucket has exactly 2 cards)
- Pairs are consecutive by rank sequence (see §2.5)

**Current implementation:**
- ✅ Non-trump tractors work correctly (e.g., 5♠5♠-6♠6♠ when level≠5,6)
- ✅ Level-rank cards do not participate in tractor sequences
- ✅ Jokers do not participate in tractor sequences

**Standard rules — trump tractors:**

⚠️ In standard Shengji, jokers and level-rank cards **do** participate in trump tractor sequences. The full trump tractor hierarchy (highest to lowest) is:

| Pair | Example (level=7, trump=♣) |
|------|---------------------------|
| Big Joker pair | BJ-BJ |
| Small Joker pair | SJ-SJ |
| Trump-suit level-rank pair | 7♣-7♣ |
| Off-suit level-rank pairs | 7♥-7♥ (each off-suit level pair) |
| Trump suit A pair | A♣-A♣ |
| Trump suit K pair | K♣-K♣ |
| ... down to ... | |
| Trump suit 2 pair | 2♣-2♣ |

Valid trump tractors in standard rules include:
- `BJ-BJ + SJ-SJ` (joker tractor)
- `SJ-SJ + 7♣-7♣` (joker into trump-suit level-rank)
- `7♣-7♣ + A♣-A♣` (trump-suit level-rank into highest trump)
- `Q♣-Q♣ + K♣-K♣` (normal consecutive trump pairs, skipping level rank if adjacent)

The current implementation excludes jokers and level-rank cards from all tractor sequences via `seqRankForTractor()` returning `null`.

### 7.4 THROW (甩牌) ✅

A **throw** is a leader-only multi-component play of cards from a single suit group that don't form a single PAIR or TRACTOR pattern.

**Rules:**
1. Only the trick leader may attempt a throw
2. All cards must be in the same suit group
3. The server decomposes the throw deterministically:
   - Longest tractors first (prefer longer, then higher topKey)
   - Remaining pairs
   - Remaining singles
4. The throw must **stand** (站得住) — see §8.4

---

## 8. Trick Play

### 8.1 Leading ✅

- The **banker leads the first trick** of the round
- After each trick, the **winner leads the next trick**
- The leader may play any valid pattern (SINGLE, PAIR, TRACTOR) or attempt a THROW
- Play proceeds clockwise by seat number: seat → (seat + 1) % numPlayers

### 8.2 Follow Rules (跟牌) ✅

When following (not leading), players must obey these rules in order:

**Rule 1 — Must follow suit group:**
- If you have cards in the lead suit group, you must play cards from that group
- If you have ≥ leadSize cards in the group, play exactly leadSize from the group
- If you have fewer cards in the group than leadSize, you must play **all** of your cards in that group, filling the remainder with any other cards

**Rule 2 — Must follow structure:**
- Lead SINGLE: play any single card from the suit group
- Lead PAIR: if you have any pair in the suit group, you must play a pair
- Lead TRACTOR (L pairs): if you can form any tractor (≥ 2 consecutive pairs) in the suit group, you must play a tractor of length min(L, yourMaxTractorLength)

**Rule 3 — Insufficient tractor fill template (拆补齐):**

When following a tractor but you cannot match the full tractor length, the server enforces a deterministic fill order:
1. Your **longest available tractor segment** (up to the required length)
2. Then **pairs** (low-to-high by cardKey, to preserve strong cards)
3. Then **singles** (low-to-high by cardKey)

Total card count must match the leader's card count. The server computes the expected card set and rejects any play that doesn't match.

**Void in suit group:**
- If you have no cards in the lead suit group and the lead is non-trump, you may play trump cards to try to win (ruffing) or discard any cards

### 8.3 Trick Resolution ✅

After all players have played:

1. The **highest play in the lead suit group wins**, unless trumped
2. **Trump beats non-trump** when a player is void in the lead suit group and plays trump
3. Among plays of the same pattern kind and suit group, compare by **topKey** (highest wins)
4. **First-played wins ties**: if two plays have equal topKey, the earlier play wins (the leader or first challenger retains the win since `comparePattern` requires strictly greater to overtake)

The trick winner collects all point cards from the trick for their team.

### 8.4 Throw Standing & Punish (甩牌罚拆) ✅

**Standing check** (server-authoritative):
- For each **opponent** (not partner), check if they can beat **any individual part** of the throw
- A part can be beaten if the opponent has a higher single/pair/tractor in the same suit group, or any trump single/pair/tractor if they are void in the lead suit group
- If **any** opponent can beat **any** part → the throw does NOT stand

**Strict punish** when the throw doesn't stand:
- The throw is automatically reduced to its **smallest part** (lowest topKey: single → pair → tractor)
- The server broadcasts `THROW_PUNISHED` with `{original, punished, reason}`
- The punished (smallest) part becomes the actual lead for the trick

---

## 9. Scoring & Round End

### 9.1 Point Counting ✅

At round end, sum all points collected by the defender team across all tricks:
- Each 5 = 5 points
- Each 10 = 10 points
- Each K = 10 points

### 9.2 Kitty Kill Multiplier (抠底)

**Trigger**: the last trick is won by the **defender team** (team ≠ banker team).

**Current implementation** ✅:

| Last trick lead pattern | Multiplier |
|------------------------|------------|
| SINGLE | 2× |
| PAIR | 4× |
| TRACTOR | 4× |

The kitty points are multiplied and added to the defender's total: `defenderPoints += kittyPoints × multiplier`.

⚠️ **Standard rules**: The kitty multiplier in standard Shengji is `2 × 2^(number of pairs in winning play)`:
- Single last trick win: 2× (same)
- Pair last trick win: 4× (same)
- 2-pair tractor: 8×
- 3-pair tractor: 16×
- Longer tractors: exponentially higher

The current implementation uses a flat 4× for any pair or tractor regardless of tractor length.

### 9.3 Level-Up Thresholds

**Current implementation** ✅:

| Defender Points | Result |
|----------------|--------|
| < 80 | Banker team levels up by 1 (守庄成功) |
| 80–119 | Defender team levels up by 1 |
| 120–159 | Defender team levels up by 2 |
| ≥ 160 | Defender team levels up by 3 |

⚠️ **Standard rules (8 tiers)**: Standard Shengji uses more granular thresholds with higher stakes:

| Defender Points | Who levels up | Amount |
|----------------|--------------|--------|
| 0 (完封) | Banker team | +3 |
| 5–35 | Banker team | +2 |
| 40–75 | Banker team | +1 |
| 80–115 | Swap banker, no level change | — |
| 120–155 | Defender team | +1 |
| 160–195 | Defender team | +2 |
| ≥ 200 | Defender team | +3 |

Note: Some variants also have a "below 0" tier (negative points via kitty rules) that gives banker +4.

### 9.4 Banker Succession

**Current implementation** ✅:

| Round outcome | Next banker |
|--------------|-------------|
| Banker team levels up | Banker stays (same seat) |
| Defender team levels up | Last trick winner becomes banker |

⚠️ **Standard rules**: In standard Shengji, banker succession follows a different pattern:
- If the banker's team **defends successfully**, the banker's **partner** becomes the next banker (rotating within the team)
- If the **opposing team wins**, the player to the **right of the current banker** (next in dealing order) from the winning team becomes banker

---

## 10. Game End ✅

The game ends when any team's level reaches or passes **Ace**:

- The `GAME_OVER` event is broadcast with the winning team
- Phase transitions to `GAME_OVER`
- Level-up deltas that would exceed Ace are capped at Ace

---

## 11. Client-Server Protocol ✅

### 11.1 Server Authoritative

The server is the **single source of truth** for:
- Game phase and turn management
- Card legality and pattern validation
- Follow rule enforcement
- Throw standing checks
- Scoring and level progression

The client **must not** compute legality. It renders state and matches card selections to server-provided `legalActions`.

### 11.2 Public vs Private Data

| Data | Visibility |
|------|-----------|
| Phase, turn, trick plays | All players (public) |
| Hand cards, legal actions | Owning player only (private) |
| Other players' hands | Never sent to clients |
| Kitty contents (during play) | Hidden; count only |
| Kitty contents (round end) | Revealed in ROUND_RESULT |

---

## Appendix A: Implementation Status Summary

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 1 | Rank adjacency across level gap | ⚠️ Bug | High | §2.5 — 6↔8 should be adjacent when level=7 |
| 2 | Trump tractors with jokers/level-rank | ⚠️ Missing | High | §7.3 — jokers and level-rank should form trump tractors |
| 3 | Per-team independent levels | ⚠️ Missing | High | §3.2 — each team tracks own level |
| 4 | No-trump rounds | ⚠️ Missing | Medium | §5.4 — joker pair declares no-trump |
| 5 | Dealing cadence (one at a time) | ⚠️ Missing | Low | §4.1 — counter-clockwise, one card at a time |
| 6 | Redeal conditions | ⚠️ Missing | Low | §4.3 — no trump or no points in hand |
| 7 | Partner reinforcement restriction | ⚠️ Missing | Medium | §5.3 — partners can't reinforce each other's bids |
| 8 | Progressive override (self-reinforce) | ⚠️ Missing | Medium | §5.3 — original bidder can upgrade own bid |
| 9 | No bids fallback (kitty determines trump) | ⚠️ Missing | Medium | §5.6 — first kitty card sets trump suit |
| 10 | Standard kitty multiplier (exponential) | ⚠️ Simplified | Low | §9.2 — should be 2^(pairs+1) for tractors |
| 11 | Standard scoring thresholds (8 tiers) | ⚠️ Simplified | Medium | §9.3 — 8-tier system vs current 4-tier |
| 12 | Standard banker succession | ⚠️ Simplified | Medium | §9.4 — partner/right-of-dealer rotation |

---

## Appendix B: Determinism Requirements ✅

All operations that could produce multiple valid results must use deterministic tie-breaking:

| Operation | Primary sort | Tie-break |
|-----------|-------------|-----------|
| Card ordering | cardKey (numeric, ascending) | Card ID (lexicographic) |
| Pair ordering | topKey of pair | Card IDs joined (lexicographic) |
| Tractor extraction | Length (longest first), then topKey (highest first) | — |
| Throw decomposition | Tractors → Pairs → Singles; within each: topKey descending | Card IDs (lexicographic) |
| Follow template fill | Longest tractor segment → pairs (low→high) → singles (low→high) | Card ID (lexicographic) |
| Throw punish selection | Singles → Pairs → Tractors; lowest topKey within category | Card IDs joined (lexicographic) |
| Trick winner | Highest topKey wins; first-played retains on tie | Play order (earlier wins) |
