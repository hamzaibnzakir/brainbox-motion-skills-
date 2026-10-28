# Brainbox Motion Skills

The full Brainbox short-form video system for TikTok and Instagram Reels (AI for e-commerce, two posts a day). It holds the motion style, the host character, the voice workflow, 30 reel ideas, and a **content machine** that turns a script into a finished 1080×1920 MP4 with captions, motion graphics, lip-flap and sound effects.

▶ **Example:** `examples/01-store-audit.mp4` (made with this repo, voice clone + host)

```
idea (content/30-reel-ideas.md)
  └─ docs/SCRIPT_PROMPT.md + Hermes/LLM ─▶ scripts/NN-name.json
       └─ tools/export-voice-script.mjs ─▶ voice/NN-name/script.txt ─▶ voice studio (clone + emotion tags)
            └─ voice/NN-name/voice.wav ─▶ tools/align.py ─▶ words.json
                 └─ tools/render.mjs ─▶ out/NN-name/NN-name.mp4
```

## What's in here
| Path | What |
|---|---|
| `content/30-reel-ideas.md` | 30 numbered reel scripts across 5 pillars + a 15-day posting schedule |
| `docs/REDESIGN_V3.md` | **Current look (v3):** reference forensics + the editorial-light/dark-pivot system, original music, SFX palette and mix spec |
| `docs/STYLE.md` | Building blocks (scene fields) and the v2 dark style (legacy, `"engine": "v2"`) |
| `docs/CHARACTER.md` | The host's character bible, image files, expression mapping, art prompt |
| `docs/VOICE.md` | Voice-clone workflow and **emotion tags** (`[laughter]`, `[sigh]`, …) |
| `docs/SCRIPT_PROMPT.md` | Prompt that turns an idea into a scene file |
| `docs/REFERENCE_BREAKDOWN.md` | Reverse-engineered breakdown of the reference motion style this system is based on |
| `engine/` | The motion design template: deterministic animation engine, styles, preview player, icons |
| `assets/hero/` | Character images (faces, poses, original sheet) |
| `assets/brand/logo.png` · `assets/sfx/` | Wordmark · tick/pop/thud/whoosh/ding sound effects |
| `fonts/` | Inter Display, Lora Italic, TeX Gyre Heros Condensed, DejaVu Sans Mono (all free licenses) |
| `scripts/` | Scene files (01 has real voice, 02 is ready to voice) |
| `voice/01-store-audit/` | The recorded voice, the aligned words and the voice-studio script for video 01 |
| `tools/` | `render`, `batch`, `align`, `export-voice-script`, `proof` (frame contact sheet), `build-icons` |
| `legacy/` | The first vector mascot (Bix) |

## Setup
Requires **Node 18+**, **Python 3** (with `pip install onnxruntime numpy`) and **ffmpeg** on PATH.
```bash
npm install
npx playwright install chromium
```

## Make a reel
```bash
# 1. write scripts/03-name.json with docs/SCRIPT_PROMPT.md
node tools/export-voice-script.mjs scripts/03-name.json        # 2. lines for the voice studio
#    generate in the voice studio, then save as voice/03-name/voice.wav
python3 tools/align_ctc.py scripts/03-name.json voice/03-name/voice.wav voice/03-name/words.json   # 3. forced-alignment timings
node tools/render.mjs scripts/03-name.json --preview-only       # 4. open out/03-name/preview.html and scrub
node tools/render.mjs scripts/03-name.json                      # 5. final MP4 with v3 visuals + original music/SFX mix (~5 min)
```
- `--draft`: half resolution, ~3× faster, for checks
- `node tools/proof.mjs 03-name`: contact sheet of one frame per scene
- `node tools/batch.mjs`: renders every script that doesn't have a video yet
- `node tools/export-pack.mjs [12 13 …]`: zips the finished HD videos in `examples/` (1080×1920) with `manifest.json` + `captions.csv` for the auto-posting agent → `out/export/brainbox-reels-<date>.zip`
- Background music: put a file at `assets/music.mp3` and add `"music": "assets/music.mp3"` to the script

## Hermes task
Drop into `C:\Brainbox\automation\queue\pending\`:
```json
{ "task": "brainbox-reel", "instruction": "In the brainbox-motion-skills repo: turn idea #05 from content/30-reel-ideas.md into scripts/05-best-seller.json using docs/SCRIPT_PROMPT.md, then run node tools/export-voice-script.mjs scripts/05-best-seller.json and report the path of script.txt for voice recording." }
```
