import { describe, expect, it } from 'vitest';
import { analyzeThrow } from './RulesEngine';
import { checkThrowStanding, handleLeaderThrow, punishThrow } from './Throw';
import type { Card, Rank, Suit } from './types';

function makeCard(suit: Suit | 'J', rank: Rank, deck: 1 | 2): Card {
  const id = rank === 'SJ' || rank === 'BJ' ? `D${deck}_${rank}` : `D${deck}_${suit}_${rank}`;
  return { id, suit, rank, deck };
}

const state = { levelRank: '2' as Rank, trumpSuit: 'H' as Suit };

function buildThrow(cards: Card[]) {
  return analyzeThrow(cards, state.levelRank, state.trumpSuit);
}

describe('throw standing check', () => {
  it('stands when no opponent can beat', () => {
    const throwCards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2)
    ];
    const throwPat = buildThrow(throwCards);
    const opponents = [
      [makeCard('S', '3', 1), makeCard('S', '3', 2), makeCard('D', '9', 1)]
    ];

    const res = checkThrowStanding(throwPat, opponents, state);
    expect(res.stands).toBe(true);
  });

  it('fails when any opponent can beat a part', () => {
    const throwCards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2)
    ];
    const throwPat = buildThrow(throwCards);
    const opponents = [
      [
        makeCard('S', '7', 1),
        makeCard('S', '7', 2),
        makeCard('S', '8', 1),
        makeCard('S', '8', 2)
      ]
    ];

    const res = checkThrowStanding(throwPat, opponents, state);
    expect(res.stands).toBe(false);
  });

  it('trumping allowed only when void in lead suitGroup', () => {
    const throwCards = [makeCard('S', '9', 1)];
    const throwPat = buildThrow(throwCards);

    const oppHasSuit = [[makeCard('S', '3', 1), makeCard('H', 'A', 1)]];
    const res1 = checkThrowStanding(throwPat, oppHasSuit, state);
    expect(res1.stands).toBe(true);

    const oppVoid = [[makeCard('H', 'A', 1)]];
    const res2 = checkThrowStanding(throwPat, oppVoid, state);
    expect(res2.stands).toBe(false);
  });
});

describe('punish selection', () => {
  it('picks smallest single first', () => {
    const throwCards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '9', 1),
      makeCard('S', '3', 1)
    ];
    const throwPat = buildThrow(throwCards);
    const punished = punishThrow(throwPat, state);
    const ids = punished.punished.cards.map((c) => c.id).sort();
    expect(ids).toEqual([makeCard('S', '3', 1).id]);
  });

  it('picks smallest pair when no singles', () => {
    const throwCards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '9', 1),
      makeCard('S', '9', 2)
    ];
    const throwPat = buildThrow(throwCards);
    const punished = punishThrow(throwPat, state);
    const ids = punished.punished.cards.map((c) => c.id).sort();
    expect(ids).toEqual([makeCard('S', '5', 1).id, makeCard('S', '5', 2).id]);
  });

  it('picks smallest tractor when only tractors', () => {
    const throwCards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2)
    ];
    const throwPat = buildThrow(throwCards);
    const punished = punishThrow(throwPat, state);
    expect(punished.punished.kind).toBe('TRACTOR');
  });

  it('deterministic punishment', () => {
    const throwCards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '9', 1),
      makeCard('S', '3', 1)
    ];
    const throwPat = buildThrow(throwCards);
    const p1 = punishThrow(throwPat, state).punished.cards.map((c) => c.id).sort();
    const p2 = punishThrow(throwPat, state).punished.cards.map((c) => c.id).sort();
    expect(p1).toEqual(p2);
  });
});

describe('handleLeaderThrow integration', () => {
  it('punishes and emits events when throw does not stand', () => {
    const hand = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2),
      makeCard('S', '9', 1)
    ];
    const opponents = [[makeCard('S', '10', 1), makeCard('S', '10', 2)]];
    const playIds = hand.map((c) => c.id);

    const res = handleLeaderThrow(0, 0, playIds, hand, opponents, state);
    expect(res.ok).toBe(true);
    expect(res.stands).toBe(false);
    expect(res.events?.[0].type).toBe('THROW_PUNISHED');
    expect(res.events?.[1].type).toBe('TRICK_UPDATE');
  });
});
