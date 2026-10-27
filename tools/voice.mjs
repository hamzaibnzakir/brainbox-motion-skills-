// VOICE STEP — turns a script's "say" lines into voice audio + word timings + a mouth envelope.
// Providers:
//   elevenlabs  (final quality) needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (or script.voice.id)
//   flite       (offline scratch voice, robotic) — for timing tests only, needs ffmpeg built with libflite
//   file        bring your own: put voice.mp3 + words.json in out/<id>/ and pass --voice file
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export const EMOTION_TAG = /^\[[a-z]+(?:-[a-z]+)*\]$/i;
// Text for the voice studio: emphasis stars removed, emotion tags like [laughter] kept.
export const voiceLine = (say) => say.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
export function tokenize(say) {
  // "*word*" marks emphasis; "[laughter]"-style emotion tags are voice-only and never become caption words.
  const out = []; let inEm = false;
  for (const raw of say.trim().split(/\s+/)) {
    if (EMOTION_TAG.test(raw)) continue;
    let tok = raw; let em = inEm;
    if (tok.startsWith('*')) { em = true; inEm = true; tok = tok.slice(1); }
    if (tok.replace(/[.,!?;:"')\]]+$/, '').endsWith('*')) { em = true; inEm = false; }
    else if (tok.includes('*')) { em = true; }
    tok = tok.replace(/\*/g, '');
    if (tok) out.push({ text: tok, em });
  }
  return out;
}
export const cleanSay = (say) => tokenize(say).map((w) => w.text).join(' ');

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 30, ...opts });
export const probeDuration = (f) => parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

async function elevenlabs(script, dir) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || script.voice?.id;
  if (!key || !voiceId) throw new Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (see VOICE.md)');
  const text = script.beats.map((b) => cleanSay(b.say)).join(' ');
  const settings = Object.assign({ stability: 0.38, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.08 }, script.voice?.settings || {});
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: script.voice?.model || 'eleven_multilingual_v2', voice_settings: settings }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const j = await res.json();
  fs.writeFileSync(path.join(dir, 'voice.mp3'), Buffer.from(j.audio_base64, 'base64'));
  const a = j.alignment;
  const words = []; let cur = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { text: '', start: a.character_start_times_seconds[i], end: 0 };
    cur.text += ch; cur.end = a.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  return { audio: 'voice.mp3', words };
}

function flite(script, dir) {
  const tmp = path.join(dir, 'flite'); fs.mkdirSync(tmp, { recursive: true });
  const words = []; const parts = []; let t = 0; const GAP = 0.14;
  script.beats.forEach((b, i) => {
    const txt = cleanSay(b.say);
    const tf = path.join(tmp, `b${i}.txt`); fs.writeFileSync(tf, txt);
    const wf = path.join(tmp, `b${i}.wav`);
    run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `flite=textfile=${tf}:voice=slt`,
      '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo=1.12,aresample=44100',
      '-ac', '1', wf]);
    const d = probeDuration(wf);
    const toks = txt.split(' ');
    const weights = toks.map((w) => w.length + 2 + (/[.,!?;:]$/.test(w) ? 4 : 0));
    const total = weights.reduce((x, y) => x + y, 0);
    let acc = 0;
    toks.forEach((w, k) => {
      const s = t + (acc / total) * d; acc += weights[k];
      words.push({ text: w, start: s, end: t + (acc / total) * d - (/[.,!?;:]$/.test(w) ? 0.1 : 0.02) });
    });
    parts.push(wf); t += d + GAP;
  });
  // concat with gaps
  const list = path.join(tmp, 'list.txt');
  const sil = path.join(tmp, 'gap.wav');
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-t', String(GAP), sil]);
  fs.writeFileSync(list, parts.map((p) => `file '${p}'\nfile '${sil}'`).join('\n'));
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ac', '1', '-ar', '44100', path.join(dir, 'voice.wav')]);
  return { audio: 'voice.wav', words };
}

export function envelope(file, fps, duration) {
  const raw = run('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-']);
  const s = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const per = 16000 / fps; const n = Math.ceil(duration * fps);
  const rms = [];
  for (let f = 0; f < n; f++) {
    let sum = 0, c = 0;
    for (let i = Math.floor(f * per); i < Math.min(s.length, Math.floor((f + 1) * per)); i++) { sum += s[i] * s[i]; c++; }
    rms.push(c ? Math.sqrt(sum / c) : 0);
  }
  const sorted = rms.filter((x) => x > 0.005).sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const out = []; let prev = 0;
  for (const r of rms) { const v = Math.min(1, r / ref); prev = Math.max(v, prev * 0.55); out.push(+prev.toFixed(3)); }
  return out;
}

export async function makeVoice(script, dir, provider) {
  fs.mkdirSync(dir, { recursive: true });
  const cached = path.join(dir, 'words.json');
  if (provider === 'file' || (provider === 'reuse' && fs.existsSync(cached))) {
    const j = JSON.parse(fs.readFileSync(cached, 'utf8'));
    return j;
  }
  const p = provider || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'flite');
  console.log(`[voice] provider: ${p}`);
  const r = p === 'elevenlabs' ? await elevenlabs(script, dir) : flite(script, dir);
  r.provider = p;
  fs.writeFileSync(cached, JSON.stringify(r, null, 1));
  return r;
}
