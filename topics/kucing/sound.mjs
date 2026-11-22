// Sound bed synthesised from script.json timing, mixed under the voiceover.
//   node topics/kucing/sound.mjs -> sfx.wav + audio.wav (VO + SFX)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(DIR, 'script.json'), 'utf8'));
const E = script.events, SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
const SR = 44100, DUR = script.duration, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };

// ambience per scene
let a1 = 0, a2 = 0;
const AMB = { hook: [0.04, 0.4], taman: [0.03, 0.35], makanan: [0.05, 0.4], kos: [0.05, 0.4], najis: [0.04, 0.5], anak: [0.04, 0.4], setahun: [0.2, 0.6], pengajaran: [0.02, 0.25], cta: [0.01, 0.15] };
for (let i = 0; i < N; i++) {
  const t = i / SR; const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
  const [k, lvl] = AMB[sc.id];
  a1 += k * (rnd() - a1); a2 += 0.02 * (a1 - a2);
  const fade = Math.min(1, (t - sc.start) / 0.3, (sc.end - t) / 0.3 + 0.2);
  add(i, (a1 - a2) * lvl * fade * 0.9, Math.sin(t * 0.3) * 0.3);
}
// music: plucky ukulele-ish strum + marimba, speeding a little as numbers grow; soft piano for the lesson
const CH = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const lesson = sm(SC.pengajaran.start - 0.5, SC.pengajaran.start + 0.5, t);
  const bpm = 2.0 + 0.6 * sm(SC.makanan.start, SC.setahun.end, t);
  const beat = t * bpm, bar = Math.floor(beat / 4) % 4, ph = beat % 1;
  const ch = CH[bar]; let strum = 0;
  ch.forEach((f, k) => { const p = Math.max(0, ph - k * 0.03); strum += (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-p * 7); });
  const mel = [523.3, 587.3, 659.3, 784, 659.3, 587.3, 523.3, 392][Math.floor(beat * 2) % 8];
  const mar = Math.sin(2 * Math.PI * mel * t) * Math.exp(-((beat * 2) % 1) * 10) * 0.05;
  const pad = lesson * (1 - sm(DUR - 2.5, DUR, t)) * 0.04 * (Math.sin(2 * Math.PI * 261.6 * t) + 0.8 * Math.sin(2 * Math.PI * 329.6 * t) + 0.6 * Math.sin(2 * Math.PI * 392 * t));
  add(i, (strum * 0.03 + mar) * (1 - lesson * 0.8) * sm(0.2, 1.0, t) + pad);
}
const tone = (t0, f, dur, vol, decay = 8) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * vol); } };
const whoosh = (t0, dur, vol = 0.4) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; const k = 0.02 + 0.3 * Math.sin(Math.PI * t / dur); lp += k * (rnd() - lp); add(Math.floor((t0 + t) * SR), lp * vol * Math.sin(Math.PI * t / dur) * 3, (t / dur - 0.5)); } };
const meow = (t0, base = 520, vol = 0.12, dur = 0.55) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR, u = t / dur; const f = base * (1 + 0.5 * Math.sin(Math.PI * u) - 0.25 * u); const env = Math.sin(Math.PI * Math.min(1, u * 1.2)) * Math.exp(-u * 1.5);
  add(Math.floor((t0 + t) * SR), (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(4 * Math.PI * f * t) + 0.25 * Math.sin(6 * Math.PI * f * t)) * env * vol, 0.2); } };
const ching = t0 => { tone(t0, 2093, 0.4, 0.1, 9); tone(t0 + 0.06, 2637, 0.5, 0.08, 7); };
const horn = (t0, f) => { for (let i = 0; i < 0.3 * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.035 * Math.min(1, t * 20)); } };
const purr = (t0, dur) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), rnd() * Math.pow(Math.max(0, Math.sin(2 * Math.PI * 26 * t)), 3) * 0.12 * Math.min(1, t, dur - t)); } };
const thud = (t0, vol = 0.3) => { for (let i = 0; i < 0.2 * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 25) * vol); } };

for (const s of script.scenes.slice(1)) if (s.id !== 'cta') { whoosh(s.start - 0.3, 0.6, 0.25); meow(s.start - 0.05, 560 + (s.start * 7) % 160); }
meow(E.baharu + 0.2, 620, 0.14);
for (const k of ['jumlah1', 'tan98', 'beg', 'sen90', 'rm147', 'rm44', 'tan65', 'tan195', 'anak65', 'jumlah2', 'tan3500', 'rm53']) ching(E[k] + 0.75);
for (let k = 0; k < 10; k++) thud(E.darab1 + k * 0.32, 0.2);
for (let k = 0; k < 14; k++) ching(E.darab2 + k * 0.28);
horn(SC.najis.start + 0.6, 330); horn(SC.najis.start + 1.0, 392);
for (let k = 0; k < 8; k++) meow(E.anak65 + k * 0.28, 820 + (k % 3) * 90, 0.07, 0.35);
purr(E.bandar, SC.cta.end - E.bandar);

let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
const sfx = path.join(DIR, 'sfx.wav'); fs.writeFileSync(sfx, buf); console.log(sfx);

const vo = path.join(DIR, script.voiceover), out = path.join(DIR, 'audio.wav');
const r = spawnSync('ffmpeg', ['-y', '-i', vo, '-i', sfx, '-filter_complex',
  `[0:a]aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur=${DUR},asplit=2[vo][sc];` +
  `[1:a]volume=0.5[bed];[bed][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[duck];` +
  `[vo][duck]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[out]`,
  '-map', '[out]', '-ar', '44100', '-t', String(DUR), out], { stdio: ['ignore', 'ignore', 'pipe'] });
if (r.status) { console.error(r.stderr.toString().slice(-800)); process.exit(1); }
console.log(out);
