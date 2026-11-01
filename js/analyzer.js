/* 星光乐队 · 音频深度解析
 * 把一段录音拆成：主旋律 / 低音线 / 鼓点 / 和弦 / 速度拍号 / 各段落力度，
 * 再交给编曲引擎换成乐器演奏。原声默认静音，只听乐器版本。
 */
(function () {
  const BS = window.BS;
  const AN = (BS.Analyzer = {});

  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }

  const pctOf = (arr, p) => {
    if (!arr.length) return 0;
    const a = Float32Array.from(arr).sort();
    return a[Math.floor(BS.clamp(p, 0, 0.999) * a.length)] || 0;
  };

  // ---------- 简单三和弦模板（MIDI 导入时按小节猜和弦用） ----------
  const TEMPL = [];
  for (let r = 0; r < 12; r++) {
    TEMPL.push({ name: BS.Theory.KEYS[r], pcs: [r, (r + 4) % 12, (r + 7) % 12] });
    TEMPL.push({ name: BS.Theory.KEYS[r] + 'm', pcs: [r, (r + 3) % 12, (r + 7) % 12] });
  }
  AN.matchChord = function (chroma, prevName) {
    const sum = chroma.reduce((a, b) => a + b, 0);
    if (sum < 1e-6) return null;
    const c = chroma.map((x) => x / sum);
    let best = null, bs = -1;
    TEMPL.forEach((t) => {
      let s = t.pcs.reduce((a, p, i) => a + c[p] * (i === 0 ? 1.1 : 1), 0);
      if (t.name === prevName) s += 0.03;
      if (s > bs) { bs = s; best = t.name; }
    });
    return best;
  };
  AN.chordsFromNotes = function (tracks, bpb, end) {
    const out = [];
    let prev = null;
    for (let t = 0; t < end; t += bpb) {
      const ch = new Array(12).fill(0);
      tracks.forEach((tr) => {
        if (tr.inst === 'drums') return;
        tr.notes.forEach((n) => {
          const ov = Math.min(n.t + n.d, t + bpb) - Math.max(n.t, t);
          if (ov > 0) ch[n.m % 12] += ov * (n.v || 0.7) * (n.m < 55 ? 1.6 : 1);
        });
      });
      const name = AN.matchChord(ch, prev);
      if (name) {
        if (out.length && out[out.length - 1].name === name && out[out.length - 1].t + out[out.length - 1].d === t) out[out.length - 1].d += bpb;
        else out.push({ t, d: bpb, name });
        prev = name;
      }
    }
    return out;
  };

  // ---------- 和弦：24 种大 / 小三和弦（七和弦会把旋律音吃进去，识别反而不稳） ----------
  const QUALS = [
    { s: '', iv: [0, 4, 7], pen: 0 },
    { s: 'm', iv: [0, 3, 7], pen: 0 },
  ];
  const CH_STATES = [];
  QUALS.forEach((q, qi) => {
    for (let r = 0; r < 12; r++) {
      const vec = new Float32Array(12);
      q.iv.forEach((x, i) => { vec[(r + x) % 12] = i === 0 ? 1 : i === 3 ? 0.55 : 0.85; });
      let nn = 0; vec.forEach((v) => (nn += v * v));
      CH_STATES.push({ root: r, qi, pen: q.pen, name: BS.Theory.KEYS[r] + q.s, vec, norm: Math.sqrt(nn), tones: q.iv.slice(0, 3).map((x) => (r + x) % 12) });
    }
  });
  const MAJ_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function estimateKey(pc) {
    let best = { score: -1e9, root: 0, minor: false };
    for (let r = 0; r < 12; r++) {
      for (const minor of [false, true]) {
        const prof = minor ? MIN_PROFILE : MAJ_PROFILE;
        let ma = 0, mb = 0;
        for (let i = 0; i < 12; i++) { ma += pc[(r + i) % 12]; mb += prof[i]; }
        ma /= 12; mb /= 12;
        let num = 0, da = 0, db = 0;
        for (let i = 0; i < 12; i++) { const a = pc[(r + i) % 12] - ma, b = prof[i] - mb; num += a * b; da += a * a; db += b * b; }
        const s = num / (Math.sqrt(da * db) + 1e-9);
        if (s > best.score) best = { score: s, root: r, minor };
      }
    }
    return best;
  }

  // 用和弦时长判断调：音阶覆盖率 + 主和弦占比 + 属/下属 + 结尾和弦
  function keyFromChords(chords) {
    const T = BS.Theory;
    const dur = new Array(24).fill(0);
    let total = 0, last = null;
    chords.forEach((c) => { const ch = T.chord(c.name); if (!ch) return; dur[ch.root + (ch.minor ? 12 : 0)] += c.d; total += c.d; last = ch; });
    if (!total) return null;
    let best = { score: -1e9, root: 0, minor: false };
    for (let r = 0; r < 12; r++) {
      for (const minor of [false, true]) {
        const scaleRoot = minor ? (r + 3) % 12 : r;
        const scale = new Set([0, 2, 4, 5, 7, 9, 11].map((i) => (scaleRoot + i) % 12));
        let diat = 0;
        chords.forEach((c) => { const ch = T.chord(c.name); if (ch && [0, 1, 2].every((i) => scale.has((ch.root + ch.iv[i]) % 12))) diat += c.d; });
        const tonic = (minor ? dur[12 + r] : dur[r]) / total;
        const dom = (dur[(r + 7) % 12] + (minor ? dur[12 + (r + 5) % 12] : dur[(r + 5) % 12])) / total;
        let sc = diat / total + 0.8 * tonic + 0.25 * dom - (minor ? 0.04 : 0);
        if (last && last.root === r && last.minor === minor) sc += 0.15;
        if (sc > best.score) best = { score: sc, root: r, minor };
      }
    }
    return best;
  }

  function chordPath(emis, nb, NS, switchCost, bonus) {
    const score = new Float32Array(NS), nscore = new Float32Array(NS), back = new Uint8Array(nb * NS);
    for (let s = 0; s < NS; s++) score[s] = emis[s] + bonus[s];
    for (let k = 1; k < nb; k++) {
      let mx = -1e9, am = 0;
      for (let s = 0; s < NS; s++) if (score[s] > mx) { mx = score[s]; am = s; }
      const sw = mx - switchCost(k);
      for (let s = 0; s < NS; s++) {
        const stay = score[s];
        if (stay >= sw) { nscore[s] = stay + emis[k * NS + s] + bonus[s]; back[k * NS + s] = s; }
        else { nscore[s] = sw + emis[k * NS + s] + bonus[s]; back[k * NS + s] = am; }
      }
      score.set(nscore);
    }
    let am = 0;
    for (let s = 1; s < NS; s++) if (score[s] > score[am]) am = s;
    const path = new Int16Array(nb);
    for (let k = nb - 1; k >= 0; k--) { path[k] = am; am = back[k * NS + am]; }
    return path;
  }

  // ---------- 单音高追踪：显著度 + Viterbi 平滑 ----------
  function pitchViterbi(sal, T, S, ref, rel, o) {
    const NS = S + 1;
    const emis = (t, s) => {
      if (s === 0) return 0;
      let e = (sal[t * S + s - 1] / ref - o.thr) * o.gain;
      if (o.prior) e += o.prior(s - 1);
      if (rel[t] < 0.08) e -= 0.7;
      return e;
    };
    const score = new Float32Array(NS), nscore = new Float32Array(NS), back = new Int8Array(T * NS);
    for (let s = 0; s < NS; s++) score[s] = emis(0, s);
    const jump = new Float32Array(NS * NS);
    for (let a = 0; a < NS; a++) for (let b = 0; b < NS; b++) {
      jump[a * NS + b] = a === b ? 0 : a === 0 || b === 0 ? -o.uv : -(o.j0 + o.j1 * Math.min(Math.abs(a - b), 12));
    }
    for (let t = 1; t < T; t++) {
      for (let s2 = 0; s2 < NS; s2++) {
        let best = -1e9, arg = 0;
        for (let s1 = 0; s1 < NS; s1++) { const v = score[s1] + jump[s1 * NS + s2]; if (v > best) { best = v; arg = s1; } }
        nscore[s2] = best + emis(t, s2);
        back[t * NS + s2] = arg;
      }
      score.set(nscore);
    }
    let am = 0;
    for (let s = 1; s < NS; s++) if (score[s] > score[am]) am = s;
    const path = new Int16Array(T);
    for (let t = T - 1; t >= 0; t--) { path[t] = am; am = back[t * NS + am]; }
    return path;
  }

  function pickPeaks(arr, R, mult, gap, floor) {
    const out = [];
    let last = -1e9;
    for (let f = 1; f < arr.length - 1; f++) {
      if (arr[f] < floor || arr[f] < arr[f - 1] || arr[f] < arr[f + 1]) continue;
      let m = 0, c = 0;
      for (let k = Math.max(0, f - R); k <= Math.min(arr.length - 1, f + R); k++) { m += arr[k]; c++; }
      if (arr[f] > (m / c) * mult && f - last >= gap) { out.push(f); last = f; }
    }
    return out;
  }

  // ======================= 主流程 =======================
  AN.analyze = async function (ab, onProgress) {
    const prog = onProgress || (() => {});
    const sr0 = ab.sampleRate;
    const factor = Math.max(1, Math.ceil(sr0 / 24000));
    const sr = sr0 / factor;
    const c0 = ab.getChannelData(0), c1 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null;
    const n = Math.floor(c0.length / factor);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < factor; k++) { const j = i * factor + k; s += c0[j] + (c1 ? c1[j] : 0); }
      x[i] = s / (factor * (c1 ? 2 : 1));
    }
    const N = 2048, half = N / 2;
    const hop = Math.max(256, Math.round(sr * 0.023));
    const fps = sr / hop, binHz = sr / N;
    const frames = Math.floor((n - N) / hop) + 1;
    if (frames < 120) throw new Error('音频太短，至少需要 3 秒以上');
    const frameSec = (f) => (f * hop + N / 2) / sr;

    const win = new Float32Array(N);
    for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

    // 旋律候选的谐波位置
    const MEL_LO = 48, MEL_HI = 84, NM = MEL_HI - MEL_LO + 1, NH = 8;
    const wH = []; for (let h = 0; h < NH; h++) wH.push(Math.pow(0.82, h));
    const posM = new Float32Array(NM * NH), tolM = new Float32Array(NM * NH);
    for (let mi = 0; mi < NM; mi++) for (let h = 0; h < NH; h++) {
      const p = (BS.mtof(MEL_LO + mi) * (h + 1)) / binHz;
      posM[mi * NH + h] = p; tolM[mi * NH + h] = Math.max(0.7, p * 0.018);
    }
    // 色度（每半音 3 格）
    const kLo = Math.max(1, Math.round(60 / binHz)), kHi = Math.min(half - 2, Math.round(2200 / binHz));
    const chromaBin = new Int16Array(half).fill(-1);
    for (let k = kLo; k <= kHi; k++) chromaBin[k] = ((Math.round(36 * Math.log2((k * binHz) / 65.406)) % 36) + 36) % 36;
    // 频带
    const band = (lo, hi) => [Math.max(1, Math.round(lo / binHz)), Math.min(half - 1, Math.round(hi / binHz))];
    const [lo0, lo1] = band(35, 150), [mi0, mi1] = band(1500, 5000), [hi0, hi1] = band(5500, sr * 0.45);

    const rms = new Float32Array(frames), cent = new Float32Array(frames), flux = new Float32Array(frames);
    const fLow = new Float32Array(frames), fMid = new Float32Array(frames), fHi = new Float32Array(frames);
    const melSal = new Float32Array(frames * NM), chroma = new Float32Array(frames * 36);
    const re = new Float32Array(N), im = new Float32Array(N), mag = new Float32Array(half), prev = new Float32Array(half), w = new Float32Array(half), pre = new Float32Array(half + 1);

    for (let f = 0; f < frames; f++) {
      const off = f * hop;
      let e = 0;
      for (let i = 0; i < N; i++) { const v = x[off + i]; e += v * v; re[i] = v * win[i]; im[i] = 0; }
      rms[f] = Math.sqrt(e / N);
      fft(re, im);
      let fl = 0, fl0 = 0, fl1 = 0, fl2 = 0, cs = 0, cm = 0;
      pre[0] = 0;
      for (let k = 0; k < half; k++) {
        const m = Math.sqrt(Math.sqrt(re[k] * re[k] + im[k] * im[k]));
        mag[k] = m;
        pre[k + 1] = pre[k] + m;
        const d = m - prev[k];
        if (d > 0 && k > 1) {
          fl += d;
          if (k >= lo0 && k <= lo1) fl0 += d; else if (k >= mi0 && k <= mi1) fl1 += d; else if (k >= hi0 && k <= hi1) fl2 += d;
        }
        prev[k] = m;
        if (k >= 3 && k <= half * 0.5) { cs += k * m; cm += m; }
      }
      flux[f] = fl; fLow[f] = fl0; fMid[f] = fl1; fHi[f] = fl2;
      cent[f] = cm > 0 ? (cs / cm) * binHz : 0;
      // 去掉平滑的底噪，只留音高谱峰
      for (let k = 0; k < half; k++) {
        const a = Math.max(0, k - 10), b = Math.min(half, k + 11);
        const env = (pre[b] - pre[a]) / (b - a);
        w[k] = mag[k] > env ? mag[k] - env : 0;
      }
      for (let mi = 0; mi < NM; mi++) {
        let s = 0;
        for (let h = 0; h < NH; h++) {
          const p = posM[mi * NH + h];
          if (p > half - 3) break;
          const t = tolM[mi * NH + h];
          const lo = Math.max(1, Math.floor(p - t)), hi = Math.min(half - 2, Math.ceil(p + t));
          let pk = 0;
          for (let k = lo; k <= hi; k++) if (w[k] > pk) pk = w[k];
          s += wH[h] * pk;
        }
        melSal[f * NM + mi] = s;
      }
      for (let k = kLo; k <= kHi; k++) { const b = chromaBin[k]; if (b >= 0) chroma[f * 36 + b] += w[k]; }
      if (f % 120 === 0) { prog((f / frames) * 0.45, '分析频谱 ' + Math.round((f / frames) * 100) + '%'); await BS.yieldNow(); }
    }

    // ---------- 低音线（4096 点，低频更细） ----------
    prog(0.46, '提取低音线');
    const N2 = 4096, half2 = N2 / 2, binHz2 = sr / N2;
    const BAS_LO = 31, BAS_HI = 58, NB = BAS_HI - BAS_LO + 1, NHB = 6;
    const hop2 = hop * 2, frames2 = Math.max(0, Math.floor((n - N2) / hop2));
    const win2 = new Float32Array(N2);
    for (let i = 0; i < N2; i++) win2[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N2 - 1));
    const posB = new Float32Array(NB * NHB), tolB = new Float32Array(NB * NHB);
    for (let bi = 0; bi < NB; bi++) for (let h = 0; h < NHB; h++) {
      const p = (BS.mtof(BAS_LO + bi) * (h + 1)) / binHz2;
      posB[bi * NHB + h] = p; tolB[bi * NHB + h] = Math.max(0.8, p * 0.012);
    }
    const kMax2 = Math.min(half2 - 2, Math.round(1500 / binHz2));
    const bassSal = new Float32Array(frames2 * NB);
    const re2 = new Float32Array(N2), im2 = new Float32Array(N2), mag2 = new Float32Array(half2), w2 = new Float32Array(half2), pre2 = new Float32Array(half2 + 1);
    for (let j = 0; j < frames2; j++) {
      const off = Math.max(0, Math.min(n - N2, j * hop2 - (N2 - N) / 2));
      for (let i = 0; i < N2; i++) { re2[i] = x[off + i] * win2[i]; im2[i] = 0; }
      fft(re2, im2);
      pre2[0] = 0;
      for (let k = 0; k < half2; k++) { const m = Math.sqrt(Math.sqrt(re2[k] * re2[k] + im2[k] * im2[k])); mag2[k] = m; pre2[k + 1] = pre2[k] + m; }
      for (let k = 0; k <= kMax2 + 8; k++) {
        const a = Math.max(0, k - 8), b = Math.min(half2, k + 9);
        const env = (pre2[b] - pre2[a]) / (b - a);
        w2[k] = mag2[k] > env ? mag2[k] - env : 0;
      }
      for (let bi = 0; bi < NB; bi++) {
        let s = 0;
        for (let h = 0; h < NHB; h++) {
          const p = posB[bi * NHB + h];
          if (p > kMax2) break;
          const t = tolB[bi * NHB + h];
          let pk = 0;
          for (let k = Math.max(1, Math.floor(p - t)); k <= Math.ceil(p + t); k++) if (w2[k] > pk) pk = w2[k];
          s += Math.pow(0.85, h) * pk;
        }
        bassSal[j * NB + bi] = s;
      }
      if (j % 120 === 0) { prog(0.46 + (j / frames2) * 0.14, '提取低音线'); await BS.yieldNow(); }
    }

    // ---------- 速度 / 节拍 ----------
    prog(0.62, '检测速度与拍号');
    const fm = pctOf(flux, 0.5);
    const oenv = new Float32Array(frames);
    for (let f = 0; f < frames; f++) oenv[f] = Math.max(0, flux[f] - fm);
    const oS = new Float32Array(frames);
    for (let f = 1; f < frames - 1; f++) oS[f] = (oenv[f - 1] * 0.5 + oenv[f] + oenv[f + 1] * 0.5) / 2;
    // 速度：真正的拍长，其 2 倍、3 倍、4 倍处（小节）也应该有明显的周期性；附点拍（1.5 倍）则没有
    const Lmin = Math.floor((fps * 60) / 190), Lmax = Math.ceil((fps * 60) / 60), Lbig = Lmax * 4 + 2;
    const acfA = new Float64Array(Lbig + 2);
    for (let L = 1; L <= Lbig; L++) { let sum = 0; for (let f = 0; f + L < frames; f++) sum += oenv[f] * oenv[f + L]; acfA[L] = sum / Math.max(1, frames - L); }
    const acfAt = (v) => { const i = Math.floor(v), fr = v - i; return i + 1 > Lbig ? 0 : acfA[i] * (1 - fr) + acfA[i + 1] * fr; };
    let bestL = Math.round(fps / 2), bestS = -1;
    const acf = acfA;
    for (let L = Lmin; L <= Lmax; L++) {
      const bb = (60 * fps) / L;
      const wgt = Math.exp(-0.5 * Math.pow(Math.log2(bb / 100) / 0.5, 2));
      const sc = (acfA[L] + 0.7 * acfAt(2 * L) + 0.5 * (acfAt(3 * L) + acfAt(4 * L))) * wgt;
      if (sc > bestS) { bestS = sc; bestL = L; }
    }
    let Lr = bestL;
    if (bestL > 1 && acf[bestL + 1] != null) {
      const a1 = acf[bestL - 1], b1 = acf[bestL], c1 = acf[bestL + 1], den = a1 - 2 * b1 + c1;
      if (den !== 0) Lr = bestL + (0.5 * (a1 - c1)) / den;
    }
    let bpm0 = (60 * fps) / Lr;
    if (!isFinite(bpm0) || bpm0 < 55 || bpm0 > 200) bpm0 = 110;
    // 细调速度和起拍相位
    const gridScore = (bpm, phase) => {
      const per = (60 * fps) / bpm;
      let s = 0, c = 0;
      for (let t = phase; t < frames - 1; t += per) { s += oS[Math.round(t)]; c++; }
      return c ? s / c : 0;
    };
    let bpm = bpm0, phase = 0, gs = -1;
    for (let b = bpm0 * 0.97; b <= bpm0 * 1.03 + 1e-6; b += bpm0 * 0.002) {
      const per = (60 * fps) / b;
      for (let ph = 0; ph < per; ph += 0.5) { const s = gridScore(b, ph); if (s > gs) { gs = s; bpm = b; phase = ph; } }
    }
    bpm = Math.round(bpm * 10) / 10;
    const period = (60 * fps) / bpm;
    const nb = Math.floor((frames - 1 - phase) / period) - 1;
    if (nb < 16) throw new Error('没能检测到稳定的节拍');

    // 每拍的特征
    const aLow = new Float32Array(nb), aMidB = new Float32Array(nb), aAll = new Float32Array(nb), eBeat = new Float32Array(nb);
    for (let k = 0; k < nb; k++) {
      const s = Math.round(phase + k * period), e = Math.round(phase + (k + 1) * period);
      for (let f = Math.max(0, s - 1); f <= Math.min(frames - 1, s + 2); f++) { aLow[k] += fLow[f]; aMidB[k] += fMid[f]; aAll[k] += flux[f]; }
      let r = 0, c = 0;
      for (let f = s; f < e && f < frames; f++) { r += rms[f]; c++; }
      eBeat[k] = c ? r / c : 0;
    }
    // 拍号：每小节重音的周期性（3 拍还是 4 拍）
    const acc = new Float32Array(nb);
    for (let k = 0; k < nb; k++) acc[k] = aLow[k] + aAll[k] * 0.5;
    const accMean = acc.reduce((a, b) => a + b, 0) / nb;
    const rLag = (L) => { let s = 0; for (let k = 0; k + L < nb; k++) s += (acc[k] - accMean) * (acc[k + L] - accMean); return s / Math.max(1, nb - L); };
    const bpb = rLag(3) + rLag(6) > (rLag(4) + rLag(8)) * 1.25 && rLag(3) > 0 ? 3 : 4;

    // ---------- 和弦 ----------
    prog(0.68, '识别和弦');
    const g36 = new Float32Array(36);
    for (let f = 0; f < frames; f++) for (let b = 0; b < 36; b++) g36[b] += chroma[f * 36 + b];
    let tune = 0, tuneBest = -1;
    for (const t of [-1, 0, 1]) {
      let s = 0;
      for (let p = 0; p < 12; p++) s += g36[(((3 * p + t) % 36) + 36) % 36];
      if (s > tuneBest) { tuneBest = s; tune = t; }
    }
    const toPc = (c36) => {
      const out = new Float32Array(12);
      for (let p = 0; p < 12; p++) {
        const i = (((3 * p + tune) % 36) + 36) % 36;
        out[p] = c36[(i + 35) % 36] * 0.5 + c36[i] + c36[(i + 1) % 36] * 0.5;
      }
      return out;
    };
    const beatChroma = new Float32Array(nb * 12), globalPc = new Float32Array(12);
    for (let k = 0; k < nb; k++) {
      const s = Math.round(phase + k * period + period * 0.1), e = Math.round(phase + (k + 1) * period);
      const c36 = new Float32Array(36);
      for (let f = Math.max(0, s); f < Math.min(frames, e); f++) for (let b = 0; b < 36; b++) c36[b] += chroma[f * 36 + b];
      const pc = toPc(c36);
      let nn = 0;
      for (let p = 0; p < 12; p++) { pc[p] = Math.sqrt(pc[p]); nn += pc[p] * pc[p]; }
      nn = Math.sqrt(nn) || 1;
      for (let p = 0; p < 12; p++) { beatChroma[k * 12 + p] = pc[p] / nn; globalPc[p] += pc[p] / nn; }
    }
    const key = estimateKey(globalPc);
    const scalePcs = new Set((key.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map((i) => (key.root + i) % 12));
    const NS = CH_STATES.length;
    const emis = new Float32Array(nb * NS), bonus = new Float32Array(NS);
    CH_STATES.forEach((st, s) => { if (st.tones.every((t) => scalePcs.has(t))) bonus[s] = 0.04; });
    for (let k = 0; k < nb; k++) {
      for (let s = 0; s < NS; s++) {
        const st = CH_STATES[s];
        let d = 0;
        for (let p = 0; p < 12; p++) d += beatChroma[k * 12 + p] * st.vec[p];
        emis[k * NS + s] = d / st.norm - st.pen;
      }
    }
    // 第一遍：不带小节先验，用和弦变化位置 + 低音重音推断强拍
    const path1 = chordPath(emis, nb, NS, () => 0.2, bonus);
    const chg = new Float32Array(bpb), accP = new Float32Array(bpb), midP = new Float32Array(bpb);
    for (let k = 0; k < nb; k++) {
      if (k > 0 && path1[k] !== path1[k - 1]) chg[k % bpb] += 1;
      accP[k % bpb] += aLow[k];
      midP[k % bpb] += aMidB[k];
    }
    const norm = (a) => { const m = Math.max(...a, 1e-9); return a.map((v) => v / m); };
    const cN = norm(chg), aN = norm(accP);
    let bar0 = 0, b0s = -1;
    const midSum = midP.reduce((a, b) => a + b, 0) || 1;
    for (let p = 0; p < bpb; p++) {
      // 流行/摇滚的反拍：军鼓落在第 2、4 拍，所以强拍之后的拍子中频重音更强
      let back = 0;
      if (bpb === 4) back = Math.max(0, (midP[(p + 1) % 4] + midP[(p + 3) % 4] - midP[p] - midP[(p + 2) % 4]) / midSum);
      const s = cN[p] * 2 + aN[p] + back * 1.5;
      if (s > b0s) { b0s = s; bar0 = p; }
    }
    // 第二遍：和弦更愿意在小节线 / 半小节处变化
    const path2 = chordPath(emis, nb, NS, (k) => { const r = (k - bar0 + bpb * 1000) % bpb; return r === 0 ? 0.1 : r === bpb / 2 ? 0.22 : 0.4; }, bonus);
    const chords = [];
    for (let k = 0; k < nb; k++) {
      const name = CH_STATES[path2[k]].name, t = k - bar0;
      const last = chords[chords.length - 1];
      if (last && last.name === name) last.d += 1; else chords.push({ t, d: 1, name });
    }
    // 过短的和弦并入前一个
    for (let i = chords.length - 1; i > 0; i--) if (chords[i].d < 2 && chords[i].t % bpb !== 0) { chords[i - 1].d += chords[i].d; chords.splice(i, 1); }
    while (chords.length && chords[0].t + chords[0].d <= 0) chords.shift();
    if (chords.length && chords[0].t < 0) { chords[0].d += chords[0].t; chords[0].t = 0; }

    // 基础时间映射
    const ckey = keyFromChords(chords);
    if (ckey) { key.root = ckey.root; key.minor = ckey.minor; }
    const rawBeat = (f) => (f - phase) / period - bar0;
    const origin = frameSec(Math.round(phase)) + (bar0 * 60) / bpm;
    const duration = ab.duration;
    const totalBeats = Math.max(bpb * 4, Math.ceil(((duration - origin) * bpm) / 60 / bpb) * bpb);

    // ---------- 旋律 ----------
    prog(0.74, '追踪主旋律');
    const rmsRef = pctOf(rms, 0.9) || 1;
    const rel = new Float32Array(frames);
    for (let f = 0; f < frames; f++) rel[f] = rms[f] / rmsRef;
    const frameMax = new Float32Array(frames);
    for (let f = 0; f < frames; f++) { let m = 0; for (let i = 0; i < NM; i++) m = Math.max(m, melSal[f * NM + i]); frameMax[f] = m; }
    const melRef = pctOf(frameMax, 0.9) || 1;
    const melPath = pitchViterbi(melSal, frames, NM, melRef, rel, { thr: 0.42, gain: 2.2, uv: 0.55, j0: 0.25, j1: 0.07, prior: (i) => { const m = MEL_LO + i; return (m >= 57 && m <= 79 ? 0.06 : 0) + 0.014 * (m - 62); } });
    await BS.yieldNow();

    // 起音位置（用来切开同音高的连续音）
    const peaks = new Uint8Array(frames);
    pickPeaks(oS, 6, 1.5, 3, pctOf(oS, 0.6)).forEach((f) => (peaks[f] = 1));
    const q4 = (b) => Math.round(b * 4) / 4;
    const energyVel = (f0, f1) => { let m = 0; for (let f = f0; f <= f1; f++) m = Math.max(m, rel[Math.min(frames - 1, f)]); return BS.clamp(0.4 + 0.5 * Math.min(1, m), 0.35, 0.95); };
    const runsToNotes = (path, T, toMidi, frameOf, minFrames, splitFn, confFn) => {
      const notes = [];
      let s = 0;
      while (s < T) {
        const st = path[s];
        if (st === 0) { s++; continue; }
        let e = s;
        while (e + 1 < T && path[e + 1] === st) e++;
        let a = s;
        for (let t = s + minFrames; t <= e - minFrames + 1; t++) {
          if (splitFn && t - a >= minFrames && splitFn(t, st)) { notes.push([a, t - 1, st]); a = t; }
        }
        if (e - a + 1 >= minFrames) notes.push([a, e, st]);
        s = e + 1;
      }
      return notes.map(([a, e, st]) => {
        const fa = frameOf(a), fb = frameOf(e + 1);
        let cf = 1;
        if (confFn) { cf = 0; for (let t = a; t <= e; t++) cf += confFn(t, st); cf /= e - a + 1; }
        return { t: q4(rawBeat(fa)), d: Math.max(0.25, q4(rawBeat(fb) - rawBeat(fa))), m: toMidi(st), v: energyVel(fa, Math.min(frames - 1, fb)), c: cf };
      });
    };
    const tidy = (notes, maxLen) => {
      notes.sort((a, b) => a.t - b.t || b.v - a.v);
      const out = [];
      notes.forEach((nt) => {
        if (nt.t < -2) return;
        const last = out[out.length - 1];
        if (last && Math.abs(nt.t - last.t) < 1e-6) return;
        if (last && last.t + last.d > nt.t) last.d = Math.max(0.25, nt.t - last.t);
        if (last && last.m === nt.m && Math.abs(last.t + last.d - nt.t) < 1e-6 && nt.d <= 0.25) { last.d += nt.d; return; }
        nt.d = Math.min(nt.d, maxLen);
        out.push(nt);
      });
      return out;
    };
    // 同音高的再次发音：该音高的能量先凹下去、再明显抬起来
    const melSplit = (t, st) => {
      if (t < 8) return false;
      const i = st - 1, g = (u) => melSal[u * NM + i];
      const before = Math.max(g(t - 6), g(t - 5), g(t - 4), g(t - 3));
      const dip = Math.min(g(t - 3), g(t - 2), g(t - 1));
      return dip < 0.7 * before && g(t) > 1.35 * dip + 1e-6;
    };
    const melConf = (t, st) => Math.min(1.5, melSal[t * NM + st - 1] / melRef);
    let melody = tidy(runsToNotes(melPath, frames, (st) => MEL_LO + st - 1, (t) => t, 3, melSplit, melConf), 8);
    // 按调清理：八度离群音拉回、低置信度的短音删掉、调外的不确定音吸附到最近的音阶音
    const scaleNow = new Set((key.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map((i) => (key.root + i) % 12));
    if (key.minor) [11].forEach((i) => scaleNow.add(i));
    melody.forEach((nt, i) => {
      const pv = melody[i - 1], nx = melody[i + 1];
      if (pv && nx && Math.abs(nt.t - pv.t) < 1.5 && Math.abs(nx.t - nt.t) < 1.5 && Math.abs(pv.m - nx.m) <= 5) {
        const mid = (pv.m + nx.m) / 2;
        if (Math.abs(nt.m - pv.m) >= 8 && Math.abs(nt.m - nx.m) >= 8) nt.m += 12 * Math.round((mid - nt.m) / 12);
      }
      if (!scaleNow.has(nt.m % 12) && (nt.c < 0.7 || nt.d <= 0.25)) {
        for (const dlt of [-1, 1, -2, 2]) if (scaleNow.has(((nt.m + dlt) % 12 + 12) % 12)) { nt.m += dlt; break; }
      }
    });
    melody = melody.filter((nt) => !(nt.c < 0.45 && nt.d <= 0.25));
    melody.forEach((nt) => delete nt.c);

    // ---------- 低音 ----------
    prog(0.82, '追踪低音');
    const bassFrameMax = new Float32Array(frames2);
    for (let j = 0; j < frames2; j++) { let m = 0; for (let i = 0; i < NB; i++) m = Math.max(m, bassSal[j * NB + i]); bassFrameMax[j] = m; }
    const bassRef = pctOf(bassFrameMax, 0.9) || 1;
    const bRel = new Float32Array(frames2);
    for (let j = 0; j < frames2; j++) bRel[j] = rel[Math.min(frames - 1, j * 2)];
    const bassPath = frames2 > 10 ? pitchViterbi(bassSal, frames2, NB, bassRef, bRel, { thr: 0.5, gain: 2.0, uv: 0.5, j0: 0.3, j1: 0.08 }) : new Int16Array(frames2);
    const bassSplit = (j, st) => {
      const i = st - 1, cur = bassSal[j * NB + i];
      return cur > 1.4 * Math.min(bassSal[(j - 1) * NB + i], bassSal[(j - 2) * NB + i]) + 1e-6;
    };
    const bass = tidy(runsToNotes(bassPath, frames2, (st) => BAS_LO + st - 1, (j) => j * 2, 2, bassSplit), 4);
    bass.forEach((nt) => delete nt.c);
    const bars = Math.ceil(totalBeats / bpb);
    const barsWithBass = new Set(bass.map((nt) => Math.floor(nt.t / bpb)));
    const bassOk = bass.length >= 12 && barsWithBass.size / bars >= 0.4;

    // ---------- 鼓点（按相同小节投票，得到干净的律动） ----------
    prog(0.88, '识别鼓点');
    const dLow = Float32Array.from(fLow), dMid = Float32Array.from(fMid), dHi = Float32Array.from(fHi);
    const kicks = pickPeaks(dLow, 6, 1.7, 3, pctOf(dLow, 0.7)).map((f) => ({ f, k: 'k', a: dLow[f] }));
    const snares = pickPeaks(dMid, 6, 1.7, 4, pctOf(dMid, 0.7)).map((f) => ({ f, k: 's', a: dMid[f] }));
    const hats = pickPeaks(dHi, 5, 1.6, 2, pctOf(dHi, 0.6)).map((f) => ({ f, k: 'h', a: dHi[f] }));
    const spBar = bpb * 4;
    const stepOf = (f) => Math.round(rawBeat(f) * 4);
    const votes = { k: {}, s: {}, h: {} }, barCount = {};
    const phraseOf = (bar) => Math.floor(bar / 8);
    const seen = new Set();
    [...kicks, ...snares, ...hats].forEach((h) => {
      const st = stepOf(h.f);
      if (st < 0) return;
      const bar = Math.floor(st / spBar), pos = st % spBar;
      const key2 = h.k + ':' + bar + ':' + pos;
      if (seen.has(key2)) return;
      seen.add(key2);
      const ph = phraseOf(bar);
      (votes[h.k][ph] = votes[h.k][ph] || new Array(spBar).fill(0))[pos]++;
    });
    for (let b = 0; b < bars; b++) barCount[phraseOf(b)] = (barCount[phraseOf(b)] || 0) + 1;
    const drumNotes = [];
    const phrases = Math.ceil(bars / 8);
    let hitTotal = 0;
    for (let ph = 0; ph < phrases; ph++) {
      const nbars = barCount[ph] || 1;
      const need = Math.max(2, nbars * 0.5);
      const pat = [];
      [['k', 36, 0.9], ['s', 38, 0.85], ['h', 42, 0.5]].forEach(([kind, midi, vel]) => {
        const v = votes[kind][ph];
        if (!v) return;
        v.forEach((cnt, pos) => {
          if (cnt < need) return;
          if (kind === 'h' && pos % 2 === 1 && v.filter((c, i) => i % 2 === 1 && c >= need).length < 3) return;
          pat.push([pos, midi, pos % 4 === 0 ? vel : vel * 0.8]);
        });
      });
      hitTotal += pat.length;
      for (let b = ph * 8; b < Math.min(bars, ph * 8 + 8); b++) {
        pat.forEach(([pos, midi, vel]) => drumNotes.push({ t: b * bpb + pos / 4, d: 0.1, m: midi, v: vel }));
      }
    }
    const kickCount = kicks.length, snareCount = snares.length;
    const hiRatio = fHi.reduce((p, q) => p + q, 0) / (flux.reduce((p, q) => p + q, 0) || 1);
    const drumsOk = hitTotal >= 4 && hiRatio >= 0.11 && (snareCount >= bars * 1.5 || hats.length >= bars * 3);
    drumNotes.sort((a, b) => a.t - b.t);

    // ---------- 段落力度 / 风格 ----------
    prog(0.94, '分析段落力度');
    const eBar = [];
    for (let b = 0; b < bars; b++) {
      let s = 0, c = 0;
      for (let k = b * bpb + bar0; k < (b + 1) * bpb + bar0 && k < nb; k++) { if (k >= 0) { s += eBeat[k]; c++; } }
      eBar.push(c ? s / c : 0);
    }
    const ePh = [];
    for (let p = 0; p < phrases; p++) { const sl = eBar.slice(p * 8, p * 8 + 8); ePh.push(sl.reduce((a, b) => a + b, 0) / Math.max(1, sl.length)); }
    const sorted = ePh.slice().sort((a, b) => a - b);
    const t1 = sorted[Math.floor(sorted.length / 3)], t2 = sorted[Math.floor((sorted.length * 2) / 3)];
    const levels = ePh.map((e) => (e <= t1 ? 1 : e >= t2 ? 3 : 2));
    if (levels.length >= 3) { levels[0] = Math.min(levels[0], 2); levels[levels.length - 1] = Math.min(levels[levels.length - 1], 2); }
    const avgCent = cent.reduce((a, b) => a + b, 0) / frames;
    const drumDensity = (kickCount + snareCount) / Math.max(1, bars);
    let style = 'pop';
    if (bpb === 3) style = bpm > 100 ? 'waltz' : 'ballad';
    else if (bpm < 84) style = 'ballad';
    else if (avgCent > 1700 && drumDensity > 5 && bpm > 105) style = 'rock';
    const stats = { frames, bars, melodyNotes: melody.length, bassNotes: bass.length, drumHits: drumNotes.length, kicks: kickCount, snares: snareCount, avgCent: Math.round(avgCent) };
    prog(1, '完成');
    return {
      bpm, bpb, keyPc: key.root, minor: key.minor, offsetSec: origin, totalBeats, duration,
      melody, bass, bassOk, drums: drumNotes, drumsOk, chords, levels, style, stats,
      dbg: { hiRatio: (fHi.reduce((a,b)=>a+b,0) / (flux.reduce((a,b)=>a+b,0)||1)), midRatio: (fMid.reduce((a,b)=>a+b,0) / (flux.reduce((a,b)=>a+b,0)||1)), lowRatio: (fLow.reduce((a,b)=>a+b,0) / (flux.reduce((a,b)=>a+b,0)||1)), bar0, chg: Array.from(chg), accP: Array.from(accP), midP: Array.from(midP), cN: Array.from(cN), aN: Array.from(aN), hats: hats.length, bars, kicks: kicks.length, snares: snares.length },
    };
  };

  // ======================= AI 转谱（Spotify Basic Pitch 神经网络） =======================
  const loadScript = (src) => new Promise((res, rej) => {
    const el = document.createElement('script');
    el.src = src; el.onload = res; el.onerror = () => rej(new Error('无法加载 ' + src));
    document.head.appendChild(el);
  });
  let aiReady = null;
  AN.loadAI = function () {
    if (aiReady) return aiReady;
    aiReady = (async () => {
      if (!window.BasicPitchLib) await loadScript('js/vendor/basic-pitch.bundle.js');
      if (!window.BASIC_PITCH_MODEL) await loadScript('js/vendor/basic-pitch-model.js');
      const L = window.BasicPitchLib, M = window.BASIC_PITCH_MODEL, tf = L.tf;
      try { await tf.setBackend('webgl'); } catch (e) { /* 没有 WebGL 就用 CPU */ }
      await tf.ready();
      const bin = atob(M.weightsB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const art = { modelTopology: M.modelTopology, format: M.format, generatedBy: M.generatedBy, convertedBy: M.convertedBy, weightSpecs: M.weightSpecs, weightData: bytes.buffer };
      if (M.signature) art.signature = M.signature;
      if (M.userDefinedMetadata) art.userDefinedMetadata = M.userDefinedMetadata;
      const model = await tf.loadGraphModel(tf.io.fromMemory(art));
      return { L, bp: new L.BasicPitch(model), backend: tf.getBackend() };
    })();
    aiReady.catch(() => { aiReady = null; });
    return aiReady;
  };

  // 返回秒为单位的多声部音符 [{s, d, m, a}]
  AN.transcribeAI = async function (ab, prog) {
    const pr = prog || (() => {});
    pr(0, '加载 AI 转谱模型');
    const { L, bp } = await AN.loadAI();
    pr(0.03, '准备音频');
    const len = Math.ceil(ab.duration * 22050);
    const off = new OfflineAudioContext(1, len, 22050);
    const src = off.createBufferSource();
    src.buffer = ab; src.connect(off.destination); src.start();
    const mono = (await off.startRendering()).getChannelData(0);
    const tf = L.tf;
    // 自己在 JS 里把音频切成 2 秒的重叠片段（模型自带的切片放在 GPU 上，长歌容易编译失败）
    const NSAMP = 22050 * 2 - 256, HOPS = NSAMP - 30 * 256, PAD = (30 * 256) / 2;
    bp.prepareData = async (audio) => {
      const total = PAD + audio.length;
      const n = Math.max(1, Math.ceil(total / HOPS));
      const data = new Float32Array(n * NSAMP);
      for (let i = 0; i < n; i++) {
        const start = i * HOPS;
        for (let k = 0; k < NSAMP; k++) { const j = start + k - PAD; if (j >= 0 && j < audio.length) data[i * NSAMP + k] = audio[j]; }
      }
      return [tf.tensor3d(data, [n, NSAMP, 1]), audio.length];
    };
    let frames, onsets, contours;
    const run = async () => {
      frames = []; onsets = []; contours = [];
      const cpu = tf.getBackend() !== 'webgl';
      tf.engine().startScope(); // 模型本身不释放中间张量，这里统一回收，防止显存越用越多
      try {
        await bp.evaluateModel(mono, (f, o, c) => { for (const x of f) frames.push(x); for (const x of o) onsets.push(x); for (const x of c) contours.push(x); },
          (pct) => pr(0.05 + pct * 0.95, 'AI 逐音转谱 ' + Math.round(pct * 100) + '%' + (cpu ? '（CPU 模式，稍慢）' : '')));
      } finally {
        tf.engine().endScope();
      }
    };
    try { await run(); }
    catch (err) {
      if (tf.getBackend() === 'cpu') throw err;
      console.warn('WebGL 转谱失败，改用 CPU 重试', err);
      await tf.setBackend('cpu'); await tf.ready();
      await run();
    }
    const notes = L.noteFramesToTime(L.addPitchBendsToNoteEvents(contours, L.outputToNotesPoly(frames, onsets, 0.5, 0.3, 8)));
    return notes.map((n) => ({ s: n.startTimeSeconds, d: n.durationSeconds, m: n.pitchMidi, a: n.amplitude }));
  };

  // 把 AI 音符拆成：主旋律（最高、最响、和人声旋律一致的那条线）/ 低音线 / 钢琴伴奏
  AN.applyAI = function (res, ai) {
    const toBeat = (sec) => ((sec - res.offsetSec) * res.bpm) / 60;
    const q = (b) => Math.round(b * 4) / 4;
    const notes = ai.filter((n) => n.d >= 0.07 && n.a >= 0.16).map((n) => ({ t: toBeat(n.s), d: (n.d * res.bpm) / 60, m: n.m, a: n.a }));
    const dsp = res.melody;
    const dspPcAt = (t) => { for (const x of dsp) { if (x.t > t + 0.01) break; if (t < x.t + x.d) return x.m; } return null; };
    const pick = (cands, score) => {
      const sorted = cands.slice().sort((a, b) => score(b) - score(a));
      const taken = [];
      sorted.forEach((n) => {
        const clash = taken.some((o) => { const ov = Math.min(n.t + n.d, o.t + o.d) - Math.max(n.t, o.t); return ov > Math.min(n.d, o.d) * 0.3; });
        if (!clash) taken.push(n);
      });
      return taken.sort((a, b) => a.t - b.t);
    };
    const melRaw = pick(notes.filter((n) => n.m >= 55 && n.m <= 92), (n) => {
      const dm = dspPcAt(n.t + n.d * 0.3);
      return n.a + (dm != null && dm % 12 === n.m % 12 ? 0.35 : 0) + (n.m - 60) * 0.008 + Math.min(n.d, 1) * 0.1;
    });
    const bassRaw = pick(notes.filter((n) => n.m >= 28 && n.m < 55), (n) => n.a + (55 - n.m) * 0.012 + Math.min(n.d, 1) * 0.1);
    const used = new Set([...melRaw, ...bassRaw]);
    const fin = (arr, maxLen) => {
      const out = [];
      arr.forEach((n) => {
        const nt = { t: q(n.t), d: Math.min(maxLen, Math.max(0.25, q(n.d))), m: Math.round(n.m), v: BS.clamp(0.35 + n.a * 0.75, 0.3, 1) };
        const last = out[out.length - 1];
        if (last && nt.t <= last.t) return;
        if (last && last.t + last.d > nt.t) last.d = Math.max(0.25, nt.t - last.t);
        out.push(nt);
      });
      return out;
    };
    // 伴奏：其余的音，同一时刻最多 4 个，去掉太弱的
    const harmRaw = notes.filter((n) => !used.has(n) && n.m >= 43 && n.m <= 86 && n.a >= 0.25).sort((a, b) => b.a - a.a);
    const harmony = [];
    harmRaw.forEach((n) => {
      const t = q(n.t);
      const same = harmony.filter((o) => Math.abs(o.t - t) < 0.01);
      if (same.length >= 4 || same.some((o) => o.m === Math.round(n.m))) return;
      harmony.push({ t, d: Math.min(6, Math.max(0.25, q(n.d))), m: Math.round(n.m), v: BS.clamp(0.3 + n.a * 0.55, 0.25, 0.85) });
    });
    harmony.sort((a, b) => a.t - b.t);
    const melody = fin(melRaw, 8);
    const bass = fin(bassRaw, 6);
    if (melody.length >= 8) res.melody = melody;
    if (bass.length >= 8) { res.bass = bass; res.bassOk = true; }
    res.harmony = harmony;
    res.ai = true;
    res.aiNotes = ai.length;
    return res;
  };

  AN.STYLE_NAMES = { faithful: '原曲还原' };
  AN.styleName = (k) => AN.STYLE_NAMES[k] || (BS.Theory.STYLES[k] || {}).name || k;

  // ======================= 乐队编配 =======================
  const ROLE_ORDER = ['lead', 'counter', 'keys', 'guitar', 'bass', 'drums', 'pad', 'timp', 'audio'];
  AN.toSong = function (res, buffer, title, style, idHint) {
    const Th = BS.Theory;
    delete res.dbg;
    style = style || (res.ai ? 'faithful' : res.style) || 'pop';
    const faithful = style === 'faithful';
    const bpb = res.bpb;
    const startBeat = -(res.offsetSec * res.bpm) / 60;
    const events = res.chords.map((c) => ({ t: c.t, d: c.d, name: c.name, ch: Th.chord(c.name) })).filter((e) => e.ch);
    const total = Math.ceil(res.totalBeats / bpb) * bpb;
    const band = Th.arrangeChords({
      events, bpb, style: faithful ? 'ballad' : style, keyPc: res.keyPc, phraseBars: 8, length: total,
      level: (k) => res.levels[Math.min(k, res.levels.length - 1)] || 2,
    });
    const st = Th.STYLES[faithful ? 'ballad' : style] || Th.STYLES.pop;
    const tracks = [];
    const avg = res.melody.length ? res.melody.reduce((a, n) => a + n.m, 0) / res.melody.length : 66;
    tracks.push({ id: 'lead', role: 'lead', name: res.ai ? '主旋律（AI 转谱）' : '主旋律（解析）', inst: faithful ? 'piano' : avg > 74 ? 'flute' : 'piano', notes: res.melody.map((n) => Object.assign({}, n)), vol: 0.88, pan: 0, send: 0.28 });
    band.forEach((tr) => {
      if (tr.role === 'bass' && res.bassOk) return;
      if (tr.role === 'drums') return;
      if (faithful && tr.role !== 'pad' && !(tr.role === 'bass' && !res.bassOk)) return;
      if (faithful && tr.role === 'pad') { tr.vol = 0.32; tr.name = '弦乐铺底'; }
      tracks.push(tr);
    });
    if (res.harmony && res.harmony.length) tracks.push({ id: 'harmony', role: 'keys', name: '钢琴伴奏（AI 转谱）', inst: 'piano', notes: res.harmony.map((n) => Object.assign({}, n)), vol: faithful ? 0.6 : 0.4, pan: -0.12, send: 0.24, mute: !faithful });
    if (res.bassOk) tracks.push({ id: 'bass', role: 'bass', name: res.ai ? '低音线（AI 转谱）' : '低音线（解析）', inst: st.bassInst || 'bass', notes: res.bass.map((n) => Object.assign({}, n)), vol: 0.85, pan: 0, send: 0.08 });
    if (res.drumsOk) tracks.push({ id: 'drums', role: 'drums', name: '鼓组（解析）', inst: 'drums', notes: res.drums.map((n) => Object.assign({}, n)), vol: 0.75, pan: 0, send: 0.12 });
    if (buffer) tracks.push({ id: 'audio', role: 'audio', name: '原声（默认静音）', inst: 'audio', notes: [], audio: buffer, audioStart: startBeat, vol: 0.9, pan: 0, send: 0, mute: true });
    tracks.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
    tracks.forEach((t) => { t.color = t.inst === 'audio' ? '#9aa0b4' : (BS.INST[t.inst] || {}).color; if (t.role === 'lead') t.mute = false; });
    tracks.forEach((t) => { if (t.notes.length) t.notes.sort((a, b) => a.t - b.t); });
    const sections = [];
    for (let t = 0, k = 0; t < total; t += bpb * 8, k++) sections.push({ name: '第 ' + (k + 1) + ' 段', t, end: Math.min(total, t + bpb * 8), level: res.levels[Math.min(k, res.levels.length - 1)] || 2 });
    return {
      id: idHint || 'audio-' + BS.uid(), title: title || '导入的音乐',
      sub: (res.ai ? 'AI 转谱 · ' : 'AI 解析 · ') + res.bpm + ' BPM · ' + Th.KEYS[res.keyPc] + (res.minor ? ' 小调' : ' 大调') + ' · ' + bpb + '/4',
      bpm: res.bpm, bpb, keyPc: res.keyPc, tracks, sections,
      chords: res.chords.map((c) => ({ t: c.t, d: c.d, name: c.name })),
      startBeat: Math.min(0, startBeat), lengthBeats: total + 2, source: 'audio', analysis: res, style,
    };
  };
})();
