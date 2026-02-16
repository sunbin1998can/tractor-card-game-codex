import { useMemo } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { getRelativePosition, type RelativePosition } from './GameTable';
import CardFace from './CardFace';
import { motion, AnimatePresence } from 'motion/react';

type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'SJ' | 'BJ';
type Suit = 'S' | 'H' | 'D' | 'C';

const RANK_VALUE: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14, SJ: 15, BJ: 16
};

function parseCard(id: string): { rank: string; suit: string } | null {
  const parts = id.split('_');
  if (parts.length === 2 && (parts[1] === 'SJ' || parts[1] === 'BJ'))
    return { rank: parts[1], suit: 'J' };
  if (parts.length === 3) return { rank: parts[2], suit: parts[1] };
  return null;
}

function suitGroup(id: string, levelRank: string, trumpSuit: string): string | null {
  const c = parseCard(id);
  if (!c) return null;
  if (c.rank === 'BJ' || c.rank === 'SJ') return 'TRUMP';
  if (c.rank === levelRank) return 'TRUMP';
  if (c.suit === trumpSuit) return 'TRUMP';
  return c.suit;
}

function cardStrength(id: string, levelRank: string, trumpSuit: string): number {
  const c = parseCard(id);
  if (!c) return -1;
  const rv = RANK_VALUE[c.rank] ?? 0;
  if (c.rank === 'BJ') return 1000;
  if (c.rank === 'SJ') return 900;
  const isLevel = c.rank === levelRank;
  const isTrumpSuit = c.suit === trumpSuit;
  if (isLevel && isTrumpSuit) return 850 + rv;
  if (isLevel) return 800 + rv;
  if (isTrumpSuit) return 700 + rv;
  return rv;
}

function computeTrickWinner(
  trick: { seat: number; cards: string[] }[],
  levelRank: string,
  trumpSuit: string
): number | null {
  if (trick.length === 0) return null;
  const leadGroup = suitGroup(trick[0].cards[0], levelRank, trumpSuit);
  if (!leadGroup) return null;

  let bestSeat = trick[0].seat;
  let bestStrength = Math.max(...trick[0].cards.map((c) => cardStrength(c, levelRank, trumpSuit)));

  for (let i = 1; i < trick.length; i++) {
    const play = trick[i];
    const playGroup = suitGroup(play.cards[0], levelRank, trumpSuit);
    if (playGroup !== leadGroup && playGroup !== 'TRUMP') continue;
    if (leadGroup !== 'TRUMP' && playGroup === 'TRUMP') {
      const str = Math.max(...play.cards.map((c) => cardStrength(c, levelRank, trumpSuit)));
      if (bestStrength < 700) {
        bestSeat = play.seat;
        bestStrength = str;
      } else if (str > bestStrength) {
        bestSeat = play.seat;
        bestStrength = str;
      }
      continue;
    }
    const str = Math.max(...play.cards.map((c) => cardStrength(c, levelRank, trumpSuit)));
    if (str > bestStrength) {
      bestSeat = play.seat;
      bestStrength = str;
    }
  }
  return bestSeat;
}

/** Get directional offset vector for a relative position */
function positionOffset(pos: RelativePosition): { x: number; y: number } {
  switch (pos) {
    case 'bottom': return { x: 0, y: 80 };
    case 'top': return { x: 0, y: -80 };
    case 'left': return { x: -80, y: 0 };
    case 'right': return { x: 80, y: 0 };
    case 'top-left': return { x: -60, y: -60 };
    case 'top-right': return { x: 60, y: -60 };
    case 'bottom-left': return { x: -60, y: 60 };
    case 'bottom-right': return { x: 60, y: 60 };
  }
}

export default function TableCenter() {
  const trick = useStore((s) => s.trickDisplay);
  const seats = useStore((s) => s.publicState?.seats ?? []);
  const youSeat = useStore((s) => s.youSeat);
  const totalPlayers = useStore((s) => s.publicState?.players ?? 4);
  const trumpSuit = useStore((s) => s.publicState?.trumpSuit ?? 'N');
  const levelRank = useStore((s) => s.publicState?.levelRank ?? '2');
  const serverWinnerSeat = useStore((s) => s.trickWinnerSeat);

  const mySeat = youSeat ?? 0;
  const t = useT();

  // Use server-authoritative winner when available (from TRICK_END),
  // fall back to client estimate while trick is still being played
  const winningSeat = useMemo(() => {
    if (serverWinnerSeat !== null) return serverWinnerSeat;
    if (!trick || trick.length < 2 || trumpSuit === 'N') return null;
    return computeTrickWinner(trick, levelRank, trumpSuit);
  }, [serverWinnerSeat, trick, levelRank, trumpSuit]);

  // Compute exit target: direction of winner seat
  const winnerPos = winningSeat !== null
    ? getRelativePosition(mySeat, winningSeat, totalPlayers)
    : null;
  const exitTarget = winnerPos ? positionOffset(winnerPos) : { x: 0, y: 0 };

  return (
    <div className="table-center">
      <div className="table-center-inner">
        {(!trick || trick.length === 0) ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="no-trick-msg">{t('table.noTrick')}</span>
          </div>
        ) : (
          <AnimatePresence>
            {trick.map((play) => {
              const pos = getRelativePosition(mySeat, play.seat, totalPlayers);
              const name = seats.find((s) => s.seat === play.seat)?.name || `${t('seat.seat')} ${play.seat + 1}`;
              const isWinning = winningSeat === play.seat && trick.length > 1;
              // Directional initial offset based on seat position
              const entryOffset = positionOffset(pos);
              return (
                <motion.div
                  key={`trick-${play.seat}`}
                  className={`trick-play pos-${pos} ${isWinning ? 'trick-winning' : ''}`}
                  initial={{ x: entryOffset.x * 0.75, y: entryOffset.y * 0.75, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  exit={{ ...exitTarget, opacity: 0, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div>
                    <div className={`trick-player-label ${isWinning ? 'winning' : ''}`}>
                      {isWinning && '\u2605 '}{name}{isWinning && ' \u2605'}
                    </div>
                    <div style={{ display: 'flex' }}>
                      {play.cards.map((c) => (
                        <CardFace key={c} id={c} mini />
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
