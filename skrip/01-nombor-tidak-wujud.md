# Apa Jadi Kalau Nombor Tidak Wujud? — Draf Skrip v1

- **Format:** 9:16, 1080×1920, ~60 saat, POV low-poly (Three.js)
- **Senario:** Semua nombor lenyap selama **10 saat**
- **Lokasi:** Meja kedai mamak, Kuala Lumpur, waktu malam
- **Twist utama:** Pemasa HUD itu sendiri *hilang* — digit bertukar jadi `?` kerana nombor tak wujud. Digit kembali hanya di babak akhir.

---

## Babak 1 — HOOK (0:00–0:09)
**Tajuk:** Apa jadi kalau **nombor** tidak wujud selama 10 saat?
**HUD:** `NOMBOR LENYAP SELAMA` · `0:10.000` · `BIL: RM 7.50`
**Ikon atas:** blok "1 2 3" berputar
**VO:** "Bayangkan anda di kedai mamak di Kuala Lumpur, nak bayar teh tarik. Tiba-tiba, semua nombor di dunia lenyap. Hanya sepuluh saat."
**Visual:** POV meja mamak. Tangan kiri pegang telefon (skrin bayaran RM 7.50), tangan kanan gelas teh tarik. Menu harga di dinding, jam dinding, skyline KL bercahaya di belakang. Suasana hidup, orang ramai.
**Bunyi:** riuh mamak, sudu berlaga, muzik ambien ringan.

## Babak 2 — HARGA HILANG (0:09–0:18)
**Tajuk:** **Harga** jadi kosong.
**HUD:** `NOMBOR KEMBALI DALAM` · `?:??.???` (berkelip/glitch) · `BIL: RM ???`
**VO:** "Harga di menu jadi kosong. Duit di tangan cuma kertas berwarna. Tiada siapa tahu berapa perlu dibayar — atau berapa yang ada dalam bank."
**Visual:** Angka pada menu, jam dinding, skrin telefon dan wang kertas pecah jadi zarah lalu terbang. Ikon atas retak. Orang sekeliling berhenti, keliru.
**Bunyi:** "glitch" digital, muzik berhenti tiba-tiba.

## Babak 3 — KOMPUTER LUMPUH (0:18–0:28)
**Tajuk:** Setiap **komputer** lumpuh.
**HUD:** `NOMBOR KEMBALI DALAM` · `?:??.???` · `RANGKAIAN: TERPUTUS`
**VO:** "Lebih teruk — komputer berfikir dalam nombor. Kosong dan satu. Tanpa nombor, setiap cip berhenti serentak. Telefon gelap. Internet mati. Lampu isyarat beku."
**Visual:** Kesan binari 0101 melintas skrin lalu hancur. Skrin telefon padam. Papan tanda digital mati. Lampu isyarat di jalan tersekat. Warna mula pudar ke biru-kelabu.
**Bunyi:** dengung elektrik terpotong, "power-down" berturut-turut.

## Babak 4 — BANDAR GELAP (0:28–0:38) — KEMUNCAK
**Tajuk:** **Kuala Lumpur** gelap gelita.
**HUD:** `NOMBOR KEMBALI DALAM` · `?:??.???` · `GRID ELEKTRIK: GAGAL`
**VO:** "Grid elektrik dikawal pada frekuensi tepat — lima puluh hertz. Tanpa sistem kawalan, janakuasa tersadung satu demi satu. Seluruh bandar gelap. LRT terhenti di landasan."
**Visual:** Lampu bangunan padam blok demi blok (kiri ke kanan), LRT di landasan berhenti dan lampunya mati, kamera bergoncang. Akhirnya hanya cahaya bulan.
**Bunyi:** hentakan bass setiap blok padam, kemudian sunyi.

## Babak 5 — NOMBOR KEMBALI (0:38–0:48)
**Tajuk:** Nombor kembali. **Dunia** tidak.
**HUD:** (layar putih) digit kembali dengan "snap": `NOMBOR DIPULIHKAN` · `0:00.000` · `SISTEM: MULA SEMULA…`
**VO:** "Kemudian, sepuluh saat berakhir. Nombor kembali. Tapi berbilion mesin perlu dihidupkan semula, data hilang, dan bank tak tahu siapa milik apa. Bumi terus berputar — alam tak perlukan nombor. Kita yang perlukan."
**Visual:** Layar putih → kota masih gelap, hanya beberapa lampu berkelip hidup. Skrin telefon menunjukkan ikon "boot". Langit malam biru-ungu, bintang.
**Bunyi:** "whoosh" layar putih, kemudian ambien sunyi + nada piano rendah.

## Babak 6 — CTA (0:48–1:00)
**Tajuk:** Apa jadi kalau **_____**? 👇
**Sari kata:** "Senario mustahil apa patut kita simulasi seterusnya?" → "Tulis di ruang komen."
**VO:** (sama seperti sari kata, atau senyap seperti video asal)
**Visual:** Adegan babak 5 kekal, kamera bernafas perlahan. HUD hilang.

---

## Nota gaya
- **Tajuk:** serif (EB Garamond), putih, 1 kata kunci biru muda `#8FB8F0`
- **Sari kata:** serif italik kecil, 3–6 perkataan sekali
- **HUD:** label sans-serif kecil huruf besar berjarak lebar; pemasa besar
- **Palet:** B1 kuning hangat malam → B2 sama tapi pudar → B3 biru-kelabu → B4 hampir hitam → B5 putih lalu biru-ungu → B6 kekal

## Aset Three.js yang perlu dibina
1. Meja mamak + gelas teh tarik + telefon + 2 tangan POV
2. Dinding kedai: menu harga, jam dinding, papan tanda digital
3. Latar: skyline KL low-poly (bangunan kotak dengan tingkap bercahaya), landasan LRT + kereta
4. Watak latar ringkas (low-poly) di meja lain
5. Kesan: zarah digit, garis binari, padam lampu blok demi blok, layar putih, goncangan kamera
