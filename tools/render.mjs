// RENDER — script JSON → voice → timeline → frames → MP4
// usage: node tools/render.mjs scripts/01-store-audit.json [--voice elevenlabs|flite|reuse|file] [--draft] [--preview-only] [--workers 3] [--music assets/music.mp3]
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import playwright from './pw.mjs';
import { makeVoice, probeDuration, envelope } from './voice.mjs';
import { buildTimeline } from './timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const scriptPath = args.find((a) => a.endsWith('.json'));
if (!scriptPath) { console.log('usage: node tools/render.mjs scripts/<file>.json [--draft] [--preview-only] [--voice elevenlabs|flite|reuse]'); process.exit(1); }
const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
const id = script.id || path.basename(scriptPath, '.json');
const OUT = path.join(ROOT, 'out', id); fs.mkdirSync(OUT, { recursive: true });
const FPS = script.fps || 30;
const DRAFT = !!flag('draft', false);
const WORKERS = +flag('workers', 3);
const t0 = Date.now();

// 1. voice — if voice/<id>/ holds your recorded audio + words.json, use it
const VOICE_DIR = path.join(ROOT, 'voice', id);
if (fs.existsSync(path.join(VOICE_DIR, 'words.json'))) {
  for (const f of fs.readdirSync(VOICE_DIR)) fs.copyFileSync(path.join(VOICE_DIR, f), path.join(OUT, f));
  if (!flag('voice', null)) args.push('--voice', 'file');
}
const voice = await makeVoice(script, OUT, flag('voice', undefined));
const audioFile = path.join(OUT, voice.audio);
const audioDur = probeDuration(audioFile);
// 2. timeline
const env = envelope(audioFile, FPS, audioDur + 2);
const data = buildTimeline(script, voice, audioDur, env, FPS);
data.audio = voice.audio;
if (script.avatar) data.avatar = script.avatar;
fs.writeFileSync(path.join(OUT, 'data.js'), 'window.__DATA = ' + JSON.stringify(data) + ';\n');
const rel = path.relative(OUT, ROOT).split(path.sep).join('/');
fs.writeFileSync(path.join(OUT, 'preview.html'),
  fs.readFileSync(path.join(ROOT, script.engine === 'v2' ? 'engine/player.html' : 'engine/player3.html'), 'utf8').replaceAll('ENGINE/', rel + '/engine/').replaceAll("'ROOT/'", `'${rel}/'`));
console.log(`[timeline] ${data.beats.length} beats, ${data.duration.toFixed(1)}s, ${data.events.length} sfx events`);
console.log(`[preview] open ${path.join(OUT, 'preview.html')}`);
if (flag('preview-only', false)) process.exit(0);

// 3. frames (parallel workers, each writes a segment)
const N = Math.ceil(data.duration * FPS);
const W = DRAFT ? 540 : 1080, H = DRAFT ? 960 : 1920;
const browser = await playwright.chromium.launch();
const seg = Math.ceil(N / WORKERS);
let done = 0;
async function worker(k) {
  const a = k * seg, b = Math.min(N, a + seg); if (a >= b) return null;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto('file://' + path.join(OUT, 'preview.html') + '?render=1');
  await page.evaluate((s) => document.documentElement.style.setProperty('--scale', s), DRAFT ? 0.5 : 1);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.BB.ready());
  const segFile = path.join(OUT, `seg${k}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', DRAFT ? '26' : '18', '-pix_fmt', 'yuv420p', segFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) {
    await page.evaluate((t) => renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    done++; if (done % 60 === 0) process.stdout.write(`\r[frames] ${done}/${N}`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await page.close();
  return segFile;
}
const segs = (await Promise.all([...Array(WORKERS).keys()].map(worker))).filter(Boolean);
await browser.close();
console.log(`\r[frames] ${N}/${N} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
const list = path.join(OUT, 'segs.txt');
fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
const silent = path.join(OUT, 'video_silent.mp4');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
segs.forEach((s) => fs.unlinkSync(s));

// 4. audio — v3: original music + designed SFX + ducked, loudness-matched mix (tools/audio3.py); v2: legacy sfx
const final = path.join(OUT, `${id}${DRAFT ? '_draft' : ''}.mp4`);
if (script.engine !== 'v2') {
  execFileSync('python3', [path.join(ROOT, 'tools/audio3.py'), id], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', path.join(OUT, 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
    '-t', String(data.duration), '-movflags', '+faststart', final]);
  fs.unlinkSync(silent);
  console.log(`[done] ${final}  (${((Date.now() - t0) / 1000).toFixed(0)}s total)`);
  process.exit(0);
}
// 4. audio: voice + sfx + optional music
const SFX = path.join(ROOT, 'assets/sfx');
const inputs = ['-i', silent, '-i', audioFile];
const filters = ['[1:a]aresample=44100,volume=1.0[vo]'];
const mixes = ['[vo]'];
let n = 2;
const vol = { tick: 0.35, pop: 0.45, thud: 0.6, whoosh: 0.4, ding: 0.35 };
for (const e of data.events) {
  const f = path.join(SFX, e.type + '.wav'); if (!fs.existsSync(f)) continue;
  inputs.push('-i', f);
  filters.push(`[${n}:a]adelay=${Math.round(e.t * 1000)}|${Math.round(e.t * 1000)},volume=${vol[e.type] || 0.4}[s${n}]`);
  mixes.push(`[s${n}]`); n++;
}
const music = flag('music', script.music || null);
if (music && fs.existsSync(path.resolve(ROOT, music))) {
  inputs.push('-stream_loop', '-1', '-i', path.resolve(ROOT, music));
  filters.push(`[${n}:a]volume=0.13,afade=t=out:st=${(data.duration - 1).toFixed(2)}:d=1[mu]`); mixes.push('[mu]'); n++;
}
filters.push(`${mixes.join('')}amix=inputs=${mixes.length}:normalize=0:duration=first,alimiter=limit=0.95[a]`);
execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[a]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(data.duration), '-movflags', '+faststart', final], { maxBuffer: 1 << 26 });
fs.unlinkSync(silent);
console.log(`[done] ${final}  (${((Date.now() - t0) / 1000).toFixed(0)}s total)`);
