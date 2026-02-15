import { getDb } from './db.js';
import { createMatch, finalizeMatch, recordRound } from '@tractor/models';
import { recordRoundEvents } from '@tractor/models';
import type { NewRoundEvent } from '@tractor/db';

export interface RoomPersistence {
  matchId: string | null;
  roundNumber: number;
  roundStartedAt: Date | null;
  eventBuffer: Omit<NewRoundEvent, 'id' | 'round_id'>[];
  eventSeq: number;
}

export function createRoomPersistence(): RoomPersistence | null {
  if (!getDb()) return null;
  return {
    matchId: null,
    roundNumber: 0,
    roundStartedAt: null,
    eventBuffer: [],
    eventSeq: 0,
  };
}

export function onMatchStart(
  persistence: RoomPersistence | null,
  roomId: string,
  players: number,
  teamLevels: [string, string],
  seats: { userId: string | null; seat: number; team: number; name: string }[],
): void {
  const db = getDb();
  if (!db || !persistence) return;

  createMatch(db, {
    roomId,
    playerCount: players,
    teamLevelsStart: teamLevels,
    players: seats.map((s) => ({
      userId: s.userId ?? undefined,
      seat: s.seat,
      team: s.team,
      displayName: s.name,
    })),
  })
    .then((match) => {
      persistence.matchId = match.id;
    })
    .catch(console.error);
}

export function onRoundStart(persistence: RoomPersistence | null): void {
  if (!persistence) return;
  persistence.roundNumber += 1;
  persistence.roundStartedAt = new Date();
  persistence.eventBuffer = [];
  persistence.eventSeq = 0;
}

export function onRoundEvent(
  persistence: RoomPersistence | null,
  eventType: string,
  seat: number | null,
  cards: string[] | null,
  payload: unknown,
): void {
  if (!persistence) return;
  persistence.eventSeq += 1;
  persistence.eventBuffer.push({
    seq: persistence.eventSeq,
    event_type: eventType,
    seat,
    cards,
    payload: JSON.stringify(payload),
    at_ms: Date.now(),
  });
}

export function onRoundEnd(
  persistence: RoomPersistence | null,
  roundData: {
    bankerSeat: number;
    levelRank: string;
    trumpSuit: string;
    kittyCards: string[];
    defenderPoints: number;
    attackerPoints: number;
    kittyPoints: number;
    kittyMultiplier: number;
    winnerTeam: number;
    winnerSide: 'DEFENDER' | 'ATTACKER';
    levelFrom: string;
    levelTo: string;
    levelDelta: number;
    rolesSwapped: boolean;
    newBankerSeat: number;
  },
): void {
  const db = getDb();
  if (!db || !persistence || !persistence.matchId) return;

  const matchId = persistence.matchId;
  const events = [...persistence.eventBuffer];
  const startedAt = persistence.roundStartedAt ?? new Date();

  recordRound(db, matchId, {
    round_number: persistence.roundNumber,
    banker_seat: roundData.bankerSeat,
    level_rank: roundData.levelRank,
    trump_suit: roundData.trumpSuit,
    kitty_cards: JSON.stringify(roundData.kittyCards),
    defender_points: roundData.defenderPoints,
    attacker_points: roundData.attackerPoints,
    kitty_points: roundData.kittyPoints,
    kitty_multiplier: roundData.kittyMultiplier,
    winner_team: roundData.winnerTeam,
    winner_side: roundData.winnerSide,
    level_from: roundData.levelFrom,
    level_to: roundData.levelTo,
    level_delta: roundData.levelDelta,
    roles_swapped: roundData.rolesSwapped,
    new_banker_seat: roundData.newBankerSeat,
    started_at: startedAt,
    ended_at: new Date(),
  })
    .then((round) => recordRoundEvents(db, round.id, events))
    .catch(console.error);
}

export function onMatchEnd(
  persistence: RoomPersistence | null,
  winnerTeam: number,
  teamLevels: [string, string],
): void {
  const db = getDb();
  if (!db || !persistence || !persistence.matchId) return;

  finalizeMatch(db, persistence.matchId, {
    winningTeam: winnerTeam,
    teamLevelsEnd: teamLevels,
  }).catch(console.error);
}
