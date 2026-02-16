type CardFaceProps = {
  cardId: string;
  mini?: boolean;
  selected?: boolean;
  hinted?: boolean;
  pairHinted?: boolean;
  onClick?: () => void;
};

const SUIT_SYMBOL: Record<string, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣'
};

function parseCardId(cardId: string): { suit: string; rank: string } | null {
  const parts = cardId.split('_');
  if (parts.length === 3) return { suit: parts[1], rank: parts[2] };
  if (parts.length === 2) return { suit: 'J', rank: parts[1] };
  return null;
}

function suitLabel(suit: string): string {
  return SUIT_SYMBOL[suit] ?? suit;
}

export default function CardFace({
  cardId,
  mini,
  selected,
  hinted,
  pairHinted,
  onClick
}: CardFaceProps) {
  const parsed = parseCardId(cardId);
  const rank = parsed?.rank ?? cardId;
  const suit = parsed?.suit ?? '';
  const isJoker = rank === 'SJ' || rank === 'BJ' || suit === 'J';
  const suitText = isJoker ? '' : suitLabel(suit);
  const jokerLabel = rank === 'BJ' ? 'BIG' : 'SMALL';
  const colorClass = isJoker ? (rank === 'BJ' ? 'joker-big' : 'joker-small') : suit === 'H' || suit === 'D' ? 'red' : 'black';

  return (
    <div
      className={[
        'card-face',
        mini ? 'mini' : '',
        selected ? 'selected' : '',
        hinted ? 'hinted' : '',
        pairHinted ? 'pair-hinted' : '',
        onClick ? 'clickable' : '',
        colorClass
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      title={cardId}
    >
      <div className="card-corner">
        <span>{rank}</span>
        {suitText ? <span className="card-suit">{suitText}</span> : null}
      </div>
      <div className={`card-center ${isJoker ? 'joker' : ''}`}>
        {isJoker ? (
          <>
            <span className="joker-mark">JOKER</span>
            <span className="joker-label">{jokerLabel}</span>
          </>
        ) : (
          suitText
        )}
      </div>
      <div className="card-corner bottom">
        <span>{rank}</span>
        {suitText ? <span className="card-suit">{suitText}</span> : null}
      </div>
    </div>
  );
}
