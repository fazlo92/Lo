#!/usr/bin/env python3
"""Rebuild script.json from vo_align.json (run after tools/vo_align.py)."""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
al = json.load(open(os.path.join(D, 'vo_align.json')))
def T(prefix):
    for a in al:
        if a['text'].startswith(prefix): return a['start']
    raise SystemExit('phrase not found: ' + prefix)
P = {}
for a in al: P.setdefault(a['para'], a['start'])
cut = lambda t: round(max(0, t - 0.3), 2)
end = round(al[-1]['end'] + 3.5)
# scene id, start, headline, highlight
S = [("rumah", 0, "Apa jadi kalau semua orang di Kuching tiba-tiba tak pandai matematik?", ["matematik"]),
     ("laksa", cut(P[1]), "Baki salah.", ["salah"]),
     ("satok", cut(P[2]), "Timbang ikan.", ["ikan"]),
     ("terubuk", cut(T("Penimbang")), "Timbang ikan.", ["ikan"]),
     ("atm", cut(P[3]), "Gaji hilang.", ["Gaji"]),
     ("jalan", cut(P[4]), "Jalan lumpuh.", ["lumpuh"]),
     ("airportLuar", cut(P[5]), "Semua penerbangan dibatalkan.", ["penerbangan"]),
     ("airportDalam", cut(T("Juruterbang")) + 1.2, "Semua penerbangan dibatalkan.", ["penerbangan"]),
     ("hospitalLuar", cut(P[6]), "Ubat jadi bahaya.", ["Ubat"]),
     ("farmasi", cut(T("Dua biji")), "Ubat jadi bahaya.", ["Ubat"]),
     ("jambatan", cut(P[7]), "Jambatan tak bertemu.", ["Jambatan"]),
     ("loji", cut(P[8]), "Air dan elektrik terputus.", ["Air", "elektrik"]),
     ("gelap", cut(P[9]), "Kuching gelap.", ["gelap"]),
     ("twist", cut(P[10]), "Matematik ada di mana-mana.", ["mana-mana"]),
     ("cta", cut(P[11]), "Apa jadi kalau _____?", ["_____"])]
scenes = []
for i, (sid, a, h, hl) in enumerate(S):
    b = S[i + 1][1] if i + 1 < len(S) else end
    caps = [{"t": round(max(a, x['start'] - 0.03), 2), "text": x['text']} for x in al if a <= max(0, x['start'] - 0.03) < b]
    sc = {"id": sid, "start": a, "end": b, "headline": {"text": h, "highlight": hl}, "captions": caps}
    if sid == 'cta': sc['headline']['emoji'] = '👇'
    scenes.append(sc)
ev = {"alarm": T("Jam loceng"), "bayar": T("Anda bayar"), "pulang": T("peniaga pulangkan"), "timbang": T("Penimbang tunjuk"), "baca20": T("peniaga baca"),
      "diskaun": T("Diskaun"), "mahal": T("harga jadi lebih"), "gaji": T("Hari gaji"), "baki": T("Tapi tiada siapa boleh"), "tutup": T("Bank tutup"),
      "hadLaju": T("Had laju"), "pam": T("Pam minyak"), "lumpuh": T("Jalan raya lumpuh"), "batal": T("Semua penerbangan"), "duaBiji": T("Dua biji"),
      "duaPuluh": T("atau dua puluh"), "bina": T("Jambatan baru"), "takJumpa": T("dan tak bertemu"), "klorin": T("Loji air"), "voltan": T("Janakuasa"),
      "airHenti": T("Air paip"), "padam": T("Lampu padam"), "bantuan": T("Bantuan"), "laksaIcon": T("Ia ada dalam laksa"), "jambatanIcon": T("jambatan yang kita"),
      "airIcon": T("air yang kita"), "nyawaIcon": T("dan setiap nyawa"), "cta": cut(P[11])}
json.dump({"title": "Apa Jadi Kalau Semua Orang di Kuching Tiba-tiba Tak Pandai Matematik?", "duration": end, "fps": 30, "width": 1080, "height": 1920,
           "voiceover": "vo.wav", "events": ev, "scenes": scenes}, open(os.path.join(D, 'script.json'), 'w'), indent=2, ensure_ascii=False)
for s in scenes: print(f"{s['id']:13s} {s['start']:6.2f}-{s['end']:6.2f}  {len(s['captions'])} cap")
print('duration', end)
