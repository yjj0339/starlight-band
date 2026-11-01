/* 星光乐队 · MIDI 文件解析 / 导出 */
(function () {
  const BS = window.BS;
  const M = (BS.Midi = {});

  // GM 音色 → 本地乐器
  M.programToInst = function (p) {
    if (p <= 3) return 'piano';
    if (p <= 5 || p === 7) return 'epiano';
    if (p === 6) return 'piano';
    if (p <= 10 || p === 14) return 'musicbox';
    if (p <= 13) return 'marimba';
    if (p === 15) return 'guzheng';
    if (p <= 23) return 'organ';
    if (p === 24) return 'nylon';
    if (p === 25) return 'aguitar';
    if (p <= 31) return 'eguitar';
    if (p <= 39) return 'bass';
    if (p === 40 || p === 41) return 'violin';
    if (p === 42) return 'cello';
    if (p === 43) return 'contrabass';
    if (p === 45) return 'harp';
    if (p === 46) return 'harp';
    if (p === 47) return 'timpani';
    if (p <= 51 || p === 55) return 'strings';
    if (p <= 54) return 'choir';
    if (p === 57 || p === 58) return 'trombone';
    if (p === 60 || p === 61) return 'horn';
    if (p <= 63) return 'trumpet';
    if (p <= 67) return 'sax';
    if (p === 71 || p === 70 || p === 68 || p === 69) return 'clarinet';
    if (p <= 79) return 'flute';
    if (p <= 87) return 'synthlead';
    if (p <= 103) return 'synthpad';
    if (p === 104 || p === 106 || p === 107) return 'guzheng';
    if (p === 105) return 'aguitar';
    if (p === 108) return 'musicbox';
    if (p === 109 || p === 111) return 'erhu';
    if (p === 110) return 'violin';
    if (p <= 119) return 'marimba';
    return 'synthpad';
  };
  const INST_PROGRAM = { piano: 0, epiano: 4, organ: 19, musicbox: 10, marimba: 12, strings: 48, violin: 40, cello: 42, harp: 46, flute: 73, sax: 65, trumpet: 56, aguitar: 25, eguitar: 29, bass: 33, timpani: 47, synthlead: 81, synthpad: 89, choir: 52, guzheng: 107, erhu: 110, nylon: 24, contrabass: 43, trombone: 57, horn: 60, clarinet: 71 };

  M.parse = function (buf) {
    const d = new DataView(buf);
    let p = 0;
    const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i)); p += n; return s; };
    const u32 = () => { const v = d.getUint32(p); p += 4; return v; };
    const u16 = () => { const v = d.getUint16(p); p += 2; return v; };
    const u8 = () => d.getUint8(p++);
    const vlq = () => { let v = 0, b; do { b = u8(); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    // 跳过可能的 RIFF 包装
    if (str(4) !== 'MThd') {
      p = 0;
      const bytes = new Uint8Array(buf);
      let idx = -1;
      for (let i = 0; i < Math.min(bytes.length - 4, 4096); i++) if (bytes[i] === 0x4d && bytes[i + 1] === 0x54 && bytes[i + 2] === 0x68 && bytes[i + 3] === 0x64) { idx = i; break; }
      if (idx < 0) throw new Error('不是有效的 MIDI 文件');
      p = idx + 4;
    }
    const hlen = u32();
    const format = u16(), ntrks = u16(), division = u16();
    p += hlen - 6;
    let ppq = division, smpte = 0;
    if (division & 0x8000) { const fps = 256 - (division >> 8); smpte = fps * (division & 0xff); ppq = 0; }
    const tempos = [], timesigs = [];
    const raw = [];
    for (let t = 0; t < ntrks && p < d.byteLength - 8; t++) {
      const id = str(4);
      const len = u32();
      const end = p + len;
      if (id !== 'MTrk') { p = end; continue; }
      let tick = 0, status = 0, name = '';
      const evs = [];
      while (p < end) {
        tick += vlq();
        let b = u8();
        if (b === 0xff) {
          const type = u8(); const l = vlq();
          if (type === 0x51 && l === 3) { const v = (d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2); tempos.push({ tick, uspq: v }); }
          else if (type === 0x58 && l >= 2) timesigs.push({ tick, num: d.getUint8(p), den: Math.pow(2, d.getUint8(p + 1)) });
          else if ((type === 0x03 || type === 0x04) && !name) { name = decodeText(new Uint8Array(buf, p, l)); }
          p += l;
          continue;
        }
        if (b === 0xf0 || b === 0xf7) { p += vlq(); continue; }
        if (b & 0x80) status = b; else p--;
        const type = status & 0xf0, ch = status & 0x0f;
        if (type === 0xc0 || type === 0xd0) { evs.push({ tick, type, ch, a: u8() }); }
        else { const a = u8(), c = u8(); evs.push({ tick, type, ch, a, b: c }); }
      }
      p = end;
      raw.push({ name, evs });
    }
    // 速度表 → 秒
    tempos.sort((a, b) => a.tick - b.tick);
    if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, uspq: 500000 });
    const segs = [];
    let sec = 0;
    tempos.forEach((tp, i) => {
      if (i > 0) { const prev = segs[i - 1]; sec = prev.sec + ((tp.tick - prev.tick) * prev.uspq) / 1e6 / ppq; }
      segs.push({ tick: tp.tick, uspq: tp.uspq, sec });
    });
    const toSec = (tick) => {
      if (smpte) return tick / smpte;
      let s = segs[0];
      for (let i = 1; i < segs.length && segs[i].tick <= tick; i++) s = segs[i];
      return s.sec + ((tick - s.tick) * s.uspq) / 1e6 / ppq;
    };
    const groups = new Map();
    raw.forEach((tr, ti) => {
      const prog = {};
      const open = {};
      tr.evs.forEach((e) => {
        if (e.type === 0xc0) { prog[e.ch] = e.a; return; }
        if (e.type !== 0x90 && e.type !== 0x80) return;
        const key = ti + ':' + e.ch;
        if (!groups.has(key)) groups.set(key, { name: tr.name, ch: e.ch, program: prog[e.ch] || 0, notes: [] });
        const g = groups.get(key);
        if (prog[e.ch] != null) g.program = prog[e.ch];
        const nk = e.ch * 128 + e.a;
        if (e.type === 0x90 && e.b > 0) { (open[nk] = open[nk] || []).push({ tick: e.tick, v: e.b, g }); }
        else {
          const st = open[nk] && open[nk].shift();
          if (st) { const t0 = toSec(st.tick); st.g.notes.push({ time: t0, dur: Math.max(0.03, toSec(e.tick) - t0), m: e.a, v: st.v / 127 }); }
        }
      });
      Object.values(open).forEach((arr) => arr.forEach((st) => { const t0 = toSec(st.tick); st.g.notes.push({ time: t0, dur: 0.5, m: 0, v: st.v / 127, _m: true }); }));
    });
    const tracks = [...groups.values()].filter((g) => g.notes.length);
    const bpm = 60000000 / tempos[0].uspq;
    const ts = timesigs[0] || { num: 4, den: 4 };
    return { format, tracks, bpm: Math.round(bpm * 100) / 100, ts };
  };

  function decodeText(bytes) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) {}
    try { return new TextDecoder('gbk').decode(bytes); } catch (e) {}
    return String.fromCharCode.apply(null, bytes);
  }

  // MIDI → 可演奏的歌曲
  M.toSong = function (parsed, title) {
    const bpm = parsed.bpm || 120;
    const bpb = Math.max(2, Math.round((parsed.ts.num * 4) / parsed.ts.den)) || 4;
    const b = (s) => (s * bpm) / 60;
    const used = {};
    const tracks = parsed.tracks.map((g, i) => {
      const drums = g.ch === 9;
      const inst = drums ? 'drums' : M.programToInst(g.program);
      const notes = g.notes.filter((n) => !n._m).map((n) => ({ t: b(n.time), d: Math.max(0.05, b(n.dur)), m: n.m, v: BS.clamp(n.v, 0.1, 1) })).sort((x, y) => x.t - y.t);
      let name = (g.name || '').trim() || (drums ? '鼓组' : BS.INST[inst].name);
      used[name] = (used[name] || 0) + 1;
      if (used[name] > 1) name += ' ' + used[name];
      return { id: 't' + i, role: drums ? 'drums' : 'track', name, inst, notes, vol: drums ? 0.75 : 0.75, pan: 0, send: drums ? 0.12 : 0.22 };
    }).filter((t) => t.notes.length);
    // 推测主旋律：高音区、近似单音、音符多
    let best = -1, bs = -1e9;
    tracks.forEach((tr, i) => {
      if (tr.inst === 'drums') return;
      const avg = tr.notes.reduce((a, n) => a + n.m, 0) / tr.notes.length;
      let poly = 0;
      for (let k = 1; k < tr.notes.length; k++) if (Math.abs(tr.notes[k].t - tr.notes[k - 1].t) < 0.02) poly++;
      const mono = 1 - poly / tr.notes.length;
      const s = avg * 0.6 + Math.log(tr.notes.length + 1) * 6 + mono * 25 + (/melod|lead|vocal|主|旋律|唱/i.test(tr.name) ? 30 : 0);
      if (s > bs) { bs = s; best = i; }
    });
    if (best > 0) { const [x] = tracks.splice(best, 1); tracks.unshift(x); }
    if (tracks[0]) { tracks[0].role = 'lead'; tracks[0].vol = 0.9; }
    // 声像分布
    tracks.forEach((tr, i) => { if (i > 0 && tr.inst !== 'drums' && tr.inst !== 'bass') tr.pan = ((i % 2 ? -1 : 1) * Math.min(0.5, 0.15 * Math.ceil(i / 2))); tr.color = BS.INST[tr.inst].color; });
    let end = 0;
    tracks.forEach((tr) => tr.notes.forEach((n) => (end = Math.max(end, n.t + n.d))));
    const sections = [];
    const secLen = bpb * 8;
    for (let t = 0, k = 1; t < end; t += secLen, k++) sections.push({ name: '第 ' + k + ' 段', t, end: Math.min(end, t + secLen), level: 2 });
    const chords = BS.Analyzer ? BS.Analyzer.chordsFromNotes(tracks, bpb, end) : [];
    return { id: 'midi-' + BS.uid(), title: title || '导入的 MIDI', sub: 'MIDI 导入 · ' + tracks.length + ' 轨', bpm, bpb, keyPc: 0, tracks, sections, chords, startBeat: 0, lengthBeats: end + 2, source: 'midi' };
  };

  // 导出 MIDI
  M.write = function (song) {
    const ppq = 480;
    const bytes = [];
    const push = (...a) => a.forEach((x) => bytes.push(x & 0xff));
    const vlq = (v) => { const out = [v & 0x7f]; while ((v >>= 7)) out.unshift((v & 0x7f) | 0x80); return out; };
    const str = (s) => [...s].map((c) => c.charCodeAt(0));
    const trackChunk = (events) => {
      events.sort((a, b) => a.tick - b.tick || a.order - b.order);
      const data = [];
      let last = 0;
      events.forEach((e) => { data.push(...vlq(Math.max(0, e.tick - last)), ...e.bytes); last = Math.max(last, e.tick); });
      data.push(0, 0xff, 0x2f, 0);
      const head = [...str('MTrk'), (data.length >>> 24) & 0xff, (data.length >>> 16) & 0xff, (data.length >>> 8) & 0xff, data.length & 0xff];
      return head.concat(data);
    };
    const tracks = song.tracks.filter((t) => t.notes && t.notes.length);
    push(...str('MThd'), 0, 0, 0, 6, 0, 1, 0, tracks.length + 1, ppq >> 8, ppq & 0xff);
    const uspq = Math.round(60000000 / song.bpm);
    const minT = Math.min(0, ...tracks.map((t) => t.notes[0].t));
    const tk = (beat) => Math.max(0, Math.round((beat - minT) * ppq));
    bytes.push(...trackChunk([
      { tick: 0, order: 0, bytes: [0xff, 0x51, 3, (uspq >> 16) & 0xff, (uspq >> 8) & 0xff, uspq & 0xff] },
      { tick: 0, order: 1, bytes: [0xff, 0x58, 4, song.bpb || 4, 2, 24, 8] },
    ]));
    let chn = 0;
    tracks.forEach((tr) => {
      const drums = tr.inst === 'drums';
      let ch = 9;
      if (!drums) { if (chn % 16 === 9) chn++; ch = chn % 16; chn++; }
      const evs = [];
      const name = unescape(encodeURIComponent(tr.name));
      evs.push({ tick: 0, order: 0, bytes: [0xff, 0x03, ...vlq(name.length), ...str(name)] });
      if (!drums) evs.push({ tick: 0, order: 1, bytes: [0xc0 | ch, INST_PROGRAM[tr.inst] || 0] });
      tr.notes.forEach((n) => {
        const m = BS.clamp(Math.round(n.m), 0, 127);
        const v = BS.clamp(Math.round((n.v || 0.7) * 127), 1, 127);
        evs.push({ tick: tk(n.t), order: 3, bytes: [0x90 | ch, m, v] });
        evs.push({ tick: tk(n.t + (drums ? 0.1 : n.d)), order: 2, bytes: [0x80 | ch, m, 0] });
      });
      const chunk = trackChunk(evs);
      for (let i = 0; i < chunk.length; i++) bytes.push(chunk[i]);
    });
    return new Uint8Array(bytes);
  };
})();
