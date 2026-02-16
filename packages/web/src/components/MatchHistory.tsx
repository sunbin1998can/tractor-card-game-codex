import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { getStats, getRating, getMatches } from '../api';
import type { ApiStats, ApiRating, ApiMatch } from '../api';

export default function MatchHistory() {
  const authToken = useStore((s) => s.authToken);
  const t = useT();

  const [stats, setStats] = useState<ApiStats | null>(null);
  const [rating, setRating] = useState<ApiRating | null>(null);
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, r, m] = await Promise.all([
          getStats(authToken),
          getRating(authToken),
          getMatches(authToken, { limit: 20, offset: 0 }),
        ]);
        if (cancelled) return;
        setStats(s.stats);
        setRating(r.rating);
        setMatches(m.matches);
        setHasMore(m.matches.length >= 20);
      } catch {
        // API not available
      }
    })();
    return () => { cancelled = true; };
  }, [authToken]);

  const loadMore = async () => {
    if (!authToken || loading) return;
    setLoading(true);
    try {
      const m = await getMatches(authToken, { limit: 20, offset: matches.length });
      setMatches((prev) => [...prev, ...m.matches]);
      setHasMore(m.matches.length >= 20);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!authToken) return null;

  return (
    <div className="match-history-panel panel">
      <h3 className="lobby-panel-heading">{t('lobby.history')}</h3>

      {/* Stats + ELO summary */}
      <div className="history-stats-row">
        {rating && (
          <>
            <div className="stat-box">
              <span className="stat-label">{t('lobby.elo')}</span>
              <span className="stat-value elo-value">{Math.round(rating.rating)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t('lobby.peak')}</span>
              <span className="stat-value">{Math.round(rating.peakRating)}</span>
            </div>
          </>
        )}
        {stats && (
          <>
            <div className="stat-box">
              <span className="stat-label">{t('lobby.gamesPlayed')}</span>
              <span className="stat-value">{stats.totalMatches}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t('lobby.winRate')}</span>
              <span className="stat-value">{stats.totalMatches > 0 ? `${Math.round(stats.winRate * 100)}%` : '\u2014'}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t('lobby.rounds')}</span>
              <span className="stat-value">{stats.roundsPlayed}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t('lobby.levelUps')}</span>
              <span className="stat-value">{stats.totalLevelUps}</span>
            </div>
          </>
        )}
      </div>

      {/* Match list */}
      <div className="history-match-list">
        {matches.length === 0 && (
          <div className="history-empty">{t('lobby.noHistory')}</div>
        )}
        {matches.map((m) => {
          const won = m.match.winning_team === m.team;
          const finished = m.match.winning_team !== null;
          const date = m.match.started_at
            ? new Date(m.match.started_at).toLocaleDateString()
            : '';
          let levelsStart: string[] = [];
          let levelsEnd: string[] = [];
          try { levelsStart = JSON.parse(m.match.team_levels_start); } catch {}
          try { if (m.match.team_levels_end) levelsEnd = JSON.parse(m.match.team_levels_end); } catch {}

          return (
            <div
              key={m.match.id}
              className={`history-match-row ${finished ? (won ? 'win' : 'loss') : 'pending'}`}
            >
              <span className={`history-result-badge ${finished ? (won ? 'win' : 'loss') : 'pending'}`}>
                {finished ? (won ? t('lobby.win') : t('lobby.loss')) : t('lobby.inProgress')}
              </span>
              <span className="history-match-room">{m.match.room_id}</span>
              <span className="history-match-players">{m.match.player_count}P</span>
              <span className="history-match-levels">
                {levelsStart[0] ?? '?'}/{levelsStart[1] ?? '?'}
                {levelsEnd.length === 2 && (
                  <> &rarr; {levelsEnd[0]}/{levelsEnd[1]}</>
                )}
              </span>
              <span className="history-match-date">{date}</span>
            </div>
          );
        })}
      </div>
      {hasMore && matches.length > 0 && (
        <button
          className="history-load-more"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? '...' : t('lobby.loadMore')}
        </button>
      )}
    </div>
  );
}
