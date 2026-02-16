import { useEffect, useState } from 'react';

/* ────────────────── Rating Trend Chart ────────────────── */

type RatingPoint = { date: string; value: number };

export function RatingTrendChart({ data }: { data: RatingPoint[] }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const W = 400;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 30, left: 45 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const minV = Math.floor(Math.min(...values) / 50) * 50;
  const maxV = Math.ceil(Math.max(...values) / 50) * 50;
  const range = maxV - minV || 1;

  const points = data.map((d, i) => {
    const x = PAD.left + (i / (data.length - 1)) * plotW;
    const y = PAD.top + plotH - ((d.value - minV) / range) * plotH;
    return { x, y, value: d.value, date: d.date };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${points[0].x},${PAD.top + plotH} ${points.map((p) => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${PAD.top + plotH} Z`;

  const gridLines = [];
  const step = range <= 200 ? 50 : 100;
  for (let v = minV; v <= maxV; v += step) {
    const y = PAD.top + plotH - ((v - minV) / range) * plotH;
    gridLines.push({ y, label: v });
  }

  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="insights-svg-chart" style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="ratingAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--card-glow-gold)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--card-glow-gold)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grid */}
      {gridLines.map((g) => (
        <g key={g.label}>
          <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
          <text x={PAD.left - 6} y={g.y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">{g.label}</text>
        </g>
      ))}

      {/* area + line */}
      <path
        d={areaPath}
        fill="url(#ratingAreaGrad)"
        opacity={visible ? 1 : 0}
        style={{ transition: 'opacity 1s ease' }}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--card-glow-gold)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeDasharray={visible ? '0' : `${plotW * 2}`}
        strokeDashoffset={visible ? '0' : `${plotW * 2}`}
        style={{ transition: 'stroke-dasharray 1.5s ease, stroke-dashoffset 1.5s ease' }}
      />

      {/* current value dot */}
      <circle cx={last.x} cy={last.y} r="5" fill="var(--card-glow-gold)" opacity={visible ? 1 : 0} style={{ transition: 'opacity 0.5s ease 1s' }}>
        <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
      </circle>
      <text x={last.x} y={last.y - 10} textAnchor="middle" fill="var(--card-glow-gold)" fontSize="11" fontWeight="700"
        opacity={visible ? 1 : 0} style={{ transition: 'opacity 0.5s ease 1s' }}
      >{last.value}</text>
    </svg>
  );
}

/* ────────────────── Radar Chart ────────────────── */

type RadarAxis = { axis: string; value: number };

export function RadarChart({ axes }: { axes: RadarAxis[] }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const SIZE = 260;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 95;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i: number, radius: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
  };

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const dataPoints = axes.map((a, i) => getPoint(i, (a.value / 100) * R));
  const dataPoly = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="insights-svg-chart" style={{ width: '100%', maxWidth: 260, height: 'auto', margin: '0 auto', display: 'block' }}>
      <defs>
        <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--card-glow-gold)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--card-glow-gold)" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* grid hexagons */}
      {gridLevels.map((level) => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, R * level));
        return (
          <polygon
            key={level}
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {/* axis lines */}
      {axes.map((_, i) => {
        const p = getPoint(i, R);
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}

      {/* data polygon */}
      <polygon
        points={dataPoly}
        fill="url(#radarFill)"
        stroke="var(--card-glow-gold)"
        strokeWidth="2"
        opacity={visible ? 1 : 0}
        style={{ transition: 'opacity 0.8s ease 0.3s' }}
      />

      {/* data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--card-glow-gold)"
          opacity={visible ? 1 : 0} style={{ transition: `opacity 0.5s ease ${0.3 + i * 0.1}s` }}
        />
      ))}

      {/* axis labels */}
      {axes.map((a, i) => {
        const p = getPoint(i, R + 22);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill="var(--text-muted)" fontSize="9.5" fontWeight="500"
          >{a.axis}</text>
        );
      })}
    </svg>
  );
}

/* ────────────────── Win Rate Ring ────────────────── */

export function WinRateRing({ percent, size = 100, strokeWidth = 8 }: { percent: number; size?: number; strokeWidth?: number }) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    requestAnimationFrame(() => setAnimPct(percent));
  }, [percent]);

  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animPct / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="insights-win-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth}
      />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--card-glow-gold)" strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="var(--text-light)" fontSize={size * 0.22} fontWeight="700"
      >{percent.toFixed(1)}%</text>
    </svg>
  );
}
