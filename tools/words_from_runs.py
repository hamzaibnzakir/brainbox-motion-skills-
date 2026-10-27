"""Build words.json from hand-checked phrase runs (when align.py misplaces a pause).
runs file: one phrase per line → "start end text", e.g. "3.26 4.18 Here's my exact prompt."
Emotion tags can be their own run ("4.28 4.64 [sigh]") so captions skip them.
usage: python3 tools/words_from_runs.py scripts/<id>.json voice/<id>/runs.txt voice/<id>/words.json"""
import json, re, sys
TAG = re.compile(r"^\[[a-z]+(?:-[a-z]+)*\]$", re.I)
def syl(w):
    w = re.sub(r'[^a-z]', '', w.lower())
    return max(1, len(re.findall(r"[aeiouy]+", re.sub(r"e$", "", w))))
words = []
for line in open(sys.argv[2]):
    line = line.strip()
    if not line or line.startswith('#'): continue
    a, b, text = line.split(' ', 2); a, b = float(a), float(b)
    ws = text.split()
    W = [1.2 if TAG.match(w) else syl(w) + 0.6 + (0.8 if re.search(r'[.?!:]$', w) else 0) for w in ws]
    tot = sum(W); acc = 0
    for w, wt in zip(ws, W):
        s = a + (b - a) * acc / tot; acc += wt; e = a + (b - a) * acc / tot
        if not TAG.match(w): words.append({'text': w, 'start': round(s, 3), 'end': round(e - 0.02, 3)})
sc = json.load(open(sys.argv[1]))
exp = [t.replace('*', '') for bt in sc['beats'] for t in bt['say'].split() if not TAG.match(t)]
ok = len(words) == len(exp) and all(x['text'] == y for x, y in zip(words, exp))
if not ok:
    for i, (x, y) in enumerate(zip(words, exp)):
        if x['text'] != y: print(f'mismatch at word {i}: runs "{x["text"]}" vs script "{y}"'); break
    print(f'{len(words)} words in runs vs {len(exp)} in script'); sys.exit(1)
json.dump({'audio': 'voice.wav', 'words': words, 'provider': 'runs'}, open(sys.argv[3], 'w'), indent=1)
print(f'ok: {len(words)} words → {sys.argv[3]}')
