import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { useStore } from '../store';
import type { Lang } from '../i18n';
import AnimatedNumber from './AnimatedNumber';
import { RatingTrendChart, RadarChart, WinRateRing } from './insights/SvgCharts';
import { WinStreakBlocks, RoleBarChart, PointsHistogram } from './insights/CssCharts';
import {
  playerProfile, stats, rating, ratingHistory, winLossStreak,
  roleBreakdown, pointsDistribution, levelProgression, aiCoachInsights,
  radarAxes, playStyleLabel, playStyleDescription, recentMatches,
  teammateSynergy, opponentMatchups, achievements,
  improvementPlan, gameReplays,
} from './insights/mockData';
import type { T, GameReplay } from './insights/mockData';

/** Resolve a bilingual text to the current language */
function useL() {
  const lang = useStore((s) => s.lang);
  return (t: T) => t[lang];
}

// Static UI labels
const labels: Record<string, T> = {
  back: { en: '\u2190 Back to Lobby', zh: '\u2190 返回大厅' },
  aiInsights: { en: 'AI Insights', zh: 'AI 分析' },
  aiCoach: { en: 'AI Coach', zh: 'AI 教练' },
  winRate: { en: 'Win Rate', zh: '胜率' },
  rating: { en: 'Rating', zh: '评分' },
  peak: { en: 'Peak', zh: '最高' },
  matches: { en: 'Matches', zh: '对局' },
  bestStreak: { en: 'Best streak', zh: '最长连胜' },
  level: { en: 'Level', zh: '等级' },
  levels: { en: 'levels', zh: '级' },
  ratingTrend: { en: 'Rating Trend', zh: '评分趋势' },
  recentForm: { en: 'Recent Form', zh: '近期战绩' },
  rolePerf: { en: 'Role Performance', zh: '角色表现' },
  pointsDist: { en: 'Points Distribution', zh: '得分分布' },
  attacker: { en: 'Attacker', zh: '攻方' },
  defender: { en: 'Defender', zh: '守方' },
  recentMatches: { en: 'Recent Matches', zh: '近期对局' },
  teamChem: { en: 'Teammate Chemistry', zh: '队友默契' },
  oppMatch: { en: 'Opponent Matchups', zh: '对手战绩' },
  games: { en: 'games', zh: '局' },
  achievements: { en: 'Achievements', zh: '成就' },
  footer: { en: 'Powered by AI \u00b7 Insights update after each match', zh: 'AI 驱动 \u00b7 每局结束后更新分析' },
  improvePlan: { en: 'Your Improvement Plan', zh: '你的提升计划' },
  improveSubtitle: { en: 'Personalized drills based on your last 50 games', zh: '基于你最近50局的个性化训练' },
  drill: { en: 'Drill:', zh: '训练：' },
  high: { en: 'high', zh: '高' },
  medium: { en: 'medium', zh: '中' },
  replayTitle: { en: 'Game Replay Analysis', zh: '对局回放分析' },
  replaySubtitle: { en: 'AI-annotated key moments from recent games', zh: 'AI标注的近期对局关键时刻' },
  vs: { en: 'vs', zh: '对阵' },
  trick: { en: 'Trick', zh: '第' },
  trickSuffix: { en: '', zh: '轮' },
  brilliant: { en: 'Brilliant', zh: '精彩' },
  great: { en: 'Great', zh: '好棋' },
  mistake: { en: 'Mistake', zh: '失误' },
  blunder: { en: 'Blunder', zh: '严重失误' },
};

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

function section(delay: number) {
  return { ...fadeUp, transition: { ...fadeUp.transition, delay } };
}

export default function InsightsPage() {
  const gradeRef = useRef<HTMLDivElement>(null);
  const L = useL();
  const lang = useStore((s) => s.lang);
  const toggleLang = useStore((s) => s.toggleLang);

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
      {/* Top bar with back link and language toggle */}
      <motion.div className="insights-topbar" {...section(0)}>
        <a href="#/" className="insights-back">{L(labels.back)}</a>
        <button className="insights-lang-toggle" onClick={toggleLang}>
          {lang === 'en' ? '中文' : 'EN'}
        </button>
      </motion.div>

      {/* ─── Header ─── */}
      <motion.div className="insights-header" {...section(0.05)}>
        <div className="insights-avatar-ring">
          <div className="insights-avatar">{playerProfile.avatar}</div>
        </div>
        <div className="insights-header-info">
          <h1 className="insights-player-name">
            {playerProfile.name}
            <span className="insights-ai-badge">{L(labels.aiInsights)}</span>
          </h1>
          <p className="insights-grade-label">{L(playerProfile.gradeLabel)}</p>
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
          <div className="insights-card-title">{L(labels.winRate)}</div>
          <WinRateRing percent={stats.winRate} size={90} strokeWidth={7} />
          <div className="insights-card-sub">{stats.wins}W – {stats.losses}L</div>
        </div>
        <div className="insights-card">
          <div className="insights-card-title">{L(labels.rating)}</div>
          <div className="insights-big-number">
            <AnimatedNumber value={rating.current} />
          </div>
          <div className="insights-card-sub">
            {L(labels.peak)}: {rating.peak} <span className="insights-trend-up">&uarr;</span>
          </div>
          <div className="insights-card-rank">{L(rating.rank)}</div>
        </div>
        <div className="insights-card">
          <div className="insights-card-title">{L(labels.matches)}</div>
          <div className="insights-big-number">
            <AnimatedNumber value={stats.totalMatches} />
          </div>
          <div className="insights-card-sub">{L(labels.bestStreak)}: {stats.bestStreak}</div>
        </div>
        <div className="insights-card">
          <div className="insights-card-title">{L(labels.level)}</div>
          <div className="insights-level-current">{levelProgression.current}</div>
          <div className="insights-xp-bar">
            <div className="insights-xp-fill" style={{ width: `${(levelProgression.levelsCompleted / levelProgression.totalLevels) * 100}%` }} />
          </div>
          <div className="insights-card-sub">{levelProgression.levelsCompleted}/{levelProgression.totalLevels} {L(labels.levels)}</div>
        </div>
      </motion.div>

      {/* ─── AI Coach Panel ─── */}
      <motion.div className="insights-ai-panel" {...section(0.25)}>
        <div className="insights-ai-panel-header">
          <span className="insights-ai-sparkle">&#10024;</span>
          <h2>{L(labels.aiCoach)}</h2>
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
                <div className="insights-ai-card-title">{L(insight.title)}</div>
                <p className="insights-ai-card-desc">{L(insight.description)}</p>
              </div>
              <span className={`insights-trend-badge ${insight.trendType}`}>{L(insight.trend)}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Improvement Plan ─── */}
      <motion.div className="insights-panel insights-improve-panel" {...section(0.3)}>
        <div className="insights-improve-header">
          <h3 className="insights-panel-title">{L(labels.improvePlan)}</h3>
          <span className="insights-improve-subtitle">{L(labels.improveSubtitle)}</span>
        </div>
        <div className="insights-improve-list">
          {improvementPlan.map((item, i) => (
            <motion.div
              key={i}
              className="insights-improve-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.35 }}
            >
              <div className="insights-improve-rank">
                <span className="insights-improve-priority">#{item.priority}</span>
                <span className={`insights-improve-impact ${item.impact}`}>
                  {L(labels[item.impact])}
                </span>
              </div>
              <div className="insights-improve-body">
                <div className="insights-improve-title-row">
                  <span className="insights-improve-title">{L(item.title)}</span>
                  <span className="insights-improve-grades">
                    <span className="insights-improve-grade current">{item.current}</span>
                    <span className="insights-improve-arrow">&rarr;</span>
                    <span className="insights-improve-grade target">{item.target}</span>
                  </span>
                </div>
                <p className="insights-improve-desc">{L(item.description)}</p>
                <div className="insights-improve-drill">
                  <span className="insights-improve-drill-label">{L(labels.drill)}</span> {L(item.drill)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Game Replay Highlights ─── */}
      <motion.div className="insights-panel insights-replay-panel" {...section(0.35)}>
        <h3 className="insights-panel-title">{L(labels.replayTitle)}</h3>
        <p className="insights-replay-subtitle">{L(labels.replaySubtitle)}</p>
        {gameReplays.map((game) => (
          <GameReplayCard key={game.id} game={game} L={L} lang={lang} />
        ))}
      </motion.div>

      {/* ─── Charts Section ─── */}
      <motion.div className="insights-charts-grid" {...section(0.45)}>
        <div className="insights-panel">
          <h3 className="insights-panel-title">{L(labels.ratingTrend)}</h3>
          <RatingTrendChart data={ratingHistory} />
        </div>
        <div className="insights-panel">
          <h3 className="insights-panel-title">{L(labels.recentForm)}</h3>
          <WinStreakBlocks streak={winLossStreak} />
        </div>
        <div className="insights-panel">
          <h3 className="insights-panel-title">{L(labels.rolePerf)}</h3>
          <RoleBarChart roles={roleBreakdown.map((r) => ({ ...r, role: L(r.role) }))} />
        </div>
        <div className="insights-panel">
          <h3 className="insights-panel-title">{L(labels.pointsDist)}</h3>
          <PointsHistogram data={pointsDistribution} attackerLabel={L(labels.attacker)} defenderLabel={L(labels.defender)} />
        </div>
      </motion.div>

      {/* ─── Play Style ─── */}
      <motion.div className="insights-playstyle" {...section(0.55)}>
        <div className="insights-playstyle-chart">
          <RadarChart axes={radarAxes.map((a) => ({ axis: L(a.axis), value: a.value }))} />
        </div>
        <div className="insights-playstyle-info">
          <h2 className="insights-playstyle-label">{L(playStyleLabel)}</h2>
          <p className="insights-playstyle-desc">{L(playStyleDescription)}</p>
        </div>
      </motion.div>

      {/* ─── Match Timeline ─── */}
      <motion.div className="insights-panel" {...section(0.6)}>
        <h3 className="insights-panel-title">{L(labels.recentMatches)}</h3>
        <div className="insights-timeline">
          <div className="insights-timeline-line" />
          {recentMatches.map((m) => (
            <div key={m.id} className={`insights-timeline-item ${m.result === 'W' ? 'win' : 'loss'}`}>
              <div className={`insights-timeline-dot ${m.result === 'W' ? 'win' : 'loss'}`} />
              <div className="insights-timeline-content">
                <div className="insights-timeline-header">
                  <span className={`insights-timeline-result ${m.result === 'W' ? 'win' : 'loss'}`}>{m.result}</span>
                  <span className="insights-timeline-role">{L(m.role)}</span>
                  <span className="insights-timeline-level">{m.level}</span>
                  <span className="insights-timeline-points">{m.points}pts</span>
                </div>
                <div className="insights-timeline-moment">{L(m.keyMoment)}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Social Section ─── */}
      <motion.div className="insights-social-grid" {...section(0.65)}>
        <div className="insights-panel">
          <h3 className="insights-panel-title">{L(labels.teamChem)}</h3>
          {teammateSynergy.map((t) => (
            <div key={t.name} className="insights-social-row">
              <span className="insights-social-name">{t.name}</span>
              <span className="insights-social-matches">{t.matches} {L(labels.games)}</span>
              <span className="insights-social-wr">{t.winRate}%</span>
              <span className={`insights-social-grade grade-${t.grade.replace('+', 'plus')}`}>{t.grade}</span>
            </div>
          ))}
        </div>
        <div className="insights-panel">
          <h3 className="insights-panel-title">{L(labels.oppMatch)}</h3>
          {opponentMatchups.map((o) => (
            <div key={o.name} className="insights-social-row">
              <span className="insights-social-name">{o.name}</span>
              <span className="insights-social-matches">{o.matches} {L(labels.games)}</span>
              <span className="insights-social-wr">{o.winRate}%</span>
              <span className={`insights-social-difficulty ${o.difficulty.en.toLowerCase()}`}>{L(o.difficulty)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Achievements ─── */}
      <motion.div className="insights-panel" {...section(0.7)}>
        <h3 className="insights-panel-title">{L(labels.achievements)}</h3>
        <div className="insights-achievements-grid">
          {achievements.map((a) => (
            <div key={a.id} className={`insights-achievement ${a.unlocked ? 'unlocked' : 'locked'}`}>
              <div className="insights-achievement-icon">{a.icon}</div>
              <div className="insights-achievement-name">{L(a.name)}</div>
              <div className="insights-achievement-desc">{L(a.desc)}</div>
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
      <motion.div className="insights-footer" {...section(0.75)}>
        {L(labels.footer)}
      </motion.div>
    </div>
  );
}

/* ─── Game Replay Card ─── */

const verdictKeys = {
  brilliant: 'brilliant',
  great: 'great',
  mistake: 'mistake',
  blunder: 'blunder',
} as const;

const verdictIcons = {
  brilliant: '\u2605',
  great: '\u2713',
  mistake: '?',
  blunder: '\u2717',
};

function GameReplayCard({ game, L, lang }: { game: GameReplay; L: (t: T) => string; lang: Lang }) {
  const isWin = game.result === 'W';

  return (
    <div className={`insights-replay-game ${isWin ? 'win' : 'loss'}`}>
      <div className="insights-replay-game-header">
        <span className={`insights-replay-result ${isWin ? 'win' : 'loss'}`}>{game.result}</span>
        <span className="insights-replay-role">{L(game.role)}</span>
        <span className="insights-replay-vs">{L(labels.vs)} {L(game.opponent)}</span>
        <span className="insights-replay-score">{game.finalScore}</span>
        <span className="insights-replay-date">{game.date}</span>
      </div>
      <p className="insights-replay-summary">{L(game.summary)}</p>
      <div className="insights-replay-moves">
        {game.moves.map((move, i) => {
          const vKey = verdictKeys[move.verdict];
          const vLabel = L(labels[vKey]);
          const vIcon = verdictIcons[move.verdict];
          return (
            <motion.div
              key={i}
              className={`insights-replay-move ${vKey}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06, duration: 0.3 }}
            >
              <div className="insights-replay-move-header">
                <span className={`insights-replay-verdict ${vKey}`}>
                  <span className="insights-replay-verdict-icon">{vIcon}</span>
                  {vLabel}
                </span>
                <span className="insights-replay-trick">
                  {L(labels.trick)} {move.trick}{lang === 'zh' ? labels.trickSuffix.zh : ''}
                </span>
                <span className="insights-replay-seat">{L(move.seat)}</span>
                <span className="insights-replay-cards">{move.cards}</span>
                <span className={`insights-replay-swing ${move.pointSwing >= 0 ? 'positive' : 'negative'}`}>
                  {move.pointSwing >= 0 ? '+' : ''}{move.pointSwing}pts
                </span>
              </div>
              <p className="insights-replay-explanation">{L(move.explanation)}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
