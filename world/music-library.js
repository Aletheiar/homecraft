// The courtyard's public playlist. This is the only place to change what every
// visitor hears: add or remove files in assets/music and edit the list below.
// Order is playback order; `duration` is seconds. The local "本机试听" shelf is
// not listed here and never leaves the visitor's browser.
const file = name => new URL(`../assets/music/${name}`, import.meta.url).href;

export const COURTYARD_TRACKS = [
  { id: 'tomato', title: 'TOMATO', artist: '7co', duration: 192, src: file('01-7co-tomato.mp3') },
  { id: 'tokyo-flash', title: '東京フラッシュ', artist: 'Vaundy', duration: 259, src: file('02-vaundy-tokyo-flash.mp3') },
  { id: 'odoriko', title: '踊り子', artist: 'Vaundy', duration: 230, src: file('03-vaundy-odoriko.mp3') },
  { id: 'haruarashi', title: '春嵐', artist: 'john,初音ミク', duration: 162, src: file('04-john-miku-haruarashi.mp3') },
  { id: 'uraomote-lovers', title: '裏表ラバーズ', artist: 'wowaka,初音ミク', duration: 189, src: file('05-wowaka-miku-uraomote-lovers.mp3') },
  { id: 'horsey', title: 'Horsey (feat. Sarah Bonito)', artist: 'マクロスMACROSS 82-99', duration: 152, src: file('06-macross82-99-horsey.mp3') },
  { id: 'loop-the-room', title: 'ループザルーム (feat. 初音ミク)', artist: 'ルシノ,初音ミク', duration: 134, src: file('07-rushino-miku-loop-the-room.mp3') },
  { id: 'hebei-qilin', title: '河北墨麒麟', artist: '万能青年旅店', duration: 688, src: file('08-omnipotent-youth-hebei-qilin.mp3') },
  { id: 'qinhuangdao', title: '秦皇岛', artist: '万能青年旅店', duration: 481, src: file('09-omnipotent-youth-qinhuangdao.mp3') },
  { id: 'hanagumori', title: '花曇り', artist: '佐藤千亜妃', duration: 243, src: file('10-sato-chiaki-hanagumori.mp3') },
  { id: 'tiao-hai', title: '跳海', artist: '告五人', duration: 289, src: file('11-accusefive-tiao-hai.mp3') },
  { id: 'huaqiao', title: '花桥', artist: '回春丹', duration: 191, src: file('12-huichundan-huaqiao.mp3') },
  { id: 'come-back-to-me', title: 'Come Back To Me', artist: '宇多田ヒカル', duration: 238, src: file('13-hikaru-utada-come-back-to-me.mp3') },
  { id: 'chaiyu-calling', title: '柴 鱼 の c a l l i n g', artist: '幸子小姐拜托了', duration: 152, src: file('14-sachiko-chaiyu-calling.mp3') },
  { id: 'yuzhou-lengmo', title: '宇宙冷漠', artist: '幻琉', duration: 192, src: file('15-huanliu-yuzhou-lengmo.mp3') },
  { id: 'wanna-dance', title: '你要跳舞吗', artist: '新裤子', duration: 193, src: file('16-new-pants-do-you-wanna-dance.mp3') },
  { id: 'no-ideal', title: '没有理想的人不伤心', artist: '新裤子', duration: 341, src: file('17-new-pants-no-ideal-no-sadness.mp3') },
  { id: 'ting', title: '听', artist: '方大同', duration: 281, src: file('18-khalil-fong-ting.mp3') },
  { id: 'xiao-xiao-chong', title: '小小虫', artist: '方大同', duration: 240, src: file('19-khalil-fong-xiao-xiao-chong.mp3') },
  { id: 'mayonaka-no-door', title: '真夜中のドア〜stay with me (シングルver.)', artist: '松原みき', duration: 274, src: file('20-miki-matsubara-mayonaka-no-door.mp3') },
  { id: 'tsuki-ga-kirei', title: '月が綺麗ねと言われたい！', artist: '柿崎ユウタ', duration: 147, src: file('21-kakizaki-yuta-tsuki-ga-kirei.mp3') },
  { id: 'keep-you', title: '我用什么把你留住', artist: '福禄寿FloruitShow', duration: 330, src: file('22-floruitshow-keep-you.mp3') },
  { id: 'rag-train', title: 'ラグトレイン', artist: '稲葉曇,歌愛ユキ', duration: 253, src: file('23-inabakumori-rag-train.mp3') },
  { id: 'reminiscence', title: '复刻回忆', artist: '薛凯琪,方大同', duration: 286, src: file('24-fiona-sit-khalil-fong-reminiscence.mp3') },
  { id: 'susan-shuo', title: 'Susan 说', artist: '陶喆', duration: 262, src: file('25-david-tao-susan-shuo.mp3') },
  { id: 'hate-red-chamber', title: '讨厌红楼梦', artist: '陶喆', duration: 242, src: file('26-david-tao-hate-red-chamber.mp3') },
  { id: 'airport-1030', title: '飞机场的1030', artist: '陶喆', duration: 281, src: file('27-david-tao-airport-1030.mp3') }
];
