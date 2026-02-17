import Card from '@heruka_urgyen/react-playing-cards/lib/TcN';
import { useT } from '../i18n';
import { isJoker, cardIdToLibFormat } from '../cardUtils';

type CardFaceProps = {
  id: string;
  selected?: boolean;
  hinted?: boolean;
  pairHinted?: boolean;
  dimmed?: boolean;
  mini?: boolean;
  peeked?: boolean;
  isTrump?: boolean;
  onClick?: () => void;
};

export default function CardFace({
  id,
  selected = false,
  hinted = false,
  pairHinted = false,
  dimmed = false,
  mini = false,
  peeked = false,
  isTrump = false,
  onClick
}: CardFaceProps) {
  const t = useT();
  const cls = [
    'card-face',
    mini ? 'mini' : '',
    selected ? 'selected' : '',
    hinted ? 'hinted' : '',
    pairHinted ? 'pair-hinted' : '',
    dimmed ? 'dimmed' : '',
    isTrump ? 'is-trump' : '',
    peeked ? 'peeked' : '',
    onClick ? 'clickable' : ''
  ].filter(Boolean).join(' ');

  const joker = isJoker(id);
  if (joker) {
    const isSmall = joker === 'SJ';
    return (
      <button type="button" className={`${cls} ${isSmall ? 'joker-small' : 'joker-big'}`} onClick={onClick}>
        <span className="joker-corner">{isSmall ? 'SJ' : 'BJ'}</span>
        <span className="joker-inner">
          <span className="joker-type">{isSmall ? t('joker.small') : t('joker.big')}</span>
          <span className="joker-star">{isSmall ? '\u2606' : '\u2605'}</span>
          <span className="joker-label">JOKER</span>
        </span>
      </button>
    );
  }

  const libCard = cardIdToLibFormat(id);

  return (
    <button type="button" className={cls} onClick={onClick}>
      {libCard && <Card card={libCard} height="100%" />}
    </button>
  );
}
