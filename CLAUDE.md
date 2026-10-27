# Brainbox Motion Skills — agent notes

This repo makes Brainbox TikTok/Reels videos. Read `README.md` for the pipeline.

- Scene files live in `scripts/`. Their schema is in `docs/STYLE.md` §5, and the writing rules are in `docs/SCRIPT_PROMPT.md`. Match `scripts/01-store-audit.json` in quality and structure.
- Every scene needs `say`. `*word*` = caption emphasis. `[tag]` = voice-studio emotion tag (hidden from captions, see `docs/VOICE.md`). Every `"at"` anchor must start a real word in the same scene's `say`.
- Voice comes from the user's voice clone. Export lines with `node tools/export-voice-script.mjs`, the user records, then run `python3 tools/align.py` and check the printed phrases against the audio before rendering.
- Before a full render, run `--preview-only` + `node tools/proof.mjs <id>` and look at the contact sheet.
- The look is purple/blue on near-black (`engine/style.css` `:root`). Don't reintroduce the old green palette.
- Never invent stats about real brands or name real people in scripts.
- `out/` and `node_modules/` are gitignored. Only commit scripts, voice folders, docs, engine, tools and assets.
