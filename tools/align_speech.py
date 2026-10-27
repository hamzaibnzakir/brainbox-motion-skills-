"""Aligner for smooth, pause-free deliveries (where align.py struggles).
Spreads the script's syllables over the time that actually contains speech, then snaps
every line start to the nearest breath (micro-pause) so scene changes land cleanly.
usage: python3 tools/align_speech.py scripts/<id>.json voice/<id>/voice.wav voice/<id>/words.json"""
import json, re, subprocess, sys, os
import numpy as np
TAG = re.compile(r"^\[[a-z]+(?:-[a-z]+)*\]$", re.I)
TAG_W = {'laughter': 4.0, 'sigh': 2.5}
def syl(w):
    w2 = re.sub(r'[^a-z0-9]', '', w.lower())
    if re.fullmatch(r'\d+', w2): return 2 * len(w2)
    return max(1, len(re.findall(r"[aeiouy]+", re.sub(r"e$", "", w2))))
script = json.load(open(sys.argv[1])); wav = sys.argv[2]
toks, line_start = [], []
for b in script['beats']:
    tk = [t.replace('*', '') for t in b['say'].split() if t.replace('*', '')]
    for k, t in enumerate(tk): toks.append(t); line_start.append(k == 0)
W = []
for t in toks:
    if TAG.match(t): W.append(TAG_W.get(t.strip('[]').split('-')[0], 1.6))
    else: W.append(syl(t) + 0.5 + (0.9 if re.search(r'[.?!:]$', t) else 0.45 if t.endswith(',') else 0))
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32); hop = 160; n = len(x) // hop
e = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)); db = 20 * np.log10(e + 1e-6)
thr = max(np.percentile(db, 25) + 6, np.percentile(db[db > -70], 50) - 22)
speech = np.convolve((db > thr).astype(float), np.ones(5) / 5, 'same') > 0.4
cum = np.concatenate([[0], np.cumsum(speech)]) / 100.0  # speech seconds up to frame i
total = cum[-1]
def at_speech(sp):  # real time where cumulative speech == sp
    i = int(np.searchsorted(cum, sp)); return min(i, n) / 100.0
cw = np.concatenate([[0], np.cumsum(W)])
def spread(i0, i1, t0, t1):
    """distribute tokens i0..i1-1 over real time t0..t1 by speech time"""
    s0, s1 = cum[int(t0 * 100)], cum[min(n, int(t1 * 100))]
    tot = cw[i1] - cw[i0]
    for i in range(i0, i1):
        a = s0 + (cw[i] - cw[i0]) / tot * (s1 - s0); b = s0 + (cw[i + 1] - cw[i0]) / tot * (s1 - s0)
        starts[i] = max(t0, at_speech(a + 0.001)); ends[i] = min(t1, at_speech(b))
starts = [0.0] * len(toks); ends = [0.0] * len(toks)
# 1) strong pauses become hard anchors at sentence/line ends
def pauses(dbv, d):
    o = subprocess.run(['ffmpeg', '-i', wav, '-af', f'silencedetect=noise={dbv}dB:d={d}', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return list(zip([float(v) for v in re.findall(r'silence_start: ([\d.]+)', o)], [float(v) for v in re.findall(r'silence_end: ([\d.]+)', o)]))
first_speech = np.argmax(speech) / 100.0; last_speech = (n - np.argmax(speech[::-1])) / 100.0
strong = [p for p in pauses(-38, 0.25) if p[0] > first_speech + 0.2 and p[1] < last_speech - 0.2]
B = [i for i, t in enumerate(toks) if re.search(r'[.?!:]$', t) or TAG.match(t) or (i + 1 < len(toks) and line_start[i + 1])]
spread(0, len(toks), first_speech, last_speech)  # global estimate
anchors, lo = [], -1
for ps, pe in strong:
    cand = [j for j in B if j > lo and j < len(toks) - 1]
    if not cand: break
    j = min(cand, key=lambda j: abs(ends[j] - ps))
    if abs(ends[j] - ps) < 2.5: anchors.append((j, ps, pe)); lo = j
segs, i0, t0 = [], 0, first_speech
for j, ps, pe in anchors: segs.append((i0, j + 1, t0, ps)); i0, t0 = j + 1, pe
segs.append((i0, len(toks), t0, last_speech))
for a, b, ta, tb in segs: spread(a, b, ta, tb)
# 2) snap remaining line starts to the nearest breath inside their segment
se = [e for _, e in pauses(-32, 0.07)]
for a, b, ta, tb in segs:
    for i in range(a + 1, b):
        if not line_start[i]: continue
        cand = [x for x in se if abs(x - starts[i]) < 0.35 and ta < x < tb]
        if cand:
            x = min(cand, key=lambda c: abs(c - starts[i]))
            k0 = max([kk for kk in range(a, i) if line_start[kk]] + [a])
            spread(k0, i, starts[k0], x - 0.05); spread(i, b, x, tb)
words = [{'text': t, 'start': round(starts[i], 3), 'end': round(max(starts[i] + 0.05, ends[i] - 0.02), 3)}
         for i, t in enumerate(toks) if not TAG.match(t)]
line = []
for i, t in enumerate(toks):
    if line_start[i] and line: print(f"{line[0][0]:6.2f}  {' '.join(w for _, w in line)}"); line = []
    line.append((starts[i], t))
print(f"{line[0][0]:6.2f}  {' '.join(w for _, w in line)}")
json.dump({'audio': os.path.basename(wav), 'words': words, 'provider': 'speech-aligned'}, open(sys.argv[3], 'w'), indent=1)
