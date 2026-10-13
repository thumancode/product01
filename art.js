/* art.js — all vector art as inline SVG strings (no external files) */
'use strict';
const ART = {};

function starPts(cx, cy, R, r, n) {
  const p = [];
  for (let k = 0; k < n * 2; k++) {
    const a = Math.PI * k / n - Math.PI / 2;
    const rad = k % 2 ? r : R;
    p.push((cx + rad * Math.cos(a)).toFixed(2) + ',' + (cy + rad * Math.sin(a)).toFixed(2));
  }
  return p.join(' ');
}

/* shared gradients (one hidden SVG in the page) */
ART.defs = '<svg width="0" height="0" style="position:absolute"><defs>' +
  '<linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e3a1"/><stop offset=".5" stop-color="#e3c26b"/><stop offset="1" stop-color="#a87a2a"/></linearGradient>' +
  '<linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2c46d"/><stop offset="1" stop-color="#8a5513"/></linearGradient>' +
  '<linearGradient id="gLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e3c26b" stop-opacity="0"/><stop offset=".5" stop-color="#e3c26b"/><stop offset="1" stop-color="#e3c26b" stop-opacity="0"/></linearGradient>' +
  '<radialGradient id="rGlow"><stop offset="0" stop-color="#f2c46d" stop-opacity=".9"/><stop offset="1" stop-color="#d9962b" stop-opacity="0"/></radialGradient>' +
  '</defs></svg>';

/* 8-point star */
ART.star8 = function (s, fill) {
  return '<svg viewBox="0 0 100 100" width="' + s + '" height="' + s + '"><polygon points="' + starPts(50, 50, 48, 26, 8) + '" fill="' + (fill || 'url(#gGold)') + '"/></svg>';
};

/* large star medallion (rings + two squares + 16 petals) */
ART.medallion = function (s) {
  let g = '';
  for (let k = 0; k < 16; k++) {
    g += '<ellipse cx="200" cy="62" rx="9" ry="26" transform="rotate(' + (k * 22.5) + ' 200 200)" fill="none" stroke="#e3c26b" stroke-width="2"/>';
  }
  return '<svg viewBox="0 0 400 400" width="' + s + '" height="' + s + '" fill="none" stroke="#e3c26b" stroke-width="2.5">' +
    '<circle cx="200" cy="200" r="190"/><circle cx="200" cy="200" r="180" stroke-width="1"/>' +
    '<circle cx="200" cy="200" r="120"/><circle cx="200" cy="200" r="60"/>' +
    '<rect x="70" y="70" width="260" height="260"/><rect x="70" y="70" width="260" height="260" transform="rotate(45 200 200)"/>' +
    '<polygon points="' + starPts(200, 200, 150, 82, 8) + '"/>' + g +
    '<circle cx="200" cy="200" r="10" fill="#e3c26b"/></svg>';
};

/* geometric lattice tile, returned as a CSS url() data URI */
ART.latticeTile = function () {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="#e3c26b" stroke-width="2">' +
    '<path d="M60 0L120 60L60 120L0 60Z"/><path d="M60 18L102 60L60 102L18 60Z"/>' +
    '<path d="M0 0L18 0L0 18Z M120 0L102 0L120 18Z M0 120L18 120L0 102Z M120 120L102 120L120 102Z"/>' +
    '<polygon points="' + starPts(60, 60, 14, 7, 8) + '"/><path d="M60 0V18M60 102V120M0 60H18M102 60H120"/></svg>';
  return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
};

/* ornamental corner bracket (top-left; rotate for the other corners) */
ART.corner = function (s) {
  return '<svg viewBox="0 0 80 80" width="' + s + '" height="' + s + '" fill="none" stroke="url(#gGold)" stroke-width="3" stroke-linecap="round">' +
    '<path d="M4 76V20Q4 4 20 4H76"/><path d="M14 76V26Q14 14 26 14H76" stroke-width="1.5"/>' +
    '<polygon points="' + starPts(20, 20, 9, 4, 8) + '" fill="url(#gGold)" stroke="none"/></svg>';
};

/* gold divider with a star in the middle */
ART.divider = function (w) {
  return '<svg viewBox="0 0 400 40" width="' + w + '" height="' + (w / 10) + '">' +
    '<rect x="0" y="19" width="170" height="2" fill="url(#gLine)"/><rect x="230" y="19" width="170" height="2" fill="url(#gLine)"/>' +
    '<polygon points="' + starPts(200, 20, 17, 8, 8) + '" fill="url(#gGold)"/>' +
    '<circle cx="176" cy="20" r="3" fill="#e3c26b"/><circle cx="224" cy="20" r="3" fill="#e3c26b"/></svg>';
};

/* pointed Arabian arch frame (double line) */
ART.arch = function (w, h) {
  return '<svg viewBox="0 0 760 800" width="' + w + '" height="' + h + '" fill="none" stroke="url(#gGold)" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M10 790V330Q10 150 380 10Q750 150 750 330V790" stroke-width="5"/>' +
    '<path d="M34 790V338Q34 176 380 44Q726 176 726 338V790" stroke-width="2"/>' +
    '<polygon points="' + starPts(380, 78, 22, 10, 8) + '" fill="url(#gGold)" stroke="none"/></svg>';
};

/* simple filled octagon-bottle outline (used as a small icon) */
ART.bottle = function (s) {
  return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" fill="none" stroke="url(#gGold)" stroke-width="3" stroke-linejoin="round">' +
    '<rect x="22" y="4" width="20" height="14" rx="3"/><path d="M18 26L22 18H42L46 26V54L42 60H22L18 54Z"/><path d="M28 28V56M36 28V56" stroke-width="1.5"/></svg>';
};

/* oil droplet */
ART.droplet = function (s) {
  return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '"><path d="M32 4C32 4 12 28 12 42a20 20 0 0 0 40 0C52 28 32 4 32 4Z" fill="url(#gAmber)"/><ellipse cx="24" cy="40" rx="4" ry="8" fill="#fff6e6" opacity=".45"/></svg>';
};

/* shopping bag */
ART.bag = function (s) {
  return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" fill="none" stroke="#2a170a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M12 22H52L56 58H8Z"/><path d="M22 28V16A10 10 0 0 1 42 16V28"/></svg>';
};

/* "Order Now" button, drawn */
ART.orderButton = function (w) {
  return '<svg viewBox="0 0 600 140" width="' + w + '" height="' + (w * 140 / 600) + '">' +
    '<rect x="6" y="6" width="588" height="128" rx="64" fill="url(#gGold)" stroke="#fff3c9" stroke-width="3"/>' +
    '<rect x="16" y="16" width="568" height="108" rx="54" fill="none" stroke="#8a5513" stroke-width="2" opacity=".55"/>' +
    '<g transform="translate(70 38)"><svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#2a170a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M12 22H52L56 58H8Z"/><path d="M22 28V16A10 10 0 0 1 42 16V28"/></svg></g>' +
    '<text x="360" y="92" text-anchor="middle" font-family="\'Noto Serif\',\'FreeSerif\',\'DejaVu Serif\',serif" font-size="58" font-weight="700" fill="#2a170a" letter-spacing="2">Order Now</text></svg>';
};

/* fragrance pyramid: three tiers (classes tier0 tier1 tier2) with Bengali tier names from the transcript */
ART.pyramid = function (w, labels) {
  const hw = y => (y - 10) / 280 * 250;
  const P = (y0, y1, apex) => {
    const a = 260;
    if (apex) return a + ',' + y0 + ' ' + (a + hw(y1)) + ',' + y1 + ' ' + (a - hw(y1)) + ',' + y1;
    return (a - hw(y0)) + ',' + y0 + ' ' + (a + hw(y0)) + ',' + y0 + ' ' + (a + hw(y1)) + ',' + y1 + ' ' + (a - hw(y1)) + ',' + y1;
  };
  const tiers = [[10, 100, 1], [106, 196, 0], [202, 290, 0]];
  const ty = [78, 168, 258];
  let s = '<svg viewBox="0 0 520 300" width="' + w + '" height="' + (w * 300 / 520) + '" stroke-linejoin="round">';
  tiers.forEach((t, i) => {
    s += '<polygon class="tier tier' + i + '" points="' + P(t[0], t[1], t[2]) + '" fill="#d9962b" fill-opacity=".25" stroke="url(#gGold)" stroke-width="3"/>';
    s += '<text x="260" y="' + ty[i] + '" text-anchor="middle" font-family="\'Noto Sans Bengali\',\'Noto Serif Bengali\',\'FreeSerif\',sans-serif" font-size="34" font-weight="700" fill="#fff6e6">' + labels[i] + '</text>';
  });
  return s + '</svg>';
};

/* icon markup (viewBox 0 0 64 64) */
const GS = 'fill="none" stroke="url(#gGold)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const ICONS = {
  /* ---- perfume notes ---- */
  lemon: '<circle cx="32" cy="32" r="24" fill="#f4d35e" stroke="#fff0a8" stroke-width="3"/><circle cx="32" cy="32" r="19" fill="#fbe88a"/><g stroke="#f4d35e" stroke-width="2.4"><line x1="32" y1="13" x2="32" y2="51"/><line x1="13" y1="32" x2="51" y2="32"/><line x1="18.6" y1="18.6" x2="45.4" y2="45.4"/><line x1="45.4" y1="18.6" x2="18.6" y2="45.4"/></g><circle cx="32" cy="32" r="3" fill="#f4d35e"/>',
  bergamot: '<circle cx="32" cy="37" r="20" fill="#a8c44a"/><circle cx="25" cy="30" r="6" fill="#d6e58a" opacity=".6"/><path d="M32 17C32 8 40 6 47 8C45 15 38 19 32 17Z" fill="#5f8a2e"/><rect x="30.5" y="12" width="3" height="9" rx="1.5" fill="#6b4a1f"/>',
  leaf: '<path d="M10 54C8 24 30 8 56 10C58 36 38 56 10 54Z" fill="#6fa84a"/><path d="M10 54C26 40 38 28 52 14" stroke="#d9efb8" stroke-width="2.6" fill="none"/><path d="M24 42l9-1M31 34l10-2M18 48l6-7" stroke="#d9efb8" stroke-width="2" fill="none"/>',
  spice: '<g transform="rotate(-28 28 36)"><rect x="4" y="28" width="44" height="9" rx="4.5" fill="#a0522d"/><rect x="6" y="40" width="40" height="8" rx="4" fill="#8b4513"/></g><polygon points="' + starPts(47, 17, 14, 6, 8) + '" fill="#8a3f14"/><circle cx="47" cy="17" r="3" fill="#d9944d"/>',
  rose: '<circle cx="32" cy="32" r="23" fill="#c2415a"/><path d="M28 32a4 4 0 1 1 8 0a8 8 0 1 1 -16 0a12 12 0 1 1 24 0a16 16 0 1 1 -32 0" fill="none" stroke="#f3a0b2" stroke-width="2.4"/>',
  cinnamon: '<rect x="8" y="20" width="44" height="24" rx="12" fill="#b5651d"/><ellipse cx="50" cy="32" rx="7" ry="12" fill="#d9944d"/><ellipse cx="50" cy="32" rx="3.5" ry="6.5" fill="#7a3b12"/><path d="M14 27h26M14 37h26" stroke="#d9944d" stroke-width="2"/>',
  lavender: '<path d="M32 60V22" stroke="#5f8a2e" stroke-width="3"/><path d="M32 52C24 50 20 44 20 40M32 48C40 46 44 40 44 36" stroke="#5f8a2e" stroke-width="2.5" fill="none"/><g fill="#9b7fd1"><ellipse cx="32" cy="10" rx="4" ry="6"/><ellipse cx="26" cy="19" rx="4" ry="6" transform="rotate(-22 26 19)"/><ellipse cx="38" cy="19" rx="4" ry="6" transform="rotate(22 38 19)"/><ellipse cx="25" cy="30" rx="4" ry="6" transform="rotate(-22 25 30)"/><ellipse cx="39" cy="30" rx="4" ry="6" transform="rotate(22 39 30)"/><ellipse cx="32" cy="26" rx="4" ry="6"/></g>',
  resin: '<path d="M12 40C8 24 22 10 36 13C52 13 58 30 51 44C44 57 20 57 12 40Z" fill="#b8a04a"/><ellipse cx="27" cy="26" rx="9" ry="5" fill="#e6d68a" opacity=".7"/><circle cx="42" cy="40" r="4" fill="#8f7a2e" opacity=".6"/>',
  oud: '<polygon points="6,40 20,13 52,9 59,34 40,55 13,53" fill="#5a3a22"/><path d="M14 45L50 22M19 51L55 31M12 33L40 15" stroke="#8a6038" stroke-width="2.2" fill="none"/>',
  amber: '<polygon points="32,5 55,20 53,46 32,59 11,46 9,20" fill="#e08a1e"/><polygon points="32,5 55,20 32,31 9,20" fill="#f6b64a"/><polygon points="32,31 55,20 53,46 32,59" fill="#b8650f"/>',
  musk: '<path d="M16 46C4 46 4 28 18 28C20 13 42 11 46 25C60 23 62 46 48 46Z" fill="#efe3d0"/><path d="M18 53h28" stroke="#d8c7ac" stroke-width="3.5" stroke-linecap="round"/>',
  sandal: '<rect x="8" y="22" width="40" height="24" fill="#c28f58"/><ellipse cx="8" cy="34" rx="7" ry="12" fill="#b07d46"/><ellipse cx="48" cy="34" rx="8" ry="12" fill="#e0b27a"/><ellipse cx="48" cy="34" rx="4.5" ry="7" fill="none" stroke="#a8743c" stroke-width="2"/><path d="M14 30h28M14 38h28" stroke="#a8743c" stroke-width="1.8"/>',
  vanilla: '<path d="M8 54C28 48 44 32 54 8" stroke="#3b2414" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M11 51C28 45 42 29 51 11" stroke="#6b4426" stroke-width="2" fill="none"/><circle cx="14" cy="22" r="6" fill="#f3e5c3"/><circle cx="14" cy="22" r="2.2" fill="#e0b64a"/>',
  chocolate: '<rect x="9" y="9" width="46" height="46" rx="6" fill="#4a2a17"/><path d="M32 9V55M9 32H55" stroke="#2e1a0e" stroke-width="3"/><rect x="13" y="13" width="15" height="15" rx="2" fill="#6b3f22"/><rect x="36" y="36" width="15" height="15" rx="2" fill="#6b3f22"/>',
  /* ---- occasions ---- */
  suit: '<path d="M20 8L32 22L44 8L56 16L50 30V56H14V30L8 16Z" ' + GS + '/><path d="M32 22L28 30L32 54L36 30Z" fill="url(#gGold)"/>',
  moon: '<path d="M42 6A26 26 0 1 0 58 42A20 20 0 1 1 42 6Z" fill="url(#gGold)"/><polygon points="' + starPts(50, 16, 7, 3, 4) + '" fill="url(#gGold)"/>',
  burst: '<polygon points="' + starPts(32, 32, 29, 12, 12) + '" fill="url(#gGold)"/>',
  lantern: '<path d="M26 6h12M32 6v7" ' + GS + '/><path d="M22 14h20l7 11-5 23H20l-5-23Z" ' + GS + '/><path d="M24 48h16l-2 9H26Z" ' + GS + '/><path d="M32 18v30M21 31h22" ' + GS.replace('stroke-width="3"', 'stroke-width="1.8"') + '/>',
  snow: '<g ' + GS + '><path d="M32 4V60M8 18L56 46M56 18L8 46"/><path d="M26 8L32 14L38 8M26 56L32 50L38 56M10 28L18 26L16 18M54 36L46 38L48 46M54 28L46 26L48 18M10 36L18 38L16 46"/></g>',
  heart: '<path d="M32 46C8 30 10 10 23 10C28 10 32 14 32 17C32 14 36 10 41 10C54 10 56 30 32 46Z" fill="url(#gGold)"/><rect x="14" y="48" width="36" height="9" rx="4" fill="#5a3a22" stroke="url(#gGold)" stroke-width="2"/><ellipse cx="50" cy="52.5" rx="3" ry="4.5" fill="#8a6038"/>'
};
ART.icon = function (name, s) {
  return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '">' + ICONS[name] + '</svg>';
};
