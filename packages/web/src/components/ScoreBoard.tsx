import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';
import AnimatedNumber from './AnimatedNumber';

function suitSymbol(suit: string) {
  if (suit === 'S') return '\u2660';
  if (suit === 'H') return '\u2665';
  if (suit === 'D') return '\u2666';
  if (suit === 'C') return '\u2663';
  if (suit === 'N') return 'NT';
  return suit;
}

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
  const t = useT();
  const winStreak = useStore((s) => s.winStreak);
  const [capturedExpanded, setCapturedExpanded] = useState(false);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const ttsVoiceName = useStore((s) => s.ttsVoiceName);
  const setTtsVoiceName = useStore((s) => s.setTtsVoiceName);
  const lang = useStore((s) => s.lang);
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

  // Progress bar: attacker points / 80
  const progressPct = Math.min(100, (attackerScore / 80) * 100);
  const progressColor =
    attackerScore < 30 ? '#4caf50' :
    attackerScore < 60 ? '#ff9800' : '#f44336';

  return (
    <div className="panel scoreboard-header">
      <div className="score-controls-left">
        <button
          className="leave-btn"
          onClick={() => {
            wsClient.leave();
            leaveRoom();
            wsClient.connect();
          }}
        >
          {t('score.leave')}
        </button>
      </div>
      <div className="score-center">
        <div className="score-teams">
          <div className="score-team defender">
            <span className="team-label">{t('score.defenders')}</span>
            <AnimatedNumber value={defenderScore} className="team-score defender-score" />
            <span className="team-level">{t('score.level')} {defenderLevel}</span>
          </div>
          <span className="score-vs">{t('score.vs')}</span>
          <div className="score-team attacker">
            <span className="team-label">{t('score.attackers')}</span>
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
        <div className="score-meta-row">
          <div className="trump-wrap">
            <span>{t('score.trump')}:</span>
            <span className={`trump-mini-card ${isRed ? 'red' : state.trumpSuit === 'N' ? 'nt' : 'black'}`}>
              {state.levelRank}
              <span className="trump-mini-suit">{symbol}</span>
            </span>
          </div>
          {winStreak >= 2 && <span className="streak-badge">{'\uD83D\uDD25'} x{winStreak}</span>}
          {roomId && <span className="room-badge">{t('score.room')}: {roomId}</span>}
          <span className="kitty-badge">{t('score.kitty')}: {state.kittyCount}</span>
          {playerLabel && <span className="identity-chip">{playerLabel}</span>}
          {seatLabel && <span className="identity-chip">{seatLabel}</span>}
        </div>
      </div>
      <div className="score-controls-right">
        <button className="lang-toggle" onClick={toggleMuted} title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
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
        <button className="lang-toggle" onClick={toggleLang}>{t('lang.toggle')}</button>
        <button
          className="lang-toggle"
          onClick={() => setCapturedExpanded(!capturedExpanded)}
          title="Captured cards"
        >
          {t('score.atk')}: {attackerPointCards.length}
        </button>
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
