import { useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';
import { suitSymbol } from '../cardUtils';
import SeatCard from './SeatCard';
import TableCenter from './TableCenter';
import CardFace from './CardFace';
import type { BotDifficulty } from '@tractor/protocol';

export type RelativePosition =
  | 'bottom'
  | 'top'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

const POSITIONS_4: RelativePosition[] = ['bottom', 'right', 'top', 'left'];
const POSITIONS_6: RelativePosition[] = [
  'bottom',
  'bottom-right',
  'top-right',
  'top',
  'top-left',
  'bottom-left'
];

export function getRelativePosition(
  youSeat: number,
  targetSeat: number,
  totalPlayers: number
): RelativePosition {
  const positions = totalPlayers === 6 ? POSITIONS_6 : POSITIONS_4;
  const offset = (targetSeat - youSeat + totalPlayers) % totalPlayers;
  return positions[offset];
}

function EmptySeatCard({ seatIdx, isSpectator }: { seatIdx: number; isSpectator: boolean }) {
  const t = useT();
  const [showDifficulty, setShowDifficulty] = useState(false);
  const difficulties: BotDifficulty[] = ['medium', 'tough', 'cheater'];
  const diffKeys: Record<string, string> = {
    simple: 'bot.simple',
    medium: 'bot.medium',
    tough: 'bot.tough',
    cheater: 'bot.cheater',
  };

  return (
    <div className="seat-card empty-seat empty-seat-cta">
      <div className="seat-avatar empty">?</div>
      <div className="seat-name">{t('seat.empty')} {seatIdx + 1}</div>
      <div className="empty-seat-actions">
        {isSpectator && (
          <button className="seat-ready-btn" onClick={() => wsClient.swapSeat(seatIdx)}>
            {t('seat.sitHere')}
          </button>
        )}
        {!showDifficulty ? (
          <button className="seat-ready-btn" onClick={() => setShowDifficulty(true)}>
            {t('bot.addBot')}
          </button>
        ) : (
          <div className="bot-difficulty-picker">
            {difficulties.map((d) => (
              <button
                key={d}
                className="seat-ready-btn bot-diff-btn"
                onClick={() => {
                  wsClient.addBot(seatIdx, d);
                  setShowDifficulty(false);
                }}
              >
                {t(diffKeys[d])}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Sidebar listing all seats in play order from your perspective */
export function SeatSidebar() {
  const state = useStore((s) => s.publicState);
  const youSeat = useStore((s) => s.youSeat);

  if (!state) return null;

  const totalPlayers = state.players;
  const mySeat = youSeat ?? 0;
  const totalCards = state.seats.reduce((sum, s) => sum + (s.cardsLeft ?? 0), 0);
  const isPreDealLobby = state.phase === 'FLIP_TRUMP' && totalCards === 0;
  const isSpectator = youSeat === null;

  // Order seats starting from player's own seat
  const ordered = Array.from({ length: totalPlayers }, (_, i) => (mySeat + i) % totalPlayers);

  return (
    <div className="seat-sidebar">
      {ordered.map((seatIdx) => {
        const seat = state.seats.find((s) => s.seat === seatIdx);
        if (!seat && isPreDealLobby) {
          return <EmptySeatCard key={seatIdx} seatIdx={seatIdx} isSpectator={isSpectator} />;
        }
        if (!seat) return null;
        const pos = getRelativePosition(mySeat, seatIdx, totalPlayers);
        return <SeatCard key={seatIdx} seat={seat} position={pos} />;
      })}
    </div>
  );
}

/** Trump indicator floating badge on the game table */
function TrumpIndicator() {
  const state = useStore((s) => s.publicState);
  const t = useT();

  if (!state) return null;
  if (state.phase !== 'TRICK_PLAY' && state.phase !== 'BURY_KITTY') return null;
  if (!state.trumpSuit || state.trumpSuit === 'N') return null;

  const symbol = suitSymbol(state.trumpSuit);
  const isRed = state.trumpSuit === 'H' || state.trumpSuit === 'D';

  return (
    <div className="trump-table-indicator">
      <span className={`trump-table-suit ${isRed ? 'red' : 'black'}`}>{symbol}</span>
      <span className="trump-table-rank">{state.levelRank}</span>
    </div>
  );
}

/** Trick history overlay panel */
function TrickHistoryPanel({ onClose }: { onClose: () => void }) {
  const trickHistory = useStore((s) => s.trickHistory);
  const state = useStore((s) => s.publicState);
  const t = useT();

  const seatName = (seat: number) =>
    state?.seats?.find((s) => s.seat === seat)?.name || `Seat ${seat + 1}`;

  return (
    <div className="trick-history-overlay">
      <div className="trick-history-header">
        <span className="trick-history-title">{t('history.title')}</span>
        <button className="trick-history-close" onClick={onClose}>{'\u2715'}</button>
      </div>
      {trickHistory.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('history.noTricks')}</div>
      ) : (
        <div className="trick-history-list">
          {trickHistory.map((trick, i) => (
            <div key={i} className="trick-history-entry">
              <span className="trick-history-num">#{i + 1}</span>
              <div className="trick-history-plays">
                {trick.plays.map((p) => (
                  <span key={p.seat} className={p.seat === trick.winnerSeat ? 'trick-history-winner' : ''}>
                    {seatName(p.seat)}: {p.cards.map((c, ci) => (
                      <CardFace key={`${c}-${ci}`} id={c} mini />
                    ))}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GameTable() {
  const state = useStore((s) => s.publicState);
  const screenShake = useStore((s) => s.screenShake);
  const [showHistory, setShowHistory] = useState(false);
  const t = useT();

  if (!state) return null;

  return (
    <div className={`game-table${screenShake ? ' screen-shake' : ''}`} style={{ position: 'relative' }}>
      <TrumpIndicator />
      <TableCenter />
      {state.phase === 'TRICK_PLAY' && (
        <button className="trick-history-toggle" onClick={() => setShowHistory(!showHistory)}>
          {t('history.title')}
        </button>
      )}
      {showHistory && <TrickHistoryPanel onClose={() => setShowHistory(false)} />}
    </div>
  );
}
