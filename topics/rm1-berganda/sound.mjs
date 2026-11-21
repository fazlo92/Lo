// Sound bed synthesised from script.json timing, mixed under the voiceover.
//   node topics/rm1-berganda/sound.mjs -> sfx.wav + audio.wav (VO + SFX)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(DIR, 'script.json'), 'utf8'));
const E = script.events, SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
const SR = 44100, DUR = script.duration, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 41; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };

// ambience per scene
let a1 = 0, a2 = 0;
const AMB = { hook: [0.04, 0.4], kopitiam: [0.08, 0.7], kedai: [0.05, 0.4], motor: [0.03, 0.3], kereta: [0.03, 0.3], belum: [0.03, 0.4], jutawan: [0.06, 0.6],
  langit: [0.2, 0.9], separuh: [0.01, 0.2], klimaks: [0.05, 0.5], eksponen: [0.01, 0.15], cta: [0.01, 0.15] };
for (let i = 0; i < N; i++) {
  const t = i / SR; const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
  const [k, lvl] = AMB[sc.id];
  a1 += k * (rnd() - a1); a2 += 0.02 * (a1 - a2);
  const fade = Math.min(1, (t - sc.start) / 0.3, (sc.end - t) / 0.3 + 0.2);
  add(i, (a1 - a2) * lvl * fade * 0.9, Math.sin(t * 0.3) * 0.3);
}
// music: playful pulse that speeds up with each day; hush on day 29; bright chord on day 30
const D = Array.from({ length: 30 }, (_, k) => E['d' + (k + 1)]);
for (let i = 0; i < N; i++) {
  const t = i / SR; let d = 0; for (let k = 0; k < 30; k++) if (t >= D[k]) d = k + 1;
  const hush = sm(D[28], D[28] + 0.3, t) * (1 - sm(D[29] - 0.2, D[29], t));
  const bpm = 1.6 + d * 0.07, ph = (t * bpm) % 1;
  const kick = Math.sin(2 * Math.PI * 55 * t * (1 + Math.exp(-ph * 20))) * Math.exp(-ph * 9) * 0.14;
  const notes = [261.6, 329.6, 392, 523.3]; const n = notes[Math.floor(t * bpm * 2) % 4] * (d >= 21 ? 1.5 : 1);
  const pluck = Math.sin(2 * Math.PI * n * t) * Math.exp(-((t * bpm * 2) % 1) * 8) * 0.05;
  const on = sm(D[0] - 0.5, D[0], t) * (1 - sm(E.inilah - 0.5, E.inilah, t)) * (1 - hush);
  const pad = sm(E.inilah, E.inilah + 1.5, t) * (1 - sm(DUR - 2.5, DUR, t)) * 0.045 * (Math.sin(2 * Math.PI * 261.6 * t) + 0.8 * Math.sin(2 * Math.PI * 329.6 * t) + 0.6 * Math.sin(2 * Math.PI * 392 * t));
  add(i, (kick + pluck) * on + pad);
}
const tone = (t0, f, dur, vol, decay = 8) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * vol); } };
const thump = (t0, vol = 0.8, f0 = 60) => { for (let i = 0; i < 1.2 * SR; i++) { const t = i / SR; const f = f0 * (1 + 2 * Math.exp(-t * 18)); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.5) * vol); } };
const whoosh = (t0, dur, vol = 0.4) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; const k = 0.02 + 0.3 * Math.sin(Math.PI * t / dur); lp += k * (rnd() - lp); add(Math.floor((t0 + t) * SR), lp * vol * Math.sin(Math.PI * t / dur) * 3, (t / dur - 0.5)); } };
const coin = (t0, f) => { tone(t0, f, 0.4, 0.1, 9); tone(t0 + 0.05, f * 1.5, 0.35, 0.07, 10); };
const crowd = (t0, dur, vol) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; lp += 0.12 * (rnd() - lp); add(Math.floor((t0 + t) * SR), lp * vol * Math.sin(Math.PI * t / dur) * (0.7 + 0.3 * Math.sin(t * 13)), rnd() * 0.4); } };
const pop = (t0, vol = 0.25) => { for (let i = 0; i < 0.25 * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), rnd() * Math.exp(-t * 18) * vol, rnd() - 0.5); } };

for (const s of script.scenes.slice(1)) if (s.id !== 'cta') whoosh(s.start - 0.35, 0.6, 0.25);
D.forEach((t0, k) => coin(t0 + 0.05, 880 * Math.pow(2, k / 24)));
crowd(E.ketawa, 1.6, 0.25);
thump(D[19] + 0.5, 0.4, 70);
thump(D[20], 0.9, 45); crowd(D[20] + 0.1, 2.5, 0.45); for (let k = 0; k < 6; k++) pop(D[20] + 0.2 + k * 0.2);
for (let k = 0; k < 6; k++) { const t0 = D[29] + 0.3 + k * 0.55; whoosh(t0 - 0.3, 0.3, 0.2); thump(t0, 0.5, 90); for (let j = 0; j < 8; j++) pop(t0 + 0.05 + j * 0.06, 0.08); }
crowd(D[29] + 0.2, 3.0, 0.35);

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
