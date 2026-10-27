"""Measure how far captions are from the voice. Cross-correlates the syllable rhythm implied by words.json
with the syllable peaks detected in the audio, per 10-second window.
Positive lag = captions are LATE (voice ahead). usage: python3 tools/check_sync.py <id>"""
import json, re, subprocess, sys
import numpy as np
vid = sys.argv[1]; d = f'voice/{vid}'
W = json.load(open(f'{d}/words.json'))['words']
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{d}/voice.wav', '-ac', '1', '-ar', '16000', '-af', 'highpass=f=200,lowpass=f=3000', '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32); hop = 160; n = len(x) // hop
e = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)); k = np.hanning(9); k /= k.sum()
env = np.convolve(e, k, 'same'); env = env / (env.max() + 1e-9)
def syl(w):
    w2 = re.sub(r"[^a-z0-9]", "", w.lower()); w2 = re.sub(r"(?<=[^aeiouy])e$", "", w2)
    return max(1, len(re.findall(r"[aeiouy]+", w2)))
pred = np.zeros(n)
for w in W:
    s, e_ = w['start'], w['end']; m = syl(w['text'])
    for j in range(m):
        t = s + (e_ - s) * (j + 0.5) / m; i = int(t * 100)
        if 0 <= i < n: pred[max(0, i - 4):i + 5] += np.hanning(9)[:len(pred[max(0, i - 4):i + 5])]
win = 1000
for a in range(0, n, win):
    b = min(n, a + win); best = (-1e9, 0)
    for lag in range(-60, 61):  # ±0.6 s
        a2, b2 = a + lag, b + lag
        if a2 < 0 or b2 > n: continue
        c = float(np.dot(pred[a:b], env[a2:b2]))
        if c > best[0]: best = (c, lag)
    # lag>0: audio energy matching our caption at t happens at t+lag → captions EARLY; flip sign so + = captions late
    print(f'{a/100:5.0f}-{b/100:3.0f}s  captions {"late" if best[1] < 0 else "early"} by {abs(best[1])*10:3d} ms')
