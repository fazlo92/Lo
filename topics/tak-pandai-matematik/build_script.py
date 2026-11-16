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
S = [("rumah", 0, "Apa jadi kalau satu Kuching lupa matematik?", ["matematik"]),
     ("laksa", cut(T("7.30")), "Baki salah.", ["salah"]),
     ("satok", cut(T("9.00 pagi")), "Timbang ikan.", ["ikan"]),
     ("terubuk", cut(T("Penimbang")), "Timbang ikan.", ["ikan"]),
     ("atm", cut(T("10.00")), "Gaji hilang.", ["Gaji"]),
     ("jalan", cut(T("11.00")), "Jalan lumpuh.", ["lumpuh"]),
     ("airportLuar", cut(T("12.00")), "Semua penerbangan dibatalkan.", ["penerbangan"]),
     ("airportDalam", cut(T("Pramugari")), "Semua penerbangan dibatalkan.", ["penerbangan"]),
     ("hospitalLuar", cut(T("2.00")), "Ubat jadi bahaya.", ["Ubat"]),
     ("farmasi", cut(T("Dua biji")), "Ubat jadi bahaya.", ["Ubat"]),
     ("jambatan", cut(T("4.00")), "Jambatan tak bertemu.", ["Jambatan"]),
     ("loji", cut(T("6.00")), "Air dan elektrik terputus.", ["Air", "elektrik"]),
     ("gelap", cut(T("9.00 malam")), "Kuching gelap.", ["gelap"]),
     ("twist", cut(T("Akhirnya")), "Matematik ada di mana-mana.", ["mana-mana"]),
     ("cta", cut(T("Apa jadi kalau")), "Apa jadi kalau _____?", ["_____"])]
scenes = []
for i, (sid, a, h, hl) in enumerate(S):
    b = S[i + 1][1] if i + 1 < len(S) else end
    caps = [{"t": round(max(a, x['start'] - 0.03), 2), "text": x['text']} for x in al if a <= max(0, x['start'] - 0.03) < b]
    sc = {"id": sid, "start": a, "end": b, "headline": {"text": h, "highlight": hl}, "captions": caps}
    if sid == 'cta': sc['headline']['emoji'] = '👇'
    scenes.append(sc)
ev = {"alarm": T("Jam loceng"), "bayar": T("Bayar RM10"), "pulang": T("peniaga pulangkan"), "timbang": T("Penimbang"), "baca20": T("peniaga baca"),
      "diskaun": T("Diskaun"), "mahal": T("tapi harga makin"), "gaji": T("Hari gaji"), "baki": T("Tapi tiada siapa tahu cara"), "tutup": T("Kaunter bank"),
      "hadLaju": T("Had laju"), "pam": T("Nak isi minyak"), "lumpuh": T("Jalan raya mula"), "batal": T("Semua penerbangan"), "duaBiji": T("Dua biji"),
      "duaPuluh": T("atau dua puluh"), "bina": T("Sebuah jambatan"), "takJumpa": T("Tapi kedua-dua"), "klorin": T("Sukatan klorin"), "voltan": T("Jurutera gagal"),
      "airHenti": T("Bekalan air"), "padam": T("Lampu padam"), "bantuan": T("Pasukan penyelamat"), "laksaIcon": T("Ia ada dalam setiap"), "jambatanIcon": T("setiap jambatan"),
      "airIcon": T("setiap titis"), "nyawaIcon": T("malah dalam"), "cta": cut(T("Apa jadi kalau"))}
json.dump({"title": "Apa Jadi Kalau Satu Kuching Lupa Matematik?", "duration": end, "fps": 30, "width": 1080, "height": 1920,
           "voiceover": "vo.wav", "events": ev, "scenes": scenes}, open(os.path.join(D, 'script.json'), 'w'), indent=2, ensure_ascii=False)
for s in scenes: print(f"{s['id']:13s} {s['start']:6.2f}-{s['end']:6.2f}  {len(s['captions'])} cap")
print('duration', end)
