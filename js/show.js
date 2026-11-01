/* 星光乐队 · 全局演出模式：任何一首歌（内置 / 导入 / 简谱）在任何页面都能切到 合唱团 / 音乐会 / 演唱会 */
(function () {
  const BS = window.BS, App = BS.App, P = BS.Player, S = BS.Stage, T = BS.Theory;
  const $ = BS.$, $$ = BS.$$, h = BS.h;

  const SHOWS = [
    ['normal', '标准', '乐队 + 你的声部'],
    ['choir', '合唱团', '合唱团领唱主旋律'],
    ['concert', '音乐会', '管弦 + 合唱团伴唱'],
    ['live', '演唱会', '乐队现场 + 舞台灯'],
  ];
  App.SHOWS = SHOWS;
  const stored = BS.store.get('show', 'normal');
  App.show = SHOWS.some((s) => s[0] === stored) ? stored : 'normal';

  // ---- 把任意一份编曲变成指定模式的版本 ----
  const cache = new WeakMap();
  function choirPad(comp) {
    const notes = [];
    let prev = null;
    (comp.chords || []).forEach((c) => {
      const ch = T.chord(c.name);
      if (!ch || c.d < 1) return;
      prev = T.voice(ch, 64, prev, 4);
      prev.forEach((m) => notes.push({ t: c.t, d: c.d, m, v: 0.5 }));
    });
    const info = T.ROLE_INFO.choir;
    return { id: 'choir', role: 'choir', name: info.name, inst: 'choir', notes, vol: info.vol, pan: info.pan, send: info.send, color: BS.INST.choir.color };
  }

  // 返回 { comp, part }：part 是新编曲里对应原声部的下标
  App.showVariant = function (base, mode, st) {
    if (base.__base) base = base.__base;
    const part0 = st && st.basePart != null ? st.basePart : st ? st.part : -1;
    if (mode === 'normal' || mode === 'live' || !base.tracks) return { comp: base, part: part0 };
    const wantLead = mode === 'choir';
    const playingLead = st && st.mode !== 'listen' && base.tracks[part0] && base.tracks[part0].role === 'lead';
    const key = mode + (wantLead && !playingLead ? ':lead' : '');
    let m = cache.get(base);
    if (!m) cache.set(base, (m = {}));
    if (!m[key]) {
      let tracks = base.tracks.slice();
      if (!tracks.some((t) => t.role === 'choir')) {
        const pad = choirPad(base);
        if (pad.notes.length) tracks.push(pad);
      }
      if (wantLead && !playingLead) {
        // 找出主旋律：优先 role=lead，否则音符最多的非鼓、非原声声部
        let li = tracks.findIndex((t) => t.role === 'lead');
        if (li < 0) {
          let best = -1;
          tracks.forEach((t, i) => { if (t.inst !== 'drums' && t.inst !== 'audio' && t.role !== 'choir' && t.notes.length > best) { best = t.notes.length; li = i; } });
        }
        if (li >= 0) {
          const t = tracks[li];
          tracks[li] = Object.assign({}, t, { inst: 'choir', name: '合唱团领唱', color: BS.INST.choir.color, vol: Math.max(0.9, t.vol || 0.9) });
        }
      }
      const order = tracks.map((t, i) => i);
      m[key] = Object.assign({}, base, { tracks, __base: base, __order: order });
    }
    const comp = m[key];
    let part = part0;
    if (part0 >= 0 && base.tracks[part0]) {
      const o = base.tracks[part0];
      part = comp.tracks.findIndex((t) => t.id === o.id && t.role === o.role && t.name === o.name);
      if (part < 0) part = comp.tracks.findIndex((t) => t.role === o.role);
      if (part < 0) part = part0;
    }
    return { comp, part };
  };

  // ---- 舞台外观 ----
  function applyVisual(mode, st) {
    const on = mode !== 'normal';
    S.concert = on;
    S.live = mode === 'live';
    S.curtain = 1; S.curtainTarget = 1;
    const listen = !st || st.mode === 'listen';
    const grid = $('.stage-grid');
    if (grid) grid.classList.toggle('big-stage', on && listen);
  }
  App.applyShowVisual = applyVisual;

  // ---- 选择器 ----
  App.renderShowSeg = function () {
    $$('.show-seg').forEach((box) => {
      if (!box.dataset.built) {
        box.dataset.built = '1';
        SHOWS.forEach(([k, name, tip]) => box.appendChild(h('button', { 'data-k': k, title: tip, onclick: () => App.setShow(k) }, name)));
      }
      $$('button', box).forEach((b) => b.classList.toggle('on', b.dataset.k === App.show));
    });
    const mp = $('#mpShow');
    if (mp) mp.textContent = (SHOWS.find((s) => s[0] === App.show) || SHOWS[0])[1];
  };

  App.setShow = function (mode) {
    if (!SHOWS.some((s) => s[0] === mode)) return;
    const C = App.concert;
    App.show = mode;
    BS.store.set('show', mode);
    App.renderShowSeg();
    if (C && C.running) { BS.toast('正在进行节目单演出；结束后「' + SHOWS.find((s) => s[0] === mode)[1] + '」会生效'); return; }
    if (App.ctx === 'song' && App.entry && P.song && P.song.tracks) {
      const base = P.song.__base || P.song;
      const was = P.playing;
      const beat = P.beatNow ? (was ? P.beatNow() : P.beat) : P.beat;
      App._resume = { beat, was };
      App._keepPage = App.page;
      const st = Object.assign({}, App.lastSetup || { mode: 'listen', diff: 'normal', part: 0, rate: 1 });
      App.startSong(base, st, App.entry);
    } else {
      applyVisual(mode, App.lastSetup);
    }
    BS.toast('演出模式：' + SHOWS.find((s) => s[0] === mode)[1]);
  };

  // ---- 接入 startSong / go ----
  const origStart = App.startSong;
  App.startSong = function (comp, st, entry) {
    const C = App.concert;
    if (C && C.running && !App._concertCall) { App.endConcert && App.endConcert(); }
    let part = st.part;
    if (!(C && C.running) && comp && comp.tracks) {
      const v = App.showVariant(comp, App.show, st);
      st = Object.assign({}, st, { part: v.part, basePart: st.basePart != null ? st.basePart : st.part });
      comp = v.comp;
      applyVisual(App.show, st);
    }
    const resume = App._resume;
    App._resume = null;
    const r = origStart.call(App, comp, st, entry);
    if (resume) {
      setTimeout(() => {
        if (P.song !== comp) return;
        P.seek(Math.max(P.startPoint(), resume.beat));
        if (!resume.was) P.pause();
        App.updateMini && App.updateMini();
      }, 650);
    }
    return r;
  };
  const origGo = App.go;
  App.go = function (page) {
    if (App._keepPage && page === 'stage') { page = App._keepPage; App._keepPage = null; }
    return origGo.call(App, page);
  };

  document.addEventListener('DOMContentLoaded', () => {
    App.renderShowSeg();
    const mp = $('#mpShow');
    if (mp) mp.addEventListener('click', () => { const i = SHOWS.findIndex((s) => s[0] === App.show); App.setShow(SHOWS[(i + 1) % SHOWS.length][0]); });
  });
  if (document.readyState !== 'loading') {
    App.renderShowSeg();
    const mp = $('#mpShow');
    if (mp) mp.addEventListener('click', () => { const i = SHOWS.findIndex((s) => s[0] === App.show); App.setShow(SHOWS[(i + 1) % SHOWS.length][0]); });
  }
})();
