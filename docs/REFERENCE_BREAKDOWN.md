# Reverse-Engineered: The "Hermes gets its own computer" Motion Style

**Source:** 42s, 1080×1920, 30fps. One continuous motion piece with no hard cuts. Scenes change with blur dissolves.
**In one line:** a karaoke caption pill, a clean 3D "clay" illustration, a few chips that stack in, and a background color that changes with the emotion of each beat.

---

## 1. The story structure (this is the real secret)

The motion design is simple. The **script structure** does most of the work. Here are the beats with timings from the video:

| Time | Beat | What's on screen | Job |
|---|---|---|---|
| 0–4s | **Hook / news** | "Hermes gets its *own* computer" + app icons pop in | Instant curiosity. Uses the "X just got Y" news format |
| 4–7s | **Reward** | "FREE PLUGIN" stamp slams in at an angle | Gives a reason to stay ("it's free") |
| 7–9s | **Name + proof** | "It's called Cua *Spaces*" + GitHub screenshot in a window | Makes it real and specific |
| 9–16s | **THE PROBLEM** | Messy laptop render, then a hand smashing a button. Chips: "Can I run this?", "Can I delete that?", then "Yes. Yes. Yes." | Makes the viewer feel the pain |
| 16–19s | **Reframe punch** | **Orange screen:** "That's *babysitting.*" | Names the pain in one memorable word |
| 19–21s | **Open loop** | **Dark screen:** "3 BIG CHANGES. The last one's the *best*." | Keeps people watching to the end |
| 21–33s | **Numbered payoff** | 1 · THROWAWAY COMPUTERS → 2 · WATCH IT LIVE → (dark) "And *three?*" → 3 · ANY COMPUTER | One idea, one image, and 1–2 chips per point |
| 33–36s | **Safety + proof** | "It breaks in a *sandbox*" → "30.7K ⭐" sticker slams onto the GitHub page | Handles the objection, then shows social proof |
| 36–39s | **Callback punch** | **Orange:** "Still clicking *yes?*" → **Dark:** "That's the *Stone* Age." | Calls back to the problem and makes the old way look outdated |
| 39–42s | **CTA** | "LINK IN MY BIO" sticker, a search bar typing "Tap my profile", and a "Free setup" card | A clear next step with a free incentive |

**Formula:** News hook → it's free → name it → problem (felt) → one-word reframe → "3 things, last is best" → 1, 2, 3 → objection handled → proof number → callback insult to the old way → CTA with a freebie.

---

## 2. The visual system

### Colors (3 backgrounds, 1 accent)
| Role | Approx. hex | When it's used |
|---|---|---|
| Warm cream bg | `#F2EDE6` with soft blurred peach and lavender blobs | Explaining and showing (around 80% of the video) |
| Signature orange | `#E8561F` | Accent words, the payoff chip, and **full-screen punchlines** |
| Near-black | `#151210` with a soft warm glow | Tension: open loops ("3 big changes", "And three?", "Stone Age") |
| Ink | `#111111` | Main text |

**The trick is that background color tracks emotion.** Cream means "learn." Orange means "this is the point." Dark means "wait for it." Viewers feel the rhythm without noticing it.

### Typography (3 fonts with strict roles)
1. **Headlines:** a bold modern grotesk (Inter Display Bold or Helvetica Now feel), with **one word swapped into an orange italic serif** (*own*, *Spaces*, *babysitting*, *best*, *sandbox*, *Stone*). That one serif word is the brand's signature.
   - Free match: **Inter Tight Bold** + **Instrument Serif Italic**
2. **Section headers:** tall condensed all-caps, two-tone (`THE` in black, `PROBLEM` in orange; `1 · THROWAWAY` / `COMPUTERS`).
   - Free match: **Bebas Neue** or **Anton**
3. **Captions:** bold grotesk inside a pill (see below).

### The caption pill (the most recognizable element)
- White rounded rectangle, ~12px radius, 1.5px dark border, soft shadow
- Sits at **~70% of the screen height**, always in the same spot
- **2–4 words per chunk.** The chunk changes with the phrase, not the sentence
- **Karaoke reveal:** words that haven't been said yet are **light grey**, spoken words turn **black**, and the key word of each chunk is **orange**
- Example: `Hermes works on` (grey "works on") → `Hermes works on` (all black, "on" orange)

### Chips (context tags)
- Small white pills with a thin outline icon (Lucide-style) and 13–15px text: "Your files", "Your laptop", "See its screen", "Spare Mac mini"
- They **stack in one by one** under the illustration as each noun is said
- The **last chip is orange-filled.** It's the payoff or answer: "Yes. Yes. Yes.", "Deleted when done", "Grab the mouse", "Not on your machine", "Your agent's new desk"

### Illustrations
- **Soft 3D clay renders** in the same palette (cream, charcoal, orange): a laptop overflowing with folders, a hand on a big red button, a computer in a recycle bin, a girl and a robot at a desk, a Mac mini in a drawer, a laptop in a sandbox
- Each one sits on a **light card with a soft shadow** (it looks like a photo print) in the middle third of the screen
- One image per idea, and it **stays still** while the captions and chips move. That keeps it calm and readable
- These look AI-generated with one consistent style prompt (see section 5)

### Stickers and stamps (2–3 per video, no more)
- "FREE PLUGIN": red outline stamp, rotated about −8°, slams in over the content
- "30.7K ⭐": white sticker with an orange border and a star, slapped onto the screenshot
- "🔗 LINK / IN MY BIO": two stacked tilted blocks, black then orange
- These are the only "loud" moments. Everything else is clean

### Screenshots
- Real proof (GitHub repo) inside a **dark rounded window frame** with traffic-light dots
- A small black pill label above it: "It's called", "On GitHub"

---

## 3. The motion language

| Motion | How to build it |
|---|---|
| **Scene change** | Blur dissolve. The old scene blurs to ~20px and fades while the new one fades in from blur. ~300ms. No slides, no whooshes |
| **Element entrance** | Scale 0.85→1 + fade, with **slight overshoot** (spring: stiffness ~200, damping ~15). ~250ms |
| **Chips** | Same entrance, staggered with the voice, then a small nudge as later chips push them sideways |
| **Caption words** | Color change only (grey → black/orange). The pill resizes smoothly to fit the text |
| **Stamps / stickers** | Scale 1.4→1 in ~120ms with hard ease-out and a slight rotation. Add a "thud" sound |
| **Background flips** | Cream → orange → dark, cross-blurred, always on a punchline word |
| **Typing CTA** | Search bar types "Tap my profile" letter by letter with a blinking orange cursor |
| **Camera** | Basically none. The layout is locked. Stability is the point |

**Pacing:** a new visual event every **0.4–0.8s** (a caption word, chip, or stamp), but a **new scene only every 3–5s**. Lots of small motion on a stable layout keeps people watching without wearing them out.

---

## 4. The fixed layout grid (1080×1920)

```
┌──────────────────────┐
│     (top 8% empty)   │  ← clear of the platform's top UI
│   HEADLINE / SECTION │  ~12–22%
│                      │
│   ┌──────────────┐   │
│   │ 3D IMAGE     │   │  ~22–55%  (card with shadow)
│   └──────────────┘   │
│  [chip] [chip]       │  ~57–62%
│     [orange chip]    │  ~63%
│   ┃ caption pill ┃   │  ~70%
│                      │
│   (bottom 20% empty) │  ← clear of username, caption, buttons
└──────────────────────┘
```
Full-screen punchlines (orange or dark) drop the image and put the headline at ~35%, keeping the caption pill in the same place.

---

## 5. How to make this yourself (production pipeline)

1. **Script** in the 11-beat formula above. Mark one **italic serif word** per headline and one **orange word** per caption chunk
2. **Voiceover:** clear, fast, and punchy (~170 words per minute). Your own voice or an AI voice
3. **Timestamps:** run the VO through a word-level transcriber (CapCut auto-captions, Whisper, or ElevenLabs) to get the time of every word. This drives the karaoke captions and chip timing
4. **Illustrations:** generate one per beat with a locked style prompt, for example:
   > *"Soft 3D clay render, isometric, [SUBJECT], matte cream and charcoal materials with burnt-orange (#E8561F) accents, soft studio lighting, plain warm off-white background, minimal, cute, high detail, no text"*
5. **Assemble in one of these:**
   - **CapCut:** fastest. Build one template project with the caption pill, chips, and backgrounds, then duplicate it per video
   - **After Effects:** most control. Build Essential Graphics templates
   - **Remotion (code):** best for 2 posts a day. Every video is generated from a script plus timestamps plus images. **I can build this for you**
6. **Sound:** a low lo-fi or minimal beat at ~−20dB, a soft "tick" on each chip, a "thud" on stamps, and a "whoosh-blur" on background flips

---

## 6. Why it works

- **Readable with the sound off.** The caption pill tells the whole story
- **One idea per screen.** The image never competes with the text
- **Color = emotion.** Cream, orange, and dark set the rhythm without the viewer noticing
- **Open loop at ~45%.** "The last one's the best" keeps viewers watching through the second half
- **Proof before the ask.** The 30.7K stars come right before the CTA
- **Callback ending.** "Still clicking yes?" pays off the opening problem, so the ending feels complete

**What to avoid when copying it:** the formula only works with a real, specific "news" item and real proof. A generic topic in this style just looks pretty. Keep the stamps to 2–3 per video or they lose their punch.

---

## 7. Your script #01 rebuilt in this style

**"I audited this store in 60 seconds"**

| Beat | Background | Headline | Image | Chips | Caption chunks (orange word **bold**) |
|---|---|---|---|---|---|
| Hook | Cream | This store has *traffic* | Store homepage in a window | — | This store **gets** / traffic but **no sales.** |
| Reward | Cream | + stamp "60 SECONDS" | same | — | Here's **why** / in 60 **seconds.** |
| Problem | Cream | THE **PROBLEM** | Clay shopping cart full of holes, leaking coins | "Traffic ✓" → "Sales ✗" (orange) | Visitors come **in…** / and **leave.** |
| Reframe | **Orange** | That's a *leaky bucket.* | — | — | That's a **leaky** / **bucket.** |
| Loop | **Dark** | 3 LEAKS. The last one's the *worst.* | — | — | Three **leaks.** / The last one's **the worst.** |
| 1 | Cream | 1 · **VAGUE HEADLINE** | Clay megaphone with "???" | "Elevate your lifestyle" → "Says nothing" (orange) | I can't tell / **what** they sell. |
| 2 | Cream | 2 · **HIDDEN SHIPPING** | Clay receipt with a surprise fee | "Shown at checkout" → "Cart abandoned" (orange) | Shipping shows up / at **checkout.** |
| Loop 2 | **Dark** | And *three?* | — | — | And **three?** |
| 3 | Cream | 3 · **SLOW MOBILE** | Clay phone with a snail | "6s load" → "Half leave" (orange) | Six seconds / on **mobile.** |
| Proof | Cream | The *fix* | PageSpeed score animating 31 → 89 | sticker "31 → 89 ⚡" | Fix all **three** / before more **ads.** |
| Callback | **Orange** → **Dark** | Still buying *ads?* → That's *burning* money. | — | — | Still buying **ads?** / That's **burning** money. |
| CTA | Cream | "🔍 FREE / STORE AUDIT" sticker | Search bar types "Comment AUDIT" | "Free · 24h turnaround" | Want **yours?** / Comment **AUDIT.** |
