// "Apa jadi kalau internet dunia hilang selama 7 hari?" — Sarawak, seven days.
import { kit } from '/engine/lib3d.js';

export async function create({ THREE, renderer, script, U }) {
  const { clamp, lerp, smooth, easeOut, hash, mulberry32, frameIndex } = U;
  const K = kit(THREE, U);
  const { box, cyl, sphere, plane, ground, canvasTex, texMat, glow, windowTex, person, animatePeople, SHIRTS, SKINS } = K;
  const E = script.events, W = script.width, H = script.height;
  const SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
  const rand = mulberry32(404);
  const scene = new THREE.Scene();
  const BM = c => new THREE.MeshBasicMaterial({ color: c });
  const sceneAt = t => script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);

  // ------------------------------------------------ camera, sky, lights
  const camera = new THREE.PerspectiveCamera(75, W / H, 0.05, 5000); scene.add(camera);
  const skyU = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top, horizon; varying vec3 vD; void main(){ gl_FragColor = vec4(mix(horizon, top, smoothstep(-0.02, 0.5, vD.y)),1.); }',
  })));
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 800; i++) { const th = rand() * 6.283, y = 0.06 + rand() * 0.9, r = Math.sqrt(1 - y * y); sp.push(Math.cos(th) * r * 3500, y * 3500, Math.sin(th) * r * 3500); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false })); scene.add(stars);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x888888, fog: false });
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group(); const a = -1 + rand() * 2, d = 900 + rand() * 900; c.position.set(Math.sin(a) * d, 200 + rand() * 260, -Math.cos(a) * d);
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(40 + rand() * 50, 0), cloudMat); s.position.set((k - 2) * 50, rand() * 25, rand() * 30); s.scale.y = 0.55; c.add(s); }
    clouds.add(c);
  }
  scene.fog = new THREE.Fog(0xffffff, 80, 1600);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1); scene.add(sun); scene.add(sun.target);

  // ------------------------------------------------ hand + phone (inside TikTok safe zone)
  const rig = new THREE.Group(); camera.add(rig);
  const skin = 0xc68a5f, sleeve = 0x5a3a4a;
  const handL = new THREE.Group(); handL.position.set(-0.085, -0.17, -0.46); handL.rotation.set(0.3, 0.22, 0.1); rig.add(handL);
  box(handL, 0.11, 0.42, 0.1, sleeve, -0.02, -0.33, 0.02).rotation.x = -0.15;
  box(handL, 0.09, 0.11, 0.04, skin, 0, -0.07, -0.012);
  box(handL, 0.025, 0.07, 0.03, skin, 0.055, -0.02, 0.005).rotation.z = -0.5;
  box(handL, 0.078, 0.158, 0.009, 0x16181c, 0, 0.02, 0.012);
  for (let k = 0; k < 3; k++) box(handL, 0.016, 0.022, 0.02, skin, -0.044, -0.02 + k * 0.026, 0.0);
  const phoneT = canvasTex(256, 540);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), new THREE.MeshBasicMaterial({ map: phoneT.tex }));
  phoneScreen.position.set(0, 0.02, 0.0172); handL.add(phoneScreen);
  const phoneGlow = glow(handL, 0xbfe0ff, 0.5, 0, 0.02, 0.03); phoneGlow.material.opacity = 0;

  const wifiIcon = (g, x, y, on, col = '#fff') => {
    g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { g.globalAlpha = on ? 1 : 0.25; g.beginPath(); g.arc(x, y, 8 + k * 8, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = col; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
    if (!on) { g.strokeStyle = '#ff5a4a'; g.beginPath(); g.moveTo(x - 20, y - 26); g.lineTo(x + 20, y + 4); g.stroke(); }
  };
  const APPS = ['#3fc380', '#3b82f6', '#111111', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
  function drawPhone(t, id) {
    const g = phoneT.ctx, w = 256, h = 540; g.textAlign = 'center';
    const online = t >= E.kembali;
    const bg = c => { g.fillStyle = c; g.fillRect(0, 0, w, h); };
    const status = (dark) => { g.fillStyle = dark ? '#fff' : '#111'; g.font = '600 18px HudSans'; g.textAlign = 'left'; g.fillText('7:00', 16, 30); g.textAlign = 'center'; wifiIcon(g, 222, 30, t < E.putus || online, dark ? '#fff' : '#111'); };
    const banner = (txt, col = '#c0392b') => { g.fillStyle = col; g.beginPath(); g.roundRect(14, 56, 228, 54, 12); g.fill(); g.fillStyle = '#fff'; g.font = '700 16px HudSans'; g.fillText(txt, 128, 89); };
    if (id === 'hook') {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#24345c'); grd.addColorStop(1, '#d98c5f'); g.fillStyle = grd; g.fillRect(0, 0, w, h); status(true);
      g.fillStyle = '#fff'; g.font = '600 76px HudSans'; g.fillText('7:00', 128, 240); g.font = '600 18px HudSans'; g.fillText('Isnin', 128, 276);
      if (t >= E.putus) banner('Tiada sambungan internet');
    } else if (id === 'h1bilik') {
      bg('#12141a'); status(true); banner('Tiada sambungan internet');
      APPS.forEach((c, i) => { const x = 50 + (i % 3) * 78, y = 190 + Math.floor(i / 3) * 96; const dead = t > E.apps + i * 0.28;
        g.fillStyle = dead ? '#3a3d44' : c; g.beginPath(); g.roundRect(x - 28, y - 28, 56, 56, 14); g.fill();
        g.fillStyle = dead ? '#666' : '#fff'; g.font = '700 26px HudSans'; g.fillText(['✆', 'f', '♪', '▶', '✉', '☺', '◎', '♥', '✚'][i], x, y + 9);
        if (dead) { g.strokeStyle = '#ff5a4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 20, y - 20); g.lineTo(x + 20, y + 20); g.stroke(); } });
    } else if (id === 'h1kedai') {
      const fail = t >= E.qrGagal + 0.5;
      bg(fail ? '#7a1010' : '#0f7a55'); status(true); g.fillStyle = '#fff'; g.font = '700 22px HudSans'; g.fillText('IMBAS & BAYAR', 128, 96);
      g.fillStyle = '#fff'; g.fillRect(58, 130, 140, 140); g.fillStyle = '#111'; for (let i = 0; i < 49; i++) if (hash(i, 3) > 0.45) g.fillRect(64 + (i % 7) * 18.4, 136 + Math.floor(i / 7) * 18.4, 16, 16);
      g.fillStyle = '#fff'; g.font = '700 30px HudSans'; g.fillText('RM 8.00', 128, 320);
      if (fail) { g.font = '900 30px HudSans'; g.fillText('TRANSAKSI', 128, 400); g.fillText('GAGAL', 128, 436); }
      else { g.font = '600 18px HudSans'; g.fillText('Menyambung' + '.'.repeat(1 + Math.floor(t * 3) % 3), 128, 400); }
    } else if (['h2luar', 'h2atm', 'h2serikin'].includes(id)) {
      bg('#f4f6f9'); g.fillStyle = '#0f4c81'; g.fillRect(0, 0, w, 130); status(true); g.fillStyle = '#fff'; g.font = '700 24px HudSans'; g.fillText('BANK', 128, 96);
      g.fillStyle = '#c0392b'; g.font = '700 22px HudSans'; g.fillText('Tidak dapat', 128, 230); g.fillText('disambungkan', 128, 260);
      g.strokeStyle = '#9aa3ad'; g.lineWidth = 5; const a = t * 5; g.beginPath(); g.arc(128, 350, 26, a, a + 4.5); g.stroke();
    } else if (id.startsWith('h3')) {
      bg('#f4f6f9'); g.fillStyle = '#e67e22'; g.fillRect(0, 0, w, 130); status(true); g.fillStyle = '#fff'; g.font = '700 20px HudSans'; g.fillText('JEJAK BUNGKUSAN', 128, 96);
      g.fillStyle = '#111'; g.font = '700 22px HudSans'; g.fillText('Status: ???', 128, 220); g.fillStyle = '#6b7280'; g.font = '600 16px HudSans'; g.fillText('Tiada data', 128, 256);
    } else if (id.startsWith('h4')) {
      bg('#fffdf5'); status(false); g.fillStyle = '#111'; g.font = '700 22px HudSans'; g.fillText('SENARAI BELI', 128, 96); g.textAlign = 'left'; g.font = '600 20px HudSans';
      ['Beras', 'Telur', 'Susu', 'Mi segera', 'Air minuman'].forEach((s, i) => { const gone = t > E.rak + i * 0.5; g.fillStyle = gone ? '#c0392b' : '#111'; g.fillText((gone ? '✗ ' : '☐ ') + s, 36, 160 + i * 44); });
    } else if (id.startsWith('h5')) {
      bg('#ece5dd'); g.fillStyle = '#128c7e'; g.fillRect(0, 0, w, 110); status(true); g.fillStyle = '#fff'; g.font = '700 20px HudSans'; g.fillText('Keluarga', 128, 90);
      ['Mak, apa khabar?', 'Kamek OK sitok', 'Hello??'].forEach((s, i) => { const y = 150 + i * 80; g.fillStyle = '#dcf8c6'; g.beginPath(); g.roundRect(46, y, 196, 56, 12); g.fill(); g.fillStyle = '#111'; g.font = '600 16px HudSans'; g.textAlign = 'left'; g.fillText(s, 58, y + 26); g.fillStyle = '#c0392b'; g.font = '600 12px HudSans'; g.fillText('◷ tidak terhantar', 58, y + 46); g.textAlign = 'center'; });
    } else if (id === 'h6') {
      bg('#f4f6f9'); g.fillStyle = '#e11d48'; g.fillRect(0, 0, w, 130); status(true); g.fillStyle = '#fff'; g.font = '700 20px HudSans'; g.fillText('KEDAI ONLINE', 128, 96);
      g.fillStyle = '#6b7280'; g.font = '600 18px HudSans'; g.fillText('Pesanan hari ini', 128, 210); g.fillStyle = '#111'; g.font = '800 110px HudSans'; g.fillText('0', 128, 330);
    } else if (id.startsWith('h7') || (id === 'kembali' && !online)) {
      bg('#12141a'); status(true); banner('Tiada sambungan internet'); g.fillStyle = '#9aa0a8'; g.font = '600 20px HudSans'; g.fillText('Hari ke-7', 128, 260);
      if (id === 'kembali') { g.fillStyle = '#fff'; g.font = '600 64px HudSans'; g.fillText(t < E.kembali - 0.6 ? '11:59' : '12:00', 128, 360); }
    } else if (id === 'kembali') {
      bg('#12141a'); status(true); const n = Math.floor((t - E.kembali) * 9);
      for (let i = 0; i < Math.min(n, 6); i++) { const y = 70 + i * 72 + ((n > 6 ? (t * 9) % 1 : 0) * -10); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(12, y, 232, 62, 12); g.fill();
        g.fillStyle = APPS[(i + n) % 9]; g.beginPath(); g.roundRect(22, y + 12, 38, 38, 10); g.fill(); g.fillStyle = '#111'; g.font = '700 15px HudSans'; g.textAlign = 'left'; g.fillText(['Mesej baharu', 'Pembayaran diterima', '12 panggilan terlepas', 'Pesanan baharu', 'E-mel (48)', 'Kumpulan keluarga'][(i + n) % 6], 70, y + 37); g.textAlign = 'center'; }
      g.fillStyle = '#e11d48'; g.beginPath(); g.arc(210, 500, 30, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '800 20px HudSans'; g.fillText(Math.min(999, n * 37) + '+', 210, 507);
    } else {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#1a2a50'); grd.addColorStop(1, '#3a2f5c'); g.fillStyle = grd; g.fillRect(0, 0, w, h); status(true);
      APPS.forEach((c, i) => { const x = 50 + (i % 3) * 78, y = 190 + Math.floor(i / 3) * 96; g.fillStyle = c; g.beginPath(); g.roundRect(x - 28, y - 28, 56, 56, 14); g.fill(); });
    }
    g.textAlign = 'left'; phoneT.tex.needsUpdate = true;
  }

  // ------------------------------------------------ helpers
  const sets = {};
  const makeSet = name => { const g = new THREE.Group(); g.visible = false; scene.add(g); sets[name] = { g, update: () => {} }; return sets[name]; };
  const tileMat = (a, b, rep) => texMat((c, w, h) => { c.fillStyle = a; c.fillRect(0, 0, w, h); c.strokeStyle = b; c.lineWidth = 4; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } }, 256, 256, { repeat: rep });
  const signMat = (txt, bgc, fg, w = 512, h = 160, font = '800 72px HudSans') => texMat((c) => { c.fillStyle = bgc; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; const lines = txt.split('\n'); lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * parseInt(font.match(/(\d+)px/)[1]) * 1.05)); }, w, h);
  function tree(parent, x, z, s = 1, col = 0x3f6b35) { cyl(parent, 0.25 * s, 0.35 * s, 3 * s, 6, 0x5a4232, x, 1.5 * s, z); for (let k = 0; k < 3; k++) sphere(parent, (1.6 - k * 0.3) * s, col, x + (k - 1) * 0.8 * s, (3.4 + k * 0.6) * s, z + (k % 2) * 0.5 * s); }
  function palm(parent, x, z, s = 1) { cyl(parent, 0.12 * s, 0.18 * s, 5 * s, 6, 0x7a6a50, x, 2.5 * s, z); for (let k = 0; k < 6; k++) { const l = box(parent, 2.2 * s, 0.05, 0.4 * s, 0x3f7a3a, x, 5 * s, z); l.rotation.set(0, k * 1.05, -0.5); l.translateX(1.0 * s); } }
  function pleatedCone(R, Hh, n, color, droop = 0.12, inner = 0.8) {
    const pos = [], ring = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, out = i % 2 === 0; ring.push([Math.cos(a) * R * (out ? 1 : inner), out ? 0 : Hh * droop, Math.sin(a) * R * (out ? 1 : inner)]); }
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; pos.push(...a, 0, Hh, 0, ...b); pos.push(...b, 0, Hh * droop * 0.6, 0, ...a); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide }));
  }
  const crowd = (g, n, fx, fz, yaw, seed, opt = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(person(g, fx(i), fz(i), typeof yaw === 'function' ? yaw(i) : yaw, { shirt: SHIRTS[(i + seed) % 10], skin: SKINS[(i + seed) % 6], seed: seed * 50 + i, ...opt(i) })); return out; };
  const noOpt = () => ({});

  // ================================================= BEDROOM
  const bilik = makeSet('bilik');
  {
    const g = bilik.g;
    ground(g, 8, 8, texMat((c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#8a5a3a', '#7d5034', '#94623f'][i % 3]; c.fillRect(0, i * 32, w, 31); } }, 256, 256, { repeat: [3, 3] }), 0, 0, -1);
    plane(g, 8, 3.2, 0xe8e0d0, 0, 1.6, -3.2); plane(g, 8, 3.2, 0xdcd2c0, -2.4, 1.6, -1).rotation.y = Math.PI / 2; plane(g, 8, 3.2, 0xdcd2c0, 2.4, 1.6, -1).rotation.y = -Math.PI / 2;
    plane(g, 8, 8, 0xf3eee4, 0, 3.2, -1).rotation.x = Math.PI / 2;
    const win = texMat((c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6aa8e0'); gr.addColorStop(1, '#f6d6a8'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#5d8a4a'; c.fillRect(0, h * 0.72, w, h * 0.28); for (let i = 0; i < 9; i++) { c.fillStyle = ['#c9c3b8', '#e2dccf', '#b8b2a8'][i % 3]; const bh = 30 + (i * 37 % 60); c.fillRect(i * 30, h * 0.72 - bh, 26, bh); } }, 256, 200, { basic: true });
    plane(g, 1.6, 1.25, win, 0.5, 1.75, -3.18); box(g, 1.7, 0.08, 0.1, 0xffffff, 0.5, 2.4, -3.15); box(g, 1.7, 0.08, 0.1, 0xffffff, 0.5, 1.1, -3.15); box(g, 0.08, 1.35, 0.1, 0xffffff, 0.5, 1.75, -3.15);
    for (const x of [-0.45, 1.45]) box(g, 0.5, 1.6, 0.05, 0x7fb0a8, x, 1.7, -3.1);
    box(g, 2.2, 0.5, 2.0, 0xf2f2f2, -0.2, 0.25, 0.2); box(g, 2.2, 0.12, 1.4, 0xb5654a, -0.2, 0.55, 0.0);
    box(g, 0.6, 0.6, 0.5, 0x7d5034, 0.9, 0.3, -1.6);
    // wifi router on the side table with a status light
    box(g, 0.3, 0.06, 0.2, 0xf2f2f2, 0.9, 0.63, -1.6); for (const x of [-0.1, 0.1]) cyl(g, 0.01, 0.01, 0.25, 5, 0x222222, 0.9 + x, 0.78, -1.68);
    const led = sphere(g, 0.02, BM(0x37e07a), 0.9, 0.64, -1.49, 1); const ledGlow = glow(g, 0x37e07a, 0.25, 0.9, 0.64, -1.47);
    const l = new THREE.PointLight(0xffe2b0, 1.6, 8, 1); l.position.set(0.5, 1.9, -2.6); g.add(l);
    bilik.update = t => { const off = t >= E.putus; const col = off ? (Math.floor(t * 3) % 2 ? 0xff3a2a : 0x551010) : 0x37e07a; led.material.color.setHex(col); ledGlow.material.color.setHex(col); };
  }

  // ================================================= KEDAI MAKAN, SATOK
  const kedai = makeSet('kedai'); let cashSign, qrT;
  {
    const g = kedai.g;
    ground(g, 20, 20, tileMat('#d8cdb8', '#b8ab94', [10, 10]), 0, 0, -4);
    plane(g, 12, 12, 0xf6f1e4, 0, 3.6, -2).rotation.x = Math.PI / 2;
    for (const x of [-3.2, 3.2]) box(g, 0.4, 3.6, 0.4, 0xe9dfc8, x, 1.8, -6.2);
    box(g, 7, 0.6, 0.3, 0xc0392b, 0, 3.3, -6.2);
    // outside: street + Wisma Satok tower in the distance
    ground(g, 200, 120, 0x55565c, 0, -0.02, -70);
    const tw = new THREE.Group(); tw.position.set(-10, 0, -90); g.add(tw);
    box(tw, 22, 46, 18, windowTex(71, 6, 12, '#a9aeb4', '#2c3038'), 0, 23, 0); box(tw, 40, 18, 22, windowTex(72, 8, 5, '#b4b9bf', '#30343c'), 16, 9, 4);
    box(tw, 16, 3, 12, 0x9aa0a6, 0, 47.5, 0);
    for (const s of [-1, 1]) { const horn = box(tw, 10, 1.2, 13, 0x2a2c30, s * 5.5, 50.2, 0); horn.rotation.z = s * 0.38; }
    box(tw, 7, 1.2, 13, 0x2a2c30, 0, 49.2, 0);
    for (let i = 0; i < 6; i++) palm(g, -24 + i * 9, -62, 1.6);
    for (let i = 0; i < 5; i++) { const c = new THREE.Group(); c.position.set(-16 + i * 8, 0, -30 - (i % 2) * 5); g.add(c); box(c, 4.2, 1.0, 1.8, [0xc23b3b, 0xe8e8e8, 0x3a6fb5, 0x2b2b2b, 0xd9b44a][i], 0, 0.7, 0); box(c, 2.2, 0.7, 1.6, 0x24303f, 0, 1.45, 0); }
    // counter with QR stand + handwritten sign
    box(g, 3.2, 1.05, 0.7, 0x8a5a3a, 0.3, 0.52, -2.3); box(g, 3.3, 0.06, 0.8, 0xe9e6df, 0.3, 1.08, -2.3);
    qrT = canvasTex(200, 260); const qr = plane(g, 0.26, 0.34, new THREE.MeshBasicMaterial({ map: qrT.tex }), 0.12, 1.3, -2.1); qr.rotation.x = -0.25;
    box(g, 0.28, 0.02, 0.16, 0x333333, 0.12, 1.12, -2.12);
    cashSign = plane(g, 0.74, 0.39, texMat((c, w, h) => { c.fillStyle = '#c9a876'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1a0a'; c.font = 'italic 700 70px Garamond'; c.textAlign = 'center'; c.fillText('CASH', w / 2, 82); c.fillText('JAK BOLEH!', w / 2, 158); }, 520, 200), 0.58, 1.55, -2.0);
    cashSign.rotation.x = -0.1; cashSign.rotation.z = 0.04;
    const vendor = person(g, 0.6, -2.95, 0, { shirt: 0xf2f2f2, skin: SKINS[1], seed: 2 }); kedai.vendor = vendor;
    // tables with calm customers
    for (const [x, z] of [[-2.4, -3.6], [2.6, -4.2]]) { cyl(g, 0.6, 0.6, 0.05, 12, 0xf2f2f2, x, 0.75, z); cyl(g, 0.05, 0.05, 0.75, 6, 0x888888, x, 0.37, z); person(g, x - 0.7, z, Math.PI / 2, { pose: 'sit', shirt: SHIRTS[3], skin: SKINS[2], seed: 5 }); person(g, x + 0.7, z, -Math.PI / 2, { pose: 'sit', shirt: SHIRTS[6], skin: SKINS[4], seed: 6 }); }
    kedai.update = t => {
      const c = qrT.ctx; const fail = t >= E.qrGagal + 0.5; c.fillStyle = '#fff'; c.fillRect(0, 0, 200, 260); c.fillStyle = '#0f7a55'; c.fillRect(0, 0, 200, 46); c.fillStyle = '#fff'; c.font = '700 20px HudSans'; c.textAlign = 'center'; c.fillText('IMBAS DI SINI', 100, 31);
      c.fillStyle = '#111'; for (let i = 0; i < 64; i++) if (hash(i, 7) > 0.45) c.fillRect(30 + (i % 8) * 17.5, 66 + Math.floor(i / 8) * 17.5, 15, 15);
      if (fail) { c.strokeStyle = '#d8262a'; c.lineWidth = 14; c.beginPath(); c.moveTo(24, 60); c.lineTo(176, 212); c.moveTo(176, 60); c.lineTo(24, 212); c.stroke(); } c.textAlign = 'left'; qrT.tex.needsUpdate = true;
      const k = easeOut(clamp((t - (E.cash - 0.2)) / 0.35)); cashSign.visible = k > 0; cashSign.position.y = 1.25 + 0.4 * k;
      vendor.armR.rotation.x = -1.3 * k; vendor.head.rotation.z = Math.sin(t * 6) * 0.08 * (t > E.cash && t < E.tenang ? 1 : 0);
    };
  }

  // ================================================= SUMMER MALL: exterior + atrium
  const mallLuar = makeSet('mallLuar');
  {
    const g = mallLuar.g;
    ground(g, 300, 200, 0x3e3f45, 0, 0, -40); for (let i = -8; i < 8; i++) box(g, 3, 0.02, 0.2, 0xe8e2d0, i * 7, 0.02, -10);
    for (let i = -20; i < 20; i++) box(g, 2, 0.3, 0.4, i % 2 ? 0x111111 : 0xffffff, i * 2, 0.15, -17);
    ground(g, 120, 14, 0xb8553a, 0, 0.05, -26);
    const fac = texMat((c, w, h) => {
      c.fillStyle = '#4a4c52'; c.fillRect(0, 0, w, h);
      const cols = ['#f07a1a', '#3fa34d', '#4a4c52', '#f07a1a', '#3fa34d', '#f07a1a', '#4a4c52', '#3fa34d', '#f07a1a', '#4a4c52', '#3fa34d', '#f07a1a'];
      let x = 0; cols.forEach((col, i) => { const wd = 60 + (i * 37 % 50), top = (i * 53) % 60, sk = ((i * 29) % 70) - 35; c.fillStyle = col; c.beginPath(); c.moveTo(x, h); c.lineTo(x + sk * 0.5, top); c.lineTo(x + wd + sk * 0.5, top + (i % 3) * 20); c.lineTo(x + wd, h); c.closePath(); c.fill(); c.strokeStyle = '#e9e9e9'; c.lineWidth = 3; c.stroke(); x += wd; });
    }, 1024, 400);
    box(g, 70, 20, 30, 0x4a4c52, 0, 12, -50); plane(g, 54, 16, fac, -6, 13, -34.8);
    box(g, 26, 20, 30, 0x55575d, 48, 12, -50); box(g, 70, 4, 31, 0xf2f2ee, 0, 2, -50);
    box(g, 40, 0.4, 6, 0x2a2c30, -4, 5.2, -31); for (let i = 0; i < 7; i++) cyl(g, 0.2, 0.2, 5, 6, 0x8a5a3a, -22 + i * 6, 2.5, -29);
    box(g, 60, 3.6, 0.3, new THREE.MeshLambertMaterial({ color: 0x9fc0d0, transparent: true, opacity: 0.7 }), -4, 2.2, -34.6);
    for (let i = 0; i < 6; i++) palm(g, -30 + i * 12, -21, 1.2);
    crowd(g, 18, i => -14 + i * 1.5, i => -24 - (i % 3), Math.PI, 3, noOpt).forEach(p => p.walk = { dir: { x: 0, z: -1 }, speed: 1.2, span: 8 });
    for (let i = 0; i < 4; i++) { const c = new THREE.Group(); c.position.set(-20 + i * 11, 0, -10 + (i % 2) * 4); g.add(c); box(c, 4.2, 1.0, 1.8, [0xe8e8e8, 0xc23b3b, 0x3a6fb5, 0x7d8a8f][i], 0, 0.7, 0); box(c, 2.2, 0.7, 1.6, 0x24303f, 0, 1.45, 0); }
  }
  const mall = makeSet('mall'); let atmTs = [];
  {
    const g = mall.g;
    ground(g, 40, 80, tileMat('#f2ead8', '#e0d6c0', [10, 20]), 0, 0, -30);
    plane(g, 40, 80, 0xfaf8f2, 0, 15, -30).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), BM(0xffffff)); o.scale.set(3.2 - i * 0.2, 0.1, 1.5); o.position.set(0, 14.9, -8 - i * 6); g.add(o); glow(g, 0xffffff, 8, 0, 14.5, -8 - i * 6).material.opacity = 0.5; }
    const glassM = new THREE.MeshLambertMaterial({ color: 0xcfe6ee, transparent: true, opacity: 0.35 });
    for (const s of [-1, 1]) for (let lv = 1; lv <= 2; lv++) {
      box(g, 6, 0.9, 70, 0xffffff, s * 10, lv * 5 - 0.2, -32); box(g, 0.08, 1.1, 70, glassM, s * 7.1, lv * 5 + 0.8, -32);
      for (let k = 0; k < 9; k++) box(g, 5, 3.2, 0.2, [0x2a2c30, 0xf2c94c, 0xe88a8a, 0x9fd0e8, 0xffffff][(k + lv) % 5], s * 11, lv * 5 + 2.0, -4 - k * 7.5).material;
      crowd(g, 5, i => s * 8.4, i => -6 - i * 11, 0, 20 + lv * 3 + (s > 0 ? 1 : 0), () => ({ y: lv * 5 + 0.25 })).forEach(p => p.walk = { dir: { x: 0, z: 1 }, speed: 0.8, span: 20 });
    }
    for (const s of [-1, 1]) { box(g, 6, 5, 70, 0xf4efe6, s * 10, 2.5, -32); for (let k = 0; k < 9; k++) box(g, 0.1, 3.4, 5, [0x7a4a2e, 0x2f8f8a, 0xe11d48, 0x2b6cb0][k % 4], s * 6.95, 2.0, -4 - k * 7.5); }
    for (const s of [-0.9, 0.9]) { const e = box(g, 1.2, 0.5, 13, 0x33363c, s, 2.6, -44); e.rotation.x = 0.4; box(g, 0.1, 0.9, 13, glassM, s - 0.6, 3.3, -44).rotation.x = 0.4; }
    // ATM row on the left with a long queue
    for (let k = 0; k < 3; k++) { const z = -5.5 - k * 1.5; box(g, 0.7, 1.9, 1.0, 0x2d3a4a, -6.4, 0.95, z); box(g, 0.72, 0.4, 1.02, 0xf2c94c, -6.4, 2.05, z); const T = canvasTex(256, 160); plane(g, 0.55, 0.34, new THREE.MeshBasicMaterial({ map: T.tex }), -6.03, 1.35, z).rotation.y = Math.PI / 2; atmTs.push(T); }
    plane(g, 3.0, 0.6, signMat('ATM', '#0f4c81', '#ffffff', 300, 80, '800 56px HudSans'), -6.0, 3.0, -7).rotation.y = Math.PI / 2;
    mall.queue = crowd(g, 26, i => -4.6 + (i > 12 ? (i - 12) * 0.0 + 1.4 : 0) + Math.sin(i * 0.7) * 0.15, i => i <= 12 ? -5.5 - i * 0.95 : -17 + (i - 12) * 0.95, i => i <= 12 ? 0 : Math.PI, 7, i => ({ phone: i % 4 === 1 }));
    mall.update = t => { for (const [k, T] of atmTs.entries()) { const c = T.ctx; const ok = k === 0; c.fillStyle = ok ? '#0f4c81' : '#5a1010'; c.fillRect(0, 0, 256, 160); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 26px HudSans'; if (ok) { c.fillText('TUNAI SAHAJA', 128, 70); c.fillText('LUAR TALIAN', 128, 108); } else { c.fillText('TIADA', 128, 70); c.fillText('SAMBUNGAN', 128, 108); } c.textAlign = 'left'; T.tex.needsUpdate = true; } for (const q of mall.queue) q.g.rotation.z = Math.sin(t * 1.5 + q.seed) * 0.02; };
  }

  // ================================================= MARKET STREET (Pasar Serikin; reused for Day 7 market)
  const pasar = makeSet('pasar'); let qrBoard, pasarVendor;
  {
    const g = pasar.g;
    ground(g, 14, 120, 0x6f6e6a, 0, 0, -50); ground(g, 300, 300, 0x5d8a45, 0, -0.03, -80);
    const zinc = texMat((c, w, h) => { for (let x = 0; x < w; x += 16) { c.fillStyle = x % 32 ? '#8a8d90' : '#9a9da0'; c.fillRect(x, 0, 16, h); } }, 256, 64, { repeat: [3, 1] });
    const goods = [0xc0392b, 0xf2c94c, 0x2b6cb0, 0x8e44ad, 0xe67e22, 0x2f8f6a, 0xd77a9a, 0x8a5a3a];
    for (const s of [-1, 1]) for (let i = 0; i < 12; i++) {
      const z = -2 - i * 5.2, x = s * 5.6;
      for (const dz of [-2.3, 2.3]) box(g, 0.14, 3.0, 0.14, 0x6b4a2b, s * 3.6, 1.5, z + dz);
      box(g, 4, 3.0, 5, 0x3a2c20, x + s * 0.4, 1.5, z);
      const roof = box(g, 4.6, 0.08, 5.2, zinc, x - s * 0.2, 3.25, z); roof.rotation.z = s * 0.16;
      box(g, 2.0, 0.8, 4.4, 0x7d5a3a, s * 3.9, 0.4, z);
      for (let k = 0; k < 9; k++) box(g, 0.34, 0.5 + hash(k, i) * 0.3, 0.1, goods[(k + i + (s > 0 ? 3 : 0)) % 8], s * 3.55, 2.3 - (k % 2) * 0.2, z - 2 + k * 0.5);
      for (let k = 0; k < 6; k++) sphere(g, 0.16, goods[(k * 3 + i) % 8], s * 3.7 + hash(k, 2) * 0.4, 0.95, z - 1.6 + k * 0.6, 0);
      if (i % 3 === 1) { const um = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.5, 8), K.mat([0x2f8f4a, 0xd8262a, 0xf2c94c, 0x2b6cb0][i % 4])); um.position.set(s * 2.6, 2.5, z); g.add(um); cyl(g, 0.03, 0.03, 2.5, 5, 0x333333, s * 2.6, 1.25, z); }
    }
    for (let i = 0; i < 5; i++) { cyl(g, 0.1, 0.12, 8, 6, 0x8a8478, 3.3, 4, -6 - i * 14); box(g, 0.02, 0.02, 14, 0x222222, 3.3, 7.6, -13 - i * 14); }
    for (let i = 0; i < 7; i++) sphere(g, 26 + rand() * 14, [0x3f6b35, 0x4d7d3c, 0x355e2e][i % 3], -70 + i * 24, 4, -110 - rand() * 20, 1).scale.y = 0.5;
    for (let i = 0; i < 5; i++) palm(g, -9 + i * 5, -64, 1.5);
    pasar.walkers = crowd(g, 20, i => (i % 5 - 2) * 0.9, i => -22, i => i % 2 ? 0 : Math.PI, 11, i => ({ bag: i % 3 ? null : 0xf2f2f2 }));
    pasar.walkers.forEach((p, i) => p.walk = { dir: { x: 0, z: i % 2 ? 1 : -1 }, speed: 0.9 + hash(i, 5) * 0.4, span: 34 });
    // front-left stall: crossed-out QR board, vendor taking cash
    qrBoard = plane(g, 0.5, 0.62, texMat((c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#0f7a55'; c.fillRect(0, 0, w, 44); c.fillStyle = '#111'; for (let i = 0; i < 64; i++) if (hash(i, 9) > 0.45) c.fillRect(28 + (i % 8) * 18, 62 + Math.floor(i / 8) * 18, 15, 15); c.strokeStyle = '#d8262a'; c.lineWidth = 16; c.beginPath(); c.moveTo(20, 56); c.lineTo(180, 216); c.moveTo(180, 56); c.lineTo(20, 216); c.stroke(); }, 200, 250), -2.75, 1.25, -2.9);
    qrBoard.rotation.y = 0.5;
    const tunai = plane(g, 0.8, 0.3, signMat('TUNAI SAHAJA', '#f2e2b0', '#2a1a0a', 420, 150, '800 50px HudSans'), -2.75, 1.78, -2.9); tunai.rotation.y = 0.5;
    pasarVendor = person(g, -3.6, -3.4, 0.9, { shirt: 0x2f8f8a, skin: SKINS[2], seed: 77 });
    const noteM = BM(0xc9473e); const note = box(pasarVendor.armR, 0.14, 0.01, 0.07, noteM, 0, -0.52, 0.06);
    pasar.update = (t, mode) => { const k = mode === 'serikin' ? smooth(E.tunai, E.tunai + 0.5, t) : 1; pasarVendor.armR.rotation.x = -1.2 * k; qrBoard.visible = true; };
  }

  // ================================================= BINTULU PORT
  const port = makeSet('port'); let portCranes = [];
  {
    const g = port.g;
    ground(g, 400, 160, 0x8a8a86, 0, 0, -70); ground(g, 3000, 3000, new THREE.MeshLambertMaterial({ color: 0x3f7f86 }), 0, -1.5, -1650);
    const CC = [0xb5352b, 0x2f8f4a, 0xf2f2ee, 0x2b5fb0, 0xb5352b, 0x2f8f4a, 0xd9a443];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 7; c++) { const st = 1 + ((r * 3 + c * 5) % 4); for (let s = 0; s < st; s++) box(g, 6, 2.5, 2.4, CC[(r * 2 + c + s) % 7], -40 + r * 9.5, 1.25 + s * 2.55, -18 - c * 5.5); }
    const blue = 0x23408f;
    const crane = (x) => { const c = new THREE.Group(); c.position.set(x, 0, -112); g.add(c);
      for (const a of [-7, 7]) for (const b of [-5, 5]) box(c, 1.1, 40, 1.1, blue, a, 20, b);
      box(c, 16, 1.6, 12, blue, 0, 40, 0); box(c, 15, 1.2, 1.2, blue, 0, 22, -5); box(c, 15, 1.2, 1.2, blue, 0, 22, 5);
      const boom = new THREE.Group(); boom.position.set(0, 41, 0); c.add(boom);
      for (let k = 0; k < 10; k++) box(boom, 2.2, 1.8, 6, k % 2 ? 0xf2f2ee : blue, 0, 0, -8 - k * 6 + 30);
      box(c, 2, 14, 2, blue, 0, 48, 2); const tr = box(c, 3, 2, 3, 0x333333, 0, 39, -10); return { c, tr, boom }; };
    portCranes = [crane(-30), crane(6), crane(42)];
    const ship = new THREE.Group(); ship.position.set(10, -1.5, -150); g.add(ship); box(ship, 150, 8, 18, 0x1f2a3a, 0, 2, 0); box(ship, 12, 12, 14, 0xf2f2f2, -60, 11, 0);
    for (let i = 0; i < 12; i++) for (let k = 0; k < 2; k++) box(ship, 9, 2.6, 14, CC[(i + k) % 7], -44 + i * 10, 7.5 + k * 2.7, 0);
    for (let i = 0; i < 8; i++) sphere(g, 60 + rand() * 30, [0x3f6b35, 0x4d7d3c][i % 2], -400 + i * 110, 0, -600 - rand() * 100, 1).scale.y = 0.35;
    for (let i = 0; i < 4; i++) cyl(g, 7, 7, 14, 12, 0xe2e2dc, -110 - i * 16, 7, -40);
    const lorries = []; for (let i = 0; i < 6; i++) { const l = new THREE.Group(); l.position.set(-14 + i * 9, 0, -8); g.add(l); box(l, 6.2, 2.6, 2.5, CC[i % 7], 0.6, 2.4, 0); box(l, 2, 2.2, 2.4, 0xf2f2f2, -3.6, 1.6, 0); box(l, 8.6, 0.5, 2.4, 0x222222, -0.2, 0.7, 0); lorries.push(l); }
    port.update = t => { const slow = 1 - smooth(E.perlahan, E.perlahan + 1.5, t); portCranes.forEach((c, i) => { const ph = Math.min(t, E.perlahan + 1.5) * 0.9 * (0.3 + slow * 0.7) + i; c.tr.position.z = -10 + Math.sin(ph) * 14; }); };
  }

  // ================================================= WAREHOUSE (gudang)
  const gudang = makeSet('gudang');
  {
    const g = gudang.g;
    ground(g, 40, 60, 0x8f9296, 0, 0, -20); plane(g, 40, 60, 0x3a3d42, 0, 11, -20).rotation.x = Math.PI / 2;
    plane(g, 40, 11, 0xb8bcc0, 0, 5.5, -44); for (const s of [-1, 1]) plane(g, 60, 11, 0xa8acb0, s * 13, 5.5, -20).rotation.y = -s * Math.PI / 2;
    for (let i = 0; i < 5; i++) box(g, 10, 0.08, 0.5, BM(0xffffff), 0, 10.8, -4 - i * 8);
    const bx = [0xc9a36a, 0xb8905a, 0xd4b07a];
    for (const s of [-1, 1]) for (let r = 0; r < 6; r++) { const z = -5 - r * 6;
      for (let lv = 0; lv < 4; lv++) { box(g, 3.2, 0.12, 5, 0x2b6cb0, s * 8.5, 0.1 + lv * 2.4, z); for (let k = 0; k < 6; k++) box(g, 1.3, 1.3 + hash(k, lv + r) * 0.6, 1.3, bx[(k + lv + r) % 3], s * 8.5 + (k % 2 - 0.5) * 1.5, 0.9 + lv * 2.4, z - 1.6 + Math.floor(k / 2) * 1.6); }
      for (const dz of [-2.5, 2.5]) box(g, 0.15, 9.6, 0.15, 0xe67e22, s * 6.9, 4.8, z + dz); }
    for (let k = 0; k < 14; k++) box(g, 1.2, 1.1, 1.2, bx[k % 3], -3 + (k % 4) * 1.3, 0.55 + Math.floor(k / 8) * 1.1, -7 - Math.floor((k % 8) / 4) * 1.3);
    box(g, 9, 6, 0.3, BM(0xdfeaf2), 0, 3, -43.8);
    const lorry = new THREE.Group(); lorry.position.set(0, 0, -39); g.add(lorry); box(lorry, 2.6, 2.8, 6, 0xe8e2d0, 0, 2.0, 0); box(lorry, 2.6, 2.0, 2, 0x2b6cb0, 0, 1.5, -4);
    const w1 = person(g, 2.2, -6, -0.6, { shirt: 0xf07a1a, skin: SKINS[0], seed: 80 }); box(w1.armL, 0.24, 0.3, 0.02, 0xf2f2f2, 0, -0.5, 0.08); w1.armL.rotation.x = -1.1;
    person(g, 3.4, -9, 2.6, { shirt: 0xf07a1a, skin: SKINS[3], seed: 81 });
    gudang.update = t => { w1.head.rotation.x = 0.3; };
  }

  // ================================================= SUPERMARKET
  const pasaraya = makeSet('pasaraya'); const shelfItems = [];
  {
    const g = pasaraya.g;
    ground(g, 30, 60, tileMat('#eeeeea', '#d8d8d2', [8, 16]), 0, 0, -20); plane(g, 30, 60, 0xfafafa, 0, 5, -20).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) box(g, 0.3, 0.05, 3, BM(0xffffff), 0, 4.95, -3 - i * 5);
    const cols = [0xd8262a, 0xf2c94c, 0x2b6cb0, 0x2f8f4a, 0xf07a1a, 0xf2f2f2, 0x8e44ad];
    for (const s of [-1, 1]) for (let b = 0; b < 8; b++) { const z = -2.5 - b * 3.2;
      box(g, 0.9, 2.6, 3.0, 0xdfe2e6, s * 2.5, 1.3, z);
      for (let lv = 0; lv < 4; lv++) { box(g, 1.0, 0.05, 3.0, 0xbfc4c9, s * 2.3, 0.35 + lv * 0.6, z);
        for (let k = 0; k < 7; k++) { const it = box(g, 0.3, 0.38, 0.34, cols[(k + lv + b * 2) % 7], s * 2.05, 0.58 + lv * 0.6, z - 1.25 + k * 0.42);
          const h = hash(b * 31 + lv * 7 + k, s > 0 ? 1 : 2); shelfItems.push({ it, gone: h < 0.62 ? E.rak - 0.6 + h * 5 : 1e9 }); } }
      if (b % 3 === 1) { const tag = plane(g, 0.9, 0.3, signMat('STOK HABIS', '#fff200', '#c0392b', 400, 130, '800 56px HudSans'), s * 1.98, 1.75, z); tag.rotation.y = -s * Math.PI / 2; tag.userData.at = E.rak + 1.2 + b * 0.25; shelfItems.push({ it: tag, tag: true }); } }
    const trolley = new THREE.Group(); trolley.position.set(0.9, 0, -3.2); g.add(trolley); box(trolley, 0.7, 0.5, 1.0, 0x9aa3ab, 0, 0.8, 0); for (let k = 0; k < 6; k++) box(trolley, 0.26, 0.3, 0.26, cols[k], -0.18 + (k % 2) * 0.36, 1.15 + Math.floor(k / 2) * 0.28, -0.25 + (k % 3) * 0.2);
    const sh = person(g, 0.9, -2.5, Math.PI, { shirt: SHIRTS[4], skin: SKINS[1], seed: 90 }); sh.armL.rotation.x = sh.armR.rotation.x = -1.0;
    crowd(g, 6, i => (i % 2 ? 0.8 : -0.8), i => -8 - i * 3, i => i % 2 ? -Math.PI / 2 : Math.PI / 2, 13, i => ({ bag: 0xf2f2f2 }));
    pasaraya.update = t => { for (const s of shelfItems) s.it.visible = s.tag ? t >= s.it.userData.at : t < s.gone; };
  }

  // ================================================= HOSPITAL (exterior, emergency lane)
  const hospital = makeSet('hospital');
  {
    const g = hospital.g;
    ground(g, 300, 300, 0x6a9a50, 0, -0.01, -60); ground(g, 14, 90, 0x3d3e43, 0, 0, -30); ground(g, 3.2, 90, 0xa8453a, -2.5, 0.01, -30);
    box(g, 70, 18, 14, windowTex(901, 12, 6, '#e3c9c2', '#5a6470'), 0, 9, -74);
    const roofM = K.mat(0xc8503a); const hip = (w, d, h, x, y, z) => { const r = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofM); r.scale.set(w * 0.72, h, d * 0.72); r.rotation.y = Math.PI / 4; r.position.set(x, y + h / 2, z); g.add(r); };
    hip(70, 14, 4, 0, 18, -74); box(g, 10, 24, 10, 0xe8d2cc, 0, 12, -68); hip(11, 11, 4, 0, 24, -68);
    plane(g, 9.5, 1.4, signMat('HOSPITAL UMUM SARAWAK', '#e8d2cc', '#1a2a5a', 600, 90, '800 40px HudSans'), 0, 21.5, -62.9);
    // emergency building with glass canopy
    box(g, 30, 10, 16, 0xf4f4f0, 22, 5, -40); box(g, 12, 4, 0.3, 0x7a5a9a, 16, 7, -31.8); box(g, 8, 3, 0.3, 0x2f6a4a, 28, 6, -31.8);
    box(g, 22, 0.3, 10, new THREE.MeshLambertMaterial({ color: 0x9fb8c8, transparent: true, opacity: 0.6 }), 12, 6.2, -26); for (const x of [2, 12, 22]) for (const z of [-22, -30]) box(g, 0.5, 6.2, 0.5, 0xffffff, x, 3.1, z);
    box(g, 0.3, 7, 0.3, 0xdddddd, -5.4, 3.5, -9); plane(g, 3.2, 5.2, texMat((c, w, h) => { c.fillStyle = '#1f5fc0'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, w, 70); c.fillStyle = '#111'; c.font = '700 26px HudSans'; c.textAlign = 'center'; c.fillText('HOSPITAL UMUM', w / 2, 44); c.fillStyle = '#d8262a'; c.fillRect(0, 150, w, 110); c.fillStyle = '#fff'; c.font = '800 44px HudSans'; c.fillText('KECEMASAN', w / 2, 200); c.font = '700 26px HudSans'; c.fillText('EMERGENCY  ↑', w / 2, 240); c.fillText('LUAR TALIAN:', w / 2, 330); c.fillText('REKOD KERTAS', w / 2, 366); }, 320, 520), -5.4, 4.2, -8.8);
    const amb = new THREE.Group(); amb.position.set(6, 0, -24); amb.rotation.y = -0.4; g.add(amb); box(amb, 2.2, 2.4, 5, 0xf2f2f2, 0, 1.5, 0); box(amb, 2.22, 0.3, 5.02, 0xd8262a, 0, 1.4, 0); hospital.al = glow(amb, 0x4a7aff, 2.2, 0, 2.9, 1.5);
    // staff with clipboards at a folding table (backup procedure)
    box(g, 2.2, 0.06, 0.9, 0xf2f2f2, 1.2, 0.95, -5.5); for (const x of [0.3, 2.1]) box(g, 0.06, 0.95, 0.06, 0x888888, x, 0.47, -5.5);
    for (let k = 0; k < 5; k++) box(g, 0.3, 0.02 + k * 0.012, 0.4, 0xfbf7ea, 0.6 + k * 0.32, 1.0, -5.5);
    const n1 = person(g, 1.0, -6.3, 0, { shirt: 0xf6f6f6, pants: 0x2c3e66, skin: SKINS[0], seed: 95 }); n1.armR.rotation.x = -1.0; box(n1.armR, 0.22, 0.02, 0.3, 0x8a5a3a, 0, -0.5, 0.1);
    person(g, 1.9, -6.2, -0.3, { shirt: 0x7fd0c8, skin: SKINS[3], seed: 96 });
    crowd(g, 5, i => 3.2 + i * 0.7, i => -5.2, -Math.PI / 2, 15, noOpt);
    for (let i = 0; i < 8; i++) tree(g, -44 + i * 9, -46, 1.6);
    hospital.update = t => { hospital.al.material.color.setHex(Math.floor(t * 4) % 2 ? 0x4a7aff : 0xff3a3a); n1.armR.rotation.z = Math.sin(t * 8) * 0.06; };
  }

  // ================================================= RUAI (longhouse veranda)
  const ruai = makeSet('ruai'); const fans = []; let radioGlow;
  {
    const g = ruai.g;
    const floorM = texMat((c, w, h) => { c.fillStyle = '#5f7fa8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9d6e6'; c.lineWidth = 3; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.strokeRect(x * 64 + 8, y * 64 + 8, 48, 48); c.strokeRect(x * 64 + 20, y * 64 + 20, 24, 24); } }, 256, 256, { repeat: [5, 30] });
    ground(g, 7, 70, floorM, 0, 0, -30);
    const ceilM = texMat((c, w, h) => { c.fillStyle = '#e9e6de'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b8b2a6'; c.lineWidth = 4; c.strokeRect(0, 0, w, h); }, 128, 128, { repeat: [4, 36] });
    plane(g, 7, 70, ceilM, 0, 3.1, -30).rotation.x = Math.PI / 2;
    const wood = texMat((c, w, h) => { for (let x = 0; x < w; x += 20) { c.fillStyle = ['#5a3423', '#4e2c1d', '#633a27'][(x / 20) % 3]; c.fillRect(x, 0, 19, h); } }, 240, 64, { repeat: [14, 1] });
    plane(g, 70, 3.1, wood, -3.5, 1.55, -30).rotation.y = Math.PI / 2; plane(g, 70, 3.1, wood, 3.5, 1.55, -30).rotation.y = -Math.PI / 2;
    for (let i = 0; i < 11; i++) { const z = -3 - i * 6; box(g, 0.06, 2.1, 1.0, 0x8a5a3a, -3.46, 1.05, z); plane(g, 1.4, 1.2, BM(0xdff0e0), -3.47, 1.7, z + 2.4).rotation.y = Math.PI / 2; for (const dz of [-0.5, 0.5]) box(g, 0.04, 1.2, 0.4, 0xc0392b, -3.42, 1.7, z + 2.4 + dz); box(g, 0.06, 2.1, 1.0, 0x7a4a2e, 3.46, 1.05, z - 1); }
    for (let i = 0; i < 6; i++) { const f = new THREE.Group(); f.position.set(0, 2.85, -4 - i * 9); g.add(f); cyl(f, 0.02, 0.02, 0.4, 5, 0x555555, 0, 0.2, 0); cyl(f, 0.12, 0.12, 0.08, 8, 0x3a3a3a, 0, 0, 0); const bl = new THREE.Group(); f.add(bl); for (let k = 0; k < 4; k++) { const b = box(bl, 0.8, 0.02, 0.15, 0x2a3a4a, 0.45, 0, 0); b.position.set(Math.cos(k * 1.571) * 0.45, 0, Math.sin(k * 1.571) * 0.45); b.rotation.y = -k * 1.571; } fans.push(bl); }
    box(g, 1.6, 0.08, 0.5, 0x7d5034, -2.9, 0.5, -1.5); for (const dz of [-0.7, 0.7]) box(g, 0.08, 0.5, 0.4, 0x7d5034, -2.9, 0.25, -1.5 + dz);
    // residents sitting in a circle around a radio
    box(g, 2.6, 0.02, 2.2, 0xb8905a, 0.3, 0.02, -3.6);
    box(g, 0.5, 0.3, 0.16, 0x3a2a1a, 0.3, 0.2, -3.6); box(g, 0.2, 0.2, 0.02, 0xc9a36a, 0.18, 0.2, -3.51); cyl(g, 0.008, 0.008, 0.6, 4, 0xcccccc, 0.5, 0.55, -3.62).rotation.z = -0.3;
    radioGlow = glow(g, 0xffd27a, 0.9, 0.3, 0.3, -3.45);
    const N = 7; ruai.sit = []; for (let i = 0; i < N; i++) { const a = Math.PI * 0.15 + i / (N - 1) * Math.PI * 1.7; const p = person(g, 0.3 + Math.sin(a) * 1.4, -3.6 - Math.cos(a) * 1.4, a + Math.PI, { pose: 'sit', y: -0.1, shirt: SHIRTS[i + 1], skin: SKINS[i % 6], seed: 200 + i }); ruai.sit.push(p); }
    const l = new THREE.PointLight(0xffe8c8, 1.2, 14, 1); l.position.set(-2.5, 2.2, -4); g.add(l);
    ruai.update = t => { fans.forEach((f, i) => f.rotation.y = t * 6 + i); const on = t >= E.radio - 0.3; radioGlow.material.opacity = on ? 0.5 + 0.3 * Math.sin(t * 9) : 0; for (const p of ruai.sit) p.head.rotation.x = on ? 0.25 : 0; };
  }

  // ================================================= TOWN STREET (rumours)
  const bandar = makeSet('bandar');
  {
    const g = bandar.g;
    ground(g, 16, 100, 0x77746e, 0, 0, -40);
    const cols = ['#efe2c4', '#cfe3d4', '#f0c9b4', '#f3e7a6', '#d8d4ec', '#f6efe4'];
    for (const s of [-1, 1]) for (let i = 0; i < 12; i++) { const z = -2 - i * 5; box(g, 4, 9, 4.9, windowTex(40 + i + (s > 0 ? 100 : 0), 2, 3, cols[(i + (s > 0 ? 3 : 0)) % 6], '#3b3f48'), s * 7, 4.5, z); box(g, 0.3, 3.2, 0.3, 0xf2ece0, s * 4.6, 1.6, z + 2.3); box(g, 1.0, 0.2, 4.9, 0xe2d6c4, s * 4.9, 3.3, z); box(g, 0.1, 0.7, 3.4, K.mat([0xc0392b, 0x2b6cb0, 0x2f8f6a, 0xd9a443][i % 4]), s * 4.5, 2.8, z); }
    bandar.groups = [];
    [[-1.6, -4.5], [1.7, -6.5], [-0.6, -10], [2.2, -13]].forEach(([x, z], gi) => { const ps = []; for (let k = 0; k < 3; k++) { const a = k * 2.094 + gi; ps.push(person(g, x + Math.cos(a) * 0.6, z + Math.sin(a) * 0.6, -a + Math.PI / 2, { shirt: SHIRTS[(gi * 3 + k) % 10], skin: SKINS[(gi + k) % 6], seed: 300 + gi * 3 + k })); } bandar.groups.push({ x, z, ps }); });
    bandar.update = t => { for (const gr of bandar.groups) gr.ps.forEach((p, k) => { p.armR.rotation.x = -0.8 + Math.sin(t * 5 + k * 2 + gr.x) * 0.5; p.head.rotation.y = Math.sin(t * 2 + k) * 0.5; }); };
  }

  // ================================================= ONLINE SELLER ROOM (Day 6)
  const online = makeSet('online'); let lapT, shutter6;
  {
    const g = online.g;
    ground(g, 8, 8, tileMat('#d9d2c4', '#bfb7a6', [4, 4]), 0, 0, -1); plane(g, 8, 3.2, 0xece6da, 0, 1.6, -3.4); plane(g, 8, 3.2, 0xe2dccf, -2.6, 1.6, -1).rotation.y = Math.PI / 2; plane(g, 8, 3.2, 0xe2dccf, 2.6, 1.6, -1).rotation.y = -Math.PI / 2; plane(g, 8, 8, 0xf6f3ec, 0, 3.2, -1).rotation.x = Math.PI / 2;
    box(g, 2.2, 0.06, 0.9, 0x8a6a4a, 0.2, 0.78, -2.6); for (const x of [-0.8, 1.2]) box(g, 0.06, 0.78, 0.8, 0x6b4a2b, x, 0.39, -2.6);
    box(g, 0.75, 0.03, 0.5, 0x2a2d33, 0.2, 0.83, -2.5); const lid = box(g, 0.75, 0.5, 0.03, 0x2a2d33, 0.2, 1.08, -2.76); lid.rotation.x = -0.15;
    lapT = canvasTex(512, 320); const ls = plane(g, 0.7, 0.44, new THREE.MeshBasicMaterial({ map: lapT.tex }), 0.2, 1.08, -2.74); ls.rotation.x = -0.15;
    const bx = [0xc9a36a, 0xb8905a, 0xd4b07a]; for (let k = 0; k < 22; k++) { const b = box(g, 0.45, 0.35, 0.4, bx[k % 3], -1.9 + (k % 4) * 0.5, 0.18 + Math.floor(k / 8) * 0.36, -2.9 + Math.floor((k % 8) / 4) * 0.45); box(g, 0.46, 0.05, 0.1, 0xe8d9b8, b.position.x, b.position.y + 0.16, b.position.z); }
    for (let k = 0; k < 6; k++) box(g, 0.4, 0.3, 0.35, bx[k % 3], 1.6, 0.15 + k * 0.31, -2.8);
    const l = new THREE.PointLight(0xfff0d8, 1.4, 9, 1); l.position.set(0, 2.6, -1.5); g.add(l);
    online.update = t => { const c = lapT.ctx; c.fillStyle = '#f4f6f9'; c.fillRect(0, 0, 512, 320); c.fillStyle = '#e11d48'; c.fillRect(0, 0, 512, 60); c.fillStyle = '#fff'; c.font = '700 30px HudSans'; c.textAlign = 'center'; c.fillText('PESANAN HARI INI', 256, 42); c.fillStyle = '#111'; c.font = '800 150px HudSans'; c.fillText('0', 256, 210);
      c.fillStyle = '#c0392b'; c.font = '700 28px HudSans'; c.fillText(t >= E.rugi ? 'Jualan: −100%  ▼' : 'Tiada sambungan', 256, 280); c.textAlign = 'left'; lapT.tex.needsUpdate = true; };
  }

  // ================================================= KAMPUNG (river, garden, sampan, neighbours)
  const kampung = makeSet('kampung'); let sampanK, basket, nb = [];
  {
    const g = kampung.g;
    ground(g, 200, 40, 0x6aa04f, 0, 0, -10);
    const water = ground(g, 400, 120, new THREE.MeshLambertMaterial({ color: 0x9a7a52 }), 0, -0.4, -90);
    ground(g, 600, 300, 0x4f8a3e, 0, 0.5, -300); for (let i = 0; i < 26; i++) tree(g, -150 + i * 12 + rand() * 5, -155 - rand() * 30, 3 + rand() * 2.5, [0x2f5e2a, 0x3f6b35, 0x4d7d3c][i % 3]);
    for (let i = 0; i < 6; i++) sphere(g, 60 + rand() * 40, 0x3a6a34, -260 + i * 110, 0, -330, 1).scale.y = 0.45;
    // stilt house
    const hs = new THREE.Group(); hs.position.set(7.5, 0, -14); g.add(hs); for (const x of [-2.5, 2.5]) for (const z of [-2, 2]) cyl(hs, 0.15, 0.15, 1.6, 6, 0x5a4232, x, 0.8, z);
    box(hs, 6, 2.6, 5, 0x8a6a4a, 0, 2.9, 0); const rf = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.2, 4), K.mat(0x7fb8d8)); rf.rotation.y = Math.PI / 4; rf.position.y = 5.3; rf.scale.z = 0.85; hs.add(rf); box(hs, 1, 1.6, 0.1, 0x5a3a22, -1, 2.6, 2.52); box(hs, 1.2, 0.1, 2.4, 0x7d5a3a, -1, 1.5, 3.6).rotation.x = 0.5;
    // vegetable beds
    for (let r = 0; r < 4; r++) { box(g, 7, 0.25, 0.9, 0x6b4a2b, -5.5, 0.12, -6 - r * 1.6); for (let k = 0; k < 10; k++) sphere(g, 0.22, [0x3fa34d, 0x57b85f][k % 2], -8.6 + k * 0.68, 0.42, -6 - r * 1.6, 0).scale.y = 1.3; }
    kampung.farmer = person(g, -4.6, -4.6, 2.6, { shirt: 0xd9c14a, skin: SKINS[3], seed: 400 }); cyl(kampung.farmer.armR, 0.02, 0.02, 1.2, 5, 0x7d5a3a, 0, -0.6, 0.3).rotation.x = 1.2;
    // sampan with a fisherman
    sampanK = new THREE.Group(); g.add(sampanK); box(sampanK, 5.5, 0.5, 1.2, 0x2f6fb5, 0, 0, 0); box(sampanK, 0.8, 0.5, 1.0, 0x2a5a90, 2.6, 0.25, 0);
    const fm = person(sampanK, -0.5, 0, Math.PI / 2, { pose: 'sit', y: 0.25, shirt: 0xf2f2f2, skin: SKINS[1], seed: 401 }); cyl(fm.armR, 0.015, 0.015, 3, 4, 0x5a4232, 0, -0.4, 1.2).rotation.x = 1.0;
    // neighbours handing over a basket
    nb = [person(g, 0.6, -3.6, Math.PI / 2, { shirt: 0xb85445, skin: SKINS[0], seed: 402 }), person(g, 1.8, -3.6, -Math.PI / 2, { shirt: 0x3e5a8c, skin: SKINS[4], seed: 403 })];
    basket = new THREE.Group(); g.add(basket); cyl(basket, 0.24, 0.18, 0.22, 10, 0xb8905a, 0, 0, 0); for (let k = 0; k < 5; k++) sphere(basket, 0.08, [0xd8262a, 0x3fa34d, 0xf2c94c][k % 3], (k - 2) * 0.08, 0.14, (k % 2) * 0.06, 0);
    kampung.update = t => { sampanK.position.set(-22 + ((t * 1.4) % 60), -0.2, -52); sampanK.position.y += Math.sin(t * 2) * 0.05;
      kampung.farmer.armR.rotation.x = -0.7 + Math.sin(t * 3) * 0.5;
      const k = smooth(E.jiran - 0.4, E.jiran + 0.8, t); nb[0].armR.rotation.x = nb[0].armL.rotation.x = -1.2; nb[1].armR.rotation.x = nb[1].armL.rotation.x = -1.2 * k; basket.position.set(lerp(1.0, 1.4, k), 1.0, -3.6); };
  }

  // ================================================= KUCHING RIVERFRONT AT NIGHT (ending)
  const river = makeSet('river'); const city = [];
  {
    const g = river.g;
    const brick = texMat((c, w, h) => { c.fillStyle = '#8f8379'; c.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { c.fillStyle = ['#a39486', '#978a7e', '#8a7d72', '#ab9d90'][(x * 7 + y * 3) % 4]; c.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14); } }, 256, 256, { repeat: [20, 6] });
    ground(g, 80, 8, brick, 0, 0, -0.5);
    const rail = texMat((c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#141414'; c.lineWidth = 7; c.strokeRect(4, 4, w - 8, h - 8); for (let i = 0; i < 4; i++) { const cx = 32 + i * 64; c.beginPath(); c.arc(cx, h / 2, 26, 0, 7); c.stroke(); } }, 256, 80, { transparent: true, alphaTest: 0.4 }); rail.side = THREE.DoubleSide;
    for (let x = -40; x < 40; x += 2) { box(g, 0.08, 1.1, 0.08, 0x151515, x, 0.55, -4.3); plane(g, 1.92, 0.62, rail, x + 1, 0.55, -4.3); }
    box(g, 80, 0.06, 0.08, 0x151515, 0, 1.05, -4.3);
    river.lamps = []; for (const x of [-9, 6]) { cyl(g, 0.07, 0.11, 4.4, 8, 0x151515, x, 2.2, -3.9); const hd = sphere(g, 0.24, BM(0x333333), x, 4.55, -3.9, 1); river.lamps.push({ hd, gl: glow(g, 0xffe2a8, 2.6, x, 4.55, -3.9) }); }
    const water = ground(g, 400, 160, new THREE.MeshLambertMaterial({ color: 0x141c2c }), 0, -1.2, -84);
    box(g, 400, 2.4, 3, 0x55554f, 0, -0.2, -162); ground(g, 600, 300, 0x1f3a22, 0, 4, -320);
    const dun = new THREE.Group(); dun.position.set(-26, 6, -205); dun.scale.setScalar(0.85); g.add(dun);
    box(dun, 90, 4, 60, 0xe7e1d6, 0, 2, 0); cyl(dun, 24, 24, 16, 18, 0xefe8dc, 0, 12, 0);
    const r1 = pleatedCone(34, 9, 9, 0xd4a03c, 0.25, 0.78); r1.position.y = 22; dun.add(r1); cyl(dun, 15, 16, 7, 18, 0xe9dfcf, 0, 30, 0); const r2 = pleatedCone(23, 40, 9, 0xd9a443, 0.12, 0.72); r2.position.y = 33; dun.add(r2); cyl(dun, 0.4, 1.4, 14, 6, 0xc28f37, 0, 79, 0);
    river.dunGlow = glow(g, 0xffd28a, 150, -26, 30, -200);
    for (let i = 0; i < 14; i++) { const hgt = 24 + hash(i, 1) * 60, x = 26 + i * 15, z = -230 - hash(i, 2) * 60; const dark = box(g, 13, hgt, 13, windowTex(700 + i, 4, 10, '#2a2f3c', '#161a24'), x, 4 + hgt / 2, z); const lit = box(g, 13.1, hgt, 13.1, new THREE.MeshBasicMaterial({ map: windowTex(800 + i, 4, 10, '#3a4050', '#1a1e28', 0.6, '#ffd58a').map, fog: false }), x, 4 + hgt / 2, z); city.push({ lit, at: hash(i, 3) * 2.2 }); }
    river.update = t => { const d = t - E.kembali; for (const c of city) c.lit.visible = d > c.at; const on = d > 0.8; for (const l of river.lamps) { l.hd.material.color.setHex(on ? 0xffe8c0 : 0x333333); l.gl.material.opacity = on ? 0.7 : 0; } river.dunGlow.material.opacity = smooth(0.5, 2.5, d) * 0.5; };
  }

  // ------------------------------------------------ per-scene look
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const DAY = { sky: [0x4a8fd8, 0xd8ecf8], fog: [0xdfe8ef, 80, 900], hemi: [0xffffff, 0x777777, 1.35], sun: [0xfff2dc, 1.5, V(40, 90, 60)] };
  const LOOK = {
    hook: { set: 'bilik', day: 0, loc: 'KUCHING', map: 'Kuching', pos: [V(-0.3, 1.35, 1.2), V(-0.2, 1.3, 0.8)], look: [V(0.6, 1.2, -3), V(0.7, 1.1, -3)], sky: [0x6aa8e0, 0xf6d6a8], fog: [0xf6e6d0, 20, 60], hemi: [0xfff2dc, 0x6a5040, 1.2], sun: [0xffe2b0, 1.0, V(20, 30, 10)] },
    h1bilik: { set: 'bilik', day: 1, loc: 'KUCHING', map: 'Kuching', pos: [V(-0.2, 1.3, 0.8), V(-0.1, 1.3, 0.5)], look: [V(0.7, 1.1, -3), V(0.8, 0.9, -3)], sky: [0x6aa8e0, 0xf6d6a8], fog: [0xf6e6d0, 20, 60], hemi: [0xfff2dc, 0x6a5040, 1.2], sun: [0xffe2b0, 1.0, V(20, 30, 10)] },
    h1kedai: { set: 'kedai', day: 1, loc: 'SATOK, KUCHING', map: 'Kuching', pos: [V(0.1, 1.6, 0.4), V(0.2, 1.6, -0.2)], look: [V(0.3, 1.45, -2.3), V(0.4, 1.45, -2.3)], ...DAY, hemi: [0xffffff, 0x8a7a66, 1.3] },
    h2luar: { set: 'mallLuar', day: 2, loc: 'SAMARAHAN', map: 'Samarahan', pos: [V(-6, 1.7, 4), V(-5, 1.7, 2)], look: [V(-6, 11, -35), V(-4, 11, -35)], ...DAY },
    h2atm: { set: 'mall', day: 2, loc: 'SAMARAHAN', map: 'Samarahan', pos: [V(-3.2, 1.65, 1.5), V(-3.4, 1.65, 0.3)], look: [V(-4.6, 2.2, -9), V(-4.4, 2.6, -12)], sky: [0x4a8fd8, 0xd8ecf8], fog: [0xf6f2e8, 30, 160], hemi: [0xffffff, 0xb8b0a0, 1.5], sun: [0xffffff, 0.5, V(10, 40, 20)] },
    h2serikin: { set: 'pasar', mode: 'serikin', day: 2, loc: 'PASAR SERIKIN', map: 'Serikin', pos: [V(-0.6, 1.65, 0.8), V(-0.8, 1.65, 0.2)], look: [V(-2.4, 1.5, -3.2), V(-2.6, 1.5, -3.2)], sky: [0x8a929c, 0xc9ced3], fog: [0xc4cacf, 40, 400], hemi: [0xf0f0f0, 0x66665e, 1.2], sun: [0xe8e8e0, 0.7, V(20, 80, 40)] },
    h3pelabuhan: { set: 'port', day: 3, loc: 'BINTULU & SIBU', map: 'Bintulu', pos: [V(-4, 13, 16), V(0, 13.5, 12)], look: [V(4, 16, -110), V(6, 17, -110)], ...DAY, fog: [0xd6e6ee, 150, 1600] },
    h3gudang: { set: 'gudang', day: 3, loc: 'BINTULU & SIBU', map: 'Sibu', pos: [V(0.4, 1.7, 2), V(0.4, 1.7, 0)], look: [V(0, 3.4, -30), V(0, 3.0, -30)], sky: [0x4a8fd8, 0xd8ecf8], fog: [0x8a8e94, 20, 110], hemi: [0xe8ecf0, 0x55585c, 1.15], sun: [0xffffff, 0.5, V(10, 40, 20)] },
    h4pasaraya: { set: 'pasaraya', day: 4, loc: 'KUCHING & MIRI', map: 'Miri', pos: [V(0, 1.65, 1.5), V(0, 1.65, -0.5)], look: [V(-0.4, 1.3, -10), V(0.4, 1.3, -12)], sky: [0x4a8fd8, 0xd8ecf8], fog: [0xf0f0ec, 20, 90], hemi: [0xffffff, 0xaaaaaa, 1.5], sun: [0xffffff, 0.4, V(10, 40, 20)] },
    h4hospital: { set: 'hospital', day: 4, loc: 'HOSPITAL UMUM SARAWAK', map: 'Kuching', pos: [V(-0.8, 1.65, 3.5), V(-0.4, 1.65, 1.5)], look: [V(2, 5, -40), V(1.6, 3.2, -20)], sky: [0x7fa0c8, 0xd8dde4], fog: [0xd0d6dc, 100, 1000], hemi: [0xf0f4f8, 0x6a6a66, 1.2], sun: [0xf0f0e8, 1.0, V(-40, 100, 60)] },
    h5ruai: { set: 'ruai', day: 5, loc: 'KAPIT & BELAGA', map: 'Kapit', pos: [V(-1.4, 1.25, 0.8), V(-1.2, 1.2, 0.2)], look: [V(0.5, 0.8, -6), V(0.4, 0.7, -5)], sky: [0x8fb8e0, 0xe8f0e8], fog: [0x8a7a6a, 15, 80], hemi: [0xfff0dc, 0x4a3628, 1.05], sun: [0xffe8c8, 0.5, V(-30, 30, 0)] },
    h5bandar: { set: 'bandar', day: 5, loc: 'BANDAR', map: 'Kuching', pos: [V(0.3, 1.65, 1.5), V(0.3, 1.65, 0.5)], look: [V(0.2, 2.2, -12), V(0.2, 2.4, -12)], sky: [0x8a929c, 0xc9ced3], fog: [0xb8bec4, 30, 260], hemi: [0xe8ecf0, 0x55565a, 1.15], sun: [0xdde3ea, 0.6, V(20, 80, 40)] },
    h6: { set: 'online', day: 6, loc: 'KUCHING', map: 'Kuching', pos: [V(-0.2, 1.4, 0.6), V(-0.1, 1.35, 0.0)], look: [V(0.2, 1.15, -2.7), V(0.2, 1.1, -2.7)], sky: [0x8a929c, 0xc9ced3], fog: [0xd9d2c4, 15, 50], hemi: [0xfff0dc, 0x5a4a3a, 1.0], sun: [0xffe8c8, 0.4, V(10, 30, 10)] },
    h7pasar: { set: 'pasar', mode: 'pagi', day: 7, loc: 'KUCHING', map: 'Kuching', pos: [V(0.4, 1.65, 1.2), V(0.2, 1.65, -1.0)], look: [V(0, 2.2, -20), V(0, 2.4, -22)], sky: [0x5aa0e0, 0xfbe2b8], fog: [0xf2e2c8, 40, 400], hemi: [0xfff4e0, 0x6a6048, 1.35], sun: [0xffe0a8, 1.5, V(60, 60, 30)] },
    h7kampung: { set: 'kampung', day: 7, loc: 'KAMPUNG', map: null, pos: [V(0.6, 1.65, 1.5), V(0.9, 1.65, 0.6)], look: [V(1.2, 2.2, -30), V(1.4, 1.8, -20)], sky: [0x5aa0e0, 0xfbe2b8], fog: [0xf0e6d0, 80, 900], hemi: [0xfff4e0, 0x5a6a40, 1.35], sun: [0xffe0a8, 1.5, V(60, 60, 30)] },
    kembali: { set: 'river', day: 7, loc: 'TEBINGAN KUCHING', map: 'all', pos: [V(-1, 1.65, 0.8), V(-1, 1.65, 0.2)], look: [V(10, 14, -200), V(14, 18, -200)], sky: [0x05070f, 0x161a34], fog: [0x0c1020, 80, 900], hemi: [0x4a5478, 0x0c0c12, 0.5], sun: [0x8fa2d0, 0.35, V(-60, 80, -40)], stars: 1 },
    renung: { set: 'river', day: 8, loc: '', map: 'all', pos: [V(-1, 1.65, 0.2), V(-1, 1.7, -0.2)], look: [V(14, 18, -200), V(10, 24, -200)], sky: [0x070a16, 0x221e44], fog: [0x101428, 80, 900], hemi: [0x5a6490, 0x101018, 0.6], sun: [0x8fa2d0, 0.4, V(-60, 80, -40)], stars: 1 },
    cta: { set: 'river', day: 8, loc: '', map: 'all', pos: [V(-1, 1.7, -0.2), V(-1, 1.7, -0.3)], look: [V(10, 24, -200), V(10, 26, -200)], sky: [0x070a16, 0x221e44], fog: [0x101428, 80, 900], hemi: [0x5a6490, 0x101018, 0.6], sun: [0x8fa2d0, 0.4, V(-60, 80, -40)], stars: 1 },
  };

  // ------------------------------------------------ HUD: hours without internet
  const dayStart = d => script.scenes.find(s => LOOK[s.id].day === d).start;
  const dayEnd = d => { const next = script.scenes.find(s => LOOK[s.id].day > d); return next ? next.start : script.duration; };
  function hours(t) { if (t >= E.kembali) return 168; const sc = sceneAt(t), d = LOOK[sc.id].day; if (d === 0) return 0; const a = dayStart(d), b = d === 7 ? E.kembali : dayEnd(d); return Math.min(168, Math.floor((d - 1) * 24 + 1 + clamp((t - a) / (b - a)) * 23)); }
  function hud(t) {
    const sc = sceneAt(t), L = LOOK[sc.id]; if (L.day === 8 || L.day === 0 && t < E.putus) return L.day === 8 ? null : { label: 'JAM TANPA INTERNET', value: '0', stat: 'KUCHING · 7:00 PAGI', color: '' };
    const hrs = hours(t), back = t >= E.kembali;
    const col = back ? '#7dd3fc' : hrs < 25 ? '' : hrs < 73 ? '#ffd84a' : hrs < 121 ? '#ff9a4a' : '#ff5a4a';
    return { label: back ? 'INTERNET KEMBALI SELEPAS' : 'JAM TANPA INTERNET', value: back ? '168 JAM' : String(hrs), stat: L.day ? `HARI ${Math.min(7, L.day)} / 7 · ${L.loc}` : L.loc, color: col,
      pop: back ? 1 + 0.25 * (1 - easeOut((t - E.kembali) / 0.5)) : 1, opacity: 1 };
  }

  // ------------------------------------------------ update
  function update(t) {
    const sc = sceneAt(t), L = LOOK[sc.id];
    for (const k in sets) sets[k].g.visible = k === L.set;
    const u = smooth(sc.start, sc.end, t);
    const pos = L.pos[0].clone().lerp(L.pos[1], u), look = L.look[0].clone().lerp(L.look[1], u);
    let sx = 0, sy = 0; { const d = t - E.kembali; if (d >= 0 && d < 0.9) { const a = 0.03 * Math.exp(-d * 5); sx = Math.sin(d * 57) * a; sy = Math.cos(d * 49) * a; } }
    pos.x += Math.sin(t * 0.6) * 0.008 + sx; pos.y += Math.sin(t * 1.1) * 0.006 + sy;
    camera.position.copy(pos); camera.lookAt(look.x + sx * 6, look.y + sy * 6, look.z);
    skyU.top.value.setHex(L.sky[0]); skyU.horizon.value.setHex(L.sky[1]);
    scene.fog.color.setHex(L.fog[0]); scene.fog.near = L.fog[1]; scene.fog.far = L.fog[2];
    hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sun.position.copy(pos).add(L.sun[2]); sun.target.position.copy(pos);
    stars.material.opacity = L.stars ? 0.9 : 0;
    clouds.visible = !L.stars && ['kedai', 'mallLuar', 'pasar', 'port', 'hospital', 'bandar', 'kampung'].includes(L.set);
    cloudMat.color.setHex(['h2serikin', 'h5bandar', 'h4hospital'].includes(sc.id) ? 0xa8aeb6 : 0xffffff); cloudMat.emissive.setHex(['h2serikin', 'h5bandar', 'h4hospital'].includes(sc.id) ? 0x5a5e64 : 0x8a8a8a);
    rig.position.set(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.004, 0);
    drawPhone(t, sc.id); phoneGlow.material.opacity = L.stars ? 0.6 : 0;
    if (L.set === 'pasar') pasar.update(t, L.mode); else sets[L.set].update(t);
    animatePeople(t);
  }

  // ------------------------------------------------ 2D: Sarawak mini-map + rumour bubbles
  const SHAPE = [[.02, .80], [.06, .74], [.12, .78], [.17, .72], [.22, .74], [.27, .66], [.30, .56], [.36, .52], [.47, .50], [.55, .42], [.62, .33], [.70, .24], [.76, .16], [.80, .20], [.84, .10], [.88, .06], [.93, .04], [.95, .12], [.90, .20], [.93, .32], [.88, .42], [.80, .50], [.72, .58], [.62, .62], [.50, .66], [.42, .74], [.33, .80], [.26, .86], [.18, .84], [.10, .88], [.05, .86]];
  const DOTS = { Kuching: [.09, .80], Samarahan: [.15, .79], Serikin: [.055, .845], Sibu: [.38, .62], Bintulu: [.57, .42], Miri: [.78, .20], Kapit: [.52, .62], Belaga: [.66, .48] };
  const MAPSETS = { Bintulu: ['Bintulu', 'Sibu'], Sibu: ['Bintulu', 'Sibu'], Miri: ['Kuching', 'Miri'], Kapit: ['Kapit', 'Belaga'] };
  function drawFx(g, t, w, h) {
    const sc = sceneAt(t), L = LOOK[sc.id];
    if (sc.id !== 'cta' && (L.map || sc.id === 'h7kampung')) {
      const mx = 300, my = 222, mw = 480, mh = 205; const fade = sc.id === 'hook' ? smooth(E.putus, E.putus + 0.6, t) : 1;
      g.globalAlpha = 0.9 * fade; g.beginPath(); SHAPE.forEach(([x, y], i) => i ? g.lineTo(mx + x * mw, my + y * mh) : g.moveTo(mx + x * mw, my + y * mh)); g.closePath();
      const back = t >= E.kembali; g.fillStyle = back ? 'rgba(125,211,252,.30)' : 'rgba(255,255,255,.16)'; g.fill(); g.strokeStyle = back ? '#7dd3fc' : 'rgba(255,255,255,.85)'; g.lineWidth = 4; g.stroke();
      const active = L.map === 'all' ? Object.keys(DOTS) : (MAPSETS[L.map] || (L.map ? [L.map] : []));
      for (const [name, [x, y]] of Object.entries(DOTS)) { const on = active.includes(name) && (L.map !== 'all' || back); const px = mx + x * mw, py = my + y * mh;
        g.globalAlpha = fade; g.fillStyle = on ? (back ? '#7dd3fc' : '#ff5a4a') : 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(px, py, on ? 9 : 4, 0, 7); g.fill();
        if (on) { const pr = (t * 1.2) % 1; g.globalAlpha = (1 - pr) * fade; g.strokeStyle = g.fillStyle; g.lineWidth = 3; g.beginPath(); g.arc(px, py, 9 + pr * 22, 0, 7); g.stroke();
          if (L.map !== 'all') { g.globalAlpha = fade; g.fillStyle = '#fbf8f1'; g.font = '600 22px HudSans'; g.textAlign = x > 0.5 ? 'right' : 'left'; g.fillText(name.toUpperCase(), px + (x > 0.5 ? -16 : 16), py - 12); } } }
      g.globalAlpha = 1; g.textAlign = 'left';
    }
    if (sc.id === 'h5bandar') {
      const bub = [[250, 830, 'Internet takkan kembali?'], [600, 900, 'Betul ke?'], [380, 720, '???']];
      bub.forEach(([x, y, s], i) => { const k = easeOut(clamp((t - (E.khabar - 0.2 + i * 0.7)) / 0.35)); if (k <= 0) return; g.globalAlpha = k; g.font = '600 30px HudSans'; const tw = g.measureText(s).width + 44;
        g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(x - tw / 2, y - 34 - (1 - k) * 20, tw, 60, 22); g.fill(); g.beginPath(); g.moveTo(x - 10, y + 24); g.lineTo(x + 14, y + 24); g.lineTo(x - 4, y + 48); g.fill();
        g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.fillText(s, x, y + 6 - (1 - k) * 20); }); g.globalAlpha = 1; g.textAlign = 'left';
    }
  }
  const cuts = script.scenes.slice(1).map(s => s.start).filter(x => x !== SC.cta.start && x !== SC.renung.start);
  function flash(t) { let v = 0; for (const c of cuts) { const d = t - c; if (d > -0.12 && d < 0.35) v = Math.max(v, d < 0 ? (d + 0.12) / 0.12 : 1 - d / 0.35); }
    const k = t - E.kembali; if (k > -0.1 && k < 0.6) v = Math.max(v, k < 0 ? (k + 0.1) / 0.1 : 1 - k / 0.6); return v * 0.8; }
  function grade(t) { const d = LOOK[sceneAt(t).id].day; return `saturate(${d >= 7 ? 1.1 : [1.08, 1.05, 1.0, 0.95, 0.9, 0.85, 0.8][d]}) contrast(1.05)`; }

  update(0);
  return { scene, camera, update, drawFx, flash, grade, hud };
}
