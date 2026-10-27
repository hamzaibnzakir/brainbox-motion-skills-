# Brainbox Motion Style

The structure comes from the breakdown of the reference video (`docs/REFERENCE_BREAKDOWN.md`). The look is Brainbox's own: a dark command center with the brand's purple-to-blue signal colors, presented by the Brainbox host (see `CHARACTER.md`).

## 1. Color = emotion
| Background | Name in scripts | Look | Use it for |
|---|---|---|---|
| Ink | `"bg": "ink"` | `#080B10`, drifting purple grid, soft purple/blue glow | Explaining, showing, proof (~75% of a video) |
| Neon | `"bg": "neon"` | Full purple→blue gradient (`#9B7BFF` → `#6A4DFF` → `#3E5BFF`) with ripple rings, white text | **The punchline.** One-word reframes ("It's a *leaky* bucket.") |
| Void | `"bg": "void"` | Near-black with a deep purple core and a slow scanline | **Tension.** Open loops ("3 LEAKS. The last one's the *worst.*", "And *three?*") |

Signal colors: purple `#9C7DFF` (accent text), gradient `#7B5CFF → #4D7CFF` (tags, hot chips). Supporting: panel `#0F1520`, line `#243042`, text `#F2F5F9`, muted `#4C586A`, bad `#FF4D5E`, warn `#FFB547`, good `#39FF88` (gauges only).
Rule: a video uses the full purple screen at most 2–3 times. If everything is loud, nothing is.

## 2. Type
| Role | Font | Rule |
|---|---|---|
| Headline | Inter Display Black, tight tracking | One `*accent*` word per headline |
| Accent word | Lora Italic in purple | The Brainbox signature: machine-bold text with one human, handwritten-feeling word |
| Section header | TeX Gyre Heros Condensed Bold, caps | Two-tone: `VAGUE *HEADLINE*`, with the number in a tilted neon tag |
| Labels / HUD | DejaVu Sans Mono Bold, caps, wide tracking | Small and techy: "FREE STORE AUDIT", "● LIVE" |
| Captions | Inter Display ExtraBold, 64px | In the caption pill |

All fonts are free and bundled in `/fonts`.

## 3. The caption pill + host bubble (the signature)
- The host sits in a **round purple-ringed bubble** on the left with a "● LIVE" tag. His face swaps between mouth-closed and talking images with the voice, and his expression changes per scene (`"bix"` field)
- The **caption pill** sits beside her like a speech bubble, at ~68% of the screen height
- Karaoke reveal: unspoken words are **muted grey**, the word being said is **purple**, spoken words are **white**, and `*emphasis*` words stay purple
- 1–3 words per chunk, and a new chunk starts after punctuation
- In `"layout": "bix"` scenes the host fills the stage in a full-body pose (`"pose"` field), so the bubble disappears and the pill centers

## 4. Layout grid (1080×1920)
```
  0–150    empty (TikTok/IG top UI)
170        label tag (optional)
230–420    header / headline
470–1070   visual card (880×600, glass panel with glow)
1112       chips row
1250–1450  host bubble + caption pill
1450–1920  empty (username, caption, buttons)
```

## 4b. Host fields per scene
```
"bix":  talk | happy | shock | smug | serious | think | wink    (face in the bubble)
"pose": presenting | explaining | celebrating | main          (full body, layout "bix" only)
```

## 5. Building blocks
| Block | Script key | Notes |
|---|---|---|
| Icon card | `"visual": {"type":"icon","icon":"cart","badge":"x","badgeAt":"leave","tone":"bad"}` | 88 icons, see `engine/icons.js` |
| Store mock | `{"type":"browser","url":"..","hero":"..","ship":"..","marks":[{"target":"hero","kind":"bad","text":"SAYS NOTHING","at":"nothing"}]}` | Targets: `nav`, `hero`, `grid`, `ship`. Optional `scroll` + `scrollAt` |
| Gauge | `{"type":"gauge","from":31,"to":89,"at":"three","at2":"fix","label":".."}` | Turns red, then amber, then green |
| Checklist | `{"type":"checklist","items":[{"text":"..","at":"..","ok":true}]}` | `ok:false` gives a red X |
| Big number | `{"type":"stat","to":30.7,"decimals":1,"suffix":"K","label":"..","at":".."}` | Counts up, then a ding |
| Flow | `{"type":"flow","nodes":[{"icon":"bot","text":"..","at":".."}]}` | For agent and automation videos |
| Image | `{"type":"image","src":"assets/screenshot.png"}` | Real screenshots or AI art |
| Chips | `"chips":[{"icon":"timer","text":"6s to load","at":"six","kind":"hot\|bad"}]` | The last chip is usually `hot` (the answer) or `bad` (the pain) |
| Stamp | `"stamp":{"text":"60 SEC AUDIT","at":"seconds","kind":"white\|bad","rot":-6,"y":820}` | Max 2 per video |

`"at"` = the word in that scene's `say` line when it appears (it matches the start of a word). It can also be a number of seconds after the scene starts.

## 6. Motion rules
- Scene change: **blur dissolve** (0.3s, 16px blur, 3% scale). No slides or spins
- Entrances: pop with overshoot (0.32s). Stamps **slam** (1.7×→1 in 0.16s plus a shake)
- Everything that appears is **timed to a spoken word**. Nothing moves at random
- Constant life: the grid drifts, the glow wanders, the host bobs and talks. The screen never freezes
- Sound: tick (chip), pop (bad chip or mark), thud (stamp), whoosh (background change), ding (number lands). All generated, in `assets/sfx`

## 7. The story formula (every video)
1. **Hook**: the host on stage (`pose: presenting`) plus a bold claim (`layout: bix`)
2. **Promise**: what you'll get, plus a stamp
3. **Reframe**: name the pain in a few words (`neon`)
4. **Open loop**: "3 things, the last one's the best/worst" (`void`)
5. **1 / 2 / "And three?" / 3**: one idea, one visual and 1–2 chips each
6. **Fix or proof**: checklist, gauge, or a big number
7. **Callback punch**: `neon` question, then `void` verdict
8. **CTA**: the host on stage (`pose: celebrating`), comment keyword plus a freebie
