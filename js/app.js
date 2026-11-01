/* 星光乐队 · 应用主逻辑 */
(function () {
  const BS = window.BS, A = BS.Audio, P = BS.Player, G = BS.Game, T = BS.Theory, S = BS.Stage, H = BS.Highway;
  const $ = BS.$, $$ = BS.$$, h = BS.h;

  const App = (BS.App = {
    page: 'library', ctx: null, view: null, userIdx: -1, userInst: BS.store.get('jamInst', 'piano'), forceKeys: false,
    live: {}, sustain: false, sustained: [], cat: '全部', compiled: {}, imports: [],
    jam: BS.store.get('jam', { style: 'pop', prog: 0, key: 0, bpm: 100 }),
    setup: { mode: BS.store.get('lastMode', 'play'), diff: BS.store.get('lastDiff', 'normal') },
  });
  const CATS = ['全部', '流行', '古典', '国风', '节日', '儿歌', '音乐会', '我的导入'];
  const SUSTAINABLE = ['piano', 'epiano', 'musicbox', 'marimba', 'harp', 'guzheng', 'aguitar', 'eguitar', 'bass'];
  const PLUCKED = ['harp', 'guzheng', 'aguitar', 'eguitar', 'marimba', 'musicbox', 'timpani'];

  // ---------------- IndexedDB（导入歌曲持久化） ----------------
  const idb = {
    open() {
      if (this._p) return this._p;
      this._p = new Promise((res, rej) => {
        if (!window.indexedDB) return rej(new Error('no idb'));
        const r = indexedDB.open('starlight-band', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      return this._p;
    },
    async get(k) {
      const db = await this.open();
      return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    },
    async put(k, v) {
      const db = await this.open();
      return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    },
    async del(k) {
      const db = await this.open();
      return new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = () => res(); tx.onerror = () => res(); });
    },
  };

  // ---------------- 页面切换 ----------------
  App.go = function (page) {
    if (page === 'jam') { App.enterJam(); page = 'stage'; }
    if (page === 'stage' && !P.song) { BS.toast('先在曲库选一首歌，或进入「合唱团 / 音乐会 / 演唱会」'); page = 'library'; }
    let tab = page;
    if (['choir', 'concert', 'live'].includes(page)) { App.concertKind = page; page = 'concert'; }
    App.page = page;
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.page === (page === 'stage' && App.ctx === 'jam' ? 'jam' : tab)));
    $$('.page').forEach((p) => p.classList.toggle('on', p.id === 'page-' + page));
    if (page === 'stage') setTimeout(() => App.view && App.view.resize(), 60);
    if (page === 'library') App.renderGrid();
    if (page === 'concert' && App.renderConcertPage) App.renderConcertPage(App.concertKind || 'concert');
    App.updateMini();
  };

  // ---------------- 曲库 ----------------
  // opts.choir：给编配加上合唱团声部（音乐会模式用）
  App.getCompiled = function (entry, opts) {
    const choir = !!(opts && opts.choir);
    const lead = !!(opts && opts.choirLead);
    if (entry.kind === 'builtin') {
      const key = entry.song.id + (choir ? ':choir' : '') + (lead ? ':lead' : '');
      if (!App.compiled[key]) {
        const c = T.arrange(entry.song, { choir: choir || lead });
        // 合唱团模式：主旋律交给合唱团来唱
        if (lead) c.tracks.forEach((t) => { if (t.role === 'lead') { t.inst = 'choir'; t.name = '合唱团领唱'; t.color = BS.INST.choir.color; t.vol = 0.95; } });
        App.compiled[key] = c;
      }
      return App.compiled[key];
    }
    if (entry.kind === 'jianpu') {
      const key = entry.id + (choir ? ':choir' : '');
      if (!App.compiled[key]) { const c = T.arrange(entry.song, { choir }); c.source = 'jianpu'; App.compiled[key] = c; }
      return App.compiled[key];
    }
    return entry.data;
  };
  // 难度：直接从简谱估算（不用逐首编曲，曲库打开更快）
  const diffCache = {};
  App.defDifficulty = function (def) {
    if (diffCache[def.id] != null) return diffCache[def.id];
    const keyPc = T.pc(def.key || 'C');
    let notes = 0, beats = 0;
    def.form.forEach((f) => {
      const part = def.parts[f[0]];
      if (!part) return;
      const m = T.parseJianpu(part.m || '', keyPc, part.oct != null ? part.oct : def.oct != null ? def.oct : 4);
      notes += m.notes.length; beats += m.beats;
    });
    const nps = notes / Math.max(1, (beats * 60) / def.bpm);
    return (diffCache[def.id] = BS.clamp(Math.round(nps * 1.2), 1, 5));
  };
  App.entries = function () {
    const b = BS.SONGS.map((s) => ({ kind: 'builtin', id: s.id, title: s.title, sub: s.sub, cat: s.cat, song: s, colors: s.colors, lead: s.lead, bpm: s.bpm, style: T.STYLES[s.style].name }));
    const im = App.imports.map((e) => Object.assign({ cat: '我的导入' }, e));
    return b.concat(im);
  };
  App.renderCats = function () {
    const w = $('#catChips');
    w.innerHTML = '';
    CATS.forEach((c) => w.appendChild(h('button.chip' + (App.cat === c ? '.on' : ''), { onclick: () => { App.cat = c; App.renderCats(); App.renderGrid(); } }, c)));
  };
  App.renderGrid = function () {
    const grid = $('#songGrid');
    const q = ($('#search').value || '').trim().toLowerCase();
    grid.innerHTML = '';
    const list = App.entries().filter((e) => (App.cat === '全部' || e.cat === App.cat) && (!q || (e.title + e.sub).toLowerCase().includes(q)));
    if (!list.length) grid.appendChild(h('div.foot', null, App.cat === '我的导入' ? '还没有导入的歌曲 —— 把 MIDI / MP3 拖到上方即可。' : '没有找到匹配的歌曲'));
    list.forEach((e) => {
      const best = BS.store.get('best:' + e.id, null);
      const lead = BS.INST[e.lead] || BS.INST.piano;
      const colors = e.colors || ['#7a5cff', '#ff7eb3'];
      let diff = 2;
      try { diff = e.kind === 'builtin' ? App.defDifficulty(e.song) : (e.data && e.data.tracks ? BS.songDifficulty(e.data, 0) : 2); } catch (err) {}
      const card = h('div.card.glass', { onclick: () => App.openSetup(e) },
        best ? h('div.best', null, best.grade + ' · ' + best.score) : null,
        h('button.dl', { title: '下载', onclick: (ev) => { ev.stopPropagation(); App.downloadEntry(e); } }, '⬇'),
        e.kind !== 'builtin' ? h('button.del', { title: '删除', onclick: (ev) => { ev.stopPropagation(); App.removeImport(e.id); } }, '✕') : null,
        h('div.cover', { style: { background: 'linear-gradient(135deg,' + colors[0] + '26,' + colors[1] + '26)' } },
          h('span.tag', null, e.cat), h('div.big-icon', null, e.kind === 'audio' ? '🎧' : e.kind === 'midi' ? '🎼' : lead.icon)),
        h('div.card-body', null,
          h('h3', null, e.title),
          h('div.sub', null, e.sub || ''),
          h('div.meta', null,
            e.style ? h('span', null, e.style) : null,
            h('span', null, Math.round(e.bpm || 100) + ' BPM'),
            h('span', null, lead.icon + ' ' + lead.name),
            h('span.stars', null, '★'.repeat(diff) + '☆'.repeat(5 - diff)))));
      grid.appendChild(card);
    });
  };

  // ---------------- 选歌设置 ----------------
  App.openSetup = async function (entry) {
    let comp;
    try { comp = App.getCompiled(entry); } catch (e) { console.error(e); BS.toast('这首歌解析失败', 'warn'); return; }
    if (comp.source === 'audio' && comp.tracks.some((t) => t.inst === 'audio' && !t.audio)) {
      try {
        const blob = await idb.get('audio:' + comp.id);
        if (blob) { const buf = await A.init().decodeAudioData(await blob.arrayBuffer()); comp.tracks.forEach((t) => { if (t.inst === 'audio') t.audio = buf; }); }
      } catch (e) { console.warn(e); }
    }
    setTimeout(() => App.prepMp3(comp), 300); // 趁选歌的时间提前把 MP3 生成好
    const st = { mode: App.setup.mode, diff: App.setup.diff, part: comp.tracks.findIndex((t) => t.role === 'lead'), rate: P.rate || 1 };
    if (st.part < 0) st.part = comp.tracks.findIndex((t) => t.inst !== 'audio');
    const lead = BS.INST[(comp.tracks[st.part] || {}).inst] || BS.INST.piano;
    const colors = entry.colors || ['#7a5cff', '#ff7eb3'];
    const modal = $('#modal');
    // 导入的音频：换一种编曲风格 / 是否混入原声
    const restyle = (k) => {
      const audio = (comp.tracks.find((t) => t.inst === 'audio') || {}).audio;
      const nc = BS.Analyzer.toSong(comp.analysis, audio, comp.title, k, comp.id);
      entry.data = nc; comp = nc;
      App.saveImports();
      st.part = comp.tracks.findIndex((t) => t.role === 'lead');
      render();
      setTimeout(() => App.prepMp3(comp), 200);
    };
    const setOriginal = (on) => { const t = comp.tracks.find((x) => x.inst === 'audio'); if (t) { t.mute = !on; App.saveImports(); render(); setTimeout(() => App.prepMp3(comp), 200); } };
    const render = () => {
      modal.innerHTML = '';
      const tr = comp.tracks[st.part];
      const origTrack = comp.tracks.find((t) => t.inst === 'audio');
      const instOptions = BS.INST_ORDER.filter((k) => (tr && tr.inst === 'drums' ? k === 'drums' : k !== 'drums'));
      modal.append(
        h('button.icon-btn.close-x', { onclick: App.closeModal }, '✕'),
        h('div.modal-head', null,
          h('div.modal-cover', { style: { background: 'linear-gradient(135deg,' + colors[0] + '26,' + colors[1] + '26)' } }, lead.icon),
          h('div', null, h('h2', null, comp.title), h('div.sub', null, (comp.sub || '') + ' · ' + Math.round(comp.bpm) + ' BPM · ' + comp.tracks.length + ' 个声部 · ' + BS.fmtTime((comp.lengthBeats * 60) / comp.bpm)))),
        h('div.modes', null, ...[
          ['listen', '🎧', '欣赏演出', '整支乐队完整演奏，看灯光、听现场'],
          ['play', '🎹', '上台演奏', '你来弹一个声部，乐队伴奏、实时打分'],
          ['wait', '🧘', '跟练模式', '音符到了就等你，弹对才继续'],
        ].map(([k, e, t, d]) => h('div.mode-card' + (st.mode === k ? '.on' : ''), { onclick: () => { st.mode = k; render(); } }, h('div.e', null, e), h('b', null, t), h('small', null, d)))),
        h('div.field', null, h('label', null, st.mode === 'listen' ? '👀 跟随显示的声部' : '🎼 选择你要演奏的声部'),
          h('div.parts', null, ...comp.tracks.map((t, i) => t.inst === 'audio' ? null : h('div.part' + (i === st.part ? '.on' : ''), { onclick: () => { st.part = i; render(); } },
            h('i', null, (BS.INST[t.inst] || {}).icon || '🎵'), h('div', null, t.name, h('small', null, BS.INST[t.inst].name + ' · ' + t.notes.length + ' 音')))))),
        tr && st.mode !== 'listen' ? h('div.field', null, h('label', null, '🎻 用什么乐器演奏'),
          h('select.chip', { onchange: (e) => { tr.inst = e.target.value; tr.color = BS.INST[tr.inst].color; } }, ...instOptions.map((k) => h('option', { value: k, selected: k === tr.inst }, BS.INST[k].icon + ' ' + BS.INST[k].name)))) : null,
        st.mode !== 'listen' ? h('div.field', null, h('label', null, '🎯 判定难度'),
          h('div.seg', null, ...[['easy', '简单 · 任意键都算对'], ['normal', '普通 · 音名对即可'], ['pro', '专家 · 八度也要对']].map(([k, t]) => h('button' + (st.diff === k ? '.on' : ''), { onclick: () => { st.diff = k; render(); } }, t)))) : null,
        h('div.field', null, h('label', null, '⏱ 速度 ' + Math.round(st.rate * 100) + '%'),
          h('div.seg', null, ...[0.5, 0.75, 0.9, 1, 1.25].map((r) => h('button' + (Math.abs(st.rate - r) < 0.01 ? '.on' : ''), { onclick: () => { st.rate = r; render(); } }, Math.round(r * 100) + '%')))),
        comp.analysis ? h('div.field', null, h('label', null, '🎼 编曲风格（当前：' + BS.Analyzer.styleName(comp.style) + '）'),
          h('div.seg', null, ...(comp.analysis.ai ? ['faithful'] : []).concat(['pop', 'ballad', 'rock', 'waltz', 'classical', 'jazz', 'chinese']).map((k) => h('button' + (comp.style === k ? '.on' : ''), { onclick: () => restyle(k) }, BS.Analyzer.styleName(k))))) : null,
        comp.analysis && origTrack ? h('div.field', null, h('label', null, '🎙 原声'),
          h('div.seg', null,
            h('button' + (origTrack.mute ? '.on' : ''), { onclick: () => setOriginal(false) }, '只听乐器版（推荐）'),
            h('button' + (!origTrack.mute ? '.on' : ''), { onclick: () => setOriginal(true) }, '同时混入原声'))) : null,
        h('div.row.end', null,
          h('button.btn', { onclick: () => { BS.download(new Blob([BS.Midi.write(comp)], { type: 'audio/midi' }), comp.title + '.mid'); } }, '⬇ MIDI'),
          h('button.btn', { onclick: () => App.downloadFull(comp) }, '⬇ 下载 MP3'),
          h('button.btn.primary', { onclick: () => { App.closeModal(); App.setup.mode = st.mode; App.setup.diff = st.diff; BS.store.set('lastMode', st.mode); BS.store.set('lastDiff', st.diff); App.startSong(comp, st, entry); } }, st.mode === 'listen' ? '🎧 开始演出' : '🎤 上台！'))
      );
    };
    render();
    App.openModal();
  };

  App.openModal = () => $('#modalWrap').classList.add('open');
  App.closeModal = () => { $('#modalWrap').classList.remove('open'); if (App.onModalClose) { const f = App.onModalClose; App.onModalClose = null; f(); } };

  // ---------------- 开始演奏歌曲 ----------------
  App.startSong = function (comp, st, entry) {
    A.init();
    App.ctx = 'song';
    App.entry = entry;
    App.lastSetup = st;
    App.userIdx = st.part;
    P.rate = st.rate;
    $('#rate').value = st.rate;
    $('#rateVal').textContent = Math.round(st.rate * 100) + '%';
    P.load(comp, { userIdx: st.part, mode: st.mode });
    if (!(App.concert && App.concert.running)) setTimeout(() => App.prepMp3(comp), 1500);
    G.reset(comp, st.mode === 'listen' ? -1 : st.part, st.diff);
    const tr = comp.tracks[st.part];
    App.userInst = tr ? tr.inst : 'piano';
    S.setSong(comp, st.mode === 'listen' ? -1 : st.part);
    H.trackIdx = st.part;
    $('#jamBar').classList.add('hidden');
    $('#hudScore').classList.toggle('hidden', st.mode === 'listen');
    $('#hudTitle').textContent = comp.title;
    $('#hudSub').textContent = st.mode === 'listen' ? '欣赏模式 · 整支乐队为你演出' : (st.mode === 'wait' ? '跟练模式' : '演奏模式') + ' · 你负责：' + (tr ? tr.name + '（' + BS.INST[tr.inst].name + '）' : '');
    $('#modeLabel').textContent = { listen: '欣赏', play: '演奏', wait: '跟练' }[st.mode];
    App.updateScoreHud();
    App.buildView();
    App.renderInstPick();
    App.renderProgress();
    App.renderMixer();
    $('.stage-grid').style.setProperty('--hw', st.mode === 'listen' ? 'clamp(70px, 14vh, 150px)' : 'clamp(110px, 24vh, 260px)');
    App.go('stage');
    setTimeout(() => { App.view && App.view.resize(); P.play(); }, 450);
  };

  // ---------------- 自由演奏 ----------------
  App.enterJam = function (keepPlaying) {
    A.init();
    const j = App.jam;
    const wasPlaying = keepPlaying && P.playing && App.ctx === 'jam';
    const prog = T.PROGRESSIONS[j.prog] || T.PROGRESSIONS[0];
    const loop = T.makeLoop({ prog: prog.c, style: j.style, keyPc: j.key, bpm: j.bpm });
    loop.title = '自由演奏 · ' + T.STYLES[j.style].name;
    loop.sub = prog.name + ' · ' + T.KEYS[j.key] + ' 调';
    loop.jamChords = [...new Set(prog.c.split(/\s+/).map((n) => T.transposeChord(n, j.key)))];
    App.ctx = 'jam';
    App.userIdx = -1;
    P.rate = 1;
    P.load(loop, { userIdx: -1, mode: 'listen' });
    G.reset(loop, -1);
    S.setSong(loop, -1, { icon: BS.INST[App.userInst].icon, color: BS.INST[App.userInst].color, inst: BS.INST[App.userInst].name });
    H.trackIdx = -1;
    $('.stage-grid').style.setProperty('--hw', '0px');
    $('#hudScore').classList.add('hidden');
    $('#hudTitle').textContent = '自由演奏';
    $('#hudSub').textContent = '选择任意乐器即兴演奏 · 按 ▶ 让乐队为你伴奏';
    $('#modeLabel').textContent = '即兴';
    App.renderJamBar();
    App.buildView();
    App.renderInstPick();
    App.renderProgress();
    App.renderMixer();
    if (wasPlaying) P.play();
  };
  App.renderJamBar = function () {
    const bar = $('#jamBar');
    const j = App.jam;
    bar.classList.remove('hidden');
    bar.innerHTML = '';
    const save = () => { BS.store.set('jam', j); App.enterJam(true); };
    bar.append(
      h('select.chip', { title: '伴奏风格', onchange: (e) => { j.style = e.target.value; save(); } }, ...Object.keys(T.STYLES).map((k) => h('option', { value: k, selected: k === j.style }, '🎼 ' + T.STYLES[k].name))),
      h('select.chip', { title: '和弦进行', onchange: (e) => { j.prog = +e.target.value; save(); } }, ...T.PROGRESSIONS.map((p, i) => h('option', { value: i, selected: i === j.prog }, p.name))),
      h('select.chip', { title: '调', onchange: (e) => { j.key = +e.target.value; save(); } }, ...T.KEYS.map((k, i) => h('option', { value: i, selected: i === j.key }, k + ' 调'))),
      h('label.chip', { title: '速度' }, '♩=', h('input', { type: 'number', min: 50, max: 200, value: j.bpm, onchange: (e) => { j.bpm = BS.clamp(+e.target.value || 100, 50, 200); save(); } })),
      h('button.chip.on', { onclick: () => P.toggle() }, P.playing ? '⏸ 停止乐队' : '▶ 乐队伴奏')
    );
  };

  // ---------------- 乐器选择 & 视图 ----------------
  App.renderInstPick = function () {
    const w = $('#instPick');
    w.innerHTML = '';
    let list = BS.INST_ORDER;
    if (App.ctx === 'song' && App.userIdx >= 0) {
      const tr = P.song.tracks[App.userIdx];
      list = tr && tr.inst === 'drums' ? ['drums'] : list.filter((k) => k !== 'drums');
    }
    list.forEach((k) => {
      const d = BS.INST[k];
      const c = h('button.inst-chip' + (k === App.userInst ? '.on' : ''), { style: { '--c': d.color }, onclick: () => App.setUserInst(k) }, h('span.dot'), h('i', null, d.icon), d.name);
      w.appendChild(c);
    });
    const on = w.querySelector('.on');
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    $('#btnViewKeys').classList.toggle('on', App.forceKeys);
    $('#btnViewKeys').classList.toggle('hidden', ['keys', 'drums'].includes(BS.INST[App.userInst].view));
  };
  App.setUserInst = function (k) {
    A.init();
    App.releaseAllLive();
    App.userInst = k;
    A.loadSamples(k);
    if (App.ctx === 'song' && App.userIdx >= 0) {
      const tr = P.song.tracks[App.userIdx];
      tr.inst = k; tr.color = BS.INST[k].color;
      S.setSong(P.song, P.mode === 'listen' ? -1 : App.userIdx);
      App.renderMixer();
    } else {
      BS.store.set('jamInst', k);
      S.setSong(P.song, -1, { icon: BS.INST[k].icon, color: BS.INST[k].color, inst: BS.INST[k].name });
    }
    App.forceKeys = false;
    App.buildView();
    App.renderInstPick();
  };
  App.buildView = function () {
    if (App.view) App.view.destroy();
    const host = $('#instHost');
    host.innerHTML = '';
    const v = (App.view = BS.Views.create(App.userInst, host, {
      onPlay: App.onPlay, onRelease: App.onRelease, onGlide: App.onGlide, onSustain: App.onSustain, onStrum: App.onStrum, onSeq: App.onSeq,
      getBpm: () => (App.ctx === 'jam' ? App.jam.bpm : P.bpm * P.rate),
      getChord: () => { const c = P.currentChord(P.visBeat() + 0.6); return c && c.name; },
    }, App.forceKeys));
    const tr = App.ctx === 'song' && App.userIdx >= 0 ? P.song.tracks[App.userIdx] : null;
    v.setSong(P.song, tr);
    H.view = v;
    H.useView = v.type === 'keys' || v.type === 'harp';
    H.lanes = H.lanesFor(tr);
    H.drums = tr && tr.inst === 'drums';
    App._hintKey = '';
    requestAnimationFrame(() => v.resize());
  };

  // ---------------- 实时演奏 ----------------
  App.liveDest = function () {
    if (App.ctx === 'song' && App.userIdx >= 0 && P.chans[App.userIdx]) return P.chans[App.userIdx].input;
    if (!App.liveChan) App.liveChan = A.channel(0.9, 0, 0.25);
    return App.liveChan.input;
  };
  App.pulseUser = (amt) => S.pulse(App.ctx === 'song' && P.mode !== 'listen' ? App.userIdx : -1, amt);

  App.onPlay = function (key, m, vel) {
    A.init();
    if (App.live[key]) App.onRelease(key);
    const inst = App.userInst;
    let ms = [m];
    if (G.active) {
      const r = G.input(inst === 'drums' ? m : m - P.transpose);
      if (r && G.diff === 'easy' && inst !== 'drums') ms = r.notes.map((x) => x + P.transpose);
      else if (!r && G.diff === 'easy' && inst !== 'drums') vel *= 0.35;
    }
    const dest = App.liveDest();
    let voices = null;
    if (inst === 'drums') { ms.forEach((n) => { A.drum(n, vel, 0, dest); S.drumHit(BS.drumNorm(n)); }); }
    else voices = ms.map((n) => A.voice(inst, n, vel, 0, dest));
    App.live[key] = { voices, ms };
    if (App.view && inst !== 'drums') ms.forEach((n) => App.view.pressOn(n));
    App.pulseUser(0.6);
  };
  App.onRelease = function (key) {
    const l = App.live[key];
    if (!l) return;
    delete App.live[key];
    if (App.view && App.userInst !== 'drums') l.ms.forEach((n) => App.view.pressOff(n));
    if (!l.voices) return;
    if (PLUCKED.includes(App.userInst)) return; // 拨弦/击奏类自然衰减
    if (App.sustain && SUSTAINABLE.includes(App.userInst)) App.sustained.push(...l.voices);
    else l.voices.forEach((v) => v && v.stop(A.now()));
  };
  App.onGlide = function (key, m) {
    const l = App.live[key];
    if (!l || !l.voices) return;
    l.voices.forEach((v) => v && v.bend(m));
    const r = Math.round(m);
    if (r !== l.ms[0]) {
      App.view.pressOff(l.ms[0]);
      l.ms = [r];
      App.view.pressOn(r);
      if (G.active) G.input(r - P.transpose);
    }
  };
  App.onSustain = function (on) {
    App.sustain = on;
    const b = $('.chip.pedal');
    if (b) b.classList.toggle('on', on);
    if (!on) { App.sustained.forEach((v) => v && v.stop(A.now())); App.sustained = []; }
  };
  App.onStrum = function (notes, vel, when) {
    A.init();
    const t0 = when || A.now();
    const dest = App.liveDest();
    notes.forEach((n, i) => {
      const v = A.voice(App.userInst, n, vel * (1 - i * 0.03), t0 + i * 0.016, dest);
      if (v) v.stop(t0 + 2.8);
      if (G.active && !when) G.input(n - P.transpose);
      const d = Math.max(0, (t0 - A.now()) * 1000) + i * 16;
      setTimeout(() => { if (App.view) { App.view.autoOn(n, '#ff7eb3'); setTimeout(() => App.view && App.view.autoOff(n), 220); } }, d);
    });
    setTimeout(() => App.pulseUser(0.6), Math.max(0, (t0 - A.now()) * 1000));
  };
  App.onSeq = function (n, vel, when) {
    A.drum(n, vel, when, App.liveDest());
    setTimeout(() => { if (App.view) App.view.autoOn(n); S.drumHit(n); App.pulseUser(0.3); }, Math.max(0, (when - A.now()) * 1000));
  };
  App.releaseAllLive = function () {
    Object.keys(App.live).forEach((k) => App.onRelease(k));
    App.onSustain(false);
  };

  // ---------------- 走带 UI ----------------
  App.renderProgress = function () {
    const s = P.song;
    const box = $('#progSecs');
    box.innerHTML = '';
    if (!s) return;
    const start = P.startPoint(), len = s.lengthBeats - start;
    s.sections.forEach((sec) => {
      const w = ((sec.end - sec.t) / len) * 100;
      box.appendChild(h('div', { style: { width: w + '%', marginLeft: sec === s.sections[0] ? ((sec.t - start) / len) * 100 + '%' : 0, background: 'rgba(255,255,255,' + (0.02 + sec.level * 0.025) + ')' } }, w > 6 ? sec.name : ''));
    });
  };
  App.updateTransport = function () {
    const s = P.song;
    if (!s) return;
    const beat = P.playing ? P.beatNow() : P.beat;
    const start = P.startPoint();
    const frac = BS.clamp((beat - start) / (s.lengthBeats - start), 0, 1);
    $('#progFill').style.width = frac * 100 + '%';
    $('#progHead').style.left = 'calc(' + frac * 100 + '% - 2px)';
    $('#tpTime').textContent = BS.fmtTime((beat * 60) / P.bpm) + ' / ' + BS.fmtTime((s.lengthBeats * 60) / P.bpm);
  };
  App.seekFromEvent = function (e) {
    const s = P.song;
    if (!s) return;
    const r = $('#progress').getBoundingClientRect();
    const f = BS.clamp((e.clientX - r.left) / r.width, 0, 1);
    const start = P.startPoint();
    P.seek(start + f * (s.lengthBeats - start));
  };

  App.updateScoreHud = function (pop) {
    $('#hudPoints').textContent = G.score || 0;
    $('#hudCombo').textContent = G.combo || 0;
    const c = G.counts || {};
    const judged = (c.perfect || 0) + (c.great || 0) + (c.good || 0) + (c.miss || 0);
    $('#hudAcc').textContent = judged ? Math.round((((c.perfect || 0) + (c.great || 0) * 0.7 + (c.good || 0) * 0.4) / judged) * 100) + '%' : '--';
    if (pop) { const el = $('#hudCombo').parentNode; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  };
  let centerTimer = 0;
  App.center = function (text, color, ms) {
    const c = $('#hudCenter');
    c.textContent = text;
    c.style.color = color || '#fff';
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    clearTimeout(centerTimer);
    centerTimer = setTimeout(() => c.classList.remove('show'), ms || 600);
  };

  // ---------------- 混音台 ----------------
  App.renderMixer = function () {
    const body = $('#mixerBody');
    body.innerHTML = '';
    const s = P.song;
    if (!s) return;
    const master = h('div.mix-master', null,
      h('b', null, '总控'),
      h('label', null, '总音量', h('input', { type: 'range', min: 0, max: 1.2, step: 0.01, value: BS.store.get('masterVol', 0.85), oninput: (e) => A.setMaster(+e.target.value) }), h('span')),
      h('label', null, '音乐厅混响', h('input', { type: 'range', min: 0, max: 2, step: 0.01, value: BS.store.get('reverb', 0.8), oninput: (e) => A.setReverb(+e.target.value) }), h('span')),
      App.ctx === 'song' ? h('label', null, '移调', h('input', { type: 'range', min: -6, max: 6, step: 1, value: P.transpose, oninput: (e) => { P.transpose = +e.target.value; e.target.nextSibling.textContent = (P.transpose > 0 ? '+' : '') + P.transpose; if (P.playing) P.seek(P.beatNow()); } }), h('span', null, (P.transpose > 0 ? '+' : '') + P.transpose)) : null,
      App.ctx === 'song' && P.mode !== 'listen' ? h('label', null, '漏音补奏', h('input', { type: 'checkbox', checked: P.assist, onchange: (e) => { P.assist = e.target.checked; } }), h('span')) : null,
      h('div.row', null,
        h('button.chip', { onclick: () => BS.download(new Blob([BS.Midi.write(s)], { type: 'audio/midi' }), s.title + '.mid') }, '⬇ 导出 MIDI'),
        h('button.chip', { onclick: () => { s.tracks.forEach((t) => { t.mute = false; t.solo = false; }); P.applyMix(); App.renderMixer(); } }, '重置静音/独奏'))
    );
    body.appendChild(master);
    s.tracks.forEach((tr, i) => {
      const def = BS.INST[tr.inst] || { icon: '🎙️', name: '音频', color: '#fff' };
      const me = i === App.userIdx && P.mode !== 'listen';
      const row = h('div.mix-row' + (me ? '.me' : ''), { style: { '--c': tr.color || def.color } },
        h('div.mix-ico', null, def.icon),
        h('div.mix-name', null, (me ? '★ ' : '') + tr.name, h('small', null, def.name + ' · ' + (tr.notes.length || '原声') + (tr.notes.length ? ' 音' : ''))),
        h('div.ms', null,
          h('button.m' + (tr.mute ? '.on' : ''), { title: '静音', onclick: (e) => { tr.mute = !tr.mute; e.target.classList.toggle('on', tr.mute); P.applyMix(); } }, 'M'),
          h('button.s' + (tr.solo ? '.on' : ''), { title: '独奏', onclick: (e) => { tr.solo = !tr.solo; e.target.classList.toggle('on', tr.solo); P.applyMix(); } }, 'S')),
        h('div.mix-ctrl', null,
          h('label', null, '音量', h('input', { type: 'range', min: 0, max: 1.3, step: 0.01, value: tr.vol, oninput: (e) => { tr.vol = +e.target.value; P.applyMix(); } })),
          h('label', null, '声像', h('input', { type: 'range', min: -1, max: 1, step: 0.05, value: tr.pan || 0, oninput: (e) => { tr.pan = +e.target.value; P.applyMix(); } })),
          tr.inst !== 'audio' ? h('select.chip', { onchange: (e) => App.changeTrackInst(i, e.target.value) }, ...BS.INST_ORDER.filter((k) => (tr.inst === 'drums') === (k === 'drums')).map((k) => h('option', { value: k, selected: k === tr.inst }, BS.INST[k].icon + ' 换成 ' + BS.INST[k].name))) : null));
      body.appendChild(row);
    });
  };
  App.changeTrackInst = function (i, k) {
    const tr = P.song.tracks[i];
    tr.inst = k; tr.color = BS.INST[k].color;
    A.loadSamples(k);
    if (i === App.userIdx && App.ctx === 'song') { App.setUserInst(k); return; }
    S.setSong(P.song, App.ctx === 'song' && P.mode !== 'listen' ? App.userIdx : -1, App.ctx === 'jam' ? { icon: BS.INST[App.userInst].icon, color: BS.INST[App.userInst].color, inst: BS.INST[App.userInst].name } : null);
    App.renderMixer();
  };

  // ---------------- 结算 ----------------
  App.showResults = function () {
    const r = G.result();
    const id = App.entry ? App.entry.id : P.song.id;
    const prev = BS.store.get('best:' + id, null);
    const isBest = !prev || r.score > prev.score;
    if (isBest) BS.store.set('best:' + id, { score: r.score, grade: r.grade });
    if (r.grade === 'S' || r.grade === 'A') { S.burst(220); for (let i = 0; i < 5; i++) setTimeout(S.firework, i * 350); }
    const modal = $('#modal');
    modal.innerHTML = '';
    modal.append(
      h('div.sub', { style: { textAlign: 'center', marginBottom: 0 } }, P.song.title + ' · 演出结束'),
      h('div.grade', null, r.grade),
      h('div', { style: { textAlign: 'center', fontSize: '28px', fontWeight: 800 } }, r.score.toLocaleString(), isBest ? h('span.chip.on', { style: { marginLeft: '10px', fontSize: '12px', verticalAlign: 'middle' } }, '新纪录！') : null),
      h('div.stats', null,
        h('div.stat', null, h('b', null, Math.round(r.acc * 100) + '%'), h('small', null, '准确率')),
        h('div.stat', null, h('b', null, r.maxCombo), h('small', null, '最大连击')),
        h('div.stat', null, h('b', { style: { color: '#ffd479' } }, r.counts.perfect), h('small', null, 'Perfect')),
        h('div.stat', null, h('b', { style: { color: '#6ee7f9' } }, r.counts.great), h('small', null, 'Great')),
        h('div.stat', null, h('b', { style: { color: '#86efac' } }, r.counts.good), h('small', null, 'Good')),
        h('div.stat', null, h('b', { style: { color: '#9ca3af' } }, r.counts.miss), h('small', null, 'Miss')),
        h('div.stat', null, h('b', null, r.total), h('small', null, '总音符')),
        h('div.stat', null, h('b', null, prev ? prev.score : '—'), h('small', null, '之前最佳'))),
      h('div.row.end', null,
        h('button.btn', { onclick: () => { App.closeModal(); App.go('library'); } }, '返回曲库'),
        h('button.btn', { onclick: () => App.downloadFull(P.song) }, '⬇ 下载 MP3'),
        h('button.btn', { onclick: () => { App.closeModal(); App.openSetup(App.entry); } }, '换个声部'),
        h('button.btn.primary', { onclick: () => { App.closeModal(); App.restart(); } }, '再来一次'))
    );
    App.openModal();
  };
  App.restart = function () {
    App.releaseAllLive();
    P.stop();
    if (App.ctx === 'song') G.reset(P.song, P.mode === 'listen' ? -1 : App.userIdx, G.diff);
    App.updateScoreHud();
    P.play();
  };

  // ---------------- 录音 ----------------
  App.toggleRec = async function () {
    const b = $('#btnRec');
    if (!A.recorder) {
      if (A.startRecording()) { b.classList.add('on'); b.textContent = '⏹ 停止录音'; BS.toast('🔴 正在录制整场演出（含你的演奏）'); }
      return;
    }
    const blob = await A.stopRecording();
    b.classList.remove('on'); b.textContent = '⏺ 录音';
    if (!blob || !blob.size) return;
    const url = URL.createObjectURL(blob);
    const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
    const modal = $('#modal');
    modal.innerHTML = '';
    modal.append(h('button.icon-btn.close-x', { onclick: App.closeModal }, '✕'), h('h2', null, '🎙️ 你的演出录音'), h('div.sub', null, '时长约 ' + BS.fmtTime((blob.size / 16000)) + ' · 可直接试听和下载'),
      h('audio', { controls: true, src: url, style: { width: '100%' } }),
      h('div.row.end', null, h('button.btn.primary', { onclick: () => BS.download(blob, (P.song ? P.song.title : '演出') + '-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '') + '.' + ext) }, '⬇ 下载录音')));
    App.openModal();
  };

  // ---------------- 设置 ----------------
  App.openSettings = function () {
    const modal = $('#modal');
    const render = () => {
      modal.innerHTML = '';
      const q = A.quality;
      modal.append(
        h('button.icon-btn.close-x', { onclick: App.closeModal }, '✕'),
        h('h2', null, '⚙ 设置'), h('div.sub', null, '个性化你的舞台'),
        h('div.field', null, h('label', null, '🎻 音色'),
          h('div.seg', null,
            h('button' + (q === 'sample' ? '.on' : ''), { onclick: () => { A.setQuality('sample'); A.init(); Object.keys(BS.INST).forEach((k) => (P.song && P.song.tracks.some((t) => t.inst === k)) && A.loadSamples(k)); A.loadSamples('piano'); render(); } }, '真实采样（联网，更逼真）'),
            h('button' + (q === 'synth' ? '.on' : ''), { onclick: () => { A.setQuality('synth'); render(); } }, '合成音色（离线，零延迟加载）'))),
        h('div.field', null, h('label', null, '🌊 音符下落时长 ' + BS.store.get('hwSec', 2.4).toFixed(1) + ' 秒（越短越快）'),
          h('input', { type: 'range', min: 1, max: 4.5, step: 0.1, value: BS.store.get('hwSec', 2.4), style: { width: '100%' }, oninput: (e) => { BS.store.set('hwSec', +e.target.value); e.target.previousSibling.textContent = '🌊 音符下落时长 ' + (+e.target.value).toFixed(1) + ' 秒（越短越快）'; } })),
        h('div.field', null, h('label', null, '🎯 判定延迟校准 ' + BS.store.get('calib', 0) + ' ms（蓝牙耳机可调负值）'),
          h('input', { type: 'range', min: -250, max: 150, step: 5, value: BS.store.get('calib', 0), style: { width: '100%' }, oninput: (e) => { BS.store.set('calib', +e.target.value); e.target.previousSibling.textContent = '🎯 判定延迟校准 ' + e.target.value + ' ms（蓝牙耳机可调负值）'; } })),
        h('div.field', null, h('label', null, '🎹 琴键高度'),
          h('input', { type: 'range', min: 110, max: 280, step: 5, value: BS.store.get('kbdH', 190), style: { width: '100%' }, oninput: (e) => { BS.store.set('kbdH', +e.target.value); App.applyKbdH(); } })),
        h('div.field', null, h('label', null, '⌨ 快捷键'),
          h('div.kbd-help', null,
            h('kbd', null, 'Enter'), '播放 / 暂停',
            h('kbd', null, '← →'), '快退 / 快进一小节',
            h('kbd', null, '↑ ↓'), '钢琴切换八度',
            h('kbd', null, 'Z S X D C …'), '钢琴低音区（白键 Z X C V B N M，黑键 S D G H J）',
            h('kbd', null, 'Q 2 W 3 E …'), '钢琴高音区',
            h('kbd', null, 'Space'), '延音踏板 / 吉他扫弦 / 底鼓',
            h('kbd', null, 'MIDI 键盘'), '插上即用，支持力度与延音踏板')),
        h('div.row.end', null,
          h('button.btn', { onclick: async () => { App.imports = []; await idb.put('imports', []).catch(() => {}); BS.toast('已清除导入的歌曲'); App.renderGrid(); } }, '清除导入的歌曲'),
          h('button.btn.primary', { onclick: App.closeModal }, '完成'))
      );
    };
    render();
    App.openModal();
  };
  App.applyKbdH = function () {
    const v = BS.store.get('kbdH', null);
    if (v == null) return;
    document.documentElement.style.setProperty('--kbd-h', v + 'px');
    document.documentElement.style.setProperty('--harp-h', v + 'px');
  };

  // ---------------- 导入 ----------------
  App.saveImports = async function () {
    const plain = App.imports.map((e) => {
      if (e.kind !== 'audio') return e;
      const d = Object.assign({}, e.data, { tracks: e.data.tracks.map((t) => (t.audio ? Object.assign({}, t, { audio: null }) : t)) });
      return Object.assign({}, e, { data: d });
    });
    try { await idb.put('imports', plain); } catch (err) { console.warn(err); BS.toast('本地存储不可用，导入的歌曲仅本次有效', 'warn'); }
  };
  App.addImport = async function (entry) {
    App.imports.unshift(entry);
    await App.saveImports();
    App.cat = '我的导入';
    App.renderCats();
    App.renderGrid();
  };
  // 下载完整演奏：离线渲染整支乐队（无掌声欢呼），直接编码为 MP3
  // MP3 预生成：歌曲一开始播放就在后台渲染编码，点按钮时直接下载
  App.mp3Cache = {};
  App.mp3Jobs = {};
  App.mp3Key = (comp) => comp.id + '|' + comp.tracks.map((t) => [t.inst, t.vol, t.pan, t.mute, t.solo, t.send].join(',')).join('|');
  App.prepMp3 = function (comp) {
    const key = App.mp3Key(comp);
    if (App.mp3Cache[key] || App.mp3Jobs[key]) return App.mp3Jobs[key];
    A.init();
    const job = A.ensureSamples(comp.tracks.map((t) => t.inst)).then(() => A.renderSong(comp)).then(async (buf) => {
      const blob = await A.encodeMp3Async(buf);
      App.mp3Cache[key] = blob;
      return blob;
    }).catch((err) => { console.error(err); return null; }).finally(() => { delete App.mp3Jobs[key]; });
    App.mp3Jobs[key] = job;
    return job;
  };
  App.downloadFull = async function (comp) {
    const key = App.mp3Key(comp);
    let blob = App.mp3Cache[key];
    if (!blob) {
      BS.toast('正在准备「' + comp.title + '」，好了就自动下载…');
      blob = await App.prepMp3(comp);
    }
    if (!blob) { BS.toast('下载失败，请重试', 'warn'); return; }
    BS.download(blob, comp.title + '.mp3');
    BS.toast('已下载：' + comp.title + '.mp3');
  };

  // 下载：导入的音频下载原文件；其余歌曲（内置 / 导入的 MIDI / 简谱）下载 MIDI
  App.downloadEntry = async function (entry) {
    try {
      if (entry.kind === 'audio') {
        const blob = await idb.get('audio:' + entry.id);
        if (!blob) { BS.toast('原始音频不存在，已改为下载 MIDI', 'warn'); }
        else {
          const name = blob.name || entry.title + '.mp3';
          BS.download(blob, name);
          BS.toast('已下载原曲：' + name);
          return;
        }
      }
      const comp = App.getCompiled(entry);
      BS.download(new Blob([BS.Midi.write(comp)], { type: 'audio/midi' }), entry.title + '.mid');
      BS.toast('已下载 MIDI：' + entry.title + '.mid');
    } catch (err) {
      console.error(err);
      BS.toast('下载失败：' + (err.message || err), 'warn');
    }
  };

  App.removeImport = async function (id) {
    App.imports = App.imports.filter((e) => e.id !== id);
    delete App.compiled[id];
    idb.del('audio:' + id).catch(() => {});
    await App.saveImports();
    App.renderGrid();
  };

  App.handleFiles = async function (files) {
    const f = files && files[0];
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const title = f.name.replace(/\.[^.]+$/, '');
    A.init();
    try {
      if (['mid', 'midi', 'kar', 'rmi'].includes(ext)) {
        const parsed = BS.Midi.parse(await f.arrayBuffer());
        const comp = BS.Midi.toSong(parsed, title);
        if (!comp.tracks.length) throw new Error('MIDI 里没有音符');
        const entry = { kind: 'midi', id: comp.id, title, sub: comp.sub, bpm: comp.bpm, lead: comp.tracks[0].inst, colors: ['#4f46e5', '#ec4899'], data: comp };
        await App.addImport(entry);
        BS.toast('🎼 解析完成：' + comp.tracks.length + ' 个声部，已为你自动识别主旋律');
        App.openSetup(entry);
      } else if (ext === 'txt') {
        App.openJianpu(await f.text(), title);
      } else {
        await App.importAudio(f, title);
      }
    } catch (e) {
      console.error(e);
      BS.toast('导入失败：' + (e.message || e), 'warn');
      App.closeModal();
    }
  };

  App.importAudio = async function (f, title) {
    const modal = $('#modal');
    modal.innerHTML = '';
    const bar = h('div');
    const msg = h('div.sub', null, '正在解码音频…');
    modal.append(h('h2', null, '🎧 AI 正在解析「' + title + '」'), h('div.sub', null, '检测速度与节拍 · 识别和弦与鼓点 · 神经网络逐音转谱 · 自动编配乐队'), h('div.progressbar', null, bar), msg);
    App.openModal();
    const ab = await f.arrayBuffer();
    const buf = await new Promise((res, rej) => A.ctx.decodeAudioData(ab.slice(0), res, rej));
    const res = await BS.Analyzer.analyze(buf, (p, m) => { bar.style.width = Math.round(p * 35) + '%'; msg.textContent = m; });
    try {
      const ai = await BS.Analyzer.transcribeAI(buf, (p, m) => { bar.style.width = Math.round(35 + p * 65) + '%'; msg.textContent = m; });
      BS.Analyzer.applyAI(res, ai);
    } catch (e) {
      console.warn('AI 转谱不可用，改用基础解析', e);
      BS.toast('AI 转谱暂不可用（需要联网或浏览器支持），已用基础解析', 'warn');
    }
    const comp = BS.Analyzer.toSong(res, buf, title);
    if (!res.melody.length) BS.toast('没有检测到明显的旋律，可以用乐队伴奏自由演奏', 'warn');
    const entry = { kind: 'audio', id: comp.id, title, sub: comp.sub, bpm: comp.bpm, lead: 'piano', colors: ['#0ea5e9', '#a855f7'], data: comp };
    try { await idb.put('audio:' + comp.id, f); } catch (e) { console.warn(e); }
    await App.addImport(entry);
    App.closeModal();
    BS.toast('✨ 解析完成：' + res.bpm + ' BPM · ' + BS.Theory.KEYS[res.keyPc] + (res.minor ? ' 小调' : ' 大调') + ' · 旋律 ' + res.melody.length + ' 音 · 和弦 ' + res.chords.length + ' 个 · ' + (res.drumsOk ? '含鼓点' : '无鼓') + (res.bassOk ? ' · 含低音线' : '') + (res.ai ? ' · AI 转谱 ' + res.aiNotes + ' 个音' : '') + '，已换成乐器演奏');
    App.setup.diff = 'easy';
    App.openSetup(entry);
  };

  // 自动配和弦
  App.harmonize = function (notes, keyPc, bpb, beats) {
    const cands = [[0, ''], [2, 'm'], [4, 'm'], [5, ''], [7, ''], [9, 'm']];
    const bonus = { 0: 0.35, 5: 0.2, 7: 0.25, 9: 0.12, 2: 0.05, 4: 0 };
    const out = [];
    const bars = Math.ceil(beats / bpb);
    for (let b = 0; b < bars; b++) {
      const hist = new Array(12).fill(0);
      notes.forEach((n) => {
        const ov = Math.min(n.t + n.d, (b + 1) * bpb) - Math.max(n.t, b * bpb);
        if (ov > 0) hist[n.m % 12] += ov * (Math.abs(n.t - b * bpb) < 0.01 ? 1.5 : 1);
      });
      let best = '', bs = -1e9;
      cands.forEach(([r, q]) => {
        const root = (keyPc + r) % 12;
        const tri = [root, (root + (q ? 3 : 4)) % 12, (root + 7) % 12];
        let s = 0;
        hist.forEach((v, pc) => (s += tri.includes(pc) ? v : -0.35 * v));
        s += bonus[r];
        if (b === bars - 1 && r === 0) s += 1;
        if (s > bs) { bs = s; best = T.KEYS[root] + q; }
      });
      out.push(best);
    }
    return out.join(' ');
  };

  App.openJianpu = function (text, title) {
    const modal = $('#modal');
    const sample = "1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |\n5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 - |\n1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |";
    const f = { title: title || '我的歌', key: 0, ts: 4, bpm: 96, style: 'pop', lead: 'piano', rep: 2 };
    modal.innerHTML = '';
    const ta = h('textarea.inp', { placeholder: '例：1 2 3 1 | 5 - 5 - |\n规则：1-7 音级，0 休止；高音 1\'  低音 1,  八分 1_  十六分 1__  附点 1.  延长 -  升降 #4 b7' });
    ta.value = text || '';
    const tc = h('textarea.inp', { placeholder: '可选：和弦，每小节一个，如 C G Am F；或 C:2 G:2 表示各两拍。留空则自动配和弦。', style: { minHeight: '60px' } });
    const sel = (opts, val, on) => h('select.chip', { onchange: (e) => on(e.target.value) }, ...opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(val) }, t)));
    modal.append(
      h('button.icon-btn.close-x', { onclick: App.closeModal }, '✕'),
      h('h2', null, '✍️ 手写简谱，一键成曲'), h('div.sub', null, '写下旋律，自动配和弦、编配整支乐队，立刻上台演奏'),
      h('div.row', { style: { marginBottom: '12px' } },
        h('input.inp', { value: f.title, placeholder: '歌名', oninput: (e) => (f.title = e.target.value) }),
        sel(T.KEYS.map((k, i) => [i, '1 = ' + k]), f.key, (v) => (f.key = +v)),
        sel([[4, '4/4 拍'], [3, '3/4 拍'], [2, '2/4 拍']], f.ts, (v) => (f.ts = +v)),
        h('label.chip', null, '♩=', h('input', { type: 'number', value: f.bpm, min: 40, max: 220, style: { width: '50px', background: 'transparent', border: 0, outline: 'none' }, oninput: (e) => (f.bpm = +e.target.value || 96) }))),
      h('div.row', { style: { marginBottom: '12px' } },
        sel(Object.keys(T.STYLES).map((k) => [k, '🎼 ' + T.STYLES[k].name + '风格']), f.style, (v) => (f.style = v)),
        sel(BS.INST_ORDER.filter((k) => k !== 'drums').map((k) => [k, BS.INST[k].icon + ' 主奏：' + BS.INST[k].name]), f.lead, (v) => (f.lead = v)),
        sel([[1, '演奏 1 遍'], [2, '演奏 2 遍（渐强）'], [3, '演奏 3 遍（完整版）']], f.rep, (v) => (f.rep = +v))),
      h('div.field', null, h('label', null, '旋律（简谱）'), ta),
      h('div.field', null, h('label', null, '和弦（可选）'), tc),
      h('div.row.end', null,
        h('button.btn', { onclick: () => { ta.value = sample; f.title = '小星星（我的版本）'; } }, '填入示例'),
        h('button.btn.primary', { onclick: () => App.createJianpu(f, ta.value, tc.value) }, '🎤 生成并上台'))
    );
    App.openModal();
  };
  App.createJianpu = async function (f, mel, chords) {
    const parsed = T.parseJianpu(mel, f.key, 4);
    if (!parsed.notes.length) { BS.toast('没有识别到音符，请检查简谱', 'warn'); return; }
    const bars = Math.ceil(parsed.beats / f.ts);
    const totalBeats = bars * f.ts;
    let ch = (chords || '').trim();
    if (!ch) ch = App.harmonize(parsed.notes, f.key, f.ts, totalBeats);
    else {
      const pc = T.parseChords(ch, f.ts);
      if (pc.beats < totalBeats) ch += ' ' + 'N:' + (totalBeats - pc.beats);
    }
    const levels = f.rep === 1 ? ['A2'] : f.rep === 2 ? ['A1', 'A3'] : ['A1', 'A2', 'A3'];
    const id = 'jp-' + BS.uid();
    const song = { id, title: f.title || '我的歌', sub: '手写简谱 · 自动编曲', bpm: f.bpm, ts: f.ts, key: T.KEYS[f.key], style: f.style, lead: f.lead, parts: { A: { name: '主题', m: mel, c: ch } }, form: levels };
    const entry = { kind: 'jianpu', id, title: song.title, sub: song.sub, bpm: song.bpm, lead: song.lead, colors: ['#f59e0b', '#ec4899'], song, style: T.STYLES[f.style].name };
    App.closeModal();
    await App.addImport(entry);
    BS.toast('✨ 已生成「' + song.title + '」：' + parsed.notes.length + ' 个音 · 和弦 ' + ch.split(/\s+/).length + ' 小节');
    setTimeout(() => App.openSetup(entry), 300);
  };

  // ---------------- 键盘 & MIDI ----------------
  App.onKeyDown = function (e) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Escape') { if ($('#modalWrap').classList.contains('open')) App.closeModal(); else $('#mixer').classList.remove('open'); return; }
    if (['input', 'textarea', 'select'].includes(tag) || $('#modalWrap').classList.contains('open')) return;
    if (App.page !== 'stage') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); if (!e.repeat) App.togglePlay(); return; }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      if (P.song) { e.preventDefault(); P.seek((P.playing ? P.beatNow() : P.beat) + (e.code === 'ArrowLeft' ? -1 : 1) * P.song.bpb * 2); }
      return;
    }
    A.init();
    if (App.view && App.view.keydown(e)) { e.preventDefault(); return; }
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && App.view && App.view.type === 'keys') App.onSustain(true); }
  };
  App.onKeyUp = function (e) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;
    if (App.view && App.view.keyup(e)) { e.preventDefault(); return; }
    if (e.code === 'Space') App.onSustain(false);
  };
  App.initMidi = function () {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess().then((acc) => {
      const bind = () => {
        let n = 0;
        acc.inputs.forEach((inp) => {
          n++;
          inp.onmidimessage = (msg) => {
            const [st, d1, d2] = msg.data;
            const type = st & 0xf0;
            if (type === 0x90 && d2 > 0) App.onPlay('midi' + d1, d1, d2 / 127);
            else if (type === 0x80 || (type === 0x90 && d2 === 0)) App.onRelease('midi' + d1);
            else if (type === 0xb0 && d1 === 64) App.onSustain(d2 >= 64);
          };
        });
        $('#midiPill').classList.toggle('hidden', !n);
        if (n) $('#midiPill').textContent = '🎹 MIDI ×' + n;
      };
      bind();
      acc.onstatechange = bind;
    }).catch(() => {});
  };

  App.togglePlay = function () {
    A.init();
    if (!P.song) return;
    if (P.holding) return;
    if (!P.playing && P.beat >= P.song.lengthBeats - 0.5 && App.ctx === 'song') { App.restart(); return; }
    P.toggle();
  };

  // ---------------- 事件总线 ----------------
  BS.bus.on('auto-on', (ti, m) => {
    const tr = P.song && P.song.tracks[ti];
    if (!tr) return;
    S.pulse(ti, tr.inst === 'drums' ? 0.25 : 0.35);
    if (tr.inst === 'drums') S.drumHit(BS.drumNorm(m));
    if (App.view && ti === H.trackIdx) App.view.autoOn(m, tr.color || '#8fd3ff');
  });
  BS.bus.on('auto-off', (ti, m) => { if (App.view && ti === H.trackIdx) App.view.autoOff(m); });
  const JUDGE = { perfect: ['Perfect', '#3f6df2'], great: ['Great', '#2a9d8f'], good: ['Good', '#7a8b2e'], miss: ['Miss', '#9ca3af'] };
  BS.bus.on('judge', (grade, hits) => {
    const [txt, col] = JUDGE[grade];
    App.center(txt + (grade !== 'miss' && G.combo > 2 ? ' ×' + G.combo : ''), col, 500);
    App.updateScoreHud(grade !== 'miss');
    if (grade !== 'miss' && hits[0] && H.cv) {
      const r = H.cv.getBoundingClientRect();
      const x = H.xFor(hits[0].m, r.width, r);
      if (x) H.spark(x.x + x.w / 2, col);
      App.pulseUser(0.5);
      if (G.combo && G.combo % 50 === 0) { S.burst(90); App.center(G.combo + ' 连击！', '#ff7eb3', 1200); }
    }
  });
  BS.bus.on('holding', (n) => App.center('请弹 ' + BS.noteName(n.m + P.transpose), '#6ee7f9', 900));
  BS.bus.on('transport', () => {
    $('#btnPlay').textContent = P.playing ? '⏸' : '▶';
    if (App.ctx === 'jam') App.renderJamBar();
  });
  BS.bus.on('end', () => {
    $('#btnPlay').textContent = '▶';
    App.releaseAllLive();
    if (App.concert && App.concert.running) return;
    S.burst(240);
    for (let i = 0; i < 6; i++) setTimeout(S.firework, 200 + i * 300);
    if (G.active) setTimeout(App.showResults, 1300);
    else BS.toast('👏 演出结束，感谢聆听！');
  });
  BS.bus.on('samples', () => {
    const st = A.sampleStatus;
    const keys = Object.keys(st);
    const loading = keys.filter((k) => st[k] === 'loading').length;
    const pill = $('#samplePill');
    if (A.quality !== 'sample') { pill.textContent = '🎛 合成音色'; pill.className = 'pill'; return; }
    if (!keys.length) { pill.textContent = '🎻 真实音色'; pill.className = 'pill'; return; }
    pill.textContent = loading ? '⏳ 加载真实音色 ' + (keys.length - loading) + '/' + keys.length : '🎻 真实音色已就绪';
    pill.className = 'pill ' + (loading ? 'loading' : 'ok');
  });

  // ---------------- 动画循环 ----------------
  let lastUi = 0, lastSec = null;
  let lastMini = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    P.pumpVisuals();
    if (t - lastMini > 200) { lastMini = t; App.updateMini(); }
    if (App.page !== 'stage') return;
    G.update();
    if (G.active && App.view) {
      const beat = P.holding ? P.beat : P.visBeat();
      const set = [];
      let tFirst = null;
      for (let i = G.ptr; i < G.notes.length; i++) {
        const n = G.notes[i];
        if (n.t > beat + 1.2) break;
        if (n.j) continue;
        if (tFirst == null) tFirst = n.t;
        if (n.t - tFirst > 0.05) break;
        set.push(App.userInst === 'drums' ? n.m : n.m + P.transpose);
      }
      const key = set.join(',');
      if (key !== App._hintKey) { App._hintKey = key; App.view.hint(set); }
    }
    S.draw(t);
    H.draw();
    if (t - lastUi > 90) {
      lastUi = t;
      App.updateTransport();
      const sec = P.song && P.playing ? P.currentSection(P.beatNow()) : null;
      if (sec && sec !== lastSec) {
        if (lastSec && sec.level >= 3) { S.burst(70); S.firework(); }
        lastSec = sec;
      }
      if (P.playing && sec && sec.level >= 3 && Math.random() < 0.02) S.firework();
    }
  }

  // ---------------- 全局迷你播放器：在任何页面都能继续听、暂停、切歌 ----------------
  App.updateMini = function () {
    const box = $('#miniPlayer');
    if (!box) return;
    const show = !!P.song && App.page !== 'stage';
    box.classList.toggle('hidden', !show);
    document.body.classList.toggle('has-mini', show);
    if (!show) return;
    const s = P.song;
    const beat = P.playing ? P.beatNow() : P.beat;
    const start = P.startPoint();
    $('#mpTitle').textContent = s.title;
    const C = App.concert;
    $('#mpSub').textContent = (C && C.running ? C.name + ' · 第 ' + (C.idx + 1) + '/' + C.ids.length + ' 首 · ' : App.ctx === 'jam' ? '自由演奏 · ' : '') + BS.fmtTime((beat * 60) / P.bpm) + ' / ' + BS.fmtTime((s.lengthBeats * 60) / P.bpm);
    $('#mpFill').style.width = BS.clamp((beat - start) / (s.lengthBeats - start), 0, 1) * 100 + '%';
    $('#mpPlay').textContent = P.playing ? '⏸' : '▶';
    $('#mpNext').classList.toggle('hidden', !(C && C.running));
  };

  // ---------------- 初始化 ----------------
  function init() {
    App.applyKbdH();
    S.setup($('#stageCv'));
    H.setup($('#hwCv'));
    App.renderCats();
    App.renderGrid();
    idb.get('imports').then((list) => { if (Array.isArray(list)) { App.imports = list; App.renderGrid(); } }).catch(() => {});
    $$('#tabs button').forEach((b) => b.addEventListener('click', () => App.go(b.dataset.page)));
    $('#search').addEventListener('input', App.renderGrid);
    $('#btnHeroPlay').addEventListener('click', () => { const s = BS.SONGS[Math.floor(Math.random() * BS.SONGS.length)]; App.openSetup(App.entries().find((e) => e.id === s.id)); });
    $('#btnHeroJam').addEventListener('click', () => App.go('jam'));
    const fi = $('#fileInput');
    $('#btnPickFile').addEventListener('click', (e) => { e.stopPropagation(); fi.click(); });
    $('#btnImportTop').addEventListener('click', () => fi.click());
    $('#dropZone').addEventListener('click', () => fi.click());
    $('#btnJianpu').addEventListener('click', (e) => { e.stopPropagation(); App.openJianpu(''); });
    fi.addEventListener('change', () => { App.handleFiles(fi.files); fi.value = ''; });
    const dz = $('#dropZone');
    ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'drop' || e.target === document.documentElement) dz.classList.remove('over'); }));
    document.addEventListener('drop', (e) => { dz.classList.remove('over'); if (e.dataTransfer && e.dataTransfer.files.length) App.handleFiles(e.dataTransfer.files); });
    $('#btnSettings').addEventListener('click', App.openSettings);
    $('#samplePill').addEventListener('click', App.openSettings);
    $('#modalWrap').addEventListener('pointerdown', (e) => { if (e.target.id === 'modalWrap') App.closeModal(); });
    $('#btnPlay').addEventListener('click', App.togglePlay);
    $('#mpPlay').addEventListener('click', () => { App.togglePlay(); App.updateMini(); });
    $('#mpNext').addEventListener('click', () => App.concertNext && App.concertNext());
    $('#mpStage').addEventListener('click', () => App.go('stage'));
    $('#mpOpen').addEventListener('click', () => App.go('stage'));
    $('#btnRestart').addEventListener('click', () => { A.init(); App.restart(); });
    $('#btnMixer').addEventListener('click', () => { App.renderMixer(); $('#mixer').classList.toggle('open'); });
    $('#btnMixerClose').addEventListener('click', () => $('#mixer').classList.remove('open'));
    $('#btnRec').addEventListener('click', App.toggleRec);
    $('#btnDlMp3').addEventListener('click', () => App.downloadFull(P.song));
    $('#btnMetro').addEventListener('click', (e) => { P.metronome = !P.metronome; e.currentTarget.classList.toggle('on', P.metronome); });
    $('#btnMode').addEventListener('click', () => { if (App.ctx === 'song' && App.entry) { P.pause(); App.openSetup(App.entry); } else App.go('library'); });
    $('#btnViewKeys').addEventListener('click', () => { App.forceKeys = !App.forceKeys; App.buildView(); App.renderInstPick(); });
    $('#btnStageSize').addEventListener('click', () => { $('.stage-grid').classList.toggle('big-stage'); setTimeout(() => App.view && App.view.resize(), 50); });
    $('#rate').addEventListener('input', (e) => { const r = +e.target.value; $('#rateVal').textContent = Math.round(r * 100) + '%'; P.setRate(r); });
    const prog = $('#progress');
    let dragging = false;
    prog.addEventListener('pointerdown', (e) => { dragging = true; prog.setPointerCapture(e.pointerId); App.seekFromEvent(e); });
    prog.addEventListener('pointermove', (e) => { if (dragging) App.seekFromEvent(e); });
    prog.addEventListener('pointerup', () => (dragging = false));
    window.addEventListener('keydown', App.onKeyDown);
    window.addEventListener('keyup', App.onKeyUp);
    window.addEventListener('resize', () => App.view && App.view.resize());
    window.addEventListener('blur', () => App.releaseAllLive());
    const unlock = () => { A.init(); App.initMidi(); BS.bus.emit('samples'); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    BS.bus.emit('samples');
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
