"""BRAINBOX AUDIO v3 — original music bed + designed SFX + voice-first mix, all generated per video.

usage: python3 tools/audio3.py <id>        (reads out/<id>/data.js + voice, writes out/<id>/mix.wav)
       python3 tools/audio3.py --sfx       (regenerates the SFX library into assets/sfx3/)

Music: ~100 BPM minimal electronic/editorial bed in A minor (Am–Fmaj7–C–G). Pad + sub pulse + soft kick/hats +
plucked arp, with a real arrangement driven by the video's timeline:
  intro (pad + sub) → main (drums in) → punch lines drop to pad only → riser + impact into the first dark/AI scene
  → fuller section → CTA lift → tail.
SFX fire only on real visual events (scene change, card, list item, typing, reply, metric, CTA).
Mix: voice EQ + compression, music sidechain-ducked under the voice, two-pass loudnorm to -13 LUFS, -1 dBTP.
"""
import json, os, re, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_DIR = os.path.join(ROOT, 'assets', 'sfx3')
rng = np.random.default_rng(7)

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def env_exp(n, rate): return np.exp(-np.arange(n) / SR * rate)
def fade(x, a=0.005, r=0.02):
    x = x.copy(); na, nr = int(a * SR), int(r * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nr: x[-nr:] *= np.linspace(1, 0, nr)
    return x
def norm(x, peak=0.5): m = np.abs(x).max(); return x * (peak / m) if m > 0 else x
def stereo(m, pan=0.0, width=0.0):
    l = m * np.sqrt(0.5 * (1 - pan)); r = m * np.sqrt(0.5 * (1 + pan))
    if width:
        d = int(width * SR); r = np.concatenate([np.zeros(d), r[:-d]]) if d else r
    return np.stack([l, r], 1)
def write_wav(path, st):
    st = np.clip(st, -1, 1).astype(np.float32)
    if st.ndim == 1: st = np.stack([st, st], 1)
    p = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', path],
                       input=st.tobytes())
    if p.returncode: raise SystemExit('ffmpeg write failed')
def reverb_ir(sec=1.8, decay=0.5):
    n = int(sec * SR); t = np.arange(n) / SR
    irl = rng.standard_normal(n) * np.exp(-t / decay); irr = rng.standard_normal(n) * np.exp(-t / decay)
    irl, irr = lp(irl, 6000), lp(irr, 6000); irl[:int(0.01 * SR)] = 0; irr[:int(0.012 * SR)] = 0
    return irl / np.abs(irl).sum() * 8, irr / np.abs(irr).sum() * 8
IRL, IRR = reverb_ir()
def verb(st, wet=0.25):
    l = fftconvolve(st[:, 0], IRL)[:len(st)]; r = fftconvolve(st[:, 1], IRR)[:len(st)]
    return st * (1 - wet) + np.stack([l, r], 1) * wet

# ---------------------------------------------------------------- SFX library
def make_sfx():
    os.makedirs(SFX_DIR, exist_ok=True)
    out = {}
    def whoosh(dur, f0, f1, f2, pan0=-0.6, pan1=0.6):
        n = int(dur * SR); t = np.linspace(0, 1, n)
        noise = rng.standard_normal(n)
        # moving band: process in short blocks with an interpolated centre frequency
        y = np.zeros(n); blk = 512
        for i in range(0, n, blk):
            c = np.interp(i / n, [0, .55, 1], [f0, f1, f2]); seg = noise[max(0, i - 2048):i + blk]
            f = bp(seg, max(60, c * 0.55), min(18000, c * 1.6)); y[i:i + blk] = f[-len(noise[i:i + blk]):]
        a = np.sin(np.pi * t) ** 1.6
        m = y * a
        pans = np.interp(t, [0, 1], [pan0, pan1])
        return verb(np.stack([m * np.sqrt(0.5 * (1 - pans)), m * np.sqrt(0.5 * (1 + pans))], 1), 0.2)
    out['whoosh'] = whoosh(0.42, 350, 2400, 700)
    out['whoosh_fast'] = whoosh(0.22, 600, 4000, 1200, 0.5, -0.5)
    def tone(freq, dur, rate, parts=((1, 1),)):
        n = int(dur * SR); t = np.arange(n) / SR
        return sum(a * np.sin(2 * np.pi * freq * k * t) for k, a in parts) * env_exp(n, rate)
    tick = tone(1760, 0.09, 55, ((1, 1), (2, .25))) + hp(rng.standard_normal(int(0.09 * SR)), 5000) * env_exp(int(0.09 * SR), 400) * 0.3
    out['tick'] = verb(stereo(fade(tick, 0.001, 0.01)), 0.15)
    click = hp(rng.standard_normal(int(0.03 * SR)), 2500) * env_exp(int(0.03 * SR), 260) * 0.6 + tone(2600, 0.03, 180) * 0.5
    out['click'] = stereo(fade(click, 0.0005, 0.005))
    for k in range(4):  # keyboard clicks, slight variation
        n = int(0.05 * SR)
        key = bp(rng.standard_normal(n), 1800 + 400 * k, 5200) * env_exp(n, 160) * 0.7 + tone(170 + 25 * k, 0.05, 90) * 0.35
        out[f'type{k}'] = stereo(fade(key, 0.0005, 0.008), pan=rng.uniform(-.3, .3))
    n = int(0.16 * SR); t = np.arange(n) / SR
    f = 420 + 520 * (1 - np.exp(-t * 30)); popw = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 26)
    out['pop'] = verb(stereo(fade(popw, 0.002, 0.02)), 0.18)
    n = int(1.3 * SR); t = np.arange(n) / SR
    f = 32 + 48 * np.exp(-t * 7); boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 3.2)
    body = np.sin(2 * np.pi * 110 * t) * env_exp(n, 14) * 0.35
    crack = lp(rng.standard_normal(n), 3500) * env_exp(n, 35) * 0.35
    out['impact'] = verb(stereo(np.tanh(1.4 * (boom + body + crack)) * 0.8), 0.22)
    n = int(1.8 * SR); t = np.linspace(0, 1, n)
    nz = rng.standard_normal(n); y = np.zeros(n); blk = 1024
    for i in range(0, n, blk):
        c = 400 * (14 ** (i / n)); seg = nz[max(0, i - 2048):i + blk]
        y[i:i + blk] = bp(seg, c * .7, min(18000, c * 1.5))[-len(nz[i:i + blk]):]
    fr = 180 * (4 ** t); saw = 2 * ((np.cumsum(fr) / SR) % 1) - 1
    riser = (y * 0.7 + lp(saw, 2500) * 0.25) * (t ** 2.4)
    out['riser'] = verb(stereo(fade(riser, 0.01, 0.01), width=0.004), 0.3)
    n = int(0.5 * SR); t = np.arange(n) / SR
    fm = 300 * (14 ** (t / 0.5)); sweep = np.sin(2 * np.pi * np.cumsum(fm) / SR + 2.5 * np.sin(2 * np.pi * 37 * t))
    sweep = np.round(sweep * 10) / 10 * np.sin(np.pi * t / 0.5) ** 2
    out['sweep'] = verb(stereo(lp(sweep, 7000) * 0.5, width=0.006), 0.25)
    n = int(0.9 * SR); sh = np.zeros(n)
    for j in range(9):
        s0 = int(rng.uniform(0, 0.35) * SR); fq = rng.uniform(2600, 6200); m_ = n - s0; tt = np.arange(m_) / SR
        sh[s0:] += np.sin(2 * np.pi * fq * tt) * np.exp(-tt * rng.uniform(6, 11)) * rng.uniform(.3, .7)
    out['shimmer'] = verb(stereo(fade(sh * 0.3, 0.002, 0.1), width=0.003), 0.35)
    n = int(2.0 * SR); t = np.arange(n) / SR
    bell = sum(np.sin(2 * np.pi * f_ * t) * np.exp(-t * d) * a for f_, d, a in
               [(880, 2.2, .5), (1108.7, 2.6, .35), (1318.5, 3.0, .3), (1760, 4.0, .15), (2637, 5, .08)])
    sub = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 4) * 0.5
    out['accent'] = verb(stereo(fade(bell * 0.5 + sub, 0.002, 0.2), width=0.004), 0.35)
    n = int(0.3 * SR); pap = np.zeros(n)
    for j in range(6):
        s0 = int(rng.uniform(0, 0.22) * SR); m_ = int(0.04 * SR)
        pap[s0:s0 + m_] += bp(rng.standard_normal(m_), 900, 5000) * np.hanning(m_) * rng.uniform(.4, 1)
    out['paper'] = stereo(fade(pap * 0.6, 0.002, 0.03))
    for k, v in out.items(): write_wav(os.path.join(SFX_DIR, k + '.wav'), norm(v, 0.7))
    print('sfx:', ', '.join(sorted(out)))

def load_sfx():
    if not os.path.exists(os.path.join(SFX_DIR, 'whoosh.wav')): make_sfx()
    lib = {}
    for f in os.listdir(SFX_DIR):
        if f.endswith('.wav'):
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SFX_DIR, f), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
            lib[f[:-4]] = np.frombuffer(raw, np.float32).reshape(-1, 2)
    return lib

# ---------------------------------------------------------------- music
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
CHORDS = [  # (root midi for bass, pad notes, arp notes)
    (45, [57, 60, 64, 67], [69, 72, 76, 72]),   # Am7
    (41, [57, 60, 64, 65], [69, 72, 77, 72]),   # Fmaj7
    (48, [55, 60, 64, 67], [67, 72, 76, 72]),   # C
    (43, [55, 59, 62, 67], [67, 71, 74, 71]),   # G
]
def music(dur, sections, bpm=100):
    """sections: list of (t0, t1, mode) with mode in intro|main|drop|lift|cta"""
    n = int(dur * SR); beat = 60 / bpm; bar = beat * 4; t = np.arange(n) / SR
    def mode_at(tt):
        for a, b, m in sections:
            if a <= tt < b: return m
        return 'main'
    lvl = {'intro': dict(pad=.9, sub=.6, kick=0, hat=.25, arp=0), 'main': dict(pad=.8, sub=.9, kick=.8, hat=.6, arp=.45),
           'drop': dict(pad=1., sub=.5, kick=0, hat=0, arp=0), 'lift': dict(pad=.8, sub=1., kick=1., hat=.9, arp=.7),
           'cta': dict(pad=1., sub=.9, kick=.7, hat=.6, arp=.6), 'tail': dict(pad=.8, sub=.2, kick=0, hat=0, arp=.3)}
    # smooth per-stem gain curves (sampled every 10 ms then interpolated)
    grid = np.arange(0, dur + .01, .01)
    curves = {k: np.array([lvl[mode_at(g)][k] for g in grid]) for k in ['pad', 'sub', 'kick', 'hat', 'arp']}
    for k in curves:
        c = curves[k]; sm = np.convolve(np.pad(c, 15, mode='edge'), np.ones(31) / 31, 'same')[15:-15]
        curves[k] = np.interp(t, grid, sm)
    pad = np.zeros(n); sub = np.zeros(n); kick = np.zeros(n); hat = np.zeros(n); arp = np.zeros(n)
    chord_len = bar * 2; nch = int(np.ceil(dur / chord_len)) + 1
    for ci in range(nch):
        root, pn, an = CHORDS[ci % 4]; s0 = ci * chord_len
        a = int(max(0, s0 - 0.4) * SR); b = min(n, int((s0 + chord_len + 0.8) * SR))
        if a >= n: break
        tt = np.arange(b - a) / SR; seg = np.zeros(b - a)
        for m in pn:
            for det in (-0.07, 0, 0.07):
                f = NOTE(m + det); seg += (2 * ((tt * f + rng.random()) % 1) - 1) * 0.08
        e = np.minimum(1, tt / 0.9) * np.minimum(1, np.maximum(0, (len(tt) / SR - tt) / 0.9))
        pad[a:b] += seg * e
        for k in range(int(chord_len / beat)):  # sub pulse on every beat, pumping
            bs = int((s0 + k * beat) * SR); be = min(n, bs + int(beat * SR))
            if bs >= n: break
            tb = np.arange(be - bs) / SR
            pulse = np.sin(2 * np.pi * NOTE(root - 12) * tb) + 0.35 * np.sin(2 * np.pi * NOTE(root) * tb)
            sub[bs:be] += pulse * (1 - np.exp(-tb * 60)) * (0.35 + 0.65 * np.exp(-tb * 4))
        for k in range(int(chord_len / (beat / 2))):  # 8th-note pluck arp
            bs = int((s0 + k * beat / 2) * SR); m_ = int(0.35 * SR)
            if bs >= n: break
            m_ = min(m_, n - bs); tb = np.arange(m_) / SR; f = NOTE(an[k % 4])
            pl = (np.sin(2 * np.pi * f * tb) + 0.3 * np.sin(2 * np.pi * 2 * f * tb)) * np.exp(-tb * 11) * (0.8 if k % 2 == 0 else 0.55)
            arp[bs:bs + m_] += pl
    pad = lp(pad, 1400); pad = pad + 0.35 * lp(pad, 400)
    sub = np.tanh(sub * 1.6)  # harmonics so it survives phone speakers
    nb = int(dur / beat) + 1
    for k in range(nb):
        bs = int(k * beat * SR)
        if bs >= n: break
        # kick: half-time (beats 1 & 3) in main, every beat in lift — the lift curve decides via gain trick below
        m_ = min(int(0.32 * SR), n - bs); tb = np.arange(m_) / SR
        fk = 45 + 75 * np.exp(-tb * 32); k_ = np.sin(2 * np.pi * np.cumsum(fk) / SR) * np.exp(-tb * 9)
        k_ += hp(rng.standard_normal(m_), 3000) * np.exp(-tb * 220) * 0.12
        if k % 2 == 0 or curves['kick'][bs] > 0.9: kick[bs:bs + m_] += k_
        for h in (0, 0.5):  # hats on 8ths, offbeats louder
            hs = int((k + h) * beat * SR); hm = min(int(0.05 * SR), n - hs)
            if hs >= n or hm <= 0: continue
            th = np.arange(hm) / SR
            hat[hs:hs + hm] += hp(rng.standard_normal(hm), 7500) * np.exp(-th * 70) * (0.9 if h else 0.45)
    arp = lp(arp, 3200)
    stems = {'pad': (pad, 0.55, 0.0, 0.006), 'sub': (sub, 0.42, 0, 0), 'kick': (kick, 0.55, 0, 0),
             'hat': (hat, 0.16, 0.25, 0.002), 'arp': (arp, 0.11, -0.2, 0.012)}
    mix = np.zeros((n, 2))
    for k, (x, g, pan, w) in stems.items():
        st = stereo(x * curves[k] * g, pan, w)
        if k in ('pad', 'arp'): st = verb(st, 0.35)
        mix += st
    # tail fade
    ft = int(min(1.5, dur * .1) * SR); mix[-ft:] *= np.linspace(1, 0, ft)[:, None]
    return np.tanh(mix * 1.2) * 0.8

# ---------------------------------------------------------------- arrangement + events from the timeline
def plan(data):
    beats = data['beats']; dur = data['duration']; secs = []; ev = []
    dark = lambda b: (b.get('bg') == 'void') or ((b.get('visual') or {}).get('type') == 'prompt')
    is_tech = lambda b: (b.get('visual') or {}).get('type') in ('prompt', 'flow', 'checklist', 'compare')
    pivot = next((b['start'] for b in beats[3:] if (b.get('visual') or {}).get('type') == 'prompt'), None) or \
            next((b['start'] for b in beats[3:] if is_tech(b) and b.get('header')), None)
    for i, b in enumerate(beats):
        a, e = b['start'], b['end']
        if i == 0: m = 'intro'
        elif i == len(beats) - 1: m = 'cta'
        elif (b.get('layout') == 'punch'): m = 'drop'
        elif pivot is not None and a >= pivot: m = 'lift'
        else: m = 'main'
        secs.append((a, e, m))
        if i > 0:
            prev = beats[i - 1]
            if pivot is not None and abs(a - pivot) < .01: pass  # riser + impact handle the pivot
            elif dark(b) and not dark(prev): ev.append((a, 'sweep', .5))
            elif b.get('layout') == 'punch' and prev.get('layout') != 'punch': ev.append((a - .05, 'whoosh_fast', .5))
            else: ev.append((a - .08, 'whoosh', .42))
        if b.get('header') and re.match(r'^\d', b['header']): ev.append((a + .02, 'tick', .45))
        if (b.get('header') or '').upper().startswith('BONUS'): ev.append((a, 'shimmer', .5))
        for c in b.get('chips') or []: ev.append((c['t'], 'tick', .4))
        if b.get('stamp'):
            t0 = b['stamp']['t']
            for j in range(min(14, len(b['stamp']['text']))): ev.append((t0 + j * 0.045, f'type{j % 4}', .35))
        v = b.get('visual') or {}
        if v.get('type') == 'prompt':
            L = len(v.get('prompt', '')); t0 = v['t']; k = 0; tt = t0
            while tt < t0 + L / 48 and k < 60:
                ev.append((tt, f'type{k % 4}', .26)); tt += rng.uniform(.06, .11); k += 1
            ev.append((v.get('replyT', t0 + L / 48 + .4), 'shimmer', .45))
        for it in v.get('items') or []: ev.append((it['t'] + .35, 'tick', .38))
        for nd in v.get('nodes') or []: ev.append((nd['t'], 'click', .4))
        for mk in v.get('marks') or []: ev.append((mk['t'], 'pop', .45))
        if v.get('badge') and v.get('badgeT') is not None: ev.append((v['badgeT'], 'pop', .4))
        if v.get('type') == 'compare' and v.get('t') is not None: ev += [(v['t'], 'paper', .45), (v['t'], 'whoosh_fast', .35)]
        if v.get('type') in ('stat',) and v.get('t') is not None: ev.append((v['t'] + 1.0, 'tick', .5))
        if v.get('type') == 'gauge' and v.get('t2') is not None: ev.append((v['t2'] + 1.1, 'shimmer', .4))
        if v.get('type') in ('browser', 'icon', 'checklist', 'flow', 'gauge', 'stat') and i > 0: ev.append((a + .1, 'whoosh_fast', .22))
    if pivot is not None and pivot > 3:
        ev += [(pivot - 1.8, 'riser', .45), (pivot, 'impact', .7)]
    ev.append((beats[-1]['start'] + .05, 'accent', .5))
    return secs, sorted(ev), pivot

def place(lib, ev, n):
    out = np.zeros((n, 2))
    for t, name, g in ev:
        x = lib.get(name)
        if x is None: continue
        s = int(t * SR)
        if s < 0: x = x[-s:]; s = 0
        m = min(len(x), n - s)
        if m > 0: out[s:s + m] += x[:m] * g
    return out

def main(vid):
    out_dir = os.path.join(ROOT, 'out', vid)
    data = json.loads(open(os.path.join(out_dir, 'data.js')).read().replace('window.__DATA = ', '', 1).rstrip().rstrip(';'))
    dur = data['duration']; n = int(dur * SR)
    secs, ev, pivot = plan(data)
    lib = load_sfx()
    mus = music(dur, secs)
    sfx = place(lib, ev, n)
    write_wav(os.path.join(out_dir, 'music.wav'), mus)
    write_wav(os.path.join(out_dir, 'sfx.wav'), np.tanh(sfx))
    voice = os.path.join(out_dir, data.get('audio', 'voice.wav'))
    # voice chain → sidechain-duck music → sum → two-pass loudnorm
    fc = ('[0:a]aresample=44100,aformat=channel_layouts=stereo,highpass=f=75,equalizer=f=220:t=q:w=1.2:g=-1.5,'
          'equalizer=f=3200:t=q:w=1.0:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,asplit=2[vo][sc];'
          '[1:a]volume=0.55[mu];[mu][sc]sidechaincompress=threshold=0.035:ratio=7:attack=25:release=350:makeup=1[duck];'
          '[2:a]volume=0.7[fx];[vo][duck][fx]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.95[pre]')
    tmp = os.path.join(out_dir, 'premix.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', voice, '-i', os.path.join(out_dir, 'music.wav'), '-i', os.path.join(out_dir, 'sfx.wav'),
                    '-filter_complex', fc, '-map', '[pre]', '-t', str(dur), tmp], check=True)
    meas = subprocess.run(['ffmpeg', '-i', tmp, '-af', 'loudnorm=I=-13:TP=-1:LRA=7:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = (f"loudnorm=I=-13:TP=-1:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', ln + ',aresample=44100', '-ar', '44100', os.path.join(out_dir, 'mix.wav')], check=True)
    os.remove(tmp)
    print(f'[audio3] {vid}: {len(ev)} sfx cues, pivot at {pivot}, sections: ' + ' '.join(f'{m}@{a:.1f}' for a, _, m in secs))

if __name__ == '__main__':
    if sys.argv[1] == '--sfx': make_sfx()
    else: main(sys.argv[1])
