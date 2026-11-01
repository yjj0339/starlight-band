/* 星光乐队 · 乐理 / 简谱解析 / 自动编曲 */
(function () {
  const BS = window.BS;
  const T = (BS.Theory = {});

  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  T.pc = (name) => {
    const m = String(name).match(/^([A-Ga-g])([#b]?)/);
    if (!m) return 0;
    return (PC[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  };
  T.KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];

  const QUAL = {
    '': [0, 4, 7], M: [0, 4, 7], maj: [0, 4, 7], m: [0, 3, 7], min: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], M7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10], dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], '+': [0, 4, 8], sus4: [0, 5, 7], sus: [0, 5, 7], sus2: [0, 2, 7],
    '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '9': [0, 4, 7, 10, 14], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14],
    m7b5: [0, 3, 6, 10], '7sus4': [0, 5, 7, 10], '5': [0, 7], mM7: [0, 3, 7, 11],
  };
  const chordCache = {};
  T.chord = function (name) {
    if (chordCache[name]) return chordCache[name];
    const m = String(name).match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/);
    if (!m) return null;
    const root = T.pc(m[1]);
    const iv = QUAL[m[2]] || QUAL[m[2].replace('maj', 'M')] || [0, 4, 7];
    const c = { name, root, iv, bass: m[3] ? T.pc(m[3]) : root, minor: iv[1] === 3 };
    c.pcs = [...new Set(iv.map((x) => (x + root) % 12))];
    return (chordCache[name] = c);
  };
  T.chordNotes = (c, base) => c.iv.map((x) => base + x);

  // 靠近 center 的密集排列，兼顾声部进行
  T.voice = function (c, center, prev, max) {
    let pcs = c.iv.map((x) => (x + c.root) % 12);
    pcs = [...new Set(pcs)];
    if (pcs.length > (max || 4)) pcs = pcs.filter((p, i) => i !== 2).slice(0, max || 4);
    let best = null, bs = 1e9;
    for (let inv = 0; inv < pcs.length; inv++) {
      for (let o = -1; o <= 1; o++) {
        const notes = [];
        let n = center - 7 + ((pcs[inv] - (center - 7) + 120) % 12) + o * 12;
        notes.push(n);
        for (let k = 1; k < pcs.length; k++) {
          const p = pcs[(inv + k) % pcs.length];
          let x = notes[notes.length - 1] + 1;
          while ((x % 12 + 12) % 12 !== p) x++;
          notes.push(x);
        }
        const mean = notes.reduce((a, b) => a + b, 0) / notes.length;
        let s = Math.abs(mean - center) * 1.5;
        if (prev && prev.length) {
          const pm = prev.reduce((a, b) => a + b, 0) / prev.length;
          s = Math.abs(mean - pm) * 2 + Math.abs(mean - center) * 0.6;
          notes.forEach((n2) => { s += Math.min(...prev.map((q) => Math.abs(q - n2))) * 0.5; });
        }
        if (s < bs) { bs = s; best = notes; }
      }
    }
    return best;
  };
  T.bassNote = (c, lo) => { lo = lo || 28; return lo + ((c.bass - lo) % 12 + 12) % 12; };
  T.guitarVoicing = function (c) {
    const r = T.bassNote(c, 40);
    const out = [r];
    for (let x = r + 1; x <= 76 && out.length < 6; x++) {
      if (c.pcs.includes(x % 12) && x - out[out.length - 1] >= 3) out.push(x);
    }
    return out;
  };
  T.powerChord = (c) => { const r = T.bassNote(c, 40); return [r, r + 7, r + 12]; };

  // ---------- 简谱解析 ----------
  // 语法：1-7 音级，0 休止；' 高八度，, 低八度；_ 减半，. 附点，^ 三连音，- 延长一拍，~ 连音线；#/b 升降
  T.parseJianpu = function (str, keyPc, oct) {
    const notes = [];
    let t = 0, last = null, tie = false;
    const re = /([#b]?)([0-7])([',_^.~]*)|(-)/g;
    let m;
    while ((m = re.exec(str))) {
      if (m[4]) { if (last) last.d += 1; t += 1; continue; }
      const deg = parseInt(m[2]);
      const mods = m[3] || '';
      let d = 1;
      let o = 0;
      for (const ch of mods) {
        if (ch === "'") o++;
        else if (ch === ',') o--;
        else if (ch === '_') d /= 2;
        else if (ch === '^') d *= 2 / 3;
      }
      if (mods.includes('.')) d *= 1.5;
      const thisTie = mods.includes('~');
      if (deg === 0) { last = { rest: true, d }; t += d; tie = false; continue; }
      const acc = m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0;
      const midi = 12 * (oct + 1) + keyPc + MAJOR[deg - 1] + acc + 12 * o;
      if (tie && last && !last.rest && last.m === midi) { last.d += d; }
      else { last = { t, d, m: midi }; notes.push(last); }
      tie = thisTie;
      t += d;
    }
    notes.forEach((n) => { n.t = Math.round(n.t * 1000) / 1000; n.d = Math.round(n.d * 1000) / 1000; });
    return { notes, beats: t };
  };

  // 和弦串："C G Am F" 每个一小节；"C:2" 两拍；"%" 重复上一个；"N" 无和弦
  T.parseChords = function (str, bpb) {
    const ev = [];
    let t = 0;
    (str || '').split(/[\s|]+/).filter(Boolean).forEach((tok) => {
      let [name, beats] = tok.split(':');
      const d = beats ? parseFloat(beats) : bpb;
      if (name === '%' && ev.length) name = ev[ev.length - 1].name;
      if (name === 'N') { t += d; return; }
      const ch = T.chord(name);
      if (ch) ev.push({ t, d, name, ch });
      t += d;
    });
    return { events: ev, beats: t };
  };

  // ---------- 风格 ----------
  const STYLES = (T.STYLES = {
    pop: { name: '流行', keys: 'piano', keysPat: 'pop', bass: 'pop', drums: 'pop', guitar: 'aguitar', guitarPat: 'strum', pad: 'strings', padMin: 2, counter: 'violin' },
    ballad: { name: '抒情', keys: 'piano', keysPat: 'arp8', bass: 'long', drums: 'ballad', guitar: 'aguitar', guitarPat: 'pick', pad: 'strings', padMin: 2, counter: 'cello' },
    rock: { name: '摇滚', keys: 'organ', keysPat: 'block', bass: 'rock8', drums: 'rock', guitar: 'eguitar', guitarPat: 'power', pad: 'synthpad', padMin: 3, counter: 'synthlead', guitarMin: 1 },
    waltz: { name: '圆舞曲', keys: 'piano', keysPat: 'waltz', bass: 'waltz', drums: 'waltz', pad: 'strings', padMin: 1, counter: 'flute' },
    march: { name: '进行曲', keys: 'piano', keysPat: 'march', bass: 'march', drums: 'march', pad: 'strings', padMin: 2, counter: 'trumpet' },
    classical: { name: '古典', keys: 'piano', keysPat: 'alberti', bass: 'long', bassInst: 'cello', drums: null, pad: 'strings', padMin: 1, counter: 'flute', timp: true },
    nocturne: { name: '夜曲', keys: 'piano', keysPat: 'triplet', bass: 'long', bassInst: 'cello', drums: null, pad: 'strings', padMin: 2, counter: 'violin' },
    jazz: { name: '爵士', keys: 'epiano', keysPat: 'comp', bass: 'walk', drums: 'swing', pad: null, counter: 'sax' },
    chinese: { name: '国风', keys: 'guzheng', keysPat: 'gzarp', bass: 'long', bassInst: 'cello', drums: 'chinese', pad: 'strings', padMin: 2, counter: 'flute' },
    xmas: { name: '节日', keys: 'piano', keysPat: 'pop', bass: 'pop', drums: 'xmas', guitar: 'aguitar', guitarPat: 'strum', pad: 'strings', padMin: 2, counter: 'musicbox' },
    folk: { name: '民谣', keys: 'piano', keysPat: 'arp8', bass: 'pop', drums: 'folk', guitar: 'aguitar', guitarPat: 'strum', guitarMin: 1, pad: 'strings', padMin: 3, counter: 'flute' },
    epic: { name: '史诗', keys: 'piano', keysPat: 'arp8', bass: 'long', bassInst: 'cello', drums: 'epic', pad: 'strings', padMin: 1, counter: 'horn', timp: true },
    dance: { name: '电子舞曲', keys: 'epiano', keysPat: 'pop', bass: 'rock8', drums: 'dance', pad: 'synthpad', padMin: 2, counter: 'synthlead' },
    bossa: { name: '波萨诺瓦', keys: 'epiano', keysPat: 'comp', bass: 'pop', drums: 'bossa', guitar: 'nylon', guitarPat: 'pick', guitarMin: 1, pad: null, counter: 'flute' },
    ragtime: { name: '拉格泰姆', keys: 'piano', keysPat: 'march', bass: 'march', drums: null, pad: null, counter: 'clarinet' },
    lofi: { name: '慵懒', keys: 'epiano', keysPat: 'comp', bass: 'pop', drums: 'ballad', pad: 'synthpad', padMin: 3, counter: 'musicbox' },
    lullaby: { name: '摇篮', keys: 'musicbox', keysPat: 'arp8', bass: 'long', bassInst: 'cello', drums: null, pad: 'strings', padMin: 2, counter: 'flute' },
  });

  const ROLE_INFO = {
    lead: { name: '主旋律', vol: 0.9, pan: 0, send: 0.28 },
    counter: { name: '副旋律', vol: 0.55, pan: -0.3, send: 0.3 },
    keys: { name: '和声伴奏', vol: 0.62, pan: -0.15, send: 0.22 },
    guitar: { name: '吉他', vol: 0.55, pan: 0.32, send: 0.18 },
    bass: { name: '低音', vol: 0.8, pan: 0, send: 0.08 },
    drums: { name: '鼓组', vol: 0.75, pan: 0, send: 0.12 },
    pad: { name: '铺底弦乐', vol: 0.55, pan: 0.22, send: 0.4 },
    timp: { name: '定音鼓', vol: 0.6, pan: 0, send: 0.3 },
    choir: { name: '合唱团', vol: 0.62, pan: 0, send: 0.5 },
  };
  T.ROLE_INFO = ROLE_INFO;

  const VEL = [0.42, 0.56, 0.68, 0.8];
  const hum = (v) => BS.clamp(v + (Math.random() - 0.5) * 0.08, 0.05, 1);

  // ---------- 伴奏生成 ----------
  function segments(ev, bpb) {
    const out = [];
    for (let b = ev.t; b < ev.t + ev.d - 1e-6; b += bpb) out.push({ t: b, len: Math.min(bpb, ev.t + ev.d - b) });
    return out;
  }

  function genKeys(push, ev, next, L, st, bpb, state) {
    const c = ev.ch;
    const v = VEL[L];
    const pat = st.keysPat;
    segments(ev, bpb).forEach((seg, si) => {
      const P = (pos, d, notes, vel) => { if (pos < seg.len - 1e-6) notes.forEach((n, i) => push(seg.t + pos, Math.min(d, seg.len - pos), n, hum(vel))); };
      if (pat === 'pop' || pat === 'block') {
        const vo = (state.kv = T.voice(c, 62, state.kv));
        const lh = T.bassNote(c, 36);
        if (L <= 0) { P(0, seg.len, vo, v); }
        else if (L === 1) { P(0, 2, vo, v); P(2, 2, vo, v * 0.9); P(0, seg.len, [lh], v * 0.9); }
        else {
          [[0, 1.5], [1.5, 1], [2.5, 0.5], [3, 1]].forEach(([p, d], i) => P(p, d, vo, v * (i === 0 ? 1 : 0.85)));
          P(0, 2, [lh, lh + 12], v); P(2, 2, [lh + 7 < 48 ? lh + 7 : lh], v * 0.8);
          if (bpb === 3) P(2, 1, vo, v * 0.8);
        }
      } else if (pat === 'arp8' || pat === 'alberti') {
        const r = T.bassNote(c, pat === 'alberti' ? 41 : 36);
        const tones = [];
        for (let x = r; x <= r + 24 && tones.length < 6; x++) if (c.pcs.includes(x % 12)) tones.push(x);
        const idx = pat === 'alberti' ? [0, 2, 1, 2, 0, 2, 1, 2] : [0, 1, 2, 3, 4, 3, 2, 1];
        const step = 0.5;
        for (let p = 0, k = 0; p < seg.len - 1e-6; p += step, k++) {
          const n = tones[Math.min(idx[k % idx.length], tones.length - 1)];
          P(p, pat === 'alberti' ? 0.5 : 1.2, [n], v * (k % 2 ? 0.75 : 0.9));
        }
        if (L >= 2 && pat === 'arp8') P(0, seg.len, [r - 12 >= 28 ? r - 12 : r], v * 0.8);
      } else if (pat === 'triplet') {
        const vo = (state.kv = T.voice(c, 60, state.kv, 3));
        for (let p = 0, k = 0; p < seg.len - 1e-6; p += 1 / 3, k++) P(p, 0.4, [vo[k % 3]], v * (k % 3 === 0 ? 0.8 : 0.6));
        const b = T.bassNote(c, 31);
        P(0, seg.len, [b, b + 12], v * 0.85);
      } else if (pat === 'waltz') {
        const vo = (state.kv = T.voice(c, 62, state.kv, 3));
        const b = T.bassNote(c, 40);
        P(0, 1, [b], v);
        P(1, 0.8, vo, v * 0.7); P(2, 0.8, vo, v * 0.7);
      } else if (pat === 'march') {
        const vo = (state.kv = T.voice(c, 62, state.kv, 3));
        const b = T.bassNote(c, 40);
        for (let p = 0; p < seg.len - 1e-6; p += 1) {
          if (p % 2 === 0) P(p, 0.5, [p === 0 ? b : b + 7 > 51 ? b - 5 : b + 7], v);
          else P(p, 0.4, vo, v * 0.75);
        }
      } else if (pat === 'comp') {
        const vo = (state.kv = T.voice(c, 60, state.kv, 4));
        const rhythms = [[[0, 1.3]], [[0, 0.6], [1.667, 1]], [[0.667, 0.6], [2.667, 0.8]], [[0, 0.6], [2.667, 0.6]], [[1.667, 0.6], [3, 0.6]]];
        const rh = rhythms[(state.bar = (state.bar || 0) + 1) % rhythms.length];
        rh.forEach(([p, d]) => P(p, d, vo, v * 0.7));
      } else if (pat === 'gzarp') {
        const r = T.bassNote(c, 50);
        const tones = [];
        for (let x = r; x <= r + 26; x++) if (c.pcs.includes(x % 12) || state.penta.includes(x % 12) && (x % 12) === (c.root + 2) % 12) tones.push(x);
        const seq = tones.concat(tones.slice(1, -1).reverse());
        const step = L >= 2 ? 0.5 : 1;
        for (let p = 0, k = 0; p < seg.len - 1e-6; p += step, k++) P(p, 1.5, [seq[k % seq.length]], v * (k % 2 ? 0.7 : 0.85));
      }
    });
  }

  function genBass(push, ev, next, L, st, bpb, state) {
    if (L <= 0 && st.bass !== 'walk') return;
    const c = ev.ch;
    const lo = st.bassInst === 'cello' ? 36 : 28;
    const r = T.bassNote(c, lo);
    const fifth = r + 7 <= lo + 14 ? r + 7 : r - 5;
    const v = VEL[L] + 0.05;
    const pat = st.bass;
    segments(ev, bpb).forEach((seg, si) => {
      const P = (pos, d, n, vel) => { if (pos < seg.len - 1e-6) push(seg.t + pos, Math.min(d, seg.len - pos), n, hum(vel)); };
      const isLast = si === segments(ev, bpb).length - 1;
      if (pat === 'pop') {
        if (L === 1) { P(0, 2, r, v); P(2, 2, bpb === 3 ? r : fifth, v * 0.9); }
        else { P(0, 1.5, r, v); P(1.5, 0.5, r, v * 0.8); P(2, 1, bpb === 3 ? fifth : fifth, v * 0.9); P(3, 1, r + 12 <= lo + 16 ? r + 12 : r, v * 0.85); }
      } else if (pat === 'long') {
        if (L <= 1) P(0, seg.len, r, v);
        else { P(0, 2, r, v); P(2, 2, fifth, v * 0.9); if (bpb === 3) P(2, 1, fifth, v * 0.9); }
      } else if (pat === 'rock8') {
        const step = L >= 2 ? 0.5 : 1;
        for (let p = 0; p < seg.len - 1e-6; p += step) P(p, step * 0.9, r, v * (p % 1 ? 0.8 : 1));
      } else if (pat === 'waltz') {
        P(0, 1, r, v); if (L >= 2) P(2, 0.9, fifth, v * 0.6);
      } else if (pat === 'march') {
        for (let p = 0; p < seg.len - 1e-6; p += 2) P(p, 1, p === 0 ? r : fifth, v);
        if (bpb === 2) P(1, 0.9, fifth, v * 0.9);
      } else if (pat === 'walk') {
        const tones = [r, r + c.iv[1], r + 7, r + (c.iv[3] || 12) - 12 + 12];
        const nr = next ? T.bassNote(next.ch, lo) : r;
        for (let p = 0; p < seg.len - 1e-6; p += 1) {
          let n;
          if (p === 0) n = r;
          else if (p === seg.len - 1 && isLast) n = nr + (Math.random() < 0.5 ? 1 : -1);
          else n = tones[p % tones.length];
          P(p, 0.9, n, v * (p === 0 ? 1 : 0.85));
        }
      }
    });
  }

  function drumBar(push, t, len, L, kind, bpb, opts) {
    if (!kind || L <= 0 && kind !== 'swing') return;
    const H = (p, n, v) => { if (p < len - 1e-6) push(t + p, 0.1, n, hum(v)); };
    const fill = opts.fill && L >= 2;
    const lim = fill ? bpb - 1 : bpb;
    const in_ = (p) => p < lim;
    if (opts.crash && L >= 2) { H(0, 49, 0.85); }
    if (bpb === 3 || kind === 'waltz') {
      H(0, 36, 0.8);
      [1, 2].forEach((p) => in_(p) && H(p, L >= 2 ? 38 : 42, L >= 2 ? 0.35 : 0.45));
      if (L >= 2) for (let p = 0; p < 3; p++) in_(p) && H(p, 42, 0.4);
    } else if (kind === 'pop' || kind === 'xmas') {
      const hat = kind === 'xmas' ? 54 : 42;
      if (L === 1) { [0, 1, 2, 3].forEach((p) => in_(p) && H(p, hat, 0.45)); H(0, 36, 0.8); in_(2) && H(2, 36, 0.7); [1, 3].forEach((p) => in_(p) && H(p, kind === 'xmas' ? 38 : 37, 0.55)); }
      else {
        for (let p = 0; p < bpb; p += 0.5) in_(p) && H(p, hat, p % 1 ? 0.38 : 0.55);
        H(0, 36, 0.95); in_(2) && H(2, 36, 0.85); in_(2.5) && H(2.5, 36, 0.7);
        if (L >= 3) in_(1.5) && H(1.5, 36, 0.6);
        [1, 3].forEach((p) => in_(p) && H(p, 38, 0.85));
        if (L >= 3 && kind === 'pop') in_(3.5) && H(3.5, 46, 0.5);
      }
    } else if (kind === 'ballad') {
      for (let p = 0; p < bpb; p += 0.5) in_(p) && H(p, 42, p % 1 ? 0.25 : 0.35);
      H(0, 36, 0.75);
      if (L === 1) in_(2) && H(2, 37, 0.45);
      else { in_(2.5) && H(2.5, 36, 0.6); [1, 3].forEach((p) => in_(p) && H(p, 38, 0.7)); }
    } else if (kind === 'rock') {
      const hat = L >= 3 ? 51 : 42;
      for (let p = 0; p < bpb; p += 0.5) in_(p) && H(p, hat, 0.6);
      [0, 2, 2.5].forEach((p) => in_(p) && H(p, 36, 1));
      if (L >= 2) in_(0.5) && H(0.5, 36, 0.7);
      [1, 3].forEach((p) => in_(p) && H(p, 38, 0.95));
    } else if (kind === 'swing') {
      [0, 1, 1.667, 2, 3, 3.667].forEach((p) => in_(p) && H(p, 51, p % 1 ? 0.3 : 0.5));
      [1, 3].forEach((p) => in_(p) && H(p, 42, 0.35));
      H(0, 36, 0.3);
      if (L >= 3) in_(2.667) && H(2.667, 38, 0.3);
    } else if (kind === 'march') {
      [[0, 0.85], [1, 0.6], [1.5, 0.5], [2, 0.8], [3, 0.6], [3.25, 0.4], [3.5, 0.5], [3.75, 0.45]].forEach(([p, v]) => p < bpb && in_(p) && H(p, 38, v));
      H(0, 36, 0.9); in_(2) && H(2, 36, 0.8);
      if (bpb === 2) { H(1, 36, 0.7); }
      if (L >= 3) H(0, 49, 0.5);
    } else if (kind === 'chinese') {
      if (L === 1) { H(0, 43, 0.6); in_(2) && H(2, 37, 0.4); }
      else {
        [[0, 43, 0.75], [1.5, 47, 0.5], [2, 43, 0.65], [3, 50, 0.5], [3.5, 47, 0.45]].forEach(([p, n, v]) => p < bpb && in_(p) && H(p, n, v));
        for (let p = 0; p < bpb; p += 1) in_(p) && H(p, 37, 0.35);
        if (L >= 3) for (let p = 0; p < bpb; p += 0.5) in_(p) && H(p, 54, 0.3);
      }
    }
    if (bpb === 3) {
      /* 3/4 拍使用上面的圆舞曲鼓点 */
    } else if (kind === 'folk') {
      H(0, 36, 0.7); in_(2) && H(2, 36, 0.6);
      [1, 3].forEach((p) => in_(p) && H(p, 37, 0.5));
      if (L >= 2) for (let p = 0.5; p < bpb; p += 1) in_(p) && H(p, 54, 0.32);
    } else if (kind === 'epic') {
      if (L <= 1) { H(0, 43, 0.6); in_(2) && H(2, 43, 0.45); }
      else if (L === 2) { H(0, 36, 0.85); in_(2) && H(2, 36, 0.8); [1, 3].forEach((p) => in_(p) && H(p, 43, 0.75)); in_(1.5) && H(1.5, 47, 0.5); }
      else {
        H(0, 36, 0.95);
        for (let p = 0; p < bpb; p += 0.5) in_(p) && H(p, p % 1 ? 47 : 43, p % 1 ? 0.55 : 0.8);
        in_(2) && H(2, 38, 0.8);
      }
    } else if (kind === 'dance') {
      const four = L >= 2;
      for (let p = 0; p < bpb; p += 1) if (four || p % 2 === 0) in_(p) && H(p, 36, 0.95);
      if (L >= 2) for (let p = 0.5; p < bpb; p += 1) in_(p) && H(p, L >= 3 ? 46 : 42, 0.42);
      if (L >= 3) { [1, 3].forEach((p) => in_(p) && H(p, 39, 0.8)); for (let p = 0.25; p < bpb; p += 0.5) in_(p) && H(p, 42, 0.25); }
    } else if (kind === 'bossa') {
      for (let p = 0; p < bpb; p += 0.5) in_(p) && H(p, 42, p % 1 ? 0.2 : 0.3);
      H(0, 36, 0.55); in_(1.5) && H(1.5, 36, 0.45); in_(2) && H(2, 36, 0.5); in_(3.5) && H(3.5, 36, 0.4);
      const odd = Math.floor(t / bpb) % 2 === 0;
      (odd ? [0, 1.5, 3] : [1, 2]).forEach((p) => in_(p) && H(p, 37, 0.5));
    }
    if (fill) {
      const f = bpb - 1;
      [[0, 38, 0.7], [0.25, 50, 0.7], [0.5, 47, 0.75], [0.75, 43, 0.85]].forEach(([p, n, v]) => H(f + p, n, v));
      H(f, 36, 0.7);
    }
  }

  function genGuitar(push, ev, next, L, st, bpb, state) {
    if (L < (st.guitarMin || 2)) return;
    const c = ev.ch;
    const v = VEL[L];
    const pat = st.guitarPat;
    segments(ev, bpb).forEach((seg) => {
      const strum = (pos, d, up, vel) => {
        if (pos >= seg.len - 1e-6) return;
        const vo = T.guitarVoicing(c);
        const order = up ? vo.slice(2).reverse() : vo;
        order.forEach((n, i) => push(seg.t + pos + i * 0.022, Math.min(d, seg.len - pos), n, hum(vel * (up ? 0.65 : 1))));
      };
      if (pat === 'strum') {
        const pt = bpb === 3 ? [[0, 1, 0], [1, 0.5, 0], [1.5, 0.5, 1], [2, 1, 0]] : [[0, 1, 0], [1, 0.5, 0], [1.5, 1, 1], [2.5, 0.5, 1], [3, 0.5, 0], [3.5, 0.5, 1]];
        pt.forEach(([p, d, u]) => strum(p, d + 0.2, u, v * 0.75));
      } else if (pat === 'pick') {
        const vo = T.guitarVoicing(c);
        const idx = [0, 2, 3, 4, 5, 4, 3, 2];
        for (let p = 0, k = 0; p < seg.len - 1e-6; p += 0.5, k++) push(seg.t + p, 1.2, vo[Math.min(idx[k % 8], vo.length - 1)], hum(v * 0.7));
      } else if (pat === 'power') {
        const pc = T.powerChord(c);
        if (L >= 3) { [[0, 1.5], [1.5, 0.5], [2, 2]].forEach(([p, d]) => p < seg.len && pc.forEach((n) => push(seg.t + p, Math.min(d, seg.len - p), n, hum(v)))); }
        else for (let p = 0; p < seg.len - 1e-6; p += 0.5) pc.slice(0, 2).forEach((n) => push(seg.t + p, 0.3, n, hum(v * 0.75)));
      }
    });
  }

  function genPad(push, ev, L, st, state) {
    if (!st.pad || L < (st.padMin || 2)) return;
    const vo = (state.pv = T.voice(ev.ch, 62, state.pv, 3));
    const notes = L >= 3 ? vo.concat([vo[vo.length - 1] + 5 > vo[0] + 12 ? vo[0] + 12 : vo[0] + 12]) : vo;
    [...new Set(notes)].forEach((n) => push(ev.t, ev.d, n, hum(VEL[L] * 0.7)));
  }

  // blocks: [{t, len, events, level, fillEnd, crash}]
  T.accompany = function (tracks, blocks, st, bpb, opts) {
    opts = opts || {};
    const get = (role, inst) => {
      if (!tracks[role]) {
        const info = ROLE_INFO[role];
        tracks[role] = { id: role, role, name: info.name, inst, notes: [], vol: info.vol, pan: info.pan, send: info.send };
      }
      return tracks[role];
    };
    const pusher = (tr) => (t, d, m, v) => tr.notes.push({ t: Math.round(t * 1000) / 1000, d, m, v });
    const state = { penta: [0, 2, 4, 7, 9].map((x) => (x + (opts.keyPc || 0)) % 12) };
    const keysT = get('keys', st.keys);
    const bassT = get('bass', st.bassInst || 'bass');
    const drumT = st.drums ? get('drums', 'drums') : null;
    const gtrT = st.guitar ? get('guitar', st.guitar) : null;
    const padT = st.pad ? get('pad', st.pad) : null;
    const timpT = st.timp ? get('timp', 'timpani') : null;
    const choirT = opts.choir ? get('choir', 'choir') : null;
    blocks.forEach((b) => {
      const evs = b.events;
      evs.forEach((ev, i) => {
        const next = evs[i + 1] || null;
        genKeys(pusher(keysT), ev, next, b.level, st, bpb, state);
        genBass(pusher(bassT), ev, next, b.level, st, bpb, state);
        if (gtrT) genGuitar(pusher(gtrT), ev, next, b.level, st, bpb, state);
        if (padT) genPad(pusher(padT), ev, b.level, st, state);
        if (choirT && b.level >= 1) { const cv = (state.cv = T.voice(ev.ch, 64, state.cv, 4)); cv.forEach((n) => pusher(choirT)(ev.t, ev.d, n, hum(VEL[b.level] * 0.8))); }
        if (timpT && b.level >= 3) segments(ev, bpb).forEach((s) => pusher(timpT)(s.t, 1, T.bassNote(ev.ch, 40), 0.7));
      });
      if (st.keysPat === 'gzarp' && b.level >= 2 && b.crash) {
        // 古筝刮奏
        const top = 86;
        const notes = [];
        for (let x = top; notes.length < 14; x--) if (state.penta.includes(x % 12)) notes.push(x);
        notes.forEach((n, i) => pusher(keysT)(b.t - 0.5 + i * (0.5 / 14), 1.2, n, 0.55));
      }
      if (drumT) {
        const nb = Math.round(b.len / bpb);
        for (let k = 0; k < nb; k++) {
          drumBar(pusher(drumT), b.t + k * bpb, bpb, b.level, st.drums, bpb, {
            crash: k === 0 && b.crash, fill: k === nb - 1 && nb >= 4 && b.fillEnd,
          });
        }
      }
    });
  };

  function finalize(tracks, order) {
    const list = order.map((r) => tracks[r]).filter((t) => t && t.notes.length);
    list.forEach((tr) => {
      tr.notes = tr.notes.filter((n) => n.d > 0.01).sort((a, b) => a.t - b.t || a.m - b.m);
      tr.color = (BS.INST[tr.inst] || {}).color || '#fff';
    });
    return list;
  }
  T.ROLE_ORDER = ['lead', 'counter', 'keys', 'guitar', 'bass', 'drums', 'pad', 'choir', 'timp'];

  // ---------- 主编曲 ----------
  T.arrange = function (song, opts) {
    opts = opts || {};
    const bpb = song.ts || 4;
    const st = Object.assign({}, STYLES[song.style] || STYLES.pop, song.styleOver || {});
    const keyPc = T.pc(song.key || 'C');
    const oct = song.oct != null ? song.oct : 4;
    const tracks = {};
    const lead = (tracks.lead = { id: 'lead', role: 'lead', name: ROLE_INFO.lead.name, inst: song.lead || 'piano', notes: [], vol: 0.9, pan: 0, send: 0.28 });
    const parts = {};
    for (const k in song.parts) {
      const p = song.parts[k];
      const mel = T.parseJianpu(p.m || '', keyPc, p.oct != null ? p.oct : oct);
      const ch = T.parseChords(p.c, bpb);
      parts[k] = { mel, ch, len: ch.beats, pk: p.pk || 0, name: p.name };
    }
    const sections = [], blocks = [], chords = [];
    let t = 0;
    const addBlock = (events, level, len, name, extra) => {
      const shifted = events.map((e) => ({ t: e.t + t, d: e.d, name: e.name, ch: e.ch }));
      blocks.push(Object.assign({ t, len, events: shifted, level, fillEnd: true, crash: true }, extra));
      sections.push({ name, t, end: t + len, level });
      shifted.forEach((e) => chords.push(e));
    };
    // 形如 'C3+2'：该段整体升高 2 个半音（最后一遍副歌转调）
    const form = song.form.map((f) => { const m = String(f).match(/^(.)(\d)?([+-]\d+)?$/); return { key: m ? m[1] : f[0], level: m && m[2] ? parseInt(m[2]) : 2, shift: m && m[3] ? parseInt(m[3]) : 0 }; });
    // 前奏
    if (song.intro !== false) {
      let ev;
      if (song.intro) ev = T.parseChords(song.intro, bpb);
      else {
        const p = parts[form[0].key];
        const startBar = Math.max(0, p.len - 4 * bpb);
        const evs = p.ch.events.filter((e) => e.t >= startBar).map((e) => ({ t: e.t - startBar, d: e.d, name: e.name, ch: e.ch }));
        ev = { events: evs, beats: p.len - startBar };
      }
      const lv = song.introLevel != null ? song.introLevel : Math.max(1, Math.min(2, form[0].level));
      addBlock(ev.events, lv, ev.beats, '前奏', { crash: false, fillEnd: true });
      if (song.introMel) {
        T.parseJianpu(song.introMel, keyPc, oct).notes.forEach((n) => lead.notes.push({ t: t + n.t, d: n.d, m: n.m, v: 0.7 }));
      }
      t += ev.beats;
    }
    const counterInst = song.lead2 || st.counter;
    form.forEach((f, i) => {
      const p = parts[f.key];
      if (!p) return;
      const sh0 = f.shift || 0;
      const evs = sh0 ? p.ch.events.map((e) => { const nm = T.transposeChord(e.name, sh0); return { t: e.t, d: e.d, name: nm, ch: T.chord(nm) || e.ch }; }) : p.ch.events;
      addBlock(evs, f.level, p.len, (p.name || f.key + ' 段') + (sh0 ? ' · 转调' : ''), { crash: i > 0 || song.intro !== false });
      const mv = 0.62 + f.level * 0.06;
      p.mel.notes.forEach((n) => lead.notes.push({ t: t + n.t - p.pk, d: n.d, m: n.m + sh0, v: hum(mv) }));
      if (f.level >= 3 && counterInst && counterInst !== lead.inst) {
        if (!tracks.counter) tracks.counter = { id: 'counter', role: 'counter', name: ROLE_INFO.counter.name, inst: counterInst, notes: [], vol: 0.5, pan: -0.3, send: 0.3 };
        const avg = p.mel.notes.reduce((a, n) => a + n.m, 0) / Math.max(1, p.mel.notes.length);
        const sh = avg < 66 ? 12 : -12;
        p.mel.notes.forEach((n) => tracks.counter.notes.push({ t: t + n.t - p.pk, d: n.d, m: n.m + sh + sh0, v: hum(0.55) }));
      }
      t += p.len;
    });
    // 尾声：最后一个和弦延长
    let lastCh = chords[chords.length - 1];
    if (song.endChord) { const en = T.transposeChord(song.endChord, form[form.length - 1].shift || 0); lastCh = { name: en, ch: T.chord(en) }; }
    if (lastCh && song.ending !== false) {
      blocks.push({ t, len: bpb, events: [{ t, d: bpb, name: lastCh.name, ch: lastCh.ch }], level: Math.max(2, form[form.length - 1].level), crash: true, fillEnd: false, ending: true });
      sections.push({ name: '尾声', t, end: t + bpb, level: 3 });
      chords.push({ t, d: bpb, name: lastCh.name, ch: lastCh.ch });
      t += bpb;
    }
    T.accompany(tracks, blocks.filter((b) => !b.ending), st, bpb, { keyPc, choir: !!(opts.choir || song.choir) });
    // 尾声和弦：全体齐奏长音
    const end = blocks.find((b) => b.ending);
    if (end) endingHit(tracks, end, st, bpb);
    const list = finalize(tracks, T.ROLE_ORDER);
    return compile(song, list, sections, chords, t, bpb, keyPc);
  };

  function endingHit(tracks, b, st, bpb) {
    const c = b.events[0].ch;
    const t = b.t, d = bpb + 1;
    const add = (role, notes, v) => tracks[role] && notes.forEach((n) => tracks[role].notes.push({ t, d, m: n, v }));
    add('keys', T.voice(c, 62, null, 4).concat([T.bassNote(c, 36)]), 0.75);
    add('bass', [T.bassNote(c, st.bassInst === 'cello' ? 36 : 28)], 0.8);
    add('pad', T.voice(c, 66, null, 4), 0.6);
    add('guitar', T.guitarVoicing(c), 0.7);
    add('timp', [T.bassNote(c, 40)], 0.8);
    add('choir', T.voice(c, 64, null, 4), 0.7);
    if (tracks.drums) { tracks.drums.notes.push({ t, d: 0.1, m: 49, v: 0.95 }, { t, d: 0.1, m: 36, v: 0.95 }); }
  }

  function compile(song, tracks, sections, chords, end, bpb, keyPc) {
    let minT = 0;
    tracks.forEach((tr) => tr.notes.length && (minT = Math.min(minT, tr.notes[0].t)));
    return {
      id: song.id, title: song.title, sub: song.sub || '', bpm: song.bpm, bpb, keyPc,
      tracks, sections, chords: chords.map((c) => ({ t: c.t, d: c.d, name: c.name })),
      startBeat: minT, lengthBeats: end + 2,
    };
  }
  T.compile = compile;

  // 由和弦序列生成乐队伴奏（音频导入 / 即兴循环）
  T.arrangeChords = function (opts) {
    const bpb = opts.bpb || 4;
    const st = Object.assign({}, STYLES[opts.style] || STYLES.pop);
    const tracks = {};
    const blocks = [];
    const evs = opts.events;
    const phrase = (opts.phraseBars || 8) * bpb;
    const total = opts.length || (evs.length ? evs[evs.length - 1].t + evs[evs.length - 1].d : 0);
    for (let t = 0, k = 0; t < total - 1e-6; t += phrase, k++) {
      const be = evs.filter((e) => e.t >= t && e.t < t + phrase).map((e) => ({ t: e.t, d: Math.min(e.d, t + phrase - e.t), name: e.name, ch: e.ch || T.chord(e.name) }));
      const level = typeof opts.level === 'function' ? opts.level(k) : opts.level || 2;
      blocks.push({ t, len: Math.min(phrase, total - t), events: be, level, crash: k > 0, fillEnd: true });
    }
    T.accompany(tracks, blocks, st, bpb, { keyPc: opts.keyPc || 0, choir: !!opts.choir });
    return finalize(tracks, T.ROLE_ORDER);
  };

  // 即兴伴奏循环
  T.PROGRESSIONS = [
    { name: '万能进行 I-V-vi-IV', c: 'C G Am F' },
    { name: '卡农进行', c: 'C G Am Em F C F G' },
    { name: '小调抒情 vi-IV-I-V', c: 'Am F C G' },
    { name: '王道进行 IV-V-iii-vi', c: 'F G Em Am' },
    { name: '爵士 ii-V-I', c: 'Dm7 G7 Cmaj7 Cmaj7' },
    { name: '12 小节布鲁斯', c: 'C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7' },
    { name: '50 年代 I-vi-IV-V', c: 'C Am F G' },
    { name: '国风 五声', c: 'C Am Dm G Em Am F G' },
  ];
  T.transposeChord = function (name, semis) {
    const m = name.match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/);
    if (!m) return name;
    const tr = (n) => T.KEYS[(T.pc(n) + semis + 120) % 12];
    return tr(m[1]) + m[2] + (m[3] ? '/' + tr(m[3]) : '');
  };
  T.makeLoop = function (opts) {
    const bpb = opts.style === 'waltz' ? 3 : 4;
    const keyPc = opts.keyPc || 0;
    const names = opts.prog.split(/\s+/).filter(Boolean).map((n) => T.transposeChord(n, keyPc));
    const reps = opts.reps || 24;
    const events = [];
    let t = 0;
    for (let r = 0; r < reps; r++) names.forEach((n) => { events.push({ t, d: bpb, name: n, ch: T.chord(n) }); t += bpb; });
    const tracks = T.arrangeChords({ events, bpb, style: opts.style, keyPc, phraseBars: names.length, level: (k) => (k === 0 ? 1 : k % 4 === 3 ? 3 : 2), length: t });
    return compile({ id: 'jam', title: '即兴伴奏', bpm: opts.bpm }, tracks, [{ name: '循环', t: 0, end: t, level: 2 }], events, t, bpb, keyPc);
  };
})();
