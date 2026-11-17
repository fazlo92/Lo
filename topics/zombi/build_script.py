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
end = round(al[-1]['start'] + 4.5)
H = lambda n, rest, hl: (f"Hari {n} — {rest}", hl)
S = [("hook", 0, "Apa jadi kalau wabak zombi berlaku di Kuching?", ["wabak", "zombi"]),
     ("h1hus", cut(T("Hari pertama")), *H(1, "Pesakit pertama.", ["Pesakit"])),
     ("h1metro", cut(T("Menjelang malam")), *H(1, "Pesakit pertama.", ["Pesakit"])),
     ("h2tular", cut(T("Hari kedua")), *H(2, "Kuching panik.", ["panik"])),
     ("h2spring", cut(T("Pengunjung")), *H(2, "Kuching panik.", ["panik"])),
     ("h2satok", cut(T("Jalan ke Jambatan")), *H(2, "Kuching panik.", ["panik"])),
     ("h3jalan", cut(T("Hari ketiga")), *H(3, "Bandar lumpuh.", ["lumpuh"])),
     ("h3pasaraya", cut(T("Rak pasar raya")), *H(3, "Bandar lumpuh.", ["lumpuh"])),
     ("h4sentral", cut(T("Hari keempat")), *H(4, "Zon kecemasan.", ["kecemasan"])),
     ("h4platform", cut(T("Bas di Kuching")), *H(4, "Zon kecemasan.", ["kecemasan"])),
     ("h4ltak", cut(T("Penerbangan")), *H(4, "Zon kecemasan.", ["kecemasan"])),
     ("h5waterfront", cut(T("Hari kelima")), *H(5, "Bandar hantu.", ["hantu"])),
     ("h5metro", cut(T("Kedai-kedai")), *H(5, "Bandar hantu.", ["hantu"])),
     ("h5rumah", cut(T("Penduduk berlindung")), *H(5, "Bandar hantu.", ["hantu"])),
     ("h6", cut(T("Hari keenam")), *H(6, "Pertahanan terakhir.", ["terakhir"])),
     ("h7", cut(T("Hari ketujuh")), *H(7, "Kuching jatuh.", ["jatuh"])),
     ("radio", cut(T("Kemudian")), "Kuching hanyalah permulaan.", ["permulaan"]),
     ("sibu", cut(T("Rupa-rupanya")), "Kuching hanyalah permulaan.", ["permulaan"]),
     ("cta", cut(T("Kalau wabak")), "Ke mana korang akan lari?", ["lari"])]
scenes = []
for i, (sid, a, h, hl) in enumerate(S):
    b = S[i + 1][1] if i + 1 < len(S) else end
    caps = [{"t": round(max(a, x['start'] - 0.03), 2), "text": x['text']} for x in al if a <= max(0, x['start'] - 0.03) < b]
    sc = {"id": sid, "start": a, "end": b, "headline": {"text": h, "highlight": hl}, "captions": caps}
    if sid == 'cta': sc['headline']['emoji'] = '👇'
    scenes.append(sc)
ev = {"bayangkan": T("Bayangkan"), "pesakit": T("hanya seorang"), "tujuh": T("Tujuh hari"), "agresif": T("dan tingkah"), "metro": T("kejadian serupa"),
      "tular": T("Rakaman"), "satok": T("Jalan ke Jambatan"), "sekolah": T("Sekolah"), "tinggal": T("kereta ditinggalkan"), "zon": T("Kuching diisytiharkan"),
      "laluan": T("Laluan"), "bas": T("Bas di"), "henti": T("Penerbangan"), "merebak": T("Tetapi wabak"), "padam": T("Lampu jalan"), "rumah": T("Penduduk berlindung"),
      "radio6": T("Mereka menghubungi"), "heli": T("Kumpulan terakhir"), "udara": T("Dari udara"), "darulhana": T("Jambatan Darul"), "radio": T("satu panggilan"),
      "kawalan": T("Ini pusat"), "sibu": T("kami menerima"), "permulaan": T("Kuching hanyalah"), "cta": cut(T("Kalau wabak"))}
json.dump({"title": "Apa Jadi Kalau Wabak Zombi Berlaku di Kuching?", "duration": end, "fps": 30, "width": 1080, "height": 1920,
           "voiceover": "vo.wav", "theme": {"hl": "#ff5a5f"}, "events": ev, "scenes": scenes}, open(os.path.join(D, 'script.json'), 'w'), indent=2, ensure_ascii=False)
for s in scenes: print(f"{s['id']:13s} {s['start']:6.2f}-{s['end']:6.2f}  {len(s['captions'])} cap")
print('duration', end)
