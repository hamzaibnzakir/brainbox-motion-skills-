// Pack finished reels into one zip for a posting agent.
//   node tools/export-pack.mjs            → follows content/posting-plan.json (order + captions)
//   node tools/export-pack.mjs 12 13 14   → only those video numbers, in number order, captions from scripts/
// Output: out/export/brainbox-reels-<date>.zip containing
//   videos/<slot>_<id>.mp4   1080×1920, H.264 + AAC, -13 LUFS
//   manifest.json            [{ slot, day, time, id, file, title, pillar, caption, hashtags, post_text, duration }]
//   captions.csv             same, one row per post
//   POSTING-PLAN.md          human-readable schedule with copy-paste captions
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pick = process.argv.slice(2).map((x) => String(+x).padStart(2, '0'));
const have = new Set(fs.readdirSync(path.join(ROOT, 'examples')).filter((f) => /^\d\d-.*\.mp4$/.test(f)).map((f) => f.slice(0, -4)));
const planPath = path.join(ROOT, 'content', 'posting-plan.json');
const script = (id) => { const p = path.join(ROOT, 'scripts', id + '.json'); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}; };
const splitTags = (c) => ({ caption: c.replace(/(\s*#\w+)+\s*$/, '').trim(), hashtags: c.match(/#\w+/g) || [] });

let posts;
if (!pick.length && fs.existsSync(planPath)) {
  posts = JSON.parse(fs.readFileSync(planPath, 'utf8')).posts.filter((p) => have.has(p.id));
} else {
  posts = [...have].sort().filter((id) => !pick.length || pick.includes(id.slice(0, 2)))
    .map((id, k) => ({ slot: k + 1, id, pillar: '', ...splitTags(script(id).caption || '') }));
}
if (!posts.length) { console.error('no videos found'); process.exit(1); }

const date = new Date().toISOString().slice(0, 10);
const stage = path.join(ROOT, 'out', 'export', `brainbox-reels-${date}`);
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'videos'), { recursive: true });

const manifest = posts.map((p) => {
  const src = path.join(ROOT, 'examples', p.id + '.mp4');
  const file = `videos/${String(p.slot).padStart(2, '0')}_${p.id}.mp4`;
  fs.copyFileSync(src, path.join(stage, file));
  const duration = +(+execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString().trim()).toFixed(1);
  return { slot: p.slot, day: Math.ceil(p.slot / 2), time: p.slot % 2 ? 'AM' : 'PM', id: p.id, file, title: script(p.id).title || p.id,
    pillar: p.pillar, caption: p.caption, hashtags: p.hashtags, post_text: p.caption + '\n\n' + p.hashtags.join(' '), duration };
});
fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2));
const q = (x) => '"' + String(x).replace(/"/g, '""') + '"';
fs.writeFileSync(path.join(stage, 'captions.csv'), 'slot,day,time,file,title,pillar,caption,hashtags,post_text\n' +
  manifest.map((m) => [m.slot, m.day, m.time, m.file, q(m.title), m.pillar, q(m.caption), q(m.hashtags.join(' ')), q(m.post_text)].join(',')).join('\n') + '\n');
fs.writeFileSync(path.join(stage, 'POSTING-PLAN.md'), `# Brainbox reels: posting plan\n\n${manifest.length} videos, 2 a day (AM + PM). Each post: upload the file, paste the text block.\n\n` +
  manifest.map((m) => `## ${String(m.slot).padStart(2, '0')} · Day ${m.day} ${m.time} · ${m.title}\nFile: \`${m.file}\` (${m.duration}s)${m.pillar ? ' · ' + m.pillar : ''}\n\n\`\`\`\n${m.post_text}\n\`\`\`\n`).join('\n'));

const zip = stage + '.zip';
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-q', '-0', path.basename(zip), path.basename(stage)], { cwd: path.dirname(stage) });
console.log(`${zip}  (${manifest.length} videos, ${(fs.statSync(zip).size / 1e6).toFixed(1)} MB)`);
