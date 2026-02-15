import { useStore } from '../store';
import CardFace from './CardFace';

type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'SJ' | 'BJ';
type Suit = 'S' | 'H' | 'D' | 'C' | 'N';
type SuitGroup = Suit | 'TRUMP';

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  SJ: 15,
  BJ: 16
};

function parseCardId(id: string): { rank: Rank; suit: Suit | 'J' } | null {
  const parts = id.split('_');
  if (parts.length === 2 && (parts[1] === 'SJ' || parts[1] === 'BJ')) {
    return { rank: parts[1], suit: 'J' };
  }
  if (parts.length === 3) {
    const suit = parts[1];
    const rank = parts[2];
    if ((suit === 'S' || suit === 'H' || suit === 'D' || suit === 'C') && rank in RANK_VALUE) {
      return { rank: rank as Rank, suit };
    }
  }
  return null;
}

function cardKey(id: string, levelRank: Rank, trumpSuit: Suit): number {
  const parsed = parseCardId(id);
  if (!parsed) return -1;

  if (parsed.rank === 'BJ') return 1000;
  if (parsed.rank === 'SJ') return 900;

  const rv = RANK_VALUE[parsed.rank];
  const isLevel = parsed.rank === levelRank;
  const isTrumpSuit = parsed.suit === trumpSuit;
  const isTrump = isLevel || isTrumpSuit;

  if (!isTrump) return rv;
  if (isLevel) return 800 + (isTrumpSuit ? 50 : 0) + rv;
  if (isTrumpSuit) return 700 + rv;
  return 600 + rv;
}

function suitGroupForCard(id: string, levelRank: Rank, trumpSuit: Suit): SuitGroup | null {
  const parsed = parseCardId(id);
  if (!parsed) return null;
  if (parsed.rank === 'BJ' || parsed.rank === 'SJ') return 'TRUMP';
  if (parsed.rank === levelRank) return 'TRUMP';
  if (parsed.suit === trumpSuit) return 'TRUMP';
  return parsed.suit;
}

function pairKeyForCard(id: string, levelRank: Rank, trumpSuit: Suit): string | null {
  const parsed = parseCardId(id);
  const group = suitGroupForCard(id, levelRank, trumpSuit);
  if (!parsed || !group) return null;
  const suitForPair = parsed.rank === 'BJ' || parsed.rank === 'SJ' ? 'J' : parsed.suit;
  return `${group}|${parsed.rank}|${suitForPair}`;
}

const SUIT_ORDER: Record<Suit | 'J', number> = {
  S: 0,
  H: 1,
  D: 2,
  C: 3,
  N: 4,
  J: 5
};

function cardGroupKey(id: string, levelRank: Rank, trumpSuit: Suit): [number, number, number, string] {
  const parsed = parseCardId(id);
  if (!parsed) return [99, 99, 99, id];

  const rv = RANK_VALUE[parsed.rank];
  const suitOrder = SUIT_ORDER[parsed.suit];
  const isLevel = parsed.rank === levelRank;
  const isTrumpSuit = parsed.suit === trumpSuit;

  // Priority bands:
  // 0 BJ, 1 SJ, 2 trump-level card, 3 other level cards, 4 trump suit, 5 other suits.
  const band =
    parsed.rank === 'BJ' ? 0 :
    parsed.rank === 'SJ' ? 1 :
    (isLevel && isTrumpSuit) ? 2 :
    isLevel ? 3 :
    isTrumpSuit ? 4 :
    5;

  return [band, suitOrder, -rv, id];
}

export default function Hand() {
  const hand = useStore((s) => s.hand);
  const selected = useStore((s) => s.selected);
  const toggle = useStore((s) => s.toggleSelect);
  const legalActions = useStore((s) => s.legalActions);
  const youSeat = useStore((s) => s.youSeat);
  const publicState = useStore((s) => s.publicState);
  const trumpSuit = publicState?.trumpSuit;
  const levelRank = publicState?.levelRank;

  if (!hand.length) return <div className="panel">No cards dealt yet.</div>;

  const hasTrumpContext = !!trumpSuit && !!levelRank;
  const sorted = [...hand].sort((a, b) => {
    if (!hasTrumpContext) return a.localeCompare(b);
    const ak = cardGroupKey(a, levelRank as Rank, trumpSuit as Suit);
    const bk = cardGroupKey(b, levelRank as Rank, trumpSuit as Suit);
    if (ak[0] !== bk[0]) return ak[0] - bk[0];
    if (ak[1] !== bk[1]) return ak[1] - bk[1];
    if (ak[2] !== bk[2]) return ak[2] - bk[2];
    return ak[3].localeCompare(bk[3]);
  });

  const isYourTurn = publicState?.turnSeat === youSeat;
  const inPlayablePhase = publicState?.phase === 'TRICK_PLAY' || publicState?.phase === 'BURY_KITTY';
  let hintedIds = new Set<string>();
  let pairHintedIds = new Set<string>();

  if (publicState?.phase === 'FLIP_TRUMP' && hasTrumpContext) {
    const levelCards = hand.filter((id) => parseCardId(id)?.rank === (levelRank as Rank));
    hintedIds = new Set(levelCards);

    if (levelCards.length >= 2) {
      pairHintedIds = new Set(levelCards);
    }

    const smallJokers = hand.filter((id) => parseCardId(id)?.rank === 'SJ');
    if (smallJokers.length >= 2) {
      for (const id of smallJokers) pairHintedIds.add(id);
    }

    const bigJokers = hand.filter((id) => parseCardId(id)?.rank === 'BJ');
    if (bigJokers.length >= 2) {
      for (const id of bigJokers) pairHintedIds.add(id);
    }
  } else if (isYourTurn && inPlayablePhase && hasTrumpContext) {
    if (publicState?.phase === 'BURY_KITTY') {
      hintedIds = new Set(hand);
    } else {
      const requiredCount = legalActions[0]?.count ?? 0;
      const trick = publicState?.trick ?? [];
      if (trick.length === 0 || requiredCount <= 0) {
        hintedIds = new Set(hand);
      } else {
        const leadCardId = trick[0]?.cards?.[0];
        const leadGroup = leadCardId
          ? suitGroupForCard(leadCardId, levelRank as Rank, trumpSuit as Suit)
          : null;
        if (!leadGroup) {
          hintedIds = new Set(hand);
        } else {
          const matching = hand.filter(
            (id) => suitGroupForCard(id, levelRank as Rank, trumpSuit as Suit) === leadGroup
          );
          hintedIds = matching.length >= requiredCount ? new Set(matching) : new Set(hand);

          const leadIsPair = requiredCount === 2 && (trick[0]?.cards?.length ?? 0) === 2;
          if (leadIsPair) {
            const pairCounts = new Map<string, number>();
            for (const id of hintedIds) {
              const key = pairKeyForCard(id, levelRank as Rank, trumpSuit as Suit);
              if (!key) continue;
              pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
            }
            const withPairs = [...hintedIds].filter((id) => {
              const key = pairKeyForCard(id, levelRank as Rank, trumpSuit as Suit);
              return !!key && (pairCounts.get(key) ?? 0) >= 2;
            });
            pairHintedIds = new Set(withPairs);
          }
        }
      }
    }
  }

  return (
    <div className="panel">
      <div>Your hand</div>
      <div>
        {sorted.map((id) => (
          <CardFace
            key={id}
            id={id}
            selected={selected.has(id)}
            hinted={hintedIds.has(id)}
            pairHinted={pairHintedIds.has(id)}
            onClick={() => toggle(id)}
          />
        ))}
      </div>
    </div>
  );
}
