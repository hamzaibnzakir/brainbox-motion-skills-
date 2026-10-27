# Brainbox v3 Redesign — "Editorial light + dark pivots"

Built from a forensic pass over the reference video (78.6 s, 720×1280, 30 fps, stereo 44.1 kHz). Everything below marked **Verified** was measured on the actual file. Everything marked **Inferred** is an interpretation.

## 1. What the reference actually does (verified)

**Narration.** It's a fast, continuous voiceover: about 3.0 words/s with few pauses (transcribed with a wav2vec2 model). The structure is: price-tag problem → "one developer built something that beats all of them" → the "middle layer / harness" metaphor → name reveal → metrics → "here's where it gets good" → features → payoff → comment keyword → follow.

**Captions are the typography.** There's no caption pill. The spoken sentence builds on screen word by word:
- Each new word arrives grey and slightly offset, then settles to black.
- Key phrases become large bold italic lines ("beats all of them", "Middle Layer", "Harness").
- Some phrases get a black highlight box with white text that wipes on ("free & opensource", "before anything else", "when you need it").

**Visual system.**
- Off-white background with a soft vignette.
- Floating white cards with big soft shadows and 2–3 stacked sheets behind for depth.
- Real objects: pricing cards, a GitHub repo, a hand-and-robot-hand photo, live terminal recordings, ebook mockups.
- A connector/bracket line that draws on.
- Grid paper plus grey swoosh arcs for the metrics scene.
- Light → dark pivot for the technical section.
- Blur-zoom transitions.
- A crown-logo end card.

**Audio.**
- The integrated loudness is **-12.4 LUFS**, with a loudness range of **1.6 LU** (tightly compressed).
- A continuous music bed sits under the voice. Sub-bass energy stays high in speech gaps: the 30–110 Hz band has a median of 19 dB in gaps versus 26 dB overall.
- The bass pulse repeats about every 1.17 s, which suggests a tempo near ~100 BPM. This is inferred, not confirmed.
- Sustained tonal partials at ~600–900 Hz (pad/drone) run across the whole video.
- Regular high-frequency ticks (~0.78 s apart, 0.8–7 s) line up with each logo card popping in.
- A broadband swell into ~37 s, then a large sub-energy jump at the 37.5 s light → dark scene cut. That's a riser plus impact on the pivot.
- Scene cuts detected at 11.1, 11.9, 37.5, 45.1, 48.5, 49.3, 57.8 and 65.0 s.

**Brainbox before v3 (measured):** -18.7 LUFS, no music bed, a few thin synthetic ticks, dark-only scenes, a 3-word caption pill. That gap in loudness and sound design is the main reason our videos felt flat.

## 2. v3 system (implemented in `engine/v3.*`, `tools/audio3.py`)

| Layer | v3 rule | Purpose |
|---|---|---|
| Background | Off-white `#F2F2F0` with a vignette. Near-black `#111216` + violet glow only for **technical/AI scenes** (`prompt` visuals) and `void` punch lines | Light reads as editorial and premium. Dark marks a technical pivot, so the switch means something |
| Pivot | Circular wipe light ↔ dark. Riser + sub impact land on the first AI scene | Renews attention exactly when the "how" starts |
| Typography | Inter Display. Narration builds word-by-word (grey → ink, 22 px rise, blur → 0). `*em*` words get their own bold-italic line at 1.75× | The voice and the text are one thing. Emphasis is visual |
| Highlight box | Black box with white text that wipes on, via a scene's `"box": "<phrase from say>"` | One per video or scene at most, for the line you want screenshotted |
| Accent | One accent: violet `#6A52F5` (titles, active states). Coral `#E76E63` only for stat stars. Red/amber/green only for gauge semantics | Restraint: mostly neutral, one dominant accent |
| Cards | White sheets with layered soft shadows plus 2 stacked sheets behind. They enter with a 3D tilt (rotateX 18° → 4°), blur → sharp, and a light sweep across | Physical, premium depth instead of flat panels |
| Scenes | `prompt` → a real-looking terminal that types the actual prompt, then the reply streams in. `flow` → a connector line draws through nodes. `gauge`/`stat` → grid paper and swoosh arcs. `checklist` → an editorial ✦ list. `compare` → tilted before/after cards | Proof-style visuals |
| Host | A small creator badge (bottom-left) with mouth-sync. A full pose card only for hook and CTA | Keeps the brand face without stealing focus from the content |
| Watermark | `brainbox` at the bottom, light grey | Brand recall on every frame |

**Sound (all original, generated per video by `tools/audio3.py`):**
- **Music:** ~100 BPM, A minor (Am7–Fmaj7–C–G). Pad + sub pulse (saturated so it survives phone speakers) + soft kick/hats + 8th-note pluck arp. The arrangement follows the timeline:
  - **intro:** pad + sub
  - **main:** drums in
  - **punch lines:** drop to pad only (silence makes them land)
  - **lift:** after the AI pivot, kick on every beat
  - **CTA:** lift, then a 1.5 s tail
- **SFX, only on real events:**
  - whoosh on a scene change
  - fast whoosh into a punch line
  - tick on a step label, tag, or list item checking off
  - keyboard clicks while a prompt types
  - shimmer when the AI reply appears
  - pop on red marks and badges
  - paper + whoosh on before/after
  - riser + impact on the pivot
  - bell + sub accent on the CTA
- **Mix:**
  - Voice: high-pass 75 Hz, -1.5 dB at 220 Hz, +2.5 dB at 3.2 kHz, 3:1 compression.
  - Music: sidechain-ducked by the voice (7:1).
  - Master: two-pass loudnorm to **-13 LUFS, -1 dBTP** (the reference is -12.4).

## 3. Script fields added in v3
- `"box": "<exact phrase from say>"` adds a black highlight box on those words.
- `"engine": "v2"` renders the old dark style (legacy).

## 4. "Real scenes" — what's real now, and what needs footage
v3 recreates real-looking product surfaces as generic, unbranded mockups: a store page, a speed gauge, an AI terminal, lists and connectors. True real footage (your actual Shopify admin, PageSpeed report, Meta Ad Library, a screen recording of you prompting) is the next upgrade. Drop screenshots into `assets/real/` and reference them with `{"type":"image","src":"assets/real/<file>.png"}`. Don't use other brands' logos or footage you don't have rights to.

## 5. What to measure (per the brief)
- Hook variant → 3-second hold rate
- Light vs dark opening → average watch time
- Highlight box on/off → saves/screenshots
- CTA wording → follows per 1k views

Compare v2 and v3 uploads of the same topic where possible.
