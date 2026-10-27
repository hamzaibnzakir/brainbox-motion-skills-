// Export the lines to paste/import into your voice studio (emotion tags kept, one line per scene).
// usage: node tools/export-voice-script.mjs scripts/03-name.json   -> voice/03-name/script.txt
import fs from 'fs'; import path from 'path';
import { voiceLine } from './voice.mjs';
const f = process.argv[2];
if (!f) { console.log('usage: node tools/export-voice-script.mjs scripts/<file>.json'); process.exit(1); }
const s = JSON.parse(fs.readFileSync(f, 'utf8'));
const id = s.id || path.basename(f, '.json');
const dir = path.join('voice', id); fs.mkdirSync(dir, { recursive: true });
const txt = s.beats.map((b) => voiceLine(b.say)).join('\n\n') + '\n';
fs.writeFileSync(path.join(dir, 'script.txt'), txt);
console.log(txt); console.log(`→ ${path.join(dir, 'script.txt')}  (${s.beats.length} lines)`);
