#!/usr/bin/env node
/* render.js — timestamps.txt -> lines.js -> Playwright frames -> FFmpeg -> product-video.mp4
 *
 *   node render.js                 full video
 *   node render.js --test 12       first 12 seconds only
 *   node render.js --still 5,30,58 PNG stills at those seconds (still_<t>.png)
 *   node render.js --workers 2     number of parallel browsers
 *   node render.js --lines         only regenerate lines.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const FPS = 30, W = 1080, H = 1920;
const AUDIO = 'voiceover.mp3';
const OUT = 'product-video.mp4';
const MIN_SHOW = 0.7; // a line shorter than this (e.g. two lines with the same start time) is shown for at least this long

const argv = process.argv.slice(2);
const flag = n => argv.indexOf('--' + n);
const val = n => { const i = flag(n); return i >= 0 ? argv[i + 1] : null; };

/* ---------- timestamps.txt -> lines.js ---------- */
function parseTimestamps() {
  const rows = fs.readFileSync('timestamps.txt', 'utf8').split(/\r?\n/)
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const L = rows.map((r, i) => {
    const p = r.split('|').map(x => x.trim());
    if (p.length < 4) throw new Error('timestamps.txt line ' + (i + 1) + ': need  start | end | text | tag');
    const tag = p[p.length - 1];
    const text = p.slice(2, p.length - 1).join('|').trim();
    return { rs: parseFloat(p[0]), re: parseFloat(p[1]), text, tag };
  });
  for (const l of L) if (isNaN(l.rs) || isNaN(l.re)) throw new Error('bad number in timestamps.txt');
  // display times: keep the real start, but never show a line for less than MIN_SHOW seconds
  // (the following line's display start is pushed back by the same amount; its end is unchanged)
  let prevEnd = 0;
  const out = L.map((l, i) => {
    let s = Math.max(l.rs, prevEnd);
    let e = l.re;
    if (e - s < MIN_SHOW && i < L.length - 1) e = Math.min(s + MIN_SHOW, L[i + 1].re - 0.3);
    if (e <= s) e = s + MIN_SHOW;
    prevEnd = e;
    return { s: +s.toFixed(3), e: +e.toFixed(3), rs: l.rs, text: l.text, tag: l.tag };
  });
  return out;
}

function writeLines(L) {
  const body = L.map(l => '  ' + JSON.stringify(l)).join(',\n');
  fs.writeFileSync('lines.js', '/* generated from timestamps.txt by render.js — do not edit by hand */\nconst LINES = [\n' + body + '\n];\n');
}

const LINES = parseTimestamps();
writeLines(LINES);
const DURATION = Math.ceil(Math.max(...LINES.map(l => l.e)));
console.log('lines.js written: ' + LINES.length + ' lines, video length ' + DURATION + ' s');
if (flag('lines') >= 0) process.exit(0);

/* ---------- capture ---------- */
const { chromium } = require('playwright');
const pageUrl = 'file://' + path.resolve('index.html');
const LAUNCH_ARGS = ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text'];

async function openPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await page.goto(pageUrl);
  await page.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  return page;
}

async function stills(list) {
  const browser = await chromium.launch({ args: LAUNCH_ARGS });
  const page = await openPage(browser);
  for (const t of list) {
    await page.evaluate(x => window.renderAt(x), t);
    await page.screenshot({ type: 'png', path: 'still_' + t + '.png' });
    console.log('still_' + t + '.png');
  }
  await browser.close();
}

async function capture(dir, total, workers) {
  let next = 0, done = 0;
  const t0 = Date.now();
  async function worker() {
    const browser = await chromium.launch({ args: LAUNCH_ARGS });
    const page = await openPage(browser);
    for (;;) {
      const f = next++;
      if (f >= total) break;
      await page.evaluate(t => window.renderAt(t), f / FPS);
      await page.screenshot({ type: 'jpeg', quality: 93, path: path.join(dir, 'f' + String(f).padStart(5, '0') + '.jpg') });
      done++;
      if (done % 60 === 0 || done === total) {
        const el = (Date.now() - t0) / 1000;
        console.log('frames ' + done + '/' + total + '  (' + (done / el).toFixed(1) + ' fps, ' + el.toFixed(0) + ' s)');
      }
    }
    await browser.close();
  }
  await Promise.all(Array.from({ length: workers }, worker));
}

(async () => {
  if (!fs.existsSync(AUDIO)) { console.error('Missing ' + AUDIO); process.exit(1); }
  if (!fs.existsSync('product.jpg')) { console.error('Missing product.jpg'); process.exit(1); }

  if (val('still')) {
    await stills(val('still').split(',').map(Number).filter(x => !isNaN(x)));
    return;
  }

  const testSec = val('test') ? parseFloat(val('test')) : null;
  const dur = testSec ? Math.min(testSec, DURATION) : DURATION;
  const total = Math.round(dur * FPS);
  const workers = val('workers') ? Math.max(1, parseInt(val('workers'), 10)) : Math.max(1, Math.min(4, os.cpus().length));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
  console.log('rendering ' + total + ' frames with ' + workers + ' worker(s) into ' + dir);

  await capture(dir, total, workers);

  const args = ['-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.jpg'), '-i', AUDIO,
    '-filter_complex', '[1:a]apad,atrim=0:' + dur + '[a]',
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT];
  console.log('ffmpeg ' + args.join(' '));
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  if (r.status !== 0) { console.error('FFmpeg failed'); process.exit(r.status || 1); }
  console.log('done: ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
