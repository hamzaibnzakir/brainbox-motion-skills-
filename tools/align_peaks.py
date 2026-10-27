"""Syllable-peak aligner: the most reliable aligner for this voice clone.
Counts syllable nuclei (energy peaks) in the audio, maps the script's cumulative syllable count onto them,
then snaps each line start to the nearest breath. Prints each line with its start time and the nearest pause.
usage: python3 tools/align_peaks.py scripts/<id>.json voice/<id>/voice.wav voice/<id>/words.json"""
import json, re, subprocess, sys, os
import numpy as np
TAG = re.compile(r"^\[[a-z]+(?:-[a-z]+)*\]$", re.I)
def syl(w):
    w2 = re.sub(r"[^a-z0-9]", "", w.lower())
    if re.fullmatch(r"\d+", w2): return {1: 1, 2: 2, 3: 3}.get(len(w2), 4)
    w2 = re.sub(r"(?<=[^aeiouy])e$", "", w2)
    return max(1, len(re.findall(r"[aeiouy]+", w2)))
script = json.load(open(sys.argv[1])); wav = sys.argv[2]
toks, line_start = [], []
for b in script['beats']:
    tk = [t.replace('*', '') for t in b['say'].split() if t.replace('*', '')]
    for k, t in enumerate(tk): toks.append(t); line_start.append(k == 0)
W = [({'laughter': 3.0, 'sigh': 1.0}.get(t.strip('[]').split('-')[0], 1.5) if TAG.match(t) else syl(t)) for t in toks]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ac', '1', '-ar', '16000', '-af', 'highpass=f=200,lowpass=f=3000', '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32); hop = 160; n = len(x) // hop
e = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)); k = np.hanning(9); k /= k.sum()
es = np.convolve(e, k, 'same'); db = 20 * np.log10(es + 1e-6); thr = np.percentile(db[db > -60], 40)
P = [i / 100 for i in range(5, n - 13) if es[i] == es[i - 4:i + 5].max() and db[i] > thr
     and db[i] - db[max(0, i - 12):i].min() > 2.5 and db[i] - db[i + 1:i + 13].min() > 2.5]
def pauses(dbv, d):
    o = subprocess.run(['ffmpeg', '-i', wav, '-af', f'silencedetect=noise={dbv}dB:d={d}', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return list(zip([float(v) for v in re.findall(r'silence_start: ([\d.]+)', o)], [float(v) for v in re.findall(r'silence_end: ([\d.]+)', o)]))
breaths = pauses(-32, 0.07); strong = pauses(-38, 0.25)
scale = len(P) / sum(W)
cw = np.concatenate([[0], np.cumsum(W)]) * scale
def tat(c):  # time at cumulative peak position c (between peaks, linear)
    if c <= 0: return max(0.0, P[0] - 0.12)
    if c >= len(P): return P[-1] + 0.2
    i = int(np.floor(c)); f = c - i
    a = P[i - 1] if i > 0 else P[0] - 0.12; b = P[i]
    return a + (b - a) * f
est = [tat(c) for c in cw]  # global estimate of each token boundary
# 1) lock strong pauses to the nearest line start (or sentence start) -> anchors (token index, time)
sent_start = [i for i in range(1, len(toks)) if line_start[i] or re.search(r'[.?!:]$', toks[i - 1]) or TAG.match(toks[i - 1])]
anchors = {0: max(0.0, P[0] - 0.12)}
for ps, pe in strong:
    if pe < P[0] or ps > P[-1]: continue
    best = None
    for i in sent_start:
        d = abs(est[i] - (ps + pe) / 2) - (0.5 if line_start[i] else 0)
        lim = 1.3 if line_start[i] else 0.7
        if abs(est[i] - (ps + pe) / 2) < lim and (best is None or d < best[0]): best = (d, i)
    if best and best[1] not in anchors and all((j < best[1]) == (t < pe) for j, t in anchors.items()):
        anchors[best[1]] = pe
anchors[len(toks)] = P[-1] + 0.2
# 2) inside each anchored segment, spread tokens over that segment's own peaks
starts = [0.0] * len(toks); ends = [0.0] * len(toks)
keys = sorted(anchors)
for k0, k1 in zip(keys, keys[1:]):
    t0, t1 = anchors[k0], anchors[k1]
    pk = [p for p in P if t0 - 0.05 <= p < t1 - 0.05] or [t0, t1]
    w = np.concatenate([[0], np.cumsum(W[k0:k1])]); sc = len(pk) / w[-1]
    def ts(c):
        c = c * sc
        if c <= 0: return t0
        if c >= len(pk): return min(t1 - 0.05, pk[-1] + 0.2)
        i = int(c); f = c - i; a_ = pk[i - 1] if i > 0 else t0; return a_ + (pk[i] - a_) * f
    for j in range(k0, k1):
        starts[j] = t0 if j == k0 else ts(w[j - k0] - 0.45); ends[j] = ts(w[j - k0 + 1] - 0.45)
# 3) snap un-anchored line starts to the nearest breath, keeping order
for i in range(1, len(toks)):
    if not line_start[i] or i in anchors: continue
    lo = starts[i - 1] + 0.15; nxt = starts[i + 1] if i + 1 < len(toks) else ends[i]
    cands = [pe for ps, pe in breaths if abs(pe - starts[i]) < 0.7 and lo < pe < nxt - 0.08]
    if cands:
        pe = min(cands, key=lambda c: abs(c - starts[i])); ps = next(a for a, b in breaths if b == pe)
        starts[i] = pe
        prev = max(kk for kk in range(i) if line_start[kk]); a0 = starts[prev]; old = ends[i - 1] - a0
        if old > 0:
            for kk in range(prev + 1, i): starts[kk] = a0 + (starts[kk] - a0) * (ps - a0) / old
            for kk in range(prev, i): ends[kk] = a0 + (ends[kk] - a0) * (ps - a0) / old
print('anchored lines/sentences:', ', '.join(f'"{toks[i]}"@{t:.2f}' for i, t in sorted(anchors.items()) if 0 < i < len(toks)))
for i in range(len(toks) - 1): ends[i] = min(ends[i], starts[i + 1] - 0.01)
words = [{'text': t, 'start': round(starts[i], 3), 'end': round(max(starts[i] + 0.06, ends[i]), 3)} for i, t in enumerate(toks) if not TAG.match(t)]
print(f'peaks {len(P)} / script syllables {sum(W):.0f} (scale {scale:.2f})')
for i, t in enumerate(toks):
    if line_start[i]:
        line = ' '.join(toks[i:next((kk for kk in range(i + 1, len(toks)) if line_start[kk]), len(toks))])
        sp = min(strong, key=lambda p: abs(p[1] - starts[i]), default=(0, 0))
        print(f'{starts[i]:6.2f}  {line[:70]}{"…" if len(line) > 70 else ""}   (nearest pause end {sp[1]:.2f})')
json.dump({'audio': os.path.basename(wav), 'words': words, 'provider': 'peaks'}, open(sys.argv[3], 'w'), indent=1)
