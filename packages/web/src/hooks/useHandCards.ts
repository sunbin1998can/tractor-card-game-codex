import { useCallback, useMemo } from 'react';
import { useStore } from '../store';
import {
  type Rank, type Suit,
  parseCardId, suitGroupForCard, pairKeyForCard, cardGroupSortKey,
} from '../cardUtils';

export function useHandCards() {
  const hand = useStore((s) => s.hand);
  const selected = useStore((s) => s.selected);
  const toggle = useStore((s) => s.toggleSelect);
  const legalActions = useStore((s) => s.legalActions);
  const youSeat = useStore((s) => s.youSeat);
  const publicState = useStore((s) => s.publicState);
  const trumpSuit = publicState?.trumpSuit;
  const levelRank = publicState?.levelRank;

  const hasTrumpContext = !!trumpSuit && !!levelRank;
  const isYourTurn = publicState?.turnSeat === youSeat;
  const inPlayablePhase = publicState?.phase === 'TRICK_PLAY' || publicState?.phase === 'BURY_KITTY';

  const sorted = useMemo(() => {
    return [...hand].sort((a, b) => {
      if (!hasTrumpContext) return a.localeCompare(b);
      const ak = cardGroupSortKey(a, levelRank as Rank, trumpSuit as Suit);
      const bk = cardGroupSortKey(b, levelRank as Rank, trumpSuit as Suit);
      if (ak[0] !== bk[0]) return ak[0] - bk[0];
      if (ak[1] !== bk[1]) return ak[1] - bk[1];
      if (ak[2] !== bk[2]) return ak[2] - bk[2];
      return ak[3].localeCompare(bk[3]);
    });
  }, [hand, trumpSuit, levelRank, hasTrumpContext]);

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
      const isSelected = selected.has(id);
      if (isSelected) {
        if (selected.has(id)) toggle(id);
        if (selected.has(partner)) toggle(partner);
      } else {
        if (!selected.has(id)) toggle(id);
        if (!selected.has(partner)) toggle(partner);
      }
    } else {
      toggle(id);
    }
  }, [toggle, pairPartners, selected]);

  const bands = hasTrumpContext
    ? sorted.map((id) => cardGroupSortKey(id, levelRank as Rank, trumpSuit as Suit)[0])
    : null;

  return {
    sorted,
    hintedIds,
    pairHintedIds,
    bands,
    handleToggle,
    isYourTurn,
    inPlayablePhase,
    hasTrumpContext,
    hand,
    selected,
    trumpSuit,
    levelRank,
  };
}
