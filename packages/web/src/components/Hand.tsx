import { useCallback, useMemo, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { motion, AnimatePresence } from 'motion/react';
import CardFace from './CardFace';
import { type Rank, type Suit, parseCardId, suitGroupForCard } from '../cardUtils';
import { useHandCards } from '../hooks/useHandCards';
import { useDragToPlay } from '../hooks/useDragToPlay';

function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}

type HandLayoutMode = 'compact' | 'suit';
type TrumpPlacement = 'top' | 'bottom';
type CompactDensity = 'tight' | 'balanced' | 'loose';
type HandGroupKey = 'TRUMP' | 'S' | 'H' | 'D' | 'C';

const HAND_GROUP_ORDER: HandGroupKey[] = ['TRUMP', 'S', 'H', 'D', 'C'];
const HAND_GROUP_I18N_KEY: Record<HandGroupKey, string> = {
  TRUMP: 'hand.group.TRUMP',
  S: 'hand.group.S',
  H: 'hand.group.H',
  D: 'hand.group.D',
  C: 'hand.group.C',
};

export default function Hand() {
  const {
    sorted, hintedIds, pairHintedIds, bands, handleToggle,
    isYourTurn, inPlayablePhase, hasTrumpContext,
    hand, selected, trumpSuit, levelRank,
  } = useHandCards();
  const { canDragToPlay, handleDragStart, handleDragEnd } = useDragToPlay();
  const t = useT();
  const hintFlash = useStore((s) => s.hintFlash);
  const hintFlashIds = useStore((s) => s.hintFlashIds);
  const clearSelect = useStore((s) => s.clearSelect);
  const isMobile = useIsMobile();
  const [layoutMode, setLayoutMode] = useState<HandLayoutMode>(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('handLayoutMode') : null;
    return saved === 'suit' ? 'suit' : 'compact';
  });
  const [trumpPlacement, setTrumpPlacement] = useState<TrumpPlacement>(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('handTrumpPlacement') : null;
    return saved === 'bottom' ? 'bottom' : 'top';
  });
  const [compactDensity, setCompactDensity] = useState<CompactDensity>(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('handCompactDensity') : null;
    if (saved === 'tight' || saved === 'loose') return saved;
    return 'balanced';
  });
  const updateLayoutMode = useCallback((mode: HandLayoutMode) => {
    sessionStorage.setItem('handLayoutMode', mode);
    setLayoutMode(mode);
  }, []);
  const updateTrumpPlacement = useCallback((placement: TrumpPlacement) => {
    sessionStorage.setItem('handTrumpPlacement', placement);
    setTrumpPlacement(placement);
  }, []);
  const updateCompactDensity = useCallback((density: CompactDensity) => {
    sessionStorage.setItem('handCompactDensity', density);
    setCompactDensity(density);
  }, []);
  const handGroupForCard = useCallback((id: string): HandGroupKey => {
    if (hasTrumpContext) {
      const group = suitGroupForCard(id, levelRank as Rank, trumpSuit as Suit);
      if (group === 'TRUMP') return 'TRUMP';
      if (group === 'S' || group === 'H' || group === 'D' || group === 'C') return group;
      return 'C';
    }
    const parsed = parseCardId(id);
    if (!parsed) return 'C';
    if (parsed.rank === 'SJ' || parsed.rank === 'BJ') return 'TRUMP';
    if (parsed.suit === 'S' || parsed.suit === 'H' || parsed.suit === 'D' || parsed.suit === 'C') {
      return parsed.suit;
    }
    return 'C';
  }, [hasTrumpContext, levelRank, trumpSuit]);
  const groupedCards = useMemo(() => {
    const groups = new Map<HandGroupKey, string[]>();
    for (const id of sorted) {
      const key = handGroupForCard(id);
      const list = groups.get(key) ?? [];
      list.push(id);
      groups.set(key, list);
    }
    const baseOrder = trumpPlacement === 'top'
      ? HAND_GROUP_ORDER
      : [...HAND_GROUP_ORDER.filter((g) => g !== 'TRUMP'), 'TRUMP'];
    return baseOrder
      .map((key) => ({ key, cards: groups.get(key) ?? [] }))
      .filter((g) => g.cards.length > 0);
  }, [sorted, handGroupForCard, trumpPlacement]);

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
  const maxArc = isMobile ? 0 : Math.min(20, totalCards * 0.8);
  const arcPerCard = totalCards > 1 ? maxArc / (totalCards - 1) : 0;
  const compactOverlap = isMobile
    ? (compactDensity === 'tight' ? -64 : compactDensity === 'loose' ? -50 : -58)
    : (compactDensity === 'tight' ? -78 : compactDensity === 'loose' ? -64 : -72);
  const overlap = layoutMode === 'compact'
    ? compactOverlap
    : (isMobile ? -46 : -56);

  return (
    <div className="hand-section">
      <div className="hand-label">
        {t('hand.title')} ({totalCards})
        {selected.size > 0 && (
          <button className="hand-clear-btn" onClick={() => clearSelect()} title={t('hand.clear')}>
            {'\u2715'} {t('hand.clear')}
          </button>
        )}
      </div>
      <div className="hand-layout-controls" role="group" aria-label={t('hand.layout')}>
        <button
          type="button"
          className={`hand-layout-btn ${layoutMode === 'compact' ? 'active' : ''}`}
          onClick={() => updateLayoutMode('compact')}
        >
          {t('hand.layoutCompact')}
        </button>
        <button
          type="button"
          className={`hand-layout-btn ${layoutMode === 'suit' ? 'active' : ''}`}
          onClick={() => updateLayoutMode('suit')}
        >
          {t('hand.layoutSuit')}
        </button>
        {layoutMode === 'compact' && (
          <>
            <button
              type="button"
              className={`hand-layout-btn ${compactDensity === 'tight' ? 'active' : ''}`}
              onClick={() => updateCompactDensity('tight')}
            >
              {t('hand.compactTight')}
            </button>
            <button
              type="button"
              className={`hand-layout-btn ${compactDensity === 'balanced' ? 'active' : ''}`}
              onClick={() => updateCompactDensity('balanced')}
            >
              {t('hand.compactBalanced')}
            </button>
            <button
              type="button"
              className={`hand-layout-btn ${compactDensity === 'loose' ? 'active' : ''}`}
              onClick={() => updateCompactDensity('loose')}
            >
              {t('hand.compactLoose')}
            </button>
          </>
        )}
        {layoutMode === 'suit' && hasTrumpContext && (
          <>
            <button
              type="button"
              className={`hand-layout-btn ${trumpPlacement === 'top' ? 'active' : ''}`}
              onClick={() => updateTrumpPlacement('top')}
            >
              {t('hand.trumpTop')}
            </button>
            <button
              type="button"
              className={`hand-layout-btn ${trumpPlacement === 'bottom' ? 'active' : ''}`}
              onClick={() => updateTrumpPlacement('bottom')}
            >
              {t('hand.trumpBottom')}
            </button>
          </>
        )}
      </div>
      <div className="hand-scroll-wrapper">
        <div className={`hand-container ${layoutMode === 'suit' ? 'layered' : 'compact'}`}>
          {layoutMode === 'compact' && (
            <AnimatePresence initial={false}>
              {sorted.map((id, i) => {
                const angle = isMobile ? 0 : -maxArc / 2 + i * arcPerCard;
                const yOffset = isMobile ? 0 : Math.abs(angle) * 0.4;
                const isSelected = selected.has(id);

                return (
                  <motion.div
                    key={id}
                    className={`hand-card-wrap${hintFlash && hintFlashIds.has(id) ? ' hint-flash' : ''}`}
                    style={{
                      marginLeft: i === 0 ? 0 : (bands && bands[i] !== bands[i - 1]) ? overlap + 10 : overlap,
                      zIndex: i,
                      transform: `rotate(${angle}deg) translateY(${yOffset - (isSelected ? 12 : 0)}px)`,
                      transformOrigin: 'bottom center',
                    }}
                    layout
                    drag
                    dragConstraints={{ top: isSelected && canDragToPlay ? -400 : -30, bottom: 30, left: -40, right: 40 }}
                    dragElastic={0.3}
                    dragSnapToOrigin
                    whileDrag={{ zIndex: 200, scale: 1.08 }}
                    onDragStart={() => handleDragStart(isSelected)}
                    onDragEnd={(e, info) => handleDragEnd(isSelected, e, info)}
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
          )}
          {layoutMode === 'suit' && (
            <div className="hand-layers">
              {groupedCards.map((group) => (
                <div key={group.key} className="hand-layer">
                  <div className={`hand-layer-label hand-layer-${group.key.toLowerCase()}`}>
                    {t(HAND_GROUP_I18N_KEY[group.key])}
                  </div>
                  <div className="hand-layer-cards">
                    <AnimatePresence initial={false}>
                      {group.cards.map((id, i) => {
                        const isSelected = selected.has(id);
                        return (
                          <motion.div
                            key={id}
                            className={`hand-card-wrap hand-card-wrap-peek${hintFlash && hintFlashIds.has(id) ? ' hint-flash' : ''}`}
                            style={{
                              marginLeft: i === 0 ? 0 : overlap,
                              zIndex: i,
                              transform: 'translateY(0)',
                            }}
                            layout
                            drag
                            dragConstraints={{ top: isSelected && canDragToPlay ? -400 : -30, bottom: 30, left: -40, right: 40 }}
                            dragElastic={0.3}
                            dragSnapToOrigin
                            whileDrag={{ zIndex: 200, scale: 1.08 }}
                            onDragStart={() => handleDragStart(isSelected)}
                            onDragEnd={(e, info) => handleDragEnd(isSelected, e, info)}
                            initial={{ y: -40, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i * 0.015 }}
                            whileHover={undefined}
                          >
                            <CardFace
                              id={id}
                              selected={isSelected}
                              hinted={hintedIds.has(id)}
                              pairHinted={pairHintedIds.has(id)}
                              dimmed={isYourTurn && inPlayablePhase && hintedIds.size < hand.length && !hintedIds.has(id)}
                              peeked
                              isTrump={hasTrumpContext && suitGroupForCard(id, levelRank as Rank, trumpSuit as Suit) === 'TRUMP'}
                              onClick={handleToggle(id)}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
