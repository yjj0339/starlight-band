/* 星光乐队 · 乐器演奏界面 */
(function () {
  const BS = window.BS;
  const h = BS.h;
  const V = (BS.Views = {});

  const LOWER = ['KeyZ', 'KeyS', 'KeyX', 'KeyD', 'KeyC', 'KeyV', 'KeyG', 'KeyB', 'KeyH', 'KeyN', 'KeyJ', 'KeyM', 'Comma', 'KeyL', 'Period', 'Semicolon', 'Slash'];
  const UPPER = ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU', 'KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP', 'BracketLeft', 'Equal', 'BracketRight'];
  const CODE_LABEL = (c) => ({ Comma: ',', Period: '.', Semicolon: ';', Slash: '/', BracketLeft: '[', BracketRight: ']', Equal: '=' }[c] || c.replace('Key', '').replace('Digit', ''));
  const ROWS4 = [
    ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
    ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
    ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
    ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
  ];
  const JP = ['1', '#1', '2', '#2', '3', '4', '#4', '5', '#5', '6', '#6', '7'];
  V.jianpuLabel = (m, keyPc) => {
    const rel = m - 60 - (keyPc || 0);
    const deg = JP[((rel % 12) + 12) % 12];
    const oct = Math.floor(rel / 12);
    return { deg, oct };
  };

  class Base {
    constructor(host, opts) {
      this.host = host; this.opts = opts; this.inst = opts.inst; this.keysDown = {};
      this.el = h('div.view');
      host.appendChild(this.el);
    }
    play(key, m, vel) { this.opts.onPlay(key, m, vel); }
    glide(key, m) { this.opts.onGlide && this.opts.onGlide(key, m); }
    release(key) { this.opts.onRelease(key); }
    noteRect() { return null; }
    hint() {}
    autoOn() {}
    autoOff() {}
    pressOn(m) { this.autoOn(m, '#fff', true); }
    pressOff(m) { this.autoOff(m, true); }
    resize() {}
    keydown() { return false; }
    keyup() { return false; }
    destroy() { this.el.remove(); }
    setSong() {}
  }

  // ===================== 钢琴键盘 =====================
  class KeyboardView extends Base {
    constructor(host, opts) {
      super(host, opts);
      this.el.classList.add('kbd-view');
      this.oct = BS.store.get('kbdOct', 4);
      this.lo = 21; this.hi = 108; this.fit = false;
      this.zoom = BS.store.get('kbdZoom', 34);
      this.toolbar = h('div.view-tools',
        null,
        h('button.chip', { title: '降低八度 (↓)', onclick: () => this.shiftOct(-1) }, '◀ 八度'),
        (this.octLabel = h('span.chip.ghost')),
        h('button.chip', { title: '升高八度 (↑)', onclick: () => this.shiftOct(1) }, '八度 ▶'),
        h('span.sep'),
        h('button.chip', { title: '缩小琴键', onclick: () => this.setZoom(this.zoom - 6) }, '－'),
        h('button.chip', { title: '放大琴键', onclick: () => this.setZoom(this.zoom + 6) }, '＋'),
        h('button.chip', { title: '完整 88 键 / 适配', onclick: () => { this.fit = !this.fit; this.layout(); } }, '88 键'),
        h('span.sep'),
        (this.pedalBtn = h('button.chip.pedal', { title: '延音踏板（空格）', onpointerdown: () => this.opts.onSustain(true), onpointerup: () => this.opts.onSustain(false), onpointerleave: () => this.opts.onSustain(false) }, '延音踏板'))
      );
      this.scroll = h('div.kbd-scroll');
      this.kbd = h('div.kbd');
      this.scroll.appendChild(this.kbd);
      this.el.append(this.toolbar, this.scroll);
      this.keys = {};
      this.ptrs = {};
      this.bindPointer();
      this.build();
    }
    shiftOct(d) { this.oct = BS.clamp(this.oct + d, 1, 7); BS.store.set('kbdOct', this.oct); this.labelKeys(); this.revealOct(); }
    setZoom(z) { this.zoom = BS.clamp(z, 16, 90); BS.store.set('kbdZoom', this.zoom); this.fit = false; this.layout(); }
    setRange(lo, hi, fit) {
      while (BS.isBlack(lo)) lo--;
      while (BS.isBlack(hi)) hi++;
      this.lo = lo; this.hi = hi; this.fit = !!fit;
      this.build();
    }
    build() {
      this.kbd.innerHTML = '';
      this.keys = {};
      for (let m = this.lo; m <= this.hi; m++) {
        const black = BS.isBlack(m);
        const k = h('div.key' + (black ? '.black' : '.white'), { 'data-m': m },
          h('span.klab'), h('span.kname', null, !black ? BS.noteName(m) : ''));
        this.keys[m] = k;
        this.kbd.appendChild(k);
      }
      this.layout();
      this.labelKeys();
    }
    layout() {
      const whites = [];
      for (let m = this.lo; m <= this.hi; m++) if (!BS.isBlack(m)) whites.push(m);
      const W = this.scroll.clientWidth || this.host.clientWidth || 800;
      const w = this.fit ? Math.max(14, W / whites.length) : Math.max(this.zoom, W / whites.length);
      this.ww = w;
      let x = 0;
      const pos = {};
      for (let m = this.lo; m <= this.hi; m++) {
        const k = this.keys[m];
        if (!BS.isBlack(m)) { pos[m] = x; k.style.left = x + 'px'; k.style.width = w + 'px'; x += w; }
        else { const bw = w * 0.62; pos[m] = x - bw / 2; k.style.left = x - bw / 2 + 'px'; k.style.width = bw + 'px'; }
      }
      this.pos = pos;
      this.kbd.style.width = x + 'px';
      this.el.classList.toggle('compact', w < 26);
      if (!this.fit) this.revealOct();
    }
    revealOct() {
      const base = 12 * (this.oct + 1);
      if (this.pos && this.pos[base] != null) {
        const target = this.pos[base] - this.scroll.clientWidth * 0.15;
        this.scroll.scrollTo({ left: target, behavior: 'smooth' });
      }
    }
    labelKeys() {
      const base = 12 * (this.oct + 1);
      Object.values(this.keys).forEach((k) => (k.firstChild.textContent = ''));
      this.codeMap = {};
      LOWER.forEach((c, i) => { this.codeMap[c] = base + i; });
      UPPER.forEach((c, i) => { this.codeMap[c] = base + 12 + i; });
      for (const c in this.codeMap) { const k = this.keys[this.codeMap[c]]; if (k) k.firstChild.textContent = CODE_LABEL(c); }
      this.octLabel.textContent = 'C' + this.oct + ' – C' + (this.oct + 2);
    }
    keyAt(x, y) {
      const el = document.elementFromPoint(x, y);
      const k = el && el.closest && el.closest('.key');
      return k && this.kbd.contains(k) ? k : null;
    }
    bindPointer() {
      const down = (e) => {
        const k = e.target.closest('.key');
        if (!k) return;
        e.preventDefault();
        this.kbd.setPointerCapture && this.kbd.setPointerCapture(e.pointerId);
        const r = k.getBoundingClientRect();
        const vel = BS.clamp(0.35 + (0.7 * (e.clientY - r.top)) / r.height, 0.2, 1);
        const m = +k.dataset.m;
        this.ptrs[e.pointerId] = { m, vel };
        this.play('p' + e.pointerId, m, vel);
      };
      const move = (e) => {
        const p = this.ptrs[e.pointerId];
        if (!p) return;
        const k = this.keyAt(e.clientX, e.clientY);
        if (!k) return;
        const m = +k.dataset.m;
        if (m !== p.m) { this.release('p' + e.pointerId); p.m = m; this.play('p' + e.pointerId, m, p.vel); }
      };
      const up = (e) => { if (this.ptrs[e.pointerId]) { this.release('p' + e.pointerId); delete this.ptrs[e.pointerId]; } };
      this.kbd.addEventListener('pointerdown', down);
      this.kbd.addEventListener('pointermove', move);
      this.kbd.addEventListener('pointerup', up);
      this.kbd.addEventListener('pointercancel', up);
      this.kbd.addEventListener('lostpointercapture', up);
    }
    keydown(e) {
      if (e.code === 'ArrowUp') { this.shiftOct(1); return true; }
      if (e.code === 'ArrowDown') { this.shiftOct(-1); return true; }
      const m = this.codeMap[e.code];
      if (m == null) return false;
      if (!this.keysDown[e.code]) { this.keysDown[e.code] = 1; this.play('k' + e.code, m, 0.78); }
      return true;
    }
    keyup(e) {
      if (this.codeMap[e.code] == null) return false;
      delete this.keysDown[e.code];
      this.release('k' + e.code);
      return true;
    }
    noteRect(m, hostRect) {
      const k = this.keys[m];
      if (!k) return null;
      const r = k.getBoundingClientRect();
      return { x: r.left - hostRect.left, w: r.width, black: BS.isBlack(m) };
    }
    hint(set) {
      if (this._hint) this._hint.forEach((m) => this.keys[m] && this.keys[m].classList.remove('hint'));
      this._hint = set;
      set.forEach((m) => this.keys[m] && this.keys[m].classList.add('hint'));
    }
    autoOn(m, color, user) {
      const k = this.keys[m];
      if (!k) return;
      k.classList.add(user ? 'down' : 'auto');
      if (!user) k.style.setProperty('--auto', color);
    }
    autoOff(m, user) { const k = this.keys[m]; if (k) k.classList.remove(user ? 'down' : 'auto'); }
    resize() { this.layout(); }
    setSong(song, track) {
      if (!track || !track.notes.length) { this.setRange(21, 108, false); return; }
      let lo = 127, hi = 0;
      track.notes.forEach((n) => { lo = Math.min(lo, n.m); hi = Math.max(hi, n.m); });
      lo = Math.max(21, Math.min(lo - 3, hi - 24));
      hi = Math.min(108, Math.max(hi + 3, lo + 24));
      this.setRange(lo, hi, true);
      this.oct = BS.clamp(Math.floor(lo / 12) - 1 + (hi - lo > 30 ? 0 : 0), 1, 7);
      this.labelKeys();
    }
  }
  V.keys = KeyboardView;

  // ===================== 吉他 / 贝斯 =====================
  class GuitarView extends Base {
    constructor(host, opts) {
      super(host, opts);
      this.bass = opts.inst === 'bass';
      this.tuning = this.bass ? [43, 38, 33, 28] : [64, 59, 55, 50, 45, 40];
      this.frets = this.bass ? 12 : 15;
      this.el.classList.add('gtr-view');
      this.mode = this.bass ? 'fret' : BS.store.get('gtrMode', 'chord');
      this.chords = ['C', 'G', 'Am', 'Em', 'F', 'Dm', 'D', 'E'];
      this.cur = null;
      this.toolbar = h('div.view-tools');
      if (!this.bass) {
        this.toolbar.append(
          (this.bChord = h('button.chip', { onclick: () => this.setMode('chord') }, '🎼 和弦模式')),
          (this.bFret = h('button.chip', { onclick: () => this.setMode('fret') }, '🎸 指板模式')),
          h('span.sep'),
          (this.autoSel = h('select.chip', { title: '自动弹奏节奏型', onchange: () => this.setAuto(this.autoSel.value) },
            h('option', { value: '' }, '自动弹奏：关'), h('option', { value: 'strum' }, '自动：扫弦'), h('option', { value: 'pick' }, '自动：分解'), h('option', { value: 'pop' }, '自动：流行切分')))
        );
      } else this.toolbar.append(h('span.chip.ghost', null, '4 弦贝斯 · 标准调弦 E A D G'));
      this.body = h('div.gtr-body');
      this.el.append(this.toolbar, this.body);
      this.cells = {};
      this.ptrs = {};
      this.render();
    }
    setMode(m) { this.mode = m; BS.store.set('gtrMode', m); this.render(); }
    setSong(song) {
      if (song && song.chords && song.chords.length) {
        const uniq = [];
        song.chords.forEach((c) => { if (!uniq.includes(c.name)) uniq.push(c.name); });
        this.chords = uniq.slice(0, 10);
      } else if (song && song.jamChords) this.chords = song.jamChords;
      this.render();
    }
    render() {
      this.body.innerHTML = '';
      this.cells = {};
      if (this.bChord) { this.bChord.classList.toggle('on', this.mode === 'chord'); this.bFret.classList.toggle('on', this.mode === 'fret'); }
      if (this.mode === 'chord') this.renderChords(); else this.renderFrets();
    }
    renderFrets() {
      const board = h('div.fretboard' + (this.bass ? '.bass' : ''));
      const nut = h('div.fret-row.markers', null, ...Array.from({ length: this.frets + 1 }, (_, f) => h('div.fmark', null, [3, 5, 7, 9, 15].includes(f) ? '•' : f === 12 ? '••' : f === 0 ? '空弦' : String(f))));
      board.appendChild(nut);
      this.tuning.forEach((open, si) => {
        const row = h('div.fret-row', { style: { '--thick': (1 + si * (this.bass ? 0.9 : 0.45)).toFixed(1) + 'px' } });
        for (let f = 0; f <= this.frets; f++) {
          const m = open + f;
          const c = h('div.fcell' + (f === 0 ? '.open' : ''), { 'data-m': m, 'data-s': si }, h('span', null, BS.noteName(m).replace(/\d/, '')));
          (this.cells[m] = this.cells[m] || []).push(c);
          row.appendChild(c);
        }
        board.appendChild(row);
      });
      const down = (e) => {
        const c = e.target.closest('.fcell');
        if (!c) return;
        e.preventDefault();
        board.setPointerCapture && board.setPointerCapture(e.pointerId);
        this.ptrs[e.pointerId] = c;
        this.play('p' + e.pointerId, +c.dataset.m, 0.8);
      };
      const move = (e) => {
        if (!this.ptrs[e.pointerId]) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const c = el && el.closest && el.closest('.fcell');
        if (c && c !== this.ptrs[e.pointerId] && board.contains(c)) {
          this.release('p' + e.pointerId);
          this.ptrs[e.pointerId] = c;
          this.play('p' + e.pointerId, +c.dataset.m, 0.7);
        }
      };
      const up = (e) => { if (this.ptrs[e.pointerId]) { this.release('p' + e.pointerId); delete this.ptrs[e.pointerId]; } };
      board.addEventListener('pointerdown', down);
      board.addEventListener('pointermove', move);
      board.addEventListener('pointerup', up);
      board.addEventListener('pointercancel', up);
      this.body.appendChild(board);
      this.body.appendChild(h('div.view-hint', null, this.bass ? '键盘：1-0 / Q-P / A-; / Z-/ 分别对应 G D A E 弦 0-9 品' : '键盘：1-0 / Q-P / A-; / Z-/ 对应 1-4 弦（高音 E、B、G、D）0-9 品'));
    }
    renderChords() {
      const wrap = h('div.chord-strip');
      this.chords.forEach((name, ci) => {
        const ch = BS.Theory.chord(name);
        if (!ch) return;
        const vo = BS.Theory.guitarVoicing(ch);
        const col = h('div.chord-col' + (this.cur === name ? '.sel' : ''), { 'data-c': name });
        const head = h('button.chord-btn', null, h('b', null, name), h('small', null, ROWS4[0][ci] ? CODE_LABEL(ROWS4[0][ci]) : ''));
        head.addEventListener('pointerdown', (e) => { e.preventDefault(); this.selectChord(name, true); });
        col.appendChild(head);
        vo.slice().reverse().forEach((m, i) => {
          const s = h('div.chord-string', { 'data-m': m }, h('span', null, BS.noteName(m)));
          s.addEventListener('pointerdown', (e) => { e.preventDefault(); this.selectChord(name, false); this.play('cs' + m, m, 0.75); setTimeout(() => this.release('cs' + m), 50); s.classList.add('pluck'); setTimeout(() => s.classList.remove('pluck'), 300); });
          (this.cells[m] = this.cells[m] || []).push(s);
          col.appendChild(s);
        });
        wrap.appendChild(col);
      });
      const strum = h('div.strum-pad', null, h('div', null, '扫弦区'), h('small', null, '上下滑动扫弦'));
      let last = null;
      strum.addEventListener('pointerdown', (e) => { e.preventDefault(); strum.setPointerCapture(e.pointerId); last = e.clientY; this.strum(false, 0.8); });
      strum.addEventListener('pointermove', (e) => {
        if (last == null) return;
        const dy = e.clientY - last;
        if (Math.abs(dy) > 40) { this.strum(dy < 0, BS.clamp(Math.abs(dy) / 120, 0.4, 1)); last = e.clientY; }
      });
      const end = () => (last = null);
      strum.addEventListener('pointerup', end); strum.addEventListener('pointercancel', end);
      this.body.append(wrap, strum);
      this.body.appendChild(h('div.view-hint', null, '点和弦名扫弦 · 点单根弦拨弦 · 键盘 1-0 选择和弦 · 空格扫弦'));
    }
    selectChord(name, doStrum) {
      this.cur = name;
      BS.$$('.chord-col', this.body).forEach((c) => c.classList.toggle('sel', c.dataset.c === name));
      if (doStrum && !this.autoMode) this.strum(false, 0.85);
    }
    strum(up, vel) {
      if (!this.cur) this.cur = this.chords[0];
      const vo = BS.Theory.guitarVoicing(BS.Theory.chord(this.cur));
      this.opts.onStrum(up ? vo.slice().reverse() : vo, vel * (up ? 0.75 : 1));
      BS.$$('.chord-col.sel .chord-string', this.body).forEach((s, i) => { setTimeout(() => { s.classList.add('pluck'); setTimeout(() => s.classList.remove('pluck'), 250); }, i * 15); });
    }
    setAuto(mode) {
      this.autoMode = mode;
      clearInterval(this.autoTimer);
      if (!mode) return;
      const A = BS.Audio;
      A.init();
      let next = A.now() + 0.05, step = 0;
      const pats = {
        strum: [[1, 0], null, [1, 0], [1, 1], null, [1, 1], [1, 0], [1, 1]],
        pop: [[1, 0], null, null, [1, 1], null, [1, 1], [1, 0], null],
        pick: [[0, 0], [0, 2], [0, 3], [0, 4], [0, 5], [0, 4], [0, 3], [0, 2]],
      };
      this.autoTimer = setInterval(() => {
        const bpm = this.opts.getBpm();
        const dt = 30 / bpm;
        while (next < A.now() + 0.12) {
          const p = pats[mode][step % 8];
          if (p && this.cur) {
            const vo = BS.Theory.guitarVoicing(BS.Theory.chord(this.cur));
            if (p[0] === 1) this.opts.onStrum(p[1] ? vo.slice(2).reverse() : vo, p[1] ? 0.55 : 0.75, next);
            else this.opts.onStrum([vo[Math.min(p[1], vo.length - 1)]], 0.65, next);
          }
          next += dt; step++;
        }
      }, 25);
    }
    keydown(e) {
      if (this.mode === 'chord') {
        const i = ROWS4[0].indexOf(e.code);
        if (i >= 0 && this.chords[i]) { if (!e.repeat) this.selectChord(this.chords[i], true); return true; }
        if (e.code === 'Space') { if (!e.repeat) this.strum(false, 0.85); return true; }
        return false;
      }
      for (let r = 0; r < 4; r++) {
        const f = ROWS4[r].indexOf(e.code);
        if (f >= 0 && this.tuning[r] != null) {
          if (!this.keysDown[e.code]) { this.keysDown[e.code] = 1; this.play('k' + e.code, this.tuning[r] + f, 0.8); }
          return true;
        }
      }
      return false;
    }
    keyup(e) { if (this.keysDown[e.code]) { delete this.keysDown[e.code]; this.release('k' + e.code); return true; } return false; }
    hint(set) {
      if (this._hint) this._hint.forEach((c) => c.classList.remove('hint'));
      this._hint = [];
      set.forEach((m) => { const cs = this.cells[m]; if (cs && cs.length) { const c = cs.reduce((a, b) => a, cs[0]); c.classList.add('hint'); this._hint.push(c); } });
      if (this.mode === 'chord' && this.opts.getChord) {
        const cn = this.opts.getChord();
        BS.$$('.chord-col', this.body).forEach((c) => c.classList.toggle('next', c.dataset.c === cn));
      }
    }
    autoOn(m, color) { (this.cells[m] || []).forEach((c) => { c.classList.add('auto'); c.style.setProperty('--auto', color); }); }
    autoOff(m) { (this.cells[m] || []).forEach((c) => c.classList.remove('auto')); }
    destroy() { clearInterval(this.autoTimer); super.destroy(); }
  }
  V.guitar = GuitarView;
  V.bass = GuitarView;

  // ===================== 架子鼓 + 鼓机 =====================
  const SEQ_ROWS = [49, 46, 42, 50, 47, 38, 39, 36];
  const SEQ_PRESETS = {
    '流行': { 36: 'x...x...x...x...', 38: '....x.......x...', 42: 'x.x.x.x.x.x.x.x.' },
    '摇滚': { 36: 'x.....x.x.......', 38: '....x.......x...', 42: 'x.x.x.x.x.x.x.x.', 49: 'x...............' },
    '迪斯科': { 36: 'x...x...x...x...', 38: '....x.......x...', 46: '..x...x...x...x.', 42: 'x...x...x...x...' },
    '嘻哈': { 36: 'x......x..x.....', 38: '....x.......x...', 42: 'x.x.x.x.x.xxx.x.' },
    '放克': { 36: 'x..x..x...x..x..', 38: '....x..x.x..x...', 42: 'xxxxxxxxxxxxxxxx' },
    '雷鬼': { 36: '........x.......', 38: '........x.......', 42: '..x...x...x...x.' },
    '电音': { 36: 'x...x...x...x...', 39: '....x.......x...', 46: '..x...x...x...x.', 47: '..............xx' },
  };
  class DrumView extends Base {
    constructor(host, opts) {
      super(host, opts);
      this.el.classList.add('drum-view');
      this.pads = {};
      this.seq = {};
      SEQ_ROWS.forEach((n) => (this.seq[n] = new Array(16).fill(0)));
      this.toolbar = h('div.view-tools', null,
        (this.seqBtn = h('button.chip', { onclick: () => this.toggleSeq() }, '🎛️ 16 步鼓机')),
        h('span.chip.ghost', null, '键盘：Q W E R / A S D F / 空格 G H J'));
      this.body = h('div.drum-body');
      this.el.append(this.toolbar, this.body);
      const kit = h('div.kit');
      BS.DRUMS.forEach((d) => {
        const cym = [49, 51, 42, 46, 54].includes(d.n);
        const p = h('div.pad' + (cym ? '.cym' : '') + (d.n === 36 ? '.kick' : '') + (d.n === 38 ? '.snare' : ''), { 'data-n': d.n },
          h('b', null, d.name), h('small', null, d.key === ' ' ? 'Space' : d.key.toUpperCase()));
        p.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const r = p.getBoundingClientRect();
          const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
          const vel = BS.clamp(1 - Math.sqrt(dx * dx + dy * dy) * 0.9, 0.35, 1);
          this.hit(d.n, vel);
        });
        this.pads[d.n] = p;
        kit.appendChild(p);
      });
      this.body.appendChild(kit);
      this.seqEl = h('div.seq.hidden');
      this.body.appendChild(this.seqEl);
      this.buildSeq();
    }
    hit(n, vel) {
      this.play('d' + n, n, vel);
      const p = this.pads[BS.drumNorm(n)];
      if (p) { p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit'); }
    }
    toggleSeq() {
      this.seqEl.classList.toggle('hidden');
      this.seqBtn.classList.toggle('on', !this.seqEl.classList.contains('hidden'));
      if (this.seqEl.classList.contains('hidden')) this.stopSeq();
    }
    buildSeq() {
      const names = Object.fromEntries(BS.DRUMS.map((d) => [d.n, d.name]));
      const head = h('div.seq-head', null,
        (this.seqPlay = h('button.chip', { onclick: () => (this.seqTimer ? this.stopSeq() : this.startSeq()) }, '▶ 播放')),
        h('select.chip', { onchange: (e) => this.loadPreset(e.target.value) }, h('option', { value: '' }, '节奏预设…'), ...Object.keys(SEQ_PRESETS).map((k) => h('option', { value: k }, k))),
        h('button.chip', { onclick: () => { SEQ_ROWS.forEach((n) => this.seq[n].fill(0)); this.refreshSeq(); } }, '清空'));
      const grid = h('div.seq-grid');
      this.seqCells = {};
      SEQ_ROWS.forEach((n) => {
        const row = h('div.seq-row', null, h('label', null, names[n]));
        this.seqCells[n] = [];
        for (let i = 0; i < 16; i++) {
          const c = h('button.step' + (i % 4 === 0 ? '.beat' : ''), { onclick: () => { this.seq[n][i] ^= 1; this.refreshSeq(); if (this.seq[n][i]) this.hit(n, 0.7); } });
          this.seqCells[n].push(c);
          row.appendChild(c);
        }
        grid.appendChild(row);
      });
      this.seqEl.append(head, grid);
      this.loadPreset('流行');
    }
    loadPreset(k) {
      const p = SEQ_PRESETS[k];
      if (!p) return;
      SEQ_ROWS.forEach((n) => { const s = p[n] || ''; for (let i = 0; i < 16; i++) this.seq[n][i] = s[i] === 'x' ? 1 : 0; });
      this.refreshSeq();
    }
    refreshSeq() { SEQ_ROWS.forEach((n) => this.seqCells[n].forEach((c, i) => c.classList.toggle('on', !!this.seq[n][i]))); }
    startSeq() {
      const A = BS.Audio;
      A.init();
      let next = A.now() + 0.05, step = 0;
      this.seqPlay.textContent = '⏸ 停止';
      this.seqTimer = setInterval(() => {
        const dt = 15 / this.opts.getBpm();
        while (next < A.now() + 0.12) {
          const s = step % 16;
          SEQ_ROWS.forEach((n) => { if (this.seq[n][s]) this.opts.onSeq(n, s % 4 === 0 ? 0.85 : 0.65, next); });
          const when = next;
          setTimeout(() => SEQ_ROWS.forEach((n) => this.seqCells[n].forEach((c, i) => c.classList.toggle('cur', i === s))), Math.max(0, (when - A.now()) * 1000));
          next += dt; step++;
        }
      }, 25);
    }
    stopSeq() {
      clearInterval(this.seqTimer); this.seqTimer = null;
      if (this.seqPlay) this.seqPlay.textContent = '▶ 播放';
      SEQ_ROWS.forEach((n) => this.seqCells[n].forEach((c) => c.classList.remove('cur')));
    }
    keydown(e) {
      const key = e.code === 'Space' || e.code === 'KeyB' ? ' ' : e.key.toLowerCase();
      const d = BS.DRUMS.find((x) => x.key === key);
      if (!d) return false;
      if (!e.repeat) this.hit(d.n, 0.85);
      return true;
    }
    autoOn(n) { const p = this.pads[BS.drumNorm(n)]; if (p) { p.classList.remove('auto'); void p.offsetWidth; p.classList.add('auto'); } }
    hint(set) {
      Object.values(this.pads).forEach((p) => p.classList.remove('hint'));
      set.forEach((n) => { const p = this.pads[BS.drumNorm(n)]; if (p) p.classList.add('hint'); });
    }
    destroy() { this.stopSeq(); super.destroy(); }
  }
  V.drums = DrumView;

  // ===================== 古筝 / 竖琴 =====================
  class HarpView extends Base {
    constructor(host, opts) {
      super(host, opts);
      this.el.classList.add('harp-view');
      this.zheng = opts.inst === 'guzheng';
      this.keyPc = 2;
      this.body = h('div.harp-body' + (this.zheng ? '.zheng' : ''));
      this.el.append(h('div.view-tools', null, h('span.chip.ghost', null, this.zheng ? '21 弦古筝 · 五声音阶 · 横扫即可刮奏' : '竖琴 · 自然音阶 · 横扫即可刮奏'), h('span.chip.ghost', null, '键盘：Z 行 / A 行 / Q 行 由低到高')), this.body);
      this.build(null);
      this.bind();
    }
    setSong(song, track) {
      this.keyPc = song && song.keyPc != null ? song.keyPc : this.zheng ? 2 : 0;
      this.build(track);
    }
    build(track) {
      const scale = this.zheng ? [0, 2, 4, 7, 9] : [0, 2, 4, 5, 7, 9, 11];
      let notes = [];
      const lo = this.zheng ? 38 : 43, hi = this.zheng ? 86 : 91;
      for (let m = lo; m <= hi; m++) if (scale.includes(((m - this.keyPc) % 12 + 12) % 12)) notes.push(m);
      if (this.zheng) notes = notes.slice(0, 21);
      if (track) track.notes.forEach((n) => { if (n.m >= lo - 5 && n.m <= hi + 5 && !notes.includes(n.m)) notes.push(n.m); });
      notes.sort((a, b) => a - b);
      this.notes = notes;
      this.body.innerHTML = '';
      this.strings = notes.map((m, i) => {
        const jp = V.jianpuLabel(m, this.keyPc);
        const dots = jp.oct > 0 ? '•'.repeat(jp.oct) : '';
        const ldots = jp.oct < 0 ? '•'.repeat(-jp.oct) : '';
        const s = h('div.hstring' + (((m - this.keyPc) % 12 + 12) % 12 === 0 ? '.tonic' : '') + (jp.deg.includes('#') ? '.chrom' : ''), { 'data-m': m, style: { '--w': (this.zheng ? 3.2 - (i / notes.length) * 2.2 : 2.6 - (i / notes.length) * 1.8).toFixed(2) + 'px' } },
          h('i'), h('span.hlab', null, h('em', null, dots), jp.deg, h('em', null, ldots)));
        this.body.appendChild(s);
        return s;
      });
      this.codeMap = {};
      const rows = [ROWS4[3], ROWS4[2], ROWS4[1], ROWS4[0]];
      let k = 0;
      const start = Math.max(0, Math.floor(notes.length / 2) - 15);
      rows.forEach((r) => r.forEach((c) => { const idx = start + k++; if (notes[idx] != null) this.codeMap[c] = idx; }));
    }
    idxAt(x) {
      const r = this.body.getBoundingClientRect();
      const n = this.notes.length;
      return BS.clamp(Math.floor(((x - r.left) / r.width) * n), 0, n - 1);
    }
    pluck(i, vel) {
      const m = this.notes[i];
      this.play('h' + i + ':' + BS.uid(), m, vel);
      const s = this.strings[i];
      s.classList.remove('pluck'); void s.offsetWidth; s.classList.add('pluck');
    }
    bind() {
      const P = {};
      this.body.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.body.setPointerCapture(e.pointerId);
        const i = this.idxAt(e.clientX);
        P[e.pointerId] = { i, x: e.clientX, t: performance.now() };
        this.pluck(i, 0.8);
      });
      this.body.addEventListener('pointermove', (e) => {
        const p = P[e.pointerId];
        if (!p) return;
        const i = this.idxAt(e.clientX);
        if (i === p.i) return;
        const now = performance.now();
        const speed = Math.abs(e.clientX - p.x) / Math.max(1, now - p.t);
        const vel = BS.clamp(0.45 + speed * 0.4, 0.4, 1);
        const dir = i > p.i ? 1 : -1;
        for (let k = p.i + dir; dir > 0 ? k <= i : k >= i; k += dir) this.pluck(k, vel);
        p.i = i; p.x = e.clientX; p.t = now;
      });
      const up = (e) => delete P[e.pointerId];
      this.body.addEventListener('pointerup', up);
      this.body.addEventListener('pointercancel', up);
    }
    keydown(e) {
      const i = this.codeMap[e.code];
      if (i == null) return false;
      if (!e.repeat) this.pluck(i, 0.8);
      return true;
    }
    play(key, m, vel) { super.play(key, m, vel); setTimeout(() => this.release(key), 30); }
    noteRect(m, hostRect) {
      const i = this.notes.indexOf(m);
      if (i < 0) return null;
      const r = this.strings[i].getBoundingClientRect();
      return { x: r.left - hostRect.left + r.width * 0.15, w: r.width * 0.7 };
    }
    hint(set) {
      this.strings.forEach((s) => s.classList.remove('hint'));
      set.forEach((m) => { const i = this.notes.indexOf(m); if (i >= 0) this.strings[i].classList.add('hint'); });
    }
    autoOn(m, color) {
      const i = this.notes.indexOf(m);
      if (i < 0) return;
      const s = this.strings[i];
      s.style.setProperty('--auto', color);
      s.classList.remove('pluck'); void s.offsetWidth; s.classList.add('pluck', 'auto');
      setTimeout(() => s.classList.remove('auto'), 300);
    }
  }
  V.harp = HarpView;

  // ===================== 弓弦（小提琴/大提琴/二胡） =====================
  class RibbonView extends Base {
    constructor(host, opts) {
      super(host, opts);
      this.el.classList.add('ribbon-view');
      const T = { violin: [76, 69, 62, 55], cello: [57, 50, 43, 36], contrabass: [43, 38, 33, 28], erhu: [69, 62] };
      this.open = T[opts.inst] || T.violin;
      this.span = 19;
      this.snap = BS.store.get('ribbonSnap', true);
      this.keyPc = 0;
      this.toolbar = h('div.view-tools', null,
        (this.snapBtn = h('button.chip' + (this.snap ? '.on' : ''), { onclick: () => { this.snap = !this.snap; BS.store.set('ribbonSnap', this.snap); this.snapBtn.classList.toggle('on', this.snap); } }, '🎯 音高吸附')),
        h('span.chip.ghost', null, '按住拉弦 · 左右滑动换音/揉弦 · 上下控制力度'),
        h('span.chip.ghost', null, '键盘同钢琴布局'));
      this.body = h('div.ribbon-body');
      this.el.append(this.toolbar, this.body);
      this.build();
      this.bind();
      this.codeMap = {};
      const base = this.open[this.open.length - 1];
      LOWER.forEach((c, i) => (this.codeMap[c] = base + i));
      UPPER.forEach((c, i) => (this.codeMap[c] = base + 12 + i));
    }
    setSong(song) { this.keyPc = song && song.keyPc != null ? song.keyPc : 0; this.build(); }
    build() {
      this.body.innerHTML = '';
      this.rows = this.open.map((open, si) => {
        const row = h('div.rstring', { 'data-s': si, style: { '--thick': (1.5 + si * 0.8) + 'px' } });
        const marks = h('div.rmarks');
        for (let k = 0; k <= this.span; k++) {
          const m = open + k;
          const inScale = [0, 2, 4, 5, 7, 9, 11].includes(((m - this.keyPc) % 12 + 12) % 12);
          marks.appendChild(h('div.rmark' + (inScale ? '.scale' : ''), { 'data-m': m }, h('span', null, BS.noteName(m))));
        }
        row.append(h('div.rlabel', null, BS.noteName(open)), marks, h('div.rdot'));
        this.body.appendChild(row);
        return row;
      });
    }
    posToMidi(row, x) {
      const marks = row.querySelector('.rmarks').getBoundingClientRect();
      const f = BS.clamp((x - marks.left) / marks.width, 0, 0.9999) * (this.span + 1);
      const open = this.open[+row.dataset.s];
      return this.snap ? open + Math.floor(f) : open + f - 0.5;
    }
    bind() {
      const P = (this.ptrs = {});
      this.body.addEventListener('pointerdown', (e) => {
        const row = e.target.closest('.rstring');
        if (!row) return;
        e.preventDefault();
        this.body.setPointerCapture(e.pointerId);
        const m = this.posToMidi(row, e.clientX);
        const r = row.getBoundingClientRect();
        const vel = BS.clamp(1 - Math.abs((e.clientY - r.top) / r.height - 0.5), 0.4, 1);
        P[e.pointerId] = { row, m: Math.round(m) };
        this.play('r' + e.pointerId, Math.round(m), vel);
        if (!this.snap) this.glide('r' + e.pointerId, m);
        this.dot(row, e.clientX, true);
      });
      this.body.addEventListener('pointermove', (e) => {
        const p = P[e.pointerId];
        if (!p) return;
        const m = this.posToMidi(p.row, e.clientX);
        this.dot(p.row, e.clientX, true);
        if (this.snap) { if (m !== p.m) { p.m = m; this.glide('r' + e.pointerId, m); } }
        else { this.glide('r' + e.pointerId, m); }
      });
      const up = (e) => { const p = P[e.pointerId]; if (!p) return; this.release('r' + e.pointerId); this.dot(p.row, 0, false); delete P[e.pointerId]; };
      this.body.addEventListener('pointerup', up);
      this.body.addEventListener('pointercancel', up);
    }
    dot(row, x, on) {
      const d = row.querySelector('.rdot');
      if (!on) { d.classList.remove('on'); return; }
      const r = row.getBoundingClientRect();
      d.style.left = x - r.left + 'px';
      d.classList.add('on');
    }
    keydown(e) {
      const m = this.codeMap[e.code];
      if (m == null) return false;
      if (!this.keysDown[e.code]) { this.keysDown[e.code] = 1; this.play('k' + e.code, m, 0.8); }
      return true;
    }
    keyup(e) { if (this.codeMap[e.code] == null) return false; delete this.keysDown[e.code]; this.release('k' + e.code); return true; }
    marksFor(m) { return BS.$$('.rmark[data-m="' + Math.round(m) + '"]', this.body); }
    hint(set) {
      BS.$$('.rmark.hint', this.body).forEach((x) => x.classList.remove('hint'));
      set.forEach((m) => { const ms = this.marksFor(m); if (ms[0]) ms[ms.length - 1].classList.add('hint'); });
    }
    autoOn(m, color) { this.marksFor(m).forEach((x) => { x.classList.add('auto'); x.style.setProperty('--auto', color); }); }
    autoOff(m) { this.marksFor(m).forEach((x) => x.classList.remove('auto')); }
  }
  V.ribbon = RibbonView;

  V.create = function (inst, host, opts, forceKeys) {
    const def = BS.INST[inst] || BS.INST.piano;
    const type = forceKeys && inst !== 'drums' ? 'keys' : def.view;
    const Cls = V[type] || KeyboardView;
    const v = new Cls(host, Object.assign({}, opts, { inst }));
    v.type = type;
    return v;
  };
})();
