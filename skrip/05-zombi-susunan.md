# Apa Jadi Kalau Wabak Zombi Berlaku di Kuching? — Storyboard & Penerangan Grafik v2

- **Teks suara:** `skrip/05-zombi-vo.md`
- **Gambar rujukan:** `topics/zombi/rujukan/` + set lama (HUS, VivaCity, LTAK, pasar raya, Waterfront)
- **Format:** 1080×1920, 30fps, ~1:36 (masa sebenar diselaraskan ikut rakaman)
- **Zon selamat TikTok:** semua teks, HUD, peta dan telefon di dalam zon (kiri 130px, kanan 225px, atas 220px, bawah 470px)

---

## A. Bahasa grafik tetap

### Susun atur skrin (atas → bawah)
| Kawasan | Elemen |
|---|---|
| y 230–420 | **Peta mini** (Kuching; akhir video → Sarawak) |
| y 440–560 | **Tajuk** serif putih, 1 kata merah/biru |
| y 960–1110 | **HUD** kiri: label kecil / nombor besar / baris hari & lokasi |
| y 1235–1350 | **Sari kata** italik, di sebelah kanan telefon |
| bawah kiri | **Tangan + telefon** (POV) |

### Tajuk
- Font serif (EB Garamond), putih dengan bayang.
- **Kata kunci berwarna merah darah gelap `#e0484f`** (bukan biru seperti siri lain) — tanda siri seram.
- Hari baru: tajuk masuk dengan kesan **glitch** sekejap (gelincir RGB 0.2s).

### HUD
- Label: `KAWASAN TERJEJAS`
- Nombor: `1 PESAKIT` → `3%` → `12%` → `28%` → `45%` → `63%` → `81%` → `100%` (bergolek naik setiap hari)
- Warna: putih → kuning → oren → merah → merah berkelip (Hari 7)
- Baris bawah: `HARI 3 / 7 · JALAN TUN JUGAH`
- Ikon kecil di sebelah label: simbol **biohazard ☣** berdenyut

### Peta mini Kuching
- Garisan sungai Sarawak berliku + titik lokasi (HUS, MetroCity, Petra Jaya, Waterfront, VivaCity, The Spring, Jambatan Satok, Jalan Tun Jugah, Kuching Sentral, LTAK).
- **Tompok merah** (jangkitan) membesar dari HUS mengikut peratus HUD; tepi tompok berdenyut.
- Babak 8: peta zum keluar → **bentuk Sarawak**; titik **SIBU** berdenyut merah.

### Zombi
- Low-poly, tubuh sama seperti orang lain tetapi **kulit kelabu-hijau `#7f8f78`**, baju koyak (warna pudar), **mata kuning bercahaya** (glow kecil).
- Gerak: jalan kaku terhuyung, kepala senget, tangan separuh terangkat; laju perlahan.
- **Tiada darah, luka atau gigitan ditunjuk.** Ancaman ditunjuk melalui siluet, bayang, orang lari, pintu diketuk.
- Mula muncul jauh (Hari 1), makin ramai dan dekat (Hari 5), kumpulan besar di bawah helikopter (Hari 7).

### Telefon (tangan kiri)
Skrin ikut cerita: notifikasi berita → video tular → notis sekolah tutup → **amaran kecemasan merah** → peta pemindahan → tiada isyarat → radio.

### Palet & cahaya mengikut hari
| Hari | Suasana | Langit | Gred warna |
|---|---|---|---|
| Hook | pagi biasa | biru cerah | normal |
| 1 | siang → senja | oren | sedikit hangat |
| 2 | siang panik | biru pucat | kontras tinggi |
| 3 | mendung | kelabu | pudar |
| 4 | petang suram | kuning kotor | pudar, vignet |
| 5 | malam | biru gelap + kabus hijau | sejuk, gelap |
| 6 | malam dalam dewan | — | lampu suluh, hangat kecil |
| 7 | subuh | kelabu-biru | sejuk, desaturasi |
| 8 | senja Sibu | ungu-oren | normal → merah |

### Peralihan
- Antara hari: **kilat putih 0.3s + glitch** + bunyi "whoosh/heartbeat".
- Dalam hari yang sama: potong terus (cut).
- Masuk Sibu: **statik radio** penuh skrin 0.4s.

### Bunyi (ringkas)
Dengung rendah sepanjang video, degupan jantung makin laju dari Hari 2; siren, hon, statik radio, ketukan pintu; Hari 7 angin + bilah helikopter; Sibu: senyap → satu bunyi geraman jauh.

---

## B. Storyboard

### 0 · HOOK — 0:00–0:10
| | |
|---|---|
| **VO** | "Bayangkan… esok pagi, satu wabak misteri mula merebak di Kuching. Mula-mula, hanya seorang pesakit. Tujuh hari kemudian… seluruh bandar berubah." |
| **Tajuk** | Apa jadi kalau **wabak zombi** berlaku di Kuching? |
| **Set** | Bilik tidur (guna semula), pagi |
| **Kamera** | Duduk di katil, pandang tingkap; tolak perlahan ke tingkap |
| **Grafik** | • 0:00–0:02 teks kecil **"Kisah rekaan"** di bawah tajuk<br>• Telefon: notifikasi berita *"Pesakit misteri dimasukkan ke HUS"*<br>• Luar tingkap: lampu biru-merah ambulans berkelip jauh<br>• Pada "tujuh hari": 7 petak kalendar di skrin telefon jadi merah satu demi satu |
| **HUD** | `0` · `KUCHING · 7:00 PAGI` |
| **Peta** | Kosong; titik HUS mula berkelip pada "seorang pesakit" |
| **Bunyi** | Burung pagi → siren jauh → dengung rendah masuk |

### 1 · HARI 1 — Pesakit pertama — 0:10–0:21
| | |
|---|---|
| **VO** | "Seorang lelaki tiba di Hospital Umum Sarawak dengan demam panas… dan tingkah laku agresif. Menjelang malam, kejadian serupa dilaporkan di MetroCity dan Petra Jaya." |
| **Tajuk** | Hari 1 — **Pesakit** pertama. |
| **1a HUS kecemasan** (guna semula) | Siang. Ambulans di bawah kanopi kaca, lampu biru-merah. Seorang lelaki (kulit mula pucat) terhuyung keluar ambulans; dua petugas berbaju putih berundur. Papan biru "KECEMASAN". |
| **1b MetroCity, senja** (baru) | Deretan kedai 3–4 tingkat fasad **kaca hijau kebiruan** + bingkai putih, kaki lima berbumbung, menara kondo putih di hujung; papan nama kosong. Langit oren. **2–3 siluet** berjalan kaku di hujung deretan, mata kuning. |
| **Telefon** | Berita: *"Serangan dilaporkan di MetroCity & Petra Jaya"* |
| **HUD** | `1 PESAKIT` → `3%` · `HARI 1 / 7 · HUS` → `MetroCity` |
| **Peta** | Tompok kecil di HUS; 2 titik baru menyala (MetroCity, Petra Jaya) |
| **Bunyi** | Siren dekat; senja: cengkerik + geraman samar |

### 2 · HARI 2 — Kuching panik — 0:21–0:30
| | |
|---|---|
| **VO** | "Rakaman serangan di Waterfront menjadi tular. Pengunjung VivaCity dan The Spring bergegas keluar. Jalan ke Jambatan Satok mula sesak." |
| **Tajuk** | Hari 2 — Kuching **panik**. |
| **2a Telefon penuh fokus** | Video tular: Waterfront kabur dengan orang lari, butang ▶, kiraan tontonan berpusing `120K → 1.2J`, ikon komen 🔥 |
| **2b The Spring** (baru) | Bangunan **putih panjang berpanel**, jalur tingkap gelap mendatar, menara kaca di hujung, papan jenama kosong. Orang berlari keluar ke tempat letak kereta membawa beg; kereta beredar. (VivaCity sekilas 1s sebelum ini — fasad kiub kuning-coklat.) |
| **2c Jambatan Satok** (baru) | Jambatan gantung **menara kekisi besi putih**, kabel melengkung, dek panjang; jalan raya di tebing penuh kereta beratur, lampu brek merah. |
| **HUD** | `12%` kuning · `HARI 2 / 7 · WATERFRONT` → `JAMBATAN SATOK` |
| **Peta** | Tompok merebak ke Waterfront |
| **Bunyi** | Degupan jantung bermula; hon bertalu |

### 3 · HARI 3 — Bandar lumpuh — 0:30–0:39
| | |
|---|---|
| **VO** | "Sekolah ditutup. Di Jalan Tun Jugah, kereta ditinggalkan di tengah kesesakan. Rak pasar raya kosong akibat pembelian panik." |
| **Tajuk** | Hari 3 — Bandar **lumpuh**. |
| **Telefon** | Notis: *"SEMUA SEKOLAH DITUTUP"* |
| **3a Jalan Tun Jugah** (baru) | Jalan 3 lorong, langit mendung kelabu. Kereta **ditinggalkan**, pintu terbuka, lampu kecemasan kuning berkelip; beg terjatuh di jalan. Satu siluet jauh di antara kereta. |
| **3b Pasar raya** (guna semula) | Rak kosong, troli terbalik, kotak berselerak; tanda "STOK HABIS". |
| **HUD** | `28%` oren · `HARI 3 / 7 · JALAN TUN JUGAH` |
| **Bunyi** | Lampu kecemasan "tik-tik", degupan lebih laju |

### 4 · HARI 4 — Zon kecemasan — 0:39–0:51
| | |
|---|---|
| **VO** | "Kuching diisytiharkan zon kecemasan. Laluan keluar dikawal. Bas di Kuching Sentral tidak lagi bergerak. Penerbangan di Lapangan Terbang Antarabangsa Kuching dihentikan. Tetapi wabak terus merebak." |
| **Tajuk** | Hari 4 — Zon **kecemasan**. |
| **Telefon** | Amaran kecemasan **merah penuh skrin** berkelip: *"ZON KECEMASAN · KEKAL DI RUMAH"* |
| **4a Kuching Sentral luar** (baru) | Bumbung besar **melengkung macam sayap**, dinding panel **merah-oren berjalur kuning**, tiang kelabu menyerong. Di tempat letak kereta: penghadang jalur merah-putih, kon, trak tentera hijau umum, lampu suar. |
| **4b Platform bas** (baru) | Tiang kelabu berlabel **B2 / C2 / D2** merah, bas ekspres diam, papan elektronik **"PERJALANAN DIGANTUNG"**, penumpang duduk atas beg. |
| **4c LTAK** (guna semula) | Dewan berlepas kosong, papan penerbangan semua **"DIHENTIKAN"** merah. |
| **Akhir babak** | Pada "wabak terus merebak": peta mini tompok merah membesar laju |
| **HUD** | `45%` oren-merah · `HARI 4 / 7 · KUCHING SENTRAL` → `LTAK` |
| **Bunyi** | Nada amaran kecemasan telefon; pengumuman PA samar |

### 5 · HARI 5 — Bandar hantu — 0:51–0:58
| | |
|---|---|
| **VO** | "Waterfront kosong. Kedai-kedai di MetroCity tutup. Lampu jalan mula padam. Penduduk berlindung di dalam rumah." |
| **Tajuk** | Hari 5 — Bandar **hantu**. |
| **5a Waterfront malam** (guna semula) | Lantai bata, pagar besi, tanglung merah padam, **kabus hijau nipis** atas sungai, DUN siluet; satu figura berdiri diam di hujung tebingan. |
| **5b MetroCity malam** | Pintu gulung tertutup sepanjang deretan; **lampu jalan padam satu demi satu** ke arah kamera. |
| **5c Dalam rumah** | Intai dari celah langsir: bayang-bayang lalu di luar tingkap; tangan kanan tutup suis lampu → gelap. |
| **Telefon** | `Tiada isyarat` · bateri `18%` |
| **HUD** | `63%` merah · `HARI 5 / 7 · WATERFRONT` |
| **Bunyi** | Senyap, angin, satu bunyi tin jatuh jauh; lampu padam "klik" |

### 6 · HARI 6 — Pertahanan terakhir — 0:58–1:06
| | |
|---|---|
| **VO** | "Sekumpulan penduduk berkumpul di pusat perlindungan. Mereka menghubungi pasukan penyelamat melalui radio." |
| **Tajuk** | Hari 6 — Pertahanan **terakhir**. |
| **Set** (baru) | Dewan sekolah/komuniti: tilam di lantai, kotak air & makanan bertimbun, pintu besar dihalang meja dan kerusi; tingkap ditampal papan. |
| **Grafik** | Seorang memegang **walkie-talkie** (lampu hijau berkelip bila bercakap); lampu suluh menyapu dinding; penduduk duduk berkumpul. Pintu bergegar sedikit pada akhir babak. |
| **HUD** | `81%` merah berkelip · `HARI 6 / 7 · PUSAT PERLINDUNGAN` |
| **Bunyi** | Statik radio, suara samar "…diterima…", ketukan pintu 3 kali |

### 7 · HARI 7 — Kuching jatuh — 1:06–1:17
| | |
|---|---|
| **VO** | "Kumpulan terakhir dipindahkan dengan helikopter. Dari udara, Kuching sunyi. Jambatan Darul Hana masih berdiri… tetapi kehidupan bandar telah terhenti." |
| **Tajuk** | Hari 7 — Kuching **jatuh**. |
| **Set** | POV dari pintu terbuka helikopter (bingkai pintu, tali pemegang di tepi skrin), terbang perlahan di atas Sungai Sarawak waktu **subuh kelabu-biru**. |
| **Grafik** | Bawah: **Jambatan Darul Hana** — dek S putih, dua tiang menyerong bentuk A, pelantar bulat berbumbung kuning; **DUN** bumbung emas dan **Astana** di tebing seberang. Bandar tanpa lampu, kereta terbiar di jalan, kumpulan kecil titik-titik zombi bergerak perlahan. Kamera condong turun pada "Darul Hana masih berdiri". |
| **HUD** | `100%` merah berkelip · `HARI 7 / 7 · KUCHING` |
| **Peta** | Seluruh Kuching merah |
| **Bunyi** | Bilah helikopter, angin; muzik sayu perlahan |

### 8 · TWIST — Sibu — 1:17–1:27
| | |
|---|---|
| **VO** | "Kemudian… satu panggilan radio. 'Ini pusat kawalan… kami menerima laporan jangkitan baharu di Sibu.' Rupa-rupanya, Kuching hanyalah permulaan." |
| **Tajuk** | Kuching hanyalah **permulaan**. |
| **8a Kabin helikopter** | Radio di panel berkelip; sari kata ayat radio dalam fon **mesin taip hijau** (gaya transmisi). Peta mini zum keluar → **bentuk Sarawak**; titik **SIBU** berdenyut merah. |
| **8b Sibu, senja** (baru) | Statik penuh skrin 0.4s → **patung angsa putih** bersayap terbuka di atas batu, tebing sungai; **Wisma Sanyan** (menara kaca hijau-biru, kepala putih bulat) dan dataran rumput di latar. Lampu menyala, dataran kosong. Pada "permulaan": **satu siluet bermata kuning** muncul di hujung dataran. |
| **HUD** | Bertukar: `SIBU · KES BAHARU` merah |
| **Bunyi** | Statik radio → senyap → satu geraman jauh → dentuman bass |

### 9 · CTA — 1:27–1:36
| | |
|---|---|
| **VO** | "Kalau wabak zombi berlaku di Kuching… ke mana korang akan lari dulu? Tulis di ruang komen!" |
| **Tajuk** | Ke mana korang akan **lari**? 👇 |
| **Grafik** | Kekal di Sibu senja (siluet berdiri jauh), kamera bernafas perlahan; HUD dan peta pudar. |
| **Bunyi** | Dengung rendah pudar |

---

## C. Set Three.js
| Status | Set |
|---|---|
| Guna semula | Bilik tidur, HUS kecemasan, VivaCity luar, pasar raya, LTAK dalam, Waterfront + Darul Hana + DUN, peta Sarawak, helikopter (baru tapi ringkas) |
| Baru (ada rujukan) | MetroCity (siang/senja/malam), The Spring, Jambatan Satok, Kuching Sentral luar + platform, Sibu (patung angsa + Wisma Sanyan + dataran), Astana |
| Baru (tanpa rujukan, bentuk umum) | Jalan Tun Jugah, dalam rumah (langsir), dewan perlindungan, trak tentera, model zombi |
| Tidak dimodelkan | Logo/jenama kedai, iklan, nombor plat, wajah sebenar |
