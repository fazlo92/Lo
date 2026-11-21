#!/usr/bin/env python3
"""Rebuild script.json from vo_align.json (estimated or real)."""
import json, os, re
D = os.path.dirname(os.path.abspath(__file__))
al = json.load(open(os.path.join(D, 'vo_align.json')))
def T(prefix):
    for a in al:
        if a['text'].startswith(prefix): return a['start']
    raise SystemExit('phrase not found: ' + prefix)
def DAY(n):
    for a in al:
        if re.match(rf'^Hari {n}(?!\d)', a['text']): return a['start']
    raise SystemExit(f'day {n} not found')
cut = lambda t: round(max(0, t - 0.25), 2)
end = round(al[-1]['end'] + 3.5)
S = [("hook", 0, "Apa jadi kalau RM1 berganda setiap hari selama 30 hari?", ["berganda"]),
     ("kopitiam", cut(DAY(1)), "Hari 1–7: cuma RM64.", ["RM64"]),
     ("kedai", cut(DAY(8)), "Hari 8–14: ribuan ringgit.", ["ribuan"]),
     ("motor", cut(DAY(15)), "Hari 15: sebuah motosikal.", ["motosikal"]),
     ("kereta", cut(DAY(18)), "Hari 18: sebuah kereta.", ["kereta"]),
     ("belum", cut(DAY(19)), "Hari 20: belum sejuta!", ["belum"]),
     ("jutawan", cut(DAY(21)), "Hari 21: jutawan!", ["jutawan"]),
     ("langit", cut(DAY(22)), "Hari 22–28: berjuta-juta.", ["berjuta-juta"]),
     ("separuh", cut(DAY(29)), "Hari 29: baru separuh.", ["separuh"]),
     ("klimaks", cut(DAY(30)), "Hari 30: RM536 juta!", ["RM536", "juta!"]),
     ("eksponen", cut(T("Inilah")), "Kuasa eksponen: × 2.", ["eksponen:"]),
     ("cta", cut(T("Korang pilih")), "Korang pilih yang mana?", ["mana?"])]
# merge "Hari N," with the amount that follows into one caption
capsrc = []
for x in al:
    if capsrc and re.match(r'^Hari \d+,$', capsrc[-1]['text']) and x['start'] - capsrc[-1]['start'] < 2.5:
        capsrc[-1] = {**capsrc[-1], 'text': capsrc[-1]['text'] + ' ' + x['text']}
    else: capsrc.append(dict(x))
scenes = []
for i, (sid, a, h, hl) in enumerate(S):
    b = S[i + 1][1] if i + 1 < len(S) else end
    caps = [{"t": round(max(a, x['start'] - 0.03), 2), "text": x['text']} for x in capsrc if a <= max(0, x['start'] - 0.03) < b]
    sc = {"id": sid, "start": a, "end": b, "headline": {"text": h, "highlight": hl}, "captions": caps}
    if sid == 'cta': sc['headline']['emoji'] = '👇'
    scenes.append(sc)
ev = {f"d{n}": DAY(n) for n in range(1, 31)}
ev.update({"pilih": T("Pilih"), "laksa": T("semangkuk"), "ketawa": T("Ramai"), "belumSejuta": T("Masih belum"), "jutawanKata": T("Anda jutawan"),
           "separuhKata": T("baru separuh"), "inilah": T("Inilah"), "darab": T("Setiap hari"), "cta": cut(T("Korang pilih"))})
json.dump({"title": "Apa Jadi Kalau RM1 Berganda Setiap Hari Selama 30 Hari?", "duration": end, "fps": 30, "width": 1080, "height": 1920,
           "voiceover": "vo.wav", "theme": {"hl": "#f2c94c"}, "events": ev, "scenes": scenes}, open(os.path.join(D, 'script.json'), 'w'), indent=2, ensure_ascii=False)
for s in scenes: print(f"{s['id']:10s} {s['start']:6.2f}-{s['end']:6.2f}  {len(s['captions'])} cap")
print('duration', end)
