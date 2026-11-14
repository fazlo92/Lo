// Usage:
//   node tools/render.mjs --topic nombor                 full MP4 -> out/<topic>.mp4
//   node tools/render.mjs --topic nombor --stills 3,12.5  PNG stills -> out/stills/
//   options: --workers 3 --from 0 --to 60 --crf 18 --out file.mp4
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, ROOT } from './server.mjs';

// Use the project's playwright if installed, else the machine's global one.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const topic = args.topic || 'nombor';
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'topics', topic, 'script.json'), 'utf8'));
const fps = script.fps, W = script.width, H = script.height;
const outDir = path.join(ROOT, 'out');
fs.mkdirSync(outDir, { recursive: true });

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}/engine/index.html?topic=${topic}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function openPage() {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page error]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return page;
}

if (args.stills) {
  const dir = path.join(outDir, 'stills'); fs.mkdirSync(dir, { recursive: true });
  const page = await openPage();
  for (const s of String(args.stills).split(',')) {
    const t = parseFloat(s);
    await page.evaluate(t => window.renderFrame(t), t);
    const file = path.join(dir, `${topic}-${t.toFixed(2)}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
} else {
  const from = parseFloat(args.from ?? 0), to = parseFloat(args.to ?? script.duration);
  const first = Math.round(from * fps), last = Math.round(to * fps);
  const total = last - first;
  const workers = parseInt(args.workers ?? 3);
  const frameDir = path.join(outDir, 'frames', topic);
  fs.rmSync(frameDir, { recursive: true, force: true }); fs.mkdirSync(frameDir, { recursive: true });
  let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = await openPage();
    for (let f = first + w; f < last; f += workers) {
      await page.evaluate(t => window.renderFrame(t), f / fps);
      await page.screenshot({ path: path.join(frameDir, `f${String(f - first).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
      if (++done % 60 === 0) {
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`\r${done}/${total} frames  ${(done / el).toFixed(1)} fps  eta ${Math.round((total - done) / (done / el))}s   `);
      }
    }
  }));
  console.log('\nencoding…');
  const outFile = args.out ? path.resolve(args.out) : path.join(outDir, `${topic}.mp4`);
  const audio = ['wav', 'mp3', 'm4a'].map(e => path.join(ROOT, 'topics', topic, `audio.${e}`)).find(fs.existsSync);
  const ff = ['-y', '-framerate', String(fps), '-i', path.join(frameDir, 'f%05d.jpg'),
    ...(audio ? ['-ss', String(from), '-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf ?? 18), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile];
  await new Promise((res, rej) => spawn('ffmpeg', ff, { stdio: ['ignore', 'ignore', 'inherit'] }).on('exit', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  console.log(outFile);
}
await browser.close();
server.close();
