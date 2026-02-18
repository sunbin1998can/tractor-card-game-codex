import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';
import { suitSymbol } from '../cardUtils';
import AnimatedNumber from './AnimatedNumber';
import { TRACKS, playTrack, type TrackId } from '../bgMusic';

function parsePointCard(id: string): { rank: string; suitSymbol: string; isRed: boolean } | null {
  const parts = id.split('_');
  if (parts.length !== 3) return null;
  const suit = parts[1];
  const rank = parts[2];
  if (rank !== '5' && rank !== '10' && rank !== 'K') return null;
  const symbol =
    suit === 'S' ? '\u2660' :
    suit === 'H' ? '\u2665' :
    suit === 'D' ? '\u2666' :
    suit === 'C' ? '\u2663' : '?';
  if (symbol === '?') return null;
  return { rank, suitSymbol: symbol, isRed: suit === 'H' || suit === 'D' };
}

/** Summarize captured point cards as compact chip counts */
function capturedSummary(cards: { rank: string; suitSymbol: string; isRed: boolean }[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of cards) {
    counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  }
  const order = ['5', '10', 'K'];
  return order
    .filter((r) => counts.has(r))
    .map((r) => ({ label: r, count: counts.get(r)! }));
}

type Props = {
  playerLabel?: string;
  seatLabel?: string;
  roomId?: string;
};

export default function ScoreBoard({ playerLabel, seatLabel, roomId }: Props) {
  const state = useStore((s) => s.publicState);
  const leaveRoom = useStore((s) => s.leaveRoom);
  const toggleLang = useStore((s) => s.toggleLang);
  const muted = useStore((s) => s.muted);
  const toggleMuted = useStore((s) => s.toggleMuted);
  const muteTts = useStore((s) => s.muteTts);
  const toggleMuteTts = useStore((s) => s.toggleMuteTts);
  const cardScale = useStore((s) => s.cardScale);
  const setCardScale = useStore((s) => s.setCardScale);
  const chatHidden = useStore((s) => s.chatHidden);
  const toggleChatHidden = useStore((s) => s.toggleChatHidden);
  const t = useT();
  const winStreak = useStore((s) => s.winStreak);
  const youSeat = useStore((s) => s.youSeat);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const confirmBeforePlay = useStore((s) => s.confirmBeforePlay);
  const setConfirmBeforePlay = useStore((s) => s.setConfirmBeforePlay);
  const autoPlayLastCard = useStore((s) => s.autoPlayLastCard);
  const setAutoPlayLastCard = useStore((s) => s.setAutoPlayLastCard);
  const [surrenderConfirm, setSurrenderConfirm] = useState(false);
  const [capturedExpanded, setCapturedExpanded] = useState(false);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const ttsVoiceName = useStore((s) => s.ttsVoiceName);
  const setTtsVoiceName = useStore((s) => s.setTtsVoiceName);
  const lang = useStore((s) => s.lang);
  const bgMusic = useStore((s) => s.bgMusic);
  const setBgMusic = useStore((s) => s.setBgMusic);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const filteredVoices = voices.filter((v) =>
    lang === 'en' ? v.lang.startsWith('en') : v.lang.startsWith('zh')
  );

  if (!state) return null;

  const symbol = suitSymbol(state.trumpSuit);
  const isRed = state.trumpSuit === 'H' || state.trumpSuit === 'D';
  const defenderTeam = state.bankerSeat % 2;
  const defenderScore = state.scores[defenderTeam];
  const attackerScore = state.scores[defenderTeam === 0 ? 1 : 0];
  const attackerTeam = defenderTeam === 0 ? 1 : 0;
  const attackerPointCards = (state.capturedPointCards?.[attackerTeam] ?? [])
    .map(parsePointCard)
    .filter((c): c is { rank: string; suitSymbol: string; isRed: boolean } => c !== null);

  const defenderLevel = state.teamLevels[defenderTeam];
  const attackerLevel = state.teamLevels[attackerTeam];

  // H2: Determine which team the player is on
  const myTeam = youSeat !== null ? youSeat % 2 : -1;
  const isMyTeamDefender = myTeam === defenderTeam;

  // H1: Phase badge
  const phaseKey =
    state.phase === 'FLIP_TRUMP' ? 'phase.FLIP_TRUMP' :
    state.phase === 'BURY_KITTY' ? 'phase.BURY_KITTY' :
    state.phase === 'TRICK_PLAY' ? 'phase.TRICK_PLAY' :
    state.phase === 'ROUND_SCORE' ? 'phase.ROUND_SCORE' :
    state.phase === 'GAME_OVER' ? 'phase.GAME_OVER' : '';
  const phaseCls =
    state.phase === 'FLIP_TRUMP' ? 'flip-trump' :
    state.phase === 'BURY_KITTY' ? 'bury-kitty' :
    state.phase === 'TRICK_PLAY' ? 'trick-play' :
    'round-score';

  // H1: Trick counter
  const totalCardsInHands = state.seats.reduce((sum, s) => sum + (s.cardsLeft ?? 0), 0);
  const cardsPerPlayer = state.players === 6 ? 18 : 25;
  const totalCards = state.players * cardsPerPlayer;
  const cardsPlayed = totalCards - totalCardsInHands;
  const tricksPlayed = Math.floor(cardsPlayed / state.players);
  const totalTricks = Math.floor(totalCards / state.players);

  // Phase label with trick number
  let phaseLabel = phaseKey ? t(phaseKey) : '';
  if (state.phase === 'TRICK_PLAY') {
    phaseLabel = t('phase.TRICK_PLAY').replace('{n}', String(tricksPlayed + 1));
  }

  // H6: Captured points summary
  const summary = capturedSummary(attackerPointCards);

  // Progress bar: attacker points / 80
  const progressPct = Math.min(100, (attackerScore / 80) * 100);
  const progressColor =
    attackerScore < 30 ? '#4caf50' :
    attackerScore < 60 ? '#ff9800' : '#f44336';

  // H2: Team labels
  const defTeamLabel = myTeam >= 0
    ? (isMyTeamDefender ? t('team.yourTeamDef') : t('team.opponentDef'))
    : t('score.defenders');
  const atkTeamLabel = myTeam >= 0
    ? (isMyTeamDefender ? t('team.opponentAtk') : t('team.yourTeamAtk'))
    : t('score.attackers');

  return (
    <div className="panel scoreboard-header">
      {/* H1: Reconnecting banner */}
      {connectionStatus === 'reconnecting' && (
        <div className="reconnecting-banner">{t('conn.reconnecting')}</div>
      )}
      <div className="score-controls-left">
        {/* H1: Connection dot */}
        <span className={`conn-dot ${connectionStatus}`} title={connectionStatus} />
        <button
          className="leave-btn"
          onClick={() => {
            const phase = state?.phase;
            if (phase === 'TRICK_PLAY' && youSeat !== null) {
              if (!window.confirm(t('score.leaveConfirm'))) return;
            }
            wsClient.leave();
            leaveRoom();
          }}
        >
          {t('score.leave')}
        </button>
        {state.phase === 'TRICK_PLAY' && youSeat !== null && !state.surrenderVote && (
          surrenderConfirm ? (
            <>
              <button
                className="leave-btn surrender-btn"
                onClick={() => {
                  wsClient.send({ type: 'SURRENDER_PROPOSE' });
                  setSurrenderConfirm(false);
                }}
              >
                {t('surrender.accept')}
              </button>
              <button
                className="leave-btn"
                onClick={() => setSurrenderConfirm(false)}
              >
                {'\u2716'}
              </button>
            </>
          ) : (
            <button
              className="leave-btn surrender-btn"
              onClick={() => setSurrenderConfirm(true)}
              title={t('tooltip.surrender')}
            >
              {t('action.surrender')}
            </button>
          )
        )}
        {playerLabel && <span className="identity-chip">{playerLabel}</span>}
        {seatLabel && <span className="identity-chip">{seatLabel}</span>}
      </div>
      <div className="score-center">
        {/* H1: Phase badge */}
        <div className="score-meta-row">
          {phaseLabel && (
            <span className={`phase-badge ${phaseCls}`}>{phaseLabel}</span>
          )}
          {/* H1: Trick counter (only during TRICK_PLAY) */}
          {state.phase === 'TRICK_PLAY' && (
            <span className="phase-badge trick-play">
              {t('trick.counter').replace('{played}', String(tricksPlayed)).replace('{total}', String(totalTricks))}
            </span>
          )}
          {/* H6: Level rank display */}
          <span className="phase-badge flip-trump">
            {lang === 'en' ? `Playing ${state.levelRank}s` : `\u6253${state.levelRank}`}
          </span>
        </div>
        <div className="score-teams">
          <div className={`score-team defender${isMyTeamDefender ? ' is-your-team' : ''}`}>
            <span className="team-label">
              {defTeamLabel}
              {isMyTeamDefender && <span className="team-you-badge">{t('team.you')}</span>}
            </span>
            <AnimatedNumber value={defenderScore} className="team-score defender-score" />
            <span className="team-level">{t('score.level')} {defenderLevel}</span>
          </div>
          <span className="score-vs">{t('score.vs')}</span>
          <div className={`score-team attacker${!isMyTeamDefender && myTeam >= 0 ? ' is-your-team' : ''}`}>
            <span className="team-label">
              {atkTeamLabel}
              {!isMyTeamDefender && myTeam >= 0 && <span className="team-you-badge">{t('team.you')}</span>}
            </span>
            <AnimatedNumber value={attackerScore} className="team-score attacker-score" />
            <span className="team-level">{t('score.level')} {attackerLevel}</span>
          </div>
        </div>
        <div className="score-progress-bar">
          <div
            className="score-progress-fill"
            style={{ width: `${progressPct}%`, background: progressColor }}
          />
        </div>
        {/* H6: Captured points summary */}
        {summary.length > 0 && (
          <div className="captured-summary" onClick={() => setCapturedExpanded(!capturedExpanded)}>
            {summary.map((s) => (
              <span key={s.label} className="captured-chip">{s.label}{'\u00d7'}{s.count}</span>
            ))}
          </div>
        )}
        <div className={`score-meta-row score-collapsible${mobileExpanded ? ' expanded' : ''}`}>
          <div className="trump-wrap">
            <span>{t('score.trump')}:</span>
            <span className={`trump-mini-card ${isRed ? 'red' : state.trumpSuit === 'N' ? 'nt' : 'black'}`}>
              {state.levelRank}
              <span className="trump-mini-suit">{symbol}</span>
            </span>
          </div>
          {winStreak >= 2 && <span className="streak-badge">{'\uD83D\uDD25'} x{winStreak}</span>}
          {roomId && (
            <span className="room-badge" style={{ cursor: 'pointer' }} onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}#/room/${encodeURIComponent(roomId)}`;
              navigator.clipboard.writeText(url).then(() => {
                useStore.getState().pushToast('Invite link copied!');
              }).catch(() => {});
            }} title="Click to copy invite link">
              {t('score.room')}: {roomId} {'\uD83D\uDD17'}
            </span>
          )}
          <span className="kitty-badge">{t('score.kitty')}: {state.kittyCount}</span>
        </div>
        <button className="score-expand-btn" onClick={() => setMobileExpanded(!mobileExpanded)}>
          {mobileExpanded ? '\u25B2' : '\u25BC'} {!mobileExpanded ? t('score.trump') : ''}
        </button>
      </div>
      <div className="score-controls-right">
        <button className="lang-toggle" onClick={toggleChatHidden} title={chatHidden ? 'Show chat' : 'Hide chat'} aria-label={chatHidden ? 'Show chat' : 'Hide chat'}>
          {chatHidden ? '\uD83D\uDCAC' : '\uD83D\uDEAB'}
        </button>
        <button className="lang-toggle" onClick={toggleMuted} title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
        </button>
        <button className="lang-toggle" onClick={toggleMuteTts} title={muteTts ? t('audio.unmuteTts') : t('audio.muteTts')} aria-label={muteTts ? t('audio.unmuteTts') : t('audio.muteTts')}>
          {muteTts ? '\uD83E\uDD10' : '\uD83D\uDDE3'}
        </button>
        {filteredVoices.length > 0 && (
          <div className="voice-picker-wrap">
            <button className="lang-toggle" onClick={() => setVoicePickerOpen(!voicePickerOpen)} title="Voice">
              {'\uD83C\uDFA4'}
            </button>
            {voicePickerOpen && (
              <div className="voice-picker-dropdown">
                <select
                  value={ttsVoiceName}
                  onChange={(e) => {
                    setTtsVoiceName(e.target.value);
                    // Preview the voice
                    if (e.target.value && 'speechSynthesis' in window) {
                      const u = new SpeechSynthesisUtterance(lang === 'en' ? 'Hello' : '\u4F60\u597D');
                      const v = voices.find((v) => v.name === e.target.value);
                      if (v) u.voice = v;
                      u.lang = lang === 'en' ? 'en-US' : 'zh-CN';
                      u.volume = 0.75;
                      window.speechSynthesis.cancel();
                      window.speechSynthesis.speak(u);
                    }
                  }}
                >
                  <option value="">{lang === 'en' ? 'Default voice' : '\u9ED8\u8BA4\u58F0\u97F3'}</option>
                  {filteredVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        <select
          className="lang-toggle"
          value={bgMusic}
          onChange={(e) => {
            const track = e.target.value as TrackId;
            setBgMusic(track);
            playTrack(track);
          }}
          title={t('music.title')}
          style={{ minWidth: 50 }}
        >
          {TRACKS.map((track) => (
            <option key={track.id} value={track.id}>
              {lang === 'zh' ? track.labelZh : track.label}
            </option>
          ))}
        </select>
        <div>
          <select
            className="lang-toggle"
            value={cardScale}
            onChange={(e) => setCardScale(Number(e.target.value))}
            title="Card size"
            style={{ minWidth: 50 }}
          >
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
            <option value={2.5}>2.5x</option>
          </select>
          <div className="settings-help">{t('settings.cardScaleHelp')}</div>
        </div>
        <button className="lang-toggle" onClick={toggleLang}>{t('lang.toggle')}</button>
        <button
          className="lang-toggle"
          onClick={() => setCapturedExpanded(!capturedExpanded)}
          title="Captured cards"
        >
          {t('score.atk')}: {attackerPointCards.length}
        </button>
        {/* H3: Settings toggles */}
        <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmBeforePlay} onChange={(e) => setConfirmBeforePlay(e.target.checked)} />
          {t('settings.confirmBeforePlay')}
        </label>
        <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoPlayLastCard} onChange={(e) => setAutoPlayLastCard(e.target.checked)} />
          {t('settings.autoPlayLastCard')}
        </label>
      </div>
      {capturedExpanded && (
        <div className="captured-cards-expanded">
          {attackerPointCards.length === 0 ? (
            <span className="captured-empty">{t('score.none')}</span>
          ) : (
            attackerPointCards.map((card, i) => (
              <span
                key={`${card.rank}-${card.suitSymbol}-${i}`}
                className={`captured-mini-card ${card.isRed ? 'red' : 'black'}`}
              >
                {card.rank}
                <span>{card.suitSymbol}</span>
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}
