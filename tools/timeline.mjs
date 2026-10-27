// TIMELINE — maps voice word timings onto the script's beats, captions, anchors and sound events.
import { tokenize } from './voice.mjs';

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9%$']/g, '');

export function buildTimeline(script, voice, audioDur, envelope, fps) {
  const words = voice.words; let wi = 0;
  const beats = script.beats.map((b) => {
    const toks = tokenize(b.say);
    const ws = toks.map((tk) => {
      const w = words[wi++] || { start: audioDur, end: audioDur };
      return { text: tk.text, em: tk.em, start: w.start, end: w.end };
    });
    return Object.assign({}, b, { words: ws });
  });
  if (wi !== words.length) console.warn(`[timeline] word count mismatch: script ${wi} vs audio ${words.length}`);
  const duration = +(audioDur + (script.tail ?? 0.9)).toFixed(3);
  beats.forEach((b, i) => {
    b.start = i === 0 ? 0 : Math.max(beats[i - 1].start + 0.4, b.words[0].start - 0.12);
  });
  beats.forEach((b, i) => { b.end = i < beats.length - 1 ? beats[i + 1].start : duration; });

  const events = [];
  beats.forEach((b, i) => {
    // anchors
    let cursor = 0;
    const at = (a, fallback) => {
      if (a == null) return fallback;
      if (typeof a === 'number') return b.start + a;
      const n = norm(a);
      for (let k = 0; k < b.words.length; k++) {
        const kk = (cursor + k) % b.words.length;
        if (norm(b.words[kk].text).startsWith(n)) { cursor = kk; return b.words[kk].start; }
      }
      console.warn(`[timeline] beat ${i}: anchor "${a}" not found`);
      return fallback;
    };
    const spread = (k, n) => b.start + 0.35 + k * Math.min(0.5, (b.end - b.start - 0.6) / Math.max(1, n));
    (b.chips || []).forEach((c, k, arr) => { c.t = at(c.at, spread(k, arr.length)); events.push({ t: c.t, type: c.kind === 'hot' || c.kind === 'bad' ? 'pop' : 'tick' }); });
    if (b.stamp) { b.stamp.t = at(b.stamp.at, b.start + 0.3); events.push({ t: b.stamp.t, type: 'thud' }); }
    const v = b.visual;
    if (v) {
      cursor = 0;
      if (v.badge) { v.badgeT = at(v.badgeAt, b.start + 0.8); events.push({ t: v.badgeT, type: 'pop' }); }
      if (v.marks) v.marks.forEach((m, k) => { m.t = at(m.at, spread(k, v.marks.length)); events.push({ t: m.t, type: 'pop' }); });
      if (v.scrollAt != null) v.scrollT = at(v.scrollAt, b.start + 1);
      if (v.type === 'gauge') { v.t = at(v.at, b.start + 0.2); if (v.at2 != null) { v.t2 = at(v.at2, v.t + 1.2); events.push({ t: v.t2 + 1.1, type: 'ding' }); } }
      if (v.items) v.items.forEach((it, k) => { it.t = at(it.at, spread(k, v.items.length)); events.push({ t: it.t + 0.35, type: it.ok === false ? 'pop' : 'tick' }); });
      if (v.nodes) v.nodes.forEach((n, k) => { n.t = at(n.at, spread(k, v.nodes.length)); events.push({ t: n.t, type: 'tick' }); });
      if (v.type === 'stat') { v.t = at(v.at, b.start + 0.2); events.push({ t: v.t + 1.0, type: 'ding' }); }
    }
    if (i > 0 && (beats[i - 1].bg || 'ink') !== (b.bg || 'ink')) events.push({ t: b.start, type: 'whoosh' });
    // caption chunks: ≤3 words / ≤18 chars, break after punctuation
    const chunks = []; let cur = [];
    const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
    b.words.forEach((w) => {
      const len = cur.reduce((s, x) => s + x.text.length + 1, 0) + w.text.length;
      if (cur.length >= 3 || (cur.length && len > 18)) flush();
      cur.push(w);
      if (/[.,!?;:…]$/.test(w.text)) flush();
    });
    flush();
    b.chunks = chunks.map((ws, k) => ({
      start: Math.max(b.start, ws[0].start - 0.06),
      end: k < chunks.length - 1 ? Math.max(chunks[k + 1][0].start - 0.06, ws[0].start) : b.end,
      words: ws,
    }));
  });
  return { fps, duration, beats, envelope, events: events.filter((e) => e.t < duration).sort((a, b) => a.t - b.t) };
}
