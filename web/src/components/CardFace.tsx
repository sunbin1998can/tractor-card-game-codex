type CardFaceProps = {
  id: string;
  selected?: boolean;
  hinted?: boolean;
  pairHinted?: boolean;
  mini?: boolean;
  onClick?: () => void;
};

type ParsedCard =
  | { kind: 'STANDARD'; rank: string; suitSymbol: string; suitClass: string }
  | { kind: 'JOKER'; label: 'Small Joker' | 'Big Joker'; suitClass: string; mark: string };

function parseCardId(id: string): ParsedCard {
  const parts = id.split('_');
  const value = parts[parts.length - 1];
  const suit = parts.length >= 3 ? parts[parts.length - 2] : '';

  if (value === 'SJ') {
    return { kind: 'JOKER', label: 'Small Joker', suitClass: 'joker-small', mark: '\u2606' };
  }
  if (value === 'BJ') {
    return { kind: 'JOKER', label: 'Big Joker', suitClass: 'joker-big', mark: '\u2605' };
  }

  const suitSymbol =
    suit === 'S' ? '\u2660' :
    suit === 'H' ? '\u2665' :
    suit === 'D' ? '\u2666' :
    suit === 'C' ? '\u2663' :
    '?';

  const suitClass =
    suit === 'H' || suit === 'D' ? 'red' :
    suit === 'S' || suit === 'C' ? 'black' :
    '';

  return { kind: 'STANDARD', rank: value, suitSymbol, suitClass };
}

export default function CardFace({
  id,
  selected = false,
  hinted = false,
  pairHinted = false,
  mini = false,
  onClick
}: CardFaceProps) {
  const parsed = parseCardId(id);

  if (parsed.kind === 'JOKER') {
    return (
      <button
        type="button"
        className={`card-face ${mini ? 'mini' : ''} ${parsed.suitClass} ${selected ? 'selected' : ''} ${hinted ? 'hinted' : ''} ${pairHinted ? 'pair-hinted' : ''} ${onClick ? 'clickable' : ''}`}
        onClick={onClick}
      >
        <span className="card-corner top">{parsed.label}</span>
        <span className="card-center joker">
          <span className="joker-mark">{parsed.mark}</span>
          <span>JOKER</span>
        </span>
        <span className="card-corner bottom">{parsed.label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`card-face ${mini ? 'mini' : ''} ${parsed.suitClass} ${selected ? 'selected' : ''} ${hinted ? 'hinted' : ''} ${pairHinted ? 'pair-hinted' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <span className="card-corner top">
        {parsed.rank}
        <span className="card-suit">{parsed.suitSymbol}</span>
      </span>
      <span className="card-center">{parsed.suitSymbol}</span>
      <span className="card-corner bottom">
        {parsed.rank}
        <span className="card-suit">{parsed.suitSymbol}</span>
      </span>
    </button>
  );
}
