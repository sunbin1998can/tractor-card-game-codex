import { useCallback, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { motion, AnimatePresence } from 'motion/react';
import CardFace from './CardFace';

type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'SJ' | 'BJ';
type Suit = 'S' | 'H' | 'D' | 'C' | 'N';
type SuitGroup = Suit | 'TRUMP';

const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14, SJ: 15, BJ: 16
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

const SUIT_ORDER: Record<Suit | 'J', number> = { S: 0, H: 1, D: 2, C: 3, N: 4, J: 5 };

function cardGroupKey(id: string, levelRank: Rank, trumpSuit: Suit): [number, number, number, string] {
  const parsed = parseCardId(id);
  if (!parsed) return [99, 99, 99, id];

  const rv = RANK_VALUE[parsed.rank];
  const suitOrder = SUIT_ORDER[parsed.suit];
  const isLevel = parsed.rank === levelRank;
  const isTrumpSuit = parsed.suit === trumpSuit;

  const band =
    parsed.rank === 'BJ' ? 0 :
    parsed.rank === 'SJ' ? 1 :
    (isLevel && isTrumpSuit) ? 2 :
    isLevel ? 3 :
    isTrumpSuit ? 4 : 5;

  return [band, suitOrder, -rv, id];
}

function useIsMobile() {
  // Simple check — could use matchMedia listener for reactivity, but
  // the component re-renders on hand changes anyway.
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
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

  const isMobile = useIsMobile();

  const sorted = useMemo(() => {
    const hasTrumpContext = !!trumpSuit && !!levelRank;
    return [...hand].sort((a, b) => {
      if (!hasTrumpContext) return a.localeCompare(b);
      const ak = cardGroupKey(a, levelRank as Rank, trumpSuit as Suit);
      const bk = cardGroupKey(b, levelRank as Rank, trumpSuit as Suit);
      if (ak[0] !== bk[0]) return ak[0] - bk[0];
      if (ak[1] !== bk[1]) return ak[1] - bk[1];
      if (ak[2] !== bk[2]) return ak[2] - bk[2];
      return ak[3].localeCompare(bk[3]);
    });
  }, [hand, trumpSuit, levelRank]);

  const hasTrumpContext = !!trumpSuit && !!levelRank;
  const isYourTurn = publicState?.turnSeat === youSeat;
  const inPlayablePhase = publicState?.phase === 'TRICK_PLAY' || publicState?.phase === 'BURY_KITTY';

  const { hintedIds, pairHintedIds } = useMemo(() => {
    let hinted = new Set<string>();
    let pairHinted = new Set<string>();

    if (publicState?.phase === 'FLIP_TRUMP' && hasTrumpContext) {
      const levelCards = hand.filter((id) => parseCardId(id)?.rank === (levelRank as Rank));
      hinted = new Set(levelCards);
      if (levelCards.length >= 2) pairHinted = new Set(levelCards);

      const smallJokers = hand.filter((id) => parseCardId(id)?.rank === 'SJ');
      if (smallJokers.length >= 2) for (const id of smallJokers) pairHinted.add(id);

      const bigJokers = hand.filter((id) => parseCardId(id)?.rank === 'BJ');
      if (bigJokers.length >= 2) for (const id of bigJokers) pairHinted.add(id);
    } else if (isYourTurn && inPlayablePhase && hasTrumpContext) {
      if (publicState?.phase === 'BURY_KITTY') {
        hinted = new Set(hand);
      } else {
        const requiredCount = legalActions[0]?.count ?? 0;
        const trick = publicState?.trick ?? [];
        if (trick.length === 0 || requiredCount <= 0) {
          hinted = new Set(hand);
        } else {
          const leadCardId = trick[0]?.cards?.[0];
          const leadGroup = leadCardId
            ? suitGroupForCard(leadCardId, levelRank as Rank, trumpSuit as Suit)
            : null;
          if (!leadGroup) {
            hinted = new Set(hand);
          } else {
            const matching = hand.filter(
              (id) => suitGroupForCard(id, levelRank as Rank, trumpSuit as Suit) === leadGroup
            );
            hinted = matching.length >= requiredCount ? new Set(matching) : new Set(hand);

            const leadIsPair = requiredCount === 2 && (trick[0]?.cards?.length ?? 0) === 2;
            if (leadIsPair) {
              const pairCounts = new Map<string, number>();
              for (const id of hinted) {
                const key = pairKeyForCard(id, levelRank as Rank, trumpSuit as Suit);
                if (!key) continue;
                pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
              }
              const withPairs = [...hinted].filter((id) => {
                const key = pairKeyForCard(id, levelRank as Rank, trumpSuit as Suit);
                return !!key && (pairCounts.get(key) ?? 0) >= 2;
              });
              pairHinted = new Set(withPairs);
            }
          }
        }
      }
    }

    return { hintedIds: hinted, pairHintedIds: pairHinted };
  }, [hand, publicState?.phase, publicState?.trick, isYourTurn, inPlayablePhase, hasTrumpContext, levelRank, trumpSuit, legalActions]);

  // When following a pair lead, auto-select both cards of a pair together
  const pairPartners = useMemo(() => {
    if (!hasTrumpContext || pairHintedIds.size === 0) return new Map<string, string>();
    const partners = new Map<string, string>();
    const byKey = new Map<string, string[]>();
    for (const id of pairHintedIds) {
      const key = pairKeyForCard(id, levelRank as Rank, trumpSuit as Suit);
      if (!key) continue;
      const list = byKey.get(key) ?? [];
      list.push(id);
      byKey.set(key, list);
    }
    for (const ids of byKey.values()) {
      if (ids.length === 2) {
        partners.set(ids[0], ids[1]);
        partners.set(ids[1], ids[0]);
      }
    }
    return partners;
  }, [pairHintedIds, hasTrumpContext, levelRank, trumpSuit]);

  const handleToggle = useCallback((id: string) => () => {
    const partner = pairPartners.get(id);
    if (partner) {
      // Auto-select/deselect both cards of the pair
      const isSelected = selected.has(id);
      if (isSelected) {
        // Deselect both
        if (selected.has(id)) toggle(id);
        if (selected.has(partner)) toggle(partner);
      } else {
        // Select both
        if (!selected.has(id)) toggle(id);
        if (!selected.has(partner)) toggle(partner);
      }
    } else {
      toggle(id);
    }
  }, [toggle, pairPartners, selected]);
  const t = useT();

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

  const bands = hasTrumpContext
    ? sorted.map((id) => cardGroupKey(id, levelRank as Rank, trumpSuit as Suit)[0])
    : null;

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
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
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
