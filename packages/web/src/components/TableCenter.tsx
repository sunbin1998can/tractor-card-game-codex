import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { getRelativePosition, type RelativePosition } from './GameTable';
import CardFace from './CardFace';
import { motion, AnimatePresence } from 'motion/react';
import { type Rank, type Suit, suitGroupForCard, cardStrength } from '../cardUtils';

function computeTrickWinner(
  trick: { seat: number; cards: string[] }[],
  levelRank: string,
  trumpSuit: string
): number | null {
  if (trick.length === 0) return null;
  const lr = levelRank as Rank;
  const ts = trumpSuit as Suit;
  const leadGroup = suitGroupForCard(trick[0].cards[0], lr, ts);
  if (!leadGroup) return null;

  let bestSeat = trick[0].seat;
  let bestStrength = Math.max(...trick[0].cards.map((c) => cardStrength(c, levelRank, trumpSuit)));

  for (let i = 1; i < trick.length; i++) {
    const play = trick[i];
    const playGroup = suitGroupForCard(play.cards[0], lr, ts);
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

/** Data-driven positioning — cards stay in front of each player's seat area */
function trickPositionStyle(pos: RelativePosition): React.CSSProperties {
  switch (pos) {
    case 'bottom': return { bottom: '15%', left: '50%', transform: 'translateX(-50%)' };
    case 'top': return { top: '12%', left: '50%', transform: 'translateX(-50%)' };
    case 'left': return { left: '8%', top: '50%', transform: 'translateY(-50%)' };
    case 'right': return { right: '8%', top: '50%', transform: 'translateY(-50%)' };
    case 'top-left': return { top: '18%', left: '15%' };
    case 'top-right': return { top: '18%', right: '15%' };
    case 'bottom-left': return { bottom: '18%', left: '15%' };
    case 'bottom-right': return { bottom: '18%', right: '15%' };
  }
}

function cardLabel(id: string): string {
  const p = id.split('_');
  if (p.length === 2 && (p[1] === 'SJ' || p[1] === 'BJ')) return p[1];
  if (p.length !== 3) return id;
  const suitMap: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
  return `${suitMap[p[1]] ?? p[1]}${p[2]}`;
}

export default function TableCenter() {
  const trick = useStore((s) => s.trickDisplay);
  const seats = useStore((s) => s.publicState?.seats ?? []);
  const youSeat = useStore((s) => s.youSeat);
  const totalPlayers = useStore((s) => s.publicState?.players ?? 4);
  const trumpSuit = useStore((s) => s.publicState?.trumpSuit ?? 'N');
  const levelRank = useStore((s) => s.publicState?.levelRank ?? '2');
  const serverWinnerSeat = useStore((s) => s.trickWinnerSeat);
  const dragActive = useStore((s) => s.dragActive);
  const phase = useStore((s) => s.publicState?.phase);
  const turnSeat = useStore((s) => s.publicState?.turnSeat);

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
  const winnerName = winningSeat !== null
    ? seats.find((s) => s.seat === winningSeat)?.name || `${t('seat.seat')} ${winningSeat + 1}`
    : '';

  const showDropZone = dragActive && phase === 'TRICK_PLAY' && turnSeat === youSeat;

  return (
    <div className="table-center">
      <div className={`play-drop-zone${showDropZone ? ' active' : ''}`}>
        {showDropZone && <span className="play-drop-zone-label">{t('action.play')}</span>}
      </div>
      <div className="table-center-inner">
        {(!trick || trick.length === 0) ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="no-trick-msg">{t('table.noTrick')}</span>
          </div>
        ) : (
          <AnimatePresence>
            {trick.map((play, index) => {
              const pos = getRelativePosition(mySeat, play.seat, totalPlayers);
              const name = seats.find((s) => s.seat === play.seat)?.name || `${t('seat.seat')} ${play.seat + 1}`;
              const isWinning = winningSeat === play.seat && trick.length > 1;
              const entryOffset = positionOffset(pos);
              const isMine = play.seat === mySeat;
              return (
                <motion.div
                  key={`trick-${play.seat}`}
                  className={`trick-play ${isWinning ? 'trick-winning' : ''}`}
                  style={{
                    ...trickPositionStyle(pos),
                    zIndex: isMine ? 2 : 1,
                  } as CSSProperties}
                  initial={{
                    x: entryOffset.x * 0.75,
                    y: entryOffset.y * 0.75,
                    opacity: 0,
                    scale: 0.92,
                  }}
                  animate={
                    serverWinnerSeat !== null
                      ? {
                          x: exitTarget.x * 0.92,
                          y: exitTarget.y * 0.92,
                          opacity: 0.08,
                          scale: 0.58,
                        }
                      : {
                          x: 0,
                          y: 0,
                          opacity: 1,
                          scale: 1,
                        }
                  }
                  exit={{ x: exitTarget.x, y: exitTarget.y, opacity: 0, scale: 0.45 }}
                  transition={
                    serverWinnerSeat !== null
                      ? { duration: 0.72, ease: 'easeInOut', delay: index * 0.04 }
                      : { type: 'spring', stiffness: 320, damping: 24, delay: index * 0.02 }
                  }
                >
                  <div>
                    <div className={`trick-player-label ${isWinning ? 'winning' : ''}`}>
                      {isWinning && '\u2605 '}{name}{isWinning && ' \u2605'}: {play.cards.map((id) => cardLabel(id)).join(' ')}
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
            {serverWinnerSeat !== null && (
              <motion.div
                key={`trick-win-banner-${serverWinnerSeat}-${trick.length}`}
                className="trick-win-banner"
                initial={{ opacity: 0, scale: 0.72, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.84, y: -10 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              >
                <div className="trick-win-title">{t('table.trickTaken')}</div>
                <div className="trick-win-name">{winnerName} {t('table.winsTrick')}</div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
