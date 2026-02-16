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

  // ScoreBoard
  'score.trump': { en: 'Trump', zh: '主牌' },
  'score.def': { en: 'Def', zh: '守' },
  'score.atk': { en: 'Atk', zh: '攻' },
  'score.defenders': { en: 'Defenders', zh: '守方' },
  'score.attackers': { en: 'Attackers', zh: '攻方' },
  'score.vs': { en: 'VS', zh: 'VS' },
  'score.level': { en: 'Lv', zh: '级' },
  'score.none': { en: 'none', zh: '无' },
  'score.kitty': { en: 'Kitty', zh: '底牌' },
  'score.declare': { en: 'Declare: Seat', zh: '亮主: 座位' },
  'score.leave': { en: 'Leave', zh: '离开' },
  'score.room': { en: 'Room', zh: '房间' },

  // Hand
  'hand.title': { en: 'Your hand', zh: '你的手牌' },
  'hand.noCards': { en: 'No cards dealt yet.', zh: '还未发牌' },

  // Table
  'table.noTrick': { en: 'No trick in progress', zh: '暂无出牌' },

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

  // Chat
  'chat.title': { en: 'Chat', zh: '聊天' },
  'chat.hide': { en: 'Hide Chat', zh: '隐藏聊天' },
  'chat.noMessages': { en: 'No messages', zh: '暂无消息' },
  'chat.placeholder': { en: 'Say something', zh: '说点什么' },
  'chat.send': { en: 'Send', zh: '发送' },

  // Round Result
  'round.title': { en: 'Round Result', zh: '本局结果' },
  'round.buried': { en: 'Buried Cards', zh: '底牌' },
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
  'round.kittyPts': { en: 'Kitty Points', zh: '底牌分' },
  'round.totalPts': { en: 'Total Points', zh: '总分' },
  'round.cards': { en: 'cards', zh: '张' },

  // KouDi
  'koudi.title': { en: 'Bottom Cards', zh: '抠底' },

  // Joker
  'joker.small': { en: 'S', zh: '小' },
  'joker.big': { en: 'B', zh: '大' },

  // Language
  'lang.toggle': { en: '中文', zh: 'EN' },
};

export function t(key: string, lang?: Lang): string {
  const l = lang ?? useStore.getState().lang;
  return translations[key]?.[l] ?? key;
}

export function useT() {
  const lang = useStore((s) => s.lang);
  return (key: string) => translations[key]?.[lang] ?? key;
}
