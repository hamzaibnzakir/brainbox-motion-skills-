"""Free transcription with word timestamps (what the speech model actually hears). Use it to verify timings.
usage: python3 tools/transcribe.py voice/<id>/voice.wav [from_s] [to_s]"""
import json, os, subprocess, sys
import numpy as np, onnxruntime as ort
C = os.path.expanduser('~/.cache/brainbox-align'); vocab = json.load(open(C + '/vocab.json')); inv = {v: k for k, v in vocab.items()}
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[1], '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).copy(); s = ort.InferenceSession(C + '/model_quantized.onnx')
L = s.run(None, {'input_values': ((x - x.mean()) / (x.std() + 1e-7))[None, :]})[0][0]
a, b = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (0, 1e9)
ids = L.argmax(1); cur, st, prev = '', None, -1
for t, i in enumerate(ids):
    if i != prev and i != 0:
        ch = inv[i]
        if ch == '|':
            if cur and a <= st * 0.02 <= b: print(f'{st*0.02:6.2f} {cur}')
            cur = ''
        else:
            if not cur: st = t
            cur += ch
    prev = i
