---
name: brainbox-reel
description: Write, voice-prep, align and render a Brainbox TikTok/Reels video with this repo's motion engine and host character. Use when asked to make a Brainbox reel, script a reel, or render a scene file.
---

# Brainbox reel

1. **Pick the idea** from `content/30-reel-ideas.md` (or the user's topic).
2. **Write the scene file** `scripts/NN-slug.json` following `docs/SCRIPT_PROMPT.md` exactly, and use `scripts/01-store-audit.json` as the model. Include `"avatar": {"dir": "assets/hero"}` and 1–3 emotion tags.
3. **Check anchors**: every `"at"` must start a word in that scene's `say`.
4. **Export voice lines**: `node tools/export-voice-script.mjs scripts/NN-slug.json`, then give the user `voice/NN-slug/script.txt` to generate in their voice studio.
5. When the user sends audio, save it as `voice/NN-slug/voice.wav` and run
   `python3 tools/align_ctc.py scripts/NN-slug.json voice/NN-slug/voice.wav voice/NN-slug/words.json` (forced alignment, needs `pip install onnxruntime numpy`).
   Spot-check with `python3 tools/transcribe.py voice/NN-slug/voice.wav <from> <to>`. Never assume a pause is a line break.
6. **Preview**: `node tools/render.mjs scripts/NN-slug.json --preview-only && node tools/proof.mjs NN-slug`, then look at `out/NN-slug/proof.png`.
7. **Render**: `node tools/render.mjs scripts/NN-slug.json`. The output is `out/NN-slug/NN-slug.mp4`. Verify the duration with ffprobe and sample a few frames before delivering.
