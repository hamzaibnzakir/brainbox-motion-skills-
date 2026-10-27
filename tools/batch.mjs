// Render every script in scripts/ that doesn't have a finished MP4 yet.
// usage: node tools/batch.mjs [--voice elevenlabs] [--draft] [--force]
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const args = process.argv.slice(2);
const force = args.includes('--force');
const pass = args.filter((a) => a !== '--force');
const files = fs.readdirSync('scripts').filter((f) => f.endsWith('.json')).sort();
for (const f of files) {
  const id = JSON.parse(fs.readFileSync(path.join('scripts', f), 'utf8')).id || f.replace('.json', '');
  const mp4 = path.join('out', id, `${id}${pass.includes('--draft') ? '_draft' : ''}.mp4`);
  if (!force && fs.existsSync(mp4)) { console.log(`skip ${id} (exists)`); continue; }
  console.log(`\n=== ${id} ===`);
  try { execFileSync('node', ['tools/render.mjs', path.join('scripts', f), ...pass], { stdio: 'inherit' }); }
  catch { console.error(`FAILED ${id}`); }
}
