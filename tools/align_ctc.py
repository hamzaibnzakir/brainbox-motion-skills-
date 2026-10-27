"""Forced alignment (the accurate one). A wav2vec2 speech model listens to the voice and pins every word of
the known script to the exact moment it is spoken (CTC Viterbi alignment). ~20 ms precision.
First run downloads the model (~95 MB) from Hugging Face into ~/.cache/brainbox-align/.
Needs: pip install onnxruntime numpy  (+ ffmpeg)
usage: python3 tools/align_ctc.py scripts/<id>.json voice/<id>/voice.wav voice/<id>/words.json"""
import json, os, re, subprocess, sys, urllib.request
import numpy as np
import onnxruntime as ort
REPO = 'https://huggingface.co/Xenova/wav2vec2-base-960h/resolve/main/'
CACHE = os.path.expanduser('~/.cache/brainbox-align'); os.makedirs(CACHE, exist_ok=True)
for f, remote in [('vocab.json', 'vocab.json'), ('model_quantized.onnx', 'onnx/model_quantized.onnx')]:
    p = os.path.join(CACHE, f)
    if not os.path.exists(p): print('downloading', f, '…'); urllib.request.urlretrieve(REPO + remote, p)
vocab = json.load(open(os.path.join(CACHE, 'vocab.json')))
TAG = re.compile(r"^\[[a-z]+(?:-[a-z]+)*\]$", re.I)
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()
def num(nm):
    nm = int(nm)
    if nm < 20: return ONES[nm]
    if nm < 100: return TENS[nm // 10] + ('' if nm % 10 == 0 else ' ' + ONES[nm % 10])
    if nm < 1000: return ONES[nm // 100] + ' hundred' + ('' if nm % 100 == 0 else ' ' + num(nm % 100))
    return ' '.join(ONES[int(c)] for c in str(nm))
def spoken(tok):
    t = tok.replace('*', '').replace('%', ' percent').replace('&', ' and ').replace('+', ' plus ').replace('/', ' ')
    t = re.sub(r'\$(\d+)', lambda m: num(m.group(1)) + ' dollars', t)
    t = re.sub(r'(\d+)', lambda m: ' ' + num(m.group(1)) + ' ', t)
    t = re.sub(r"[^A-Za-z' ]", ' ', t.replace('-', ' ')).upper()
    return [w for w in t.split() if w.strip("'")]
script = json.load(open(sys.argv[1])); wav = sys.argv[2]
caps = []  # caption tokens (non-tag) with their spoken words
for b in script['beats']:
    for t in b['say'].split():
        if TAG.match(t.replace('*', '')) or not t.replace('*', ''): continue
        caps.append((t.replace('*', ''), spoken(t)))
# audio → logits
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).copy()
sess = ort.InferenceSession(os.path.join(CACHE, 'model_quantized.onnx'))
def logits(seg):
    seg = (seg - seg.mean()) / (seg.std() + 1e-7)
    return sess.run(None, {'input_values': seg[None, :].astype(np.float32)})[0][0]
# wav2vec2 emits one frame per 320 samples (20 ms). Process in chunks with context, keep each chunk's centre.
HOP = 320; CH = 16000 * 30; CTX = 16000 * 3
outs = []; s0 = 0
while s0 < len(x):
    c0 = max(0, s0 - CTX); c1 = min(len(x), s0 + CH + CTX)
    L = logits(x[c0:c1])
    a = (s0 - c0) // HOP; b = a + (min(s0 + CH, len(x)) - s0) // HOP
    outs.append(L[a:min(b, len(L))]); s0 += CH
lg = np.concatenate(outs); lg = lg - lg.max(1, keepdims=True); lp = lg - np.log(np.exp(lg).sum(1, keepdims=True))
T = len(lp); sec = HOP / 16000
# token sequence with word separators
seq, owner = [], []
for ci, (_, ws) in enumerate(caps):
    for w in ws:
        if seq: seq.append(vocab['|']); owner.append(-1)
        for ch in w:
            seq.append(vocab.get(ch, vocab['<unk>'])); owner.append(ci)
blank = vocab['<pad>']; S = len(seq)
if S > T: sys.exit(f'audio too short for script ({S} tokens > {T} frames)')
# trellis (torchaudio-style forced alignment)
tr = np.full((T + 1, S + 1), -np.inf); tr[0, 0] = 0
tr[1:, 0] = np.cumsum(lp[:, blank])
seqa = np.array(seq)
for t in range(T):
    stay = tr[t, 1:] + lp[t, blank]; move = tr[t, :-1] + lp[t, seqa]
    tr[t + 1, 1:] = np.maximum(stay, move)
# backtrack
t, j = T, S; frames = [None] * S
while j > 0 and t > 0:
    stay = tr[t - 1, j] + lp[t - 1, blank]; move = tr[t - 1, j - 1] + lp[t - 1, seq[j - 1]]
    if move > stay: frames[j - 1] = t - 1; j -= 1
    t -= 1
words = []
for ci, (txt, _) in enumerate(caps):
    fr = [frames[k] for k in range(S) if owner[k] == ci and frames[k] is not None]
    if not fr: fr = [words[-1]['_e'] if words else 0]
    words.append({'text': txt, 'start': round(min(fr) * sec, 3), 'end': round((max(fr) + 1) * sec, 3), '_e': max(fr)})
for w in words: w.pop('_e')
# safety: speech can't start or end inside a real silence → snap to its edges
o = subprocess.run(['ffmpeg', '-i', wav, '-af', 'silencedetect=noise=-38dB:d=0.2', '-f', 'null', '-'], capture_output=True, text=True).stderr
sil = list(zip([float(v) for v in re.findall(r'silence_start: ([\d.]+)', o)], [float(v) for v in re.findall(r'silence_end: ([\d.]+)', o)]))
for i, w in enumerate(words):
    for a_, b_ in sil:
        if a_ + 0.03 < w['start'] < b_ - 0.03:
            nxt = words[i + 1]['start'] if i + 1 < len(words) else 1e9
            if b_ < min(w['end'], nxt) + 0.4: w['start'] = round(b_, 3); w['end'] = round(max(w['end'], b_ + 0.12), 3)
        if a_ + 0.03 < w['end'] < b_ - 0.03 and w['start'] < a_: w['end'] = round(a_, 3)
for i in range(1, len(words)):
    if words[i]['start'] < words[i - 1]['start'] + 0.04: words[i]['start'] = round(words[i - 1]['start'] + 0.04, 3)
json.dump({'audio': os.path.basename(wav), 'words': words, 'provider': 'ctc-forced'}, open(sys.argv[3], 'w'), indent=1)
k = 0
for b in script['beats']:
    nvis = len([t for t in b['say'].split() if not TAG.match(t.replace('*', '')) and t.replace('*', '')])
    print(f"{words[k]['start']:6.2f}-{words[k + nvis - 1]['end']:6.2f}  {' '.join(w['text'] for w in words[k:k + nvis])[:80]}"); k += nvis
