import { useStore } from '../store';
import CardFace from './CardFace';

const RANK_VALUE: Record<string, number> = {
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

function parseCardId(cardId: string): { suit: string; rank: string } | null {
  const parts = cardId.split('_');
  if (parts.length === 3) return { suit: parts[1], rank: parts[2] };
  if (parts.length === 2) return { suit: 'J', rank: parts[1] };
  return null;
}

function suitGroup(cardId: string, levelRank: string, trumpSuit: string): string | null {
  const card = parseCardId(cardId);
  if (!card) return null;
  if (card.rank === 'BJ' || card.rank === 'SJ') return 'TRUMP';
  if (card.rank === levelRank) return 'TRUMP';
  if (card.suit === trumpSuit) return 'TRUMP';
  return card.suit;
}

function cardKey(cardId: string, levelRank: string, trumpSuit: string): number {
  const card = parseCardId(cardId);
  if (!card) return -1;
  const group = suitGroup(cardId, levelRank, trumpSuit);
  const rv = RANK_VALUE[card.rank] ?? 0;
  if (group !== 'TRUMP') return rv;
  if (card.rank === 'BJ') return 1000;
  if (card.rank === 'SJ') return 900;

  const isLevel = card.rank === levelRank;
  const isTrumpSuit = card.suit === trumpSuit;
  if (isLevel) return 800 + (isTrumpSuit ? 50 : 0) + rv;
  if (isTrumpSuit) return 700 + rv;
  return 600 + rv;
}

const SUIT_ORDER: Record<string, number> = {
  S: 0,
  H: 1,
  D: 2,
  C: 3
};

export default function Hand() {
  const hand = useStore((s) => s.hand);
  const selected = useStore((s) => s.selected);
  const toggle = useStore((s) => s.toggleSelect);
  const levelRank = useStore((s) => s.publicState?.levelRank ?? '2');
  const trumpSuit = useStore((s) => s.publicState?.trumpSuit ?? 'H');

  if (!hand.length) return <div className="panel">No cards dealt yet.</div>;

  const sorted = [...hand].sort((a, b) => {
    const ga = suitGroup(a, levelRank, trumpSuit);
    const gb = suitGroup(b, levelRank, trumpSuit);
    const aTrump = ga === 'TRUMP';
    const bTrump = gb === 'TRUMP';

    if (aTrump && !bTrump) return -1;
    if (!aTrump && bTrump) return 1;

    if (aTrump && bTrump) {
      const ka = cardKey(a, levelRank, trumpSuit);
      const kb = cardKey(b, levelRank, trumpSuit);
      if (ka !== kb) return kb - ka;
      return a.localeCompare(b);
    }

    if (ga && gb && ga !== gb) {
      return (SUIT_ORDER[ga] ?? 99) - (SUIT_ORDER[gb] ?? 99);
    }

    const ra = parseCardId(a)?.rank ?? '';
    const rb = parseCardId(b)?.rank ?? '';
    const va = RANK_VALUE[ra] ?? 0;
    const vb = RANK_VALUE[rb] ?? 0;
    if (va !== vb) return vb - va;
    return a.localeCompare(b);
  });

  return (
    <div className="panel">
      <div>Your hand</div>
      <div>
        {sorted.map((id) => (
          <CardFace
            key={id}
            cardId={id}
            selected={selected.has(id)}
            onClick={() => toggle(id)}
          />
        ))}
      </div>
    </div>
  );
}
