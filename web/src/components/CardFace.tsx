import Card from '@heruka_urgyen/react-playing-cards/lib/TcN';

type CardFaceProps = {
  id: string;
  selected?: boolean;
  hinted?: boolean;
  pairHinted?: boolean;
  mini?: boolean;
  onClick?: () => void;
};

function cardIdToLibFormat(id: string): string | null {
  const parts = id.split('_');
  const value = parts[parts.length - 1];
  const suit = parts.length >= 3 ? parts[parts.length - 2] : '';

  if (value === 'SJ' || value === 'BJ') return null;

  const suitLower = suit === 'H' ? 'h' : suit === 'S' ? 's' : suit === 'D' ? 'd' : suit === 'C' ? 'c' : '';
  if (!suitLower) return null;

  const rank = value === '10' ? 'T' : value;
  return `${rank}${suitLower}`;
}

function isJoker(id: string): 'SJ' | 'BJ' | null {
  const parts = id.split('_');
  const value = parts[parts.length - 1];
  if (value === 'SJ') return 'SJ';
  if (value === 'BJ') return 'BJ';
  return null;
}

export default function CardFace({
  id,
  selected = false,
  hinted = false,
  pairHinted = false,
  mini = false,
  onClick
}: CardFaceProps) {
  const cls = [
    'card-face',
    mini ? 'mini' : '',
    selected ? 'selected' : '',
    hinted ? 'hinted' : '',
    pairHinted ? 'pair-hinted' : '',
    onClick ? 'clickable' : ''
  ].filter(Boolean).join(' ');

  const joker = isJoker(id);
  if (joker) {
    const isSmall = joker === 'SJ';
    return (
      <button type="button" className={`${cls} ${isSmall ? 'joker-small' : 'joker-big'}`} onClick={onClick}>
        <span className="joker-inner">
          <span className="joker-type">{isSmall ? '小' : '大'}</span>
          <span className="joker-star">{isSmall ? '\u2606' : '\u2605'}</span>
          <span className="joker-label">JOKER</span>
        </span>
      </button>
    );
  }

  const libCard = cardIdToLibFormat(id);
  const height = mini ? '56px' : '92px';

  return (
    <button type="button" className={cls} onClick={onClick}>
      {libCard && <Card card={libCard} height={height} />}
    </button>
  );
}
