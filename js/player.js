/* 星光乐队 · 走带调度 + 演奏判定 */
(function () {
  const BS = window.BS;
  const A = BS.Audio;

  const P = (BS.Player = {
    song: null, bpm: 120, rate: 1, playing: false, beat: 0, t0Ctx: 0, t0Beat: 0,
    chans: [], ptr: [], userIdx: -1, mode: 'listen', metronome: false, transpose: 0, assist: false,
    vis: [], visOn: [], audioSrc: null, schedBeat: 0, holding: false, loop: null, countIn: true,
  });

  P.spb = () => 60 / (P.bpm * P.rate);
  P.latency = () => (A.ctx ? (A.ctx.outputLatency || 0) + (A.ctx.baseLatency || 0) : 0);
  P.beatAt = (ctxTime) => (P.playing ? P.t0Beat + (ctxTime - P.t0Ctx) / P.spb() : P.beat);
  P.beatNow = () => P.beatAt(A.now());
  // 画面/判定所用的“听到的”时刻
  P.visBeat = () => P.beatAt(A.now() - P.latency() + (BS.store.get('calib', 0) / 1000));
  P.timeOfBeat = (b) => P.t0Ctx + (b - P.t0Beat) * P.spb();

  P.load = function (song, opts) {
    P.stop(true);
    A.init();
    P.chans.forEach((c) => c && c.destroy());
    P.song = song;
    P.bpm = song.bpm;
    P.userIdx = opts && opts.userIdx != null ? opts.userIdx : -1;
    P.mode = (opts && opts.mode) || 'listen';
    P.chans = song.tracks.map((tr) => A.channel(tr.vol, tr.pan, tr.send));
    P.applyMix();
    song.tracks.forEach((tr) => { if (tr.inst !== 'audio' && tr.inst !== 'drums') A.loadSamples(tr.inst); });
    P.beat = P.startPoint();
    P.ptr = song.tracks.map(() => 0);
    BS.bus.emit('loaded', song);
  };

  P.startPoint = function () {
    const s = P.song;
    if (!s) return 0;
    let start = Math.min(0, s.startBeat || 0);
    if (P.countIn && P.mode !== 'listen') {
      const lead = Math.max(s.bpb, Math.ceil((2.4 * P.bpm * P.rate) / 60));
      start = Math.min(start, (s.startBeat || 0) - lead);
      start = Math.floor(start);
    } else if (s.startBeat < 0) start = Math.floor(s.startBeat);
    return start;
  };

  P.applyMix = function () {
    const s = P.song;
    if (!s) return;
    const anySolo = s.tracks.some((t) => t.solo);
    s.tracks.forEach((tr, i) => {
      const on = !tr.mute && (!anySolo || tr.solo);
      P.chans[i].setVol(on ? tr.vol : 0);
      P.chans[i].setPan(tr.pan || 0);
    });
  };

  P.trackAudible = function (i) {
    const s = P.song, tr = s.tracks[i];
    const anySolo = s.tracks.some((t) => t.solo);
    if (tr.mute || (anySolo && !tr.solo)) return false;
    if (i === P.userIdx && P.mode !== 'listen') return P.assist;
    return true;
  };

  P.resetPointers = function (beat) {
    P.ptr = P.song.tracks.map((tr) => BS.lowerBound(tr.notes, beat - 0.001, 't'));
    P.schedBeat = beat;
  };

  P.play = function () {
    if (!P.song || P.playing) return;
    const ctx = A.init();
    if (P.beat >= P.song.lengthBeats - 0.5) P.beat = P.startPoint();
    P.playing = true;
    P.t0Ctx = ctx.currentTime + 0.06;
    P.t0Beat = P.beat;
    P.resetPointers(P.beat);
    P.startAudio();
    P.lastClick = Math.ceil(P.beat - 1e-6);
    if (!P.timer) P.timer = setInterval(P.tick, 25);
    P.tick();
    BS.bus.emit('transport', 'play');
  };

  P.pause = function (silent) {
    if (!P.playing) return;
    P.beat = P.beatNow();
    P.playing = false;
    P.stopAudio();
    P.releaseAll();
    if (!silent) BS.bus.emit('transport', 'pause');
  };

  P.toggle = () => (P.playing ? P.pause() : P.play());

  P.stop = function (silent) {
    if (P.playing) P.pause(true);
    P.playing = false;
    P.holding = false;
    if (P.song) P.beat = P.startPoint();
    P.releaseAll();
    if (!silent) BS.bus.emit('transport', 'stop');
  };

  P.seek = function (beat) {
    if (!P.song) return;
    beat = BS.clamp(beat, P.startPoint(), P.song.lengthBeats);
    const was = P.playing;
    if (was) P.pause(true);
    P.beat = beat;
    BS.Game.seek(beat);
    if (was) P.play();
    BS.bus.emit('seek', beat);
  };

  P.setRate = function (r) {
    const b = P.beatNow();
    const was = P.playing;
    if (was) P.pause(true);
    P.rate = r;
    P.beat = b;
    if (was) P.play();
  };

  P.releaseAll = function () {
    P.vis.length = 0;
    P.visOn.forEach((v) => BS.bus.emit('auto-off', v.ti, v.m));
    P.visOn.length = 0;
    (P.liveVoices || []).forEach((v) => { try { v.stop(A.now(), 0.05); } catch (e) {} });
    P.liveVoices = [];
  };

  P.startAudio = function () {
    P.stopAudio();
    P.song.tracks.forEach((tr, i) => {
      if (tr.inst !== 'audio' || !tr.audio) return;
      const off = (P.beat - tr.audioStart) * (60 / P.bpm);
      const s = A.ctx.createBufferSource();
      s.buffer = tr.audio;
      s.playbackRate.value = P.rate;
      s.connect(P.chans[i].input);
      if (off >= 0) s.start(P.t0Ctx, Math.min(off, tr.audio.duration));
      else s.start(P.t0Ctx - off / P.rate, 0);
      (P.audioSrc = P.audioSrc || []).push(s);
    });
  };
  P.stopAudio = function () {
    (P.audioSrc || []).forEach((s) => { try { s.stop(); s.disconnect(); } catch (e) {} });
    P.audioSrc = [];
  };

  P.tick = function () {
    if (!P.playing || !P.song) return;
    const ctx = A.ctx;
    const now = ctx.currentTime;
    const s = P.song;
    const horizon = P.beatAt(now + 0.14);
    // 等待模式：到点卡住
    if (P.mode === 'wait' && BS.Game.active) {
      const nx = BS.Game.nextPending();
      if (nx && P.beatNow() >= nx.t) {
        P.pause(true);
        P.beat = nx.t;
        P.holding = true;
        BS.bus.emit('holding', nx);
        return;
      }
    }
    // A-B 循环
    if (P.loop && P.beatNow() >= P.loop.b) { P.seek(P.loop.a); return; }
    const from = P.schedBeat;
    const to = horizon;
    if (to > from) {
      s.tracks.forEach((tr, i) => {
        if (tr.inst === 'audio') return;
        const notes = tr.notes;
        let k = P.ptr[i];
        const audible = P.trackAudible(i);
        const isUser = i === P.userIdx && P.mode !== 'listen';
        while (k < notes.length && notes[k].t < to) {
          const n = notes[k];
          if (n.t >= from - 1e-6) {
            const when = P.timeOfBeat(n.t);
            const dur = n.d * P.spb();
            if (audible) {
              const m = tr.inst === 'drums' ? n.m : n.m + P.transpose;
              const vel = isUser ? (n.v || 0.7) * 0.45 : n.v || 0.7;
              const v = A.voice(tr.inst, m, vel, when, P.chans[i].input);
              if (v) v.stop(when + Math.max(0.05, dur));
            }
            if (!isUser || audible) P.vis.push({ t: when, e: when + Math.max(0.08, dur), ti: i, m: n.m });
          }
          k++;
        }
        P.ptr[i] = k;
      });
      // 节拍器 / 预备拍
      for (let b = Math.ceil(from - 1e-6); b < to; b++) {
        if (P.metronome || b < Math.max(0, s.startBeat)) {
          const rel = ((b % s.bpb) + s.bpb) % s.bpb;
          if (P.metronome || P.mode !== 'listen') A.click(P.timeOfBeat(b), rel === 0);
        }
      }
      P.schedBeat = to;
    }
    if (P.beatNow() >= s.lengthBeats) {
      P.pause(true);
      P.beat = s.lengthBeats;
      BS.bus.emit('end');
    }
  };

  // 由动画循环调用：派发自动演奏的视觉事件
  P.pumpVisuals = function () {
    if (!A.ctx) return;
    const now = A.now() - P.latency();
    for (let i = P.vis.length - 1; i >= 0; i--) {
      const v = P.vis[i];
      if (v.t <= now) { P.vis.splice(i, 1); P.visOn.push(v); BS.bus.emit('auto-on', v.ti, v.m); }
    }
    for (let i = P.visOn.length - 1; i >= 0; i--) {
      const v = P.visOn[i];
      if (v.e <= now) { P.visOn.splice(i, 1); BS.bus.emit('auto-off', v.ti, v.m); }
    }
  };

  P.currentSection = function (beat) {
    const s = P.song;
    if (!s) return null;
    return s.sections.find((x) => beat >= x.t && beat < x.end) || null;
  };
  P.currentChord = function (beat) {
    const s = P.song;
    if (!s || !s.chords) return null;
    let c = null;
    for (const x of s.chords) { if (x.t <= beat + 1e-6) c = x; else break; }
    return c && beat < c.t + c.d ? c : c;
  };

  // ================= 判定 =================
  const G = (BS.Game = { active: false, notes: [], diff: 'normal' });
  const WIN = { perfect: 0.06, great: 0.11, good: 0.17 };
  const PTS = { perfect: 1000, great: 700, good: 400 };

  G.reset = function (song, idx, diff) {
    G.active = idx >= 0 && P.mode !== 'listen';
    G.diff = diff || 'normal';
    G.idx = idx;
    G.drums = idx >= 0 && song.tracks[idx].inst === 'drums';
    G.notes = idx >= 0 ? song.tracks[idx].notes.map((n) => ({ t: n.t, d: n.d, m: n.m, v: n.v, j: null })) : [];
    G.score = 0; G.combo = 0; G.maxCombo = 0;
    G.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
    G.ptr = 0;
    BS.bus.emit('score', G);
  };
  G.seek = function (beat) {
    G.notes.forEach((n) => { if (n.t >= beat - 0.01) n.j = null; });
    G.ptr = 0;
  };
  G.nextPending = function () {
    while (G.ptr < G.notes.length && G.notes[G.ptr].j) G.ptr++;
    return G.notes[G.ptr] || null;
  };
  const same = (a, b) => (G.drums ? BS.drumNorm(a) === BS.drumNorm(b) : G.diff === 'pro' ? a === b : G.diff === 'normal' ? ((a - b) % 12 + 12) % 12 === 0 : true);

  // 用户按下一个音：返回 { notes: 实际应发声的音高数组, grade }
  G.input = function (m) {
    if (!G.active) return null;
    const spb = P.spb();
    const beat = P.holding ? P.beat : P.visBeat();
    const win = P.mode === 'wait' ? 0.6 : WIN.good;
    let best = null, bd = 1e9;
    for (let i = G.ptr; i < G.notes.length; i++) {
      const n = G.notes[i];
      const dt = (n.t - beat) * spb;
      if (dt > win) break;
      if (n.j || dt < -win) continue;
      if (!same(m, n.m)) continue;
      const score = Math.abs(dt) - (n.m === m ? 0.02 : 0);
      if (score < bd) { bd = score; best = n; }
    }
    if (!best) return null;
    const dt = Math.abs((best.t - beat) * spb);
    let grade = dt <= WIN.perfect ? 'perfect' : dt <= WIN.great ? 'great' : 'good';
    if (P.mode === 'wait') grade = 'perfect';
    const hits = [best];
    if (G.diff === 'easy' && !G.drums) G.notes.forEach((n) => { if (!n.j && n !== best && Math.abs(n.t - best.t) < 0.03) hits.push(n); });
    hits.forEach((n) => (n.j = grade));
    G.combo += 1;
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.counts[grade] += hits.length;
    G.score += Math.round(PTS[grade] * hits.length * (1 + Math.min(G.combo, 100) / 200));
    BS.bus.emit('judge', grade, hits, G);
    // 等待模式：该时刻的音都弹完则继续
    if (P.holding) {
      const pending = G.notes.some((n) => !n.j && Math.abs(n.t - P.beat) < 0.03);
      if (!pending) { P.holding = false; P.play(); }
    }
    return { notes: hits.map((n) => n.m), grade };
  };

  G.update = function () {
    if (!G.active || P.mode === 'wait' || !P.playing) return;
    const beat = P.visBeat();
    const spb = P.spb();
    for (let i = G.ptr; i < G.notes.length; i++) {
      const n = G.notes[i];
      if ((n.t - beat) * spb > -WIN.good) break;
      if (!n.j) {
        n.j = 'miss';
        G.counts.miss++;
        G.combo = 0;
        BS.bus.emit('judge', 'miss', [n], G);
      }
    }
    while (G.ptr < G.notes.length && G.notes[G.ptr].j) G.ptr++;
  };

  G.result = function () {
    const c = G.counts;
    const total = G.notes.length || 1;
    const acc = (c.perfect + c.great * 0.7 + c.good * 0.4) / total;
    const grade = acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.7 ? 'B' : acc >= 0.5 ? 'C' : 'D';
    return { score: G.score, acc, grade, maxCombo: G.maxCombo, counts: c, total };
  };
})();
