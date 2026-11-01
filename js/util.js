/* 星光乐队 · 通用工具 */
(function () {
  const BS = (window.BS = window.BS || {});

  BS.NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  BS.noteName = (m) => BS.NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  BS.isBlack = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
  BS.mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  BS.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  BS.lerp = (a, b, t) => a + (b - a) * t;
  BS.rand = (a, b) => a + Math.random() * (b - a);
  BS.uid = () => Math.random().toString(36).slice(2, 10);

  BS.fmtTime = (sec) => {
    if (!isFinite(sec)) sec = 0;
    const neg = sec < 0;
    sec = Math.abs(sec);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return (neg ? '-' : '') + m + ':' + String(s).padStart(2, '0');
  };

  // 简单事件总线
  const handlers = {};
  BS.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    off(ev, fn) { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); },
    emit(ev, ...args) { (handlers[ev] || []).forEach((f) => { try { f(...args); } catch (e) { console.error(e); } }); },
  };

  BS.store = {
    get(k, def) {
      try { const v = localStorage.getItem('bs:' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set(k, v) {
      try { localStorage.setItem('bs:' + k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del(k) { try { localStorage.removeItem('bs:' + k); } catch (e) {} },
  };

  BS.$ = (sel, root) => (root || document).querySelector(sel);
  BS.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // h('div.cls#id', {attrs}, children)
  BS.h = function (tag, attrs, ...children) {
    const m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) {
      m[2].replace(/([.#])([\w-]+)/g, (_, t, n) => { if (t === '.') el.classList.add(n); else el.id = n; });
    }
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    children.flat(Infinity).forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  };

  BS.toast = function (msg, kind) {
    let wrap = BS.$('#toasts');
    if (!wrap) { wrap = BS.h('div#toasts'); document.body.appendChild(wrap); }
    const t = BS.h('div.toast' + (kind ? '.' + kind : ''), null, msg);
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, 2600);
  };

  BS.download = function (blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  };

  // 二分查找：返回第一个 t >= x 的索引
  BS.lowerBound = function (arr, x, key) {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid][key] < x) lo = mid + 1; else hi = mid; }
    return lo;
  };

  BS.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // 让出主线程：用 MessageChannel，页面在后台时也不会被定时器节流拖慢
  const yieldChan = new MessageChannel();
  const yieldWaiters = [];
  yieldChan.port1.onmessage = () => { const r = yieldWaiters.shift(); if (r) r(); };
  BS.yieldNow = () => new Promise((r) => { yieldWaiters.push(r); yieldChan.port2.postMessage(0); });
})();
