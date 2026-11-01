/* 星光乐队 · 音乐会模式：节目单 + 合唱团 + 指挥 + 幕布，一首接一首演下去 */
(function () {
  const BS = window.BS, App = BS.App, P = BS.Player, S = BS.Stage, T = BS.Theory;
  const $ = BS.$, h = BS.h;

  // 三种演出模式：合唱团（合唱团领唱）/ 音乐会（管弦 + 可选合唱）/ 演唱会（乐队现场）
  const KINDS = {
    choir: {
      title: '一支属于你的<span class="grad">合唱团</span>', desc: '三排合唱团站上台阶，由合唱团来唱主旋律，乐队和弦乐轻轻托底。选一份曲目，指挥举起指挥棒。',
      choirFixed: true, defaultChoir: true,
      programs: [
        { name: '圣诞合唱会', icon: '🎄', tag: '钟声与合唱', ids: ['silent-night', 'choir-hymn', 'jingle-bells', 'xmas-bells', 'merry-xmas', 'auld-lang-syne'] },
        { name: '致远方 · 合唱专场', icon: '🎤', tag: '温暖的和声', ids: ['choir-hymn', 'farewell', 'going-home', 'canon', 'auld-lang-syne'] },
        { name: '童声合唱团', icon: '🪁', tag: '轻快温暖', ids: ['twinkle', 'kite', 'little-dolphin', 'two-tigers', 'good-night-star', 'birthday'] },
        { name: '星河合唱夜', icon: '🌌', tag: '辽阔深情', ids: ['star-voyage', 'dawn-sea', 'starry-promise', 'star-dust', 'castle-clouds'] },
        { name: '古风合唱团', icon: '🏮', tag: '清雅悠远', ids: ['moon-alone', 'long-river', 'mid-autumn', 'peach-ferry', 'jiangnan-rain'] },
        { name: '婚礼合唱会', icon: '💐', tag: '浪漫庄重', ids: ['wedding-day', 'evening-breeze', 'dandelion-wind', 'first-snow', 'road-home'] },
      ],
    },
    concert: {
      title: '一场属于你的<span class="grad">音乐会</span>', desc: '幕布缓缓拉开，指挥举起指挥棒，管弦乐队依次演出每一首曲子，可以加入合唱团伴唱。',
      defaultChoir: true,
      programs: [
        { name: '新年古典音乐会', icon: '🎻', tag: '管弦 + 合唱', ids: ['ode-to-joy', 'canon', 'blue-danube', 'minuet', 'dawn-overture', 'triumph'] },
        { name: '国风之夜', icon: '🏮', tag: '古筝 · 二胡 · 笛', ids: ['jasmine', 'bamboo-rain', 'sakura-rain', 'chang-an', 'farewell'] },
        { name: '电影感管弦之夜', icon: '🎬', tag: '恢弘大气', ids: ['triumph', 'dawn-overture', 'star-river', 'going-home', 'prelude-c', 'blue-danube'] },
        { name: '治愈钢琴音乐会', icon: '🎹', tag: '安静温柔', ids: ['dandelion-wind', 'first-snow', 'autumn-whisper', 'rainy-piano', 'quiet-lake', 'cat-window'] },
        { name: '影视史诗之夜', icon: '🌠', tag: '热血澎湃', ids: ['star-voyage', 'hero-road', 'storm-eye', 'final-battle', 'castle-clouds', 'dawn-sea'] },
        { name: '春节喜庆音乐会', icon: '🧨', tag: '锣鼓喧天', ids: ['new-year-luck', 'lantern-night', 'bianjing-dream', 'firework-night', 'mid-autumn'] },
      ],
    },
    live: {
      title: '今晚的<span class="grad">演唱会</span>', desc: '整支乐队现场演出：鼓、贝斯、吉他、键盘与主唱乐器，一首接一首不停歇。',
      defaultChoir: false,
      programs: [
        { name: '流行演唱会', icon: '🎤', tag: '乐队现场', ids: ['summer-breeze', 'star-city', 'fly-free', 'star-river', 'moon-sea', 'jazz-coffee'] },
        { name: '摇滚之夜', icon: '🎸', tag: '燃', ids: ['fly-free', 'burn', 'youth-far', 'rock-youth', 'lets-go', 'cancan'] },
        { name: '爵士与民谣', icon: '🎷', tag: '松弛', ids: ['jazz-coffee', 'midnight-blue', 'moon-sea', 'farewell', 'summer-breeze'] },
        { name: '电子舞曲之夜', icon: '🪩', tag: '律动', ids: ['night-flight', 'neon-city', 'heartbeat', 'galaxy-train', 'star-city'] },
        { name: '民谣篝火夜', icon: '🔥', tag: '温暖', ids: ['road-home', 'wind-sail', 'evening-breeze', 'spring-picnic', 'warm-winter'] },
        { name: '爵士蓝调俱乐部', icon: '🎺', tag: '摇摆', ids: ['swing-street', 'dancing-cloud', 'coffee-book', 'seaside-dusk', 'midnight-blue'] },
      ],
    },
  };

  const C = (App.concert = { running: false, ids: [], idx: 0, name: '', kind: 'concert', choir: true });
  const choirFor = (kind) => (KINDS[kind].choirFixed ? true : BS.store.get('choir:' + kind, KINDS[kind].defaultChoir));

  const songSeconds = (def) => {
    let beats = 0;
    const bpb = def.ts || 4;
    def.form.forEach((f) => { const p = def.parts[f[0]]; if (p) beats += T.parseChords(p.c, bpb).beats; });
    return ((beats + bpb * 2) * 60) / def.bpm;
  };

  // ---------------- 节目单页面 ----------------
  App.renderConcertPage = function (kind) {
    kind = KINDS[kind] ? kind : 'concert';
    App.concertKind = kind;
    const K = KINDS[kind];
    $('#concertTitle').innerHTML = K.title;
    $('#concertDesc').textContent = K.desc;
    const grid = $('#programGrid');
    grid.innerHTML = '';
    const entries = App.entries();
    K.programs.forEach((p) => {
      const items = p.ids.map((id) => entries.find((e) => e.id === id)).filter(Boolean);
      if (!items.length) return;
      const total = items.reduce((a, e) => a + (e.kind === 'builtin' ? songSeconds(e.song) : 0), 0);
      grid.appendChild(h('div.program.glass', { onclick: () => App.startConcert(p.name, items.map((e) => e.id), kind) },
        h('div.p-icon', null, p.icon),
        h('h3', null, p.name),
        h('div.p-list', null, items.map((e, i) => i + 1 + '. ' + e.title).join('　')),
        h('div.p-meta', null, h('span', null, items.length + ' 首'), h('span', null, '约 ' + Math.round(total / 60) + ' 分钟'), h('span', null, p.tag)),
        h('button.btn.primary.small', null, '开幕')));
    });
    const b = $('#btnConcertChoir');
    const on = choirFor(kind);
    b.textContent = K.choirFixed ? '合唱团领唱' : '合唱团伴唱：' + (on ? '开' : '关');
    b.classList.toggle('on', on);
    b.disabled = !!K.choirFixed;
  };

  App.customConcert = function () {
    const picked = [];
    const entries = App.entries();
    const modal = $('#modal');
    modal.innerHTML = '';
    const items = entries.map((e) => {
      const no = h('span.no');
      const el = h('div.pick', { onclick: () => { const i = picked.indexOf(e.id); if (i >= 0) picked.splice(i, 1); else picked.push(e.id); refresh(); } }, no, e.title, h('small', null, e.sub || ''));
      return { e, el, no };
    });
    const go = h('button.btn.primary', { onclick: () => { if (!picked.length) { BS.toast('先点选几首曲子', 'warn'); return; } App.closeModal(); App.startConcert({ choir: '我的合唱会', concert: '我的音乐会', live: '我的演唱会' }[App.concertKind || 'concert'], picked.slice(), App.concertKind || 'concert'); } }, '开幕');
    const refresh = () => {
      items.forEach(({ e, el, no }) => { const i = picked.indexOf(e.id); el.classList.toggle('on', i >= 0); no.textContent = i >= 0 ? String(i + 1) : ''; });
      go.textContent = picked.length ? '开幕 · ' + picked.length + ' 首' : '开幕';
    };
    modal.append(
      h('button.icon-btn.close-x', { onclick: App.closeModal }, '✕'),
      h('h2', null, '自选节目单'),
      h('div.sub', null, '按点击的先后顺序排列，会依次演出。'),
      h('div.pick-list', null, items.map((x) => x.el)),
      h('div.row.end', null, h('button.btn', { onclick: () => { picked.length = 0; refresh(); } }, '清空'), go));
    refresh();
    App.openModal();
  };

  // ---------------- 演出流程 ----------------
  let cardTimer, nextTimer;
  function card(kicker, title, sub, ms) {
    const el = $('#concertCard');
    el.classList.remove('hidden');
    el.innerHTML = '';
    el.append(h('small', null, kicker), h('b', null, title), sub ? h('em', null, sub) : null);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => el.classList.remove('show'), ms || 3200);
  }

  function playSong(i) {
    C.idx = i;
    const entry = App.entries().find((e) => e.id === C.ids[i]);
    let comp = null;
    try { if (entry) comp = App.getCompiled(entry, { choir: C.choir, choirLead: C.kind === 'choir' }); } catch (err) { console.error(err); }
    if (!comp) { BS.toast('这首曲子跳过了', 'warn'); advance(0); return; }
    App._concertCall = true;
    App.startSong(comp, { mode: 'listen', diff: 'normal', part: 0, rate: 1 }, entry);
    App._concertCall = false;
    S.curtainTarget = 1;
    $('#concertInfo').textContent = C.name + ' · 第 ' + (i + 1) + ' / ' + C.ids.length + ' 首';
    $('#hudSub').textContent = C.name + (C.kind === 'choir' ? ' · 合唱团领唱' : C.choir ? ' · 合唱团伴唱' : '');
    card('第 ' + (i + 1) + ' 首', comp.title, comp.sub || '');
  }

  // 一首结束：停一会儿 → 幕布合上 → 下一首
  function advance(delay) {
    clearTimeout(nextTimer);
    nextTimer = setTimeout(() => {
      if (!C.running) return;
      S.curtainTarget = 0;
      nextTimer = setTimeout(() => {
        if (!C.running) return;
        if (C.idx + 1 < C.ids.length) playSong(C.idx + 1); else finish(true);
      }, 1300);
    }, delay);
  }

  function finish(natural) {
    clearTimeout(nextTimer);
    C.running = false;
    if (!natural) { P.stop(); S.curtainTarget = 0; }
    card('谢幕', '感谢聆听', C.name, 4200);
    BS.toast(natural ? '演出结束，感谢聆听' : '已结束演出');
    setTimeout(() => {
      if (C.running) return;
      if (App.applyShowVisual) App.applyShowVisual(App.show || 'normal', App.lastSetup); else { S.concert = false; S.live = false; S.curtain = 1; S.curtainTarget = 1; $('.stage-grid').classList.remove('big-stage'); }
      $('#concertCtl').classList.add('hidden');
      $('#btnDlMp3').classList.remove('hidden');
    }, 4300);
  }
  App.endConcert = () => { if (C.running) finish(false); };

  App.startConcert = function (name, ids, kind) {
    if (!ids || !ids.length) return;
    BS.Audio.init();
    clearTimeout(nextTimer);
    C.kind = KINDS[kind] ? kind : 'concert';
    C.choir = choirFor(C.kind);
    C.running = true; C.ids = ids; C.idx = 0; C.name = name;
    S.concert = true; S.live = C.kind === 'live'; S.curtain = 0; S.curtainTarget = 0;
    $('.stage-grid').classList.add('big-stage');
    $('#concertCtl').classList.remove('hidden');
    $('#btnDlMp3').classList.add('hidden');
    playSong(0);
  };

  App.concertNext = function () {
    if (!C.running) return;
    P.stop(true);
    advance(0);
  };

  // 自然播完 → 自动进入下一首
  BS.bus.on('end', () => { if (C.running) advance(2200); });

  // 演出中如果用户去弹别的歌 / 自由演奏，就结束这场音乐会
  const origStart = App.startSong;
  App.startSong = function (comp, st, entry) {
    if (C.running && !App._concertCall) finish(false);
    return origStart.call(App, comp, st, entry);
  };
  const origGo = App.go;
  App.go = function (page) {
    if (C.running && page === 'jam') finish(false);
    return origGo.call(App, page);
  };

  document.addEventListener('DOMContentLoaded', () => {
    $('#btnNextSong').addEventListener('click', () => App.concertNext());
    $('#btnEndConcert').addEventListener('click', () => App.endConcert());
    $('#btnConcertCustom').addEventListener('click', () => App.customConcert());
    $('#btnConcertChoir').addEventListener('click', () => {
      const k = App.concertKind || 'concert';
      if (KINDS[k].choirFixed) return;
      BS.store.set('choir:' + k, !choirFor(k));
      App.renderConcertPage(k);
    });
  });
  if (document.readyState !== 'loading') {
    $('#btnNextSong').addEventListener('click', () => App.concertNext());
    $('#btnEndConcert').addEventListener('click', () => App.endConcert());
    $('#btnConcertCustom').addEventListener('click', () => App.customConcert());
    $('#btnConcertChoir').addEventListener('click', () => { const k = App.concertKind || 'concert'; if (KINDS[k].choirFixed) return; BS.store.set('choir:' + k, !choirFor(k)); App.renderConcertPage(k); });
  }
})();
