import { clamp, smooth, easeOut, hash, frameIndex } from './util.js';

const GLYPHS = ['?', '?', '?', '?', '_', '·', '?', '/'];

function headlineHTML(h) {
  const words = h.text.split(' ').map(w => {
    const bare = w.replace(/[.,?!—…]/g, '');
    return h.highlight?.includes(bare) ? w.replace(bare, `<span class="hl">${bare}</span>`) : w;
  });
  return words.join(' ') + (h.emoji ? `<span class="emoji">${h.emoji}</span>` : '');
}

export function createOverlay(script) {
  const el = {
    headline: document.getElementById('headline'),
    hud: document.getElementById('hud'),
    label: document.querySelector('.hud-label'),
    timer: document.querySelector('.hud-timer'),
    stat: document.querySelector('.hud-stat'),
    caption: document.getElementById('caption'),
    flash: document.getElementById('flash'),
  };
  const T = script.timer;
  let lastHeadline = null, lastCaption = null;

  // amount of "numbers missing" in [0,1]
  const missing = t => (t < T.glitchFrom || t >= T.restoreAt) ? 0 : smooth(T.glitchFrom, T.glitchFrom + 1.2, t);

  function glitchText(str, t, amount, salt) {
    const f = frameIndex(t);
    return [...str].map((c, i) => {
      const isNum = /[0-9?]/.test(c);
      if (!isNum) return c;
      if (c !== '?' && hash(i + salt * 31, Math.floor(f / 2)) > amount) return c;
      const g = GLYPHS[Math.floor(hash(i * 7 + salt, f) * GLYPHS.length)];
      return g;
    }).join('');
  }

  function timerValue(t) {
    const k = clamp((t - T.countStart) / (T.countEnd - T.countStart));
    return T.startValue * (1 - k);
  }
  function fmt(v) {
    const s = Math.floor(v), ms = Math.round((v - s) * 1000);
    const S = s + Math.floor(ms / 1000), M = ms % 1000;
    return `0:${String(S).padStart(2, '0')}.${String(M).padStart(3, '0')}`;
  }

  return {
    sceneAt(t) { return script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1); },
    update(t) {
      const sc = this.sceneAt(t);
      const local = t - sc.start;

      // Headline: fade/slide in at scene start, fade out in last 0.25s.
      if (lastHeadline !== sc.id) { el.headline.innerHTML = headlineHTML(sc.headline); lastHeadline = sc.id; }
      const hin = easeOut(local / 0.45), hout = 1 - smooth(sc.end - 0.25, sc.end, t);
      el.headline.style.opacity = Math.min(hin, sc === script.scenes.at(-1) ? 1 : hout);
      el.headline.style.transform = `translateY(${(1 - hin) * 24}px)`;
      el.headline.style.filter = `blur(${(1 - hin) * 6}px)`;
      el.headline.style.top = sc.id === 'cta' ? '400px' : '440px';
      el.headline.style.fontSize = sc.id === 'cta' ? '100px' : '86px';

      // Caption chunks
      const caps = sc.captions || [];
      let cap = null;
      for (const c of caps) if (t >= c.t) cap = c;
      const capText = cap ? cap.text : '';
      if (capText !== lastCaption) { el.caption.textContent = capText; lastCaption = capText; }
      el.caption.style.opacity = cap ? Math.min(easeOut((t - cap.t) / 0.18), 1 - smooth(sc.end - 0.15, sc.end, t)) : 0;
      el.caption.style.top = sc.id === 'cta' ? '940px' : '1300px';

      // HUD
      if (!sc.hud || t >= T.hideAt) { el.hud.style.opacity = 0; }
      else {
        el.hud.style.opacity = 1;
        const m = missing(t);
        el.label.textContent = sc.hud.label;
        let timer = fmt(timerValue(t));
        if (t >= T.restoreAt) timer = '0:00.000';
        const glitched = m > 0 ? glitchText(timer, t, m, 3) : timer;
        el.timer.innerHTML = [...glitched].map(c => `<span class="g">${c}</span>`).join('');
        el.timer.querySelectorAll('.g').forEach((s, i) => { if (glitched[i] === ':' || glitched[i] === '.') s.style.width = '.26em'; });
        // flicker/jitter while glitching
        const f = frameIndex(t);
        const jitter = m > 0 ? (hash(f, 9) - .5) * 6 * m : 0;
        const pop = t >= T.restoreAt ? 1 + .25 * (1 - easeOut((t - T.restoreAt) / .5)) : 1;
        el.timer.style.transform = `translateX(${jitter}px) scale(${pop})`;
        el.timer.style.opacity = m > 0 ? (hash(f, 4) < .08 * m ? .35 : 1) : 1;
        el.stat.textContent = m > 0 || sc.hud.stat.includes('?') ? glitchText(sc.hud.stat, t, Math.max(m, .6), 5) : sc.hud.stat;
      }
    },
    setFlash(v) { el.flash.style.opacity = v; },
  };
}
