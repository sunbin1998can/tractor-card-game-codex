import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import AnimatedNumber from './AnimatedNumber';
import { RatingTrendChart, RadarChart, WinRateRing } from './insights/SvgCharts';
import { WinStreakBlocks, RoleBarChart, PointsHistogram } from './insights/CssCharts';
import {
  playerProfile, stats, rating, ratingHistory, winLossStreak,
  roleBreakdown, pointsDistribution, levelProgression, aiCoachInsights,
  radarAxes, playStyleLabel, playStyleDescription, recentMatches,
  teammateSynergy, opponentMatchups, achievements,
} from './insights/mockData';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

function section(delay: number) {
  return {
    ...fadeUp,
    transition: { ...fadeUp.transition, delay },
  };
}

export default function InsightsPage() {
  const gradeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gradeRef.current) {
        const rect = gradeRef.current.getBoundingClientRect();
        confetti({
          particleCount: 60,
          spread: 70,
          origin: {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
          },
          colors: ['#ffd700', '#ffaa00', '#fff'],
          gravity: 1.2,
          scalar: 0.8,
        });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="insights-page">
      {/* Back link */}
      <motion.a href="#/" className="insights-back" {...section(0)}>
        &larr; Back to Lobby
      </motion.a>

      {/* ─── Header ─── */}
      <motion.div className="insights-header" {...section(0.05)}>
        <div className="insights-avatar-ring">
          <div className="insights-avatar">{playerProfile.avatar}</div>
        </div>
        <div className="insights-header-info">
          <h1 className="insights-player-name">
            {playerProfile.name}
            <span className="insights-ai-badge">AI Insights</span>
          </h1>
          <p className="insights-grade-label">{playerProfile.gradeLabel}</p>
        </div>
        <motion.div
          ref={gradeRef}
          className="insights-grade"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4, type: 'spring', stiffness: 200 }}
        >
          {playerProfile.grade}
        </motion.div>
      </motion.div>

      {/* ─── Stats Cards ─── */}
      <motion.div className="insights-stats-grid" {...section(0.15)}>
        <div className="insights-card">
          <div className="insights-card-title">Win Rate</div>
          <WinRateRing percent={stats.winRate} size={90} strokeWidth={7} />
          <div className="insights-card-sub">{stats.wins}W – {stats.losses}L</div>
        </div>
        <div className="insights-card">
          <div className="insights-card-title">Rating</div>
          <div className="insights-big-number">
            <AnimatedNumber value={rating.current} />
          </div>
          <div className="insights-card-sub">
            Peak: {rating.peak} <span className="insights-trend-up">&uarr;</span>
          </div>
          <div className="insights-card-rank">{rating.rank}</div>
        </div>
        <div className="insights-card">
          <div className="insights-card-title">Matches</div>
          <div className="insights-big-number">
            <AnimatedNumber value={stats.totalMatches} />
          </div>
          <div className="insights-card-sub">Best streak: {stats.bestStreak}</div>
        </div>
        <div className="insights-card">
          <div className="insights-card-title">Level</div>
          <div className="insights-level-current">{levelProgression.current}</div>
          <div className="insights-xp-bar">
            <div className="insights-xp-fill" style={{ width: `${(levelProgression.levelsCompleted / levelProgression.totalLevels) * 100}%` }} />
          </div>
          <div className="insights-card-sub">{levelProgression.levelsCompleted}/{levelProgression.totalLevels} levels</div>
        </div>
      </motion.div>

      {/* ─── AI Coach Panel ─── */}
      <motion.div className="insights-ai-panel" {...section(0.25)}>
        <div className="insights-ai-panel-header">
          <span className="insights-ai-sparkle">&#10024;</span>
          <h2>AI Coach</h2>
        </div>
        <div className="insights-ai-grid">
          {aiCoachInsights.map((insight, i) => (
            <motion.div
              key={i}
              className="insights-ai-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.1, duration: 0.4 }}
            >
              <div className="insights-ai-card-icon">{insight.icon}</div>
              <div className="insights-ai-card-body">
                <div className="insights-ai-card-title">{insight.title}</div>
                <p className="insights-ai-card-desc">{insight.description}</p>
              </div>
              <span className={`insights-trend-badge ${insight.trendType}`}>{insight.trend}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Charts Section ─── */}
      <motion.div className="insights-charts-grid" {...section(0.35)}>
        <div className="insights-panel">
          <h3 className="insights-panel-title">Rating Trend</h3>
          <RatingTrendChart data={ratingHistory} />
        </div>
        <div className="insights-panel">
          <h3 className="insights-panel-title">Recent Form</h3>
          <WinStreakBlocks streak={winLossStreak} />
        </div>
        <div className="insights-panel">
          <h3 className="insights-panel-title">Role Performance</h3>
          <RoleBarChart roles={roleBreakdown} />
        </div>
        <div className="insights-panel">
          <h3 className="insights-panel-title">Points Distribution</h3>
          <PointsHistogram data={pointsDistribution} />
        </div>
      </motion.div>

      {/* ─── Play Style ─── */}
      <motion.div className="insights-playstyle" {...section(0.45)}>
        <div className="insights-playstyle-chart">
          <RadarChart axes={radarAxes} />
        </div>
        <div className="insights-playstyle-info">
          <h2 className="insights-playstyle-label">{playStyleLabel}</h2>
          <p className="insights-playstyle-desc">{playStyleDescription}</p>
        </div>
      </motion.div>

      {/* ─── Match Timeline ─── */}
      <motion.div className="insights-panel" {...section(0.5)}>
        <h3 className="insights-panel-title">Recent Matches</h3>
        <div className="insights-timeline">
          <div className="insights-timeline-line" />
          {recentMatches.map((m) => (
            <div key={m.id} className={`insights-timeline-item ${m.result === 'W' ? 'win' : 'loss'}`}>
              <div className={`insights-timeline-dot ${m.result === 'W' ? 'win' : 'loss'}`} />
              <div className="insights-timeline-content">
                <div className="insights-timeline-header">
                  <span className={`insights-timeline-result ${m.result === 'W' ? 'win' : 'loss'}`}>{m.result}</span>
                  <span className="insights-timeline-role">{m.role}</span>
                  <span className="insights-timeline-level">{m.level}</span>
                  <span className="insights-timeline-points">{m.points}pts</span>
                </div>
                <div className="insights-timeline-moment">{m.keyMoment}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Social Section ─── */}
      <motion.div className="insights-social-grid" {...section(0.55)}>
        <div className="insights-panel">
          <h3 className="insights-panel-title">Teammate Chemistry</h3>
          {teammateSynergy.map((t) => (
            <div key={t.name} className="insights-social-row">
              <span className="insights-social-name">{t.name}</span>
              <span className="insights-social-matches">{t.matches} games</span>
              <span className="insights-social-wr">{t.winRate}%</span>
              <span className={`insights-social-grade grade-${t.grade.replace('+', 'plus')}`}>{t.grade}</span>
            </div>
          ))}
        </div>
        <div className="insights-panel">
          <h3 className="insights-panel-title">Opponent Matchups</h3>
          {opponentMatchups.map((o) => (
            <div key={o.name} className="insights-social-row">
              <span className="insights-social-name">{o.name}</span>
              <span className="insights-social-matches">{o.matches} games</span>
              <span className="insights-social-wr">{o.winRate}%</span>
              <span className={`insights-social-difficulty ${o.difficulty.toLowerCase()}`}>{o.difficulty}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Achievements ─── */}
      <motion.div className="insights-panel" {...section(0.6)}>
        <h3 className="insights-panel-title">Achievements</h3>
        <div className="insights-achievements-grid">
          {achievements.map((a) => (
            <div key={a.id} className={`insights-achievement ${a.unlocked ? 'unlocked' : 'locked'}`}>
              <div className="insights-achievement-icon">{a.icon}</div>
              <div className="insights-achievement-name">{a.name}</div>
              <div className="insights-achievement-desc">{a.desc}</div>
              {!a.unlocked && (
                <div className="insights-achievement-progress">
                  <div className="insights-achievement-bar">
                    <div className="insights-achievement-fill" style={{ width: `${(a.progress / a.max) * 100}%` }} />
                  </div>
                  <span className="insights-achievement-count">{a.progress}/{a.max}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Footer ─── */}
      <motion.div className="insights-footer" {...section(0.65)}>
        Powered by AI &middot; Insights update after each match
      </motion.div>
    </div>
  );
}
