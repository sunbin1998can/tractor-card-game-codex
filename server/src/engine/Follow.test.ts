import { describe, expect, it } from 'vitest';
import { analyze } from './RulesEngine';
import { validateFollowPlay } from './Follow';
import type { Card, Rank, Suit } from './types';

function makeCard(suit: Suit | 'J', rank: Rank, deck: 1 | 2): Card {
  const id = rank === 'SJ' || rank === 'BJ' ? `D${deck}_${rank}` : `D${deck}_${suit}_${rank}`;
  return { id, suit, rank, deck };
}

const state = { levelRank: '2' as Rank, trumpSuit: 'H' as Suit };

function leadPattern(cards: Card[]) {
  return analyze(cards, state.levelRank, state.trumpSuit);
}

describe('validateFollowPlay', () => {
  it('must follow suitGroup when possible', () => {
    const lead = leadPattern([makeCard('S', '5', 1)]);
    const hand = [makeCard('S', '6', 1), makeCard('H', '7', 1)];
    const play = [hand[1].id];
    const res = validateFollowPlay(lead, play, hand, state);
    expect(res.ok).toBe(false);
  });

  it('can play any if void in lead suitGroup', () => {
    const lead = leadPattern([makeCard('S', '5', 1)]);
    const hand = [makeCard('H', '7', 1), makeCard('D', '8', 1)];
    const play = [hand[0].id];
    const res = validateFollowPlay(lead, play, hand, state);
    expect(res.ok).toBe(true);
  });

  it('must follow pair when pair exists', () => {
    const lead = leadPattern([makeCard('S', '5', 1), makeCard('S', '5', 2)]);
    const hand = [makeCard('S', '6', 1), makeCard('S', '6', 2), makeCard('S', '9', 1)];
    const play = [hand[0].id, hand[2].id];
    const res = validateFollowPlay(lead, play, hand, state);
    expect(res.ok).toBe(false);
  });

  it('allows non-pair if no pair exists in suitGroup', () => {
    const lead = leadPattern([makeCard('S', '5', 1), makeCard('S', '5', 2)]);
    const hand = [makeCard('S', '6', 1), makeCard('S', '9', 1), makeCard('D', '2', 1)];
    const play = [hand[0].id, hand[1].id];
    const res = validateFollowPlay(lead, play, hand, state);
    expect(res.ok).toBe(true);
  });

  it('rejects mixed follow when full tractor exists', () => {
    const lead = leadPattern([
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2)
    ]);
    const hand = [
      makeCard('S', '7', 1),
      makeCard('S', '7', 2),
      makeCard('S', '8', 1),
      makeCard('S', '8', 2)
    ];
    const play = [hand[0].id, hand[1].id, hand[2].id, hand[3].id];
    const res = validateFollowPlay(lead, play, hand, state);
    expect(res.ok).toBe(true);

    const badPlay = [hand[0].id, hand[1].id, hand[2].id, hand[2].id];
    const resBad = validateFollowPlay(lead, badPlay, hand, state);
    expect(resBad.ok).toBe(false);
  });

  it('cannot shorten a tractor when full tractor exists', () => {
    const lead = leadPattern([
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2),
      makeCard('S', '7', 1),
      makeCard('S', '7', 2)
    ]);
    const hand = [
      makeCard('S', '8', 1),
      makeCard('S', '8', 2),
      makeCard('S', '9', 1),
      makeCard('S', '9', 2),
      makeCard('S', '10', 1),
      makeCard('S', '10', 2)
    ];
    const badPlay = [
      hand[0].id,
      hand[1].id,
      hand[2].id,
      hand[2].id,
      hand[4].id,
      hand[5].id
    ];
    const res = validateFollowPlay(lead, badPlay, hand, state);
    expect(res.ok).toBe(false);
  });

  it('enforces insufficient tractor template', () => {
    const lead = leadPattern([
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2),
      makeCard('S', '7', 1),
      makeCard('S', '7', 2)
    ]);
    const hand = [
      makeCard('S', '8', 1),
      makeCard('S', '8', 2),
      makeCard('S', '9', 1),
      makeCard('S', '9', 2),
      makeCard('S', '10', 1),
      makeCard('S', '3', 1),
      makeCard('H', 'Q', 1)
    ];

    const play = [
      hand[0].id,
      hand[1].id,
      hand[2].id,
      hand[3].id,
      hand[4].id,
      hand[5].id
    ];
    const res = validateFollowPlay(lead, play, hand, state);
    expect(res.ok).toBe(true);

    const badPlay = [
      hand[0].id,
      hand[1].id,
      hand[2].id,
      hand[3].id,
      hand[4].id,
      hand[6].id
    ];
    const resBad = validateFollowPlay(lead, badPlay, hand, state);
    expect(resBad.ok).toBe(false);
  });

  it('rejects splitting pair when pairs available in insufficient follow', () => {
    const lead = leadPattern([
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2)
    ]);
    const hand = [
      makeCard('S', '8', 1),
      makeCard('S', '8', 2),
      makeCard('S', '9', 1),
      makeCard('D', 'Q', 1)
    ];
    const badPlay = [hand[0].id, hand[2].id, hand[3].id, makeCard('H', 'A', 1).id];
    const res = validateFollowPlay(lead, badPlay, hand, state);
    expect(res.ok).toBe(false);
  });

  it('allows play when group cards are fewer than lead size', () => {
    const lead = leadPattern([
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2)
    ]);
    const hand = [
      makeCard('S', '9', 1),
      makeCard('H', 'Q', 1),
      makeCard('D', 'A', 1),
      makeCard('H', '3', 1)
    ];
    const play = [hand[0].id, hand[1].id, hand[2].id, hand[3].id];
    const res = validateFollowPlay(lead, play, hand, state);
    expect(res.ok).toBe(true);
  });

  it('rejects missing group cards when group size < lead size', () => {
    const lead = leadPattern([
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2)
    ]);
    const hand = [
      makeCard('S', '9', 1),
      makeCard('S', '10', 1),
      makeCard('H', 'Q', 1),
      makeCard('D', 'A', 1),
      makeCard('H', '3', 1),
      makeCard('D', '4', 1)
    ];
    const play = [hand[2].id, hand[3].id, hand[4].id, hand[5].id];
    const res = validateFollowPlay(lead, play, hand, state);
    expect(res.ok).toBe(false);
  });
});
