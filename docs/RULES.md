# Tractor / Shengji (升级拖拉机) Rules (Two Decks, Online)

## 0. Scope
This project implements an online Tractor (升级/拖拉机) game with:
- 2 decks
- 4-player or 6-player selectable
- Flip/Snatch trump with fairness window
- Patterns: SINGLE, PAIR, TRACTOR (consecutive pairs), THROW (甩牌)
- Strict follow rules including "fill when insufficient"
- Scoring: 5/10/K
- Kitty (底牌) kill multipliers: 2x, double-kill 4x
- Level-up thresholds: 80(+1), 120(+2), 160(+3)
- Game ends when reaching/passing A (打过A)

Server is authoritative. Client only sends actions; server validates and broadcasts events.

## 1. Players & Teams
- Seats: 4 or 6.
- Teams by seat parity:
  - 4p: team0 = {0,2}, team1 = {1,3}
  - 6p: team0 = {0,2,4}, team1 = {1,3,5}

## 2. Cards
- Two standard decks, each card has unique id:
  - Example: D1_H_10, D2_S_A, D1_BJ, D2_SJ
- Ranks: 2..A, SJ (small joker), BJ (big joker)
- Suits: S H D C

### 2.1 Points
- 5 = 5 points
- 10 = 10 points
- K = 10 points
- Others = 0

## 3. Level & Progression
- Levels progress: 2 → 3 → ... → 10 → J → Q → K → A
- A is the cap. If a team reaches/passes A, game ends (GAME_OVER).

## 4. Trump (亮主/抢主)
### 4.1 Mode
- Mode: FLIP_SNATCH (翻牌定主/亮出来抢主)
- Only level card (当前级点数) can set trump suit by flipping.
- Jokers cannot set suit by themselves (policy: reject joker flip for suit setting).

### 4.2 Fairness Window (Anti-bot speed advantage)
- Trump is not locked immediately when someone flips/snatches.
- Server starts a fairness window (e.g. 2000ms).
- During window, stronger snatch can replace the current best candidate.
- When window ends, trump locks to the best candidate.
- Broadcast TRUMP_CANDIDATE events during the window; after lock broadcast PHASE/STATE update.

### 4.3 Strength order (minimal)
- Pair BJ > Pair SJ > Single BJ > Single SJ > Pair level > Single level
- Over-snatch allowed only if strictly stronger than current best.

## 5. SuitGroup Definition
A card belongs to one SuitGroup:
- TRUMP: jokers, all level-rank cards (any suit), and all cards of trump suit
- Non-trump suits: S/H/D/C for other cards

SuitGroup(card):
- if BJ or SJ => TRUMP
- else if rank == levelRank => TRUMP
- else if suit == trumpSuit => TRUMP
- else => suit

## 6. Patterns
### 6.1 SINGLE
- 1 card in same SuitGroup

### 6.2 PAIR
- 2 identical cards by equivalence (same suitGroup + same rank, and suit where applicable)
- With 2 decks, a normal pair is possible.

### 6.3 TRACTOR (拖拉机)
- Even number of cards >= 4
- All cards form pairs (each bucket count = 2)
- Pairs are consecutive by rank sequence
- Minimum length: 2 pairs
- IMPORTANT: Level-rank cards DO NOT participate in tractor sequences (级牌不参与连续拖拉机).
- Jokers also do not participate in tractor sequences.

Consecutive sequence uses rank order 2..A (A high).

### 6.4 THROW (甩牌)
- Only the trick leader may attempt THROW.
- THROW must be in one SuitGroup only (no mixed suitGroup throwing).
- Server decomposes THROW into parts deterministically:
  1) longest tractors (prefer longer, then higher topKey)
  2) remaining pairs
  3) remaining singles
- THROW must "stand" (站得住) or it will be punished (strict punish).

## 7. Follow Rules (跟牌)
### 7.1 Must follow SuitGroup
- If you have any cards in the lead SuitGroup, you must play all cards from that SuitGroup for this trick.
- If lead SuitGroup is non-trump and you have none, you may play TRUMP.

### 7.2 Must follow structure (严格跟结构)
If you have cards in the lead SuitGroup:
- Lead SINGLE: follow any single in that suitGroup.
- Lead PAIR: if you have any pair in that suitGroup, you must play a PAIR.
- Lead TRACTOR(L pairs):
  - If you can form any tractor (>=2 pairs) in that suitGroup:
    - You must play a TRACTOR with length >= min(L, yourMaxTractorLen).
    - You may be required to avoid deliberately shortening your longest tractor.
  - If you cannot form tractor:
    - You must fill using "pairs first, then singles" to match total card count.
    - You must not split an available pair into two singles unless no other way to fill exists.

### 7.3 Insufficient Tractor Fill (拆补齐)
When following a tractor and you cannot match full tractor:
- Required fill order (deterministic):
  1) take your longest available tractor segment (up to required length)
  2) then take pairs (low-to-high to preserve strong cards, deterministic)
  3) then take singles (low-to-high)
- Total card count must match leader's card count.

Server must enforce this via “expected follow set” template.

## 8. Trick Resolution (比牌)
- Only plays that satisfy follow validation are accepted.
- TRUMP beats non-TRUMP when lead suitGroup is non-TRUMP and a player is void (allowed to trump).
- For same pattern kind within same suitGroup:
  - Compare topKey (derived from card power; see implementation).
- THROW comparison:
  - Compare part-by-part in deterministic order.

## 9. THROW Standing Check & Punish (甩牌站不住罚拆)
Standing check uses server-known hands (authoritative):
- For each opponent, determine if they can legally respond and beat any part.
- If any part can be beaten by any opponent, THROW does NOT stand.

Strict punish:
- Automatically replace THROW with the smallest part (lowest topKey SINGLE else PAIR else TRACTOR).
- Broadcast THROW_PUNISHED {original, punished, reason}.

## 10. Kitty (底牌) and Bury (埋底)
- Banker buries kitty count:
  - 4p: configured (e.g. 8)
  - 6p: configured (e.g. 12)
- During play, kitty contents are hidden; only count visible.
- At round end, kitty points are computed for kill.

## 11. Kill (抠底) Multipliers
- Trigger: last trick winner is defenders (team != bankerTeam)
- Multiplier:
  - normal kill: 2x
  - double-kill: 4x if last trick lead pattern is PAIR or TRACTOR
- Add (kittyPoints * multiplier) to defenders captured points.

## 12. Level Up (升级阈值)
Defenders points thresholds:
- >= 160 => defenders levelUpBy 3
- >= 120 => defenders levelUpBy 2
- >= 80  => defenders levelUpBy 1
Else:
- Banker team levelUpBy 1 (守庄成功)

Banker seat for next round:
- If defenders levelUp, next banker is last trick winner.
- Otherwise banker stays.

## 13. Round Result UI Requirements
After round ends, broadcast ROUND_RESULT:
- levelFrom, levelTo, delta
- defenderPoints, kittyPoints, kill multiplier
- autoStartInSec (e.g. 3)
- if game over, broadcast GAME_OVER immediately.

## 14. Client Rules
- Client must NOT compute rules.
- Client renders state and matches card selections to legalActions.
