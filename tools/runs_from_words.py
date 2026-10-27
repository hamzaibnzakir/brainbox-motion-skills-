"""Dump words.json back into editable runs.txt lines (one per script line), so a few boundaries can be fixed by hand.
usage: python3 tools/runs_from_words.py scripts/<id>.json voice/<id>/words.json > voice/<id>/runs.txt"""
import json, re, sys
TAG = re.compile(r"^\[[a-z]+(?:-[a-z]+)*\]$", re.I)
sc = json.load(open(sys.argv[1])); w = json.load(open(sys.argv[2]))['words']; k = 0
for b in sc['beats']:
    toks = [t.replace('*', '') for t in b['say'].split() if t.replace('*', '')]
    vis = [t for t in toks if not TAG.match(t)]
    a = w[k]['start']; e = w[k + len(vis) - 1]['end']; k += len(vis)
    print(f"{a:.2f} {e:.2f} {' '.join(toks)}")
