import { useStore } from './store';

export type Lang = 'en' | 'zh';

const translations: Record<string, Record<Lang, string>> = {
  // Lobby
  'lobby.title': { en: 'Tractor', zh: '升级拖拉机' },
  'lobby.subtitle': { en: 'Classic 2-deck partnership card game', zh: '经典双副牌升级扑克' },
  'lobby.quickPlay': { en: 'Quick Play', zh: '快速开始' },
  'lobby.thisTab': { en: 'This tab', zh: '当前标签' },
  'lobby.status': { en: 'Status: Lobby', zh: '状态: 大厅' },
  'lobby.nickname': { en: 'Nickname', zh: '昵称' },
  'lobby.roomId': { en: 'Room ID', zh: '房间号' },
  'lobby.4players': { en: '4 players', zh: '4人' },
  'lobby.6players': { en: '6 players', zh: '6人' },
  'lobby.join': { en: 'Join Room', zh: '加入房间' },
  'lobby.profile': { en: 'Profile', zh: '个人资料' },
  'lobby.gamesPlayed': { en: 'Games Played', zh: '对局数' },
  'lobby.winRate': { en: 'Win Rate', zh: '胜率' },
  'lobby.guest': { en: 'Guest', zh: '游客' },
  'lobby.emailLinked': { en: 'Email linked', zh: '已绑定邮箱' },
  'lobby.linkEmail': { en: 'Link Email', zh: '绑定邮箱' },
  'lobby.sendCode': { en: 'Send Code', zh: '发送验证码' },
  'lobby.verify': { en: 'Verify', zh: '验证' },
  'lobby.logout': { en: 'Logout', zh: '退出' },
  'lobby.elo': { en: 'ELO', zh: 'ELO' },
  'lobby.peak': { en: 'Peak', zh: '最高' },
  'lobby.history': { en: 'Match History', zh: '对局记录' },
  'lobby.noHistory': { en: 'No matches yet', zh: '暂无对局' },
  'lobby.win': { en: 'Win', zh: '胜' },
  'lobby.loss': { en: 'Loss', zh: '负' },
  'lobby.inProgress': { en: 'In Progress', zh: '进行中' },
  'lobby.loadMore': { en: 'Load More', zh: '加载更多' },
  'lobby.rounds': { en: 'Rounds', zh: '局数' },
  'lobby.levelUps': { en: 'Level Ups', zh: '升级数' },
  'lobby.loading': { en: 'Loading...', zh: '加载中...' },
  'lobby.codeSent': { en: 'Code sent! Check your email', zh: '验证码已发送，请查看邮箱' },
  'lobby.sendFailed': { en: 'Failed to send code', zh: '发送验证码失败' },
  'lobby.verifyFailed': { en: 'Invalid or expired code', zh: '验证码无效或已过期' },
  'lobby.activeRooms': { en: 'Active Rooms', zh: '活跃房间' },
  'lobby.noRooms': { en: 'No active rooms — create one!', zh: '暂无活跃房间 — 创建一个吧！' },
  'lobby.playerCount': { en: 'players', zh: '人' },
  'lobby.phase.FLIP_TRUMP': { en: 'Waiting', zh: '等待中' },
  'lobby.phase.BURY_KITTY': { en: 'Banking', zh: '扣底中' },
  'lobby.phase.TRICK_PLAY': { en: 'Playing', zh: '游戏中' },
  'lobby.phase.ROUND_SCORE': { en: 'Scoring', zh: '计分中' },
  'lobby.phase.GAME_OVER': { en: 'Finished', zh: '已结束' },
  'lobby.ago': { en: 'ago', zh: '前' },
  'lobby.settings': { en: 'Settings', zh: '设置' },
  'lobby.emailHint': { en: 'Optional — link your email to keep stats and history across devices', zh: '可选 — 绑定邮箱可跨设备保留游戏记录' },
  'lobby.nicknameHint': { en: 'This name is shown to other players', zh: '这个名字会显示给其他玩家' },
  'lobby.linkAccount': { en: 'Link Account', zh: '绑定账户' },

  // ScoreBoard
  'score.trump': { en: 'Trump', zh: '主牌' },
  'score.def': { en: 'Def', zh: '守' },
  'score.atk': { en: 'Atk', zh: '攻' },
  'score.defenders': { en: 'Defenders', zh: '守方' },
  'score.attackers': { en: 'Attackers', zh: '攻方' },
  'score.vs': { en: 'VS', zh: 'VS' },
  'score.level': { en: 'Lv', zh: '级' },
  'score.none': { en: 'none', zh: '无' },
  'score.kitty': { en: 'Bank', zh: '底牌' },
  'score.declare': { en: 'Declare: Seat', zh: '亮主: 座位' },
  'score.leave': { en: 'Leave', zh: '离开' },
  'score.leaveConfirm': { en: 'Leaving during a game will surrender for your team. Are you sure?', zh: '在游戏中离开将为你的队伍投降。确定要离开吗？' },
  'score.room': { en: 'Room', zh: '房间' },

  // Hand
  'hand.title': { en: 'Your hand', zh: '你的手牌' },
  'hand.noCards': { en: 'No cards dealt yet.', zh: '还未发牌' },
  'hand.layout': { en: 'Hand layout', zh: '手牌布局' },
  'hand.layoutCompact': { en: 'Compact', zh: '紧凑' },
  'hand.layoutSuit': { en: 'By Suit', zh: '按花色' },
  'hand.compactTight': { en: 'Tight', zh: '更紧' },
  'hand.compactBalanced': { en: 'Balanced', zh: '适中' },
  'hand.compactLoose': { en: 'Loose', zh: '更宽' },
  'hand.trumpTop': { en: 'Trump Top', zh: '主牌在上' },
  'hand.trumpBottom': { en: 'Trump Bottom', zh: '主牌在下' },
  'hand.group.TRUMP': { en: 'TRUMP', zh: '主牌' },
  'hand.group.S': { en: 'SPADES', zh: '黑桃' },
  'hand.group.H': { en: 'HEARTS', zh: '红心' },
  'hand.group.D': { en: 'DIAMONDS', zh: '方块' },
  'hand.group.C': { en: 'CLUBS', zh: '梅花' },

  // Table
  'table.noTrick': { en: 'No trick in progress', zh: '暂无出牌' },
  'table.trickTaken': { en: 'TRICK TAKEN', zh: '收墩成功' },
  'table.winsTrick': { en: 'wins the trick', zh: '赢下此墩' },

  // SeatCard
  'seat.you': { en: 'You', zh: '你' },
  'seat.banker': { en: 'Banker', zh: '庄' },
  'seat.leader': { en: 'Leader', zh: '领' },
  'seat.cards': { en: 'cards', zh: '张' },
  'seat.ready': { en: 'Ready', zh: '已准备' },
  'seat.notReady': { en: 'Not Ready', zh: '未准备' },
  'seat.readyUp': { en: 'Ready Up', zh: '准备' },
  'seat.cancelReady': { en: 'Cancel Ready', zh: '取消准备' },
  'seat.declare': { en: 'Declare', zh: '亮主' },
  'seat.seat': { en: 'Seat', zh: '座位' },

  // Action
  'action.declare': { en: 'Declare', zh: '亮主' },
  'action.declareHint': { en: 'Select a level-rank card or joker pair to declare', zh: '选择级牌或王对来亮主' },
  'action.bury': { en: 'Bury', zh: '扣底' },
  'action.buryConfirm': { en: 'Bury these cards?', zh: '确定扣这些底牌？' },
  'action.buryHint': { en: 'Select exactly {n} cards to bury', zh: '请选择{n}张牌扣底' },
  'action.play': { en: 'Play', zh: '出牌' },
  'action.waiting': { en: 'Waiting...', zh: '等待中...' },
  'action.waitTurn': { en: 'Wait for your turn', zh: '等待你的回合' },
  'action.selectCards': { en: 'Select cards to play', zh: '请选择要出的牌' },
  'action.waitBury': { en: 'Waiting for banker to bury...', zh: '等待庄家扣底牌...' },
  'action.snatchCountdown': { en: 'Snatch countdown', zh: '反主倒计时' },
  'action.noSnatch': { en: 'Pass', zh: '不反主' },
  'action.noSnatched': { en: 'Passed', zh: '已选不反主' },
  'action.fillBots': { en: 'Fill with Bots', zh: '自动加机器人' },
  'action.surrender': { en: 'Surrender', zh: '投降' },
  'surrender.proposed': { en: '{name} proposed surrender', zh: '{name}提议投降' },
  'surrender.accept': { en: 'Accept', zh: '同意' },
  'surrender.reject': { en: 'Reject', zh: '拒绝' },
  'surrender.opponentVoting': { en: 'Opponents voting to surrender', zh: '对方正在投票投降' },

  // Chat
  'chat.title': { en: 'Chat', zh: '聊天' },
  'chat.hide': { en: 'Hide Chat', zh: '隐藏聊天' },
  'chat.noMessages': { en: 'No messages', zh: '暂无消息' },
  'chat.placeholder': { en: 'Say something', zh: '说点什么' },
  'chat.send': { en: 'Send', zh: '发送' },
  'chat.room': { en: 'Room', zh: '房间' },
  'chat.lobby': { en: 'Lobby', zh: '大厅' },
  'audio.muteTts': { en: 'Mute Voice', zh: '静音语音' },
  'audio.unmuteTts': { en: 'Unmute Voice', zh: '开启语音' },
  'music.title': { en: 'Music', zh: '音乐' },

  // Round Result
  'round.title': { en: 'Round Result', zh: '本局结果' },
  'round.buried': { en: 'Bank Cards', zh: '底牌' },
  'round.ok': { en: 'OK', zh: '确定' },
  'round.victory': { en: 'VICTORY!', zh: '胜利！' },
  'round.goodGame': { en: 'Good Game!', zh: '好局！' },
  'round.defenderPts': { en: 'Defender Points', zh: '守方得分' },
  'round.attackerPts': { en: 'Attacker Points', zh: '攻方得分' },
  'round.levelChange': { en: 'Level', zh: '级别' },
  'round.gameOver': { en: 'Game Over', zh: '游戏结束' },
  'round.won': { en: 'won!', zh: '获胜！' },
  'round.rolesSwapped': { en: 'Roles swapped', zh: '攻守互换' },
  'round.newBanker': { en: 'New banker: Seat', zh: '新庄家: 座位' },
  'round.delta': { en: 'Level Up', zh: '升级' },
  'round.kittyPts': { en: 'Bank Points', zh: '底牌分' },
  'round.totalPts': { en: 'Total Points', zh: '总分' },
  'round.cards': { en: 'cards', zh: '张' },

  // KouDi
  'koudi.title': { en: 'Bank Cards', zh: '抠底' },

  // Joker
  'joker.small': { en: 'S', zh: '小' },
  'joker.big': { en: 'B', zh: '大' },

  // Bots & Seat Management
  'bot.addBot': { en: 'Add Bot', zh: '添加机器人' },
  'bot.removeBot': { en: 'Remove', zh: '移除' },
  'bot.simple': { en: 'Simple', zh: '简单' },
  'bot.medium': { en: 'Medium', zh: '中等' },
  'bot.tough': { en: 'Tough', zh: '困难' },
  'bot.cheater': { en: 'Cheater', zh: '作弊' },
  'bot.label': { en: 'Bot', zh: '机器人' },
  'seat.standUp': { en: 'Stand Up', zh: '站起' },
  'seat.sitHere': { en: 'Sit Here', zh: '坐下' },
  'seat.swap': { en: 'Swap', zh: '换座' },
  'seat.empty': { en: 'Empty', zh: '空座' },

  // Feedback
  'feedback.title': { en: 'Feedback', zh: '反馈' },
  'feedback.placeholder': { en: 'Share your thoughts, report bugs, or suggest features...', zh: '分享你的想法、报告问题或建议功能...' },
  'feedback.send': { en: 'Send Feedback', zh: '发送反馈' },
  'feedback.thanks': { en: 'Thanks for your feedback!', zh: '感谢你的反馈！' },

  // Language
  'lang.toggle': { en: '中文', zh: 'EN' },

  // Error recovery (H9)
  'error.INVALID_PLAY': { en: 'Invalid card combination. Try selecting cards of the same suit.', zh: '无效的出牌组合。请选择同花色的牌。' },
  'error.MUST_FOLLOW_SUIT': { en: 'You must follow the lead suit ({suit}). Select your {suit} cards.', zh: '必须跟出{suit}花色。请选择你的{suit}牌。' },
  'error.NOT_YOUR_TURN': { en: "It's not your turn yet.", zh: '还没轮到你出牌。' },
  'error.BURY_REQUIRES_N_CARDS': { en: 'Select exactly {n} cards to bury in the kitty.', zh: '请选择恰好{n}张牌扣底。' },
  'error.DECLARE_NOT_STRONGER': { en: "Your declaration isn't strong enough to override.", zh: '你的亮主不够强，无法覆盖。' },
  'error.THROW_PUNISHED': { en: 'Your throw was broken! Forced to play {card}.', zh: '你的甩牌被拆解！被迫出{card}。' },
  'error.generic': { en: '{action} rejected: {reason}', zh: '{action}被拒绝：{reason}' },

  // Phase labels (H1)
  'phase.FLIP_TRUMP': { en: 'Declaring Trump', zh: '亮主中' },
  'phase.BURY_KITTY': { en: 'Burying Kitty', zh: '扣底牌' },
  'phase.TRICK_PLAY': { en: 'Trick {n}', zh: '第{n}墩' },
  'phase.ROUND_SCORE': { en: 'Round Over', zh: '本局结束' },
  'phase.GAME_OVER': { en: 'Game Over', zh: '游戏结束' },

  // Waiting indicators (H1)
  'wait.forPlayer': { en: 'Waiting for {name} to play...', zh: '等待{name}出牌...' },
  'wait.forBanker': { en: 'Waiting for {name} to bury kitty...', zh: '等待{name}扣底牌...' },

  // Connection status (H1)
  'conn.reconnecting': { en: 'Reconnecting...', zh: '重连中...' },
  'conn.disconnected': { en: 'Disconnected', zh: '已断开' },

  // Trick counter (H1)
  'trick.counter': { en: 'Trick {played}/{total}', zh: '第{played}/{total}墩' },

  // Trump indicator (H6)
  'trump.indicator': { en: 'Trump', zh: '主' },

  // Trick history (H6)
  'history.title': { en: 'History', zh: '历史' },
  'history.noTricks': { en: 'No tricks played yet', zh: '暂无出牌记录' },

  // Team identity (H2)
  'team.you': { en: 'YOU', zh: '你' },
  'team.yourTeamDef': { en: 'Your Team (Defender)', zh: '你的队伍（守方）' },
  'team.yourTeamAtk': { en: 'Your Team (Attacker)', zh: '你的队伍（攻方）' },
  'team.opponentDef': { en: 'Opponent (Defender)', zh: '对手（守方）' },
  'team.opponentAtk': { en: 'Opponent (Attacker)', zh: '对手（攻方）' },

  // Renamed No Snatch (H2)
  'action.acceptTrump': { en: 'Accept Trump', zh: '确认主牌' },
  'action.acceptedTrump': { en: 'Accepted', zh: '已确认' },
  'action.acceptTrumpHint': { en: 'Accept the current trump declaration without overriding', zh: '接受当前亮主，不再反主' },

  // Contextual hints (H10)
  'hint.declareTrump': { en: 'Select a level card or joker pair from your hand, then click Declare to set the trump suit', zh: '从手牌中选择级牌或王对，点击亮主来设定主花色' },
  'hint.buryKitty': { en: "Choose {n} cards you don't need and click Bury to hide them", zh: '选择{n}张不需要的牌，点击扣底来隐藏它们' },
  'hint.leadTrick': { en: 'Select cards to play and click Play. You lead this trick!', zh: '选择要出的牌，点击出牌。你是这墩的领牌者！' },
  'hint.followTrick': { en: 'Select cards matching the lead suit. Green-highlighted cards are valid.', zh: '选择与领出花色相同的牌。绿色高亮的牌是有效的。' },

  // Tooltips (H10)
  'tooltip.declare': { en: 'Flip a level-rank card or joker pair to set the trump suit', zh: '翻出级牌或王对来设定主花色' },
  'tooltip.bury': { en: "Hide these cards in the kitty — opponents won't see them", zh: '将这些牌扣入底牌 — 对手看不到' },
  'tooltip.play': { en: 'Play your selected cards', zh: '打出你选择的牌' },
  'tooltip.ready': { en: 'Signal that you are ready for the next round', zh: '表示你已准备好下一局' },
  'tooltip.surrender': { en: 'Propose that your team concedes this round', zh: '提议你的队伍本局认输' },

  // Settings help (H10)
  'settings.trumpPlacementHelp': { en: 'Where trump cards appear in your hand', zh: '主牌在手牌中的位置' },
  'settings.compactHelp': { en: 'How tightly cards overlap', zh: '牌的重叠程度' },
  'settings.cardScaleHelp': { en: 'Size of cards in your hand', zh: '手牌的大小' },

  // User control (H3)
  'settings.confirmBeforePlay': { en: 'Confirm before play', zh: '出牌前确认' },
  'settings.autoPlayLastCard': { en: 'Auto-play last card', zh: '自动出最后一张牌' },
  'action.confirmPlay': { en: 'Confirm play?', zh: '确认出牌？' },
  'hand.clear': { en: 'Clear', zh: '清除' },

  // Error prevention (H5)
  'action.playNeed': { en: 'Play (need {n})', zh: '出牌（需{n}张）' },
  'warn.throwRisk': { en: "This may be a throw — if opponents can beat any part, you'll be punished", zh: '这可能是甩牌 — 如果对手能打败任何部分，你将被惩罚' },

  // Keyboard shortcuts (H7)
  'key.enter': { en: 'Enter', zh: 'Enter' },
  'key.space': { en: 'Space', zh: 'Space' },
  'key.esc': { en: 'Esc', zh: 'Esc' },

  // Guide (H10)
  'guide.title': { en: 'How to Play', zh: '游戏指南' },
  'guide.back': { en: 'Back to Lobby', zh: '返回大厅' },

  // Event log
  'eventLog.title': { en: 'Events', zh: '事件' },
  'eventLog.empty': { en: 'No events yet', zh: '暂无事件' },
  'eventLog.show': { en: 'Log', zh: '日志' },
  'eventLog.hide': { en: 'Hide', zh: '隐藏' },
};

export function t(key: string, lang?: Lang): string {
  const l = lang ?? useStore.getState().lang;
  return translations[key]?.[l] ?? key;
}

export function useT() {
  const lang = useStore((s) => s.lang);
  return (key: string) => translations[key]?.[lang] ?? key;
}
