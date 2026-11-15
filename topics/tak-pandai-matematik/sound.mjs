// Sound bed synthesised from script.json timing, mixed under the voiceover.
//   node topics/tak-pandai-matematik/sound.mjs -> sfx.wav + audio.wav (VO + SFX)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(DIR, 'script.json'), 'utf8'));
const E = script.events, SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
const SR = 44100, DUR = script.duration, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 23; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };

// ambience per scene
let a1 = 0, a2 = 0;
const AMB = { rumah: [0.02, 0.25], laksa: [0.08, 0.8], satok: [0.06, 0.6], terubuk: [0.1, 0.9], atm: [0.07, 0.7], jalan: [0.05, 0.9], airportLuar: [0.04, 0.6],
  airportDalam: [0.06, 0.7], hospitalLuar: [0.04, 0.5], farmasi: [0.03, 0.35], jambatan: [0.03, 0.6], loji: [0.02, 0.5], gelap: [0.01, 0.4], twist: [0.01, 0.12], cta: [0.01, 0.1] };
for (let i = 0; i < N; i++) {
  const t = i / SR; const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
  const [k, lvl] = AMB[sc.id];
  a1 += k * (rnd() - a1); a2 += 0.02 * (a1 - a2);
  const fade = Math.min(1, (t - sc.start) / 0.3, (sc.end - t) / 0.3 + 0.2);
  add(i, (a1 - a2) * lvl * fade * 0.9, Math.sin(t * 0.3) * 0.3);
}
// music: playful plucks in the morning → tense pulse → heavy drone → soft piano
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const playful = 1 - sm(SC.atm.start, SC.jalan.start, t);
  const note = [523, 659, 784, 659][Math.floor(t * 4) % 4];
  const pluck = Math.sin(2 * Math.PI * note * t) * Math.exp(-((t * 4) % 1) * 10) * 0.05 * playful;
  const tense = sm(SC.atm.start, SC.loji.start, t) * (1 - sm(SC.twist.start - 0.5, SC.twist.start + 0.5, t));
  const beat = Math.exp(-((t * (2 + tense)) % 1) * 9);
  const pulse = Math.sin(2 * Math.PI * 55 * t) * beat * 0.12 * tense;
  const drone = (Math.sin(2 * Math.PI * 82.4 * t) + 0.5 * Math.sin(2 * Math.PI * 87.3 * t)) * sm(SC.jambatan.start, SC.loji.start, t) * (1 - sm(SC.twist.start - 0.5, SC.twist.start, t)) * 0.06;
  const pad = sm(SC.twist.start, SC.twist.start + 2, t) * (1 - sm(DUR - 2.5, DUR, t)) * 0.05 * (Math.sin(2 * Math.PI * 261.6 * t) + 0.8 * Math.sin(2 * Math.PI * 329.6 * t) + 0.6 * Math.sin(2 * Math.PI * 392 * t));
  add(i, pluck + pulse + drone + pad);
}
const tone = (t0, f, dur, vol, decay = 8) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * vol); } };
const thump = (t0, vol = 0.8, f0 = 60) => { for (let i = 0; i < 1.2 * SR; i++) { const t = i / SR; const f = f0 * (1 + 2 * Math.exp(-t * 18)); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.5) * vol); } };
const whoosh = (t0, dur, vol = 0.4) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; const k = 0.02 + 0.3 * Math.sin(Math.PI * t / dur); lp += k * (rnd() - lp); add(Math.floor((t0 + t) * SR), lp * vol * Math.sin(Math.PI * t / dur) * 3, (t / dur - 0.5)); } };
const click = (t0, vol = 0.2) => { for (let i = 0; i < 0.015 * SR; i++) add(Math.floor(t0 * SR) + i, rnd() * vol * (1 - i / (0.015 * SR))); };
const buzz = (t0, dur, f = 100, vol = 0.08) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sign(Math.sin(2 * Math.PI * f * t)) * vol * (1 - t / dur)); } };
const horn = (t0, f = 440) => { for (let i = 0; i < 0.35 * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), (Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.5 + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.5) * 0.05, 0.4); } };
const siren = (t0, dur) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; const f = 700 + 250 * Math.sin(t * 5); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * 0.025 * Math.min(1, t, dur - t)); } };

for (const s of script.scenes.slice(1)) if (s.id !== 'cta') whoosh(s.start - 0.35, 0.7, 0.3);
for (let k = 0; k < 10; k++) { tone(E.alarm - 1.6 + k * 0.25, 1760, 0.12, 0.08, 20); }
for (let k = 0; k < 8; k++) click(E.pulang + 0.2 + k * 0.12, 0.25);
tone(E.timbang, 1200, 0.15, 0.08, 12); thump(E.mahal, 0.5, 70);
buzz(E.tutup, 1.0, 60, 0.06); thump(E.tutup, 0.5, 60);
for (let k = 0; k < 12; k++) horn(E.lumpuh - 0.5 + k * 0.32, [440, 392, 523][k % 3]);
tone(SC.airportDalam.start + 0.2, 659, 0.9, 0.08, 3); tone(SC.airportDalam.start + 0.55, 523, 1.0, 0.08, 3); for (let k = 0; k < 7; k++) click(E.batal + k * 0.22, 0.15);
thump(E.duaPuluh, 0.6, 65); for (let k = 0; k < 6; k++) tone(SC.farmasi.start + k * 0.9, 1000, 0.08, 0.04, 30);
thump(E.takJumpa, 1.0, 45); tone(E.takJumpa + 0.15, 180, 0.8, 0.12, 4);
for (let k = 0; k < 6; k++) { tone(E.klorin + k * 0.5, 880, 0.2, 0.06, 10); } buzz(E.padam - 0.4, 0.8, 100, 0.08); thump(E.padam, 0.9, 40);
siren(SC.gelap.start + 0.5, 6.5);
for (const [t0, f] of [[E.laksaIcon, 523], [E.jambatanIcon, 587], [E.airIcon, 659], [E.nyawaIcon, 784]]) tone(t0, f, 2, 0.1, 1.5);

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
