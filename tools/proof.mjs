// Contact sheet of chosen moments: node tools/proof.mjs <id> [times...]  (default: middle of every beat)
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import playwright from './pw.mjs';
const [id, ...ts] = process.argv.slice(2);
const OUT = path.resolve('out', id);
const data = JSON.parse(fs.readFileSync(path.join(OUT, 'data.js'), 'utf8').replace(/^window.__DATA = /, '').replace(/;\s*$/, ''));
const times = ts.length ? ts.map(Number) : data.beats.map((b) => +(b.start + Math.min(1.6, (b.end - b.start) * 0.8)).toFixed(2));
const b = await playwright.chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 640 } });
await p.goto('file://' + path.join(OUT, 'preview.html') + '?render=1');
await p.evaluate(() => document.documentElement.style.setProperty('--scale', 1 / 3));
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => window.BB.ready());
const dir = path.join(OUT, 'proof'); fs.mkdirSync(dir, { recursive: true });
for (let i = 0; i < times.length; i++) { await p.evaluate((t) => renderAt(t), times[i]); await p.screenshot({ path: path.join(dir, `f${String(i).padStart(2, '0')}.png`) }); }
await b.close();
const cols = Math.min(6, times.length), rows = Math.ceil(times.length / cols);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(dir, 'f%02d.png'), '-vf', `tile=${cols}x${rows}:padding=6:color=white`, '-frames:v', '1', path.join(OUT, 'proof.png')]);
console.log(path.join(OUT, 'proof.png'), times.join(' '));
