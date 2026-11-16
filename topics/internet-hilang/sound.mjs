// Sound bed synthesised from script.json timing, mixed under the voiceover.
//   node topics/internet-hilang/sound.mjs -> sfx.wav + audio.wav (VO + SFX)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(DIR, 'script.json'), 'utf8'));
const E = script.events, SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
const SR = 44100, DUR = script.duration, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 31; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };

// ambience per scene
let a1 = 0, a2 = 0;
const AMB = { hook: [0.02, 0.25], h1bilik: [0.02, 0.2], h1kedai: [0.08, 0.8], h2luar: [0.05, 0.7], h2atm: [0.07, 0.8], h2serikin: [0.09, 0.9], h3pelabuhan: [0.02, 0.8],
  h3gudang: [0.02, 0.4], h4pasaraya: [0.06, 0.6], h4hospital: [0.04, 0.5], h5ruai: [0.015, 0.3], h5bandar: [0.07, 0.7], h6: [0.02, 0.2], h7pasar: [0.09, 0.9],
  h7kampung: [0.03, 0.5], kembali: [0.01, 0.3], renung: [0.01, 0.15], cta: [0.01, 0.1] };
for (let i = 0; i < N; i++) {
  const t = i / SR; const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
  const [k, lvl] = AMB[sc.id];
  a1 += k * (rnd() - a1); a2 += 0.02 * (a1 - a2);
  const fade = Math.min(1, (t - sc.start) / 0.3, (sc.end - t) / 0.3 + 0.2);
  add(i, (a1 - a2) * lvl * fade * 0.9, Math.sin(t * 0.3) * 0.3);
}
// music: calm pulse → tension rising to day 6 → warm chords day 7 → bright pad when the internet returns
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const tense = sm(SC.h2luar.start, SC.h6.start, t) * (1 - sm(SC.h7pasar.start - 0.5, SC.h7pasar.start + 0.5, t));
  const beat = Math.exp(-((t * (1.5 + tense)) % 1) * 9);
  const pulse = Math.sin(2 * Math.PI * 55 * t) * beat * (0.04 + 0.1 * tense);
  const drone = (Math.sin(2 * Math.PI * 82.4 * t) + 0.5 * Math.sin(2 * Math.PI * 87.3 * t)) * tense * 0.05;
  const warm = sm(SC.h7pasar.start, SC.h7pasar.start + 1.5, t) * (1 - sm(E.kembali - 1, E.kembali, t)) * 0.045 * (Math.sin(2 * Math.PI * 196 * t) + 0.8 * Math.sin(2 * Math.PI * 246.9 * t) + 0.6 * Math.sin(2 * Math.PI * 293.7 * t)) * (0.7 + 0.3 * Math.sin(t * 2));
  const pad = sm(E.kembali, E.kembali + 1.5, t) * (1 - sm(DUR - 2.5, DUR, t)) * 0.05 * (Math.sin(2 * Math.PI * 261.6 * t) + 0.8 * Math.sin(2 * Math.PI * 329.6 * t) + 0.6 * Math.sin(2 * Math.PI * 392 * t));
  add(i, pulse + drone + warm + pad);
}
const tone = (t0, f, dur, vol, decay = 8) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * vol); } };
const thump = (t0, vol = 0.8, f0 = 60) => { for (let i = 0; i < 1.2 * SR; i++) { const t = i / SR; const f = f0 * (1 + 2 * Math.exp(-t * 18)); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.5) * vol); } };
const whoosh = (t0, dur, vol = 0.4) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; const k = 0.02 + 0.3 * Math.sin(Math.PI * t / dur); lp += k * (rnd() - lp); add(Math.floor((t0 + t) * SR), lp * vol * Math.sin(Math.PI * t / dur) * 3, (t / dur - 0.5)); } };
const click = (t0, vol = 0.2) => { for (let i = 0; i < 0.015 * SR; i++) add(Math.floor(t0 * SR) + i, rnd() * vol * (1 - i / (0.015 * SR))); };
const buzz = (t0, dur, f = 100, vol = 0.08) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sign(Math.sin(2 * Math.PI * f * t)) * vol * (1 - t / dur)); } };
const err = t0 => { tone(t0, 440, 0.16, 0.12, 5); tone(t0 + 0.18, 330, 0.25, 0.12, 5); };
const ping = (t0, f = 1568) => { tone(t0, f, 0.35, 0.09, 9); tone(t0 + 0.07, f * 1.335, 0.4, 0.07, 8); };
const horn = (t0, dur) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; const env = Math.min(1, t / 0.3, (dur - t) / 0.6); add(Math.floor((t0 + t) * SR), (Math.sin(2 * Math.PI * 98 * t) + 0.5 * Math.sin(2 * Math.PI * 147 * t)) * env * 0.1); } };
const radio = (t0, dur) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; lp += 0.4 * (rnd() - lp); const voice = Math.sin(2 * Math.PI * (300 + 120 * Math.sin(t * 9)) * t) * (Math.sin(t * 13) > 0 ? 1 : 0.2); add(Math.floor((t0 + t) * SR), (lp * 0.5 + voice * 0.5) * 0.03 * Math.min(1, t * 3, (dur - t) * 3), -0.3); } };

for (const s of script.scenes.slice(1)) if (!['cta', 'renung'].includes(s.id)) whoosh(s.start - 0.35, 0.7, 0.3);
buzz(E.putus, 0.5, 80, 0.07); thump(E.putus, 0.6, 50);
for (let k = 0; k < 9; k++) click(E.apps + k * 0.28, 0.18);
err(E.qrGagal + 0.5); thump(E.cash, 0.4, 80);
for (let k = 0; k < 3; k++) err(E.atm + k * 0.7);
horn(SC.h3pelabuhan.start + 0.8, 2.0);
thump(E.rak, 0.5, 60); for (let k = 0; k < 4; k++) tone(SC.h4hospital.start + 0.6 + k * 1.0, 1000, 0.08, 0.04, 30);
radio(E.radio - 0.3, SC.h5ruai.end - E.radio + 0.3);
for (let k = 0; k < 3; k++) tone(E.khabar + k * 0.7, 700 + k * 120, 0.12, 0.05, 14);
thump(E.rugi, 0.7, 45);
for (let k = 0; k < 4; k++) tone(E.tengahMalam + k * 0.28, 880, 0.05, 0.05, 40);
thump(E.kembali, 0.9, 50); ping(E.kembali, 1318);
for (let k = 0; k < 16; k++) ping(E.mesej + k * 0.16, [1568, 1760, 1976, 1318][k % 4]);

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
