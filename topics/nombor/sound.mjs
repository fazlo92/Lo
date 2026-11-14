// Sound bed synthesised from the timeline in script.json, then mixed under the voiceover.
//   node topics/nombor/sound.mjs  -> topics/nombor/sfx.wav + topics/nombor/audio.wav (VO + SFX)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(DIR, 'script.json'), 'utf8'));
const E = script.events;
const SR = 44100, DUR = script.duration, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan) ; R[i] += v * (1 + pan); } };

// 1. Mamak crowd ambience: band-limited noise with slow chatter swells, dies at blackout.
let lp1 = 0, lp2 = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR; const n = rnd();
  lp1 += 0.08 * (n - lp1); lp2 += 0.02 * (lp1 - lp2);
  const chatter = 0.6 + 0.4 * Math.sin(t * 2.3) * Math.sin(t * 0.7 + 1);
  const amp = (1 - sm(E.vanishStart, E.vanishStart + 1.7, t) * 0.55) * (1 - sm(E.gridStart, E.gridEnd + 0.5, t)) * 0.9 + (t > E.restore + 6 ? 0.15 * sm(E.restore + 6, E.restore + 12, t) : 0);
  add(i, (lp1 - lp2) * chatter * amp * 0.9, Math.sin(t * 0.3) * 0.3);
}
// 2. Low drone that grows tense, then a soft pad after numbers return.
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const tense = sm(E.vanishStart, E.gridEnd, t) * (1 - sm(E.restore - 0.4, E.restore, t));
  const d = (Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 82.4 * t + Math.sin(t * 0.5))) * tense * 0.12;
  const pad = sm(E.restore + 1, E.restore + 4, t) * (1 - sm(DUR - 3, DUR, t)) * 0.06 *
    (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 261.6 * t) * 0.8 + Math.sin(2 * Math.PI * 329.6 * t) * 0.6) * (0.8 + 0.2 * Math.sin(t * 1.3));
  add(i, d + pad);
}
// 3. Events
const glitch = (t0, dur, vol = 0.35) => { for (let i = 0; i < dur * SR; i++) { const t = i / SR; const f = Math.floor(t * 40) % 2 ? 1 : 0.3; add(Math.floor((t0 + t) * SR), rnd() * vol * f * (1 - t / dur) * (Math.sin(2 * Math.PI * 1800 * t) > 0 ? 1 : -1) * 0.6, rnd() * 0.5); } };
const thump = (t0, vol = 0.8, f0 = 70) => { for (let i = 0; i < 1.4 * SR; i++) { const t = i / SR; const f = f0 * (1 + 2 * Math.exp(-t * 18)); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.2) * vol); } };
const whoosh = (t0, dur, vol = 0.5) => { let lp = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; const k = 0.01 + 0.25 * Math.sin(Math.PI * t / dur); lp += k * (rnd() - lp); add(Math.floor((t0 + t) * SR), lp * vol * Math.sin(Math.PI * t / dur) * 3); } };
const powerDown = (t0, vol = 0.25) => { for (let i = 0; i < 1.2 * SR; i++) { const t = i / SR; const f = 900 * Math.exp(-t * 3); add(Math.floor((t0 + t) * SR), Math.sin(2 * Math.PI * f * t) * (1 - t / 1.2) * vol); } };
const tick = t0 => { for (let i = 0; i < 0.02 * SR; i++) add(Math.floor(t0 * SR) + i, rnd() * 0.25 * (1 - i / (0.02 * SR))); };

for (let s = 0; s < E.chipsDie; s++) tick(s);                 // clock ticks until the chips die
thump(0.3, 0.5, 60);
const V = E.vanishStart;
glitch(V, 0.5); glitch(V + 0.5, 0.25); glitch(V + 1.0, 0.3);
thump(V, 0.6, 50);
glitch(E.chipsDie, 0.7, 0.45); powerDown(E.chipsDie, 0.3); thump(E.chipsDie, 0.7, 45);
powerDown(E.phoneDark, 0.2);
for (let k = 0; k < 7; k++) thump(E.gridStart + k * (E.gridEnd - E.gridStart) / 6, 0.9, 42 + k * 2);
powerDown(E.shopDark, 0.3);
whoosh(E.restore - 0.7, 1.4, 0.6); thump(E.restore, 1.0, 38);
for (const t0 of [E.phoneBoot, E.phoneBoot + 2.5, E.phoneBoot + 5]) { for (let i = 0; i < 0.12 * SR; i++) add(Math.floor(t0 * SR) + i, Math.sin(2 * Math.PI * 880 * i / SR) * 0.12 * (1 - i / (0.12 * SR))); }

// normalise & write 16-bit stereo WAV
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
const sfx = path.join(DIR, 'sfx.wav');
fs.writeFileSync(sfx, buf); console.log(sfx);

// Mix: voiceover on top, SFX ducked under it (sidechain), loudness ~ -14 LUFS for social video.
const vo = script.voiceover && path.join(DIR, script.voiceover);
const out = path.join(DIR, 'audio.wav');
const args = vo && fs.existsSync(vo)
  ? ['-y', '-i', vo, '-i', sfx, '-filter_complex',
     `[0:a]aresample=44100,aformat=channel_layouts=stereo,apad=whole_dur=${DUR},asplit=2[vo][sc];` +
     `[1:a]volume=0.55[bed];[bed][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[duck];` +
     `[vo][duck]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[out]`,
     '-map', '[out]', '-ar', '44100', '-t', String(DUR), out]
  : ['-y', '-i', sfx, '-af', 'loudnorm=I=-16:TP=-1.5', '-ar', '44100', out];
const r = spawnSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
if (r.status) { console.error(r.stderr.toString().slice(-800)); process.exit(1); }
console.log(out);
