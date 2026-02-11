import { WebSocketServer, WebSocket } from 'ws';
import { GameEngine } from '../engine/GameEngine';
import type { Card } from '../engine/types';

type ClientMessage =
  | { type: 'JOIN_ROOM'; roomId: string; name: string; players: number }
  | { type: 'REJOIN_ROOM'; roomId: string; sessionToken: string }
  | { type: 'READY' }
  | { type: 'FLIP'; cardIds: string[] }
  | { type: 'SNATCH'; cardIds: string[] }
  | { type: 'BURY'; cardIds: string[] }
  | { type: 'PLAY'; cardIds: string[] };

type ServerMessage =
  | { type: 'SESSION'; seat: number; sessionToken: string }
  | { type: 'DEAL'; hand: string[] }
  | { type: 'REQUEST_ACTION'; legalActions: { count: number }[] }
  | { type: 'ROOM_STATE'; state: PublicRoomState }
  | { type: 'PHASE'; phase: string }
  | { type: 'TRICK_UPDATE'; seat: number; cards: string[] }
  | { type: 'TRICK_END'; winnerSeat: number; cards: string[] }
  | { type: 'THROW_PUNISHED'; seat: number; originalCards: string[]; punishedCards: string[]; reason: string }
  | {
      type: 'ROUND_RESULT';
      levelFrom: string;
      levelTo: string;
      delta: number;
      defenderPoints: number;
      kittyPoints: number;
      killMultiplier: number;
    }
  | { type: 'GAME_OVER'; winnerTeam: number };

interface SeatState {
  seat: number;
  name: string;
  team: number;
  ws?: WebSocket;
  sessionToken: string;
  isConnected: boolean;
  lastSeen: number;
  ready: boolean;
}

interface Room {
  id: string;
  players: number;
  engine: GameEngine;
  seats: SeatState[];
  kittySize: number;
  fairnessTimer?: NodeJS.Timeout;
}

interface PublicRoomState {
  id: string;
  players: number;
  seats: { seat: number; name: string; team: number; connected: boolean; cardsLeft: number }[];
  phase: string;
  bankerSeat: number;
  leaderSeat?: number;
  turnSeat?: number;
  trumpSuit: string;
  levelRank: string;
  scores: [number, number];
  kittyCount: number;
  trick?: { seat: number; cards: string[] }[];
}

const rooms = new Map<string, Room>();
const DISCONNECT_GRACE_MS = 120_000;

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

function shuffle(cards: Card[]) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

function deal(room: Room) {
  const deck = createDeck();
  shuffle(deck);

  const kitty = deck.slice(0, room.kittySize);
  const rest = deck.slice(room.kittySize);

  const hands: Card[][] = Array.from({ length: room.players }, () => []);
  for (let i = 0; i < rest.length; i += 1) {
    hands[i % room.players].push(rest[i]);
  }

  room.engine.setHands(hands, kitty);
  for (let i = 0; i < room.players; i += 1) {
    const hand = room.engine.hands[i].map((c) => c.id);
    sendPrivate(room, i, { type: 'DEAL', hand });
  }
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
      cardsLeft: room.engine.hands[s.seat]?.length ?? 0
    })),
    phase: room.engine.phase,
    bankerSeat: room.engine.config.bankerSeat,
    leaderSeat: room.engine.trick?.leaderSeat,
    turnSeat: room.engine.trick?.turnSeat,
    trumpSuit: room.engine.config.trumpSuit,
    levelRank: room.engine.config.levelRank,
    scores: room.engine.capturedPoints,
    kittyCount: room.engine.kitty.length,
    trick
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
    if (ev.type === 'TRICK_UPDATE') {
      broadcast(room, { type: 'TRICK_UPDATE', seat: ev.seat, cards: ev.cards.map((c) => c.id) });
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
      broadcast(room, {
        type: 'ROUND_RESULT',
        levelFrom: ev.levelFrom,
        levelTo: ev.levelTo,
        delta: ev.delta,
        defenderPoints: ev.defenderPoints,
        kittyPoints: ev.kittyPoints,
        killMultiplier: ev.killMultiplier
      });
    } else if (ev.type === 'GAME_OVER') {
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
    room.engine.finalizeTrump(now());
    flushEngineEvents(room);
    if (room.engine.phase === 'BURY_KITTY') {
      broadcastState(room);
      requestAction(room, room.engine.config.bankerSeat);
      clearInterval(room.fairnessTimer);
      room.fairnessTimer = undefined;
    }
  }, 200);
}

function joinRoom(ws: WebSocket, msg: { roomId: string; name: string; players: number }) {
  const roomId = msg.roomId.trim();
  const players = msg.players === 6 ? 6 : 4;

  let room = rooms.get(roomId);
  if (!room) {
    const kittySize = players === 6 ? 12 : 8;
    room = {
      id: roomId,
      players,
      engine: new GameEngine({
        numPlayers: players,
        bankerSeat: 0,
        levelRank: '2',
        trumpSuit: 'H',
        kittySize
      }),
      seats: [],
      kittySize
    };
    room.engine.startTrumpPhase();
    rooms.set(roomId, room);
  }

  const seatReuse = room.seats.find(
    (s) => !s.isConnected && now() - s.lastSeen > DISCONNECT_GRACE_MS
  );

  let seat = seatReuse?.seat ?? room.seats.length;
  if (seat >= room.players) return;

  const sessionToken = makeSessionToken();

  const seatState: SeatState = {
    seat,
    name: msg.name || `Player ${seat + 1}`,
    team: seat % 2,
    ws,
    sessionToken,
    isConnected: true,
    lastSeen: now(),
    ready: false
  };

  if (seatReuse) {
    const idx = room.seats.findIndex((s) => s.seat === seat);
    room.seats[idx] = seatState;
  } else {
    room.seats.push(seatState);
  }

  send(ws, { type: 'SESSION', seat, sessionToken });
  send(ws, { type: 'ROOM_STATE', state: publicState(room) });
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

  const hand = room.engine.hands[seat.seat]?.map((c) => c.id) ?? [];
  send(ws, { type: 'DEAL', hand });

  if (room.engine.trick?.turnSeat === seat.seat) {
    requestAction(room, seat.seat);
  }
}

function maybeStartRound(room: Room) {
  if (room.seats.length !== room.players) return;
  if (!room.seats.every((s) => s.ready)) return;
  if (room.engine.phase !== 'FLIP_TRUMP') return;

  deal(room);
  broadcastState(room);
}

export function createWsServer(port: number, path = '/ws') {
  const wss = new WebSocketServer({ port, path });

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

      if (msg.type === 'READY') {
        seatState.ready = true;
        maybeStartRound(room);
        return;
      }

      if (msg.type === 'FLIP' || msg.type === 'SNATCH') {
        const cards = msg.cardIds
          .map((id) => room.engine.hands[seatState.seat].find((c) => c.id === id))
          .filter(Boolean) as Card[];
        room.engine.flipTrump(seatState.seat, cards, now());
        ensureFairnessTimer(room);
        return;
      }

      if (msg.type === 'BURY') {
        room.engine.buryKitty(seatState.seat, msg.cardIds);
        flushEngineEvents(room);
        broadcastState(room);
        if (room.engine.trick?.turnSeat !== undefined) {
          requestAction(room, room.engine.trick.turnSeat);
        }
        return;
      }

      if (msg.type === 'PLAY') {
        room.engine.play(seatState.seat, msg.cardIds);
        flushEngineEvents(room);
        broadcastState(room);
        if (room.engine.trick?.turnSeat !== undefined) {
          requestAction(room, room.engine.trick.turnSeat);
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
