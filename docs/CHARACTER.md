# The Brainbox Host — Character Bible

**Name:** _TBD (set it here once chosen)_
**Role:** The face and voice of Brainbox. He audits stores, spies on competitors and runs AI agents, then breaks it all down in under 45 seconds.
**Personality:** Confident, quick and a little cheeky. He roasts bad stores, never the people who own them. Smug when he's right, genuinely hyped when something works. Mentor energy, not guru energy.
**Tagline (from the sheet):** Build · Learn · Automate · Scale

## Look (keep these the same everywhere)
- Pixel-art style, young man with brown skin, a voluminous curly black hairstyle and dark brown eyes
- **Black BRAINBOX hoodie** with a white hood lining and the purple **crown** logo
- Black cargo joggers with crown patches, and white/purple high-top sneakers with the crown
- Signature gesture: pointing at the viewer
- Palette: black `#0B0B12`, hoodie lining white `#F2F2F5`, purple `#7B5CFF` / `#9C7DFF`, blue `#4D7CFF`
- Props (from the sheet): laptop, crown coffee cup, headphones, ideas notepad, phone, the AI / ECOM / AUTOMATION / SCALING book stack, plant, growth chart

## Image files (`assets/hero/`)
| File | Used for |
|---|---|
| `default.png` | Face, mouth closed (talk/smug idle) |
| `talking.png` | Face, mouth open, swapped in while the voice is loud |
| `happy.png` / `excited.png` | Happy idle / happy talking |
| `thinking.png` | "And three?" moments (hand on chin) |
| `serious.png` | Verdicts ("That's burning money.") |
| `presenting.png` / `explaining.png` / `celebrating.png` | Full-body stage poses (`"pose"` field) |
| `main.png` | The big hero pose from the sheet |
| `character-sheet.png` | The original full sheet (front/side/back, expressions, poses, props) |

Expression → image mapping (`AV` in `engine/engine.js`):
| `"bix"` value | Mouth closed | Mouth open |
|---|---|---|
| talk / smug | default | talking |
| happy / wink | happy | excited |
| shock | talking | excited |
| serious | serious | talking |
| think | thinking | thinking |

**Upgrade path:** these images were cropped from the character sheet, so they're small (~140px). For sharper videos, export each one as its own transparent PNG at 1024px+ with the same framing, keep the file names, and drop them into `assets/hero/`. No code changes needed. A `blink.png` can be added later.

## Generating new art
Use the character sheet as the reference image (image-reference / character-reference feature in your tool) and keep this description word for word:

> **Pixel art character, a confident young man with brown skin, voluminous curly black hair and dark brown eyes, wearing a black oversized hoodie with a white hood lining and "BRAINBOX" printed on the chest with a small purple crown logo, black cargo joggers with purple crown patches, white and purple high-top sneakers with a crown. [POSE / EXPRESSION]. Detailed 32-bit pixel art, dark navy background with purple and blue neon glow, crisp pixels.**

Pose slots: "pointing at the viewer with a smirk" · "arms crossed, smug" · "shocked, leaning toward camera" · "typing on a laptop with a purple crown logo" · "celebrating with both fists up".

## Legacy
`legacy/bix-character-sheet.png` and `engine/character.js` are the first vector mascot (Bix). The engine still falls back to her if a script has no `"avatar"` field.
