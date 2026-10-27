// Finds Playwright wherever it is installed (local node_modules, global, or /opt/npm-tools).
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const tries = ['playwright', path.join(process.cwd(), 'node_modules/playwright'), '/opt/npm-tools/node_modules/playwright',
  ...(process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean).map(p => path.join(p, 'playwright'))];
let pw = null;
for (const t of tries) { try { pw = require(t); break; } catch {} }
if (!pw) { console.error('Playwright not found. Run: npm install playwright && npx playwright install chromium'); process.exit(1); }
export default pw;
