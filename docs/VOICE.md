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
4. Align the words to the audio:
   ```bash
   python3 tools/align.py scripts/03-name.json voice/03-name/voice.wav voice/03-name/words.json
   ```
   It prints each phrase with its time range. Skim it against the audio, and if one is off, fix the start/end seconds in `words.json`.
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
