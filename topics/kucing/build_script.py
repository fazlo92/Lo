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
# merge "Nampak kecil," + "kan?" and "Sebulan," + amount into single captions
caps_src = []
for x in al:
    if caps_src and caps_src[-1]['text'] in ('Nampak kecil,', 'Sebulan,', 'Satu rumah,') and x['start'] - caps_src[-1]['start'] < 1.8:
        caps_src[-1] = {**caps_src[-1], 'text': caps_src[-1]['text'] + ' ' + x['text']}
    else: caps_src.append(dict(x))
S = [("hook", 0, "Apa jadi kalau semua rumah di Kuching bela seekor kucing?", ["kucing?"]),
     ("taman", cut(T("Berdasarkan")), "162,802 rumah. 162,802 kucing.", ["162,802"]),
     ("makanan", cut(T("Minggu pertama")), "Minggu 1: 9.8 tan sehari.", ["9.8", "tan"]),
     ("kos", cut(T("Bulan pertama")), "Bulan 1: RM4.4 juta.", ["RM4.4", "juta."]),
     ("najis", cut(T("Bulan ketiga")), "Bulan 3: 195 tan najis.", ["195", "tan"]),
     ("anak", cut(T("Bulan keenam")), "Bulan 6: 227,000+ ekor.", ["227,000+"]),
     ("setahun", cut(T("Setahun")), "Setahun: RM53 juta.", ["RM53", "juta."]),
     ("pengajaran", cut(T("Seekor kucing nampak")), "Bela kucing = tanggungjawab.", ["tanggungjawab."]),
     ("cta", cut(T("Apa jadi kalau…")), "Apa jadi kalau _____?", ["_____"])]
scenes = []
for i, (sid, a, h, hl) in enumerate(S):
    b = S[i + 1][1] if i + 1 < len(S) else end
    caps = [{"t": round(max(a, x['start'] - 0.03), 2), "text": x['text']} for x in caps_src if a <= max(0, x['start'] - 0.03) < b]
    sc = {"id": sid, "start": a, "end": b, "headline": {"text": h, "highlight": hl}, "captions": caps}
    if sid == 'cta': sc['headline']['emoji'] = '👇'
    scenes.append(sc)
ev = {"baharu": T("setiap rumah di Kuching"), "isi": T("Bahagian Kuching"), "satok": T("Dari Satok"), "jumlah1": T("162,802 ekor"),
      "g60": T("Katakan"), "darab1": T("Darab dengan 162"), "tan98": T("hampir 9.8"), "beg": T("Itu hampir"),
      "rm15": T("Pada harga"), "sen90": T("seekor kucing cuma"), "kecil": T("Nampak kecil"), "darab2": T("Tetapi darab"), "rm147": T("hampir RM147"), "rm44": T("RM4.4"),
      "najis40": T("40 gram"), "tan65": T("menjadi 6.5"), "tan195": T("hampir 195"),
      "persen10": T("Kalau hanya"), "empat": T("dan setiap seekor"), "anak65": T("lebih 65,000"), "jumlah2": T("Jumlahnya"),
      "tan3500": T("Lebih 3,500"), "rm53": T("Kos melebihi"), "didarab": T("Tetapi apabila"), "bandar": T("Kuching memang"), "mandul": T("dan mandulkan"), "cta": cut(T("Apa jadi kalau…"))}
json.dump({"title": "Apa Jadi Kalau Semua Rumah di Kuching Bela Seekor Kucing?", "duration": end, "fps": 30, "width": 1080, "height": 1920,
           "voiceover": "vo.wav", "theme": {"hl": "#ffb347"}, "events": ev, "scenes": scenes}, open(os.path.join(D, 'script.json'), 'w'), indent=2, ensure_ascii=False)
for s in scenes: print(f"{s['id']:11s} {s['start']:6.2f}-{s['end']:6.2f}  {len(s['captions'])} cap")
print('duration', end)
