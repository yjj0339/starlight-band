/* 星光乐队 · 演唱会舞台 + 下落音符瀑布 */
(function () {
  const BS = window.BS;
  const P = BS.Player;

  function fitCanvas(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };

  // ===================== 舞台 =====================
  const S = (BS.Stage = { members: [], crowd: [], parts: [], flash: 0, energy: 0, concert: false, curtain: 1, curtainTarget: 1 });
  const SLOTS = {
    lead: [0.5, 0.8], counter: [0.7, 0.76], keys: [0.25, 0.7], guitar: [0.77, 0.6], bass: [0.32, 0.55], drums: [0.5, 0.5], pad: [0.13, 0.55], timp: [0.88, 0.52], audio: [0.5, 0.5], choir: [0.5, 0.3],
  };
  S.setup = function (cv) {
    S.cv = cv;
    S.crowd = [];
    for (let i = 0; i < 140; i++) {
      S.crowd.push({ x: Math.random(), row: Math.random(), ph: Math.random() * 6.28, stick: Math.random() < 0.3, phone: Math.random() < 0.12, hue: Math.floor(Math.random() * 360), amp: 0.5 + Math.random() });
    }
    S.crowd.sort((a, b) => a.row - b.row);
  };
  S.setSong = function (song, userIdx, userMember) {
    const used = {};
    let free = 0;
    const extra = [[0.12, 0.66], [0.88, 0.68], [0.2, 0.5], [0.8, 0.5], [0.38, 0.66], [0.62, 0.66], [0.06, 0.5], [0.94, 0.5], [0.42, 0.48], [0.58, 0.48]];
    S.members = song.tracks.map((tr, i) => {
      let pos = SLOTS[tr.role];
      if (tr.role === 'choir' && !S.concert) pos = [0.68, 0.62];
      if (!pos || used[tr.role]) pos = tr.inst === 'drums' ? SLOTS.drums : extra[free++ % extra.length];
      if (i === userIdx) pos = [0.5, 0.82];
      used[tr.role] = 1;
      const def = BS.INST[tr.inst] || { icon: '🎵', color: '#ffffff', name: '原曲' };
      return { i, role: tr.role, x: pos[0], y: pos[1], icon: tr.inst === 'audio' ? '🎙️' : def.icon, color: tr.color || def.color, name: tr.name, inst: def.name || '', act: 0, user: i === userIdx };
    });
    if (userIdx < 0 && userMember) S.members.push({ i: -1, x: 0.5, y: 0.82, icon: userMember.icon, color: userMember.color, name: '你', inst: userMember.inst, act: 0, user: true });
    // 位置冲突时稍微错开
    S.members.forEach((m, i) => S.members.forEach((o, j) => { if (j > i && Math.abs(m.x - o.x) < 0.04 && Math.abs(m.y - o.y) < 0.04) o.x += 0.1; }));
  };
  S.pulse = function (ti, amount) {
    const m = S.members.find((x) => x.i === ti);
    if (m) m.act = Math.min(1.4, m.act + (amount || 0.5));
    S.energy = Math.min(1, S.energy + 0.02);
  };
  S.drumHit = function (n) { if (n === 36 || n === 35) S.flash = Math.min(1, S.flash + 0.5); if (n === 49) S.flash = 1; };
  S.burst = function (count, x, y) {
    for (let i = 0; i < (count || 120); i++) {
      S.parts.push({ x: x != null ? x : Math.random(), y: y != null ? y : -0.05, vx: (Math.random() - 0.5) * 0.012, vy: Math.random() * 0.006 + (y != null ? -0.012 : 0.002), r: 2 + Math.random() * 4, hue: Math.random() * 360, life: 1, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.3, type: Math.random() < 0.5 ? 'rect' : 'dot' });
    }
  };
  S.firework = function () {
    const x = 0.15 + Math.random() * 0.7, y = 0.1 + Math.random() * 0.25, hue = Math.random() * 360;
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * 6.28, sp = 0.004 + Math.random() * 0.01;
      S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2, hue: hue + Math.random() * 40, life: 1, type: 'spark' });
    }
  };

  // 简洁风格：不绘制礼花/烟花
  S.burst = S.firework = function () {};

  S.draw = function (t) {
    const cv = S.cv;
    if (!cv || !cv.clientWidth) return;
    const { ctx, w, h } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const beat = P.playing ? P.visBeat() : P.beat;
    const sec = P.currentSection(beat);
    const FONT = '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
    const small = w < 520; // 手机：标题已在左上角显示，画布里不再重复
    // 标题 / 段落 / 和弦
    if (P.song && !small) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1d1d1f';
      ctx.font = '600 ' + Math.max(14, Math.min(22, w / 40)) + 'px ' + FONT;
      ctx.fillText(P.song.title, w / 2, 32);
      const ch = P.currentChord(beat);
      ctx.font = '400 12px ' + FONT;
      ctx.fillStyle = '#6e6e73';
      ctx.fillText([sec && sec.name, ch && ch.name].filter(Boolean).join('  ·  '), w / 2, 52);
      // 节拍点
      if (P.playing) {
        const bpb = P.song.bpb, cur = ((Math.floor(beat) % bpb) + bpb) % bpb;
        for (let i = 0; i < bpb; i++) {
          ctx.fillStyle = i === cur ? '#3f6df2' : 'rgba(0,0,0,0.12)';
          ctx.beginPath(); ctx.arc(w / 2 + (i - (bpb - 1) / 2) * 12, 66, 3, 0, 6.28); ctx.fill();
        }
      }
    }
    // 底部细频谱
    if (BS.Audio.analyser) {
      const an = BS.Audio.analyser;
      const data = S._fd || (S._fd = new Uint8Array(an.frequencyBinCount));
      an.getByteFrequencyData(data);
      const bars = 64, bw = w / bars;
      ctx.fillStyle = 'rgba(63,109,242,0.16)';
      for (let i = 0; i < bars; i++) {
        const v = data[Math.floor(Math.pow(i / bars, 1.8) * data.length * 0.6) + 2] / 255;
        const bh = v * h * 0.22;
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      }
    }
    // ---- 音乐会舞台：台阶上的合唱团 + 指挥 ----
    const concert = S.concert;
    if (concert) {
      S.curtain += (S.curtainTarget - S.curtain) * 0.045;
      const fl = ctx.createLinearGradient(0, h * 0.3, 0, h);
      fl.addColorStop(0, 'rgba(255,255,255,0)'); fl.addColorStop(1, 'rgba(255,255,255,0.6)');
      ctx.fillStyle = fl; ctx.fillRect(0, h * 0.3, w, h * 0.7);
      const choir = S.members.find((m) => m.role === 'choir');
      const sr = Math.max(4, Math.min(9, h * 0.026));
      if (choir) {
        const ca = Math.min(1, choir.act);
        [[14, 0.38, 0.30], [16, 0.47, 0.36], [18, 0.56, 0.42]].forEach(([cnt, yf, wf], ri) => {
          // 台阶
          ctx.fillStyle = 'rgba(30,40,90,0.045)';
          rr(ctx, w * (0.5 - wf - 0.03), h * yf + sr * 1.9, w * (wf * 2 + 0.06), sr * 0.8, 4); ctx.fill();
          for (let i = 0; i < cnt; i++) {
            const u = i / (cnt - 1);
            const x = w * (0.5 + (u - 0.5) * 2 * wf), y = h * yf - Math.sin(u * Math.PI) * h * 0.012;
            const bob = Math.sin(beat * Math.PI * 2 + i * 0.7 + ri) * 1.3 * (0.25 + ca);
            ctx.fillStyle = hexA('#a5b4fc', 0.35 + ca * 0.25);
            rr(ctx, x - sr * 0.95, y + sr * 0.35 + bob, sr * 1.9, sr * 1.9, sr * 0.8); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = 'rgba(30,40,90,0.14)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(x, y + bob, sr * 0.72, 0, 6.28); ctx.fill(); ctx.stroke();
            if (ca > 0.12) { ctx.fillStyle = 'rgba(30,40,90,0.5)'; ctx.beginPath(); ctx.ellipse(x, y + bob + sr * 0.18, sr * 0.22, sr * 0.1 + ca * sr * 0.2, 0, 0, 6.28); ctx.fill(); }
          }
        });
      }
      // 演唱会：柔和的舞台灯随节拍呼吸（不画指挥）
      if (S.live) {
        const pulse = P.playing ? Math.pow(1 - (beat - Math.floor(beat)), 2) : 0;
        ['#a5b4fc', '#f9a8d4', '#99f6e4', '#fde68a', '#c4b5fd'].forEach((c, i) => {
          const lx = w * (0.15 + i * 0.175), ly = h * 0.42;
          const rg = ctx.createRadialGradient(lx, ly, 4, lx, ly, h * 0.42);
          rg.addColorStop(0, hexA(c, 0.16 + pulse * 0.14)); rg.addColorStop(1, hexA(c, 0));
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(lx, ly, h * 0.42, 0, 6.28); ctx.fill();
        });
      }
      // 指挥
      const cx = w * 0.5, cy = h * 0.935, cr = Math.max(7, sr * 1.15);
      if (!S.live) {
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, cr * 3.2);
      g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, cr * 3.2, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#3a3d52'; ctx.beginPath(); ctx.ellipse(cx, cy + cr * 0.9, cr * 1.1, cr * 0.9, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(30,40,90,0.2)'; ctx.beginPath(); ctx.arc(cx, cy, cr * 0.7, 0, 6.28); ctx.fill(); ctx.stroke();
      const ang = -0.95 + 0.75 * Math.sin(beat * Math.PI * 2 * (P.song && P.song.bpb === 3 ? 1 / 1.5 : 0.5));
      const bx = cx + cr * 1.0, by = cy + cr * 0.2;
      ctx.strokeStyle = '#3f6df2'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ang) * cr * 2.8, by + Math.sin(ang) * cr * 2.8); ctx.stroke();
      }
    }
    // 乐手
    const R = Math.max(small ? 12 : 16, Math.min(small ? 18 : 30, w / 34, h / 9, concert ? h * 0.075 : 99));
    S.members.slice().sort((a, b) => a.y - b.y).forEach((m) => {
      m.act *= 0.88;
      const a = Math.min(1, m.act);
      if (concert && m.role === 'choir') return;
      const x = w * (0.12 + m.x * 0.76), y = concert ? h * (0.645 + (m.y - 0.45) * 0.36) : small ? h * (0.62 + (m.y - 0.45) * 0.6) : h * (0.36 + (m.y - 0.42) * 0.95);
      const r = R * (m.user ? 1.18 : 1);
      if (a > 0.04) {
        ctx.fillStyle = hexA(m.color, 0.18 * a);
        ctx.beginPath(); ctx.arc(x, y, r + 4 + a * 8, 0, 6.28); ctx.fill();
      }
      ctx.shadowColor = 'rgba(30,40,80,0.12)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.lineWidth = m.user ? 2 : 1 + a;
      ctx.strokeStyle = m.user ? '#3f6df2' : hexA(m.color, 0.5 + a * 0.5);
      ctx.stroke();
      ctx.font = Math.round(r * 0.9) + 'px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(m.icon, x, y + 1);
      ctx.textBaseline = 'alphabetic';
      ctx.font = (m.user ? '600 ' : '400 ') + Math.max(10, r * 0.4) + 'px ' + FONT;
      ctx.fillStyle = m.user ? '#3f6df2' : '#6e6e73';
      ctx.fillText(m.user ? '你 · ' + m.inst : m.inst, x, y + r + 14);
    });
    // 幕布
    if (concert) {
      ctx.fillStyle = 'rgba(30,40,90,0.07)'; ctx.fillRect(0, 0, w, 7);
      if (S.curtain < 0.985) {
        const pw = w * 0.5 * (1 - S.curtain);
        const panel = (x0) => {
          const gr = ctx.createLinearGradient(x0, 0, x0 + pw, 0);
          gr.addColorStop(0, 'rgba(228,231,246,0.97)'); gr.addColorStop(1, 'rgba(244,245,252,0.97)');
          ctx.fillStyle = gr; ctx.fillRect(x0, 0, pw, h);
          ctx.strokeStyle = 'rgba(30,40,90,0.07)'; ctx.lineWidth = 1.5;
          for (let k = 12; k < pw; k += 20) { ctx.beginPath(); ctx.moveTo(x0 + k, 0); ctx.lineTo(x0 + k, h); ctx.stroke(); }
        };
        panel(0); panel(w - pw);
      }
    }
  };

  // ===================== 音符瀑布 =====================
  const H = (BS.Highway = { sparks: [], texts: [] });
  H.setup = function (cv) { H.cv = cv; };
  H.lanesFor = function (track) {
    if (!track) return null;
    const set = [...new Set(track.notes.map((n) => (track.inst === 'drums' ? BS.drumNorm(n.m) : n.m)))].sort((a, b) => a - b);
    if (track.inst === 'drums') { const order = BS.DRUMS.map((d) => d.n); set.sort((a, b) => order.indexOf(a) - order.indexOf(b)); }
    return set;
  };
  H.spark = function (x, color, text) {
    for (let i = 0; i < 14; i++) H.sparks.push({ x, y: 0, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 5 - 1, life: 1, color });
    if (text) H.texts.push({ x, text, life: 1, color });
  };
  H.xFor = function (m, w, hostRect) {
    const view = H.view;
    if (view && view.noteRect && H.useView) {
      const r = view.noteRect(m, hostRect);
      if (r) return r;
    }
    const lanes = H.lanes || [];
    const key = H.drums ? BS.drumNorm(m) : m;
    let i = lanes.indexOf(key);
    if (i < 0) return null;
    const n = lanes.length;
    const lw = Math.min(70, (w - 20) / n);
    const x0 = (w - lw * n) / 2;
    return { x: x0 + i * lw + 2, w: lw - 4, lane: true };
  };
  H.draw = function () {
    const cv = H.cv;
    if (!cv || !cv.clientWidth) return;
    const { ctx, w, h } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const song = P.song;
    if (!song || H.trackIdx == null || H.trackIdx < 0) return;
    const tr = song.tracks[H.trackIdx];
    if (!tr) return;
    const hostRect = cv.getBoundingClientRect();
    const beat = P.playing ? P.visBeat() : P.beat;
    const spb = P.spb();
    const look = (BS.store.get('hwSec', 2.4) / spb);
    const hitY = h - 8;
    const scale = (hitY - 10) / look;
    // 节拍线
    for (let b = Math.ceil(beat); b < beat + look; b++) {
      const y = hitY - (b - beat) * scale;
      const bar = (((b % song.bpb) + song.bpb) % song.bpb) === 0;
      ctx.fillStyle = bar ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, y, w, bar ? 1.5 : 1);
    }
    // 车道
    if (!H.useView || !H.view || !H.view.noteRect || H.view.type !== 'keys' && H.view.type !== 'harp') {
      (H.lanes || []).forEach((m) => {
        const r = H.xFor(m, w, hostRect);
        if (!r) return;
        ctx.fillStyle = 'rgba(0,0,0,0.025)';
        ctx.fillRect(r.x, 0, r.w, hitY);
        ctx.fillStyle = '#8e919b';
        ctx.font = '500 10px sans-serif';
        ctx.textAlign = 'center';
        const lab = H.drums ? (BS.DRUMS.find((d) => d.n === m) || { name: m }).name : BS.noteName(m);
        ctx.fillText(lab, r.x + r.w / 2, hitY - 4);
      });
    }
    // 判定线
    ctx.fillStyle = '#3f6df2';
    ctx.fillRect(0, hitY, w, 2);
    const notes = BS.Game.active && BS.Game.idx === H.trackIdx ? BS.Game.notes : tr.notes;
    const i0 = BS.lowerBound(notes, beat - 8, 't');
    const color = '#3f6df2';
    for (let i = i0; i < notes.length; i++) {
      const n = notes[i];
      if (n.t > beat + look) break;
      if (n.t + n.d < beat - 0.5) continue;
      const r = H.xFor(n.m, w, hostRect);
      if (!r) continue;
      const y1 = hitY - (n.t - beat) * scale;
      const len = Math.max(10, (H.drums ? 0.15 : n.d) * scale);
      const y0 = y1 - len;
      let fill = color, alpha = 0.85;
      if (n.j === 'miss') { fill = '#c7c9d1'; alpha = 0.8; }
      else if (n.j) { alpha = Math.max(0, 0.5 - (beat - n.t) * 0.8); }
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      const bw = r.black ? r.w : r.w * (r.lane ? 1 : 0.86);
      const bx = r.x + (r.w - bw) / 2;
      rr(ctx, bx, Math.max(-20, y0), bw, Math.min(len, y1 - Math.max(-20, y0)), Math.min(6, bw / 3));
      ctx.fill();
      if (bw > 22 && !H.drums && len > 16) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = '600 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(BS.noteName(n.m).replace(/\d/, ''), bx + bw / 2, y1 - 4);
      }
    }
    ctx.globalAlpha = 1;
    // 火花 & 判定文字
    for (let i = H.sparks.length - 1; i >= 0; i--) {
      const s = H.sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.25; s.life -= 0.04;
      if (s.life <= 0) { H.sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, hitY + s.y, 2.2, 0, 6.28); ctx.fill();
    }
    for (let i = H.texts.length - 1; i >= 0; i--) {
      const s = H.texts[i];
      s.life -= 0.025;
      if (s.life <= 0) { H.texts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, s.life * 2);
      ctx.font = '800 15px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, BS.clamp(s.x, 40, w - 40), hitY - 30 - (1 - s.life) * 30);
    }
    ctx.globalAlpha = 1;
  };
})();
