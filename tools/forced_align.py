#!/usr/bin/env python3
"""Forced alignment of script phrases to a voiceover, without a speech recogniser.

Each phrase is synthesised with espeak-ng (Malay voice), the synthetic track and the real
voiceover are turned into MFCC features, and dynamic time warping (DTW) maps every phrase
boundary in the synthetic track onto the real audio. Phrase starts are then snapped to the
nearest real pause when one is close, because phrases usually begin after a breath.

usage: python3 tools/forced_align.py VO.wav SCRIPT_TTS.md OUT.json
needs: espeak-ng (apt), librosa, numpy, soundfile
"""
import sys, re, json, os, subprocess, tempfile
import numpy as np, librosa, soundfile as sf

vo, md, out = sys.argv[1:4]
SR, HOP = 16000, 320  # 20 ms frames

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from textnorm import phrases, spoken
phr = phrases(md)

# --- synthetic reference track
tmp = tempfile.mkdtemp()
chunks, bounds, t = [], [], 0.0
gap = np.zeros(int(0.12 * SR), dtype=np.float32)
for i, (pi, q) in enumerate(phr):
    f = os.path.join(tmp, f'{i}.wav')
    subprocess.run(['espeak-ng', '-v', 'ms', '-s', '165', '-w', f, re.sub(r'[—…!]', ',', spoken(q))], check=True)
    y, _ = librosa.load(f, sr=SR)
    y, _ = librosa.effects.trim(y, top_db=35)
    if i and pi != phr[i - 1][0]: chunks.append(np.zeros(int(0.35 * SR), dtype=np.float32)); t += 0.35
    bounds.append((t, t + len(y) / SR)); chunks.append(y); t += len(y) / SR
    chunks.append(gap); t += len(gap) / SR
synth = np.concatenate(chunks)
real, _ = librosa.load(vo, sr=SR)

def feats(y):
    m = librosa.feature.mfcc(y=y, sr=SR, n_mfcc=20, hop_length=HOP, n_fft=1024)[1:]
    e = librosa.feature.rms(y=y, hop_length=HOP, frame_length=1024)
    m = (m - m.mean(1, keepdims=True)) / (m.std(1, keepdims=True) + 1e-6)
    sil = (20 * np.log10(e + 1e-9) < -42).astype(np.float32) * 4.0  # make silence/speech a strong cue
    return np.vstack([m, sil])
A, B = feats(synth), feats(real)
D, wp = librosa.sequence.dtw(X=A, Y=B, metric='cosine', global_constraints=True, band_rad=0.12, subseq=False)
wp = wp[::-1]
a2b = np.zeros(A.shape[1], dtype=int)
for a, b in wp: a2b[a] = b   # last mapping for each synth frame
def map_t(ts):
    fa = min(int(round(ts * SR / HOP)), len(a2b) - 1)
    return a2b[fa] * HOP / SR

# --- real pauses for snapping
rms = librosa.feature.rms(y=real, hop_length=HOP, frame_length=1024)[0]
quiet = 20 * np.log10(rms + 1e-9) < -38
onsets = [i * HOP / SR for i in range(1, len(quiet)) if quiet[i - 1] and not quiet[i]]
def snap(ts, win=0.35):
    c = [o for o in onsets if abs(o - ts) <= win]
    return min(c, key=lambda o: abs(o - ts)) if c else ts

res = []
for (pi, q), (s0, s1) in zip(phr, bounds):
    res.append({'para': pi, 'text': q, 'start': round(snap(map_t(s0)), 2), 'end': round(map_t(s1), 2)})
for i in range(1, len(res)):  # keep monotonic
    res[i]['start'] = max(res[i]['start'], res[i - 1]['start'] + 0.25)
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
for r in res: print(r['para'], f"{r['start']:6.2f}-{r['end']:6.2f}", r['text'])
