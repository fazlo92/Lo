// Sound bed synthesised from script.json timing, mixed under the voiceover.
//   node topics/rm1juta/sound.mjs -> sfx.wav + audio.wav (VO + SFX)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(DIR, 'script.json'), 'utf8'));
const E = script.events, SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
const SR = 44100, DUR = script.duration, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 11; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };
const inScene = (t, id) => t >= SC[id].start && t < SC[id].end;

// ambience: filtered noise whose colour/level depends on the location
let a1 = 0, a2 = 0;
const AMB = { tebingan: [0.04, 0.5], india: [0.09, 0.9], vivacity: [0.07, 0.7], airport: [0.06, 0.7], gerai: [0.02, 0.25], atm: [0.2, 0.8],
  pasar: [0.1, 1.0], jeti: [0.03, 0.5], pelabuhan: [0.015, 0.7], rumah: [0.02, 0.2], malam: [0.01, 0.2], cta: [0.01, 0.15] };
for (let i = 0; i < N; i++) {
  const t = i / SR; const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
  const [k, lvl] = AMB[sc.id];
  a1 += k * (rnd() - a1); a2 += 0.02 * (a1 - a2);
  const fade = Math.min(1, (t - sc.start) / 0.3, (sc.end - t) / 0.3 + 0.2);
  const chatter = ['india', 'vivacity', 'airport', 'pasar', 'atm'].includes(sc.id) ? 0.6 + 0.4 * Math.sin(t * 2.7) * Math.sin(t * 0.9 + 1) : 1;
  add(i, (a1 - a2) * lvl * chatter * fade * 0.9, Math.sin(t * 0.3) * 0.3);
}
// music: soft pulse growing tense, then a sad pad
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const tense = sm(SC.gerai.start, SC.pelabuhan.start + 4, t) * (1 - sm(SC.malam.start - 1, SC.malam.start, t));
  const beat = Math.exp(-((t * 2) % 1) * 9);
  const pulse = Math.sin(2 * Math.PI * 55 * t) * beat * (0.05 + 0.1 * tense);
  const drone = (Math.sin(2 * Math.PI * 82.4 * t) + 0.5 * Math.sin(2 * Math.PI * 110 * t + Math.sin(t))) * tense * 0.05;
  const happy = (1 - sm(SC.gerai.start - 1, SC.gerai.start + 1, t)) * 0.03 * (Math.sin(2 * Math.PI * 261.6 * t) + Math.sin(2 * Math.PI * 329.6 * t) + Math.sin(2 * Math.PI * 392 * t)) * (0.6 + 0.4 * Math.sin(t * 3));
  const pad = sm(SC.malam.start, SC.malam.start + 2, t) * (1 - sm(DUR - 2.5, DUR, t)) * 0.05 *
    (Math.sin(2 * Math.PI * 220 * t) + 0.8 * Math.sin(2 * Math.PI * 261.6 * t) + 0.6 * Math.sin(2 * Math.PI * 329.6 * t));
  add(i, pulse + drone + happy + pad);
}
// one-shots
const tone = (t0, f, dur, vol, decay = 8) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * vol); } };
const thump = (t0, vol = 0.8, f0 = 60) => { for (let i = 0; i < 1.2 * SR; i++) { const t = i / SR; const f = f0 * (1 + 2 * Math.exp(-t * 18)); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.5) * vol); } };
const whoosh = (t0, dur, vol = 0.4) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; const k = 0.02 + 0.3 * Math.sin(Math.PI * t / dur); lp += k * (rnd() - lp); add(Math.floor((t0 + t) * SR), lp * vol * Math.sin(Math.PI * t / dur) * 3, (t / dur - 0.5)); } };
const click = (t0, vol = 0.2) => { for (let i = 0; i < 0.015 * SR; i++) add(Math.floor(t0 * SR) + i, rnd() * vol * (1 - i / (0.015 * SR))); };
const kaching = t0 => { tone(t0, 2093, 0.4, 0.12, 9); tone(t0 + 0.06, 2637, 0.5, 0.1, 7); click(t0, 0.3); };
const horn = (t0, dur) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; const env = Math.min(1, t / 0.3, (dur - t) / 0.6); add(Math.floor((t0 + t) * SR), (Math.sin(2 * Math.PI * 98 * t) + 0.5 * Math.sin(2 * Math.PI * 147 * t)) * env * 0.12); } };

for (const s of script.scenes.slice(1)) if (s.id !== 'cta') whoosh(s.start - 0.35, 0.7, 0.35);
tone(E.notif, 1568, 0.5, 0.18, 6); tone(E.notif + 0.12, 2093, 0.6, 0.15, 6);
for (let k = 0; k < 8; k++) kaching(SC.india.start + 1.2 + k * 0.85);
for (let k = 0; k < 8; k++) for (let j = 0; j < 6; j++) click(E.boardFull - 2.0 + k * 0.32 + j * 0.03, 0.12);
tone(SC.airport.start + 0.4, 659, 0.9, 0.08, 3); tone(SC.airport.start + 0.75, 523, 1.0, 0.08, 3);
for (let i = 0; i < 0.5 * SR; i++) { const t = i / SR; add(Math.floor((E.stallOff - 0.4 + t) * SR), Math.sin(2 * Math.PI * 100 * t) * (Math.floor(t * 30) % 2) * 0.08); }
for (let k = 0; k < 3; k++) { tone(E.atmEmpty + k * 0.45, 440, 0.18, 0.12, 4); tone(E.atmEmpty + k * 0.45 + 0.2, 330, 0.25, 0.12, 4); }
thump(E.priceUp1, 0.8, 55); thump(E.priceUp2, 0.9, 50); thump(E.bigJump, 1.0, 42);
horn(SC.pelabuhan.start + 1.2, 2.2);
whoosh(E.priceBack, 0.9, 0.5); whoosh(E.balanceCut, 0.9, 0.5); thump(E.zeroCut, 0.6, 45);
for (const [t0, f] of [[SC.malam.start + 0.5, 523], [SC.malam.start + 2.5, 440], [SC.malam.start + 4.5, 392], [SC.cta.start + 0.3, 349]]) tone(t0, f, 3, 0.1, 1.2);

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
