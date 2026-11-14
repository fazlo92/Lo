# Lo — enjin video pendek "Apa jadi kalau…?"

Video menegak 9:16 (1080×1920, 30fps) gaya POV low-poly. Adegannya dibina dengan **Three.js**, teks dan HUD dengan HTML/CSS, kemudian setiap frame dirakam dengan Playwright dan disatukan dengan ffmpeg.

## Struktur

```
engine/            enjin umum (guna semula untuk setiap tajuk)
  index.html       pentas 1080×1920: kanvas 3D + lapisan kesan + teks
  overlay.js       tajuk (kata kunci biru), sari kata, HUD pemasa (dengan glitch)
  main.js          muat topik, sediakan window.renderFrame(t)
tools/
  render.mjs       render stills / MP4 penuh
  serve.mjs        pratonton masa nyata dalam pelayar
topics/<nama>/
  script.json      babak, tajuk, sari kata, label HUD, masa pemasa
  scene.js         adegan Three.js + kesan khusus topik
  sound.mjs        (pilihan) jana audio.wav sementara
  audio.wav        audio yang digabungkan semasa render (VO + muzik)
skrip/             draf skrip dalam bentuk teks
```

## Cara guna

```bash
npm install
node topics/nombor/sound.mjs                          # jana audio sementara
node tools/render.mjs --topic nombor --stills 3,14,30 # semak beberapa frame -> out/stills/
node tools/render.mjs --topic nombor --workers 4      # video penuh -> out/nombor.mp4
node tools/serve.mjs                                  # pratonton dalam pelayar
```

## Tajuk baru

1. Salin `topics/nombor` ke `topics/<tajuk-baru>`.
2. Ubah `script.json` (babak, sari kata, HUD, pemasa).
3. Ubah `scene.js`: lokasi, objek dan kesan setiap babak. Semua animasi mesti fungsi tulen masa `t` (tiada state) supaya frame boleh dirender selari.
4. Letak suara latar/muzik sebagai `topics/<tajuk-baru>/audio.wav` dan laraskan masa sari kata dalam `script.json` ikut suara.
