/* 星光乐队 · 音频引擎：合成器 + 采样 + 混响 + 录音 */
(function () {
  const BS = window.BS;
  const A = (BS.Audio = {});
  A.quality = BS.store.get('quality', 'sample');
  A.samples = {};
  A.sampleStatus = {};
  A.ksCache = new Map();

  const NB = 'https://nbrosowsky.github.io/tonejs-instruments/samples/';
  const SAMPLE_SETS = {
    piano: {
      base: 'https://tonejs.github.io/audio/salamander/',
      notes: ['A0', 'C1', 'D#1', 'F#1', 'A1', 'C2', 'D#2', 'F#2', 'A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4', 'F#4', 'A4', 'C5', 'D#5', 'F#5', 'A5', 'C6', 'D#6', 'F#6', 'A6', 'C7', 'D#7', 'F#7', 'A7', 'C8'],
      gain: 1.25, maxDist: 4, release: 0.35, percussive: true, bright: true,
    },
    violin: { base: NB + 'violin/', notes: ["A3","A4","A5","A6","C4","C5","C6","C7","E4","E5","E6","G3","G4","G5","G6"], gain: 0.9, maxDist: 4, release: 0.3, attack: 0.05 },
    cello: { base: NB + 'cello/', notes: ["A2","A3","A4","A#2","A#3","B2","B3","B4","C2","C3","C4","C5","C#3","C#4","D2","D3","D4","D#2","D#3","D#4","E2","E3","E4","F2","F3","F4","F#3","F#4","G2","G3","G4","G#2","G#3","G#4"], gain: 1.0, maxDist: 3, release: 0.3, attack: 0.05 },
    contrabass: { base: NB + 'contrabass/', notes: ["A2","A#1","B3","C2","C#3","D2","E2","E3","F#1","F#2","G1","G#2","G#3"], gain: 1.1, maxDist: 4, release: 0.3, attack: 0.05 },
    flute: { base: NB + 'flute/', notes: ["A4","A5","A6","C4","C5","C6","C7","E4","E5","E6"], gain: 1.0, maxDist: 4, release: 0.15, attack: 0.03 },
    clarinet: { base: NB + 'clarinet/', notes: ["A#3","A#4","A#5","D3","D4","D5","D6","F3","F4","F5","F#6"], gain: 1.0, maxDist: 4, release: 0.15, attack: 0.03 },
    sax: { base: NB + 'saxophone/', notes: ["A4","A5","A#3","A#4","B3","B4","C4","C5","C#3","C#4","C#5","D3","D4","D5","D#3","D#4","D#5","E3","E4","E5","F3","F4","F5","F#3","F#4","F#5","G3","G4","G5","G#3","G#4","G#5"], gain: 0.9, maxDist: 2, release: 0.15, attack: 0.02 },
    trumpet: { base: NB + 'trumpet/', notes: ["A3","A5","A#4","C4","C6","D5","D#4","F3","F4","F5","G4"], gain: 0.9, maxDist: 3, release: 0.15, attack: 0.02 },
    trombone: { base: NB + 'trombone/', notes: ["A#1","A#2","A#3","C3","C4","C#2","C#4","D3","D4","D#2","D#3","D#4","F2","F3","F4","G#2","G#3"], gain: 0.95, maxDist: 3, release: 0.15, attack: 0.03 },
    horn: { base: NB + 'french-horn/', notes: ["A1","A3","C2","C4","D3","D5","D#2","F3","F5","G2"], gain: 1.0, maxDist: 4, release: 0.25, attack: 0.05 },
    aguitar: { base: NB + 'guitar-acoustic/', notes: ["A2","A3","A4","A#2","A#3","A#4","B2","B3","B4","C3","C4","C5","C#3","C#4","C#5","D2","D3","D4","D5","D#2","D#3","D#4","E2","E3","E4","F2","F3","F4","F#2","F#3","F#4","G2","G3","G4","G#2","G#3","G#4"], gain: 1.1, maxDist: 2, release: 0.25, percussive: true, bright: true },
    nylon: { base: NB + 'guitar-nylon/', notes: ["A2","A3","A4","A5","A#5","B1","B2","B3","B4","C#3","C#4","C#5","D2","D3","D5","D#4","E2","E3","E4","E5","F#2","F#3","F#4","F#5","G3","G5","G#2","G#4","G#5"], gain: 1.15, maxDist: 3, release: 0.3, percussive: true, bright: true },
    eguitar: { base: NB + 'guitar-electric/', notes: ["A2","A3","A4","A5","C3","C4","C5","C6","C#2","D#3","D#4","D#5","E2","F#2","F#3","F#4","F#5"], gain: 1.0, maxDist: 3, release: 0.2, percussive: true },
    bass: { base: NB + 'bass-electric/', notes: ["A#1","A#2","A#3","A#4","C#1","C#2","C#3","C#4","C#5","E1","E2","E3","E4","G1","G2","G3","G4"], gain: 1.3, maxDist: 3, release: 0.15, percussive: true },
    harp: { base: NB + 'harp/', notes: ["A2","A4","A6","B1","B3","B5","B6","C3","C5","D2","D4","D6","D7","E1","E3","E5","F2","F4","F6","F7","G1","G3","G5"], gain: 1.1, maxDist: 3, release: 0.4, percussive: true, bright: true },
    organ: { base: NB + 'organ/', notes: ["A1","A2","A3","A4","A5","C1","C2","C3","C4","C5","C6","D#1","D#2","D#3","D#4","D#5","F#1","F#2","F#3","F#4","F#5"], gain: 0.8, maxDist: 2, release: 0.12, attack: 0.01 },
  };
  // 弦乐团：用真实小提琴 / 大提琴采样叠成合奏
  SAMPLE_SETS.strings = { ensemble: true, gain: 0.85, release: 0.45, attack: 0.16 };
  const DRUM_BASE = 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/';
  const DRUM_FILES = { 36: 'kick', 38: 'snare', 42: 'hihat', 50: 'tom1', 47: 'tom2', 43: 'tom3' };

  // ---------- 乐器表 ----------
  BS.INST = {
    piano: { name: '三角钢琴', icon: '🎹', cat: '键盘', view: 'keys', color: '#8fd3ff', sample: 'piano', gain: 1 },
    epiano: { name: '电钢琴', icon: '🎹', cat: '键盘', view: 'keys', color: '#a78bfa', gain: 0.9 },
    organ: { name: '管风琴', icon: '⛪', cat: '键盘', view: 'keys', color: '#fbbf24', sample: 'organ', gain: 0.55 },
    musicbox: { name: '八音盒', icon: '🎁', cat: '键盘', view: 'keys', color: '#f9a8d4', gain: 0.8 },
    marimba: { name: '马林巴', icon: '🪵', cat: '打击', view: 'keys', color: '#d6a46b', gain: 1 },
    strings: { name: '弦乐团', icon: '🎻', cat: '管弦', view: 'keys', color: '#fda4af', sample: 'strings', gain: 0.55 },
    violin: { name: '小提琴', icon: '🎻', cat: '管弦', view: 'ribbon', color: '#fb7185', sample: 'violin', gain: 0.75 },
    cello: { name: '大提琴', icon: '🎻', cat: '管弦', view: 'ribbon', color: '#c084fc', sample: 'cello', gain: 0.8 },
    contrabass: { name: '低音提琴', icon: '🎻', cat: '管弦', view: 'ribbon', color: '#a78bfa', sample: 'contrabass', synth: 'cello', gain: 0.9 },
    harp: { name: '竖琴', icon: '🪕', cat: '管弦', view: 'harp', color: '#fde68a', sample: 'harp', gain: 0.9 },
    flute: { name: '长笛', icon: '🌬️', cat: '管乐', view: 'keys', color: '#99f6e4', sample: 'flute', gain: 0.7 },
    clarinet: { name: '单簧管', icon: '🎼', cat: '管乐', view: 'keys', color: '#67e8f9', sample: 'clarinet', synth: 'flute', gain: 0.65 },
    sax: { name: '萨克斯', icon: '🎷', cat: '管乐', view: 'keys', color: '#fcd34d', sample: 'sax', gain: 0.6 },
    trumpet: { name: '小号', icon: '🎺', cat: '管乐', view: 'keys', color: '#fb923c', sample: 'trumpet', gain: 0.55 },
    horn: { name: '圆号', icon: '📯', cat: '管乐', view: 'keys', color: '#f59e0b', sample: 'horn', synth: 'trumpet', gain: 0.6 },
    trombone: { name: '长号', icon: '🎺', cat: '管乐', view: 'keys', color: '#f97316', sample: 'trombone', synth: 'trumpet', gain: 0.6 },
    aguitar: { name: '木吉他', icon: '🎸', cat: '吉他', view: 'guitar', color: '#f59e0b', sample: 'aguitar', gain: 0.8 },
    nylon: { name: '古典吉他', icon: '🎸', cat: '吉他', view: 'guitar', color: '#d97706', sample: 'nylon', synth: 'aguitar', gain: 0.85 },
    eguitar: { name: '电吉他', icon: '🎸', cat: '吉他', view: 'guitar', color: '#ef4444', sample: 'eguitar', gain: 0.55 },
    bass: { name: '电贝斯', icon: '🎸', cat: '吉他', view: 'bass', color: '#60a5fa', sample: 'bass', gain: 1 },
    drums: { name: '架子鼓', icon: '🥁', cat: '打击', view: 'drums', color: '#f472b6', gain: 1 },
    timpani: { name: '定音鼓', icon: '🪘', cat: '打击', view: 'keys', color: '#a3a3a3', gain: 0.9 },
    synthlead: { name: '合成主音', icon: '🎛️', cat: '电子', view: 'keys', color: '#22d3ee', gain: 0.4 },
    synthpad: { name: '合成氛围', icon: '🌌', cat: '电子', view: 'keys', color: '#818cf8', gain: 0.35 },
    choir: { name: '合唱团', icon: '🎤', cat: '人声', view: 'keys', color: '#e9d5ff', gain: 0.6 },
    guzheng: { name: '古筝', icon: '🏮', cat: '民乐', view: 'harp', color: '#f87171', gain: 0.85 },
    erhu: { name: '二胡', icon: '🎐', cat: '民乐', view: 'ribbon', color: '#fca5a5', gain: 0.6 },
  };
  BS.INST_ORDER = Object.keys(BS.INST);

  BS.DRUMS = [
    { n: 49, name: '吊镲', key: 'q' }, { n: 51, name: '叮叮镲', key: 'w' }, { n: 42, name: '闭镲', key: 'e' }, { n: 46, name: '开镲', key: 'r' },
    { n: 50, name: '高音嗵', key: 'a' }, { n: 47, name: '中音嗵', key: 's' }, { n: 43, name: '落地嗵', key: 'd' }, { n: 38, name: '军鼓', key: 'f' },
    { n: 36, name: '底鼓', key: ' ' }, { n: 39, name: '拍手', key: 'g' }, { n: 37, name: '边击', key: 'h' }, { n: 54, name: '铃鼓', key: 'j' },
  ];
  const DRUM_ALIAS = { 35: 36, 40: 38, 44: 42, 57: 49, 52: 49, 55: 49, 59: 51, 53: 51, 45: 47, 48: 50, 41: 43, 56: 54, 69: 54, 70: 54, 82: 54, 75: 37, 76: 37, 77: 37, 60: 50, 61: 47, 62: 37, 63: 50, 64: 43, 65: 50, 66: 47, 81: 54, 80: 54, 58: 39 };
  BS.drumNorm = (n) => (BS.DRUMS.some((d) => d.n === n) ? n : DRUM_ALIAS[n] || (n < 36 ? 36 : n < 45 ? 38 : 42));

  // ---------- 初始化 ----------
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended' && !A.offline) A.ctx.resume(); return A.ctx; }
    const ctx = (A.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }));
    A.master = ctx.createGain();
    A.master.gain.value = BS.store.get('masterVol', 0.85);
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // iOS 静音键下也能出声
    const bus = A.buildBus(ctx);
    A.glue = bus.glue; A.comp = bus.limiter;
    A.analyser = ctx.createAnalyser();
    A.analyser.fftSize = 2048; A.analyser.smoothingTimeConstant = 0.78;
    A.reverbIn = ctx.createGain();
    A.reverb = ctx.createConvolver();
    A.reverb.buffer = makeIR(ctx, 2.6);
    A.reverbOut = ctx.createGain();
    A.reverbOut.gain.value = BS.store.get('reverb', 0.8);
    A.reverbIn.connect(A.reverb); A.reverb.connect(A.reverbOut); A.reverbOut.connect(A.master);
    A.master.connect(A.glue); A.comp.connect(A.analyser); A.analyser.connect(ctx.destination);
    try { A.recDest = ctx.createMediaStreamDestination(); A.comp.connect(A.recDest); } catch (e) {}
    const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = n;
    A.fx = ctx.createGain(); A.fx.connect(A.master); // 点击声直出
    A.hhOpen = null;
    if (A.quality === 'sample') { A.loadSamples('piano'); A.loadDrumKit(); }
    return ctx;
  };

  A.now = () => (A.ctx ? A.ctx.currentTime : 0);
  A.setMaster = (v) => { BS.store.set('masterVol', v); if (A.master) A.master.gain.setTargetAtTime(v, A.ctx.currentTime, 0.03); };
  A.setReverb = (v) => { BS.store.set('reverb', v); if (A.reverbOut) A.reverbOut.gain.setTargetAtTime(v, A.ctx.currentTime, 0.03); };
  A.setQuality = (q) => { A.quality = q; BS.store.set('quality', q); };

  // 母线：轻柔的“胶水”压缩把乐队粘在一起，再用限幅器防止爆音（不压扁动态）
  A.buildBus = function (ctx) {
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20; glue.knee.value = 14; glue.ratio.value = 2.2; glue.attack.value = 0.025; glue.release.value = 0.28;
    const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 9000; air.gain.value = 1.5;
    const warm = ctx.createBiquadFilter(); warm.type = 'lowshelf'; warm.frequency.value = 110; warm.gain.value = 1.2;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
    const trim = ctx.createGain(); trim.gain.value = 0.89; // 留 1dB 余量，MP3 编码后也不会削波
    glue.connect(warm); warm.connect(air); air.connect(limiter); limiter.connect(trim);
    return { glue, limiter: trim };
  };

  // 音乐厅混响：立体声去相关、预延迟、早期反射，尾音随时间越来越暗（模拟空气吸收）
  function makeIR(ctx, sec) {
    const sr = ctx.sampleRate, len = Math.floor(sr * sec), pre = Math.floor(sr * 0.016);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / (len - pre);
        const a = 0.92 - 0.8 * t;
        lp += a * (Math.random() * 2 - 1 - lp);
        const env = Math.exp(-6.2 * t) * (i < pre + sr * 0.02 ? (i - pre) / (sr * 0.02) : 1);
        d[i] = lp * env * 0.55;
      }
      for (let k = 0; k < 22; k++) {
        const pos = pre + Math.floor(sr * (0.004 + Math.random() * 0.075));
        if (pos < len) d[pos] += (Math.random() * 2 - 1) * (0.7 - k * 0.025);
      }
    }
    return buf;
  }

  // ---------- 声道（每个音轨一个） ----------
  A.channel = function (vol, pan, send) {
    const ctx = A.init();
    const input = ctx.createGain();
    const p = ctx.createStereoPanner();
    const s = ctx.createGain();
    input.gain.value = vol == null ? 0.8 : vol;
    p.pan.value = pan || 0;
    s.gain.value = send == null ? 0.22 : send;
    input.connect(p); p.connect(A.master); p.connect(s); s.connect(A.reverbIn);
    return {
      input,
      setVol(v) { input.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
      setPan(v) { p.pan.setTargetAtTime(v, ctx.currentTime, 0.02); },
      setSend(v) { s.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
      destroy() { try { input.disconnect(); p.disconnect(); s.disconnect(); } catch (e) {} },
    };
  };

  // ---------- 采样加载 ----------
  const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function parseNote(s) {
    const m = s.match(/^([A-G])(#|b)?(-?\d)$/);
    return 12 * (parseInt(m[3]) + 1) + NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  A.loadSamples = function (inst) {
    const def = BS.INST[inst];
    if (def && def.sample === 'strings') { A.loadSamples('violin'); A.loadSamples('cello'); return; }
    const key = def && def.sample;
    if (!key || A.quality !== 'sample' || A.sampleStatus[key]) return;
    const set = SAMPLE_SETS[key];
    const ctx = A.init();
    A.sampleStatus[key] = 'loading';
    BS.bus.emit('samples', key, 'loading');
    const list = (A.samples[key] = []);
    let done = 0;
    set.notes.forEach((nn) => {
      const url = set.base + nn.replace('#', 's') + '.mp3';
      fetch(url, { mode: 'cors' })
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then((buf) => { list.push({ m: parseNote(nn), buf }); list.sort((a, b) => a.m - b.m); })
        .catch(() => {})
        .finally(() => {
          done++;
          if (done === set.notes.length) {
            A.sampleStatus[key] = list.length ? 'ready' : 'failed';
            BS.bus.emit('samples', key, A.sampleStatus[key]);
          }
        });
    });
  };
  A.drumSamples = {};
  A.loadDrumKit = function () {
    if (A.drumStatus || A.quality !== 'sample') return;
    const ctx = A.init();
    A.drumStatus = 'loading';
    BS.bus.emit('samples', 'drums', 'loading');
    const keys = Object.keys(DRUM_FILES);
    let done = 0;
    keys.forEach((n) => {
      fetch(DRUM_BASE + DRUM_FILES[n] + '.mp3', { mode: 'cors' })
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then((buf) => { A.drumSamples[n] = buf; })
        .catch(() => {})
        .finally(() => { if (++done === keys.length) { A.drumStatus = 'ready'; BS.bus.emit('samples', 'drums', 'ready'); } });
    });
  };
  const setsFor = (inst) => {
    const def = BS.INST[inst];
    if (!def || !def.sample) return [];
    return def.sample === 'strings' ? ['violin', 'cello'] : [def.sample];
  };
  // 导出前确保用到的乐器都已换成真实采样（最多等 timeout 毫秒）
  A.ensureSamples = function (insts, timeout) {
    if (A.quality !== 'sample') return Promise.resolve();
    A.init();
    const keys = new Set();
    insts.forEach((i) => { if (i === 'drums') A.loadDrumKit(); else { A.loadSamples(i); setsFor(i).forEach((k) => keys.add(k)); } });
    const t0 = Date.now();
    return new Promise((res) => {
      const check = () => {
        const busy = [...keys].some((k) => A.sampleStatus[k] === 'loading') || A.drumStatus === 'loading';
        if (!busy || Date.now() - t0 > (timeout || 15000)) res(); else setTimeout(check, 120);
      };
      check();
    });
  };
  A.sampleProgress = function () {
    const keys = Object.keys(A.sampleStatus);
    return { loading: keys.filter((k) => A.sampleStatus[k] === 'loading').length, total: keys.length };
  };

  // ---------- 发声单元 ----------
  class Voice {
    constructor(ctx, dest, m, t) {
      this.ctx = ctx; this.m = m; this.f = BS.mtof(m); this.t = t;
      this.vca = ctx.createGain(); this.vca.connect(dest);
      this.out = ctx.createGain(); this.out.gain.value = 0; this.out.connect(this.vca);
      this.oscs = []; this.srcs = []; this.sources = [];
      this.release = 0.2; this.maxLen = 8; this.stopped = false;
    }
    osc(type, freq, dest, t) {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.value = freq; o.connect(dest); o.start(t || this.t);
      this.oscs.push({ node: o, f: freq }); this.sources.push(o);
      return o;
    }
    lfo(rate, depth, target, delay) {
      const ctx = this.ctx;
      const o = ctx.createOscillator(); o.frequency.value = rate;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, this.t);
      g.gain.linearRampToValueAtTime(depth, this.t + (delay || 0.01));
      o.connect(g);
      [].concat(target).forEach((p) => g.connect(p));
      o.start(this.t); this.sources.push(o);
      return g;
    }
    buf(buffer, rate, dest, t) {
      const s = this.ctx.createBufferSource();
      s.buffer = buffer; s.playbackRate.value = rate; s.connect(dest); s.start(t || this.t);
      this.srcs.push({ node: s, r: rate }); this.sources.push(s);
      return s;
    }
    noise(dest, t, dur, gain) {
      const ctx = this.ctx;
      const s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(g); g.connect(dest);
      s.start(t, Math.random()); s.stop(t + dur + 0.05);
      return s;
    }
    filter(type, freq, q, dest) {
      const f = this.ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; if (q != null) f.Q.value = q;
      if (dest) f.connect(dest);
      return f;
    }
    arm() {
      const end = this.t + this.maxLen;
      this.sources.forEach((s) => { try { s.stop(end); } catch (e) {} });
      const first = this.sources[0];
      if (first) first.onended = () => { try { this.vca.disconnect(); } catch (e) {} };
    }
    stop(t, rel) {
      if (this.stopped) return;
      this.stopped = true;
      t = Math.max(t || 0, this.ctx.currentTime);
      rel = rel == null ? this.release : rel;
      const g = this.vca.gain;
      g.setValueAtTime(this.lvl, t);
      g.setTargetAtTime(0, t, rel / 3);
      const end = Math.min(t + rel * 2 + 0.05, this.t + this.maxLen);
      this.sources.forEach((s) => { try { s.stop(end); } catch (e) {} });
    }
    bend(m, t) {
      t = Math.max(t || 0, this.ctx.currentTime);
      const r = Math.pow(2, (m - this.m) / 12);
      this.oscs.forEach((o) => o.node.frequency.setTargetAtTime(o.f * r, t, 0.012));
      this.srcs.forEach((s) => s.node.playbackRate.setTargetAtTime(s.r * r, t, 0.012));
    }
    level(v, t) { // 表现力（弓压/气息）
      t = Math.max(t || 0, this.ctx.currentTime);
      this.vca.gain.setTargetAtTime(v * this.lvl, t, 0.05);
    }
  }

  // ---------- Karplus-Strong 拨弦 ----------
  function ksBuffer(ctx, key, freq, dur, bright) {
    const ck = key + ':' + freq.toFixed(2);
    if (A.ksCache.has(ck)) return A.ksCache.get(ck);
    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / freq + 0.5));
    const actual = sr / (N - 0.5);
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    let prev = 0, max = 0, mean = 0;
    for (let i = 0; i < N; i++) { prev += bright * (Math.random() * 2 - 1 - prev); ring[i] = prev; mean += prev; }
    mean /= N;
    for (let i = 0; i < N; i++) { ring[i] -= mean; max = Math.max(max, Math.abs(ring[i])); }
    for (let i = 0; i < N; i++) ring[i] /= max || 1;
    const decay = Math.pow(0.001, 1 / (actual * dur));
    for (let i = 0; i < len; i++) {
      const idx = i % N;
      const cur = ring[idx];
      d[i] = cur;
      ring[idx] = decay * 0.5 * (cur + ring[(idx + 1) % N]);
    }
    const res = { buf, rate: freq / actual };
    A.ksCache.set(ck, res);
    if (A.ksCache.size > 600) A.ksCache.delete(A.ksCache.keys().next().value);
    return res;
  }

  function ks(v, t, vel, key, dur, bright, dest) {
    const r = ksBuffer(v.ctx, key, v.f, dur, bright);
    v.buf(r.buf, r.rate, dest, t);
    v.maxLen = dur;
  }

  // ---------- 合成器 ----------
  const SYN = {};
  SYN.piano = (v, t, vel) => {
    const ctx = v.ctx, f = v.f;
    const lp = v.filter('lowpass', Math.min(16000, f * (3 + vel * 10)), 0.5, v.out);
    lp.frequency.setTargetAtTime(Math.max(f * 1.5, 400), t + 0.05, 1.2);
    const dec = BS.clamp(5 * Math.pow(261 / f, 0.6), 0.6, 9);
    const amps = [1, 0.55, 0.3, 0.22, 0.12, 0.08, 0.05];
    amps.forEach((a, i) => {
      const n = i + 1;
      if (f * n > 18000) return;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.003);
      g.gain.setTargetAtTime(0, t + 0.003, dec / Math.pow(n, 0.8) / 3);
      g.connect(lp);
      v.osc('sine', f * n * Math.sqrt(1 + 0.0004 * n * n), g, t);
    });
    v.noise(v.filter('bandpass', Math.min(f * 3, 6000), 1, v.out), t, 0.04, 0.25 * vel);
    v.out.gain.setValueAtTime(0.22 * (0.25 + vel * 0.9), t);
    v.release = 0.25; v.maxLen = dec * 2;
  };
  SYN.epiano = (v, t, vel) => {
    const ctx = v.ctx, f = v.f;
    const car = v.osc('sine', f, v.out, t);
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * (0.6 + vel * 2.2), t);
    mg.gain.setTargetAtTime(f * 0.15, t, 0.35);
    v.osc('sine', f, mg, t); mg.connect(car.frequency);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(f * 0.9 * vel, t); tg.gain.setTargetAtTime(0, t, 0.03);
    v.osc('sine', f * 14, tg, t); tg.connect(car.frequency);
    const dec = BS.clamp(2.2 * Math.pow(261 / f, 0.5), 0.6, 5);
    v.out.gain.setValueAtTime(0, t);
    v.out.gain.linearRampToValueAtTime(0.3 * (0.3 + vel), t + 0.004);
    v.out.gain.setTargetAtTime(0, t + 0.004, dec);
    v.lfo(4.5, 0.06, v.vca.gain, 0.3);
    v.release = 0.3; v.maxLen = dec * 4;
  };
  SYN.organ = (v, t, vel) => {
    const f = v.f;
    [[0.5, 0.5], [1, 1], [2, 0.6], [3, 0.4], [4, 0.3], [6, 0.12], [8, 0.1]].forEach(([r, a]) => {
      const g = v.ctx.createGain(); g.gain.value = a; g.connect(v.out); v.osc('sine', f * r, g, t);
    });
    v.out.gain.setValueAtTime(0, t);
    v.out.gain.linearRampToValueAtTime(0.13 * (0.6 + vel * 0.5), t + 0.012);
    v.lfo(6.2, 0.05, v.out.gain, 0.2);
    v.release = 0.08; v.maxLen = 30;
  };
  SYN.musicbox = (v, t, vel) => {
    const f = v.f * 2;
    [[1, 1, 0.9], [3, 0.25, 0.15], [5.4, 0.12, 0.05], [8.9, 0.05, 0.02]].forEach(([r, a, d]) => {
      if (f * r > 18000) return;
      const g = v.ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, d);
      g.connect(v.out); v.osc('sine', f * r, g, t);
    });
    v.out.gain.setValueAtTime(0.35 * (0.3 + vel), t);
    v.release = 0.6; v.maxLen = 4;
  };
  SYN.marimba = (v, t, vel) => {
    const f = v.f;
    const dec = 0.35 * Math.pow(261 / f, 0.3);
    [[1, 1, dec], [4, 0.28, 0.05], [9.9, 0.1, 0.012]].forEach(([r, a, d]) => {
      if (f * r > 18000) return;
      const g = v.ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, d);
      g.connect(v.out); v.osc('sine', f * r, g, t);
    });
    v.out.gain.setValueAtTime(0.5 * (0.3 + vel), t);
    v.release = 0.4; v.maxLen = dec * 6;
  };
  SYN.timpani = (v, t, vel) => {
    const f = v.f;
    const o = v.osc('sine', f, v.out, t);
    o.frequency.setValueAtTime(f * 1.04, t); o.frequency.setTargetAtTime(f, t, 0.05);
    const g = v.ctx.createGain(); g.gain.value = 0.35; g.connect(v.out);
    v.osc('sine', f * 1.5, g, t);
    v.noise(v.filter('lowpass', 400, 1, v.out), t, 0.15, 0.8 * vel);
    v.out.gain.setValueAtTime(0, t);
    v.out.gain.linearRampToValueAtTime(0.6 * (0.3 + vel), t + 0.005);
    v.out.gain.setTargetAtTime(0, t + 0.005, 0.7);
    v.release = 0.6; v.maxLen = 4;
  };
  function bowed(v, t, vel, o) {
    const f = v.f;
    const lp = v.filter('lowpass', o.lp + vel * 1500, 0.6, v.out);
    let chain = lp;
    if (o.peak) { const pk = v.filter('peaking', o.peak, 1, lp); pk.gain.value = 6; chain = pk; }
    const hp = v.filter('highpass', o.hp || 120, 0.7, chain);
    const oscs = o.detune.map((c) => v.osc('sawtooth', f * Math.pow(2, c / 1200), hp, t));
    if (o.scoop) oscs.forEach((x) => { x.frequency.setValueAtTime(x.frequency.value * o.scoop, t); x.frequency.setTargetAtTime(x.frequency.value, t, 0.03); });
    v.lfo(o.vibRate, f * o.vibDepth, oscs.map((x) => x.frequency), o.vibDelay);
    v.out.gain.setValueAtTime(0, t);
    v.out.gain.linearRampToValueAtTime(o.level * (0.35 + vel * 0.75), t + o.attack);
    v.release = o.release; v.maxLen = 30;
  }
  SYN.strings = (v, t, vel) => bowed(v, t, vel, { detune: [-9, 0, 8], lp: 1800, vibRate: 5.2, vibDepth: 0.004, vibDelay: 0.4, attack: 0.22, release: 0.45, level: 0.09 });
  SYN.violin = (v, t, vel) => bowed(v, t, vel, { detune: [0, 4], lp: 3800, peak: 2800, hp: 250, vibRate: 5.8, vibDepth: 0.006, vibDelay: 0.35, attack: 0.07, release: 0.25, level: 0.12 });
  SYN.cello = (v, t, vel) => bowed(v, t, vel, { detune: [0, 3], lp: 1600, peak: 700, hp: 50, vibRate: 5.2, vibDepth: 0.005, vibDelay: 0.35, attack: 0.09, release: 0.3, level: 0.16 });
  SYN.erhu = (v, t, vel) => bowed(v, t, vel, { detune: [0], lp: 3200, peak: 1100, hp: 300, vibRate: 6.2, vibDepth: 0.012, vibDelay: 0.15, attack: 0.07, release: 0.2, level: 0.2, scoop: 0.97 });
  // 合唱：5 个略微失谐的声部（像一排歌手）→ “啊”元音的 4 个共振峰 + 胸腔共鸣 + 气声，慢起音、自然颤音
  SYN.choir = (v, t, vel) => {
    const f = v.f;
    const sum = v.ctx.createGain(); sum.connect(v.out);
    const mix = v.ctx.createGain();
    const forms = f > 330 ? [[850, 6, 1], [1250, 7, 0.55], [2850, 9, 0.28], [3500, 11, 0.14]] : [[650, 5, 1], [1080, 6, 0.6], [2650, 8, 0.26], [3300, 10, 0.12]];
    forms.forEach(([fr, q, g]) => { const b = v.filter('bandpass', fr, q); const gg = v.ctx.createGain(); gg.gain.value = g * 3.4; mix.connect(b); b.connect(gg); gg.connect(sum); });
    const chest = v.filter('lowpass', Math.min(1400, f * 3), 0.6); const cg = v.ctx.createGain(); cg.gain.value = 0.35; mix.connect(chest); chest.connect(cg); cg.connect(sum);
    const oscs = [-15, -6, 0, 7, 14].map((c) => v.osc(c === 0 ? 'triangle' : 'sawtooth', f * Math.pow(2, c / 1200), mix, t));
    v.lfo(5.2, f * 0.0055, oscs.map((x) => x.frequency), 0.55);
    const br = v.ctx.createBufferSource(); br.buffer = A.noiseBuf; br.loop = true;
    const bp = v.filter('bandpass', 2600, 1.2); const bg = v.ctx.createGain(); bg.gain.value = 0.025 * (0.5 + vel);
    br.connect(bp); bp.connect(bg); bg.connect(sum); br.start(t, Math.random()); v.sources.push(br);
    v.out.gain.setValueAtTime(0, t);
    v.out.gain.linearRampToValueAtTime(0.11 * (0.4 + vel), t + 0.38);
    v.release = 0.75; v.maxLen = 30;
  };
  SYN.flute = (v, t, vel) => {
    const f = v.f;
    const o1 = v.osc('sine', f, v.out, t);
    const g2 = v.ctx.createGain(); g2.gain.value = 0.18; g2.connect(v.out);
    const o2 = v.osc('sine', f * 2, g2, t);
    const g3 = v.ctx.createGain(); g3.gain.value = 0.05; g3.connect(v.out);
    const o3 = v.osc('sine', f * 3, g3, t);
    const br = v.ctx.createBufferSource(); br.buffer = A.noiseBuf; br.loop = true;
    const bp = v.filter('bandpass', f * 2, 2); const bg = v.ctx.createGain(); bg.gain.value = 0.08;
    br.connect(bp); bp.connect(bg); bg.connect(v.out); br.start(t, Math.random()); v.sources.push(br);
    v.lfo(5, f * 0.004, [o1.frequency, o2.frequency, o3.frequency], 0.35);
    v.out.gain.setValueAtTime(0, t);
    v.out.gain.linearRampToValueAtTime(0.28 * (0.4 + vel * 0.7), t + 0.06);
    v.release = 0.12; v.maxLen = 30;
  };
  function brassy(v, t, vel, o) {
    const f = v.f;
    const lp = v.filter('lowpass', f, o.q, v.out);
    lp.frequency.setValueAtTime(f * 1.2, t);
    lp.frequency.linearRampToValueAtTime(Math.min(16000, f * o.peak + vel * 2000), t + o.attack + 0.03);
    lp.frequency.setTargetAtTime(Math.min(12000, f * o.sus), t + o.attack + 0.03, 0.2);
    const oscs = o.waves.map(([w, r, a]) => { const g = v.ctx.createGain(); g.gain.value = a; g.connect(lp); return v.osc(w, f * r, g, t); });
    if (o.scoop) oscs.forEach((x) => { const fv = x.frequency.value; x.frequency.setValueAtTime(fv * o.scoop, t); x.frequency.setTargetAtTime(fv, t, 0.025); });
    v.lfo(5.5, f * 0.005, oscs.map((x) => x.frequency), 0.4);
    v.out.gain.setValueAtTime(0, t);
    v.out.gain.linearRampToValueAtTime(o.level * (0.35 + vel * 0.7), t + o.attack);
    v.release = o.release; v.maxLen = 30;
  }
  SYN.trumpet = (v, t, vel) => brassy(v, t, vel, { waves: [['sawtooth', 1, 1], ['sawtooth', 1.003, 0.7]], q: 1.5, peak: 9, sus: 5, attack: 0.03, release: 0.1, level: 0.11, scoop: 0.98 });
  SYN.sax = (v, t, vel) => brassy(v, t, vel, { waves: [['sawtooth', 1, 1], ['square', 1.002, 0.5]], q: 2.5, peak: 6, sus: 4, attack: 0.035, release: 0.12, level: 0.11 });
  SYN.synthlead = (v, t, vel) => brassy(v, t, vel, { waves: [['sawtooth', 1, 1], ['sawtooth', 1.007, 0.8], ['square', 0.5, 0.45]], q: 6, peak: 10, sus: 5, attack: 0.006, release: 0.15, level: 0.09 });
  SYN.synthpad = (v, t, vel) => {
    const f = v.f;
    const lp = v.filter('lowpass', 1100, 2, v.out);
    v.lfo(0.25, 500, lp.frequency, 1);
    [-14, -5, 4, 13].forEach((c) => v.osc('sawtooth', f * Math.pow(2, c / 1200), lp, t));
    v.osc('triangle', f / 2, lp, t);
    v.out.gain.setValueAtTime(0, t);
    v.out.gain.linearRampToValueAtTime(0.07 * (0.4 + vel), t + 0.7);
    v.release = 1.6; v.maxLen = 30;
  };
  SYN.aguitar = (v, t, vel) => {
    const dur = BS.clamp(4.5 * Math.pow(110 / v.f, 0.3), 1.5, 5);
    const pk = v.filter('peaking', 110, 1, v.out); pk.gain.value = 5;
    const pk2 = v.filter('peaking', 2500, 1, pk); pk2.gain.value = 3;
    ks(v, t, vel, 'ag', dur, 0.35 + vel * 0.3, pk2);
    v.out.gain.setValueAtTime(0.38 * (0.3 + vel), t);
    v.release = 0.25;
  };
  SYN.eguitar = (v, t, vel) => {
    const ws = v.ctx.createWaveShaper(); ws.curve = DIST_CURVE; ws.oversample = '2x';
    const pre = v.ctx.createGain(); pre.gain.value = 3;
    const lp = v.filter('lowpass', 3800, 0.8, v.out);
    pre.connect(ws); ws.connect(lp);
    ks(v, t, vel, 'eg', 3, 0.6, pre);
    v.out.gain.setValueAtTime(0.11 * (0.4 + vel), t);
    v.release = 0.15;
  };
  SYN.bass = (v, t, vel) => {
    const lp = v.filter('lowpass', 900 + vel * 1200, 1, v.out);
    ks(v, t, vel, 'bs', 2.5, 0.25, lp);
    const g = v.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.6, t + 0.006); g.gain.setTargetAtTime(0, t + 0.006, 0.6);
    g.connect(v.out); v.osc('sine', v.f, g, t);
    v.out.gain.setValueAtTime(0.55 * (0.4 + vel), t);
    v.release = 0.1;
  };
  SYN.guzheng = (v, t, vel) => {
    const dur = BS.clamp(5 * Math.pow(220 / v.f, 0.4), 1.5, 6);
    const pk = v.filter('peaking', 1800, 1.2, v.out); pk.gain.value = 5;
    ks(v, t, vel, 'gz', dur, 0.75, pk);
    const s = v.srcs[0];
    v.lfo(5.5, s.r * 0.006, s.node.playbackRate, 0.45);
    v.out.gain.setValueAtTime(0.42 * (0.3 + vel), t);
    v.release = 0.5;
  };
  SYN.harp = (v, t, vel) => {
    const lp = v.filter('lowpass', 3500, 0.7, v.out);
    ks(v, t, vel, 'hp', 4, 0.3, lp);
    v.out.gain.setValueAtTime(0.45 * (0.3 + vel), t);
    v.release = 0.8;
  };

  const DIST_CURVE = (() => {
    const n = 2048, c = new Float32Array(n), k = 28;
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    return c;
  })();

  const nearest = (list, m) => { let best = null, bd = 99; for (const s of list) { const d = Math.abs(s.m - m); if (d < bd) { bd = d; best = s; } } return [best, bd]; };
  function sampleVoice(v, t, vel, key) {
    const set = SAMPLE_SETS[key];
    if (set.ensemble) return ensembleVoice(v, t, vel, set);
    const list = A.samples[key];
    if (!list || !list.length) return false;
    const [best, bd] = nearest(list, v.m);
    if (!best || bd > set.maxDist) return false;
    const rate = Math.pow(2, (v.m - best.m) / 12);
    let dest = v.out;
    // 力度越大越亮：弹得轻时声音更柔和，像真乐器
    if (set.percussive || set.bright) dest = v.filter('lowpass', 1600 + vel * vel * 17000, 0.5, v.out);
    v.buf(best.buf, rate, dest, t);
    const g = set.gain * (0.12 + Math.pow(vel, 1.4) * 0.9);
    if (set.attack) { v.out.gain.setValueAtTime(0, t); v.out.gain.linearRampToValueAtTime(g, t + set.attack); }
    else v.out.gain.setValueAtTime(g, t);
    v.release = set.release;
    v.maxLen = best.buf.duration / rate;
    return true;
  }
  // 弦乐团：同一个音用两份真实采样、轻微失谐 + 错开几毫秒，听起来像一排琴手
  function ensembleVoice(v, t, vel, set) {
    const key = v.m >= 55 ? 'violin' : 'cello';
    const list = A.samples[key];
    if (!list || !list.length) return false;
    const [best, bd] = nearest(list, v.m);
    if (!best || bd > 4) return false;
    const rate = Math.pow(2, (v.m - best.m) / 12);
    const lp = v.filter('lowpass', 2600 + vel * 5000, 0.5, v.out);
    [[-7, 0, 0.62], [6, 0.018, 0.55], [0, 0.009, 0.45]].forEach(([cents, delay, amp]) => {
      const g = v.ctx.createGain(); g.gain.value = amp; g.connect(lp);
      v.buf(best.buf, rate * Math.pow(2, cents / 1200), g, t + delay);
    });
    const g = set.gain * (0.2 + Math.pow(vel, 1.2) * 0.8);
    v.out.gain.setValueAtTime(0, t); v.out.gain.linearRampToValueAtTime(g, t + set.attack);
    v.release = set.release;
    v.maxLen = best.buf.duration / rate;
    return true;
  }

  // 主入口：发一个音，返回可 stop/bend 的 voice
  A.voice = function (inst, m, vel, t, dest) {
    const ctx = A.init();
    t = Math.max(t || 0, ctx.currentTime);
    dest = dest || A.master;
    if (inst === 'drums') { A.drum(m, vel, t, dest); return null; }
    const def = BS.INST[inst] || BS.INST.piano;
    const v = new Voice(ctx, dest, m, t);
    v.lvl = def.gain;
    v.vca.gain.value = def.gain;
    let ok = false;
    if (A.quality === 'sample' && def.sample) {
      ok = sampleVoice(v, t, vel, def.sample);
      if (!ok && !A.sampleStatus[def.sample]) A.loadSamples(inst);
    }
    if (!ok) (SYN[inst] || SYN[def.synth] || SYN.piano)(v, t, vel);
    v.arm();
    return v;
  };

  // ---------- 鼓组合成 ----------
  A.drum = function (n, vel, t, dest) {
    const ctx = A.init();
    t = Math.max(t || 0, ctx.currentTime);
    dest = dest || A.master;
    n = BS.drumNorm(n);
    if (A.drumSamples[n] && A.quality === 'sample') {
      const s = ctx.createBufferSource();
      s.buffer = A.drumSamples[n];
      s.playbackRate.value = 1 + (Math.random() - 0.5) * 0.02;
      const sg = ctx.createGain(); sg.gain.value = (n === 42 ? 0.55 : 1.0) * (0.15 + Math.pow(vel, 1.3) * 0.95);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000 + vel * 15000;
      s.connect(f); f.connect(sg); sg.connect(dest);
      s.start(t);
      if (n === 42 && A.hhOpen) { try { A.hhOpen.gain.cancelScheduledValues(t); A.hhOpen.gain.setTargetAtTime(0, t, 0.01); } catch (e) {} A.hhOpen = null; }
      return;
    }
    const g = ctx.createGain(); g.gain.value = 0.9 * (0.25 + vel * 0.85); g.connect(dest);
    const noise = (filterType, freq, q, gain, dur, start) => {
      const s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const e = ctx.createGain();
      const st = start || t;
      e.gain.setValueAtTime(gain, st); e.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      s.connect(f); f.connect(e); e.connect(g);
      s.start(st, Math.random() * 1.5); s.stop(st + dur + 0.05);
      return e;
    };
    const tone = (type, f0, f1, sweep, gain, dur) => {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
      const e = ctx.createGain();
      e.gain.setValueAtTime(gain, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + dur + 0.05);
    };
    const metal = (freqs, hp, gain, dur) => {
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      const e = ctx.createGain();
      e.gain.setValueAtTime(gain, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      f.connect(e); e.connect(g);
      freqs.forEach((fr) => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = fr; o.connect(f); o.start(t); o.stop(t + dur + 0.05); });
      return e;
    };
    const MET = [205.3, 304.4, 369.6, 522.7, 540, 800];
    switch (n) {
      case 36: tone('sine', 160, 42, 0.12, 1.6, 0.45); noise('highpass', 3000, 0.7, 0.25, 0.012); break;
      case 38: tone('triangle', 220, 160, 0.05, 0.6, 0.12); noise('highpass', 1400, 0.8, 0.9, 0.2); noise('bandpass', 4000, 1, 0.3, 0.1); break;
      case 37: tone('square', 900, 700, 0.01, 0.15, 0.04); noise('bandpass', 2500, 4, 0.5, 0.03); break;
      case 39: [0, 0.011, 0.022, 0.035].forEach((d, i) => noise('bandpass', 1300, 1.2, i === 3 ? 1.2 : 0.7, i === 3 ? 0.18 : 0.012, t + d)); break;
      case 42: if (A.hhOpen) { try { A.hhOpen.gain.cancelScheduledValues(t); A.hhOpen.gain.setTargetAtTime(0, t, 0.01); } catch (e) {} A.hhOpen = null; }
        metal(MET.map((x) => x * 2), 7000, 0.18, 0.05); noise('highpass', 8000, 0.7, 0.35, 0.045); break;
      case 46: A.hhOpen = metal(MET.map((x) => x * 2), 7000, 0.16, 0.4); noise('highpass', 8000, 0.7, 0.3, 0.4); break;
      case 49: metal(MET.map((x) => x * 1.7), 5000, 0.12, 1.6); noise('highpass', 5000, 0.5, 0.45, 1.8); noise('bandpass', 9000, 1, 0.3, 1.2); break;
      case 51: metal(MET.map((x) => x * 3.1), 6000, 0.1, 0.8); tone('sine', 3200, 3150, 0.5, 0.05, 0.6); noise('highpass', 9000, 0.5, 0.1, 0.5); break;
      case 54: [0, 0.008].forEach((d) => noise('highpass', 9000, 1, 0.5, 0.12, t + d)); metal([5100, 6300, 7900], 6000, 0.05, 0.1); break;
      case 50: case 47: case 43: {
        const f = n === 50 ? 220 : n === 47 ? 165 : 110;
        tone('sine', f * 1.6, f, 0.08, 1.0, 0.5); noise('lowpass', 1500, 1, 0.25, 0.08); break;
      }
      default: noise('bandpass', 2000, 1, 0.5, 0.1);
    }
  };

  // 节拍器
  A.click = function (t, accent) {
    const ctx = A.init();
    const o = ctx.createOscillator(); o.frequency.value = accent ? 1760 : 1180;
    const e = ctx.createGain();
    e.gain.setValueAtTime(accent ? 0.35 : 0.22, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(e); e.connect(A.fx); o.start(t); o.stop(t + 0.08);
  };

  // 离线渲染整首歌（全乐队，无掌声欢呼）→ AudioBuffer。
  // 整首歌切成若干段，每段一个 OfflineAudioContext 并行渲染（各自带 3.5 秒预热），再交叉淡化拼接。
  const PERCUSSIVE = new Set(['piano', 'epiano', 'musicbox', 'marimba', 'timpani', 'aguitar', 'eguitar', 'bass', 'harp', 'guzheng', 'drums']);
  A.renderSong = function (song, opts) {
    if (A.rendering) return Promise.reject(new Error('正在渲染上一首，请稍候'));
    A.rendering = true;
    return renderChunked(song, opts || {}).finally(() => { A.rendering = false; });
  };

  function renderWindow(song, tOf, spb, sr, w0, lenSamples) {
    const off = new OfflineAudioContext(2, lenSamples, sr);
    const w1 = w0 + lenSamples / sr;
    const saved = { ctx: A.ctx, master: A.master, reverbIn: A.reverbIn, reverbOut: A.reverbOut, fx: A.fx, hhOpen: A.hhOpen, offline: A.offline };
    let rendering;
    try {
      A.ctx = off; A.offline = true; A.hhOpen = null;
      A.master = off.createGain();
      A.master.gain.value = BS.store.get('masterVol', 0.85);
      const bus = A.buildBus(off);
      A.master.connect(bus.glue); bus.limiter.connect(off.destination);
      A.reverbIn = off.createGain();
      const conv = off.createConvolver();
      conv.buffer = makeIR(off, 2.0);
      A.reverbOut = off.createGain();
      A.reverbOut.gain.value = BS.store.get('reverb', 0.8);
      A.reverbIn.connect(conv); conv.connect(A.reverbOut); A.reverbOut.connect(A.master);
      A.fx = off.createGain(); A.fx.connect(A.master);

      const anySolo = song.tracks.some((t) => t.solo);
      song.tracks.forEach((tr) => {
        if (tr.mute || (anySolo && !tr.solo)) return;
        const ch = A.channel(tr.vol, tr.pan || 0, tr.send);
        if (tr.inst === 'audio') {
          if (!tr.audio) return;
          const t0 = tOf(tr.audioStart || 0);
          if (t0 >= w1) return;
          const src = off.createBufferSource();
          src.buffer = tr.audio;
          src.connect(ch.input);
          if (t0 >= w0) src.start(t0 - w0); else if (w0 - t0 < tr.audio.duration) src.start(0, w0 - t0);
          return;
        }
        const perc = PERCUSSIVE.has(tr.inst);
        tr.notes.forEach((n) => {
          const when = tOf(n.t);
          const end = when + Math.max(0.05, n.d * spb);
          if (when >= w1 || end + 3 < w0) return;
          let start = when;
          if (when < w0) { if (perc) return; start = w0; }
          const vel = n.v || 0.7;
          if (tr.inst === 'drums') { A.drum(n.m, vel, start - w0, ch.input); return; }
          const v = A.voice(tr.inst, n.m, vel, start - w0, ch.input);
          if (v) v.stop(end - w0);
        });
      });
      rendering = off.startRendering();
    } finally {
      Object.assign(A, saved);
    }
    return rendering;
  }

  async function renderChunked(song, opts) {
    A.init();
    const sr = opts.sr || 44100;
    const spb = 60 / song.bpm;
    const origin = Math.min(0, song.startBeat || 0);
    const tOf = (b) => (b - origin) * spb;
    const total = tOf(song.lengthBeats) + 3;
    const totalS = Math.ceil(total * sr);
    const cores = Math.max(1, Math.min(8, navigator.hardwareConcurrency || 4));
    const n = opts.chunks || Math.max(1, Math.min(cores, Math.floor(total / 5)));
    const PRE = Math.round(3.5 * sr), X = Math.round(0.03 * sr);
    const bounds = [];
    for (let i = 0; i <= n; i++) bounds.push(Math.round((totalS * i) / n));
    const wins = [];
    for (let i = 0; i < n; i++) {
      const w0 = Math.max(0, bounds[i] - PRE);
      const end = Math.min(totalS, bounds[i + 1] + X);
      wins.push({ w0, end, p: renderWindow(song, tOf, spb, sr, w0 / sr, end - w0) });
    }
    const bufs = await Promise.all(wins.map((w) => w.p));
    const out = new AudioBuffer({ length: totalS, numberOfChannels: 2, sampleRate: sr });
    const L = out.getChannelData(0), R = out.getChannelData(1);
    bufs.forEach((b, i) => {
      const c0 = bounds[i], c1 = bounds[i + 1], w0 = wins[i].w0;
      const from = i > 0 ? c0 - X : c0;
      const to = i < n - 1 ? c1 + X : c1;
      const bl = b.getChannelData(0), br = b.getChannelData(1);
      for (let t = from; t < to; t++) {
        let w = 1;
        if (i > 0 && t < c0 + X) w *= Math.max(0, Math.min(1, (t - (c0 - X)) / (2 * X)));
        if (i < n - 1 && t > c1 - X) w *= Math.max(0, Math.min(1, (c1 + X - t) / (2 * X)));
        L[t] += bl[t - w0] * w;
        R[t] += br[t - w0] * w;
      }
    });
    return out;
  }

  // AudioBuffer → MP3（lamejs，320kbps）
  A.encodeMp3 = function (buf) {
    const lame = window.lamejs;
    const channels = Math.min(2, buf.numberOfChannels);
    const enc = new lame.Mp3Encoder(channels, buf.sampleRate, 320);
    const toInt16 = (f) => {
      const o = new Int16Array(f.length);
      for (let i = 0; i < f.length; i++) { const x = Math.max(-1, Math.min(1, f[i])); o[i] = x < 0 ? x * 0x8000 : x * 0x7fff; }
      return o;
    };
    const L = toInt16(buf.getChannelData(0));
    const R = channels > 1 ? toInt16(buf.getChannelData(1)) : null;
    const parts = [];
    const BLOCK = 1152;
    for (let i = 0; i < L.length; i += BLOCK) {
      const out = R ? enc.encodeBuffer(L.subarray(i, i + BLOCK), R.subarray(i, i + BLOCK)) : enc.encodeBuffer(L.subarray(i, i + BLOCK));
      if (out.length) parts.push(out);
    }
    const end = enc.flush();
    if (end.length) parts.push(end);
    return new Blob(parts, { type: 'audio/mpeg' });
  };

  // 后台线程编码 MP3（lamejs 源码直接从页面里已加载的函数取出）；Worker 不可用时退回主线程
  A.encodeMp3Async = function (buf) {
    return new Promise((resolve) => {
      let worker, url;
      const fallback = () => { try { worker && worker.terminate(); } catch (e) {} if (url) URL.revokeObjectURL(url); resolve(A.encodeMp3(buf)); };
      try {
        const src = window.lamejs.toString() + ';lamejs();' +
          'self.onmessage=function(e){var d=e.data,enc=new lamejs.Mp3Encoder(d.R?2:1,d.sr,320),parts=[],B=1152;' +
          'for(var i=0;i<d.L.length;i+=B){var o=d.R?enc.encodeBuffer(d.L.subarray(i,i+B),d.R.subarray(i,i+B)):enc.encodeBuffer(d.L.subarray(i,i+B));if(o.length)parts.push(o);}' +
          'var f=enc.flush();if(f.length)parts.push(f);self.postMessage(parts);};';
        url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        worker = new Worker(url);
        worker.onmessage = (e) => { worker.terminate(); URL.revokeObjectURL(url); resolve(new Blob(e.data, { type: 'audio/mpeg' })); };
        worker.onerror = fallback;
        const toInt16 = (f) => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const x = Math.max(-1, Math.min(1, f[i])); o[i] = x < 0 ? x * 0x8000 : x * 0x7fff; } return o; };
        const L = toInt16(buf.getChannelData(0));
        const R = buf.numberOfChannels > 1 ? toInt16(buf.getChannelData(1)) : null;
        worker.postMessage({ L, R, sr: buf.sampleRate }, R ? [L.buffer, R.buffer] : [L.buffer]);
      } catch (err) { fallback(); }
    });
  };

  // ---------- 录音 ----------
  A.startRecording = function () {
    A.init();
    if (!A.recDest || !window.MediaRecorder) { BS.toast('当前浏览器不支持录音', 'warn'); return false; }
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
    const type = types.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    A.recChunks = [];
    A.recorder = new MediaRecorder(A.recDest.stream, type ? { mimeType: type } : undefined);
    A.recorder.ondataavailable = (e) => { if (e.data.size) A.recChunks.push(e.data); };
    A.recorder.start(250);
    return true;
  };
  A.stopRecording = function () {
    return new Promise((res) => {
      if (!A.recorder) return res(null);
      A.recorder.onstop = () => {
        const type = A.recorder.mimeType || 'audio/webm';
        res(new Blob(A.recChunks, { type }));
        A.recorder = null;
      };
      A.recorder.stop();
    });
  };
})();
