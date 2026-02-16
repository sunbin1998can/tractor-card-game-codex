// ── Bot difficulty ──

export type BotDifficulty = 'simple' | 'medium' | 'tough' | 'cheater';

// ── Client → Server messages ──

export type ClientMessage =
  | { type: 'JOIN_ROOM'; roomId: string; name: string; players: number; authToken?: string }
  | { type: 'REJOIN_ROOM'; roomId: string; sessionToken: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'NEXT_ROUND' }
  | { type: 'CHAT_SEND'; text: string }
  | { type: 'READY' }
  | { type: 'UNREADY' }
  | { type: 'DECLARE'; cardIds: string[] }
  | { type: 'SNATCH'; cardIds: string[] }
  | { type: 'NO_SNATCH' }
  | { type: 'BURY'; cardIds: string[] }
  | { type: 'PLAY'; cardIds: string[] }
  | { type: 'FORCE_END_ROUND' }
  | { type: 'SURRENDER_PROPOSE' }
  | { type: 'SURRENDER_VOTE'; accept: boolean }
  | { type: 'ADD_BOT'; seat: number; difficulty: BotDifficulty }
  | { type: 'REMOVE_BOT'; seat: number }
  | { type: 'STAND_UP' }
  | { type: 'SWAP_SEAT'; targetSeat: number };

// ── Server → Client messages ──

export type ServerMessage =
  | { type: 'SESSION'; seat: number; sessionToken: string }
  | { type: 'DEAL'; hand: string[] }
  | { type: 'REQUEST_ACTION'; legalActions: { count: number }[] }
  | { type: 'CHAT'; seat: number; name: string; text: string; atMs: number }
  | { type: 'KOU_DI'; cards: string[]; pointSteps: number[]; total: number; multiplier: number }
  | { type: 'ACTION_REJECTED'; action: 'PLAY' | 'BURY' | 'DECLARE' | 'SNATCH' | 'ADD_BOT' | 'REMOVE_BOT' | 'STAND_UP' | 'SWAP_SEAT'; reason: string; expectedIds?: string[] }
  | { type: 'TRUMP_DECLARED'; seat: number; trumpSuit: string; cardIds: string[] }
  | { type: 'TRUMP_LED'; seat: number }
  | { type: 'LEAD_PATTERN'; seat: number; kind: 'PAIR' | 'TRACTOR' }
  | { type: 'ROOM_STATE'; state: PublicRoomState }
  | { type: 'PHASE'; phase: string }
  | { type: 'TRICK_UPDATE'; seat: number; cards: string[] }
  | { type: 'TRICK_END'; winnerSeat: number; cards: string[] }
  | { type: 'THROW_PUNISHED'; seat: number; originalCards: string[]; punishedCards: string[]; reason: string }
  | {
      type: 'ROUND_RESULT';
      advancingTeam: number;
      levelFrom: string;
      levelTo: string;
      delta: number;
      defenderPoints: number;
      attackerPoints: number;
      kittyPoints: number;
      killMultiplier: number;
      winnerTeam: number;
      winnerSide: 'DEFENDER' | 'ATTACKER';
      rolesSwapped: boolean;
      newBankerSeat: number;
      nextBankerSeat: number;
      playedBySeat: string[][];
      kittyCards: string[];
      trickHistory: { plays: { seat: number; cards: string[] }[]; winnerSeat: number }[];
    }
  | { type: 'GAME_OVER'; winnerTeam: number }
  | { type: 'AUTH_INFO'; userId: string | null; displayName: string; isGuest: boolean };

// ── Surrender vote state ──

export type SurrenderVoteState = {
  proposerSeat: number;
  team: number;
  votes: Record<number, boolean | null>;
  expiresAtMs: number;
};

// ── Shared public state types ──

export type PublicSeat = {
  seat: number;
  name: string;
  team: number;
  connected: boolean;
  ready: boolean;
  cardsLeft: number;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
};

export type RoundResult = {
  seq: number;
  levelFrom: string;
  levelTo: string;
  delta: number;
  defenderPoints: number;
  attackerPoints: number;
  kittyPoints: number;
  killMultiplier: number;
  winnerTeam: number;
  winnerSide: 'DEFENDER' | 'ATTACKER';
  rolesSwapped: boolean;
  newBankerSeat: number;
  playedBySeat: string[][];
  kittyCards: string[];
  trickHistory?: { plays: { seat: number; cards: string[] }[]; winnerSeat: number }[];
};

export type PublicRoomState = {
  id: string;
  players: number;
  seats: PublicSeat[];
  teamLevels: [string, string];
  phase: string;
  bankerSeat: number;
  leaderSeat?: number;
  turnSeat?: number;
  trumpSuit: string;
  levelRank: string;
  scores: [number, number];
  capturedPointCards: [string[], string[]];
  kittyCount: number;
  declareSeat?: number;
  declareUntilMs?: number;
  declareEnabled?: boolean;
  noSnatchSeats?: number[];
  trick?: { seat: number; cards: string[] }[];
  lastRoundResult?: RoundResult;
  surrenderVote?: SurrenderVoteState | null;
};
