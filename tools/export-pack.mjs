// Pack finished reels into one zip for a posting agent.
//   node tools/export-pack.mjs              → every video in examples/
//   node tools/export-pack.mjs 12 13 14     → only those numbers
// Output: out/export/brainbox-reels-<date>.zip containing
//   videos/NN-name.mp4 (1080×1920, H.264 + AAC, -13 LUFS)
//   manifest.json  [{ n, id, file, title, caption, duration }]
//   captions.csv   n,id,file,title,caption
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pick = process.argv.slice(2).map((x) => String(+x).padStart(2, '0'));
const vids = fs.readdirSync(path.join(ROOT, 'examples')).filter((f) => /^\d\d-.*\.mp4$/.test(f)).sort()
  .filter((f) => !pick.length || pick.includes(f.slice(0, 2)));
if (!vids.length) { console.error('no videos found'); process.exit(1); }

const date = new Date().toISOString().slice(0, 10);
const stage = path.join(ROOT, 'out', 'export', `brainbox-reels-${date}`);
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'videos'), { recursive: true });

const manifest = [];
for (const f of vids) {
  const id = f.replace(/\.mp4$/, '');
  const sp = path.join(ROOT, 'scripts', id + '.json');
  const s = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : {};
  const src = path.join(ROOT, 'examples', f);
  fs.copyFileSync(src, path.join(stage, 'videos', f));
  const duration = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString().trim();
  manifest.push({ n: +id.slice(0, 2), id, file: 'videos/' + f, title: s.title || id, caption: s.caption || '', duration: +duration.toFixed(1) });
}
fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2));
const q = (x) => '"' + String(x).replace(/"/g, '""') + '"';
fs.writeFileSync(path.join(stage, 'captions.csv'), 'n,id,file,title,caption\n' +
  manifest.map((m) => [m.n, m.id, m.file, q(m.title), q(m.caption)].join(',')).join('\n') + '\n');

const zip = stage + '.zip';
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-q', '-0', path.basename(zip), path.basename(stage)], { cwd: path.dirname(stage) });
console.log(`${zip}  (${manifest.length} videos, ${(fs.statSync(zip).size / 1e6).toFixed(1)} MB)`);
