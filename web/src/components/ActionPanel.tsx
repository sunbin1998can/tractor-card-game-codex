import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { wsClient } from '../wsClient';

function parseCardRank(id: string): string | null {
  const parts = id.split('_');
  if (parts.length === 2 && (parts[1] === 'SJ' || parts[1] === 'BJ')) return parts[1];
  if (parts.length === 3) return parts[2];
  return null;
}

function canDeclareWith(cardIds: string[], levelRank?: string): boolean {
  if (!levelRank) return false;
  if (cardIds.length !== 1 && cardIds.length !== 2) return false;
  const ranks = cardIds.map(parseCardRank);
  if (ranks.some((r) => !r)) return false;

  const [r1, r2] = ranks as string[];
  if (cardIds.length === 1) {
    return r1 === levelRank;
  }

  if (r1 !== r2) return false;
  return r1 === 'BJ' || r1 === 'SJ' || r1 === levelRank;
}

function bestDeclareCardIds(hand: string[], levelRank?: string): string[] {
  if (!levelRank) return [];

  const byRank = new Map<string, string[]>();
  for (const id of hand) {
    const rank = parseCardRank(id);
    if (!rank) continue;
    const list = byRank.get(rank) ?? [];
    list.push(id);
    byRank.set(rank, list);
  }

  const bj = byRank.get('BJ') ?? [];
  if (bj.length >= 2) return bj.slice(0, 2);

  const sj = byRank.get('SJ') ?? [];
  if (sj.length >= 2) return sj.slice(0, 2);

  const level = byRank.get(levelRank) ?? [];
  if (level.length >= 2) return level.slice(0, 2);
  if (level.length >= 1) return level.slice(0, 1);
  return [];
}

export default function ActionPanel() {
  const selected = useStore((s) => s.selected);
  const legalActions = useStore((s) => s.legalActions);
  const publicState = useStore((s) => s.publicState);
  const youSeat = useStore((s) => s.youSeat);
  const hand = useStore((s) => s.hand);

  const count = selected.size;
  const canPlay = count > 0;
  const isYourTurn = publicState?.turnSeat === youSeat;
  const isBanker = publicState?.bankerSeat === youSeat;
  const kittyCount = publicState?.kittyCount ?? 0;
  const isDeclarePhase = publicState?.phase === 'FLIP_TRUMP';
  const autoDeclare = bestDeclareCardIds(hand, publicState?.levelRank);
  const selectedIds = Array.from(selected);
  const declareCardIds = selectedIds.length > 0 ? selectedIds : autoDeclare;
  const canDeclareNow =
    isDeclarePhase &&
    publicState?.declareEnabled !== false &&
    canDeclareWith(declareCardIds, publicState?.levelRank);
  const canBury =
    publicState?.phase === 'BURY_KITTY' &&
    isBanker &&
    kittyCount > 0 &&
    count === kittyCount;
  const totalCardsInHands = publicState?.seats?.reduce((sum, s) => sum + (s.cardsLeft ?? 0), 0) ?? 0;
  const showLobbyReady = publicState?.phase === 'FLIP_TRUMP' && totalCardsInHands === 0;
  const youReady = youSeat !== null ? !!publicState?.seats?.find((s) => s.seat === youSeat)?.ready : false;
  const [nowMs, setNowMs] = useState(() => Date.now());

  const declareUntilMs = Number(publicState?.declareUntilMs ?? 0);
  const showDeclareCountdown =
    publicState?.phase === 'FLIP_TRUMP' &&
    publicState?.declareEnabled !== false &&
    declareUntilMs > nowMs;
  const youNoSnatch =
    youSeat !== null &&
    Array.isArray(publicState?.noSnatchSeats) &&
    publicState.noSnatchSeats.includes(youSeat);
  const remainSeconds = showDeclareCountdown
    ? Math.max(1, Math.ceil((declareUntilMs - nowMs) / 1000))
    : 0;

  useEffect(() => {
    if (!showDeclareCountdown) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [showDeclareCountdown, declareUntilMs]);

  return (
    <div className="panel action-panel">
      {showLobbyReady && (
        <button
          className="lobby-ready-btn"
          onClick={() => wsClient.send({ type: 'READY' })}
          disabled={youReady}
        >
          {youReady ? 'Ready' : 'Ready Up'}
        </button>
      )}
      <div className="action-buttons">
        <button
          className="action-btn"
          onClick={() => {
            wsClient.send({ type: 'DECLARE', cardIds: declareCardIds });
          }}
          disabled={!canDeclareNow}
        >
          Declare
        </button>
        <button
          className="action-btn"
          onClick={() => {
            if (!canBury) return;
            const ok = window.confirm(`Bury these ${kittyCount} cards?`);
            if (!ok) return;
            wsClient.send({ type: 'BURY', cardIds: Array.from(selected) });
          }}
          disabled={!canBury}
        >
          Bury {kittyCount > 0 ? `(${kittyCount})` : ''}
        </button>
        <button
          className="action-btn"
          onClick={() => {
            wsClient.send({ type: 'PLAY', cardIds: Array.from(selected) });
          }}
          disabled={!isYourTurn || !canPlay}
        >
          Play
        </button>
      </div>
      {showDeclareCountdown && (
        <div className="declare-timer-bar">
          <div className="declare-timer-circle">
            <span className="declare-timer-number">{remainSeconds}</span>
          </div>
          <div className="declare-timer-info">
            <span className="declare-timer-label">{'反主倒计时'}</span>
            <button
              className="no-snatch-btn"
              disabled={!!youNoSnatch}
              onClick={() => wsClient.send({ type: 'NO_SNATCH' })}
            >
              {youNoSnatch ? '已选不反主' : '不反主'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
