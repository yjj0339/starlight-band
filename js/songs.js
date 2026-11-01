/* 星光乐队 · 内置曲库（公版名曲 + 原创），简谱记谱，自动编配整支乐队 */
(function () {
  const BS = window.BS;
  BS.SONGS = [
    {
      id: 'star-city', title: '星光之城', sub: '星光乐队原创 · 流行', cat: '流行', bpm: 100, key: 'C', style: 'pop', lead: 'piano', lead2: 'violin',
      colors: ['#ff7eb3', '#7a5cff'],
      parts: {
        V: { name: '主歌', c: 'C G Am Em F C Dm G', m: '3 3_ 2_ 3 5 | 2 - - 0 | 1 1_ 7,_ 1 3 | 7, - - 0 | 6, 1_ 2_ 3 6 | 5 - 3 - | 4 4_ 3_ 2 1 | 2 - - 0' },
        C: { name: '副歌', c: 'F G Am Em Dm G C:2 G:2 C', m: "1' 1'_ 7_ 1' 2' | 7 5 5 - | 6 6_ 5_ 6 1' | 3' - - 0 | 4' 3'_ 2'_ 1' 6 | 5 6_ 5_ 3 2 | 1 2_ 3_ 2 - | 1 - - -" },
      },
      form: ['V1', 'V2', 'C3', 'V2', 'C3', 'C3'],
    },
    {
      id: 'burn', title: '燃烧吧乐队', sub: '星光乐队原创 · 摇滚', cat: '流行', bpm: 132, key: 'C', style: 'rock', lead: 'eguitar', lead2: 'synthlead',
      colors: ['#ff4d4d', '#ffb347'],
      parts: {
        V: { name: '主歌', c: 'Am C:2 G:2 Am C Am C:2 G:2 F:2 G:2 Am', m: '6, 6,_ 1_ 2 1_ 6,_ | 3 - 2 - | 6, 6,_ 1_ 2 3_ 5_ | 3 - - - | 6, 6,_ 1_ 2 1_ 6,_ | 3 - 2 1 | 6, 1_ 2_ 1 7,_ 5,_ | 6, - - -' },
        C: { name: '副歌', c: 'F C Dm Em F C:2 G:2 Dm:2 E:2 Am', m: "1' - 7 6 | 5 - 3 - | 4 4_ 3_ 4 5 | 3 - - - | 1' - 7 6 | 5 - 3 2 | 1 2_ 3_ 2 7, | 6, - - -" },
      },
      form: ['V2', 'V2', 'C3', 'V2', 'C3', 'C3'],
    },
    {
      id: 'midnight-blue', title: '午夜蓝调', sub: '星光乐队原创 · 爵士', cat: '流行', bpm: 112, key: 'C', style: 'jazz', lead: 'sax', lead2: 'trumpet',
      colors: ['#1e3a8a', '#38bdf8'],
      parts: {
        A: { name: 'A 段', c: 'Dm7 G7 Cmaj7 Am7 Dm7 G7 Cmaj7 C7', m: "2 4_ 6_ 1' 7 | 7 - 0 5_ 6_ | 7 - 3' 2'_ 7_ | 1' - - 0 | 2 4_ 6_ 1' 7 | 7 - 0 5_ 6_ | 7 6_ 5_ 3 2 | 1 - - 0" },
        B: { name: 'B 段', c: 'Fmaj7 Fm7 Em7 A7 Dm7 G7 Cmaj7 C6', m: "6 - 1' 6 | b6 - 5 - | 5 3_ 4_ 5 #5 | 6 - - 0 | 4 2_ 4_ 6 1' | 7 5_ 6_ 7 2' | 1' - 5 3 | 1 - - -" },
      },
      form: ['A1', 'A2', 'B2', 'A3', 'B3', 'A2'],
    },
    {
      id: 'bamboo-rain', title: '竹林听雨', sub: '星光乐队原创 · 国风', cat: '国风', bpm: 76, key: 'D', style: 'chinese', lead: 'guzheng', lead2: 'flute',
      colors: ['#14532d', '#86efac'],
      parts: {
        A: { name: '起', c: 'D Em:2 D:2 Bm A G D Em:2 Bm:2 D', m: "3 5_ 6_ 5 3 | 2 3_ 5_ 3 - | 6, 1_ 2_ 3 5 | 2 - - - | 3 5_ 6_ 1' 6 | 5 6_ 5_ 3 2 | 1 2_ 3_ 2 6, | 1 - - -" },
        B: { name: '承', c: 'G Bm D A Bm Em:2 D:2 A Bm', m: "6 1'_ 2'_ 1' 6 | 5 6_ 1'_ 6 - | 3 5_ 6_ 5 3 | 2 3_ 1_ 2 - | 6, 1_ 2_ 3 5 | 6 5_ 3_ 2 1 | 2 3_ 5_ 3 2_ 1_ | 6, - - -" },
      },
      form: ['A1', 'B2', 'A2', 'B3', 'A3'],
    },
    {
      id: 'jasmine', title: '茉莉花', sub: '江苏民歌', cat: '国风', bpm: 72, key: 'D', style: 'chinese', lead: 'erhu', lead2: 'flute',
      colors: ['#f0fdf4', '#4ade80'],
      parts: {
        A: { name: '好一朵', c: 'D:2 Bm:2 D D:2 Bm:2 D D G:2 D:2 Bm:2 A:2 D', m: "3 3_ 5_ 6_ 1'_ 1'_ 6_ | 5 5_ 6_ 5 - | 3 3_ 5_ 6_ 1'_ 1'_ 6_ | 5 5_ 6_ 5 - | 5 5 5 3_ 5_ | 6 6 5 - | 3 2_ 3_ 5 3_ 2_ | 1 1_ 2_ 1 -" },
        B: { name: '芬芳美丽', c: 'Bm:2 Em:2 D:2 A:2 Em:2 Bm:2 A Bm:2 Em:2 D', m: "3_ 2_ 1_ 3_ 2 - | 3_. 5__ 6_ 1'_ 5 - | 2 3_ 5_ 2_ 3_ 1_ 6,_ | 5, - - - | 6,_ 1_ 2 3_ 1_ 2_ 3_ | 1_ 6,_ 5, - -" },
      },
      form: ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'],
    },
    {
      id: 'farewell', title: '送别', sub: '长亭外 · 李叔同填词', cat: '国风', bpm: 70, key: 'C', style: 'ballad', lead: 'piano', lead2: 'erhu',
      colors: ['#fde68a', '#fb923c'],
      parts: {
        A: { name: '长亭外', c: 'C F:2 C:2 C G C F:2 C:2 G7 C', m: "5 3_ 5_ 1' - | 6 1' 5 - | 5 1_ 2_ 3 2_ 1_ | 2 - - - | 5 3_ 5_ 1'. 7_ | 6 1' 5 - | 5 2_ 3_ 4. 7,_ | 1 - - -" },
        B: { name: '天之涯', c: 'F G:2 C:2 F:2 C:2 G C F:2 C:2 G7 C', m: "6 1' 1' - | 7 6_ 7_ 1' - | 6_ 7_ 1'_ 6_ 6_ 5_ 3_ 1_ | 2 - - - | 5 3_ 5_ 1'. 7_ | 6 1' 5 - | 5 2_ 3_ 4. 7,_ | 1 - - -" },
      },
      form: ['A1', 'A2', 'B2', 'A3', 'B3', 'A2'],
    },
    {
      id: 'fur-elise', title: '致爱丽丝', sub: '贝多芬', cat: '古典', bpm: 132, ts: 3, key: 'C', style: 'classical', styleOver: { keysPat: 'arp8', padMin: 1 }, lead: 'piano', lead2: 'violin',
      colors: ['#e0e7ff', '#818cf8'], intro: false,
      parts: {
        A: { name: '主题', pk: 1, c: 'N Am E Am N Am E Am', m: "3'_ #2'_ | 3'_ #2'_ 3'_ 7_ 2'_ 1'_ | 6 0_ 1_ 3_ 6_ | 7 0_ 3_ #5_ 7_ | 1' 0_ 3_ 3'_ #2'_ | 3'_ #2'_ 3'_ 7_ 2'_ 1'_ | 6 0_ 1_ 3_ 6_ | 7 0_ 3_ 1'_ 7_ | 6 0_" },
        C: { name: '主题', pk: 1, c: 'N Am E Am N Am E Am', m: "3'_ #2'_ | 3'_ #2'_ 3'_ 7_ 2'_ 1'_ | 6 0_ 1_ 3_ 6_ | 7 0_ 3_ #5_ 7_ | 1' 0_ 3_ 3'_ #2'_ | 3'_ #2'_ 3'_ 7_ 2'_ 1'_ | 6 0_ 1_ 3_ 6_ | 7 0_ 3_ 1'_ 7_ | 6 0_ 7_ 1'_ 2'_" },
        B: { name: '中段', c: 'C G Am E', m: "3'. 5_ 4'_ 3'_ | 2'. 4_ 3'_ 2'_ | 1'. 3_ 2'_ 1'_ | 7 0_ 3_ 0" },
        D: { name: '再现', pk: 1, c: 'N Am E Am N Am E Am', m: "3'_ #2'_ | 3'_ #2'_ 3'_ 7_ 2'_ 1'_ | 6 0_ 1_ 3_ 6_ | 7 0_ 3_ #5_ 7_ | 1' 0_ 3_ 3'_ #2'_ | 3'_ #2'_ 3'_ 7_ 2'_ 1'_ | 6 0_ 1_ 3_ 6_ | 7 0_ 3_ 1'_ 7_ | 6 - -" },
      },
      form: ['A0', 'C0', 'B1', 'A1', 'C1', 'B2', 'D2'],
    },
    {
      id: 'canon', title: '卡农', sub: '帕赫贝尔 · D 大调', cat: '古典', bpm: 72, key: 'D', style: 'classical', styleOver: { keysPat: 'arp8', padMin: 1 }, lead: 'violin', lead2: 'cello',
      colors: ['#fbcfe8', '#c084fc'], endChord: 'D',
      intro: 'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2', introLevel: 0,
      parts: {
        P: { name: '第一变奏', c: 'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2', m: "3' - 2' - | 1' - 7 - | 6 - 5 - | 6 - 7 - | 1' - 7 - | 6 - 5 - | 4 - 3 - | 4 - 2 -" },
        Q: { name: '第二变奏', c: 'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2', m: "1 3 5 4 | 3 1 3 2 | 1 6, 1 5 | 4 6 5 4 | 1' 3' 5' 4' | 3' 1' 3' 2' | 1' 6 1' 5' | 4' 6' 5' 4'" },
        R: { name: '华彩变奏', c: 'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2', m: "3' 1'_ 2'_ 3' 1'_ 2'_ | 3'_ 3_ 4_ 5_ 6_ 7_ 1'_ 2'_ | 1' 6_ 7_ 1' 3_ 4_ | 5_ 6_ 5_ 4_ 5_ 1'_ 7_ 1'_ | 6 1'_ 7_ 6 5_ 4_ | 5_ 4_ 3_ 4_ 5_ 6_ 7_ 1'_ | 6 1'_ 7_ 1' 7_ 6_ | 7_ 1'_ 2'_ 1'_ 7_ 1'_ 6_ 7_" },
      },
      form: ['P1', 'Q2', 'R2', 'P3', 'R3'],
    },
    {
      id: 'ode-to-joy', title: '欢乐颂', sub: '贝多芬 · 第九交响曲', cat: '古典', bpm: 112, key: 'C', style: 'classical', lead: 'piano', lead2: 'trumpet',
      colors: ['#fef08a', '#f97316'],
      parts: {
        X: { name: '主题', c: 'C G C G C G C G:2 C:2', m: "3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3. 2_ 2 - | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2. 1_ 1 -" },
        Y: { name: '展开', c: 'G G:2 C:2 G:2 C:2 Am:2 G:2 C G C G:2 C:2', m: "2 2 3 1 | 2 3_ 4_ 3 1 | 2 3_ 4_ 3 2 | 1 2 5, - | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2. 1_ 1 -" },
      },
      form: ['X1', 'Y2', 'X2', 'Y3', 'Y3'],
    },
    {
      id: 'minuet', title: 'G 大调小步舞曲', sub: '巴赫 / 佩措尔德', cat: '古典', bpm: 120, ts: 3, key: 'G', style: 'classical', lead: 'piano', lead2: 'flute',
      colors: ['#d9f99d', '#22c55e'],
      parts: {
        X: { name: '主题', c: 'G G C G Am G D D G G C G Am G D G', m: "5 1_ 2_ 3_ 4_ | 5 1 1 | 6 4_ 5_ 6_ 7_ | 1' 1 1 | 4 5_ 4_ 3_ 2_ | 3 4_ 3_ 2_ 1_ | 7, 1_ 2_ 3_ 1_ | 2 - - | 5 1_ 2_ 3_ 4_ | 5 1 1 | 6 4_ 5_ 6_ 7_ | 1' 1 1 | 4 5_ 4_ 3_ 2_ | 3 4_ 3_ 2_ 1_ | 2 3_ 2_ 1_ 7,_ | 1 - -" },
        B: { name: '中段', c: 'G D Em A D G A7 D', m: "3' 1'_ 2'_ 3'_ 1'_ | 2' 5_ 6_ 7_ 5_ | 1' 6_ 7_ 1'_ 5_ | #4 3_ #4_ 2 | 2_ 3_ #4_ 5_ 6_ 7_ | 1' 7 6 | 7 2 #4 | 5 - -" },
        Y: { name: '再现', c: 'G G C G Am G D G', m: "5 1_ 2_ 3_ 4_ | 5 1 1 | 6 4_ 5_ 6_ 7_ | 1' 1 1 | 4 5_ 4_ 3_ 2_ | 3 4_ 3_ 2_ 1_ | 2 3_ 2_ 1_ 7,_ | 1 - -" },
      },
      form: ['X1', 'B2', 'Y2', 'X2', 'B3', 'Y3'],
    },
    {
      id: 'blue-danube', title: '蓝色多瑙河', sub: '小约翰·施特劳斯', cat: '古典', bpm: 168, ts: 3, key: 'D', style: 'waltz', lead: 'violin', lead2: 'flute',
      colors: ['#bae6fd', '#2563eb'],
      parts: {
        A: { name: '圆舞曲 I', c: 'D D D D D D D A7 A7 A7 A7 A7 A7 A7 A7 D', m: "1 1 3 | 5 - 5 | 5' - 5' | 3' - 3' | 1 1 3 | 5 - 5 | 5' - 5' | 4' - 4' | 7, 7, 2 | 6 - 6 | 6' - 6' | 4' - 4' | 7, 7, 2 | 6 - 6 | 6' - 6' | 3' - 3'" },
        B: { name: '圆舞曲 II', c: 'D D D D D D D G Em Em Em A7 A7 D A7 D', m: "1 1 3 | 5 - 1' | 1'' - 1'' | 5' - 5' | 1 1 3 | 5 - 1' | 1'' - 1'' | 6' - 6' | 2 2 4 | 6 - - | 6 - - | 5 6 - | 4' - - | 3' - - | 2' - - | 1' - -" },
      },
      form: ['A1', 'B2', 'A3', 'B3'],
    },
    {
      id: 'going-home', title: '念故乡', sub: '德沃夏克 · 新世界', cat: '古典', bpm: 66, key: 'C', style: 'classical', styleOver: { keysPat: 'arp8' }, lead: 'flute', lead2: 'cello',
      colors: ['#fed7aa', '#9a3412'],
      parts: {
        A: { name: '主题', c: 'C C:2 F:2 G:2 Em:2 G C C:2 F:2 G:2 G7:2 C', m: '3. 5_ 5 - | 3. 2_ 1 - | 2. 3_ 5. 3_ | 2 - - - | 3. 5_ 5 - | 3. 2_ 1 - | 2. 3_ 2. 1_ | 1 - - -' },
      },
      form: ['A1', 'A2', 'A3', 'A2'],
    },
    {
      id: 'lullaby', title: '摇篮曲', sub: '勃拉姆斯', cat: '古典', bpm: 92, ts: 3, key: 'C', style: 'ballad', lead: 'musicbox', lead2: 'strings',
      colors: ['#e9d5ff', '#f0abfc'],
      parts: {
        A: { name: '摇篮曲', pk: 1, c: 'C C G7 G7 G7 G7 G7 C F C F C F C G7 C', m: "3_ 3_ | 5 - 3_. 3__ | 5 - 3_ 5_ | 1' 7. 6_ | 6 5 2_ 3_ | 4 2 2_ 3_ | 4 - 2_ 4_ | 7_ 6_ 5 7 | 1' - 1_ 1_ | 1' - 6_ 4_ | 5 - 3_ 1_ | 4 5 6 | 5 - 1_ 1_ | 1' - 6_ 4_ | 5 - 3_ 1_ | 4_ 3_ 2 7, | 1 -" },
      },
      form: ['A1', 'A2', 'A3'],
    },
    {
      id: 'cancan', title: '康康舞曲', sub: '奥芬巴赫 · 地狱中的奥菲欧', cat: '古典', bpm: 152, ts: 2, key: 'C', style: 'march', lead: 'piano', lead2: 'trumpet',
      colors: ['#fecaca', '#dc2626'],
      parts: {
        A: { name: '加洛普', c: 'C C C G7 G7 C F G', m: "1 2_ 4_ | 3_ 2_ 5 | 5 6_ 3_ | 4_ 2_ 2 | 2 4_ 3_ | 2_ 1_ 1'_ 7_ | 6_ 5_ 4_ 3_ | 2_ 1_ 2_ 3_" },
        B: { name: '加洛普', c: 'C C C G7 G7 C:1 G:1 G:1 C:1 C', m: "1 2_ 4_ | 3_ 2_ 5 | 5 6_ 3_ | 4_ 2_ 2 | 2 4_ 3_ | 2_ 1_ 5 | 2_ 3_ 1 | 1 0" },
      },
      form: ['A1', 'B1', 'A2', 'B2', 'A3', 'B3', 'A3', 'B3'],
    },
    {
      id: 'greensleeves', title: '绿袖子', sub: '英格兰民谣', cat: '古典', bpm: 96, ts: 3, key: 'C', style: 'ballad', lead: 'flute', lead2: 'violin',
      colors: ['#bbf7d0', '#15803d'],
      parts: {
        A: { name: '主歌', pk: 1, c: 'Am C G Em Am E E E Am C G Em Am E Am Am', m: "6 | 1' - 2' | 3'. 4'_ 3' | 2' - 7 | 5. 6_ 7 | 1' - 6 | 6. #5_ 6 | 7 - #5 | 3 - 6 | 1' - 2' | 3'. 4'_ 3' | 2' - 7 | 5. 6_ 7 | 1'. 7_ 6 | #5. #4_ #5 | 6 - - | 6 -" },
        B: { name: '副歌', c: 'C C G Em Am E E E C C G Em Am E Am Am', m: "5' - - | 5'. #4'_ 3' | 2' - 7 | 5. 6_ 7 | 1' - 6 | 6. #5_ 6 | 7 - #5 | 3 - - | 5' - - | 5'. #4'_ 3' | 2' - 7 | 5. 6_ 7 | 1'. 7_ 6 | #5. #4_ #5 | 6 - - | 6 -" },
      },
      form: ['A1', 'A2', 'B2', 'A3', 'B3'],
    },
    {
      id: 'jingle-bells', title: '铃儿响叮当', sub: '皮尔彭特', cat: '节日', bpm: 132, key: 'C', style: 'xmas', lead: 'piano', lead2: 'musicbox',
      colors: ['#fecaca', '#16a34a'],
      parts: {
        V: { name: '主歌', c: 'C C C F F G G7 C C C C F F G7 G7 C:2 G7:2', m: '5, 3 2 1 | 5, - - 5,_ 5,_ | 5, 3 2 1 | 6, - - - | 6, 4 3 2 | 7, - - - | 5 5 4 2 | 3 - - - | 5, 3 2 1 | 5, - - - | 5, 3 2 1 | 6, - - 6, | 6, 4 3 2 | 5 5 5 5 | 6 5 4 2 | 1 - 5 -' },
        C: { name: '副歌', c: 'C C C C F C D7 G7 C C C C F C G7 C', m: '3 3 3 - | 3 3 3 - | 3 5 1. 2_ | 3 - - - | 4 4 4. 4_ | 4 3 3 3_ 3_ | 3 2 2 3 | 2 - 5 - | 3 3 3 - | 3 3 3 - | 3 5 1. 2_ | 3 - - - | 4 4 4. 4_ | 4 3 3 3_ 3_ | 5 5 4 2 | 1 - - -' },
      },
      form: ['V1', 'C2', 'V2', 'C3', 'C3'],
    },
    {
      id: 'silent-night', title: '平安夜', sub: '格鲁伯', cat: '节日', bpm: 84, ts: 3, key: 'C', style: 'ballad', lead: 'piano', lead2: 'choir',
      colors: ['#1e1b4b', '#fde68a'],
      parts: {
        A: { name: '平安夜', c: 'C C C C G G C C F F C C F F C C G G7 C C C G7 C C', m: "5. 6_ 5 | 3 - - | 5. 6_ 5 | 3 - - | 2' - 2' | 7 - - | 1' - 1' | 5 - - | 6 - 6 | 1'. 7_ 6 | 5. 6_ 5 | 3 - - | 6 - 6 | 1'. 7_ 6 | 5. 6_ 5 | 3 - - | 2' - 2' | 4'. 2'_ 7 | 1' - - | 3' - - | 1' 5 3 | 5. 4_ 2 | 1 - - | 1 - -" },
      },
      form: ['A1', 'A2', 'A3'],
    },
    {
      id: 'merry-xmas', title: '祝你圣诞快乐', sub: '英国传统颂歌', cat: '节日', bpm: 150, ts: 3, key: 'C', style: 'xmas', lead: 'piano', lead2: 'musicbox',
      colors: ['#dc2626', '#fde047'],
      parts: {
        X: { name: '祝你圣诞快乐', pk: 1, c: 'C F D7 G E7 Am Dm:1 G:2 C', m: "5, | 1 1_ 2_ 1_ 7,_ | 6, 6, 6, | 2 2_ 3_ 2_ 1_ | 7, 5, 5, | 3 3_ 4_ 3_ 2_ | 1 6, 5,_ 5,_ | 6, 2 7, | 1 -" },
        Y: { name: '好消息', pk: 1, c: 'C G Am G C G Dm:1 G:2 C', m: "5, | 1 1 1 | 7, - 7, | 1 7, 6, | 5, - 2 | 3 2 1 | 5 5, 5,_ 5,_ | 6, 2 7, | 1 -" },
      },
      form: ['X1', 'X2', 'Y2', 'X3', 'Y3', 'X3'],
    },
    {
      id: 'birthday', title: '生日快乐', sub: '希尔姐妹', cat: '节日', bpm: 104, ts: 3, key: 'C', style: 'waltz', lead: 'piano', lead2: 'musicbox',
      colors: ['#fbcfe8', '#f472b6'],
      parts: {
        A: { name: '祝你生日快乐', pk: 1, c: 'C G G C C F C:2 G:1 C', m: '5,_. 5,__ | 6, 5, 1 | 7, - 5,_. 5,__ | 6, 5, 2 | 1 - 5,_. 5,__ | 5 3 1 | 7, 6, 4_. 4__ | 3 1 2 | 1 -' },
      },
      form: ['A1', 'A2', 'A3'],
    },
    {
      id: 'auld-lang-syne', title: '友谊地久天长', sub: '苏格兰民歌', cat: '节日', bpm: 80, key: 'C', style: 'ballad', lead: 'piano', lead2: 'choir',
      colors: ['#fef3c7', '#b45309'],
      parts: {
        A: { name: '友谊万岁', pk: 1, c: 'C G C F C G F:2 G:2 C C G C F C G F:2 G:2 C', m: '5, | 1. 1_ 1 3 | 2. 1_ 2 3_ 2_ | 1. 1_ 3 5 | 6 - - 6 | 5. 3_ 3 1 | 2. 1_ 2 3_ 2_ | 1. 6,_ 6, 5, | 1 - - 6 | 5. 3_ 3 1 | 2. 1_ 2 6 | 5. 3_ 3 5 | 6 - - 1\' | 5. 3_ 3 1 | 2. 1_ 2 3_ 2_ | 1. 6,_ 6, 5, | 1 - -' },
      },
      form: ['A1', 'A2', 'A3'],
    },
    {
      id: 'twinkle', title: '小星星', sub: '法国童谣 · 莫扎特变奏', cat: '儿歌', bpm: 100, key: 'C', style: 'pop', lead: 'piano', lead2: 'musicbox',
      colors: ['#fef9c3', '#60a5fa'],
      parts: {
        A: { name: '一闪一闪', c: 'C F:2 C:2 F:2 C:2 G:2 C:2', m: '1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -' },
        B: { name: '挂在天上', c: 'C:2 F:2 C:2 G:2 C:2 F:2 C:2 G:2', m: '5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 -' },
      },
      form: ['A1', 'B1', 'A1', 'A2', 'B2', 'A2', 'A3', 'B3', 'A3'],
    },
    {
      id: 'two-tigers', title: '两只老虎', sub: '法国童谣', cat: '儿歌', bpm: 120, key: 'C', style: 'pop', lead: 'marimba', lead2: 'musicbox',
      colors: ['#fed7aa', '#f59e0b'],
      parts: {
        A: { name: '两只老虎', c: 'C C C C C C G:2 C:2 G:2 C:2', m: '1 2 3 1 | 1 2 3 1 | 3 4 5 - | 3 4 5 - | 5_ 6_ 5_ 4_ 3 1 | 5_ 6_ 5_ 4_ 3 1 | 2 5, 1 - | 2 5, 1 -' },
      },
      form: ['A1', 'A2', 'A3', 'A3'],
    },
    {
      id: 'mary-lamb', title: '玛丽有只小羊羔', sub: '美国童谣', cat: '儿歌', bpm: 116, key: 'C', style: 'pop', lead: 'piano', lead2: 'flute',
      colors: ['#e0f2fe', '#a5f3fc'],
      parts: {
        A: { name: '小羊羔', c: 'C C G C C C G C', m: '3 2 1 2 | 3 3 3 - | 2 2 2 - | 3 5 5 - | 3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1 - - -' },
      },
      form: ['A1', 'A2', 'A3', 'A3'],
    },
    {
      id: 'london-bridge', title: '伦敦桥', sub: '英国童谣', cat: '儿歌', bpm: 116, key: 'C', style: 'march', lead: 'piano', lead2: 'trumpet',
      colors: ['#cbd5e1', '#ef4444'],
      parts: {
        A: { name: '伦敦桥', c: 'C C G C C C G C', m: '5. 6_ 5 4 | 3 4 5 - | 2 3 4 - | 3 4 5 - | 5. 6_ 5 4 | 3 4 5 - | 2 - 5 - | 3 1 - -' },
      },
      form: ['A1', 'A2', 'A3', 'A3'],
    },
    {id:"summer-breeze",title:"夏夜微风",sub:"星光乐队原创 · 流行",cat:"流行",bpm:96,key:"C",style:"pop",lead:"epiano",lead2:"flute",colors:["#fde68a","#fca5a5"],parts:{A:{name:"主歌",c:"C G Am F C G F G",m:"3 3_ 5_ 5 3 | 2 2_ 3_ 2 1 | 1 3 6 5 | 4 3 1 - | 3 3_ 5_ 5 3 | 2 2_ 3_ 5 2 | 1' 7 6 5 | 5 - - -"},B:{name:"副歌",c:"F G C Am F G C C",m:"6 1' 1' 6 | 7 5 7 2' | 3' 3'_ 2'_ 1' 5 | 6 - 5 3 | 6 1' 1' 6 | 7 5 7 2' | 3' 2' 1' 5 | 1' - - -"}},form:["A1","A2","B2","A2","B3","B3"]},
    {id:"star-river",title:"星河入梦",sub:"星光乐队原创 · 抒情",cat:"流行",bpm:72,key:"G",style:"ballad",lead:"piano",lead2:"violin",colors:["#c7d2fe","#a5b4fc"],parts:{A:{name:"主歌",c:"G D Em C G D C D",m:"3 5 5. 3_ | 2 2_ 3_ 2 1 | 3 3_ 5_ 6 5 | 5 3 1 - | 3 5 1' 7 | 6 5 3 2 | 3 2 1 6, | 5, - - -"},B:{name:"副歌",c:"C G D Em C G D G",m:"1' - 5 3 | 2' 1' 7 5 | 6 5 6 7 | 1' - - - | 1' 1' 6 5 | 3 5 7 5 | 6 6_ 5_ 6 7 | 1' - - -"}},form:["A1","A2","B2","A2","B3","B3"]},
    {id:"sakura-rain",title:"樱花雨",sub:"星光乐队原创 · 国风",cat:"国风",bpm:80,key:"C",style:"chinese",lead:"flute",lead2:"erhu",colors:["#fbcfe8","#f9a8d4"],parts:{A:{name:"起",c:"Am F C G Am F G Am",m:"6 - 1' 6 | 6 - 5 4 | 3 - 5 1' | 7 - 5 - | 6 - 1' 6 | 6 5 4 3 | 2 3 5 7 | 6 - - -"},B:{name:"转",c:"F G Em Am F G Am Am",m:"1' - 6 4 | 5 - 7 2' | 3' - 2' 1' | 6 - - - | 1' - 6 4 | 5 - 7 2' | 3' 2' 1' 7 | 6 - - -"}},form:["A1","A2","B2","A2","B3","B3"]},
    {id:"fly-free",title:"自由飞翔",sub:"星光乐队原创 · 摇滚",cat:"流行",bpm:138,key:"G",style:"rock",lead:"eguitar",lead2:"synthlead",colors:["#fecaca","#fb923c"],parts:{A:{name:"主歌",c:"Em C G D Em C D D",m:"6 - 5 6 | 5 6 5 3 | 3 - 5 3 | 2 - 3 5 | 6 - 5 6 | 5 6 1' 6 | 5 - 2 3 | 2 - - -"},B:{name:"副歌",c:"C D Em G C D G G",m:"1' - 1' 6 | 5 5 6 7 | 1' 1' 7 6 | 5 - - - | 1' - 1' 6 | 5 5 6 7 | 1' 7 5 3 | 1 - - -"}},form:["A2","A2","B3","A2","B3","B3"]},
    {id:"jazz-coffee",title:"午后咖啡",sub:"星光乐队原创 · 爵士",cat:"流行",bpm:108,key:"F",style:"jazz",lead:"sax",lead2:"trumpet",colors:["#fed7aa","#d6a46b"],parts:{A:{name:"A 段",c:"Gm7 C7 Fmaj7 D7 Gm7 C7 Fmaj7 C7",m:"5 - 4 2 | 3 2 1 5, | 1 3 5 7 | 6 - #1 2 | 5 4 2 4 | 3 5 6 5 | 1 - 3 5 | 5 - - -"},B:{name:"B 段",c:"Bb7 Bb7 Fmaj7 D7 Gm7 C7 Fmaj7 Fmaj7",m:"4 6 1' 6 | 4 - 6 1' | 7 1' 3' 1' | 6 - 5 3 | 2 4 6 4 | 5 - 3 2 | 1 - 3 5 | 1' - - -"}},form:["A1","A2","B2","A3","B3","A2"]},
    {id:"triumph",title:"凯旋",sub:"星光乐队原创 · 管弦",cat:"音乐会",bpm:100,key:"D",style:"march",lead:"trumpet",lead2:"strings",colors:["#fde68a","#f59e0b"],parts:{A:{name:"号角",c:"Bm G D A Bm G A D",m:"6 - 5 3 | 4 - 6 1' | 1' - 6 5 | 3 - 5 7 | 6 - 5 3 | 4 - 6 1' | 7 6 5 7 | 1' - - -"},B:{name:"凯歌",c:"G D A Bm G D A D",m:"6 - 1' 6 | 5 - 1' 5 | 7 - 2' 7 | 1' - - - | 6 - 1' 3' | 2' - 1' 6 | 7 2' 7 5 | 1' - - -"}},form:["A1","A2","B3","A2","B3","B3"]},
    {id:"xmas-bells",title:"圣诞钟声",sub:"星光乐队原创 · 节日",cat:"节日",bpm:120,key:"C",style:"xmas",lead:"musicbox",lead2:"flute",colors:["#fecaca","#86efac"],parts:{A:{name:"钟声",c:"C F C G C F G C",m:"3 5 3 1 | 4 6 4 1 | 3 5 1' 5 | 2 - 7, - | 3 5 3 1 | 4 6 1' 6 | 5 4 2 7, | 1 - - -"},B:{name:"合唱",c:"F C G C F C G C",m:"6 - 4 6 | 5 - 3 5 | 7, 2 4 2 | 3 - - - | 6 - 4 6 | 5 - 3 5 | 4 2 7, 2 | 1 - - -"}},form:["A1","A2","B2","A3","B3","B3"]},
    {id:"kite",title:"童年的风筝",sub:"星光乐队原创 · 儿歌",cat:"儿歌",bpm:100,key:"C",style:"pop",lead:"piano",lead2:"musicbox",colors:["#bae6fd","#a7f3d0"],parts:{A:{name:"放风筝",c:"C Am F G C Am Dm G",m:"1 3 5 3 | 6 5 3 1 | 4 6 1' 6 | 5 - 7, - | 1 3 5 1' | 6 5 6 3 | 2 4 6 4 | 5 - - -"},B:{name:"飞高高",c:"F G Em Am F G C C",m:"6 - 1' 6 | 5 - 7 5 | 3 5 3 1 | 6 - - - | 1' - 6 4 | 5 - 7 2' | 1' - 5 3 | 1 - - -"}},form:["A1","A2","B2","A2","B3","B3"]},
    {id:"moon-sea",title:"海边的月光",sub:"星光乐队原创 · 民谣",cat:"流行",bpm:76,key:"G",oct:3,style:"ballad",lead:"aguitar",lead2:"flute",colors:["#bfdbfe","#c4b5fd"],parts:{A:{name:"主歌",c:"G Em C D G Em C D",m:"5 - 3 5 | 6 - 5 3 | 4 - 3 1 | 2 - 3 5 | 5 - 3 5 | 6 - 1' 6 | 5 - 4 3 | 2 - - -"},B:{name:"副歌",c:"C D Bm Em C D G G",m:"1' - 5 3 | 2' - 6 5 | 7 - 5 7 | 6 - - - | 1' - 5 3 | 2' - 6 5 | 1' 7 5 3 | 1 - - -"}},form:["A1","A2","B2","A2","B3","B3"]},
    {id:"prelude-c",title:"C 大调前奏曲",sub:"巴赫 · 平均律钢琴曲集",cat:"古典",bpm:64,key:"C",style:"classical",styleOver:{keysPat:"block",counter:null,padMin:1},lead:"harp",colors:["#e0e7ff","#fde68a"],parts:{A:{name:"分解和弦",c:"C Dm7/C G7/B C Am/C D7/C G/B C",m:"1__ 3__ 5__ 1'__ 3'__ 5__ 1'__ 3'__ 1__ 3__ 5__ 1'__ 3'__ 5__ 1'__ 3'__ | 1__ 2__ 6__ 2'__ 4'__ 6__ 2'__ 4'__ 1__ 2__ 6__ 2'__ 4'__ 6__ 2'__ 4'__ | 7,__ 2__ 5__ 2'__ 4'__ 5__ 2'__ 4'__ 7,__ 2__ 5__ 2'__ 4'__ 5__ 2'__ 4'__ | 1__ 3__ 5__ 1'__ 3'__ 5__ 1'__ 3'__ 1__ 3__ 5__ 1'__ 3'__ 5__ 1'__ 3'__ | 1__ 3__ 6__ 3'__ 6'__ 6__ 3'__ 6'__ 1__ 3__ 6__ 3'__ 6'__ 6__ 3'__ 6'__ | 1__ 2__ #4__ 6__ 2'__ #4__ 6__ 2'__ 1__ 2__ #4__ 6__ 2'__ #4__ 6__ 2'__ | 7,__ 2__ 5__ 2'__ 5'__ 5__ 2'__ 5'__ 7,__ 2__ 5__ 2'__ 5'__ 5__ 2'__ 5'__ | 1__ 3__ 5__ 1'__ 3'__ 5__ 1'__ 3'__ 1__ 3__ 5__ 1'__ 3'__ 5__ 1'__ 3'__"}},form:["A1","A2","A2","A3"]},
    {id:"chang-an",title:"长安夜",sub:"星光乐队原创 · 国风",cat:"国风",bpm:84,key:"C",style:"chinese",lead:"guzheng",lead2:"erhu",colors:["#fecaca","#fde68a"],parts:{A:{name:"夜幕",c:"Am G F Em Am G F Am",m:"6, - 1 3 | 2 - 1 6, | 6, 1 3 5 | 3 - - - | 6, - 1 3 | 5 - 3 2 | 1 2 3 1 | 6, - - -"},B:{name:"灯火",c:"F G Am Em F G Am Am",m:"1' - 6 5 | 5 - 6 1' | 2' - 1' 6 | 5 - 3 - | 1' - 6 5 | 5 6 1' 2' | 3' - 2' 1' | 6 - - -"}},form:["A1","A2","B2","A2","B3"]},
    {id:"dawn-overture",title:"晨光序曲",sub:"星光乐队原创 · 圆舞曲",cat:"音乐会",bpm:132,ts:3,key:"G",style:"waltz",lead:"violin",lead2:"flute",colors:["#fef3c7","#bbf7d0"],parts:{A:{name:"序",c:"G D Em C G D C D",m:"3 5 1' | 7 - 5 | 6 - 3 | 5 4 3 | 3 5 1' | 2' - 7 | 1' 6 5 | 5 - -"},B:{name:"展开",c:"C G Am D C G D G",m:"5 1' 5 | 5 7 2' | 6 1' 6 | 5 7 5 | 5 1' 5 | 5 7 2' | 1' 7 5 | 1' - -"}},form:["A1","A2","B2","A2","B3","B3"]},
    {id:"choir-hymn",title:"致远方",sub:"星光乐队原创 · 合唱",cat:"音乐会",bpm:66,key:"F",style:"ballad",lead:"choir",lead2:"cello",colors:["#e9d5ff","#fbcfe8"],parts:{A:{name:"低吟",c:"F C Dm Bb F C Bb C",m:"3 - 5 - | 5 - 3 - | 1' - 6 - | 4 - 6 - | 5 - 3 - | 2 - 5 - | 4 - 6 5 | 5 - - -"},B:{name:"高歌",c:"Bb F C Dm Bb F C F",m:"1' - 6 - | 1' - 5 - | 5 - 7 - | 1' - 6 - | 1' - 6 - | 1' - 3' - | 2' - 7 5 | 1' - - -"}},form:["A1","A2","B2","A2","B3","B3"]},
  ];

  // 难度估算：音符密度
  BS.songDifficulty = function (compiled, trackIdx) {
    const tr = compiled.tracks[trackIdx || 0];
    if (!tr || !tr.notes.length) return 1;
    const sec = (tr.notes[tr.notes.length - 1].t - tr.notes[0].t) * 60 / compiled.bpm || 1;
    const nps = tr.notes.length / sec;
    return BS.clamp(Math.round(nps * 1.2), 1, 5);
  };
})();
