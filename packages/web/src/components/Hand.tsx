import { useCallback, useRef } from 'react';
import { useT } from '../i18n';
import { motion, AnimatePresence } from 'motion/react';
import CardFace from './CardFace';
import { type Rank, type Suit, suitGroupForCard } from '../cardUtils';
import { useHandCards } from '../hooks/useHandCards';

function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}

export default function Hand() {
  const {
    sorted, hintedIds, pairHintedIds, bands, handleToggle,
    isYourTurn, inPlayablePhase, hasTrumpContext,
    hand, selected, trumpSuit, levelRank,
  } = useHandCards();
  const t = useT();
  const isMobile = useIsMobile();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollBy = useCallback((dir: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 200, behavior: 'smooth' });
  }, []);

  if (!hand.length) {
    return (
      <div className="hand-section">
        <div className="hand-label">{t('hand.title')}</div>
        <div className="hand-container">
          <span className="no-trick-msg">{t('hand.noCards')}</span>
        </div>
      </div>
    );
  }

  const totalCards = sorted.length;
  const maxArc = isMobile ? 0 : Math.min(40, totalCards * 2);
  const arcPerCard = totalCards > 1 ? maxArc / (totalCards - 1) : 0;
  const overlap = isMobile ? -16 : Math.max(-24, -600 / totalCards);

  return (
    <div className="hand-section">
      <div className="hand-label">{t('hand.title')} ({totalCards})</div>
      <div className="hand-scroll-wrapper">
        <button className="hand-scroll-btn hand-scroll-left" onClick={() => scrollBy(-1)} aria-label="Scroll left">&laquo;</button>
        <div className="hand-container" ref={containerRef}>
          <AnimatePresence initial={false}>
            {sorted.map((id, i) => {
              const angle = isMobile ? 0 : -maxArc / 2 + i * arcPerCard;
              const yOffset = isMobile ? 0 : Math.abs(angle) * 0.4;
              const isSelected = selected.has(id);

              return (
                <motion.div
                  key={id}
                  className="hand-card-wrap"
                  style={{
                    marginLeft: i === 0 ? 0 : (bands && bands[i] !== bands[i - 1]) ? overlap + 10 : overlap,
                    zIndex: i,
                    transform: `rotate(${angle}deg) translateY(${yOffset - (isSelected ? 12 : 0)}px)`,
                    transformOrigin: 'bottom center',
                  }}
                  layout
                  drag
                  dragConstraints={{ top: -30, bottom: 30, left: -40, right: 40 }}
                  dragElastic={0.3}
                  dragSnapToOrigin
                  whileDrag={{ zIndex: 200, scale: 1.08 }}
                  initial={{ y: -60, opacity: 0, scale: 0.5 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i * 0.02 }}
                  whileHover={isMobile ? undefined : { y: -10, zIndex: 100 }}
                >
                  <CardFace
                    id={id}
                    selected={isSelected}
                    hinted={hintedIds.has(id)}
                    pairHinted={pairHintedIds.has(id)}
                    dimmed={isYourTurn && inPlayablePhase && hintedIds.size < hand.length && !hintedIds.has(id)}
                    isTrump={hasTrumpContext && suitGroupForCard(id, levelRank as Rank, trumpSuit as Suit) === 'TRUMP'}
                    onClick={handleToggle(id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <button className="hand-scroll-btn hand-scroll-right" onClick={() => scrollBy(1)} aria-label="Scroll right">&raquo;</button>
      </div>
    </div>
  );
}
