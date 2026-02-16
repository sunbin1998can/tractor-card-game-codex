// All mock data for the Player Insights & Analytics page.
// Bilingual: each user-facing string is { en, zh }.

export type T = { en: string; zh: string };

export const playerProfile = {
  name: 'DragonMaster',
  avatar: 'D',
  grade: 'S',
  gradeLabel: { en: 'Elite Strategist', zh: '精英战略家' } as T,
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
  rank: { en: 'Diamond II', zh: '钻石 II' } as T,
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
  { role: { en: 'Banker', zh: '庄家' } as T, winRate: 71.3, matches: 82, color: 'var(--card-glow-gold)' },
  { role: { en: 'Attacker', zh: '攻方' } as T, winRate: 58.4, matches: 97, color: 'var(--team-attacker)' },
  { role: { en: 'Defender', zh: '守方' } as T, winRate: 61.8, matches: 68, color: 'var(--team-defender)' },
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
    title: { en: 'Trump Timing Mastery', zh: '主牌时机掌控' } as T,
    description: {
      en: 'Your trump card usage in rounds 3–5 is in the top 12% of all players. You consistently force opponents to waste high cards early.',
      zh: '你在第3–5轮的主牌使用排名前12%。你总能迫使对手过早消耗大牌。',
    } as T,
    trend: { en: 'Top 12%', zh: '前12%' } as T,
    trendType: 'positive' as const,
  },
  {
    icon: '📈',
    title: { en: 'Point Capture Improving', zh: '得分能力提升' } as T,
    description: {
      en: 'Your point capture as attacker has increased 18% over the last 30 games. Focus on maintaining pressure in mid-game tricks.',
      zh: '你作为攻方的得分能力在最近30局中提升了18%。继续保持中盘压力。',
    } as T,
    trend: { en: 'Improving', zh: '进步中' } as T,
    trendType: 'positive' as const,
  },
  {
    icon: '⚠️',
    title: { en: 'Weak Opening Leads', zh: '首攻偏弱' } as T,
    description: {
      en: 'When leading the first trick as attacker, your win rate drops to 45%. Consider leading with stronger pairs or tractors.',
      zh: '作为攻方首攻时，你的胜率降至45%。建议用更强的对子或拖拉机首攻。',
    } as T,
    trend: { en: 'Warning', zh: '警告' } as T,
    trendType: 'warning' as const,
  },
  {
    icon: '🤝',
    title: { en: 'Team Play Synergy', zh: '团队配合' } as T,
    description: {
      en: 'You excel at reading partner signals — your cooperative plays succeed 72% of the time, well above the 55% average.',
      zh: '你擅长解读队友信号——你的配合打法成功率72%，远超55%的平均水平。',
    } as T,
    trend: { en: 'Strong', zh: '优秀' } as T,
    trendType: 'positive' as const,
  },
];

export const radarAxes = [
  { axis: { en: 'Aggression', zh: '进攻性' } as T, value: 78 },
  { axis: { en: 'Defense', zh: '防守' } as T, value: 65 },
  { axis: { en: 'Trump Control', zh: '主牌控制' } as T, value: 88 },
  { axis: { en: 'Trick Leading', zh: '引牌能力' } as T, value: 72 },
  { axis: { en: 'Point Capture', zh: '得分能力' } as T, value: 81 },
  { axis: { en: 'Team Play', zh: '团队配合' } as T, value: 85 },
];

export const playStyleLabel = { en: 'Strategic Controller', zh: '战略控场者' } as T;
export const playStyleDescription = {
  en: 'You dominate through superior trump management and calculated aggression. Your defensive play is solid, but your real strength lies in controlling the pace of each round.',
  zh: '你通过卓越的主牌管理和精准进攻来主导局面。你的防守稳健，但真正的优势在于控制每一轮的节奏。',
} as T;

export const recentMatches = [
  { id: 1, result: 'W' as const, role: { en: 'Banker', zh: '庄家' } as T, level: 'K→K', points: 60, keyMoment: { en: 'Perfect trump sweep in round 4', zh: '第4轮完美清主' } as T },
  { id: 2, result: 'W' as const, role: { en: 'Attacker', zh: '攻方' } as T, level: 'Q→K', points: 85, keyMoment: { en: 'Broke through with tractor combo', zh: '拖拉机组合强突成功' } as T },
  { id: 3, result: 'L' as const, role: { en: 'Defender', zh: '守方' } as T, level: 'K→K', points: 35, keyMoment: { en: 'Opponent\'s kitty flip turned the game', zh: '对手扣底翻盘' } as T },
  { id: 4, result: 'W' as const, role: { en: 'Banker', zh: '庄家' } as T, level: 'J→Q', points: 45, keyMoment: { en: 'Controlled tempo from trick 1', zh: '首轮即掌控节奏' } as T },
  { id: 5, result: 'W' as const, role: { en: 'Attacker', zh: '攻方' } as T, level: 'Q→Q', points: 90, keyMoment: { en: '3-pair throw sealed the deal', zh: '三对甩牌锁定胜局' } as T },
  { id: 6, result: 'L' as const, role: { en: 'Attacker', zh: '攻方' } as T, level: 'K→K', points: 55, keyMoment: { en: 'Missed key signal from partner', zh: '错过队友关键信号' } as T },
  { id: 7, result: 'W' as const, role: { en: 'Banker', zh: '庄家' } as T, level: 'K→K', points: 40, keyMoment: { en: 'Early trump declaration advantage', zh: '抢先亮主优势' } as T },
  { id: 8, result: 'W' as const, role: { en: 'Defender', zh: '守方' } as T, level: 'J→Q', points: 70, keyMoment: { en: 'Point dump on final trick', zh: '尾牌倒分成功' } as T },
  { id: 9, result: 'L' as const, role: { en: 'Attacker', zh: '攻方' } as T, level: 'Q→Q', points: 30, keyMoment: { en: 'Overcommitted to side suit', zh: '副牌投入过多' } as T },
  { id: 10, result: 'W' as const, role: { en: 'Banker', zh: '庄家' } as T, level: 'K→K', points: 50, keyMoment: { en: 'Flawless kitty burial', zh: '完美扣底' } as T },
];

export const teammateSynergy = [
  { name: 'PhoenixRider', matches: 34, winRate: 74.2, grade: 'A+' },
  { name: 'SilverWolf', matches: 28, winRate: 67.8, grade: 'A' },
  { name: 'JadeEmpress', matches: 19, winRate: 63.1, grade: 'B+' },
];

export const opponentMatchups = [
  { name: 'ThunderKing', matches: 22, winRate: 45.5, difficulty: { en: 'Nemesis', zh: '克星' } as T },
  { name: 'IronFortress', matches: 18, winRate: 55.6, difficulty: { en: 'Rival', zh: '劲敌' } as T },
  { name: 'WindDancer', matches: 15, winRate: 73.3, difficulty: { en: 'Favorable', zh: '优势' } as T },
];

// ─── Improvement Plan ───
export const improvementPlan = [
  {
    priority: 1,
    area: { en: 'Opening Leads', zh: '首攻' } as T,
    current: 'D',
    target: 'B+',
    title: { en: 'Stop leading singletons as attacker', zh: '攻方时不要用单张首攻' } as T,
    description: {
      en: 'In 38% of your losses, you led the first trick with a lone off-suit card. Opponents read this and dump points freely. Instead, lead with pairs or your strongest side suit to establish control early.',
      zh: '在你38%的败局中，你用单张副牌首攻。对手据此判断你的缺门并自由倒分。应该用对子或最强副牌首攻来尽早建立控制。',
    } as T,
    drill: {
      en: 'Next 5 games: only lead trick 1 with a pair or 3+ card suit. Track your attacker win rate.',
      zh: '接下来5局：首攻只用对子或3张以上的花色。记录你的攻方胜率。',
    } as T,
    impact: 'high' as const,
  },
  {
    priority: 2,
    area: { en: 'Kitty Burial', zh: '扣底' } as T,
    current: 'B',
    target: 'A',
    title: { en: 'Bury point cards more aggressively', zh: '更积极地扣分牌' } as T,
    description: {
      en: 'You bury an average of 15 points in the kitty vs. the top-player average of 25. You\'re holding onto Kings and 10s that get captured later. When you\'re banker, bury every point card you can\'t protect with trump.',
      zh: '你平均扣底15分，而顶尖玩家平均25分。你留着K和10最后被攻方抓走。做庄时，把主牌保护不了的分牌全部扣底。',
    } as T,
    drill: {
      en: 'Review your last 5 banker games — count kitty points. Aim for 20+ each game.',
      zh: '回顾你最近5局庄家——统计扣底分数。目标每局20分以上。',
    } as T,
    impact: 'high' as const,
  },
  {
    priority: 3,
    area: { en: 'Trump Conservation', zh: '主牌保留' } as T,
    current: 'A-',
    target: 'S',
    title: { en: 'Save big trump for the last 3 tricks', zh: '大主牌留到最后3轮' } as T,
    description: {
      en: 'You use your jokers and level-rank trump too early (avg trick 4.2). Elite players hold them until trick 7+, using them to capture the final point-heavy tricks where 5s and Ks pile up.',
      zh: '你的王牌和级牌用得太早（平均第4.2轮）。顶尖玩家会留到第7轮以后，用来拿下5和K堆积的高分尾牌。',
    } as T,
    drill: {
      en: 'Set a mental rule: no joker plays before trick 6 unless forced to follow.',
      zh: '心理规则：第6轮之前不出王牌，除非被迫跟牌。',
    } as T,
    impact: 'medium' as const,
  },
  {
    priority: 4,
    area: { en: 'Partner Signaling', zh: '队友信号' } as T,
    current: 'B+',
    target: 'A',
    title: { en: 'Signal your void suits earlier', zh: '更早地传递缺门信号' } as T,
    description: {
      en: 'When you can\'t follow suit, you\'re playing random low cards. Top players deliberately play a specific rank to signal their strong suit to their partner. Your partner then knows where to lead next.',
      zh: '当你无法跟牌时，你随便出小牌。顶尖玩家会刻意出特定牌来向队友传递强花色信号，让队友知道下一轮该引什么。',
    } as T,
    drill: {
      en: 'Convention: when void, play your highest card in your strongest side suit.',
      zh: '约定：缺门时，出你最强副花色的最大牌。',
    } as T,
    impact: 'medium' as const,
  },
];

// ─── Game Replay Highlights ───
export type ReplayMove = {
  trick: number;
  seat: T;
  cards: string;
  verdict: 'brilliant' | 'great' | 'blunder' | 'mistake';
  explanation: T;
  pointSwing: number;
};

export type GameReplay = {
  id: number;
  date: string;
  result: 'W' | 'L';
  role: T;
  opponent: T;
  finalScore: string;
  moves: ReplayMove[];
  summary: T;
};

export const gameReplays: GameReplay[] = [
  {
    id: 1,
    date: '2026-02-14',
    result: 'W',
    role: { en: 'Banker', zh: '庄家' },
    opponent: { en: 'ThunderKing\'s team', zh: 'ThunderKing的队伍' },
    finalScore: '60–35',
    summary: {
      en: 'Dominant banker performance. Your mid-game trump sweep was the turning point — you denied 40 points in tricks 5-7.',
      zh: '庄家完美表现。你中盘的清主是转折点——在第5-7轮阻止了对方40分。',
    },
    moves: [
      {
        trick: 2,
        seat: { en: 'You', zh: '你' },
        cards: 'K\u2660 K\u2660',
        verdict: 'great',
        explanation: {
          en: 'Leading with the pair of Kings forced opponents to break their spade holdings early. This set up your trump sweep later.',
          zh: '对K首攻迫使对手过早拆散黑桃牌型，为后续清主铺路。',
        },
        pointSwing: +10,
      },
      {
        trick: 5,
        seat: { en: 'You', zh: '你' },
        cards: 'BJ + SJ',
        verdict: 'brilliant',
        explanation: {
          en: 'Playing both jokers when opponents had 25 points on the table was devastating. You captured K\u266510\u2665 from seat 2 and denied the attackers their best scoring window. Game-winning play.',
          zh: '在对手桌面有25分时打出双王，毁灭性一击。你从2号位抓走K\u266510\u2665，封死了攻方最佳得分窗口。决定胜负的一手牌。',
        },
        pointSwing: +30,
      },
      {
        trick: 8,
        seat: { en: 'You', zh: '你' },
        cards: '5\u2666',
        verdict: 'mistake',
        explanation: {
          en: 'You led with a lone 5\u2666 — a free 5 points for attackers. Should have buried this in the kitty or led with your remaining diamond pair instead.',
          zh: '你用单张5\u2666首攻——白送攻方5分。应该扣底这张牌，或者出剩余的方块对子。',
        },
        pointSwing: -5,
      },
      {
        trick: 11,
        seat: { en: 'Partner', zh: '队友' },
        cards: 'A\u2663 A\u2663',
        verdict: 'great',
        explanation: {
          en: 'Your partner read your signal and led clubs, pulling the last trump from opponents. Clean finish.',
          zh: '队友读懂了你的信号，引梅花拔出对手最后的主牌。完美收官。',
        },
        pointSwing: +15,
      },
    ],
  },
  {
    id: 3,
    date: '2026-02-12',
    result: 'L',
    role: { en: 'Attacker', zh: '攻方' },
    opponent: { en: 'IronFortress\'s team', zh: 'IronFortress的队伍' },
    finalScore: '35–70',
    summary: {
      en: 'Avoidable loss. Two critical blunders in the mid-game gave away 35 points. The opening was actually strong — you need to maintain discipline when ahead.',
      zh: '本可避免的失败。中盘两次严重失误送出35分。开局其实很强——领先时需要保持纪律性。',
    },
    moves: [
      {
        trick: 1,
        seat: { en: 'You', zh: '你' },
        cards: '7\u2663',
        verdict: 'blunder',
        explanation: {
          en: 'Led with a singleton 7\u2663 on the very first trick. Banker immediately trumped and captured your partner\'s 10\u2663. You telegraphed your club void and gave them tempo. This is the #1 pattern in your loss games.',
          zh: '首轮用单张7\u2663首攻。庄家立刻切主抓走队友的10\u2663。你暴露了梅花缺门并交出主动权。这是你败局中最常见的模式。',
        },
        pointSwing: -15,
      },
      {
        trick: 4,
        seat: { en: 'You', zh: '你' },
        cards: 'A\u2665 K\u2665',
        verdict: 'great',
        explanation: {
          en: 'Strong heart lead that captured 20 points. You were ahead at this point — if you maintained this pressure, you win.',
          zh: '强势红心首攻拿下20分。此时你处于领先——如果保持这个压力，你会赢。',
        },
        pointSwing: +20,
      },
      {
        trick: 6,
        seat: { en: 'You', zh: '你' },
        cards: '5\u2660 5\u2660',
        verdict: 'blunder',
        explanation: {
          en: 'Threw a pair of 5s into a trick the banker was winning. That\'s 10 free points for the defense. You had a pair of 9s that would have achieved the same follow obligation without bleeding points.',
          zh: '在庄家赢定的一轮中跟出对5。白送守方10分。你有对9可以完成同样的跟牌义务而不损失分数。',
        },
        pointSwing: -20,
      },
      {
        trick: 9,
        seat: { en: 'You', zh: '你' },
        cards: '3\u2666 4\u2666',
        verdict: 'mistake',
        explanation: {
          en: 'Following with your lowest diamonds when you had Q\u2666 Q\u2666 that could have won the trick. The banker only played 8\u2666 — your queens would have taken it and the 15 points on the table.',
          zh: '用最小的方块跟牌，但你有对Q\u2666可以赢这一轮。庄家只出了8\u2666——你的对Q能拿下这轮和桌上的15分。',
        },
        pointSwing: -15,
      },
      {
        trick: 12,
        seat: { en: 'Partner', zh: '队友' },
        cards: 'SJ',
        verdict: 'great',
        explanation: {
          en: 'Partner saved the game from being worse — trumped the final trick to deny 20 kitty bonus points.',
          zh: '队友力挽狂澜——尾轮切主阻止了20分底牌加倍。',
        },
        pointSwing: +20,
      },
    ],
  },
];

export const achievements = [
  { id: 1, icon: '👑', name: { en: 'Royal Flush', zh: '皇家同花顺' } as T, desc: { en: 'Win 10 games as banker in a row', zh: '连续庄家获胜10局' } as T, unlocked: true, progress: 10, max: 10 },
  { id: 2, icon: '🔥', name: { en: 'On Fire', zh: '火力全开' } as T, desc: { en: 'Achieve a 10-game win streak', zh: '达成10连胜' } as T, unlocked: true, progress: 11, max: 10 },
  { id: 3, icon: '🎯', name: { en: 'Sharpshooter', zh: '神射手' } as T, desc: { en: 'Capture 100+ points in a single game', zh: '单局得分100+' } as T, unlocked: true, progress: 105, max: 100 },
  { id: 4, icon: '🏔️', name: { en: 'Summit', zh: '登顶' } as T, desc: { en: 'Reach Diamond rating', zh: '达到钻石段位' } as T, unlocked: true, progress: 1847, max: 1800 },
  { id: 5, icon: '🤝', name: { en: 'Dream Team', zh: '黄金搭档' } as T, desc: { en: 'Win 50 games with the same partner', zh: '与同一队友赢50局' } as T, unlocked: true, progress: 50, max: 50 },
  { id: 6, icon: '💎', name: { en: 'Grand Master', zh: '大师' } as T, desc: { en: 'Reach 2000 rating', zh: '达到2000分' } as T, unlocked: false, progress: 1847, max: 2000 },
  { id: 7, icon: '🏆', name: { en: 'Century', zh: '百胜将军' } as T, desc: { en: 'Win 200 total games', zh: '累计获胜200局' } as T, unlocked: false, progress: 156, max: 200 },
  { id: 8, icon: '⚡', name: { en: 'Lightning', zh: '闪电战' } as T, desc: { en: 'Win a game in under 5 minutes', zh: '5分钟内赢得一局' } as T, unlocked: false, progress: 0, max: 1 },
];
