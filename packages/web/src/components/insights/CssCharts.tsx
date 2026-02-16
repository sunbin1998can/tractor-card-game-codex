import { useEffect, useState } from 'react';

/* ────────────────── Win Streak Blocks ────────────────── */

export function WinStreakBlocks({ streak }: { streak: boolean[] }) {
  return (
    <div className="insights-streak-blocks">
      {streak.map((win, i) => (
        <div
          key={i}
          className={`insights-streak-block ${win ? 'win' : 'loss'}`}
          title={`Game ${i + 1}: ${win ? 'Win' : 'Loss'}`}
        />
      ))}
    </div>
  );
}

/* ────────────────── Role Bar Chart ────────────────── */

type RoleData = { role: string; winRate: number; matches: number; color: string };

export function RoleBarChart({ roles }: { roles: RoleData[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  return (
    <div className="insights-role-bars">
      {roles.map((r) => (
        <div key={r.role} className="insights-role-row">
          <span className="insights-role-label">{r.role}</span>
          <div className="insights-role-track">
            <div
              className="insights-role-fill"
              style={{
                width: mounted ? `${r.winRate}%` : '0%',
                backgroundColor: r.color,
              }}
            />
          </div>
          <span className="insights-role-value">{r.winRate}%</span>
          <span className="insights-role-count">{r.matches}g</span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────── Points Histogram ────────────────── */

type HistBucket = { bucket: string; attacker: number; defender: number };

export function PointsHistogram({ data }: { data: HistBucket[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const maxVal = Math.max(...data.flatMap((d) => [d.attacker, d.defender]));

  return (
    <div className="insights-histogram">
      <div className="insights-histogram-bars">
        {data.map((d) => (
          <div key={d.bucket} className="insights-histogram-col">
            <div className="insights-histogram-pair">
              <div
                className="insights-histogram-bar attacker"
                style={{ height: mounted ? `${(d.attacker / maxVal) * 100}%` : '0%' }}
                title={`Attacker: ${d.attacker}`}
              />
              <div
                className="insights-histogram-bar defender"
                style={{ height: mounted ? `${(d.defender / maxVal) * 100}%` : '0%' }}
                title={`Defender: ${d.defender}`}
              />
            </div>
            <span className="insights-histogram-label">{d.bucket}</span>
          </div>
        ))}
      </div>
      <div className="insights-histogram-legend">
        <span className="insights-legend-item"><span className="insights-legend-dot attacker" /> Attacker</span>
        <span className="insights-legend-item"><span className="insights-legend-dot defender" /> Defender</span>
      </div>
    </div>
  );
}
