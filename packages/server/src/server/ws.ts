import { WebSocketServer, WebSocket } from 'ws';
import { GameEngine, validateFollowPlay } from '@tractor/engine';
import type { Card } from '@tractor/engine';
import type { ClientMessage, ServerMessage, PublicRoomState, RoundResult } from '@tractor/protocol';
import { verifyAuthToken } from '../auth.js';
import {
  createRoomPersistence,
  onMatchStart,
  onRoundStart,
  onRoundEvent,
  onRoundEnd,
  onMatchEnd,
  type RoomPersistence,
} from '../persistence.js';

interface SeatState {
  seat: number;
  name: string;
  team: number;
  ws?: WebSocket;
  sessionToken: string;
  isConnected: boolean;
  lastSeen: number;
  ready: boolean;
  userId: string | null;
}

interface Room {
  id: string;
  players: number;
  engine: GameEngine;
  seats: SeatState[];
  kittySize: number;
  dealingInProgress?: boolean;
  dealingTimer?: NodeJS.Timeout;
  declareSeat?: number;
  declareUntilMs?: number;
  declareEnabled?: boolean;
  noSnatchSeats?: Set<number>;
  resumeTailDeal?: (() => void) | null;
  finalDeclarePauseDone?: boolean;
  tailDealCount?: number;
  fairnessTimer?: NodeJS.Timeout;
  lastRoundResult?: RoundResult;
  persistence: RoomPersistence | null;
  matchStarted?: boolean;
}

const rooms = new Map<string, Room>();
const DISCONNECT_GRACE_MS = 120_000;
const DEAL_STEP_MS = 80;
const FINAL_DECLARE_PAUSE_MS = 30_000;
const TRUMP_FAIRNESS_WINDOW_MS = 30_000;

function now() {
  return Date.now();
}

function send(ws: WebSocket | undefined, msg: ServerMessage) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function broadcast(room: Room, msg: ServerMessage) {
  for (const seat of room.seats) send(seat.ws, msg);
}

function sendPrivate(room: Room, seat: number, msg: ServerMessage) {
  const s = room.seats.find((x) => x.seat === seat);
  if (!s) return;
  send(s.ws, msg);
}

function sendHand(room: Room, seat: number) {
  const hand = room.engine.hands[seat]?.map((c) => c.id) ?? [];
  sendPrivate(room, seat, { type: 'DEAL', hand });
}

function makeSessionToken() {
  return crypto.randomUUID();
}

function createDeck(): Card[] {
  const suits: Array<'S' | 'H' | 'D' | 'C'> = ['S', 'H', 'D', 'C'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
  const cards: Card[] = [];

  for (const deck of [1, 2] as const) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({ id: `D${deck}_${suit}_${rank}`, suit, rank, deck });
      }
    }
    cards.push({ id: `D${deck}_SJ`, suit: 'J', rank: 'SJ', deck });
    cards.push({ id: `D${deck}_BJ`, suit: 'J', rank: 'BJ', deck });
  }

  return cards;
}

function cryptoRandom(): number {
  // Use crypto for better entropy when available
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] / 0x100000000;
  }
  return Math.random();
}

function shuffle(cards: Card[]) {
  // Fisher-Yates with crypto-grade randomness, 3 passes for thorough mixing
  for (let pass = 0; pass < 3; pass++) {
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(cryptoRandom() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }
}

function deal(room: Room) {
  const deck = createDeck();
  shuffle(deck);

  const kitty = deck.slice(0, room.kittySize);
  const rest = deck.slice(room.kittySize);

  room.engine.setHands(Array.from({ length: room.players }, () => []), kitty);
  room.dealingInProgress = true;

  // Persistence hooks
  if (!room.matchStarted) {
    room.matchStarted = true;
    onMatchStart(
      room.persistence,
      room.id,
      room.players,
      [...room.engine.teamLevels],
      room.seats.map((s) => ({ userId: s.userId, seat: s.seat, team: s.team, name: s.name })),
    );
  }
  onRoundStart(room.persistence);
  room.declareEnabled = true;
  room.noSnatchSeats = new Set<number>();
  room.resumeTailDeal = null;
  room.finalDeclarePauseDone = false;
  room.tailDealCount = room.kittySize;

  const finishDealing = () => {
    room.dealingInProgress = false;
    room.dealingTimer = undefined;
    room.declareEnabled = true;
    room.resumeTailDeal = null;
    if (room.engine.phase === 'FLIP_TRUMP' && room.engine.trumpCandidate) {
      if (room.finalDeclarePauseDone) {
        room.declareSeat = undefined;
        room.declareUntilMs = undefined;
        room.engine.finalizeTrump(now());
        flushEngineEvents(room);
        if ((room.engine.phase as string) === 'BURY_KITTY') {
          sendHand(room, room.engine.config.bankerSeat);
          broadcastState(room);
          requestAction(room, room.engine.config.bankerSeat);
          return;
        }
        broadcastState(room);
        return;
      }
      const holdUntil = now() + FINAL_DECLARE_PAUSE_MS;
      if (room.engine.trumpCandidate.expiresAt < holdUntil) {
        room.engine.trumpCandidate.expiresAt = holdUntil;
      }
      room.declareSeat = room.engine.trumpCandidate.seat;
      room.declareUntilMs = room.engine.trumpCandidate.expiresAt;
      broadcastState(room);
      ensureFairnessTimer(room);
      return;
    }
    room.declareSeat = undefined;
    room.declareUntilMs = undefined;

    room.engine.finalizeTrump(now());
    flushEngineEvents(room);
    if (room.engine.phase === 'BURY_KITTY') {
      sendHand(room, room.engine.config.bankerSeat);
      broadcastState(room);
      requestAction(room, room.engine.config.bankerSeat);
      return;
    }
    broadcastState(room);
  };

  const startFinalDeclarePause = (resumeIndex: number) => {
    const candidate = room.engine.trumpCandidate;
    if (!candidate) return false;
    room.finalDeclarePauseDone = true;
    room.noSnatchSeats = new Set<number>();

    const holdUntil = now() + FINAL_DECLARE_PAUSE_MS;
    if (candidate.expiresAt < holdUntil) {
      candidate.expiresAt = holdUntil;
    }
    room.declareSeat = candidate.seat;
    room.declareUntilMs = candidate.expiresAt;
    room.declareEnabled = true;
    broadcastState(room);
    ensureFairnessTimer(room);

    room.resumeTailDeal = () => {
      if (!room.resumeTailDeal) return;
      room.resumeTailDeal = null;
      if (room.dealingTimer) {
        clearTimeout(room.dealingTimer);
        room.dealingTimer = undefined;
      }
      room.declareSeat = undefined;
      room.declareUntilMs = undefined;
      room.declareEnabled = false;
      broadcastState(room);
      step(resumeIndex);
    };

    room.dealingTimer = setTimeout(() => {
      room.resumeTailDeal?.();
    }, FINAL_DECLARE_PAUSE_MS);
    return true;
  };

  const step = (index: number) => {
    if (index >= rest.length) {
      finishDealing();
      return;
    }

    const remaining = rest.length - index;
    const tailDealCount = room.tailDealCount ?? room.kittySize;
    const shouldPauseForFinalDeclare =
      room.engine.phase === 'FLIP_TRUMP' &&
      !!room.engine.trumpCandidate &&
      !room.finalDeclarePauseDone &&
      remaining <= tailDealCount;
    if (shouldPauseForFinalDeclare && startFinalDeclarePause(index)) {
      return;
    }

    room.declareSeat = undefined;
    room.declareUntilMs = undefined;
    room.declareEnabled = !(room.finalDeclarePauseDone && remaining <= tailDealCount);

    const seat = index % room.players;
    const card = rest[index];
    room.engine.hands[seat].push(card);
    sendHand(room, seat);
    broadcastState(room);
    room.dealingTimer = setTimeout(() => step(index + 1), DEAL_STEP_MS);
  };

  for (let i = 0; i < room.players; i += 1) {
    sendHand(room, i);
  }
  broadcastState(room);
  step(0);
}

function publicState(room: Room): PublicRoomState {
  const trick = room.engine.trick?.plays.map((p) => ({ seat: p.seat, cards: p.cards.map((c) => c.id) }));
  return {
    id: room.id,
    players: room.players,
    seats: room.seats.map((s) => ({
      seat: s.seat,
      name: s.name,
      team: s.team,
      connected: s.isConnected,
      ready: s.ready,
      cardsLeft: room.engine.hands[s.seat]?.length ?? 0
    })),
    phase: room.engine.phase,
    bankerSeat: room.engine.config.bankerSeat,
    leaderSeat: room.engine.trick?.leaderSeat,
    turnSeat: room.engine.trick?.turnSeat,
    teamLevels: [...room.engine.teamLevels],
    trumpSuit: room.engine.config.trumpSuit ?? 'N',
    levelRank: room.engine.config.levelRank,
    scores: room.engine.capturedPoints,
    capturedPointCards: [
      room.engine.capturedPointCards[0].map((c) => c.id),
      room.engine.capturedPointCards[1].map((c) => c.id)
    ],
    kittyCount: room.engine.kitty.length,
    declareSeat: room.declareSeat,
    declareUntilMs: room.declareUntilMs,
    declareEnabled: room.declareEnabled ?? room.engine.phase === 'FLIP_TRUMP',
    noSnatchSeats: room.noSnatchSeats ? [...room.noSnatchSeats] : [],
    trick,
    lastRoundResult: room.lastRoundResult
  };
}

function broadcastState(room: Room) {
  broadcast(room, { type: 'ROOM_STATE', state: publicState(room) });
}

function legalActionsFor(room: Room, seat: number): { count: number }[] {
  const handSize = room.engine.hands[seat]?.length ?? 0;
  if (handSize === 0) return [];
  if (room.engine.trick?.leadPattern) {
    return [{ count: room.engine.trick.leadPattern.size }];
  }
  const actions: { count: number }[] = [];
  for (let i = 1; i <= handSize; i += 1) actions.push({ count: i });
  return actions;
}

function requestAction(room: Room, seat: number) {
  sendPrivate(room, seat, { type: 'REQUEST_ACTION', legalActions: legalActionsFor(room, seat) });
}

function flushEngineEvents(room: Room) {
  for (const ev of room.engine.events) {
    // Record every event for persistence
    onRoundEvent(
      room.persistence,
      ev.type,
      'seat' in ev ? (ev as any).seat ?? null : null,
      'cards' in ev ? ((ev as any).cards ?? []).map((c: any) => typeof c === 'string' ? c : c.id) : null,
      ev,
    );

    if (ev.type === 'TRICK_UPDATE') {
      broadcast(room, { type: 'TRICK_UPDATE', seat: ev.seat, cards: ev.cards.map((c) => c.id) });
    } else if (ev.type === 'KOU_DI') {
      broadcast(room, {
        type: 'KOU_DI',
        cards: ev.cards.map((c) => c.id),
        pointSteps: ev.pointSteps,
        total: ev.total,
        multiplier: ev.multiplier
      });
    } else if (ev.type === 'TRUMP_LED') {
      broadcast(room, { type: 'TRUMP_LED', seat: ev.seat });
    } else if (ev.type === 'LEAD_PATTERN') {
      broadcast(room, { type: 'LEAD_PATTERN', seat: ev.seat, kind: ev.kind });
    } else if (ev.type === 'TRICK_END') {
      broadcast(room, { type: 'TRICK_END', winnerSeat: ev.winnerSeat, cards: ev.cards.map((c) => c.id) });
    } else if (ev.type === 'THROW_PUNISHED') {
      broadcast(room, {
        type: 'THROW_PUNISHED',
        seat: ev.seat,
        originalCards: ev.originalCards.map((c) => c.id),
        punishedCards: ev.punishedCards.map((c) => c.id),
        reason: ev.reason
      });
    } else if (ev.type === 'ROUND_RESULT') {
      onRoundEnd(room.persistence, {
        bankerSeat: room.engine.config.bankerSeat,
        levelRank: room.engine.config.levelRank,
        trumpSuit: room.engine.config.trumpSuit ?? 'N',
        kittyCards: ev.kittyCards.map((c: Card) => c.id),
        defenderPoints: ev.defenderPoints,
        attackerPoints: ev.attackerPoints,
        kittyPoints: ev.kittyPoints,
        kittyMultiplier: ev.killMultiplier,
        winnerTeam: ev.winnerTeam,
        winnerSide: ev.winnerSide,
        levelFrom: ev.levelFrom,
        levelTo: ev.levelTo,
        levelDelta: ev.delta,
        rolesSwapped: ev.rolesSwapped,
        newBankerSeat: ev.newBankerSeat,
      });
      room.lastRoundResult = {
        seq: (room.lastRoundResult?.seq ?? 0) + 1,
        levelFrom: ev.levelFrom,
        levelTo: ev.levelTo,
        delta: ev.delta,
        defenderPoints: ev.defenderPoints,
        attackerPoints: ev.attackerPoints,
        kittyPoints: ev.kittyPoints,
        killMultiplier: ev.killMultiplier,
        winnerTeam: ev.winnerTeam,
        winnerSide: ev.winnerSide,
        rolesSwapped: ev.rolesSwapped,
        newBankerSeat: ev.newBankerSeat,
        playedBySeat: ev.playedBySeat.map((cards) => cards.map((c) => c.id)),
        kittyCards: ev.kittyCards.map((c) => c.id),
        trickHistory: ev.trickHistory.map((t: { plays: { seat: number; cards: Card[] }[]; winnerSeat: number }) => ({
          plays: t.plays.map((p: { seat: number; cards: Card[] }) => ({ seat: p.seat, cards: p.cards.map((c: Card) => c.id) })),
          winnerSeat: t.winnerSeat,
        })),
      };
      broadcast(room, {
        type: 'ROUND_RESULT',
        advancingTeam: ev.advancingTeam,
        levelFrom: ev.levelFrom,
        levelTo: ev.levelTo,
        delta: ev.delta,
        defenderPoints: ev.defenderPoints,
        attackerPoints: ev.attackerPoints,
        kittyPoints: ev.kittyPoints,
        killMultiplier: ev.killMultiplier,
        winnerTeam: ev.winnerTeam,
        winnerSide: ev.winnerSide,
        rolesSwapped: ev.rolesSwapped,
        newBankerSeat: ev.newBankerSeat,
        nextBankerSeat: ev.nextBankerSeat,
        playedBySeat: ev.playedBySeat.map((cards: Card[]) => cards.map((c: Card) => c.id)),
        kittyCards: ev.kittyCards.map((c: Card) => c.id),
        trickHistory: ev.trickHistory.map((t: { plays: { seat: number; cards: Card[] }[]; winnerSeat: number }) => ({
          plays: t.plays.map((p: { seat: number; cards: Card[] }) => ({ seat: p.seat, cards: p.cards.map((c: Card) => c.id) })),
          winnerSeat: t.winnerSeat,
        })),
      });
    } else if (ev.type === 'GAME_OVER') {
      onMatchEnd(room.persistence, ev.winnerTeam, [...room.engine.teamLevels]);
      broadcast(room, { type: 'GAME_OVER', winnerTeam: ev.winnerTeam });
    } else if (ev.type === 'PHASE') {
      broadcast(room, { type: 'PHASE', phase: ev.phase });
    }
  }
  room.engine.events = [];
}

function ensureFairnessTimer(room: Room) {
  if (room.fairnessTimer) return;
  room.fairnessTimer = setInterval(() => {
    if (room.dealingInProgress) return;
    room.engine.finalizeTrump(now());
    flushEngineEvents(room);
    if (room.engine.phase === 'BURY_KITTY') {
      room.declareSeat = undefined;
      room.declareUntilMs = undefined;
      sendHand(room, room.engine.config.bankerSeat);
      broadcastState(room);
      requestAction(room, room.engine.config.bankerSeat);
      clearInterval(room.fairnessTimer);
      room.fairnessTimer = undefined;
    }
  }, 200);
}

function joinRoom(ws: WebSocket, msg: { roomId: string; name: string; players: number; authToken?: string }) {
  const roomId = msg.roomId.trim();
  const players = msg.players === 6 ? 6 : 4;

  let room = rooms.get(roomId);
  if (!room) {
    const kittySize = players === 6 ? 12 : 8;
    const engine = new GameEngine({
      numPlayers: players,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize,
      fairnessWindowMs: TRUMP_FAIRNESS_WINDOW_MS
    });
    room = {
      id: roomId,
      players,
      engine,
      seats: [],
      kittySize,
      persistence: createRoomPersistence(),
    };
    room.engine.startTrumpPhase();
    rooms.set(roomId, room);
  }

  // In lobby, let new joiners immediately take disconnected seats so games can start.
  const canImmediateReuseDisconnectedSeat =
    room.engine.phase === 'FLIP_TRUMP' && !room.dealingInProgress;
  const seatReuse = room.seats.find((s) => {
    if (s.isConnected) return false;
    if (canImmediateReuseDisconnectedSeat) return true;
    return now() - s.lastSeen > DISCONNECT_GRACE_MS;
  });

  const seat = seatReuse?.seat ?? room.seats.length;
  if (seat >= room.players) return;

  const sessionToken = makeSessionToken();

  const authPayload = msg.authToken ? verifyAuthToken(msg.authToken) : null;

  const seatState: SeatState = {
    seat,
    name: msg.name || `Player ${seat + 1}`,
    team: seat % 2,
    ws,
    sessionToken,
    isConnected: true,
    lastSeen: now(),
    ready: false,
    userId: authPayload?.userId ?? null,
  };

  if (seatReuse) {
    const idx = room.seats.findIndex((s) => s.seat === seat);
    room.seats[idx] = seatState;
  } else {
    room.seats.push(seatState);
  }

  send(ws, { type: 'SESSION', seat, sessionToken });
  send(ws, {
    type: 'AUTH_INFO',
    userId: seatState.userId,
    displayName: seatState.name,
    isGuest: !authPayload,
  });
  send(ws, { type: 'ROOM_STATE', state: publicState(room) });
  maybeStartRound(room);
}

function rejoinRoom(ws: WebSocket, msg: { roomId: string; sessionToken: string }) {
  const room = rooms.get(msg.roomId);
  if (!room) return;

  const seat = room.seats.find((s) => s.sessionToken === msg.sessionToken);
  if (!seat) return;

  seat.ws = ws;
  seat.isConnected = true;
  seat.lastSeen = now();

  send(ws, { type: 'SESSION', seat: seat.seat, sessionToken: seat.sessionToken });
  send(ws, { type: 'ROOM_STATE', state: publicState(room) });

  sendHand(room, seat.seat);

  if (room.engine.trick?.turnSeat === seat.seat) {
    requestAction(room, seat.seat);
  }
  maybeStartRound(room);
}

function maybeStartRound(room: Room) {
  if (room.dealingInProgress) return;
  if (room.seats.length !== room.players) return;
  if (!room.seats.every((s) => s.isConnected)) return;
  if (!room.seats.every((s) => s.ready)) return;
  if (room.engine.phase !== 'FLIP_TRUMP') return;

  deal(room);
  broadcastState(room);
}

function resetRoomAfterGameOver(room: Room) {
  if (room.dealingTimer) {
    clearTimeout(room.dealingTimer);
    room.dealingTimer = undefined;
  }
  if (room.fairnessTimer) {
    clearInterval(room.fairnessTimer);
    room.fairnessTimer = undefined;
  }
  room.dealingInProgress = false;
  room.declareSeat = undefined;
  room.declareUntilMs = undefined;
  room.declareEnabled = true;
  room.noSnatchSeats = new Set<number>();
  room.resumeTailDeal = null;
  room.finalDeclarePauseDone = false;
  room.tailDealCount = undefined;

  const bankerSeat = room.lastRoundResult?.newBankerSeat ?? room.engine.config.bankerSeat;
  room.engine = new GameEngine({
    numPlayers: room.players,
    bankerSeat,
    levelRank: '2',
    trumpSuit: 'H',
    kittySize: room.kittySize,
    fairnessWindowMs: TRUMP_FAIRNESS_WINDOW_MS
  });
  room.lastRoundResult = undefined;
  room.persistence = createRoomPersistence();
  room.matchStarted = false;
  room.engine.startTrumpPhase();
}

export function createWsServer(server: import('http').Server, path = '/ws') {
  const wss = new WebSocketServer({ server, path });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg.type === 'JOIN_ROOM') {
        joinRoom(ws, msg);
        return;
      }
      if (msg.type === 'REJOIN_ROOM') {
        rejoinRoom(ws, msg);
        return;
      }

      const room = [...rooms.values()].find((r) => r.seats.some((s) => s.ws === ws));
      if (!room) return;
      const seatState = room.seats.find((s) => s.ws === ws);
      if (!seatState) return;

      if (msg.type === 'LEAVE_ROOM') {
        seatState.isConnected = false;
        seatState.ws = undefined;
        seatState.lastSeen = now();
        broadcastState(room);
        return;
      }

      if (msg.type === 'CHAT_SEND') {
        const text = msg.text.trim().slice(0, 200);
        if (!text) return;
        broadcast(room, {
          type: 'CHAT',
          seat: seatState.seat,
          name: seatState.name || `Seat ${seatState.seat + 1}`,
          text,
          atMs: now()
        });
        return;
      }

      if (msg.type === 'READY') {
        seatState.ready = true;
        broadcastState(room);
        maybeStartRound(room);
        return;
      }

      if (msg.type === 'UNREADY') {
        seatState.ready = false;
        broadcastState(room);
        return;
      }

      if (msg.type === 'DECLARE' || msg.type === 'SNATCH') {
        if (room.engine.phase !== 'FLIP_TRUMP') {
          send(ws, { type: 'ACTION_REJECTED', action: msg.type, reason: 'NOT_IN_DECLARE_PHASE' });
          return;
        }
        if (room.dealingInProgress && room.declareEnabled === false) {
          send(ws, { type: 'ACTION_REJECTED', action: msg.type, reason: 'DECLARE_LOCKED' });
          return;
        }
        const cards = msg.cardIds
          .map((id) => room.engine.hands[seatState.seat].find((c) => c.id === id))
          .filter(Boolean) as Card[];
        const before = room.engine.trumpCandidate
          ? {
              seat: room.engine.trumpCandidate.seat,
              strength: room.engine.trumpCandidate.strength,
              trumpSuit: room.engine.trumpCandidate.trumpSuit,
              expiresAt: room.engine.trumpCandidate.expiresAt
            }
          : null;
        room.engine.flipTrump(seatState.seat, cards, now());
        const after = room.engine.trumpCandidate
          ? {
              seat: room.engine.trumpCandidate.seat,
              strength: room.engine.trumpCandidate.strength,
              trumpSuit: room.engine.trumpCandidate.trumpSuit,
              expiresAt: room.engine.trumpCandidate.expiresAt
            }
          : null;
        if (JSON.stringify(before) === JSON.stringify(after)) {
          send(ws, { type: 'ACTION_REJECTED', action: msg.type, reason: 'DECLARE_NOT_STRONGER' });
          return;
        }
        if (after) {
          room.declareSeat = after.seat;
          room.declareUntilMs = after.expiresAt;
          room.noSnatchSeats?.clear();
          broadcast(room, {
            type: 'TRUMP_DECLARED',
            seat: after.seat,
            trumpSuit: after.trumpSuit ?? 'N',
            cardIds: cards.map((c) => c.id)
          });
        }
        broadcastState(room);
        ensureFairnessTimer(room);
        return;
      }

      if (msg.type === 'NO_SNATCH') {
        if (room.engine.phase !== 'FLIP_TRUMP') return;
        if (room.declareEnabled === false) return;
        const until = Number(room.declareUntilMs ?? 0);
        if (until <= now()) return;
        if (!room.noSnatchSeats) room.noSnatchSeats = new Set<number>();
        room.noSnatchSeats.add(seatState.seat);
        broadcastState(room);

        const connectedCount = room.seats.filter((s) => s.isConnected).length;
        if (room.noSnatchSeats.size >= connectedCount) {
          // All connected players confirmed — skip remaining wait
          if (room.dealingInProgress && room.finalDeclarePauseDone && room.resumeTailDeal) {
            // Still dealing: resume tail deal immediately
            room.resumeTailDeal();
          } else if (!room.dealingInProgress && room.engine.trumpCandidate) {
            // Dealing finished: finalize trump immediately
            room.engine.trumpCandidate.expiresAt = now();
            room.engine.finalizeTrump(now());
            flushEngineEvents(room);
            if ((room.engine.phase as string) === 'BURY_KITTY') {
              room.declareSeat = undefined;
              room.declareUntilMs = undefined;
              if (room.fairnessTimer) {
                clearInterval(room.fairnessTimer);
                room.fairnessTimer = undefined;
              }
              sendHand(room, room.engine.config.bankerSeat);
              broadcastState(room);
              requestAction(room, room.engine.config.bankerSeat);
            }
          }
        }
        return;
      }

      if (msg.type === 'BURY') {
        if (room.engine.phase !== 'BURY_KITTY') {
          send(ws, { type: 'ACTION_REJECTED', action: 'BURY', reason: 'NOT_IN_BURY_PHASE' });
          return;
        }
        if (seatState.seat !== room.engine.config.bankerSeat) {
          send(ws, { type: 'ACTION_REJECTED', action: 'BURY', reason: 'ONLY_BANKER_CAN_BURY' });
          return;
        }
        if (msg.cardIds.length !== room.kittySize) {
          send(ws, {
            type: 'ACTION_REJECTED',
            action: 'BURY',
            reason: `BURY_REQUIRES_${room.kittySize}_CARDS`
          });
          return;
        }
        room.engine.buryKitty(seatState.seat, msg.cardIds);
        if ((room.engine.phase as string) !== 'TRICK_PLAY') {
          send(ws, { type: 'ACTION_REJECTED', action: 'BURY', reason: 'INVALID_BURY_SELECTION' });
          return;
        }
        sendHand(room, seatState.seat);
        flushEngineEvents(room);
        broadcastState(room);
        if (room.engine.trick?.turnSeat !== undefined) {
          requestAction(room, room.engine.trick.turnSeat);
        }
        return;
      }

      if (msg.type === 'PLAY') {
        if (room.engine.phase !== 'TRICK_PLAY' || !room.engine.trick) {
          send(ws, { type: 'ACTION_REJECTED', action: 'PLAY', reason: 'NOT_IN_PLAY_PHASE' });
          return;
        }
        if (seatState.seat !== room.engine.trick.turnSeat) {
          send(ws, { type: 'ACTION_REJECTED', action: 'PLAY', reason: 'NOT_YOUR_TURN' });
          return;
        }
        const leadPattern = room.engine.trick.leadPattern;
        const state = {
          levelRank: room.engine.config.levelRank,
          trumpSuit: room.engine.config.trumpSuit
        };
        if (leadPattern) {
          const vr = validateFollowPlay(
            leadPattern,
            msg.cardIds,
            room.engine.hands[seatState.seat],
            state
          );
          if (!vr.ok) {
            send(ws, {
              type: 'ACTION_REJECTED',
              action: 'PLAY',
              reason: vr.reason ?? 'INVALID_PLAY',
              expectedIds: vr.expectedIds
            });
            return;
          }
        }
        room.engine.play(seatState.seat, msg.cardIds);
        sendHand(room, seatState.seat);
        flushEngineEvents(room);
        broadcastState(room);
        if (room.engine.trick?.turnSeat !== undefined) {
          requestAction(room, room.engine.trick.turnSeat);
        }
        return;
      }

      if (msg.type === 'FORCE_END_ROUND') {
        (room.engine as any).finishRound();
        flushEngineEvents(room);
        broadcastState(room);
        return;
      }

      if (msg.type === 'NEXT_ROUND') {
        if (room.engine.phase === 'ROUND_SCORE') {
          const started = room.engine.startNextRoundFromPending();
          if (!started) return;
          deal(room);
          broadcastState(room);
          return;
        }

        if (room.engine.phase === 'GAME_OVER') {
          resetRoomAfterGameOver(room);
          deal(room);
          broadcastState(room);
        }
        return;
      }
    });

    ws.on('close', () => {
      for (const room of rooms.values()) {
        const seat = room.seats.find((s) => s.ws === ws);
        if (!seat) continue;
        seat.isConnected = false;
        seat.ws = undefined;
        seat.lastSeen = now();
        broadcastState(room);
      }
    });
  });

  return wss;
}
