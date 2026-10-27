"""Nudge caption timings onto the actual voice. For each sentence it slides the words up to ±0.5 s to best
match the audio's syllable rhythm, then keeps everything in order. Run after any aligner, before rendering.
usage: python3 tools/refine_sync.py <id>     (rewrites voice/<id>/words.json, keeps a .bak copy)"""
import json, re, subprocess, sys, shutil
import numpy as np
vid = sys.argv[1]; d = f'voice/{vid}'; path = f'{d}/words.json'
J = json.load(open(path)); W = J['words']
shutil.copy(path, path + '.bak')
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{d}/voice.wav', '-ac', '1', '-ar', '16000', '-af', 'highpass=f=200,lowpass=f=3000', '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32); hop = 160; n = len(x) // hop
e = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)); k = np.hanning(9); k /= k.sum()
env = np.convolve(e, k, 'same'); env = env / (env.max() + 1e-9); env = env - np.convolve(env, np.ones(51) / 51, 'same')  # keep the rhythm
def syl(w):
    w2 = re.sub(r"[^a-z0-9]", "", w.lower()); w2 = re.sub(r"(?<=[^aeiouy])e$", "", w2)
    return max(1, len(re.findall(r"[aeiouy]+", w2)))
def train(ws):
    p = np.zeros(n)
    for w in ws:
        m = syl(w['text'])
        for j in range(m):
            i = int((w['start'] + (w['end'] - w['start']) * (j + 0.5) / m) * 100)
            if 4 <= i < n - 5: p[i - 4:i + 5] += np.hanning(9)
    return p
# sentence groups
groups, cur = [], []
for i, w in enumerate(W):
    cur.append(i)
    if re.search(r'[.?!:]$', w['text']) or len(cur) >= 10: groups.append(cur); cur = []
if cur: groups.append(cur)
for _ in range(2):
    for gi, g in enumerate(groups):
        ws = [W[i] for i in g]; p = train(ws); nz = np.nonzero(p)[0]
        if len(nz) == 0: continue
        a, b = max(0, nz[0] - 10), min(n, nz[-1] + 10)
        base = float(np.dot(p[a:b], env[a:b])); best = (base, 0)
        for lag in range(-50, 51):
            if a + lag < 0 or b + lag > n: continue
            c = float(np.dot(p[a:b], env[a + lag:b + lag]))
            if c > best[0]: best = (c, lag)
        if best[1] and best[0] > base * 1.08:
            sh = best[1] / 100
            lo = W[groups[gi - 1][-1]]['end'] + 0.02 if gi > 0 else 0
            hi = W[groups[gi + 1][0]]['start'] - 0.02 - (ws[-1]['end'] - ws[0]['start']) if gi + 1 < len(groups) else 1e9
            sh = max(lo - ws[0]['start'], min(hi - ws[0]['start'], sh)) if lo <= hi else 0
            for w in ws: w['start'] = round(w['start'] + sh, 3); w['end'] = round(w['end'] + sh, 3)
json.dump(J, open(path, 'w'), indent=1)
print(f'refined {len(groups)} sentence groups → {path}')
