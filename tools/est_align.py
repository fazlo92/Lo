#!/usr/bin/env python3
"""Estimated phrase timings (no recording yet): python3 tools/est_align.py SCRIPT.md OUT.json [sec_per_syllable]"""
import sys, re, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from textnorm import phrases, spoken
md, out = sys.argv[1], sys.argv[2]; r = float(sys.argv[3]) if len(sys.argv) > 3 else 0.165
def syl(s): return sum(max(1, len(re.findall(r'(ai|au|oi|[aeiou])', t.lower()))) for t in re.findall(r"[A-Za-z-]+", spoken(s)))
t, res, prev = 0.3, [], None
for pi, q in phrases(md):
    if prev is not None: t += 0.55 if pi != prev else (0.35 if q and res[-1]['text'][-1:] in '.…!?' else 0.2)
    d = syl(q) * r; res.append({'para': pi, 'text': q, 'start': round(t, 2), 'end': round(t + d, 2)}); t += d; prev = pi
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1); print('estimated', round(t, 1), 's,', len(res), 'phrases')
