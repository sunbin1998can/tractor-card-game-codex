import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';
import { parseCardId, suitGroupForCard, RANK_VALUE, type Rank, type Suit } from '../cardUtils';

function parseCardRank(id: string): string | null {
  return parseCardId(id)?.rank ?? null;
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

/**
 * Advisory-only heuristic: checks if selected cards form a standard lead pattern
 * (pair or tractor) rather than a throw. This is a client-side best-effort check
 * used solely for warning display — the server remains the single source of truth
 * for play legality. May produce false positives/negatives in edge cases.
 */
function isStandardLead(cards: string[], levelRank?: string, trumpSuit?: string): boolean {
  if (!levelRank || !trumpSuit || cards.length <= 1) return true;
  // All same suit group?
  const groups = cards.map((id) => suitGroupForCard(id, levelRank as Rank, trumpSuit as Suit));
  if (groups.some((g) => !g) || groups.some((g) => g !== groups[0])) return false;
  if (cards.length === 2) {
    const a = parseCardId(cards[0]);
    const b = parseCardId(cards[1]);
    if (!a || !b) return false;
    const suitA = a.rank === 'BJ' || a.rank === 'SJ' ? 'J' : a.suit;
    const suitB = b.rank === 'BJ' || b.rank === 'SJ' ? 'J' : b.suit;
    return a.rank === b.rank && suitA === suitB;
  }
  if (cards.length % 2 !== 0) return false;
  // Check tractor
  const counts = new Map<string, number>();
  const seqValues: number[] = [];
  for (const id of cards) {
    const c = parseCardId(id);
    if (!c) return false;
    const suit = c.rank === 'BJ' || c.rank === 'SJ' ? 'J' : c.suit;
    const key = `${c.rank}|${suit}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of counts.entries()) {
    if (count !== 2) return false;
    const rank = key.split('|')[0];
    if (rank === 'BJ' || rank === 'SJ' || rank === levelRank) return false;
    const rv = RANK_VALUE[rank as Rank];
    if (!rv) return false;
    seqValues.push(rv);
  }
  const sorted = [...seqValues].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

export default function ActionPanel() {
  const selected = useStore((s) => s.selected);
  const legalActions = useStore((s) => s.legalActions);
  const publicState = useStore((s) => s.publicState);
  const youSeat = useStore((s) => s.youSeat);
  const hand = useStore((s) => s.hand);
  const confirmBeforePlay = useStore((s) => s.confirmBeforePlay);
  const t = useT();

  const [buryConfirm, setBuryConfirm] = useState(false);
  const [playConfirm, setPlayConfirm] = useState(false);
  const [surrenderNowMs, setSurrenderNowMs] = useState(() => Date.now());

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
  const totalPlayers = publicState?.players ?? 4;
  const filledSeats = new Set(publicState?.seats?.map((s) => s.seat) ?? []);
  const emptySeats = showLobbyReady
    ? Array.from({ length: totalPlayers }, (_, i) => i).filter((i) => !filledSeats.has(i))
    : [];
  const youReady = youSeat !== null ? !!publicState?.seats?.find((s) => s.seat === youSeat)?.ready : false;
  const [nowMs, setNowMs] = useState(() => Date.now());

  const surrenderVote = publicState?.surrenderVote;
  const myTeam = youSeat !== null ? youSeat % 2 : -1;
  const isSurrenderVoteActive = !!surrenderVote;
  const isSurrenderMyTeam = surrenderVote ? surrenderVote.team === myTeam : false;
  const surrenderRemainSeconds = surrenderVote
    ? Math.max(0, Math.ceil((surrenderVote.expiresAtMs - surrenderNowMs) / 1000))
    : 0;
  const myVotePending =
    isSurrenderMyTeam && youSeat !== null && surrenderVote?.votes[youSeat] === null;

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

  // H5: Required card count for play (only enforced when following, not leading)
  const requiredCount = legalActions[0]?.count ?? 0;
  const isLeaderTurn = publicState?.leaderSeat === youSeat && (publicState?.trick ?? []).length === 0;
  const wrongCount = publicState?.phase === 'TRICK_PLAY' && !isLeaderTurn && requiredCount > 0 && count !== requiredCount;

  // H5: Throw warning - leader playing non-standard pattern
  const isLeader = publicState?.leaderSeat === youSeat;
  const trick = publicState?.trick ?? [];
  const showThrowWarning =
    publicState?.phase === 'TRICK_PLAY' &&
    isYourTurn &&
    isLeader &&
    trick.length === 0 &&
    count > 1 &&
    !isStandardLead(selectedIds, publicState?.levelRank, publicState?.trumpSuit);

  // H1: Waiting indicator
  const turnSeat = publicState?.turnSeat;
  const turnName = turnSeat !== undefined
    ? publicState?.seats?.find((s) => s.seat === turnSeat)?.name || `Seat ${turnSeat + 1}`
    : '';
  const bankerSeat = publicState?.bankerSeat;
  const bankerName = bankerSeat !== undefined
    ? publicState?.seats?.find((s) => s.seat === bankerSeat)?.name || `Seat ${bankerSeat + 1}`
    : '';

  useEffect(() => {
    if (!showDeclareCountdown) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [showDeclareCountdown, declareUntilMs]);

  useEffect(() => {
    if (!isSurrenderVoteActive) return;
    const timer = window.setInterval(() => setSurrenderNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isSurrenderVoteActive]);

  // Reset confirmations when phase or turn changes
  useEffect(() => {
    setBuryConfirm(false);
    setPlayConfirm(false);
  }, [publicState?.phase, publicState?.turnSeat]);

  // Listen for keyboard shortcut play-confirm event
  useEffect(() => {
    const onPlayConfirm = () => {
      if (confirmBeforePlay) {
        setPlayConfirm(true);
      }
    };
    window.addEventListener('tractor-play-confirm', onPlayConfirm);
    return () => window.removeEventListener('tractor-play-confirm', onPlayConfirm);
  }, [confirmBeforePlay]);

  const doPlay = () => {
    wsClient.send({ type: 'PLAY', cardIds: Array.from(selected) });
    setPlayConfirm(false);
  };

  return (
    <div className="panel action-panel">
      {showLobbyReady && (
        <div className="lobby-ready-bar">
          <button
            className={`lobby-ready-btn ${youReady ? 'is-ready' : ''}`}
            onClick={() => wsClient.send({ type: youReady ? 'UNREADY' : 'READY' })}
            title={t('tooltip.ready')}
          >
            {youReady ? t('seat.cancelReady') : t('seat.readyUp')}
            <span className="key-hint">({t('key.space')})</span>
          </button>
          {youSeat !== null && (
            <button
              className="lobby-ready-btn stand-up-btn"
              onClick={() => wsClient.standUp()}
            >
              {t('seat.standUp')}
            </button>
          )}
          {emptySeats.length > 0 && (
            <button
              className="fill-bots-btn"
              onClick={() => {
                for (const seat of emptySeats) {
                  wsClient.addBot(seat, 'medium');
                }
              }}
            >
              {t('action.fillBots')} ({emptySeats.length})
            </button>
          )}
        </div>
      )}
      <div className="action-buttons">
        {isDeclarePhase && !showLobbyReady && (
          <button
            className="action-btn"
            onClick={() => {
              wsClient.send({ type: 'DECLARE', cardIds: declareCardIds });
            }}
            disabled={!canDeclareNow}
            title={t('tooltip.declare')}
          >
            {t('action.declare')}
            <span className="key-hint">(D)</span>
          </button>
        )}
        {publicState?.phase === 'BURY_KITTY' && isBanker && !buryConfirm && (
          <button
            className="action-btn"
            onClick={() => setBuryConfirm(true)}
            disabled={!canBury}
            title={t('tooltip.bury')}
          >
            {t('action.bury')} ({count}/{kittyCount})
          </button>
        )}
        {publicState?.phase === 'BURY_KITTY' && isBanker && buryConfirm && (
          <div className="bury-confirm-bar">
            <span className="bury-confirm-text">{t('action.buryConfirm')}</span>
            <button
              className="action-btn bury-yes"
              onClick={() => {
                wsClient.send({ type: 'BURY', cardIds: Array.from(selected) });
                setBuryConfirm(false);
              }}
            >
              {t('round.ok')}
            </button>
            <button
              className="action-btn bury-no"
              onClick={() => setBuryConfirm(false)}
            >
              {'\u2715'}
            </button>
          </div>
        )}
        {publicState?.phase === 'BURY_KITTY' && !isBanker && (
          <div className="waiting-indicator">
            {t('wait.forBanker').replace('{name}', bankerName)}
            <span className="waiting-dots" />
          </div>
        )}
        {publicState?.phase === 'TRICK_PLAY' && !playConfirm && (
          <>
            {canPlay ? (
              <button
                className="action-btn"
                onClick={() => {
                  if (confirmBeforePlay && isYourTurn) {
                    setPlayConfirm(true);
                  } else {
                    doPlay();
                  }
                }}
                disabled={!isYourTurn || (wrongCount && requiredCount > 0)}
                title={t('tooltip.play')}
              >
                {wrongCount && requiredCount > 0
                  ? t('action.playNeed').replace('{n}', String(requiredCount))
                  : `${t('action.play')} (${count})`}
                <span className="key-hint">({t('key.enter')})</span>
              </button>
            ) : (
              !isYourTurn && turnSeat !== youSeat && (
                <div className="waiting-indicator">
                  {t('wait.forPlayer').replace('{name}', turnName)}
                  <span className="waiting-dots" />
                </div>
              )
            )}
          </>
        )}
        {playConfirm && (
          <div className="play-confirm-bar">
            <span className="play-confirm-text">{t('action.confirmPlay')}</span>
            <button className="action-btn bury-yes" onClick={doPlay}>
              {t('round.ok')}
            </button>
            <button className="action-btn bury-no" onClick={() => setPlayConfirm(false)}>
              {'\u2715'}
            </button>
          </div>
        )}
      </div>
      {/* H5: Throw warning */}
      {showThrowWarning && (
        <div className="throw-warning">{t('warn.throwRisk')}</div>
      )}
      {/* H10: Contextual hints */}
      {isDeclarePhase && !showLobbyReady && totalCardsInHands > 0 && (
        <div className="action-hint">{t('hint.declareTrump')}</div>
      )}
      {publicState?.phase === 'BURY_KITTY' && isBanker && (
        <div className="action-hint">{t('hint.buryKitty').replace('{n}', String(kittyCount))}</div>
      )}
      {publicState?.phase === 'TRICK_PLAY' && isYourTurn && isLeader && trick.length === 0 && (
        <div className="action-hint">{t('hint.leadTrick')}</div>
      )}
      {publicState?.phase === 'TRICK_PLAY' && isYourTurn && !isLeader && (
        <div className="action-hint">{t('hint.followTrick')}</div>
      )}
      {isSurrenderVoteActive && surrenderVote && (
        <div className="surrender-vote-bar">
          <div className="surrender-vote-header">
            {t('surrender.proposed').replace(
              '{name}',
              publicState?.seats?.find((s) => s.seat === surrenderVote.proposerSeat)?.name ?? ''
            )}
            <span className="surrender-countdown">{surrenderRemainSeconds}s</span>
          </div>
          <div className="surrender-vote-chips">
            {Object.entries(surrenderVote.votes).filter(([s]) => /^\d+$/.test(s)).map(([seatStr, vote]) => {
              const seatNum = Number(seatStr);
              const name = publicState?.seats?.find((s) => s.seat === seatNum)?.name ?? `Seat ${seatNum + 1}`;
              const cls =
                vote === true ? 'yes' : vote === false ? 'no' : 'pending';
              return (
                <span key={seatStr} className={`surrender-vote-chip ${cls}`}>
                  {name}
                </span>
              );
            })}
          </div>
          {isSurrenderMyTeam && myVotePending && (
            <div className="surrender-vote-actions">
              <button
                className="action-btn bury-yes"
                onClick={() => wsClient.send({ type: 'SURRENDER_VOTE', accept: true })}
              >
                {t('surrender.accept')}
              </button>
              <button
                className="action-btn bury-no"
                onClick={() => wsClient.send({ type: 'SURRENDER_VOTE', accept: false })}
              >
                {t('surrender.reject')}
              </button>
            </div>
          )}
          {!isSurrenderMyTeam && (
            <div className="action-status">{t('surrender.opponentVoting')}</div>
          )}
        </div>
      )}
      {showDeclareCountdown && (
        <div className="declare-timer-bar">
          <div className="declare-timer-circle">
            <span className="declare-timer-number">{remainSeconds}</span>
          </div>
          <div className="declare-timer-info">
            <span className="declare-timer-label">{t('action.snatchCountdown')}</span>
            <button
              className="no-snatch-btn"
              disabled={!!youNoSnatch}
              onClick={() => wsClient.send({ type: 'NO_SNATCH' })}
              title={t('action.acceptTrumpHint')}
            >
              {youNoSnatch ? t('action.acceptedTrump') : t('action.acceptTrump')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
