# Voice — Clone + Emotion Tags

The host's voice is a **voice clone in your voice studio**. Use the same clone and settings for every video.

## Workflow per video
1. Export the lines for the voice studio:
   ```bash
   node tools/export-voice-script.mjs scripts/03-name.json
   ```
   This writes `voice/03-name/script.txt`: one line per scene with blank lines between them, emphasis stars removed and **emotion tags kept**.
2. Import or paste it into the voice studio and generate.
   - **Best:** one audio file per line, which gives perfect timing.
   - **Fine:** one long file with natural pauses between lines.
3. Save the audio as `voice/03-name/voice.wav`
4. Align the words to the audio with **forced alignment** (the accurate method, ~20 ms precision):
   ```bash
   pip install onnxruntime numpy        # once
   python3 tools/align_ctc.py scripts/03-name.json voice/03-name/voice.wav voice/03-name/words.json
   ```
   A wav2vec2 speech model (downloaded once from Hugging Face, ~95 MB) listens to the voice and pins every script word to the moment it's spoken. Words are also snapped out of real silences. It prints each line with its time range.
   - Verify a stretch: `python3 tools/transcribe.py voice/03-name/voice.wav 10 20` prints what the model hears, with timestamps.
   - Hand-fix a boundary: `python3 tools/runs_from_words.py scripts/03-name.json voice/03-name/words.json > voice/03-name/runs.txt`, edit, then `python3 tools/words_from_runs.py …`.
   - **Don't assume pauses are line breaks.** The clone often pauses mid-line ("Under fifty? … You're leaking sales."). That assumption caused 1–3 s drift in early renders of videos 08, 10 and 11. The older pause-based tools (`align.py`, `align_peaks.py`, `align_speech.py`) are kept only as fallbacks.
5. Render. The renderer picks up `voice/03-name/` automatically:
   ```bash
   node tools/render.mjs scripts/03-name.json
   ```

## Emotion tags
The voice studio supports these tags. Put them in a scene's `say` line. They're **spoken by the voice and hidden from the captions**, and the aligner budgets time for them.

| Tag | Use it for | Example `say` |
|---|---|---|
| `[laughter]` | Roasting a bad store, a callback joke | `Still buying more *ads?* [laughter]` |
| `[sigh]` | Disappointment before a verdict | `[sigh] That's *burning* money.` |
| `[confirmation-en]` | Agreeing with the viewer | `[confirmation-en] Yep, that's the leak.` |
| `[question-en]` `[question-ah]` `[question-oh]` `[question-ei]` `[question-yi]` | Rhetorical questions, open loops | `And three? [question-oh]` |
| `[surprise-ah]` `[surprise-oh]` `[surprise-wa]` `[surprise-yo]` | Revealing a bad number or a big win | `[surprise-oh] Six seconds to load.` |
| `[dissatisfaction-hnn]` | Reacting to bad design | `[dissatisfaction-hnn] It says *nothing.*` |

**Rules:**
- **1–3 tags per video.** More sounds like a gimmick
- Put a tag at the start or end of a line, never mid-phrase
- Match the tag to the host's expression in that scene: `[sigh]` → `"bix":"serious"`, `[laughter]` → `"smug"` or `"happy"`, `[surprise-*]` → `"shock"`, `[question-*]` → `"think"`
- A tag must be its own word: `[sigh] That's…` not `[sigh]That's…`

## Voice character
Confident, quick, a little cheeky. Fast but clear (~170 words per minute), punchy on keywords, relaxed between them. Write for the ear: short sentences, contractions, numbers written the way he'd say them.

## Other providers
`tools/voice.mjs` can also call ElevenLabs directly (`ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`), or fall back to an offline robot scratch voice for timing tests (`--voice flite`). The scratch voice is never for posting.
