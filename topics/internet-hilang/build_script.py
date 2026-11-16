#!/usr/bin/env python3
"""Rebuild script.json from vo_align.json."""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
al = json.load(open(os.path.join(D, 'vo_align.json')))
def T(prefix):
    for a in al:
        if a['text'].startswith(prefix): return a['start']
    raise SystemExit('phrase not found: ' + prefix)
cut = lambda t: round(max(0, t - 0.3), 2)
end = round(al[-1]['end'] + 3.5)
H = lambda n, rest, hl: (f"Hari {n} — {rest}", hl)
S = [("hook", 0, "Apa jadi kalau internet dunia hilang selama 7 hari?", ["internet"]),
     ("h1bilik", cut(T("Hari pertama")), *H(1, "Kuching terdiam.", ["terdiam"])),
     ("h1kedai", cut(T("Di sebuah kedai")), *H(1, "Kuching terdiam.", ["terdiam"])),
     ("h2luar", cut(T("Hari kedua")), *H(2, "Semua cari wang tunai.", ["wang", "tunai"])),
     ("h2atm", cut(T("Di Samarahan")), *H(2, "Semua cari wang tunai.", ["wang", "tunai"])),
     ("h2serikin", cut(T("Di Pasar Serikin")), *H(2, "Semua cari wang tunai.", ["wang", "tunai"])),
     ("h3pelabuhan", cut(T("Hari ketiga")), *H(3, "Penghantaran terganggu.", ["Penghantaran"])),
     ("h3gudang", cut(T("Barang masih ada")), *H(3, "Penghantaran terganggu.", ["Penghantaran"])),
     ("h4pasaraya", cut(T("Hari keempat")), *H(4, "Bekalan terjejas.", ["Bekalan"])),
     ("h4hospital", cut(T("Di Hospital")), *H(4, "Bekalan terjejas.", ["Bekalan"])),
     ("h5ruai", cut(T("Hari kelima")), *H(5, "Pedalaman terasing.", ["Pedalaman"])),
     ("h5bandar", cut(T("Di bandar")), *H(5, "Pedalaman terasing.", ["Pedalaman"])),
     ("h6", cut(T("Hari keenam")), *H(6, "Perniagaan tertekan.", ["Perniagaan"])),
     ("h7pasar", cut(T("Hari ketujuh")), *H(7, "Sarawak bertahan.", ["bertahan"])),
     ("h7kampung", cut(T("Di kampung")), *H(7, "Sarawak bertahan.", ["bertahan"])),
     ("kembali", cut(T("Tepat tengah malam")), "Internet kembali.", ["kembali"]),
     ("renung", cut(T("Tujuh hari tanpa")), "Betapa kita bergantung kepadanya.", ["bergantung"]),
     ("cta", cut(T("Apa jadi kalau")), "Apa jadi kalau _____?", ["_____"])]
scenes = []
for i, (sid, a, h, hl) in enumerate(S):
    b = S[i + 1][1] if i + 1 < len(S) else end
    caps = [{"t": round(max(a, x['start'] - 0.03), 2), "text": x['text']} for x in al if a <= max(0, x['start'] - 0.03) < b]
    sc = {"id": sid, "start": a, "end": b, "headline": {"text": h, "highlight": hl}, "captions": caps}
    if sid == 'cta': sc['headline']['emoji'] = '👇'
    scenes.append(sc)
ev = {"putus": T("internet di seluruh"), "apps": T("WhatsApp"), "qrGagal": T("bayaran Sarawak"), "cash": T("“Cash"), "tenang": T("Ramai"),
      "atm": T("barisan panjang"), "tunai": T("peniaga kembali"), "perlahan": T("penghantaran semakin"), "sukar": T("tetapi sukar"),
      "rak": T("beberapa rak"), "sandaran": T("petugas"), "kecemasan": T("Rawatan"), "takHubung": T("penduduk tidak dapat"), "radio": T("Mereka kembali"),
      "khabar": T("khabar angin"), "tempahan": T("Perniagaan kecil"), "rugi": T("Kerugian"), "pasar": T("Pasar masih"), "tanam": T("penduduk masih"),
      "jiran": T("Jiran"), "tengahMalam": T("Tepat tengah malam"), "kembali": T("internet kembali"), "mesej": T("Telefon menerima"), "bergantung": T("Tetapi cukup"), "cta": cut(T("Apa jadi kalau"))}
json.dump({"title": "Apa Jadi Kalau Internet Dunia Hilang Selama 7 Hari?", "duration": end, "fps": 30, "width": 1080, "height": 1920,
           "voiceover": "vo.wav", "events": ev, "scenes": scenes}, open(os.path.join(D, 'script.json'), 'w'), indent=2, ensure_ascii=False)
for s in scenes: print(f"{s['id']:12s} {s['start']:6.2f}-{s['end']:6.2f}  {len(s['captions'])} cap")
print('duration', end)
