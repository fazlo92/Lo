// Sound bed synthesised from script.json timing, mixed under the voiceover.
//   node topics/zombi/sound.mjs -> sfx.wav + audio.wav (VO + SFX)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(DIR, 'script.json'), 'utf8'));
const E = script.events, SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
const SR = 44100, DUR = script.duration, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 13; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };

// ambience per scene
let a1 = 0, a2 = 0;
const AMB = { hook: [0.02, 0.25], h1hus: [0.04, 0.5], h1metro: [0.02, 0.4], h2tular: [0.06, 0.6], h2spring: [0.09, 0.9], h2satok: [0.05, 0.8], h3jalan: [0.03, 0.5], h3pasaraya: [0.02, 0.3],
  h4sentral: [0.04, 0.6], h4platform: [0.05, 0.6], h4ltak: [0.02, 0.4], h5waterfront: [0.01, 0.35], h5metro: [0.01, 0.3], h5rumah: [0.01, 0.2], h6: [0.015, 0.3], h7: [0.3, 1.2], radio: [0.3, 1.0], sibu: [0.01, 0.3], cta: [0.01, 0.2] };
for (let i = 0; i < N; i++) {
  const t = i / SR; const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
  const [k, lvl] = AMB[sc.id];
  a1 += k * (rnd() - a1); a2 += 0.02 * (a1 - a2);
  const fade = Math.min(1, (t - sc.start) / 0.3, (sc.end - t) / 0.3 + 0.2);
  add(i, (a1 - a2) * lvl * fade * 0.9, Math.sin(t * 0.3) * 0.3);
}
// music: low dread drone + heartbeat speeding up, sad pad on day 7, silence then sting at Sibu
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const dread = sm(0, 6, t) * (1 - sm(SC.sibu.start - 0.2, SC.sibu.start, t) * 0.8);
  const drone = (Math.sin(2 * Math.PI * 41.2 * t) + 0.6 * Math.sin(2 * Math.PI * 43.6 * t) + 0.3 * Math.sin(2 * Math.PI * 82.4 * t + Math.sin(t * 0.3))) * 0.06 * dread;
  const bpm = 0.9 + 1.4 * sm(SC.h2tular.start, SC.h6.end, t);
  const ph = (t * bpm) % 1, hb = sm(SC.h2tular.start, SC.h2tular.start + 2, t) * (1 - sm(SC.h7.start - 0.5, SC.h7.start + 0.5, t));
  const beat = (Math.exp(-ph * 30) + 0.6 * Math.exp(-Math.max(0, ph - 0.18) * 30) * (ph > 0.18 ? 1 : 0)) * Math.sin(2 * Math.PI * 50 * t) * 0.22 * hb;
  const sad = sm(SC.h7.start, SC.h7.start + 2, t) * (1 - sm(SC.radio.start + 2, SC.radio.start + 4, t)) * 0.04 * (Math.sin(2 * Math.PI * 220 * t) + 0.8 * Math.sin(2 * Math.PI * 261.6 * t) + 0.6 * Math.sin(2 * Math.PI * 329.6 * t));
  const tail = sm(SC.cta.start, SC.cta.start + 1, t) * (1 - sm(DUR - 2.5, DUR, t)) * 0.04 * (Math.sin(2 * Math.PI * 110 * t) + 0.7 * Math.sin(2 * Math.PI * 130.8 * t));
  add(i, drone + beat + sad + tail);
}
const tone = (t0, f, dur, vol, decay = 8) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * vol); } };
const thump = (t0, vol = 0.8, f0 = 60) => { for (let i = 0; i < 1.2 * SR; i++) { const t = i / SR; const f = f0 * (1 + 2 * Math.exp(-t * 18)); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.5) * vol); } };
const whoosh = (t0, dur, vol = 0.4) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; const k = 0.02 + 0.3 * Math.sin(Math.PI * t / dur); lp += k * (rnd() - lp); add(Math.floor((t0 + t) * SR), lp * vol * Math.sin(Math.PI * t / dur) * 3, (t / dur - 0.5)); } };
const siren = (t0, dur, vol = 0.03) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; const f = 650 + 250 * Math.sin(t * 5); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * vol * Math.min(1, t, dur - t)); } };
const growl = (t0, dur, vol = 0.12) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; lp += 0.05 * (rnd() - lp); const f = 70 + 20 * Math.sin(t * 7); add(Math.floor((t0 + t) * SR), (Math.sin(2 * Math.PI * f * t) * (0.6 + lp * 3)) * vol * Math.sin(Math.PI * t / dur)); } };
const knock = t0 => { for (let i = 0; i < 0.12 * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), (Math.sin(2 * Math.PI * 110 * t) + rnd() * 0.5) * Math.exp(-t * 40) * 0.5); } };
const horn = (t0, f) => { for (let i = 0; i < 0.35 * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.04, 0.4); } };
const alarm = (t0, n) => { for (let k = 0; k < n; k++) { tone(t0 + k * 0.5, 880, 0.22, 0.09, 4); tone(t0 + k * 0.5 + 0.25, 660, 0.22, 0.09, 4); } };
const staticN = (t0, dur, vol = 0.18) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; add(Math.floor((t0 + t) * SR), rnd() * vol * (Math.sin(t * 40) > 0 ? 1 : 0.4)); } };
const rotor = (t0, dur) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; const env = Math.min(1, t / 0.8, (dur - t) / 0.8); add(Math.floor((t0 + t) * SR), (rnd() * 0.5 + Math.sin(2 * Math.PI * 60 * t)) * Math.pow(Math.max(0, Math.sin(2 * Math.PI * 6 * t)), 4) * 0.12 * env); } };

const days = script.scenes.filter((s, i) => i > 0 && /^h\d/.test(s.id) && s.id.slice(0, 2) !== script.scenes[i - 1].id.slice(0, 2));
for (const s of days) { whoosh(s.start - 0.35, 0.7, 0.35); thump(s.start, 0.5, 45); }
siren(E.pesakit - 0.5, 4.5); siren(SC.h1hus.start, 4, 0.05);
growl(E.agresif + 0.2, 1.2); growl(SC.h1metro.start + 1.5, 1.4, 0.08);
for (let k = 0; k < 10; k++) horn(E.satok + k * 0.3, [392, 440, 349][k % 3]);
alarm(E.zon - 0.1, 4); thump(E.merebak, 0.8, 40);
for (let k = 0; k < 7; k++) tone(E.padam + k * 0.26, 2200, 0.03, 0.05, 60);
growl(SC.h5rumah.start + 0.4, 1.6, 0.06);
staticN(E.radio6, 1.2, 0.08); for (let k = 0; k < 3; k++) knock(SC.h6.end - 1.6 + k * 0.4);
rotor(SC.h7.start, SC.sibu.start - SC.h7.start);
staticN(E.kawalan - 0.3, 0.4); staticN(E.sibu + 1.8, 0.4); staticN(SC.sibu.start - 0.1, 0.5, 0.3);
growl(E.permulaan + 0.2, 2.0, 0.14); thump(E.permulaan + 0.6, 1.0, 38);

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
