/* scenes.js — timeline engine + all scenes + window.renderAt(t)
 * Deterministic: every frame is computed from t only (no timers, no CSS animations, no Math.random).
 * Subtitles come from LINES (generated from timestamps.txt). Scene visuals are timed to the spoken
 * words of those lines through wt(lineIndex, wordIndex).
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const D = Math.ceil(Math.max.apply(null, LINES.map(l => l.e)));
  const root = document.getElementById('root');
  const TR = [];      // tracks
  const TICKS = [];   // per-frame callbacks fn(t)
  const IMGS = [];

  /* ---------- helpers ---------- */
  const clamp = (x, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, x));
  const eo = p => 1 - Math.pow(1 - p, 3);
  const eb = p => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function el(parent, cls, css, html, tag) {
    const e = document.createElement(tag || 'div');
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    if (html != null && html !== '') e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }

  /* track(element, start, end, {a: preset, i: inDur, o: outDur, d: distance, op: opacity, base, fn}) */
  function track(e, s, en, o) {
    o = o || {};
    const tr = {
      e: e, s: s, en: en, a: o.a || 'fade',
      i: o.i === undefined ? 0.4 : o.i, o: o.o === undefined ? 0.4 : o.o,
      d: o.d === undefined ? 70 : o.d, op: o.op === undefined ? 1 : o.op,
      base: o.base || '', fn: o.fn || null
    };
    e.style.visibility = 'hidden';
    TR.push(tr);
    return tr;
  }

  function preset(a, k, q, d) {
    switch (a) {
      case 'rise': return 'translateY(' + ((1 - k) * d) + 'px)';
      case 'drop': return 'translateY(' + (-(1 - k) * d) + 'px)';
      case 'pop': return 'scale(' + (0.55 + 0.45 * eb(q)) + ')';
      case 'zoom': return 'scale(' + (1.3 - 0.3 * k) + ')';
      case 'sl': return 'translateX(' + (-(1 - k) * d * 1.4) + 'px)';
      case 'sr': return 'translateX(' + ((1 - k) * d * 1.4) + 'px)';
      default: return '';
    }
  }

  /* time at which word k of subtitle line i appears (same weighting as the subtitle reveal) */
  function wt(i, k) {
    const L = LINES[i];
    const toks = L.text.split(/\s+/).filter(Boolean);
    const tot = toks.reduce((a, w) => a + Array.from(w).length, 0);
    let acc = 0;
    for (let j = 0; j < k && j < toks.length; j++) acc += Array.from(toks[j]).length;
    return L.s + (L.e - L.s) * 0.86 * acc / tot;
  }

  const norm = w => w.replace(/[,।:.?!]/g, '');
  const HL = new Set(['মুখলত', 'আল', 'এমিরেটস', 'এলেনস', 'ফ্রেগরেন্স', 'প্রিমিয়াম', 'অর্ডার',
    'লেমন', 'বার্গামট', 'হার্বাল', 'নোটস', 'স্পাইসেস', 'টাইফ', 'রোজ', 'সিনামন', 'লেভেন্ডার', 'গ্যালবানাম',
    'দেহেনা', 'লুথ', 'অ্যাম্বার', 'হাইট', 'মাস্ক', 'স্যান্ডেলউড', 'ভ্যানিলা', 'চকোলেট']);

  /* word-by-word reveal (one span per word — Bengali words are never split into letters) */
  function words(parent, text, cls, css, start, end) {
    const box = el(parent, cls, css);
    const toks = text.split(/\s+/).filter(Boolean);
    const tot = toks.reduce((a, w) => a + Array.from(w).length, 0);
    const span = (end - start) * 0.86;
    let acc = 0;
    toks.forEach(function (w) {
      const sp = el(box, 'w' + (HL.has(norm(w)) ? ' hl' : ''), null, w, 'span');
      box.appendChild(document.createTextNode(' '));
      track(sp, start + span * acc / tot, 1e9, { a: 'rise', i: 0.28, o: 0, d: 16 });
      acc += Array.from(w).length;
    });
    return box;
  }

  function chip(parent, text, s, e, o) {
    o = o || {};
    const c = el(parent, 'chip' + (o.cls ? ' ' + o.cls : ''), o.css,
      (o.icon ? ART.icon(o.icon, o.is || 52) : '') + '<span>' + text + '</span>');
    track(c, s, e, { a: o.a || 'pop', i: o.i || 0.45, o: o.o === undefined ? 0.4 : o.o });
    return c;
  }

  function scene(s, e, first, last) {
    const w = el(root, 'abs', 'left:0;top:0;width:1080px;height:1920px');
    track(w, first ? 0 : s - 0.3, last ? D + 1 : e + 0.3, { a: 'fade', i: first ? 0 : 0.3, o: last ? 0 : 0.3 });
    return w;
  }

  function productCard(parent, x, y, size, s, e, o) {
    o = o || {};
    const glow = el(parent, 'abs',
      'left:' + (x - size * 0.35) + 'px;top:' + (y - size * 0.35) + 'px;width:' + (size * 1.7) + 'px;height:' + (size * 1.7) + 'px;' +
      'background:radial-gradient(circle,rgba(242,196,109,.55) 0%,rgba(217,150,43,.25) 38%,rgba(217,150,43,0) 68%)');
    track(glow, s, e, { a: 'fade', i: o.i || 0.8, o: o.o === undefined ? 0.4 : o.o });
    const c = el(parent, 'abs pcard', 'left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px');
    const img = el(c, '', '', '', 'img');
    img.src = 'product.jpg'; img.alt = ''; IMGS.push(img);
    const sw = el(c, 'sweep');
    track(c, s, e, {
      a: o.a || 'rise', i: o.i || 0.8, o: o.o === undefined ? 0.4 : o.o,
      fn: function (t) { return 'translateY(' + (Math.sin(t * 1.3) * 8) + 'px) rotate(' + (Math.sin(t * 0.7) * 0.8) + 'deg)'; }
    });
    TICKS.push(function (t) { sw.style.left = (-40 + ((t * 0.22) % 1) * 160) + '%'; });
    return c;
  }

  function spin(parent, x, y, size, op, speed, s, e, i, o) {
    const m = el(parent, 'abs', 'left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px', ART.medallion(size));
    track(m, s, e, { a: 'zoom', i: i, o: o, op: op, fn: function (t) { return 'rotate(' + (t * speed) + 'deg)'; } });
    return m;
  }

  /* ---------- mood colour (cross-fades ~0.6 s at every line change) ---------- */
  const MOOD = { warm: [217, 150, 43], informative: [236, 190, 60], luxury: [184, 72, 31], store: [255, 212, 90] };
  function moodAt(t) {
    let idx = 0;
    for (let i = 0; i < LINES.length; i++) if (LINES[i].s <= t) idx = i;
    const cur = MOOD[LINES[idx].tag] || MOOD.warm;
    if (idx === 0) return cur.join(',');
    const prev = MOOD[LINES[idx - 1].tag] || MOOD.warm;
    const m = clamp((t - LINES[idx].s) / 0.6);
    return cur.map((c, k) => Math.round(prev[k] + (c - prev[k]) * m)).join(',');
  }

  /* ---------- background layers ---------- */
  function mkCanvas() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H; c.className = 'abs';
    c.style.cssText = 'left:0;top:0;width:1080px;height:1920px';
    root.appendChild(c);
    return c.getContext('2d');
  }
  root.insertAdjacentHTML('beforeend', ART.defs);
  const c1 = mkCanvas();                                                    // gradient + mood glow
  const lat = el(root, 'abs', 'left:0;top:0;width:1080px;height:1920px;opacity:.10;background-image:' + ART.latticeTile() + ';background-size:120px 120px');
  const bgMed = el(root, 'abs', 'left:-260px;top:420px;width:1600px;height:1600px;opacity:.10', ART.medallion(1600));
  const c2 = mkCanvas();                                                    // particles + smoke
  el(root, 'abs', 'left:0;top:0;width:1080px;height:1920px;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(0,0,0,.66) 100%)');

  const rnd = mulberry32(20261013);
  const PART = [];
  for (let i = 0; i < 64; i++) {
    PART.push({ x: rnd() * W, y: rnd() * (H + 80), sp: 12 + rnd() * 38, r: 1.4 + rnd() * 3.6, ph: rnd() * 6.283,
      tw: 1.2 + rnd() * 2.5, amp: 10 + rnd() * 30, wf: 0.2 + rnd() * 0.5, drop: rnd() < 0.12 });
  }

  function drawBase(t) {
    const g = c1.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120b07'); g.addColorStop(0.5, '#24150c'); g.addColorStop(1, '#3a2412');
    c1.fillStyle = g; c1.fillRect(0, 0, W, H);
    const m = moodAt(t), pu = 0.30 + 0.04 * Math.sin(t * 1.1);
    let rg = c1.createRadialGradient(540, 780, 0, 540, 780, 980);
    rg.addColorStop(0, 'rgba(' + m + ',' + (pu + 0.1) + ')');
    rg.addColorStop(0.55, 'rgba(' + m + ',' + (pu * 0.35) + ')');
    rg.addColorStop(1, 'rgba(' + m + ',0)');
    c1.fillStyle = rg; c1.fillRect(0, 0, W, H);
    rg = c1.createRadialGradient(540, 1780, 0, 540, 1780, 700);
    rg.addColorStop(0, 'rgba(' + m + ',0.16)'); rg.addColorStop(1, 'rgba(' + m + ',0)');
    c1.fillStyle = rg; c1.fillRect(0, 0, W, H);
  }

  function drawFx(t) {
    c2.clearRect(0, 0, W, H);
    c2.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {                         // incense / smoke wisps
      for (let j = 0; j < 22; j++) {
        const u = (j * 0.045 + t * 0.02 * (1 + k * 0.15) + k * 0.2) % 1;
        const y = H + 60 - u * (H + 120);
        const x = 140 + k * 200 + Math.sin(u * 9 + t * 0.4 + k * 1.7) * (40 + u * 70);
        const a = 0.05 * Math.sin(Math.PI * u), r = 60 + u * 80;
        const gr = c2.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,240,215,' + a + ')'); gr.addColorStop(1, 'rgba(255,240,215,0)');
        c2.fillStyle = gr; c2.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    for (let i = 0; i < PART.length; i++) {               // golden dust / oil droplets
      const p = PART[i];
      const y = (((p.y - t * p.sp) % (H + 80)) + (H + 80)) % (H + 80) - 40;
      const x = p.x + Math.sin(t * p.wf + p.ph) * p.amp;
      const a = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph))) * (p.drop ? 0.9 : 0.8);
      const r = p.r * (p.drop ? 4 : 3);
      const gr = c2.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, (p.drop ? 'rgba(242,170,60,' : 'rgba(255,226,150,') + a + ')');
      gr.addColorStop(1, 'rgba(255,200,90,0)');
      c2.fillStyle = gr; c2.fillRect(x - r, y - r, r * 2, r * 2);
    }
    c2.globalCompositeOperation = 'source-over';
  }

  TICKS.push(function (t) {
    lat.style.backgroundPosition = (t * 6) + 'px ' + (t * 4) + 'px';
    bgMed.style.transform = 'rotate(' + (t * 2.2) + 'deg)';
  });

  /* ================================================================
   * SCENE 1 — greeting (line 0)
   * ================================================================ */
  (function () {
    const s = scene(0, 3, true, false);
    spin(s, 90, 360, 900, 0.5, 7, 0, 3, 1.2, 0.4);
    const a = el(s, 'abs ctr lat gold nw', 'left:0;top:690px;width:1080px;font-size:46px;letter-spacing:12px', 'WELCOME TO');
    track(a, 0.2, 3, { a: 'drop', i: 0.7, o: 0.4 });
    const b = el(s, 'abs ctr lat nw', 'left:0;top:760px;width:1080px;font-size:128px;font-weight:700;color:#fff6e6;text-shadow:0 0 40px rgba(242,196,109,.55)', 'Rizwan Talks');
    track(b, 0.5, 3, { a: 'pop', i: 0.9, o: 0.4 });
    const d = el(s, 'abs', 'left:330px;top:960px;width:420px;height:42px', ART.divider(420));
    track(d, 1.1, 3, { a: 'fade', i: 0.7, o: 0.4 });
  })();

  /* ================================================================
   * SCENE 2 — product intro (line 1)
   * ================================================================ */
  (function () {
    const s = scene(3, 11, false, false);
    productCard(s, 260, 300, 560, 3.0, 11, { a: 'rise', i: 1.1 });
    const brand = el(s, 'abs ctr lat gold nw', 'left:0;top:925px;width:1080px;font-size:48px;letter-spacing:9px', 'Ellens Fragrance');
    track(brand, wt(1, 5), 11, { a: 'drop', i: 0.6, o: 0.4, d: 40 });
    const title = el(s, 'abs ctr lat nw', 'left:0;top:995px;width:1080px;font-size:76px;font-weight:700;color:#fff6e6;text-shadow:0 0 30px rgba(242,196,109,.5)', 'Mukhallat Al Emirates');
    track(title, wt(1, 12), 11, { a: 'rise', i: 0.7, o: 0.4 });
    const box = el(s, 'abs flex', 'left:60px;top:1150px;width:960px;height:90px');
    chip(box, 'প্রিমিয়াম ক্রিয়েশন', wt(1, 9), 11, { cls: 'gld' });
    chip(box, 'পারফিউম অয়েল', wt(1, 15), 11, {});
  })();

  /* ================================================================
   * SCENE 3 — what is Mukhallat (lines 2–4)
   * ================================================================ */
  (function () {
    const s = scene(11, 25, false, false);
    const arch = el(s, 'abs', 'left:160px;top:250px;width:760px;height:800px', ART.arch(760, 800));
    track(arch, 11, 25, { a: 'zoom', i: 0.9, o: 0.4 });
    productCard(s, 300, 440, 480, 11.2, 25, { a: 'rise', i: 0.9 });
    const A = el(s, 'abs flex', 'left:60px;top:1090px;width:960px;height:300px;align-content:flex-start');
    chip(A, 'ট্র্যাডিশনাল অ্যারাবিয়ান আর্ট', wt(2, 2), 19, { a: 'sl', css: 'font-size:38px' });
    chip(A, 'অনেকগুলো প্রেশিয়াস অ্যাকর্ডের', wt(2, 5), 19, { a: 'sr', css: 'font-size:38px' });
    chip(A, 'কেয়ারফুলি ক্রাফটেড ব্লেন্ড', wt(2, 8), 19, { a: 'sl', css: 'font-size:38px' });
    const B = el(s, 'abs flex', 'left:60px;top:1090px;width:960px;height:300px;align-content:flex-start');
    chip(B, 'রিচ', wt(3, 2), 25, { cls: 'gld' });
    chip(B, 'রিগাল', wt(3, 3), 25, { cls: 'gld' });
    chip(B, 'থিক', wt(3, 4), 25, { cls: 'gld' });
    chip(B, 'ওয়ার্ম অ্যান্ড লং লাস্টিং', wt(4, 0), 25, {});
    chip(B, 'ইউনিসেক্স', wt(4, 4), 25, {});
  })();

  /* ================================================================
   * SCENE 4 — fragrance pyramid (lines 5–11)
   * ================================================================ */
  (function () {
    const s = scene(25, 39, false, false);
    const host = el(s, 'abs', 'left:240px;top:250px;width:600px;height:346px', ART.pyramid(600, ['টপ নোটস', 'হার্ট', 'বেস']));
    track(host, 25, 39, { a: 'zoom', i: 0.8, o: 0.4 });
    const tiers = host.querySelectorAll('.tier');
    const act = (t, a, b) => clamp((t - a) / 0.4) * clamp((b - t) / 0.4);
    const win = [[0, LINES[7].s], [LINES[7].s, LINES[9].s], [LINES[9].s, 1e9]];
    TICKS.push(function (t) {
      for (let i = 0; i < 3; i++) {
        const v = act(t, win[i][0] === 0 ? -1 : win[i][0], win[i][1]);
        tiers[i].setAttribute('fill-opacity', (0.22 + 0.6 * v).toFixed(3));
        tiers[i].setAttribute('stroke-width', (3 + 3 * v).toFixed(2));
      }
    });
    const grid = el(s, 'abs', 'left:60px;top:650px;width:960px;height:660px;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:80px;gap:14px 20px');
    const N = [
      ['লেমন', 'lemon', wt(5, 3)], ['বার্গামট', 'bergamot', wt(5, 4)],
      ['হার্বাল নোটস', 'leaf', wt(6, 0)], ['ওয়ার্ম স্পাইসেস', 'spice', wt(6, 2)],
      ['টাইফ রোজ', 'rose', wt(7, 2)], ['সিনামন', 'cinnamon', wt(7, 4)],
      ['লেভেন্ডার', 'lavender', wt(8, 0)], ['গ্যালবানাম', 'resin', wt(8, 1)],
      ['দেহেনা লুথ', 'oud', wt(9, 2)], ['অ্যাম্বার', 'amber', wt(9, 4)],
      ['হাইট মাস্ক', 'musk', wt(10, 0)], ['স্যান্ডেলউড', 'sandal', wt(10, 2)],
      ['ভ্যানিলা', 'vanilla', wt(11, 0)], ['চকোলেট', 'chocolate', wt(11, 1)]
    ];
    N.forEach(function (n, i) {
      chip(grid, n[0], n[2], 39, { cls: 'note', icon: n[1], is: 56, a: i % 2 ? 'sr' : 'sl', i: 0.5 });
    });
  })();

  /* ================================================================
   * SCENE 5 — scent family + character (lines 12–16)
   * ================================================================ */
  (function () {
    const s = scene(39, 47, false, false);
    const h1 = el(s, 'abs ctr nw gold', 'left:0;top:280px;width:1080px;font-size:46px;font-weight:700;letter-spacing:3px', 'সেন্ড ফ্যামিলি');
    track(h1, wt(12, 0), 47, { a: 'drop', i: 0.5, o: 0.4, d: 30 });
    const fam = el(s, 'abs flex', 'left:60px;top:370px;width:960px;height:260px;align-content:flex-start');
    chip(fam, 'ওরিয়েন্টাল', wt(12, 2), 47, { cls: 'big' });
    chip(fam, 'ওড', wt(13, 0), 47, { cls: 'big' });
    chip(fam, 'ফ্লোরাল', wt(13, 1), 47, { cls: 'big' });
    chip(fam, 'স্পাইসি', wt(13, 2), 47, { cls: 'big' });
    chip(fam, 'উডি', wt(14, 0), 47, { cls: 'big' });
    const dv = el(s, 'abs', 'left:330px;top:650px;width:420px;height:42px', ART.divider(420));
    track(dv, wt(15, 0) - 0.2, 47, { a: 'fade', i: 0.5, o: 0.4 });
    const h2 = el(s, 'abs ctr nw gold', 'left:0;top:710px;width:1080px;font-size:46px;font-weight:700;letter-spacing:3px', 'ক্যারেক্টার');
    track(h2, wt(15, 0), 47, { a: 'drop', i: 0.5, o: 0.4, d: 30 });
    const C = [['রিচ', wt(15, 1)], ['রিগাল', wt(15, 2)], ['ওয়ার্ম', wt(16, 0)], ['ডিপ', wt(16, 1)], ['লাক্সুরিয়াস', wt(16, 2)]];
    C.forEach(function (c, k) {
      const r = el(s, 'abs cword', 'left:0;top:' + (790 + k * 118) + 'px;width:1080px;height:112px',
        ART.star8(34) + '<span>' + c[0] + '</span>' + ART.star8(34));
      track(r, c[1], 47, { a: 'pop', i: 0.5, o: 0.4 });
    });
  })();

  /* ================================================================
   * SCENE 6 — ideal occasions (lines 17–20)
   * ================================================================ */
  (function () {
    const s = scene(47, 56, false, false);
    const h = el(s, 'abs ctr nw gold', 'left:0;top:270px;width:1080px;font-size:54px;font-weight:700;letter-spacing:3px', 'আইডিয়াল ফর');
    track(h, wt(17, 0), 56, { a: 'drop', i: 0.5, o: 0.4, d: 30 });
    const dv = el(s, 'abs', 'left:330px;top:340px;width:420px;height:42px', ART.divider(420));
    track(dv, wt(17, 0) + 0.2, 56, { a: 'fade', i: 0.5, o: 0.4 });
    const O = [
      ['ফর্মাল অকেশনস', 'suit', wt(17, 2)], ['ইভনিং ওয়্যার', 'moon', wt(18, 0)],
      ['স্পেশাল ইভেন্টস', 'burst', wt(18, 2)], ['ট্র্যাডিশনাল গ্যাদারিংস', 'lantern', wt(19, 0)],
      ['উইন্টার', 'snow', wt(20, 0)], ['ওড লাভার্স', 'heart', wt(20, 2)]
    ];
    O.forEach(function (o, k) {
      const x = 60 + (k % 2) * 490, y = 400 + Math.floor(k / 2) * 320;
      const c = el(s, 'abs occ', 'left:' + x + 'px;top:' + y + 'px;width:470px;height:300px',
        ART.icon(o[1], 130) + '<div class="lbl">' + o[0] + '</div>');
      track(c, o[2], 56, { a: k % 2 ? 'sr' : 'sl', i: 0.55, o: 0.4 });
    });
  })();

  /* ================================================================
   * SCENE 7 — call to action (line 21 → end)
   * ================================================================ */
  (function () {
    const s = scene(56, D, false, true);
    const rings = el(s, 'abs', 'left:0;top:0;width:1080px;height:1000px',
      '<svg viewBox="0 0 1080 1000" width="1080" height="1000" fill="none" stroke="url(#gGold)" stroke-width="4">' +
      '<circle cx="540" cy="540" r="300"/><circle cx="540" cy="540" r="300"/><circle cx="540" cy="540" r="300"/></svg>');
    track(rings, 56, D + 1, { a: 'fade', i: 0.6, o: 0 });
    const circ = rings.querySelectorAll('circle');
    TICKS.push(function (t) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.45 + k / 3) % 1;
        circ[k].setAttribute('r', (290 + ph * 270).toFixed(1));
        circ[k].setAttribute('stroke-opacity', ((1 - ph) * 0.75).toFixed(3));
      }
    });
    productCard(s, 280, 290, 520, 56.0, D + 1, { a: 'pop', i: 0.8, o: 0 });
    const lock = el(s, 'abs ctr lat nw', 'left:0;top:880px;width:1080px;font-size:100px;font-weight:700;color:#fff6e6;text-shadow:0 0 40px rgba(242,196,109,.6)', 'Ellens Fragrance');
    track(lock, wt(21, 3), D + 1, { a: 'rise', i: 0.7, o: 0 });
    const dv = el(s, 'abs', 'left:330px;top:1010px;width:420px;height:42px', ART.divider(420));
    track(dv, wt(21, 3) + 0.3, D + 1, { a: 'fade', i: 0.6, o: 0 });
    const btn = el(s, 'abs', 'left:240px;top:1075px;width:600px;height:140px', ART.orderButton(600));
    track(btn, wt(21, 1), D + 1, { a: 'pop', i: 0.6, o: 0, fn: function (t) { return 'scale(' + (1 + 0.035 * Math.sin(t * 5.5)) + ')'; } });
    const url = el(s, 'abs ctr lat nw gold', 'left:0;top:1255px;width:1080px;font-size:48px;font-weight:700;letter-spacing:2px', 'elencefragrance.com');
    track(url, wt(21, 6), D + 1, { a: 'rise', i: 0.6, o: 0, d: 40 });
  })();

  /* ================================================================
   * SUBTITLES — one panel per line of timestamps.txt, always on
   * ================================================================ */
  const SUBS = [];
  LINES.forEach(function (L) {
    const p = el(root, 'sub');
    track(p, L.s, L.e, { a: 'fade', i: 0.25, o: 0.25 });
    const box = words(p, L.text, 'subtext', null, L.s, L.e);
    SUBS.push({ p: p, box: box, len: Array.from(L.text).length });
  });
  function fitSubs() {
    SUBS.forEach(function (S) {
      let size = S.len > 95 ? 46 : (S.len > 62 ? 52 : 60);
      S.box.style.fontSize = size + 'px';
      while (S.box.offsetHeight > S.p.clientHeight - 56 && size > 30) {
        size -= 2; S.box.style.fontSize = size + 'px';
      }
    });
  }

  /* ================================================================
   * PERSISTENT: brand bar, hairlines, progress bar
   * ================================================================ */
  (function () {
    const bar = el(root, 'abs', 'left:0;top:62px;width:1080px;height:110px');
    el(bar, 'abs', 'left:0;top:0;width:1080px;display:flex;align-items:center;justify-content:center;gap:22px',
      ART.bottle(46) + '<span class="lat gold nw" style="font-size:46px;letter-spacing:6px;font-weight:700">Ellens Fragrance</span>' + ART.bottle(46));
    el(bar, 'abs', 'left:360px;top:66px;width:360px;height:36px', ART.divider(360));
    track(bar, 11, 56, { a: 'drop', i: 0.6, o: 0.6, d: 30 });

    const hl = 'height:2px;width:960px;left:60px;background:linear-gradient(90deg,rgba(227,194,107,0),#e3c26b,rgba(227,194,107,0))';
    el(root, 'abs', hl + ';top:30px');
    el(root, 'abs', hl + ';top:1892px');

    el(root, 'abs', 'left:60px;top:1850px;width:960px;height:6px;border-radius:3px;background:rgba(227,194,107,.2)');
    const fill = el(root, 'abs', 'left:60px;top:1850px;width:0;height:6px;border-radius:3px;background:linear-gradient(90deg,#a87a2a,#f2c46d)');
    TICKS.push(function (t) { fill.style.width = (960 * clamp(t / D)) + 'px'; });
  })();

  /* ================================================================
   * renderAt(t) — the only entry point the recorder uses
   * ================================================================ */
  window.renderAt = function (t) {
    drawBase(t);
    drawFx(t);
    for (let n = 0; n < TR.length; n++) {
      const tr = TR[n], e = tr.e;
      if (t < tr.s || t > tr.en) { e.style.visibility = 'hidden'; continue; }
      const pin = tr.i > 0 ? clamp((t - tr.s) / tr.i) : 1;
      const pout = tr.o > 0 ? clamp((tr.en - t) / tr.o) : 1;
      const q = Math.min(pin, pout), k = eo(q);
      e.style.visibility = 'inherit';            // 'inherit' (not 'visible') so hidden parents hide their children
      e.style.opacity = (k * tr.op).toFixed(3);
      const extra = tr.fn ? tr.fn(t, k) : '';
      e.style.transform = (tr.base + ' ' + preset(tr.a, k, q, tr.d) + ' ' + extra).trim();
    }
    for (let n = 0; n < TICKS.length; n++) TICKS[n](t);
  };
  window.__duration = D;

  /* ---------- ready ---------- */
  (async function () {
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
    await Promise.all(IMGS.map(function (i) { return i.decode().catch(function () { }); }));
    fitSubs();
    window.renderAt(0);
    window.__ready = true;
  })();
})();
