#!/usr/bin/env python3
"""REWIND 2026 - Edisi Colour Block - SK Semerah Padi.

Penjana draf video (Pillow + MoviePy + ffmpeg).

    python3 rewind2026.py --res 480    # pratonton  -> output/preview_480p.mp4
    python3 rewind2026.py --res 1080   # draf penuh -> output/draft.mp4
    python3 rewind2026.py --res 480 --stills 20,95,200   # PNG semakan sahaja

Struktur folder:
    input/01 MERAH ... input/09 CAMPUR WARNA (finale)   (gambar; .HEIC diabaikan)
    audio/good_time.wav, audio/best_day.wav
    fonts/courier-prime-latin-{400,700}-normal.woff
"""
import argparse
import math
import multiprocessing as mp
import os
import random
import subprocess
import sys
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
FPS = 30
SEED = "rewind2026"

# ---------------------------------------------------------------- warna
C = dict(merah="#E53935", oren="#FB8C00", kuning="#FDD835", hijau="#43A047",
         biru="#1E88E5", ungu="#8E24AA", pink="#EC407A", hitam="#212121",
         putih="#FFFFFF")
TXT = dict(C, kuning="#F9A825")          # kuning untuk teks
INK = "#151515"                           # warna teks biasa
NINE = ["merah", "oren", "kuning", "hijau", "biru", "ungu", "pink", "hitam", "putih"]

FOLDERS = ["01 MERAH", "02 OREN & PEACH", "03 KUNING", "04 HIJAU", "05 BIRU",
           "06 UNGU", "07 PINK", "08 HITAM & PUTIH", "09 CAMPUR WARNA (finale)"]
HERO = "IMG_9590.jpg"                     # dalam 05 BIRU, simpan untuk finale

# ---------------------------------------------------------------- global (set in main)
W = H = 0
S = 1.0
G = {}      # timeline, diwarisi oleh proses pekerja (fork)


def px(v):
    return int(round(v * S))


@lru_cache(maxsize=None)
def font(weight, size):
    f = {"bold": "courier-prime-latin-700-normal.woff",
         "reg": "courier-prime-latin-400-normal.woff",
         "elite": "special-elite-latin-400-normal.woff"}[weight]
    return ImageFont.truetype(os.path.join(ROOT, "fonts", f), size)


def ease_out(p):
    p = min(1.0, max(0.0, p))
    return 1 - (1 - p) ** 3


def ease_io(p):
    p = min(1.0, max(0.0, p))
    return p * p * (3 - 2 * p)


# ---------------------------------------------------------------- gambar
def list_images(folder):
    d = os.path.join(ROOT, "input", folder)
    out = []
    for f in sorted(os.listdir(d)):
        if f.lower().endswith((".jpg", ".jpeg", ".png")):     # .HEIC diabaikan
            out.append(os.path.join(d, f))
    return out


@lru_cache(maxsize=48)
def load(path, max_side):
    im = Image.open(path)
    if im.format == "JPEG":
        im.draft("RGB", (max_side, max_side))
    im = ImageOps.exif_transpose(im)                           # betulkan orientasi EXIF
    im = im.convert("RGB")
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    return im


def cover(im, w, h, ybias=0.42):
    """Potong 'cover' ke w x h, sedikit ke atas (muka)."""
    iw, ih = im.size
    s = max(w / iw, h / ih)
    nw, nh = max(w, round(iw * s)), max(h, round(ih * s))
    im = im.resize((nw, nh), Image.LANCZOS)
    x = (nw - w) // 2
    y = int((nh - h) * ybias)
    return im.crop((x, y, x + w, y + h))


def framed(photo, border_color="#FFFFFF", border_frac=0.04):
    """Bingkai ~4% + bayang lembut. Pulang RGBA (pusat = pusat gambar)."""
    pw, ph = photo.size
    b = max(2, round(border_frac * min(pw, ph)))
    fw, fh = pw + 2 * b, ph + 2 * b
    sh = max(4, round(0.07 * min(fw, fh)))
    off = round(sh * 0.30)
    cw, ch = fw + 2 * sh, fh + 2 * sh
    shadow = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(shadow).rectangle((sh, sh + off, sh + fw, sh + fh + off), fill=95)
    shadow = shadow.filter(ImageFilter.GaussianBlur(sh / 2.6))
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    out.putalpha(shadow)
    card = Image.new("RGB", (fw, fh), border_color)
    if border_color.upper() == "#FFFFFF":
        ImageDraw.Draw(card).rectangle((0, 0, fw - 1, fh - 1), outline="#E6E6E6")
    card.paste(photo, (b, b))
    out.paste(card, (sh, sh))
    return out


@lru_cache(maxsize=24)
def single_asset(path, bw, zmax):
    im = load(path, px(1600))
    bw_w, bw_h = 0.74 * W * zmax, 0.76 * H * zmax
    s = min(bw_w / im.width, bw_h / im.height)
    ph = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    if bw:
        ph = ImageOps.grayscale(ph).convert("RGB")
    return framed(ph)


@lru_cache(maxsize=48)
def cell_asset(path, cw, ch, bw, border):
    im = load(path, px(1000))
    ph = cover(im, cw, ch)
    if bw:
        ph = ImageOps.grayscale(ph).convert("RGB")
    return framed(ph, border_color=border, border_frac=0.045 if border != "#FFFFFF" else 0.04)


@lru_cache(maxsize=2)
def full_asset(path, zmax):
    im = load(path, px(2400))
    return cover(im, round(W * zmax), round(H * zmax), ybias=0.5)


def paste_center(base, rgba, cx, cy, scale=1.0, alpha=1.0):
    if scale != 1.0:
        rgba = rgba.resize((max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale))),
                           Image.BILINEAR)
    if alpha < 1.0:
        a = rgba.getchannel("A").point(lambda v: int(v * alpha))
        rgba = rgba.copy()
        rgba.putalpha(a)
    base.paste(rgba, (round(cx - rgba.width / 2), round(cy - rgba.height / 2)), rgba)


# ---------------------------------------------------------------- teks / kad
def make_card(lines, t0, cpf=2, lead=0.25, gap=0.15, first_style=None, dots=None,
              yshift=0, big=120, body=70):
    """lines: senarai teks. first_style: span warna utk baris pertama."""
    starts, t = [], t0 + lead
    for txt in lines:
        starts.append(t)
        t += math.ceil(len(txt) / cpf) / FPS + gap
    typing_end = t - gap

    # susun atur
    sizes = [px(big)] + [px(body)] * (len(lines) - 1)
    maxw = 0.88 * W
    bodyf = font("reg", sizes[-1]) if len(lines) > 1 else None
    if bodyf:
        widest = max(bodyf.getlength(l) for l in lines[1:])
        if widest > maxw:
            nb = int(sizes[-1] * maxw / widest)
            sizes = [sizes[0]] + [nb] * (len(lines) - 1)
    lay, heights = [], []
    for i, txt in enumerate(lines):
        f = font("bold" if i == 0 else "reg", sizes[i])
        heights.append(sizes[i] * (1.45 if i == 0 else 1.55))
    block = sum(heights)
    top = H / 2 - block / 2 + px(yshift)
    y = top
    for i, txt in enumerate(lines):
        f = font("bold" if i == 0 else "reg", sizes[i])
        wline = f.getlength(txt)
        x = (W - wline) / 2
        base = y + sizes[i] * (1.05 if i == 0 else 1.05)
        spans = [(0, len(txt), INK, None)]
        if i == 0 and first_style:
            spans = first_style(txt)
        lay.append(dict(text=txt, x=x, y=base, size=sizes[i], bold=(i == 0), spans=spans,
                        start=starts[i]))
        y += heights[i]
    return dict(kind="card", lines=lay, cpf=cpf, typing_end=typing_end, dots=dots,
                bottom=top + block)


def first_word(color):
    def f(txt):
        k = txt.find(" ")
        k = len(txt) if k < 0 else k
        return [(0, k, color, None), (k, len(txt), INK, None)]
    return f


def hitam_putih(txt):
    a = txt.find("&")
    b = txt.find("putih")
    return [(0, a - 1, C["hitam"], None), (a - 1, b, INK, None),
            (b, len(txt), "#FFFFFF", INK)]


def rainbow_first(txt):
    k = txt.find(" ")
    cols = [TXT[n] for n in NINE[:8]]
    return [(i, i + 1, cols[i % len(cols)], None) for i in range(k)] + [(k, len(txt), INK, None)]


def visible(line, t, cpf):
    if t < line["start"]:
        return 0
    return min(len(line["text"]), int((t - line["start"]) * FPS) * cpf + cpf)


def draw_card(img, shot, t):
    d = ImageDraw.Draw(img)
    cur = None
    for ln in shot["lines"]:
        n = visible(ln, t, shot["cpf"])
        if n <= 0:
            continue
        f = font("bold" if ln["bold"] else "reg", ln["size"])
        for a, b, fill, stroke in ln["spans"]:
            b2 = min(b, n)
            if b2 <= a:
                continue
            x = ln["x"] + f.getlength(ln["text"][:a])
            if stroke:
                d.text((x, ln["y"]), ln["text"][a:b2], font=f, fill=fill, anchor="ls",
                       stroke_width=max(1, px(2)), stroke_fill=stroke)
            else:
                d.text((x, ln["y"]), ln["text"][a:b2], font=f, fill=fill, anchor="ls")
        cur = (ln, f, n)
    # kursor
    if cur:
        ln, f, n = cur
        typing = t < shot["typing_end"]
        if typing or int(t * 2.2) % 2 == 0:
            x = ln["x"] + f.getlength(ln["text"][:n]) + px(6)
            hgt = ln["size"] * 0.78
            d.rectangle((x, ln["y"] - hgt, x + max(2, ln["size"] * 0.09), ln["y"] + px(4)), fill=INK)
    # titik warna (pembuka / penutup)
    if shot.get("dots"):
        ds = shot["dots"]
        r, sp = px(17), px(62)
        cy = shot["bottom"] + px(70)
        x0 = W / 2 - sp * 4
        for i, name in enumerate(NINE):
            ta = ds["t0"] + i * ds["step"]
            p = ease_out((t - ta) / 0.22)
            if p <= 0:
                continue
            rr = r * (0.4 + 0.6 * p) * (1 + 0.25 * math.sin(math.pi * p))
            cx = x0 + i * sp
            d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=C[name],
                      outline="#9E9E9E" if name == "putih" else None, width=max(1, px(2)))


# ---------------------------------------------------------------- grid
def grid_rects(n):
    if n == 4:
        cw, ch, gap, cols = 573, 430, 46, 2
    else:
        cw, ch, gap, cols = 387, 290, 32, 3
    cw, ch, gap = px(cw), px(ch), px(gap)
    tw, th = cols * cw + (cols - 1) * gap, cols * ch + (cols - 1) * gap
    x0, y0 = (W - tw) / 2, (H - th) / 2
    return [(x0 + (i % cols) * (cw + gap) + cw / 2, y0 + (i // cols) * (ch + gap) + ch / 2, cw, ch)
            for i in range(n)]


def draw_grid(img, shot, t):
    rects = grid_rects(len(shot["paths"]))
    tcol = shot.get("color_at")
    for i, (path, ta) in enumerate(zip(shot["paths"], shot["appear"])):
        p = ease_out((t - ta) / 0.28)
        if p <= 0:
            continue
        cx, cy, cw, ch = rects[i]
        border = shot["borders"][i] if shot.get("borders") else "#FFFFFF"
        if tcol is not None:
            c = ease_io((t - tcol) / 0.25)
            a = cell_asset(path, cw, ch, True, border)
            if c > 0:
                b = cell_asset(path, cw, ch, False, border)
                a = Image.blend(a, b, c) if c < 1 else b
        else:
            a = cell_asset(path, cw, ch, False, border)
        paste_center(img, a, cx, cy, scale=0.88 + 0.12 * p, alpha=p)


# ---------------------------------------------------------------- shot render
ZMAX = 1.05


def draw_single(img, shot, t):
    prog = (t - shot["t0"]) / max(0.01, shot["t1"] - shot["t0"])
    z = 1.0 + 0.05 * min(1.0, max(0.0, prog))            # zoom 100 -> 105%
    if shot.get("color_at") is not None:
        c = ease_io((t - shot["color_at"]) / 0.22)
        a = single_asset(shot["path"], True, ZMAX)
        if c > 0:
            b = single_asset(shot["path"], False, ZMAX)
            a = Image.blend(a, b, c) if c < 1 else b
    else:
        a = single_asset(shot["path"], False, ZMAX)
    paste_center(img, a, W / 2, H / 2 + px(6), scale=z / ZMAX)


def draw_full(img, shot, t):
    zmax = 1.12
    prog = ease_io((t - shot["t0"]) / max(0.01, shot["t1"] - shot["t0"]))
    z = zmax - (zmax - 1.0) * prog                        # zoom keluar perlahan
    a = full_asset(shot["path"], zmax)
    s = z / zmax
    im = a.resize((max(W, round(a.width * s)), max(H, round(a.height * s))), Image.BILINEAR)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    img.paste(im.crop((x, y, x + W, y + H)), (0, 0))


DRAW = dict(card=draw_card, single=draw_single, grid=draw_grid, full=draw_full)


def draw_shot(img, shot, t):
    DRAW[shot["kind"]](img, shot, t)


def segment_dot(img, seg):
    d = ImageDraw.Draw(img)
    cy = px(64)
    if seg.get("dot") == "nine":
        r, sp = px(9), px(27)
        x0 = W - px(64) - sp * 8
        for i, n in enumerate(NINE):
            cx = x0 + i * sp
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=C[n],
                      outline="#9E9E9E" if n == "putih" else None, width=max(1, px(1.5)))
    elif seg.get("dot"):
        r = px(15)
        cx = W - px(64)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=C[seg["dot"]])


def render(i):
    t = i / FPS
    img = Image.new("RGB", (W, H), "white")
    seg = next((s for s in G["segs"] if s["start"] <= t < s["end"]), None)
    if seg is None:
        return img
    shots = seg["shots"]
    k = next((j for j, s in enumerate(shots) if s["t0"] <= t < s["t1"]), None)
    if k is not None:
        shot = shots[k]
        xf = shot.get("xfade", 0)
        if xf and k > 0 and t - shot["t0"] < xf:
            a = Image.new("RGB", (W, H), "white")
            draw_shot(a, shots[k - 1], t)
            b = Image.new("RGB", (W, H), "white")
            draw_shot(b, shot, t)
            img = Image.blend(a, b, ease_io((t - shot["t0"]) / xf))
        else:
            draw_shot(img, shot, t)
    segment_dot(img, seg)
    fo = seg.get("fade_out", 0.3)
    f = (t - (seg["end"] - fo)) / fo if fo else 0
    if f > 0:
        img = Image.blend(img, Image.new("RGB", (W, H), "white"), min(1.0, f))
    return img


def render_bytes(i):
    return render(i).tobytes()


# ---------------------------------------------------------------- muzik / beat
def beat_times(path):
    import librosa
    y, sr = librosa.load(path, sr=22050, mono=True)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr)
    bt = librosa.frames_to_time(frames, sr=sr)
    return float(np.atleast_1d(tempo)[0]), bt


def extend_beats(bt, until):
    bt = list(bt)
    step = float(np.median(np.diff(bt)))
    while bt[-1] < until:
        bt.append(bt[-1] + step)
    return np.array(bt)


def snap(beats, t):
    return float(beats[np.argmin(np.abs(beats - t))])


# ---------------------------------------------------------------- timeline
def pick(folder, exclude=()):
    files = [f for f in list_images(folder) if os.path.basename(f) not in exclude]
    rng = random.Random(f"{SEED}-{folder}")
    k = min(len(files), rng.randint(10, 15))
    return rng.sample(files, k)


def image_run(seg, beats, t_start, files, bps=4, ncell=9, bw=False, xfade=0.0):
    t_end = seg["end"]
    bb = [b for b in beats if t_start - 1e-3 <= b < t_end - 0.35]
    if not bb or abs(bb[0] - t_start) > 1e-3:
        bb = [t_start] + bb
    hold = 2
    n_single = max(1, (len(bb) - ncell - hold) // bps)
    shots = []
    for k in range(n_single):
        a, b = bb[k * bps], bb[(k + 1) * bps]
        sh = dict(kind="single", t0=a, t1=b, path=files[k % len(files)], xfade=xfade)
        if bw:
            sh["color_at"] = bb[k * bps + bps // 2]
        shots.append(sh)
    g0 = n_single * bps
    rest = files[n_single:] + files[:n_single]
    paths = (rest * 2)[:ncell]
    appear = [bb[min(g0 + j, len(bb) - 1)] for j in range(ncell)]
    grid = dict(kind="grid", t0=bb[g0], t1=t_end, paths=paths, appear=appear)
    if bw:
        grid["color_at"] = bb[min(g0 + ncell, len(bb) - 1)]
    shots.append(grid)
    return shots


def build_timeline(bt1, bt2):
    segs = []
    clicks = []           # masa ketukan mesin taip

    # ---- lagu
    S1, S1_LEN = 12.0, 103.5                 # good_time: 0:12, potong ~1:45, fade 1s
    S2 = 125.0                               # best_day: 2:05 dari awal lagu
    b1 = S1 + extend_beats(bt1, S1_LEN)
    b1 = b1[b1 < S1 + S1_LEN]
    b2 = S2 + extend_beats(bt2, 140)
    TOTAL = 241.0

    # ---- pembuka 0:00 - 0:12 (senyap)
    card = make_card(["2026.", "Satu tahun.", "Sembilan warna.", "Ini cerita kita."],
                     0.0, lead=0.8, gap=1.15, big=150, yshift=-50,
                     dots=dict(t0=0, step=0.32))
    card["dots"]["t0"] = card["typing_end"] + 0.7
    card.update(t0=0.0, t1=12.0)
    segs.append(dict(name="pembuka", start=0.0, end=12.0, shots=[card], dot=None))
    clicks += card_clicks(card)
    G["bell"] = [card["typing_end"] + 0.12]

    # ---- bahagian 1 (good_time)
    p1 = [
        ("merah", "01 MERAH", ["Merah.", "Warna semangat.", "Warna kita bermula."], 12.0, 40.0, 9),
        ("oren", "02 OREN & PEACH", ["Oren.", "Hangat.", "seperti gelak dan tawa di bilik guru."], 40.0, 65.0, 4),
        ("kuning", "03 KUNING", ["Kuning.", "Cerah.", "Setiap hari ada sebab untuk senyum."], 65.0, 90.0, 9),
        ("hijau", "04 HIJAU", ["Hijau.", "Tenang.", "Kerja banyak, hati tetap senang. mena kah??."], 90.0, 115.0, 4),
    ]
    for name, folder, lines, a, b, ncell in p1:
        a = a if a == 12.0 else snap(b1, a)
        b = 115.0 if name == "hijau" else snap(b1, b)
        seg = dict(name=name, start=a, end=b, dot=name)
        card = make_card(lines, a, first_style=first_word(TXT[name]))
        img_t = float(b1[b1 >= card["typing_end"] + 1.5][0])
        card.update(t0=a, t1=img_t)
        seg["shots"] = [card] + image_run(seg, b1, img_t, pick(folder), ncell=ncell)
        segs.append(seg)

    # ---- biru: kad ditaip dalam senyap 1:55, imej dari 2:05 (best_day)
    end_biru = snap(b2, 150.0)
    seg = dict(name="biru", start=115.0, end=end_biru, dot="biru")
    card = make_card(["Biru.", "Bila semua sedondon,", "baru kita sedar…", "kita satu pasukan."],
                     115.0, lead=0.7, gap=1.25, first_style=first_word(TXT["biru"]))
    card.update(t0=115.0, t1=S2)
    clicks += card_clicks(card)
    G["bell"].append(card["typing_end"] + 0.12)
    seg["shots"] = [card] + image_run(seg, b2, S2, pick("05 BIRU", exclude=(HERO,)), ncell=9)
    segs.append(seg)

    # ---- bahagian 2
    p2 = [
        ("ungu", "06 UNGU", ["Ungu.", "Lembut.", "Penuh kenangan."], 150.0, 170.0,
         dict(ncell=4, bps=8, xfade=0.55), first_word(TXT["ungu"]), 1),
        ("pink", "07 PINK", ["Pink.", "Manis.", "Sebab cikgu pun manis-manis."], 170.0, 190.0,
         dict(ncell=9), first_word(TXT["pink"]), 2),
        ("hitam", "08 HITAM & PUTIH", ["Hitam & putih.", "Tak semua gambar dirancang…",
                                       "dan itu yang paling kita suka."], 190.0, 210.0,
         dict(ncell=4, bw=True), hitam_putih, 2),
    ]
    for name, folder, lines, a, b, kw, style, cpf in p2:
        a, b = segs[-1]["end"], snap(b2, b)
        seg = dict(name=name, start=a, end=b, dot=name)
        card = make_card(lines, a, first_style=style, cpf=cpf,
                         gap=0.3 if name == "ungu" else 0.15)
        hold = 2.0 if name == "ungu" else 1.5
        img_t = float(b2[b2 >= card["typing_end"] + hold][0])
        card.update(t0=a, t1=img_t)
        seg["shots"] = [card] + image_run(seg, b2, img_t, pick(folder), **kw)
        segs.append(seg)

    # ---- finale
    a, b = segs[-1]["end"], snap(b2, 230.0)
    seg = dict(name="finale", start=a, end=b, dot="nine")
    card = make_card(["Lain warna.", "Lain cerita.", "Satu keluarga."], a, first_style=rainbow_first)
    g0 = float(b2[b2 >= card["typing_end"] + 1.5][0])
    card.update(t0=a, t1=g0)
    rng = random.Random(f"{SEED}-palette")
    pal = []
    for f in FOLDERS:
        files = [x for x in list_images(f) if os.path.basename(x) != HERO]
        pal.append(rng.choice(files))
    gb = b2[b2 >= g0 - 1e-3]
    grid = dict(kind="grid", t0=g0, t1=float(gb[12]), paths=pal,
                appear=[float(x) for x in gb[:9]],
                borders=[C[n] if n != "putih" else "#FFFFFF" for n in NINE])
    hero = os.path.join(ROOT, "input", "05 BIRU", HERO)
    full = dict(kind="full", t0=float(gb[12]), t1=b, path=hero, xfade=0.6)
    seg["shots"] = [card, grid, full]
    segs.append(seg)

    # ---- penutup
    a = segs[-1]["end"]
    card = make_card(["SK Semerah Padi 2026", "Tahun yang penuh warna dan cerita."], a,
                     lead=0.4, gap=0.5, yshift=-50, big=104, dots=dict(t0=0, step=0.18))
    card["dots"]["t0"] = card["typing_end"] + 0.5
    card.update(t0=a, t1=TOTAL)
    segs.append(dict(name="penutup", start=a, end=TOTAL, shots=[card], dot=None, fade_out=1.6))

    G.update(segs=segs, total=TOTAL, S1=S1, S1_LEN=S1_LEN, S2=S2, clicks=clicks)
    return G


def card_clicks(card):
    out = []
    for ln in card["lines"]:
        nframes = math.ceil(len(ln["text"]) / card["cpf"])
        for k in range(0, nframes, 2):
            out.append(ln["start"] + k / FPS)
    return out


# ---------------------------------------------------------------- audio
def typewriter_track(total, clicks, bells, sr=44100):
    rng = np.random.default_rng(7)
    out = np.zeros(int(total * sr) + sr, dtype=np.float32)
    n = int(0.035 * sr)
    tt = np.arange(n) / sr
    for t in clicks:
        noise = rng.standard_normal(n).astype(np.float32)
        noise = np.diff(noise, prepend=0)                     # high-pass kasar
        snapc = noise * np.exp(-tt / 0.0035) * 0.35
        thump = np.sin(2 * np.pi * rng.uniform(140, 190) * tt) * np.exp(-tt / 0.012) * 0.45
        s = (snapc + thump) * rng.uniform(0.6, 1.0)
        i = int(t * sr)
        out[i:i + n] += s[: len(out) - i]
    nb = int(1.2 * sr)
    tb = np.arange(nb) / sr
    bell = (np.sin(2 * np.pi * 2093 * tb) + 0.4 * np.sin(2 * np.pi * 4186 * tb)) * np.exp(-tb / 0.35) * 0.18
    for t in bells:
        i = int(t * sr)
        out[i:i + nb] += bell[: len(out) - i]
    peak = np.abs(out).max()
    if peak > 0:
        out *= 0.32 / peak                                    # klik lembut (~-10 dBFS)
    return np.stack([out, out], axis=1)


def normalized(name):
    """Samakan kelantangan kedua-dua lagu (loudnorm -14 LUFS), cache dalam output/."""
    src = os.path.join(ROOT, "audio", f"{name}.wav")
    dst = os.path.join(ROOT, "output", f"_{name}_norm.wav")
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af",
                        "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", dst], check=True)
    return dst


def build_audio(path_out):
    from moviepy import AudioFileClip, CompositeAudioClip, afx
    from moviepy.audio.AudioClip import AudioArrayClip
    total = G["total"]
    s1 = (AudioFileClip(normalized("good_time"))
          .subclipped(0, G["S1_LEN"]).with_effects([afx.AudioFadeOut(1.0)]).with_start(G["S1"]))
    s2_len = total - G["S2"]
    s2 = (AudioFileClip(normalized("best_day"))
          .subclipped(0, s2_len).with_effects([afx.AudioFadeOut(4.0)]).with_start(G["S2"]))
    tw = AudioArrayClip(typewriter_track(total, G["clicks"], G["bell"]), fps=44100)
    mix = CompositeAudioClip([tw, s1, s2]).with_duration(total)
    mix.write_audiofile(path_out, fps=44100, nbytes=2, codec="pcm_s16le", logger=None)


# ---------------------------------------------------------------- main
def main():
    global W, H, S
    ap = argparse.ArgumentParser()
    ap.add_argument("--res", type=int, default=480, choices=[480, 720, 1080])
    ap.add_argument("--out", default=None)
    ap.add_argument("--stills", default=None, help="senarai saat, cth 5,20,200")
    ap.add_argument("--jobs", type=int, default=os.cpu_count())
    args = ap.parse_args()

    H = args.res
    W = {480: 854, 720: 1280, 1080: 1920}[H]
    S = H / 1080

    tempo1, bt1 = beat_times(os.path.join(ROOT, "audio", "good_time.wav"))
    tempo2, bt2 = beat_times(os.path.join(ROOT, "audio", "best_day.wav"))
    print(f"good_time ~{tempo1:.0f} BPM, best_day ~{tempo2:.0f} BPM")
    build_timeline(bt1, bt2)
    for s in G["segs"]:
        print(f"  {s['name']:8s} {s['start']:7.2f} -> {s['end']:7.2f}  shots={len(s['shots'])}")

    os.makedirs(os.path.join(ROOT, "output"), exist_ok=True)
    if args.stills:
        for x in args.stills.split(","):
            p = os.path.join(ROOT, "output", f"still_{H}p_{float(x):06.2f}.png")
            render(int(float(x) * FPS)).save(p)
            print("still", p)
        return

    out = args.out or os.path.join(ROOT, "output", "draft.mp4" if H == 1080 else f"preview_{H}p.mp4")
    wav = os.path.join(ROOT, "output", "_audio.wav")
    build_audio(wav)
    n = int(round(G["total"] * FPS))
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav,
           "-c:v", "libx264", "-preset", "veryfast" if H < 1080 else "medium",
           "-crf", "23" if H < 1080 else "19", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    ctx = mp.get_context("fork")
    with ctx.Pool(args.jobs) as pool:
        for k, buf in enumerate(pool.imap(render_bytes, range(n), chunksize=8)):
            ff.stdin.write(buf)
            if k % (FPS * 10) == 0:
                print(f"  frame {k}/{n} ({k / FPS:.0f}s)", flush=True)
    ff.stdin.close()
    ff.wait()
    print("siap:", out)


if __name__ == "__main__":
    main()
