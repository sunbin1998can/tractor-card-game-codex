// All mock data for the Player Insights & Analytics page.
// Shapes loosely follow ApiStats / ApiRating from the backend.

export const playerProfile = {
  name: 'DragonMaster',
  avatar: 'D',
  grade: 'S',
  gradeLabel: 'Elite Strategist',
};

export const stats = {
  totalMatches: 247,
  wins: 156,
  losses: 91,
  winRate: 63.2,
  avgPoints: 42.8,
  totalPoints: 10572,
  bestStreak: 11,
};

export const rating = {
  current: 1847,
  peak: 1923,
  peakDate: '2025-12-15',
  rank: 'Diamond II',
};

export const ratingHistory: { date: string; value: number }[] = [
  { date: '2025-07-01', value: 1520 },
  { date: '2025-07-15', value: 1558 },
  { date: '2025-08-01', value: 1605 },
  { date: '2025-08-15', value: 1590 },
  { date: '2025-09-01', value: 1642 },
  { date: '2025-09-15', value: 1688 },
  { date: '2025-10-01', value: 1670 },
  { date: '2025-10-15', value: 1725 },
  { date: '2025-11-01', value: 1710 },
  { date: '2025-11-15', value: 1758 },
  { date: '2025-12-01', value: 1802 },
  { date: '2025-12-15', value: 1923 },
  { date: '2026-01-01', value: 1880 },
  { date: '2026-01-08', value: 1856 },
  { date: '2026-01-15', value: 1870 },
  { date: '2026-01-22', value: 1835 },
  { date: '2026-01-29', value: 1862 },
  { date: '2026-02-05', value: 1850 },
  { date: '2026-02-10', value: 1838 },
  { date: '2026-02-14', value: 1847 },
];

export const winLossStreak: boolean[] = [
  true, true, false, true, true, true, false, false, true, true,
  true, true, true, false, true, false, true, true, false, true,
  true, false, true, true, true, true, false, true, true, true,
];

export const roleBreakdown = [
  { role: 'Banker', winRate: 71.3, matches: 82, color: 'var(--card-glow-gold)' },
  { role: 'Attacker', winRate: 58.4, matches: 97, color: 'var(--team-attacker)' },
  { role: 'Defender', winRate: 61.8, matches: 68, color: 'var(--team-defender)' },
];

export const pointsDistribution = [
  { bucket: '0–20', attacker: 12, defender: 28 },
  { bucket: '21–40', attacker: 22, defender: 18 },
  { bucket: '41–60', attacker: 35, defender: 14 },
  { bucket: '61–80', attacker: 18, defender: 6 },
  { bucket: '81–100', attacker: 8, defender: 2 },
  { bucket: '100+', attacker: 2, defender: 0 },
];

export const levelProgression = {
  current: 'K',
  levelsCompleted: 12,
  totalLevels: 13,
  levels: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
};

export const aiCoachInsights = [
  {
    icon: '🎯',
    title: 'Trump Timing Mastery',
    description: 'Your trump card usage in rounds 3–5 is in the top 12% of all players. You consistently force opponents to waste high cards early.',
    trend: 'Top 12%',
    trendType: 'positive' as const,
  },
  {
    icon: '📈',
    title: 'Point Capture Improving',
    description: 'Your point capture as attacker has increased 18% over the last 30 games. Focus on maintaining pressure in mid-game tricks.',
    trend: 'Improving',
    trendType: 'positive' as const,
  },
  {
    icon: '⚠️',
    title: 'Weak Opening Leads',
    description: 'When leading the first trick as attacker, your win rate drops to 45%. Consider leading with stronger pairs or tractors.',
    trend: 'Warning',
    trendType: 'warning' as const,
  },
  {
    icon: '🤝',
    title: 'Team Play Synergy',
    description: 'You excel at reading partner signals — your cooperative plays succeed 72% of the time, well above the 55% average.',
    trend: 'Strong',
    trendType: 'positive' as const,
  },
];

export const radarAxes = [
  { axis: 'Aggression', value: 78 },
  { axis: 'Defense', value: 65 },
  { axis: 'Trump Control', value: 88 },
  { axis: 'Trick Leading', value: 72 },
  { axis: 'Point Capture', value: 81 },
  { axis: 'Team Play', value: 85 },
];

export const playStyleLabel = 'Strategic Controller';
export const playStyleDescription =
  'You dominate through superior trump management and calculated aggression. Your defensive play is solid, but your real strength lies in controlling the pace of each round.';

export const recentMatches = [
  { id: 1, result: 'W' as const, role: 'Banker', level: 'K→K', points: 60, keyMoment: 'Perfect trump sweep in round 4' },
  { id: 2, result: 'W' as const, role: 'Attacker', level: 'Q→K', points: 85, keyMoment: 'Broke through with tractor combo' },
  { id: 3, result: 'L' as const, role: 'Defender', level: 'K→K', points: 35, keyMoment: 'Opponent\'s kitty flip turned the game' },
  { id: 4, result: 'W' as const, role: 'Banker', level: 'J→Q', points: 45, keyMoment: 'Controlled tempo from trick 1' },
  { id: 5, result: 'W' as const, role: 'Attacker', level: 'Q→Q', points: 90, keyMoment: '3-pair throw sealed the deal' },
  { id: 6, result: 'L' as const, role: 'Attacker', level: 'K→K', points: 55, keyMoment: 'Missed key signal from partner' },
  { id: 7, result: 'W' as const, role: 'Banker', level: 'K→K', points: 40, keyMoment: 'Early trump declaration advantage' },
  { id: 8, result: 'W' as const, role: 'Defender', level: 'J→Q', points: 70, keyMoment: 'Point dump on final trick' },
  { id: 9, result: 'L' as const, role: 'Attacker', level: 'Q→Q', points: 30, keyMoment: 'Overcommitted to side suit' },
  { id: 10, result: 'W' as const, role: 'Banker', level: 'K→K', points: 50, keyMoment: 'Flawless kitty burial' },
];

export const teammateSynergy = [
  { name: 'PhoenixRider', matches: 34, winRate: 74.2, grade: 'A+' },
  { name: 'SilverWolf', matches: 28, winRate: 67.8, grade: 'A' },
  { name: 'JadeEmpress', matches: 19, winRate: 63.1, grade: 'B+' },
];

export const opponentMatchups = [
  { name: 'ThunderKing', matches: 22, winRate: 45.5, difficulty: 'Nemesis' },
  { name: 'IronFortress', matches: 18, winRate: 55.6, difficulty: 'Rival' },
  { name: 'WindDancer', matches: 15, winRate: 73.3, difficulty: 'Favorable' },
];

export const achievements = [
  { id: 1, icon: '👑', name: 'Royal Flush', desc: 'Win 10 games as banker in a row', unlocked: true, progress: 10, max: 10 },
  { id: 2, icon: '🔥', name: 'On Fire', desc: 'Achieve a 10-game win streak', unlocked: true, progress: 11, max: 10 },
  { id: 3, icon: '🎯', name: 'Sharpshooter', desc: 'Capture 100+ points in a single game', unlocked: true, progress: 105, max: 100 },
  { id: 4, icon: '🏔️', name: 'Summit', desc: 'Reach Diamond rating', unlocked: true, progress: 1847, max: 1800 },
  { id: 5, icon: '🤝', name: 'Dream Team', desc: 'Win 50 games with the same partner', unlocked: true, progress: 50, max: 50 },
  { id: 6, icon: '💎', name: 'Grand Master', desc: 'Reach 2000 rating', unlocked: false, progress: 1847, max: 2000 },
  { id: 7, icon: '🏆', name: 'Century', desc: 'Win 200 total games', unlocked: false, progress: 156, max: 200 },
  { id: 8, icon: '⚡', name: 'Lightning', desc: 'Win a game in under 5 minutes', unlocked: false, progress: 0, max: 1 },
];
