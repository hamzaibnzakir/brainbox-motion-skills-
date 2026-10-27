"""Align a known script to one voice file with no speech recognition.
Matches detected pauses to punctuation and line breaks with dynamic programming,
then spreads words inside each speech run by syllable weight.
usage: python3 tools/align.py scripts/<id>.json voice/<id>/voice.wav voice/<id>/words.json
Check the printed phrase list against what you hear; if a pause was misread, edit words.json by hand
(each word has start/end in seconds) or regenerate the audio as one file per line."""
import json, re, subprocess, sys

TAG = re.compile(r"^\[[a-z]+(?:-[a-z]+)*\]$", re.I)
TAG_WEIGHT = {'laughter': 4.0, 'sigh': 2.5}
def tokens(say):
    return [t.replace('*', '') for t in say.split() if t.replace('*', '')]
def is_tag(w): return bool(TAG.match(w))

def syl(w):
    w = w.lower()
    if re.fullmatch(r"\d+", w): return 2 * len(w)
    g = re.findall(r"[aeiouy]+", re.sub(r"e$", "", w))
    return max(1, len(g))

def silences(wav, db=-38, d=0.18):
    out = subprocess.run(['ffmpeg', '-i', wav, '-af', f'silencedetect=noise={db}dB:d={d}', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav],
                               capture_output=True, text=True).stdout)
    return list(zip(st, en[:len(st)])), dur

script = json.load(open(sys.argv[1])); wav = sys.argv[2]
words, line_end = [], []
for b in script['beats']:
    tk = tokens(b['say'])
    for k, t in enumerate(tk):
        words.append(t); line_end.append(k == len(tk) - 1)
W = [TAG_WEIGHT.get(w.strip('[]').split('-')[0], 1.6) if is_tag(w) else syl(w) + 0.6 for w in words]
# break strength after word i
def strength(i):
    if line_end[i]: return 3
    if re.search(r'(\.\.\.|[.?!:])$', words[i]): return 2
    if re.search(r'[,;]$', words[i]): return 1
    return 0
S = [strength(i) for i in range(len(words))]
sil, dur = silences(wav)
sil = [s for s in sil if s[0] > 0.05 and s[1] < dur - 0.05]
# speech runs boundaries: start of audio .. each silence .. end
lead = 0.0
first = subprocess.run(['ffmpeg', '-i', wav, '-af', 'silencedetect=noise=-38dB:d=0.05', '-f', 'null', '-'], capture_output=True, text=True).stderr
m = re.search(r'silence_start: 0(?:\.0+)?\n.*?silence_end: ([\d.]+)', first, re.S)
if m: lead = float(m.group(1))
speech_total = dur - lead - sum(e - s for s, e in sil)
rate = speech_total / sum(W)
N, K = len(words), len(sil)
INF = 1e18
# dp[k][j]: silence k mapped to break after word j
import math
prefix = [0]
for w in W: prefix.append(prefix[-1] + w)
def segcost(i, j, t0, t1):  # words i..j spoken between t0,t1
    exp = (prefix[j + 1] - prefix[i]) * rate; act = t1 - t0
    return (act - exp) ** 2 / max(exp, 0.3)
def skip_pen(i, j):  # strong breaks inside a segment that got no pause
    return sum({3: 0.6, 2: 0.25, 1: 0.0, 0: 0}[S[x]] for x in range(i, j))
def break_pen(j):
    return {3: 0, 2: 0.1, 1: 0.35, 0: 2.5}[S[j]]
dp = [[INF] * N for _ in range(K)]; bp = [[-1] * N for _ in range(K)]
for j in range(N):
    dp[0][j] = segcost(0, j, lead, sil[0][0]) + skip_pen(0, j) + break_pen(j)
for k in range(1, K):
    for j in range(N):
        best, arg = INF, -1
        for i in range(j):
            if dp[k - 1][i] >= INF: continue
            c = dp[k - 1][i] + segcost(i + 1, j, sil[k - 1][1], sil[k][0]) + skip_pen(i + 1, j)
            if c < best: best, arg = c, i
        if arg >= 0: dp[k][j] = best + break_pen(j); bp[k][j] = arg
best, jl = INF, -1
for j in range(N - 1):
    c = dp[K - 1][j] + segcost(j + 1, N - 1, sil[K - 1][1], dur) + skip_pen(j + 1, N - 1)
    if c < best: best, jl = c, j
ends = [0] * K; j = jl
for k in range(K - 1, -1, -1): ends[k] = j; j = bp[k][j]
# build runs
runs = []; prev_w, prev_t = 0, lead
for k in range(K):
    runs.append((prev_w, ends[k], prev_t, sil[k][0])); prev_w, prev_t = ends[k] + 1, sil[k][1]
runs.append((prev_w, N - 1, prev_t, dur))
out = []
for (i, j, t0, t1) in runs:
    tot = prefix[j + 1] - prefix[i]; acc = 0
    for x in range(i, j + 1):
        s = t0 + (t1 - t0) * acc / tot; acc += W[x]; e = t0 + (t1 - t0) * acc / tot
        if not is_tag(words[x]):  # emotion tags take time in the audio but never show as captions
            out.append({'text': words[x], 'start': round(s, 3), 'end': round(e - 0.02, 3)})
    print(f"{t0:6.2f}-{t1:6.2f}  {' '.join(words[i:j+1])}")
import os
json.dump({'audio': os.path.basename(wav), 'words': out, 'provider': 'file-aligned'}, open(sys.argv[3], 'w'), indent=1)
