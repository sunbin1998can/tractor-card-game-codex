import { useStore } from './store';

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
  | { type: 'ROOM_STATE'; state: any }
  | { type: 'PHASE'; phase: string }
  | { type: 'TRICK_UPDATE'; seat: number; cards: string[] }
  | { type: 'TRICK_END'; winnerSeat: number; cards: string[] }
  | { type: 'THROW_PUNISHED'; seat: number; originalCards: string[]; punishedCards: string[]; reason: string }
  | { type: 'ROUND_RESULT'; levelFrom: string; levelTo: string; delta: number; defenderPoints: number; kittyPoints: number; killMultiplier: number }
  | { type: 'GAME_OVER'; winnerTeam: number };

class WsClient {
  ws: WebSocket | null = null;
  url: string;
  reconnectDelay = 500;
  lastJoin: { roomId: string; name: string; players: number } | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      const store = useStore.getState();
      const token = store.sessionToken || localStorage.getItem('sessionToken');
      if (store.roomId && token) {
        this.send({ type: 'REJOIN_ROOM', roomId: store.roomId, sessionToken: token });
      } else if (this.lastJoin) {
        this.send({ type: 'JOIN_ROOM', ...this.lastJoin });
      }
      this.reconnectDelay = 500;
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;
      const store = useStore.getState();

      if (msg.type === 'SESSION') {
        store.setSession(msg.seat, msg.sessionToken);
      } else if (msg.type === 'ROOM_STATE') {
        store.setPublicState(msg.state);
      } else if (msg.type === 'DEAL') {
        store.setHand(msg.hand);
      } else if (msg.type === 'REQUEST_ACTION') {
        store.setLegalActions(msg.legalActions);
      } else if (msg.type === 'THROW_PUNISHED') {
        store.pushToast(`Throw punished: ${msg.reason}`);
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
    };
  }

  send(msg: ClientMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }
}

const url = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
export const wsClient = new WsClient(url);
