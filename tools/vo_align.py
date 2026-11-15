#!/usr/bin/env python3
"""Trim pauses from a voiceover and align it to the script, phrase by phrase.

usage: python3 tools/vo_align.py VO.wav SCRIPT_TTS.md OUT_DIR [--tempo auto|1.0|1.1]

SCRIPT_TTS.md: the clean text after the heading "## Skrip (tampal di ruangan teks)", paragraphs separated by blank lines.
Writes OUT_DIR/vo.wav (trimmed, 24-bit-safe 16-bit mono) and OUT_DIR/vo_align.json:
  [{"para": i, "text": phrase, "start": s, "end": e}, ...]   (times in the NEW audio)

No speech recogniser is available offline, so alignment uses pauses + syllable counts
(dynamic programming over phrase groups ↔ speech-segment groups).
"""
import sys, re, json, math, wave, array, subprocess, os

args = sys.argv[1:]
vo, md, out = args[0], args[1], args[2]
tempo_arg = args[args.index('--tempo') + 1] if '--tempo' in args else 'auto'
os.makedirs(out, exist_ok=True)

# ---------- speech segments
log = subprocess.run(['ffmpeg', '-i', vo, '-af', 'silencedetect=n=-38dB:d=0.15', '-f', 'null', '-'], capture_output=True, text=True).stderr
marks = [float(x) for x in re.findall(r'silence_(?:start|end): ([0-9.]+)', log)]
w = wave.open(vo); sr = w.getframerate(); n = w.getnframes()
assert w.getsampwidth() == 2 and w.getnchannels() == 1, 'expect 16-bit mono'
x = array.array('h', w.readframes(n)); dur = n / sr
segs, prev = [], 0.0
for s, e in zip(marks[0::2], marks[1::2]):
    if s - prev > 0.05: segs.append((prev, s))
    prev = e
if len(marks) % 2 == 1: pass  # trailing silence to the end
elif dur - prev > 0.05: segs.append((prev, dur))
def peak(a, b): return max((abs(v) for v in x[int(a * sr):int(b * sr)]), default=0)
segs = [(a, b) for a, b in segs if peak(a, b) > 1000]

# ---------- phrases
txt = open(md).read().split('## Skrip (tampal di ruangan teks)')[1].strip()
paras = [p.strip() for p in txt.split('\n\n') if p.strip()]
phr = []
for pi, p in enumerate(paras):
    for q in re.findall(r'[^.,?…—]+[.,?…—"]*', p):
        q = q.replace('"', '').strip()
        if q and re.search(r'\w', q): phr.append((pi, q))
SPECIAL = {'ATM': 3, 'India': 3, 'Street': 1, 'Vivacity': 4, 'Zimbabwe': 3, 'Venezuela': 5, 'Kuching': 2, 'Malaysia': 4, 'Waterfront': 3}
def syl(s):
    c = 0
    for t in re.findall(r"[A-Za-z-]+", s):
        c += SPECIAL.get(t) or max(1, len(re.findall(r'(ai|au|oi|[aeiou])', t.lower())))
    return c
S = segs; syls = [syl(q) for _, q in phr]
r = sum(b - a for a, b in S) / sum(syls)
N, M = len(phr), len(S); INF = 1e18
dp = [[INF] * (M + 1) for _ in range(N + 1)]; bk = [[None] * (M + 1) for _ in range(N + 1)]; dp[0][0] = 0
strength = lambda q: 1.0 if q[-1:] in '.?…' else (0.5 if q[-1:] in ',—' else 0)
for i in range(N):
    for j in range(M):
        if dp[i][j] >= INF: continue
        for i2 in range(i + 1, min(N, i + 4) + 1):
            for j2 in range(j + 1, min(M, j + 5) + 1):
                grp = S[j:j2]; d = sum(b - a for a, b in grp); sy = sum(syls[i:i2])
                c = (i2 - i) * math.log(max(d, 0.05) / (sy * r)) ** 2
                c += sum(max(0, grp[t + 1][0] - grp[t][1] - 0.35) * 1.5 for t in range(len(grp) - 1))
                c += 0.15 * (i2 - i - 1)
                if j2 < M:
                    g = S[j2][0] - S[j2 - 1][1]
                    c += 0.4 * max(0, strength(phr[i2 - 1][1]) * 0.55 - g)
                    if i2 < N and phr[i2 - 1][0] != phr[i2][0]: c += 0.8 * max(0, 0.6 - g)
                if dp[i][j] + c < dp[i2][j2]: dp[i2][j2] = dp[i][j] + c; bk[i2][j2] = (i, j)
i, j, blocks = N, M, []
while i > 0: pi_, pj = bk[i][j]; blocks.append((pi_, i, pj, j)); i, j = pi_, pj
blocks.reverse()
align = []
for i, i2, j, j2 in blocks:
    grp = S[j:j2]; L = sum(b - a for a, b in grp); tot = sum(syls[i:i2]); acc = 0
    def at(f):
        y = f * L
        for a, b in grp:
            if y <= b - a + 1e-9: return a + y
            y -= b - a
        return grp[-1][1]
    for k in range(i, i2):
        s0 = at(acc / tot); acc += syls[k]
        align.append({'para': phr[k][0], 'text': phr[k][1], 'start': s0, 'end': at(acc / tot)})

# ---------- trim pauses
pstarts = sorted({a['start'] for a in align if align.index(a) == 0 or a['para'] != align[align.index(a) - 1]['para']})
PRE, POST = 0.05, 0.09
outa = array.array('h'); mapping = []; tn = 0.0
for k, (a, b) in enumerate(segs):
    if k > 0:
        ga = a - segs[k - 1][1]
        isPara = any(abs(a - ps) < 0.08 for ps in pstarts)
        target = 0.55 if isPara else min(ga, 0.3 if ga < 0.7 else 0.45)
        gap = max(0, max(target, 0.12) - PRE - POST)
        outa.extend([0] * int(gap * sr)); tn += gap
    a0, b0 = max(0, a - PRE), min(dur, b + POST)
    ch = x[int(a0 * sr):int(b0 * sr)]; Lc = len(ch); f = int(0.006 * sr)
    outa.extend(array.array('h', [int(v * min(1, q / f, (Lc - 1 - q) / f)) for q, v in enumerate(ch)]))
    mapping.append((a0, tn, b0)); tn += b0 - a0
outa.extend([0] * int(0.3 * sr))
def remap(t):
    for a0, t1, b0 in mapping:
        if t <= b0 + 0.01: return t1 + max(0, t - a0)
    return tn
tmp = os.path.join(out, '_trim.wav')
o = wave.open(tmp, 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes(outa.tobytes()); o.close()

# ---------- tempo: speed up if the speaking rate is slower than our reference (~0.155 s/syllable)
speech = sum(b - a for a, b in segs) / sum(syls)
tempo = float(tempo_arg) if tempo_arg != 'auto' else round(min(1.15, max(1.0, speech / 0.150)), 3)
final = os.path.join(out, 'vo.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'atempo={tempo}', final], check=True)
os.remove(tmp)
for a in align: a['start'] = round(remap(a['start']) / tempo, 2); a['end'] = round(remap(a['end']) / tempo, 2)
json.dump(align, open(os.path.join(out, 'vo_align.json'), 'w'), ensure_ascii=False, indent=1)
print(f'original {dur:.2f}s, trimmed {tn:.2f}s, s/syl {speech:.3f}, tempo x{tempo}, final {tn / tempo:.2f}s')
for a in align: print(a['para'], f"{a['start']:6.2f}", a['text'])
