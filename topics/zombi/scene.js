// "Apa jadi kalau wabak zombi berlaku di Kuching?" — fiction. No blood or wounds: threat shown by silhouettes and glowing eyes.
import { kit } from '/engine/lib3d.js';

export async function create({ THREE, renderer, script, U }) {
  const { clamp, lerp, smooth, easeOut, hash, mulberry32, frameIndex } = U;
  const K = kit(THREE, U);
  const { box, cyl, sphere, plane, ground, canvasTex, texMat, glow, windowTex, person, animatePeople, SHIRTS, SKINS } = K;
  const E = script.events, W = script.width, H = script.height;
  const SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
  const rand = mulberry32(666);
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
  for (let i = 0; i < 600; i++) { const th = rand() * 6.283, y = 0.06 + rand() * 0.9, r = Math.sqrt(1 - y * y); sp.push(Math.cos(th) * r * 3500, y * 3500, Math.sin(th) * r * 3500); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false })); scene.add(stars);
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

  // ------------------------------------------------ hand + phone (safe zone), helicopter door frame
  const rig = new THREE.Group(); camera.add(rig);
  const skin = 0xc68a5f, sleeve = 0x3a3a44;
  const handL = new THREE.Group(); handL.position.set(-0.085, -0.17, -0.46); handL.rotation.set(0.3, 0.22, 0.1); rig.add(handL);
  box(handL, 0.11, 0.42, 0.1, sleeve, -0.02, -0.33, 0.02).rotation.x = -0.15;
  box(handL, 0.09, 0.11, 0.04, skin, 0, -0.07, -0.012);
  box(handL, 0.025, 0.07, 0.03, skin, 0.055, -0.02, 0.005).rotation.z = -0.5;
  box(handL, 0.078, 0.158, 0.009, 0x16181c, 0, 0.02, 0.012);
  for (let k = 0; k < 3; k++) box(handL, 0.016, 0.022, 0.02, skin, -0.044, -0.02 + k * 0.026, 0.0);
  const phoneT = canvasTex(256, 540);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), new THREE.MeshBasicMaterial({ map: phoneT.tex })); phoneScreen.position.set(0, 0.02, 0.0172); handL.add(phoneScreen);
  const phoneGlow = glow(handL, 0xbfe0ff, 0.5, 0, 0.02, 0.03); phoneGlow.material.opacity = 0;
  // helicopter interior bits attached to the camera
  const heliRig = new THREE.Group(); camera.add(heliRig);
  box(heliRig, 0.06, 1.4, 0.06, 0x2c3a2a, 0.36, 0, -0.7); box(heliRig, 1.2, 0.06, 0.06, 0x2c3a2a, 0, 0.62, -0.7);
  box(heliRig, 0.04, 0.4, 0.04, 0xd8b030, 0.3, 0.38, -0.6).rotation.z = 0.2;
  const radioBox = new THREE.Group(); radioBox.position.set(0.12, -0.2, -0.55); radioBox.rotation.set(0.5, -0.4, 0); heliRig.add(radioBox);
  box(radioBox, 0.16, 0.08, 0.06, 0x1f2420, 0, 0, 0); const radioLed = sphere(radioBox, 0.008, BM(0x37e07a), -0.05, 0.02, 0.032, 1); const radioGlowS = glow(radioBox, 0x37e07a, 0.08, -0.05, 0.02, 0.04);
  for (let k = 0; k < 5; k++) box(radioBox, 0.004, 0.03, 0.004, 0x888888, 0.0 + k * 0.012, 0.0, 0.032);

  const APPS = ['#3fc380', '#3b82f6', '#111111', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
  function drawPhone(t, id) {
    const g = phoneT.ctx, w = 256, h = 540; g.textAlign = 'center';
    const bg = c => { g.fillStyle = c; g.fillRect(0, 0, w, h); };
    const status = (c = '#fff') => { g.fillStyle = c; g.font = '600 18px HudSans'; g.textAlign = 'left'; g.fillText('7:00', 16, 30); g.textAlign = 'center'; };
    const news = (title, body, col = '#c0392b') => { bg('#f4f6f9'); g.fillStyle = col; g.fillRect(0, 0, w, 110); status(); g.fillStyle = '#fff'; g.font = '800 22px HudSans'; g.fillText('BERITA TERKINI', 128, 88);
      g.fillStyle = '#111'; g.font = '800 22px HudSans'; title.split('\n').forEach((l, i) => g.fillText(l, 128, 170 + i * 30)); g.fillStyle = '#6b7280'; g.font = '600 15px HudSans'; body.split('\n').forEach((l, i) => g.fillText(l, 128, 270 + i * 24)); };
    if (id === 'hook') {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#24345c'); grd.addColorStop(1, '#d98c5f'); g.fillStyle = grd; g.fillRect(0, 0, w, h); status();
      g.fillStyle = '#fff'; g.font = '600 72px HudSans'; g.fillText('7:00', 128, 200);
      if (t > E.bayangkan + 0.5) { g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(12, 230, 232, 80, 14); g.fill(); g.fillStyle = '#c0392b'; g.font = '800 14px HudSans'; g.fillText('BERITA', 128, 254); g.fillStyle = '#111'; g.font = '700 15px HudSans'; g.fillText('Pesakit misteri', 128, 278); g.fillText('dimasukkan ke HUS', 128, 298); }
      if (t > E.tujuh) for (let i = 0; i < 7; i++) { const on = t > E.tujuh + i * 0.2; const x = 30 + (i % 4) * 56, y = 350 + Math.floor(i / 4) * 64; g.fillStyle = on ? '#c0262e' : 'rgba(255,255,255,.3)'; g.beginPath(); g.roundRect(x, y, 48, 54, 8); g.fill(); g.fillStyle = '#fff'; g.font = '800 22px HudSans'; g.fillText(String(i + 1), x + 24, y + 36); }
    } else if (id === 'h1hus') news('Lelaki agresif\ndi HUS', 'Demam panas, menyerang\npetugas kesihatan');
    else if (id === 'h1metro') news('Serangan di\nMetroCity &\nPetra Jaya', 'Polis siasat kes\nserupa');
    else if (id === 'h2tular') {
      bg('#0a0a0c'); status(); g.fillStyle = '#2a2d33'; g.fillRect(0, 70, w, 300);
      for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(200,210,220,${0.3 + hash(k, frameIndex(t) >> 2) * 0.4})`; g.fillRect(20 + k * 38 + Math.sin(t * 8 + k) * 6, 200 + hash(k, 3) * 60, 10, 50); }
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(110, 190); g.lineTo(110, 250); g.lineTo(160, 220); g.fill();
      const v = Math.min(1.2e6, Math.floor(120000 * Math.exp((t - E.tular) * 1.6))); g.fillStyle = '#fff'; g.font = '800 26px HudSans'; g.fillText((v >= 1e6 ? (v / 1e6).toFixed(1) + 'J' : Math.floor(v / 1000) + 'K') + ' tontonan', 128, 420); g.font = '600 18px HudSans'; g.fillText('🔥 TULAR · Waterfront', 128, 456);
    } else if (id === 'h2spring' || id === 'h2satok') {
      bg('#e8eef2'); status('#111'); g.strokeStyle = '#c9d2da'; g.lineWidth = 14; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, 90 + k * 80); g.lineTo(w, 60 + k * 90); g.stroke(); }
      g.strokeStyle = '#d8262a'; g.lineWidth = 10; g.beginPath(); g.moveTo(30, 470); g.bezierCurveTo(90, 360, 160, 300, 220, 130); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(14, 60, 228, 50, 12); g.fill(); g.fillStyle = '#c0392b'; g.font = '800 17px HudSans'; g.fillText('Kesesakan teruk · +95 min', 128, 92);
    } else if (id.startsWith('h3')) { bg('#fff7e0'); status('#111'); g.fillStyle = '#b45309'; g.font = '800 20px HudSans'; g.fillText('NOTIS', 128, 120); g.fillStyle = '#111'; g.font = '900 34px HudSans'; ['SEMUA', 'SEKOLAH', 'DITUTUP'].forEach((l, i) => g.fillText(l, 128, 210 + i * 46)); g.font = '600 15px HudSans'; g.fillStyle = '#6b7280'; g.fillText('Sehingga notis lanjut', 128, 380); }
    else if (id.startsWith('h4')) { const on = Math.floor(t * 3) % 2; bg(on ? '#b91c1c' : '#7f1d1d'); status(); g.fillStyle = '#fff'; g.font = '900 60px HudSans'; g.fillText('⚠', 128, 170); g.font = '900 30px HudSans'; ['ZON', 'KECEMASAN'].forEach((l, i) => g.fillText(l, 128, 240 + i * 40)); g.font = '700 18px HudSans'; g.fillText('KEKAL DI RUMAH', 128, 350); g.fillText('Laluan keluar dikawal', 128, 380); }
    else if (id === 'cta' || id === 'sibu' || id === 'radio' || id === 'h7') { bg('#0c0d10'); status(); g.fillStyle = '#9aa0a8'; g.font = '700 20px HudSans'; g.fillText('TIADA ISYARAT', 128, 250); g.font = '600 15px HudSans'; g.fillText('Bateri 4%', 128, 280); }
    else { bg('#0c0d10'); status(); g.fillStyle = '#9aa0a8'; g.font = '700 20px HudSans'; g.fillText('TIADA ISYARAT', 128, 250); g.font = '600 15px HudSans'; g.fillText('Bateri ' + (id === 'h6' ? '9' : '18') + '%', 128, 280); }
    g.textAlign = 'left'; phoneT.tex.needsUpdate = true;
  }

  // ------------------------------------------------ helpers
  const sets = {};
  const makeSet = name => { const g = new THREE.Group(); g.visible = false; scene.add(g); sets[name] = { g, update: () => {} }; return sets[name]; };
  const tileMat = (a, b, rep) => texMat((c, w, h) => { c.fillStyle = a; c.fillRect(0, 0, w, h); c.strokeStyle = b; c.lineWidth = 4; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } }, 256, 256, { repeat: rep });
  const signMat = (txt, bgc, fg, w = 512, h = 160, font = '800 72px HudSans') => texMat((c) => { c.fillStyle = bgc; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; const ls = txt.split('\n'); ls.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (ls.length - 1) / 2) * parseInt(font.match(/(\d+)px/)[1]) * 1.05)); }, w, h);
  function tree(parent, x, z, s = 1, col = 0x3f6b35) { cyl(parent, 0.25 * s, 0.35 * s, 3 * s, 6, 0x5a4232, x, 1.5 * s, z); for (let k = 0; k < 3; k++) sphere(parent, (1.6 - k * 0.3) * s, col, x + (k - 1) * 0.8 * s, (3.4 + k * 0.6) * s, z + (k % 2) * 0.5 * s); }
  function palm(parent, x, z, s = 1) { cyl(parent, 0.12 * s, 0.18 * s, 5 * s, 6, 0x7a6a50, x, 2.5 * s, z); for (let k = 0; k < 6; k++) { const l = box(parent, 2.2 * s, 0.05, 0.4 * s, 0x3f7a3a, x, 5 * s, z); l.rotation.set(0, k * 1.05, -0.5); l.translateX(1.0 * s); } }
  function car(parent, x, z, ry, col, opts = {}) {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; parent.add(c);
    box(c, 4.2, 1.0, 1.8, col, 0, 0.7, 0); box(c, 2.2, 0.7, 1.6, 0x24303f, -0.2, 1.45, 0);
    for (const wx of [-1.3, 1.3]) for (const wz of [-0.85, 0.85]) cyl(c, 0.35, 0.35, 0.25, 8, 0x111111, wx, 0.35, wz).rotation.x = Math.PI / 2;
    if (opts.door) { const d = box(c, 1.1, 0.8, 0.06, col, 0.2, 0.9, 0.9); d.geometry.translate(0.55, 0, 0); d.position.x = -0.35; d.rotation.y = -0.9; }
    c.userData.haz = [glow(c, 0xffa020, 1.4, 2.15, 0.8, 0.8), glow(c, 0xffa020, 1.4, -2.15, 0.8, 0.8)]; c.userData.haz.forEach(h => h.material.opacity = 0);
    return c;
  }
  const CARS = [0xc23b3b, 0xe8e8e8, 0x3a6fb5, 0x2b2b2b, 0xd9b44a, 0x7d8a8f, 0x5a6a4a];
  function pleatedCone(R, Hh, n, color, droop = 0.12, inner = 0.8) {
    const pos = [], ring = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, out = i % 2 === 0; ring.push([Math.cos(a) * R * (out ? 1 : inner), out ? 0 : Hh * droop, Math.sin(a) * R * (out ? 1 : inner)]); }
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; pos.push(...a, 0, Hh, 0, ...b); pos.push(...b, 0, Hh * droop * 0.6, 0, ...a); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide }));
  }
  function dun(parent, x, y, z, s) {
    const d = new THREE.Group(); d.position.set(x, y, z); d.scale.setScalar(s); parent.add(d);
    box(d, 90, 4, 60, 0xe7e1d6, 0, 2, 0); cyl(d, 24, 24, 16, 18, 0xefe8dc, 0, 12, 0);
    const r1 = pleatedCone(34, 9, 9, 0xd4a03c, 0.25, 0.78); r1.position.y = 22; d.add(r1); cyl(d, 15, 16, 7, 18, 0xe9dfcf, 0, 30, 0);
    const r2 = pleatedCone(23, 40, 9, 0xd9a443, 0.12, 0.72); r2.position.y = 33; d.add(r2); cyl(d, 0.4, 1.4, 14, 6, 0xc28f37, 0, 79, 0); return d;
  }
  // zombie: same body language as people, grey-green skin, faded torn clothes, glowing yellow eyes
  const ZSKIN = 0x7f8f78, ZSHIRT = [0x6a6a60, 0x5a6670, 0x7a6a5a, 0x5a5a6a, 0x8a8478];
  const zombies = [];
  function zombie(parent, x, z, yaw, seed, o = {}) {
    const p = person(parent, x, z, yaw, { shirt: ZSHIRT[seed % 5], pants: 0x3a3a3a, skin: ZSKIN, hair: 0x2a2a28, seed: 900 + seed, y: o.y || 0, walk: o.walk });
    for (const s of [-1, 1]) { box(p.head, 0.035, 0.025, 0.01, BM(0xffe14a), s * 0.05, 0.02, 0.105); }
    p.eyes = glow(p.head, 0xffd02a, 0.28, 0, 0.02, 0.12); p.armL.userData.fixed = true;
    p.armL.rotation.x = -1.35; p.armR.rotation.x = -1.2; p.head.rotation.z = 0.3; p.z = true; zombies.push(p); return p;
  }
  function animateZombies(t) { for (const z of zombies) { if (!z.g.parent.visible) continue; z.g.rotation.z = Math.sin(t * 2.2 + z.seed) * 0.08; z.armR.rotation.x = -1.2 + Math.sin(t * 1.7 + z.seed) * 0.15; z.eyes.material.opacity = 0.6 + 0.4 * Math.sin(t * 3 + z.seed); } }
  const brick = texMat((c, w, h) => { c.fillStyle = '#8f8379'; c.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { c.fillStyle = ['#a39486', '#978a7e', '#8a7d72', '#ab9d90'][(x * 7 + y * 3) % 4]; c.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14); } }, 256, 256, { repeat: [20, 6] });

  // ================================================= BEDROOM
  const bilik = makeSet('bilik');
  {
    const g = bilik.g;
    ground(g, 8, 8, texMat((c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#8a5a3a', '#7d5034', '#94623f'][i % 3]; c.fillRect(0, i * 32, w, 31); } }, 256, 256, { repeat: [3, 3] }), 0, 0, -1);
    plane(g, 8, 3.2, 0xe8e0d0, 0, 1.6, -3.2); plane(g, 8, 3.2, 0xdcd2c0, -2.4, 1.6, -1).rotation.y = Math.PI / 2; plane(g, 8, 3.2, 0xdcd2c0, 2.4, 1.6, -1).rotation.y = -Math.PI / 2; plane(g, 8, 8, 0xf3eee4, 0, 3.2, -1).rotation.x = Math.PI / 2;
    const win = texMat((c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6aa8e0'); gr.addColorStop(1, '#f6d6a8'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#5d8a4a'; c.fillRect(0, h * 0.72, w, h * 0.28); for (let i = 0; i < 9; i++) { c.fillStyle = ['#c9c3b8', '#e2dccf', '#b8b2a8'][i % 3]; const bh = 30 + (i * 37 % 60); c.fillRect(i * 30, h * 0.72 - bh, 26, bh); } }, 256, 200, { basic: true });
    plane(g, 1.6, 1.25, win, 0.5, 1.75, -3.18); box(g, 1.7, 0.08, 0.1, 0xffffff, 0.5, 2.4, -3.15); box(g, 1.7, 0.08, 0.1, 0xffffff, 0.5, 1.1, -3.15); box(g, 0.08, 1.35, 0.1, 0xffffff, 0.5, 1.75, -3.15);
    for (const x of [-0.45, 1.45]) box(g, 0.5, 1.6, 0.05, 0x7a5a8a, x, 1.7, -3.1);
    box(g, 2.2, 0.5, 2.0, 0xf2f2f2, -0.2, 0.25, 0.2); box(g, 2.2, 0.12, 1.4, 0x3a5a7a, -0.2, 0.55, 0.0); box(g, 0.6, 0.6, 0.5, 0x7d5034, 0.9, 0.3, -1.6);
    bilik.amb = [glow(g, 0x3a6aff, 1.2, 0.2, 1.4, -3.4), glow(g, 0xff2a2a, 1.2, 0.8, 1.4, -3.4)];
    const l = new THREE.PointLight(0xffe2b0, 1.6, 8, 1); l.position.set(0.5, 1.9, -2.6); g.add(l);
    bilik.update = t => { const on = t > E.pesakit - 1; bilik.amb.forEach((a, i) => a.material.opacity = on ? (Math.floor(t * 4 + i) % 2 ? 0.9 : 0.1) : 0); };
  }

  // ================================================= HUS emergency entrance
  const hus = makeSet('hus');
  {
    const g = hus.g;
    ground(g, 300, 300, 0x6a9a50, 0, -0.01, -60); ground(g, 14, 90, 0x3d3e43, 0, 0, -30); ground(g, 3.2, 90, 0xa8453a, -2.5, 0.01, -30);
    box(g, 70, 18, 14, windowTex(901, 12, 6, '#e3c9c2', '#5a6470'), 0, 9, -74);
    const roofM = K.mat(0xc8503a); const hip = (w, d, h, x, y, z) => { const r = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofM); r.scale.set(w * 0.72, h, d * 0.72); r.rotation.y = Math.PI / 4; r.position.set(x, y + h / 2, z); g.add(r); };
    hip(70, 14, 4, 0, 18, -74);
    box(g, 30, 10, 16, 0xf4f4f0, 14, 5, -30); box(g, 12, 4, 0.3, 0x7a5a9a, 8, 7, -21.8); box(g, 8, 3, 0.3, 0x2f6a4a, 20, 6, -21.8);
    box(g, 22, 0.3, 10, new THREE.MeshLambertMaterial({ color: 0x9fb8c8, transparent: true, opacity: 0.6 }), 4, 6.2, -16); for (const x of [-6, 4, 14]) for (const z of [-12, -20]) box(g, 0.5, 6.2, 0.5, 0xffffff, x, 3.1, z);
    box(g, 0.3, 7, 0.3, 0xdddddd, -5.4, 3.5, -8); plane(g, 3.2, 3.2, texMat((c, w, h) => { c.fillStyle = '#1f5fc0'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8262a'; c.fillRect(0, 100, w, 120); c.fillStyle = '#fff'; c.font = '800 44px HudSans'; c.textAlign = 'center'; c.fillText('KECEMASAN', w / 2, 172); c.font = '700 26px HudSans'; c.fillText('EMERGENCY', w / 2, 262); }, 320, 320), -5.4, 5.4, -7.8);
    const amb = new THREE.Group(); amb.position.set(1.5, 0, -13); amb.rotation.y = 0.15; g.add(amb); box(amb, 2.2, 2.4, 5, 0xf2f2f2, 0, 1.5, 0); box(amb, 2.22, 0.3, 5.02, 0xd8262a, 0, 1.4, 0); hus.al = glow(amb, 0x4a7aff, 2.4, 0, 2.9, 2.2);
    box(amb, 0.05, 1.8, 1.0, 0xe8e8e8, 1.12, 1.4, 2.0).rotation.y = -1.2;
    hus.pat = zombie(g, 3.0, -9.5, 0.4, 1); hus.pat.g.scale.setScalar(1.0);
    hus.staff = [person(g, 0.6, -7.6, -0.2, { shirt: 0xf6f6f6, pants: 0x2c3e66, skin: SKINS[0], seed: 31 }), person(g, -0.2, -8.2, 0.3, { shirt: 0x7fd0c8, skin: SKINS[3], seed: 32 })];
    for (let i = 0; i < 6; i++) tree(g, -44 + i * 9, -46, 1.6);
    hus.update = t => { hus.al.material.color.setHex(Math.floor(t * 4) % 2 ? 0x4a7aff : 0xff3a3a);
      const k = smooth(SC.h1hus.start + 0.5, E.agresif + 1.2, t); hus.pat.g.position.set(lerp(3.0, 2.0, k), 0, lerp(-9.5, -8.3, k));
      const back = smooth(E.agresif, E.agresif + 1.2, t); hus.staff.forEach((s, i) => { s.g.position.z = -7.6 - i * 0.6 + back * 1.6; s.armL.rotation.x = s.armR.rotation.x = -1.0 * back; }); };
  }

  // ================================================= METROCITY (dusk / night)
  const metro = makeSet('metro'); const metroLamps = []; let metroLight;
  {
    const g = metro.g;
    ground(g, 200, 120, 0x4a4b50, 0, 0, -40); for (let i = -10; i < 10; i++) box(g, 3, 0.02, 0.2, 0xe8e2d0, i * 7, 0.02, -8);
    const glass = windowTex(321, 4, 3, '#2d6a6e', '#3f8a8a', 0.0);
    for (let i = 0; i < 9; i++) { const x = -26 + i * 8.2, z = -24 - i * 1.4;
      box(g, 8, 13, 9, 0xe9ecee, x, 6.5, z); const fac = box(g, 6.6, 8.6, 0.3, glass, x, 8.2, z + 4.55); box(g, 7.2, 0.4, 2.2, 0x3a3d42, x, 3.6, z + 5.5);
      box(g, 7.8, 3.3, 0.2, 0x26282c, x, 1.65, z + 4.5); box(g, 5.4, 0.9, 0.12, i % 3 ? 0x2b4f86 : 0xe9ecee, x, 4.25, z + 4.7);
      for (const dx of [-3.9, 3.9]) box(g, 0.35, 3.6, 0.35, 0xe9ecee, x + dx, 1.8, z + 6.4); }
    const condo = windowTex(322, 6, 18, '#f0f2f4', '#7a8a9a', 0.3, '#ffe2a8');
    box(g, 18, 64, 16, condo, -36, 32, -40); box(g, 16, 1.4, 14, 0x2a2d33, -36, 64.7, -40);
    metro.shut = []; for (let i = 0; i < 9; i++) { const x = -26 + i * 8.2, z = -24 - i * 1.4; const s = box(g, 7.6, 3.2, 0.1, texMat((c, w, h) => { for (let y = 0; y < h; y += 10) { c.fillStyle = y % 20 ? '#a8adb3' : '#9298a0'; c.fillRect(0, y, w, 10); } }, 128, 64), x, 1.65, z + 4.62); metro.shut.push(s); }
    for (let i = 0; i < 7; i++) { const x = -22 + i * 9; cyl(g, 0.1, 0.12, 7, 6, 0x6a6e74, x, 3.5, -12); box(g, 1.6, 0.12, 0.2, 0x6a6e74, x + 0.7, 7, -12); const hd = box(g, 0.6, 0.15, 0.3, BM(0xffd9a0), x + 1.4, 6.9, -12); metroLamps.push({ hd, gl: glow(g, 0xffc070, 4, x + 1.4, 6.7, -12), x }); }
    for (let i = 0; i < 7; i++) car(g, -20 + i * 6, -15 - (i % 2) * 2.5, Math.PI / 2, CARS[i % 7]);
    metro.zs = [zombie(g, 14, -20, -1.9, 2, { walk: { dir: { x: -1, z: 0 }, speed: 0.25, span: 6 } }), zombie(g, 18, -22, -1.6, 3, { walk: { dir: { x: -1, z: 0 }, speed: 0.22, span: 6 } }), zombie(g, 22, -19, -1.8, 4)];
    metroLight = new THREE.PointLight(0xffe2b0, 0, 40, 1); metroLight.position.set(-8, 8, -16); g.add(metroLight);
    metro.update = (t, mode) => { const night = mode === 'night';
      for (const s of metro.shut) s.visible = night;
      for (const l of metroLamps) { const off = night && t > E.padam + (l.x + 22) / 63 * 1.8; const on = mode === 'dusk' || (night && !off); l.hd.material.color.setHex(on ? 0xffd9a0 : 0x2a2a2a); l.gl.material.opacity = on ? 0.8 : 0; }
      metroLight.intensity = night ? 0 : 0.4; for (const z of metro.zs) z.g.visible = true; };
  }

  // ================================================= WATERFRONT NIGHT (fog)
  const wf = makeSet('waterfront'); let fogBank;
  {
    const g = wf.g;
    ground(g, 80, 8, brick, 0, 0, -0.5);
    const rail = texMat((c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#141414'; c.lineWidth = 7; c.strokeRect(4, 4, w - 8, h - 8); for (let i = 0; i < 4; i++) { const cx = 32 + i * 64; c.beginPath(); c.arc(cx, h / 2, 26, 0, 7); c.stroke(); } }, 256, 80, { transparent: true, alphaTest: 0.4 }); rail.side = THREE.DoubleSide;
    for (let x = -40; x < 40; x += 2) { box(g, 0.08, 1.1, 0.08, 0x151515, x, 0.55, -4.3); plane(g, 1.92, 0.62, rail, x + 1, 0.55, -4.3); }
    box(g, 80, 0.06, 0.08, 0x151515, 0, 1.05, -4.3);
    for (const x of [-3.5, -11, -18.5]) { cyl(g, 0.07, 0.11, 4.4, 8, 0x151515, x, 2.2, -3.9); sphere(g, 0.24, BM(0x2a2a2a), x, 4.55, -3.9, 1); }
    for (let k = 1; k < 20; k++) sphere(g, 0.13, 0x4a1414, -18.5 + k * 0.78, 4.3 - Math.sin((k % 10) / 10 * Math.PI) * 1.0, -3.9, 0);
    ground(g, 400, 160, new THREE.MeshLambertMaterial({ color: 0x1a2a26 }), 0, -1.2, -84);
    box(g, 400, 2.4, 3, 0x45453f, 0, -0.2, -162); ground(g, 600, 300, 0x1a3020, 0, 4, -320);
    dun(g, 18, 6, -205, 0.85);
    fogBank = new THREE.Mesh(new THREE.PlaneGeometry(400, 160), new THREE.MeshBasicMaterial({ color: 0x6aa070, transparent: true, opacity: 0.18, depthWrite: false })); fogBank.rotation.x = -Math.PI / 2; fogBank.position.set(0, 0.2, -84); g.add(fogBank);
    wf.z = zombie(g, -14, -2.4, Math.PI / 2 - 0.3, 5);
    wf.update = t => { fogBank.material.opacity = 0.16 + 0.05 * Math.sin(t * 0.7); fogBank.position.x = Math.sin(t * 0.2) * 10; };
  }

  // ================================================= THE SPRING
  const spring = makeSet('spring');
  {
    const g = spring.g;
    ground(g, 300, 200, tileMat('#b07a5a', '#9a6a4c', [40, 30]), 0, 0, -40);
    const fac = texMat((c, w, h) => { c.fillStyle = '#f4f4f2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#dcdcd8'; c.lineWidth = 3; for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } c.fillStyle = '#2a2d33'; c.fillRect(0, h * 0.34, w, 10); c.fillRect(0, h * 0.66, w, 14); }, 512, 256, { repeat: [3, 1] });
    box(g, 90, 22, 34, fac, -6, 11, -52); box(g, 90, 4, 36, 0xffffff, -6, 2, -51);
    box(g, 9, 26, 9, new THREE.MeshLambertMaterial({ color: 0x9fd0c8, transparent: true, opacity: 0.75 }), 42, 13, -38); box(g, 10, 1, 10, 0x9aa0a6, 42, 26.5, -38);
    box(g, 24, 0.4, 10, 0xf2f2f2, 30, 6, -30); for (const x of [20, 30, 40]) cyl(g, 0.3, 0.3, 6, 8, 0xffffff, x, 3, -26);
    for (let i = 0; i < 6; i++) tree(g, -40 + i * 13, -24, 1.4, 0x3f6b35);
    for (let i = 0; i < 10; i++) car(g, -30 + i * 6, -16 - (i % 2) * 5, 0.0, CARS[i % 7]);
    spring.run = []; for (let i = 0; i < 22; i++) { const p = person(g, -10 + (i % 8) * 2.4 + hash(i, 1), -24 + Math.floor(i / 8) * 1.5, 0, { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], bag: i % 2 ? 0xf2f2f2 : 0xc0392b, seed: 60 + i, walk: { dir: { x: 0, z: 1 }, speed: 2.4 + hash(i, 4), span: 26 } }); p.base.z = -10; spring.run.push(p); }
  }

  // ================================================= JAMBATAN SATOK (suspension bridge + jammed road)
  const satok = makeSet('satok');
  {
    const g = satok.g;
    ground(g, 300, 30, 0x3d3e43, 0, 0, -8); for (let i = -20; i < 20; i++) box(g, 3, 0.02, 0.2, 0xe8e2d0, i * 7, 0.02, -8);
    ground(g, 300, 20, 0x5d8a45, 0, -0.02, -28); ground(g, 400, 160, new THREE.MeshLambertMaterial({ color: 0x8a6a42 }), 0, -1.2, -100); ground(g, 400, 200, 0x4f8a3e, 0, 0.5, -280);
    const white = 0xf2f2ee;
    const tower = (x, z) => { const t = new THREE.Group(); t.position.set(x, 0, z); g.add(t); box(t, 6, 6, 6, 0xdcdcd8, 0, 3, 0);
      for (const a of [-1.4, 1.4]) for (const b of [-1.4, 1.4]) { const l = box(t, 0.4, 30, 0.4, white, a, 21, b); l.rotation.z = -a * 0.012; }
      for (let k = 0; k < 10; k++) { const y = 7 + k * 2.9; for (const b of [-1.4, 1.4]) { const d = box(t, 3.8, 0.16, 0.16, white, 0, y, b); d.rotation.z = k % 2 ? 0.6 : -0.6; } for (const a of [-1.4, 1.4]) { const d = box(t, 0.16, 0.16, 3.8, white, a, y, 0); d.rotation.x = k % 2 ? 0.6 : -0.6; } }
      glow(t, 0xff3030, 2, 0, 36.5, 0); return t; };
    const A = new THREE.Vector3(-34, 0, -40), B = new THREE.Vector3(30, 0, -170);
    tower(A.x, A.z); tower(B.x, B.z);
    const dir = B.clone().sub(A), L = dir.length(); const ang = Math.atan2(dir.x, dir.z);
    const deck = box(g, 3, 0.5, L, white, (A.x + B.x) / 2, 6, (A.z + B.z) / 2); deck.rotation.y = ang;
    const cableMat = new THREE.LineBasicMaterial({ color: 0xe8e8e8 });
    for (const side of [-1.4, 1.4]) { const off = new THREE.Vector3(Math.cos(ang) * side, 0, -Math.sin(ang) * side); const pts = [];
      for (let k = 0; k <= 40; k++) { const u = k / 40; const p = A.clone().lerp(B, u).add(off); p.y = 36 - Math.sin(u * Math.PI) * 26; pts.push(p);
        if (k % 2 === 0 && k > 0 && k < 40) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p.clone(), new THREE.Vector3(p.x, 6.3, p.z)]), cableMat)); }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat)); }
    for (let i = 0; i < 26; i++) car(g, -60 + i * 5.2, -6 - (i % 3) * 3.2, 0, CARS[i % 7]);
    satok.brake = []; g.children.forEach(c => { if (c.userData.haz) satok.brake.push(...c.userData.haz); });
    for (let i = 0; i < 6; i++) sphere(g, 40 + rand() * 30, 0x3f6b35, -120 + i * 50, 0, -260, 1).scale.y = 0.4;
    satok.update = t => { for (const h of satok.brake) { h.material.color.setHex(0xff2a2a); h.material.opacity = 0.6; } };
  }

  // ================================================= JALAN TUN JUGAH (abandoned cars)
  const jalan = makeSet('jalan');
  {
    const g = jalan.g;
    ground(g, 24, 160, 0x3a3b40, 0, 0, -60); for (const x of [-4, 4]) for (let i = 0; i < 24; i++) box(g, 0.2, 0.02, 3, 0xe8e2d0, x, 0.02, -4 - i * 6.5);
    ground(g, 300, 300, 0x557a45, 0, -0.03, -80); box(g, 0.6, 0.3, 160, 0x9a948c, 0, 0.15, -60).position.x = 12.5;
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) box(g, 12, 10 + hash(i, s + 3) * 20, 10, windowTex(500 + i + (s > 0 ? 20 : 0), 4, 5, ['#d9d4cc', '#c9c3ba', '#e8e2d8'][i % 3], '#4a5260'), s * 26, 8, -12 - i * 18);
    jalan.cars = []; for (let i = 0; i < 18; i++) { const lane = (i % 3 - 1) * 4, z = -6 - Math.floor(i / 3) * 8 - hash(i, 2) * 3; const c = car(g, lane + (hash(i, 3) - 0.5), z, Math.PI / 2 + (hash(i, 4) - 0.5) * 0.5, CARS[i % 7], { door: hash(i, 5) > 0.4 }); jalan.cars.push(c); }
    for (let k = 0; k < 4; k++) box(g, 0.4, 0.3, 0.25, [0xc0392b, 0x2b6cb0, 0xf2c94c, 0x2f8f6a][k], -2 + k * 1.3, 0.15, -9 - k * 2);
    jalan.z = zombie(g, 2.5, -46, 0, 6, { walk: { dir: { x: 0, z: 1 }, speed: 0.3, span: 4 } });
    jalan.update = t => { for (const c of jalan.cars) for (const h of c.userData.haz) h.material.opacity = Math.floor(t * 2.5 + c.position.z) % 2 ? 0.9 : 0; };
  }

  // ================================================= SUPERMARKET (emptied)
  const pasaraya = makeSet('pasaraya');
  {
    const g = pasaraya.g;
    ground(g, 30, 60, tileMat('#eeeeea', '#d8d8d2', [8, 16]), 0, 0, -20); plane(g, 30, 60, 0xfafafa, 0, 5, -20).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) box(g, 0.3, 0.05, 3, BM(i % 3 === 1 ? 0x666666 : 0xffffff), 0, 4.95, -3 - i * 5);
    const cols = [0xd8262a, 0xf2c94c, 0x2b6cb0, 0x2f8f4a, 0xf07a1a];
    for (const s of [-1, 1]) for (let b = 0; b < 8; b++) { const z = -2.5 - b * 3.2; box(g, 0.9, 2.6, 3.0, 0xdfe2e6, s * 2.5, 1.3, z);
      for (let lv = 0; lv < 4; lv++) { box(g, 1.0, 0.05, 3.0, 0xbfc4c9, s * 2.3, 0.35 + lv * 0.6, z); for (let k = 0; k < 7; k++) if (hash(b * 31 + lv * 7 + k, s > 0 ? 1 : 2) > 0.85) box(g, 0.3, 0.38, 0.34, cols[(k + lv) % 5], s * 2.05, 0.58 + lv * 0.6, z - 1.25 + k * 0.42); }
      if (b % 3 === 1) { const tag = plane(g, 0.9, 0.3, signMat('STOK HABIS', '#fff200', '#c0392b', 400, 130, '800 56px HudSans'), s * 1.98, 1.75, z); tag.rotation.y = -s * Math.PI / 2; } }
    const tr = new THREE.Group(); tr.position.set(0.4, 0.45, -6); tr.rotation.set(0, 0.6, Math.PI / 2); g.add(tr); box(tr, 0.7, 0.5, 1.0, 0x9aa3ab, 0, 0, 0);
    for (let k = 0; k < 14; k++) box(g, 0.3 + hash(k, 1) * 0.2, 0.25, 0.3, [0xc9a36a, 0xd8262a, 0xf2f2f2][k % 3], (hash(k, 2) - 0.5) * 3, 0.12, -3 - hash(k, 3) * 14).rotation.y = hash(k, 4) * 3;
  }

  // ================================================= KUCHING SENTRAL exterior + bus platform
  const sentral = makeSet('sentral');
  {
    const g = sentral.g;
    ground(g, 300, 200, 0x3e3f45, 0, 0, -40); for (let i = -10; i < 10; i++) box(g, 0.15, 0.02, 4, 0xffffff, i * 2.8, 0.02, -14);
    const fac = texMat((c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e8562a'); gr.addColorStop(0.5, '#c8361e'); gr.addColorStop(1, '#e8662a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) { const x = hash(i, 1) * w, y = hash(i, 2) * h; c.fillStyle = i % 3 ? '#f2c42a' : '#ff8a3a'; c.save(); c.translate(x, y); c.rotate(-0.12); c.fillRect(0, 0, 60 + hash(i, 3) * 90, 9); c.restore(); }
      c.fillStyle = '#5a1a10'; for (let i = 0; i < 18; i++) { c.save(); c.translate(hash(i, 5) * w, hash(i, 6) * h); c.rotate(-0.12); c.fillRect(0, 0, 50, 7); c.restore(); } }, 1024, 400);
    box(g, 70, 16, 34, 0x8a2a1e, 0, 8, -52); plane(g, 66, 13, fac, 0, 9.5, -34.8);
    box(g, 70, 3, 0.3, 0xc8361e, 0, 1.5, -34.8);
    const roofM = new THREE.MeshLambertMaterial({ color: 0x6a6e74, side: THREE.DoubleSide });
    for (let k = 0; k < 8; k++) { const r = box(g, 11, 0.6, 46, roofM, -38.5 + k * 11, 19 + Math.pow(Math.abs(k - 3.5) / 3.5, 2) * 4, -48); r.rotation.z = (k - 3.5) * 0.05; }
    box(g, 88, 0.4, 3, 0xe9e9e6, 0, 18.2, -26);
    for (let i = 0; i < 9; i++) { const c = box(g, 0.9, 20, 0.9, 0x7a7e84, -32 + i * 8, 9.5, -30); c.rotation.z = 0.18; }
    sentral.trucks = []; for (let i = 0; i < 2; i++) { const tk = new THREE.Group(); tk.position.set(-10 + i * 14, 0, -18); tk.rotation.y = 0.3; g.add(tk); box(tk, 7, 3, 2.6, 0x4a5a3a, 0, 2.2, 0); box(tk, 2.2, 2.4, 2.5, 0x4a5a3a, 4.4, 1.8, 0); for (const x of [-2.4, 0.6, 4.2]) for (const z of [-1.2, 1.2]) cyl(tk, 0.5, 0.5, 0.4, 8, 0x111111, x, 0.5, z).rotation.x = Math.PI / 2; const bar = glow(tk, 0xff3030, 1.6, 4.4, 3.1, 0); sentral.trucks.push(bar); }
    const stripe = texMat((c, w, h) => { for (let x = 0; x < w; x += 32) { c.fillStyle = (x / 32) % 2 ? '#d8262a' : '#ffffff'; c.fillRect(x, 0, 32, h); } }, 256, 32);
    for (let i = 0; i < 6; i++) { box(g, 4, 0.5, 0.15, stripe, -18 + i * 6, 1.0, -9); for (const dx of [-1.6, 1.6]) box(g, 0.12, 1.0, 0.6, 0xd8262a, -18 + i * 6 + dx, 0.5, -9); }
    for (let i = 0; i < 8; i++) { cyl(g, 0.02, 0.2, 0.7, 8, 0xf07a1a, -20 + i * 5, 0.35, -6.5); }
    for (let i = 0; i < 4; i++) person(g, -6 + i * 2.2, -11, Math.PI, { shirt: 0x4a5a3a, pants: 0x3a4a2a, skin: SKINS[i % 6], seed: 120 + i });
    sentral.update = t => { sentral.trucks.forEach((b, i) => b.material.color.setHex(Math.floor(t * 3 + i) % 2 ? 0xff3030 : 0x3060ff)); };
  }
  const platform = makeSet('platform'); let boardT;
  {
    const g = platform.g;
    ground(g, 60, 60, tileMat('#9a9da2', '#7d8086', [20, 20]), 0, 0, -20); const ceil = plane(g, 60, 60, 0xb8bcc0, 0, 6, -20); ceil.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { cyl(g, 0.15, 0.15, 60, 8, 0x8a6a6a, -6 + i * 2.5, 5.7, -20).rotation.x = Math.PI / 2; }
    box(g, 60, 0.2, 2.5, 0xd9b62a, 0, 0.1, -4.5).scale.y = 1;
    const labels = ['B2', 'C2', 'D2', 'E2'];
    labels.forEach((lb, i) => { const x = -8 + i * 8; box(g, 1.3, 6, 1.3, 0x8a8e94, x, 3, -6.5); plane(g, 1.32, 1.0, signMat(lb, '#d8262a', '#ffffff', 200, 150, '900 110px HudSans'), x, 5.2, -5.84);
      const bus = new THREE.Group(); bus.position.set(x + 3.8, 0, -12); g.add(bus); box(bus, 2.8, 3.4, 12, 0x2a2a2e, 0, 2.0, 0); box(bus, 2.82, 0.4, 12.02, 0xc9a24a, 0, 2.6, 0); box(bus, 2.84, 1.0, 10.5, new THREE.MeshLambertMaterial({ color: 0x1a2a3a, emissive: 0x0 }), 0, 3.0, -0.5); box(bus, 2.6, 1.6, 0.1, 0x1a2a3a, 0, 2.7, 6.0); });
    boardT = canvasTex(1024, 220); box(g, 6.2, 1.4, 0.2, 0x111111, 0, 4.4, -3.2); plane(g, 6, 1.3, new THREE.MeshBasicMaterial({ map: boardT.tex }), 0, 4.4, -3.08);
    for (let i = 0; i < 9; i++) { const x = -9 + i * 2.2; box(g, 0.6, 0.45, 0.35, [0x2b2b2b, 0x8a3a3a, 0x2b6cb0][i % 3], x, 0.22, -2.6); person(g, x, -2.0, Math.PI + (hash(i, 2) - 0.5), { pose: 'sit', y: 0.1, shirt: SHIRTS[i % 10], skin: SKINS[i % 6], seed: 140 + i }); }
    platform.update = t => { const c = boardT.ctx; c.fillStyle = '#080808'; c.fillRect(0, 0, 1024, 220); c.fillStyle = Math.floor(t * 2) % 2 ? '#ff3a2a' : '#c8261a'; c.font = '800 70px HudSans'; c.textAlign = 'center'; c.fillText('PERJALANAN DIGANTUNG', 512, 135); c.fillStyle = 'rgba(8,8,8,.5)'; for (let y = 0; y < 220; y += 8) c.fillRect(0, y, 1024, 3); c.textAlign = 'left'; boardT.tex.needsUpdate = true; };
  }

  // ================================================= LTAK interior (empty, all stopped)
  const ltak = makeSet('ltak'); let ltakT;
  {
    const g = ltak.g;
    ground(g, 16, 60, texMat((c, w, h) => { c.fillStyle = '#e9dccb'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a5a3a'; c.fillRect(0, 120, w, 16); }, 256, 256, { repeat: [3, 10] }), 0, 0, -25);
    const ceil = plane(g, 16, 60, texMat((c, w, h) => { for (let x = 0; x < w; x += 16) { c.fillStyle = x % 32 ? '#7a4f2e' : '#6e4628'; c.fillRect(x, 0, 16, h); } }, 256, 256, { repeat: [3, 10] }), 0, 5, -25); ceil.rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) for (const x of [-3, 3]) { const on = (i + (x > 0 ? 1 : 0)) % 3 !== 0; sphere(g, 0.25, BM(on ? 0xffe2a0 : 0x3a3020), x, 4.9, -2 - i * 5, 1); if (on) glow(g, 0xffc860, 2.2, x, 4.7, -2 - i * 5); }
    for (let i = 0; i < 8; i++) for (const x of [-4.5, 4.5]) cyl(g, 0.5, 0.5, 5, 16, new THREE.MeshLambertMaterial({ color: 0xc9ced4, emissive: 0x20201a }), x, 2.5, -3 - i * 6);
    plane(g, 60, 5, 0xe9e3d8, -7.5, 2.5, -25).rotation.y = Math.PI / 2; plane(g, 60, 5, BM(0x6a8098), 7.5, 2.5, -25).rotation.y = -Math.PI / 2;
    for (let i = 0; i < 20; i++) box(g, 0.12, 5, 0.12, 0xdddddd, 7.4, 2.5, -2 - i * 3);
    ltakT = canvasTex(1024, 600); box(g, 4.6, 2.8, 0.2, 0x1b1d22, 1.2, 3.0, -16); plane(g, 4.4, 2.6, new THREE.MeshBasicMaterial({ map: ltakT.tex }), 1.2, 3.0, -15.89);
    for (let i = 0; i < 8; i++) { box(g, 0.5, 0.45, 0.5, 0xe0909a, -6.4, 0.45, -6 - i * 0.6); box(g, 0.1, 0.5, 0.5, 0xe0909a, -6.7, 0.8, -6 - i * 0.6); }
    box(g, 0.5, 0.7, 0.3, 0x2b2b2b, 1.4, 0.35, -8); person(g, 4.4, -18, -1.2, { shirt: 0x4a5a3a, pants: 0x3a4a2a, skin: SKINS[2], seed: 150 });
    const FL = ['KUALA LUMPUR', 'SINGAPURA', 'KOTA KINABALU', 'MIRI', 'SIBU', 'JOHOR BAHRU', 'PULAU PINANG'];
    ltak.update = t => { const c = ltakT.ctx; c.fillStyle = '#0d1117'; c.fillRect(0, 0, 1024, 600); c.fillStyle = '#f2c94c'; c.font = '700 40px HudSans'; c.fillText('BERLEPAS', 30, 56);
      FL.forEach((d, k) => { const y = 120 + k * 66; c.fillStyle = k % 2 ? '#141a22' : '#10151c'; c.fillRect(20, y - 44, 984, 60); c.fillStyle = '#fff'; c.font = '700 36px HudSans'; c.fillText(d, 30, y); const on = t > E.henti + 0.3 + k * 0.18; c.fillStyle = on ? '#ff4a3c' : '#37e07a'; c.fillText(on ? 'DIHENTIKAN' : 'ATAS JADUAL', 700, y); });
      ltakT.tex.needsUpdate = true; };
  }

  // ================================================= HOUSE INTERIOR (peeking through curtains)
  const rumah = makeSet('rumah'); let roomLight, shadowFig;
  {
    const g = rumah.g;
    ground(g, 8, 8, tileMat('#cbbfa8', '#b5a890', [4, 4]), 0, 0, -1); plane(g, 8, 3.2, 0xd8cdb8, 0, 1.6, -2.4); plane(g, 8, 8, 0xece6da, 0, 3.0, -1).rotation.x = Math.PI / 2;
    plane(g, 1.8, 1.4, BM(0x0a1220), 0.2, 1.7, -2.38);
    for (const [x, r] of [[-0.45, 0.15], [0.85, -0.15]]) { const c = box(g, 0.9, 1.7, 0.05, 0x7a2a3a, x, 1.7, -2.3); c.rotation.y = r; }
    box(g, 0.12, 0.18, 0.03, 0xf2f2f2, -1.4, 1.35, -2.37);
    shadowFig = new THREE.Group(); g.add(shadowFig); box(shadowFig, 0.38, 0.55, 0.1, BM(0x020304), 0, 1.6, -2.6); box(shadowFig, 0.2, 0.24, 0.1, BM(0x020304), 0, 2.0, -2.6); for (const s of [-1, 1]) box(shadowFig, 0.09, 0.5, 0.1, BM(0x020304), s * 0.24, 1.75, -2.6).rotation.x = -1.2;
    const eyesR = glow(shadowFig, 0xffd02a, 0.12, 0, 2.02, -2.55); rumah.eyes = eyesR;
    roomLight = new THREE.PointLight(0xffe0b0, 1.4, 8, 1); roomLight.position.set(0, 2.6, -0.5); g.add(roomLight);
    rumah.update = t => { const u = (t - SC.h5rumah.start) / 2.4; shadowFig.position.x = lerp(-1.4, 1.4, clamp(u)); shadowFig.visible = u > 0 && u < 1; rumah.eyes.material.opacity = 0.8;
      roomLight.intensity = t > E.rumah + 1.4 ? 0.15 : 1.4; };
  }

  // ================================================= SHELTER HALL
  const dewan = makeSet('dewan'); let flash1, walkie, doorG;
  {
    const g = dewan.g;
    ground(g, 20, 24, texMat((c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#a0703c', '#946634', '#aa7a44'][i % 3]; c.fillRect(0, i * 32, w, 31); } }, 256, 256, { repeat: [6, 6] }), 0, 0, -8);
    plane(g, 20, 6, 0xc9c3b0, 0, 3, -18); plane(g, 24, 6, 0xbfb9a6, -8, 3, -8).rotation.y = Math.PI / 2; plane(g, 24, 6, 0xbfb9a6, 8, 3, -8).rotation.y = -Math.PI / 2; plane(g, 20, 24, 0x6a6458, 0, 6, -8).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const w2 = plane(g, 2, 1.4, BM(0x0a0e18), -7.98, 3.6, -3 - i * 4); w2.rotation.y = Math.PI / 2; for (let k = 0; k < 3; k++) { const b = box(g, 0.06, 0.2, 2.2, 0x7d5a3a, -7.92, 3.2 + k * 0.4, -3 - i * 4); b.rotation.x = (k - 1) * 0.15; } }
    for (let i = 0; i < 10; i++) box(g, 1.0, 0.18, 2.0, [0x5a7aa8, 0xb85445, 0x6c8f5a, 0xd9c14a][i % 4], -5 + (i % 5) * 2.4, 0.09, -6 - Math.floor(i / 5) * 3.2);
    for (let k = 0; k < 16; k++) box(g, 0.6, 0.5, 0.5, [0xc9a36a, 0x9fd0e8, 0xc9a36a][k % 3], 5.5 + (k % 3) * 0.65, 0.25 + Math.floor(k / 6) * 0.5, -14 + Math.floor((k % 6) / 3) * 0.6);
    doorG = new THREE.Group(); doorG.position.set(0, 0, -17.9); g.add(doorG); box(doorG, 3.2, 3.6, 0.15, 0x6a4a2a, 0, 1.8, 0);
    for (let k = 0; k < 4; k++) { const tb = box(g, 2.4, 0.08, 0.9, 0x8a6a4a, (k - 1.5) * 0.4, 0.8 + k * 0.55, -17.2); tb.rotation.z = (k % 2 ? 1 : -1) * 0.1; }
    dewan.ppl = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; dewan.ppl.push(person(g, Math.sin(a) * 1.6, -9 - Math.cos(a) * 1.6, a + Math.PI, { pose: 'sit', y: -0.1, shirt: SHIRTS[i + 1], skin: SKINS[i % 6], seed: 170 + i })); }
    const lead = dewan.ppl[0]; lead.armR.rotation.x = -1.6; walkie = new THREE.Group(); lead.armR.add(walkie); walkie.position.set(0, -0.5, 0.08); box(walkie, 0.07, 0.16, 0.04, 0x1a1a1a, 0, 0, 0); cyl(walkie, 0.008, 0.008, 0.12, 4, 0x222222, 0.02, 0.13, 0);
    dewan.led = glow(walkie, 0x37e07a, 0.12, 0, 0.06, 0.03);
    flash1 = new THREE.SpotLight(0xfff2d0, 6, 30, 0.35, 0.4, 1); flash1.position.set(2.5, 1.8, -8); g.add(flash1); g.add(flash1.target);
    const amb = new THREE.PointLight(0xffc890, 0.6, 14, 1); amb.position.set(0, 1.2, -9); g.add(amb);
    dewan.update = t => { flash1.target.position.set(-6 + Math.sin(t * 0.8) * 7, 2, -16 + Math.cos(t * 0.6) * 4); dewan.led.material.opacity = t > E.radio6 && Math.floor(t * 4) % 2 ? 1 : 0.1;
      const knock = [0, 1, 2].some(k => { const d = t - (SC.h6.end - 1.6 + k * 0.4); return d > 0 && d < 0.15; }); doorG.rotation.y = knock ? 0.02 : 0; };
  }

  // ================================================= AERIAL: Kuching from the helicopter (Darul Hana, DUN, Astana)
  const aerial = makeSet('aerial'); const aerialDots = [];
  {
    const g = aerial.g;
    const water = ground(g, 1200, 220, new THREE.MeshLambertMaterial({ color: 0x5a6e78 }), 0, -1.2, -80);
    ground(g, 1200, 400, 0x2a3a2c, 0, 0, 140); ground(g, 1200, 600, 0x2a3a2c, 0, 0, -490);
    for (let i = 0; i < 70; i++) { const x = -300 + hash(i, 1) * 600, z = 40 + hash(i, 2) * 220, hgt = 6 + hash(i, 3) * 30; box(g, 10 + hash(i, 4) * 10, hgt, 10 + hash(i, 5) * 10, windowTex(1000 + i % 7, 4, 6, '#3a3e48', '#22262e'), x, hgt / 2, z); }
    for (let i = 0; i < 40; i++) { const x = -300 + hash(i, 7) * 600, z = -230 - hash(i, 8) * 200; if (Math.abs(x + 60) < 70) continue; box(g, 10, 6 + hash(i, 9) * 10, 10, 0x3a3e48, x, 4, z); }
    box(g, 600, 1.2, 8, 0x55555a, 0, 0.6, 30); for (let i = 0; i < 24; i++) car(g, -200 + hash(i, 11) * 400, 30 + (hash(i, 12) - 0.5) * 6, hash(i, 13) * 3, CARS[i % 7]);
    dun(g, 60, 0, -250, 0.9);
    const ast = new THREE.Group(); ast.position.set(-90, 0, -240); g.add(ast); box(ast, 30, 8, 16, 0xf2f2ee, 0, 4, 0); for (const x of [-10, 10]) { const r = new THREE.Mesh(new THREE.ConeGeometry(9, 6, 4), K.mat(0x3a3a40)); r.rotation.y = Math.PI / 4; r.position.set(x, 11, 0); r.scale.z = 0.7; ast.add(r); } box(ast, 12, 3, 12, 0xf2f2ee, 0, 9.5, 0);
    // Darul Hana: S-curved white deck, two leaning A-pylons, round lookout with yellow roof
    const P = []; for (let k = 0; k <= 60; k++) { const u = k / 60; P.push(new THREE.Vector3(-30 + Math.sin(u * Math.PI * 2) * 40, 8 + Math.sin(u * Math.PI) * 4, 22 - u * 210)); }
    for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1], mid = a.clone().add(b).multiplyScalar(0.5); const s = box(g, 5, 1.0, a.distanceTo(b) + 0.2, new THREE.MeshLambertMaterial({ color: 0xf6f6f0, emissive: 0x303030 }), mid.x, mid.y, mid.z); s.lookAt(b); }
    const look = (c) => { const g2 = new THREE.Group(); g2.position.copy(c); g.add(g2); cyl(g2, 9, 9, 1, 24, 0xf2f2ee, 0, 0, 0); const roof = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 6, 0, Math.PI * 2, 0, 0.5), K.mat(0xe8c040)); roof.position.y = 3; roof.scale.y = 0.6; g2.add(roof);
      for (const s of [-1, 1]) { const l = box(g2, 1.6, 44, 1.6, 0xf6f6f2, s * 4, 20, 0); l.rotation.z = s * -0.18; l.rotation.x = 0.35; } cyl(g2, 4, 6, 10, 10, 0xe8e8e2, 0, -6, 0); };
    look(P[15]); look(P[45]);
    for (let i = 0; i < 90; i++) { const d = box(g, 0.9, 1.8, 0.9, new THREE.MeshLambertMaterial({ color: 0x6a7a62, emissive: 0x111111 }), -150 + hash(i, 21) * 300, 0.9, 20 + hash(i, 22) * 80); aerialDots.push({ d, x: d.position.x, z: d.position.z, s: i }); }
    aerial.update = t => { for (const a of aerialDots) { a.d.position.x = a.x + Math.sin(t * 0.3 + a.s) * 2; a.d.position.z = a.z + Math.cos(t * 0.25 + a.s * 2) * 2; } };
  }

  // ================================================= SIBU dusk (swan statue, Wisma Sanyan, plaza)
  const sibu = makeSet('sibu'); let sibuZ;
  {
    const g = sibu.g;
    ground(g, 300, 200, 0x55565c, 0, -0.02, -40); ground(g, 60, 50, 0x5f9a4a, 4, 0.01, -40);
    for (let i = 0; i < 6; i++) box(g, 60, 0.03, 0.5, 0xd8d0c0, 4, 0.03, -18 - i * 8);
    ground(g, 600, 200, new THREE.MeshLambertMaterial({ color: 0x5a5a68 }), -120, -1.2, -60).rotation.z = 0;
    // swan on rocks (left foreground)
    const sw = new THREE.Group(); sw.position.set(5.5, 0, -15); sw.rotation.y = -1.3; g.add(sw);
    for (let k = 0; k < 9; k++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + hash(k, 1) * 0.7, 0), K.mat([0x4a3a2c, 0x5a4634, 0x3a2e24][k % 3])); r.position.set((hash(k, 2) - 0.5) * 2.4, 0.6 + Math.floor(k / 3) * 1.0, (hash(k, 3) - 0.5) * 2); r.scale.y = 0.8; sw.add(r); }
    const wht = K.mat(0xf2f2ee); const body = sphere(sw, 1.1, wht, 0, 4.1, 0, 1); body.scale.set(0.8, 0.7, 1.3);
    const neck = []; for (let k = 0; k < 8; k++) { const u = k / 7; neck.push(sphere(sw, 0.28 - u * 0.06, wht, 0, 4.6 + u * 2.6 - Math.pow(u, 3) * 0.6, 0.8 + Math.sin(u * 2.2) * 0.9, 1)); }
    sphere(sw, 0.34, wht, 0, 7.0, 1.6, 1); const beak = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 6), K.mat(0xe0a020)); beak.rotation.x = Math.PI / 2; beak.position.set(0, 6.95, 2.1); sw.add(beak);
    for (const s of [-1, 1]) { const wg = new THREE.Mesh(new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(2.6, 3.8); sh.lineTo(1.9, 4.6); sh.lineTo(1.2, 3.6); sh.lineTo(0.6, 4.0); sh.lineTo(0.3, 2.4); sh.lineTo(-0.4, 0.4); return sh; })()), new THREE.MeshLambertMaterial({ color: 0xf6f6f2, side: THREE.DoubleSide }));
      wg.position.set(s * 0.6, 4.2, -0.2); wg.rotation.set(0, s > 0 ? -0.3 : Math.PI + 0.3, 0); sw.add(wg); }
    // Wisma Sanyan + podium
    const glass = windowTex(1101, 6, 28, '#2f7a86', '#3f9aa6', 0.25, '#ffe8b0');
    const tw = new THREE.Group(); tw.position.set(12, 0, -70); g.add(tw);
    box(tw, 14, 70, 14, glass, 0, 35, 0); cyl(tw, 6, 6, 8, 16, 0xf2f2ee, 4, 74, 0); box(tw, 10, 6, 10, 0xf2f2ee, -2, 73, 0);
    box(tw, 60, 12, 30, windowTex(1102, 12, 3, '#f2f2ee', '#3a4a5a', 0.3, '#ffe8b0'), 6, 6, 8);
    for (let i = 0; i < 8; i++) { cyl(g, 0.08, 0.1, 4, 6, 0x555555, -12 + i * 6, 2, -24); sphere(g, 0.25, BM(0xfff0c8), -12 + i * 6, 4.1, -24, 1); glow(g, 0xffd890, 2.5, -12 + i * 6, 4.0, -24); }
    for (let i = 0; i < 6; i++) palm(g, -16 + i * 7, -54, 1.4);
    sibuZ = zombie(g, 9, -26, -0.6, 7, { walk: { dir: { x: -0.6, z: 0.8 }, speed: 0.3, span: 3 } });
    sibu.update = t => { const k = smooth(E.permulaan - 0.3, E.permulaan + 0.8, t); sibuZ.g.visible = k > 0; sibuZ.g.scale.setScalar(Math.max(0.001, k)); };
  }

  // ------------------------------------------------ per-scene look
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const DAY = { sky: [0x4a8fd8, 0xd8ecf8], fog: [0xdfe8ef, 80, 900], hemi: [0xffffff, 0x777777, 1.35], sun: [0xfff2dc, 1.5, V(40, 90, 60)] };
  const DUSK = { sky: [0x2a2a5a, 0xf08a4a], fog: [0xc87a5a, 60, 700], hemi: [0xffc8a0, 0x3a2a3a, 0.95], sun: [0xff9a5a, 1.0, V(-80, 30, -60)] };
  const GREY = { sky: [0x7a828c, 0xb8bec4], fog: [0xa8aeb4, 40, 500], hemi: [0xe0e4e8, 0x55565a, 1.1], sun: [0xdde3ea, 0.5, V(20, 80, 40)] };
  const NIGHT = { sky: [0x04060c, 0x10221a], fog: [0x18301e, 30, 380], hemi: [0x5a7a64, 0x101410, 0.75], sun: [0x8fb0a0, 0.3, V(-60, 80, -40)], stars: 1 };
  const LOOK = {
    hook: { set: 'bilik', day: 0, pos: [V(-0.3, 1.35, 1.2), V(-0.2, 1.3, 0.6)], look: [V(0.5, 1.4, -3), V(0.5, 1.5, -3)], sky: [0x6aa8e0, 0xf6d6a8], fog: [0xf6e6d0, 20, 60], hemi: [0xfff2dc, 0x6a5040, 1.2], sun: [0xffe2b0, 1.0, V(20, 30, 10)] },
    h1hus: { set: 'hus', day: 1, loc: 'HOSPITAL UMUM SARAWAK', pos: [V(-1.6, 1.65, 2.5), V(-1.2, 1.65, 0.8)], look: [V(1.8, 1.6, -10), V(1.8, 1.6, -10)], ...DAY },
    h1metro: { set: 'metro', mode: 'dusk', day: 1, loc: 'METROCITY', pos: [V(-12, 1.65, -4), V(-10, 1.65, -6)], look: [V(14, 3, -24), V(16, 3, -24)], ...DUSK },
    h2tular: { set: 'waterfront', day: 2, loc: 'WATERFRONT', pos: [V(-4, 1.65, 1.4), V(-4, 1.65, 0.8)], look: [V(-14, 1.6, -3), V(-14, 1.6, -3)], sky: [0x8aa8d0, 0xe0e8f0], fog: [0xc8d4dc, 60, 700], hemi: [0xffffff, 0x666666, 1.3], sun: [0xfff2dc, 1.2, V(40, 90, 60)] },
    h2spring: { set: 'spring', day: 2, loc: 'THE SPRING', pos: [V(-2, 1.7, 2), V(-2, 1.7, 0)], look: [V(4, 9, -50), V(4, 9.5, -50)], ...DAY },
    h2satok: { set: 'satok', day: 2, loc: 'JAMBATAN SATOK', pos: [V(-18, 4.5, 2), V(-14, 4.5, 1)], look: [V(0, 16, -100), V(4, 16, -100)], ...DAY },
    h3jalan: { set: 'jalan', day: 3, loc: 'JALAN TUN JUGAH', pos: [V(-1, 1.8, 2), V(-0.5, 1.8, -1)], look: [V(0.5, 2, -50), V(1, 2, -50)], ...GREY },
    h3pasaraya: { set: 'pasaraya', day: 3, loc: 'PASAR RAYA', pos: [V(0, 1.65, 1.5), V(0, 1.65, -0.5)], look: [V(-0.4, 1.2, -10), V(0.4, 1.2, -12)], sky: [0x7a828c, 0xb8bec4], fog: [0xd8d8d4, 20, 90], hemi: [0xf0f0f0, 0x9a9a9a, 1.25], sun: [0xffffff, 0.3, V(10, 40, 20)] },
    h4sentral: { set: 'sentral', day: 4, loc: 'KUCHING SENTRAL', pos: [V(-4, 1.7, 4), V(-2, 1.7, 2)], look: [V(0, 10, -40), V(2, 10, -40)], sky: [0x8a8a7a, 0xd8c890], fog: [0xc8bc98, 60, 700], hemi: [0xf0e8d0, 0x5a5440, 1.15], sun: [0xf0d8a0, 0.9, V(-60, 60, 40)] },
    h4platform: { set: 'platform', day: 4, loc: 'KUCHING SENTRAL', pos: [V(0, 1.65, 7.5), V(0, 1.65, 6.2)], look: [V(0, 3.2, -6), V(0, 3.4, -6)], sky: [0x8a8a7a, 0xd8c890], fog: [0x8a8a86, 15, 70], hemi: [0xe8e4d8, 0x5a564a, 1.1], sun: [0xf0d8a0, 0.4, V(10, 40, 20)] },
    h4ltak: { set: 'ltak', day: 4, loc: 'LAPANGAN TERBANG', pos: [V(-0.5, 1.65, 0), V(-0.3, 1.65, -3)], look: [V(1.0, 2.8, -16), V(1.2, 2.9, -16)], sky: [0x8a8a7a, 0xd8c890], fog: [0xc8b89a, 20, 110], hemi: [0xffe0b8, 0x4a3828, 0.95], sun: [0xffe8c0, 0.4, V(20, 40, 20)] },
    h5waterfront: { set: 'waterfront', day: 5, loc: 'WATERFRONT', pos: [V(-1, 1.65, 1.4), V(-2, 1.65, 0.8)], look: [V(-14, 1.8, -3), V(-14, 2, -6)], ...NIGHT },
    h5metro: { set: 'metro', mode: 'night', day: 5, loc: 'METROCITY', pos: [V(-12, 1.65, -4), V(-11, 1.65, -5)], look: [V(14, 3, -24), V(15, 3, -24)], ...NIGHT },
    h5rumah: { set: 'rumah', day: 5, loc: 'RUMAH', pos: [V(0.1, 1.6, 0.8), V(0.15, 1.65, 0.4)], look: [V(0.2, 1.7, -2.4), V(0.2, 1.7, -2.4)], ...NIGHT, fog: [0x101410, 10, 40] },
    h6: { set: 'dewan', day: 6, loc: 'PUSAT PERLINDUNGAN', pos: [V(2.5, 1.7, -2), V(2.0, 1.7, -3)], look: [V(-1, 0.9, -11), V(-1, 1.4, -15)], sky: [0x04060c, 0x10221a], fog: [0x141210, 15, 50], hemi: [0x6a5a48, 0x100c08, 0.55], sun: [0xffc890, 0.2, V(10, 20, 10)] },
    h7: { set: 'aerial', heli: 1, day: 7, loc: 'KUCHING', pos: [V(70, 75, 30), V(55, 68, 15)], look: [V(-25, 4, -85), V(-30, 4, -95)], sky: [0x5a6a80, 0xb0b8c4], fog: [0x8a96a4, 150, 1400], hemi: [0xc8d0dc, 0x3a4048, 0.95], sun: [0xc8d4e0, 0.6, V(80, 40, -100)] },
    radio: { set: 'aerial', heli: 1, radio: 1, day: 7, loc: 'KUCHING', pos: [V(55, 68, 15), V(48, 64, 8)], look: [V(-30, 4, -95), V(-32, 4, -100)], sky: [0x5a6a80, 0xb0b8c4], fog: [0x8a96a4, 150, 1400], hemi: [0xc8d0dc, 0x3a4048, 0.95], sun: [0xc8d4e0, 0.6, V(80, 40, -100)] },
    sibu: { set: 'sibu', day: 8, loc: 'SIBU', pos: [V(3, 2.2, 6), V(3.5, 2.2, 4)], look: [V(4, 9, -40), V(6, 9, -40)], sky: [0x3a2a6a, 0xf09a5a], fog: [0xb8806a, 60, 700], hemi: [0xffc8b0, 0x3a2a3a, 0.95], sun: [0xff9a6a, 0.9, V(-80, 25, -60)] },
    cta: { set: 'sibu', day: 9, loc: 'SIBU', pos: [V(3.5, 2.2, 4), V(3.6, 2.2, 3.6)], look: [V(6, 9, -40), V(7, 9, -40)], sky: [0x2a1e5a, 0xd06a5a], fog: [0xa86a6a, 60, 600], hemi: [0xffb8b0, 0x2a1a2a, 0.85], sun: [0xff8a6a, 0.8, V(-80, 20, -60)] },
  };

  // ------------------------------------------------ HUD
  const PCT = { 1: 3, 2: 12, 3: 28, 4: 45, 5: 63, 6: 81, 7: 100 };
  const dayStart = d => script.scenes.find(s => LOOK[s.id].day === d).start;
  function pct(t) { const d = LOOK[sceneAt(t).id].day; if (d < 1) return 0; if (d > 7) return 100; const prev = d === 1 ? 0 : PCT[d - 1]; return Math.round(lerp(prev, PCT[d], smooth(dayStart(d), dayStart(d) + 1.5, t))); }
  function hud(t) {
    const sc = sceneAt(t), L = LOOK[sc.id];
    if (sc.id === 'cta') return null;
    if (sc.id === 'sibu' || (sc.id === 'radio' && t > E.sibu)) return { label: '☣ KES BAHARU', value: 'SIBU', stat: 'SARAWAK', color: '#ff4a4a', pop: 1 + 0.2 * (1 - easeOut((t - E.sibu) / 0.5)) };
    if (L.day === 0) return { label: '☣ KAWASAN TERJEJAS', value: t > E.pesakit ? '1 PESAKIT' : '0', stat: 'KUCHING · 7:00 PAGI', color: '' };
    let v = pct(t); const val = (L.day === 1 && sc.id === 'h1hus') ? '1 PESAKIT' : v + '%';
    const col = v < 10 ? '' : v < 30 ? '#ffd84a' : v < 50 ? '#ff9a4a' : '#ff4a4a';
    return { label: '☣ KAWASAN TERJEJAS', value: val, stat: `HARI ${L.day} / 7 · ${L.loc}`, color: col, opacity: L.day === 7 && Math.floor(t * 3) % 2 ? 0.7 : 1 };
  }

  // ------------------------------------------------ update
  const shakes = [E.agresif, E.merebak, E.permulaan];
  function update(t) {
    const sc = sceneAt(t), L = LOOK[sc.id];
    for (const k in sets) sets[k].g.visible = k === L.set;
    const u = smooth(sc.start, sc.end, t);
    const pos = L.pos[0].clone().lerp(L.pos[1], u), look = L.look[0].clone().lerp(L.look[1], u);
    let sx = 0, sy = 0; for (const e of shakes) { const d = t - e; if (d >= 0 && d < 0.9) { const a = 0.03 * Math.exp(-d * 5); sx += Math.sin(d * 57) * a; sy += Math.cos(d * 49) * a; } }
    if (L.heli) { sx += Math.sin(t * 9) * 0.04; sy += Math.cos(t * 7) * 0.04; }
    pos.x += Math.sin(t * 0.6) * 0.008 + sx; pos.y += Math.sin(t * 1.1) * 0.006 + sy;
    camera.position.copy(pos); camera.lookAt(look.x + sx * 6, look.y + sy * 6, look.z);
    skyU.top.value.setHex(L.sky[0]); skyU.horizon.value.setHex(L.sky[1]);
    scene.fog.color.setHex(L.fog[0]); scene.fog.near = L.fog[1]; scene.fog.far = L.fog[2];
    hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sun.position.copy(pos).add(L.sun[2]); sun.target.position.copy(pos);
    stars.material.opacity = L.stars ? 0.8 : 0;
    clouds.visible = !L.stars && ['hus', 'metro', 'spring', 'satok', 'jalan', 'sentral', 'aerial', 'sibu', 'waterfront'].includes(L.set) && !(L.set === 'metro' && L.mode === 'night');
    const cc = L === LOOK.h3jalan || L.set === 'sentral' || L.heli ? [0x9aa0a8, 0x55585c] : L.set === 'sibu' || L.mode === 'dusk' ? [0xff9a7a, 0x6a2a2a] : [0xffffff, 0x8a8a8a];
    cloudMat.color.setHex(cc[0]); cloudMat.emissive.setHex(cc[1]);
    rig.position.set(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.004, 0);
    handL.visible = !L.heli; heliRig.visible = !!L.heli; radioBox.visible = !!L.radio;
    const talk = L.radio && t > E.kawalan && t < E.permulaan; radioLed.material.color.setHex(talk && Math.floor(t * 6) % 2 ? 0x37e07a : 0x0a3a1a); radioGlowS.material.opacity = talk ? 0.8 : 0;
    drawPhone(t, sc.id); phoneGlow.material.opacity = L.stars ? 0.5 : 0;
    if (L.set === 'metro') metro.update(t, L.mode); else sets[L.set].update(t);
    animatePeople(t); animateZombies(t);
  }

  // ------------------------------------------------ 2D: "Kisah rekaan", Kuching mini-map, Sarawak map, glitch
  const KMAP = { HUS: [.46, .60], MetroCity: [.16, .70], 'Petra Jaya': [.42, .22], Waterfront: [.56, .46], VivaCity: [.66, .70], 'The Spring': [.54, .78], 'Jbt Satok': [.34, .44], 'Tun Jugah': [.60, .86], Sentral: [.70, .94], LTAK: [.46, .98] };
  const INF = { 1: ['HUS', 'MetroCity', 'Petra Jaya'], 2: ['Waterfront', 'VivaCity', 'The Spring', 'Jbt Satok'], 3: ['Tun Jugah'], 4: ['Sentral', 'LTAK'] };
  const NEW = { h1hus: ['HUS'], h1metro: ['MetroCity', 'Petra Jaya'], h2tular: ['Waterfront'], h2spring: ['VivaCity', 'The Spring'], h2satok: ['Jbt Satok'], h3jalan: ['Tun Jugah'], h4platform: ['Sentral'], h4ltak: ['LTAK'], h5waterfront: ['Waterfront'], h5metro: ['MetroCity'] };
  const SWK = [[.02, .80], [.06, .74], [.12, .78], [.17, .72], [.22, .74], [.27, .66], [.30, .56], [.36, .52], [.47, .50], [.55, .42], [.62, .33], [.70, .24], [.76, .16], [.80, .20], [.84, .10], [.88, .06], [.93, .04], [.95, .12], [.90, .20], [.93, .32], [.88, .42], [.80, .50], [.72, .58], [.62, .62], [.50, .66], [.42, .74], [.33, .80], [.26, .86], [.18, .84], [.10, .88], [.05, .86]];
  const glCanvas = renderer.domElement;
  function drawFx(g, t, w, h) {
    const sc = sceneAt(t), L = LOOK[sc.id];
    if (t < 2.6) { g.globalAlpha = 1 - smooth(2.0, 2.6, t); g.font = 'italic 400 30px Garamond'; g.fillStyle = '#fbf8f1'; g.textAlign = 'center'; g.fillText('— Kisah rekaan —', w / 2, 780); g.textAlign = 'left'; g.globalAlpha = 1; }
    const mx = 330, my = 228, mw = 420, mh = 190;
    const sarawak = sc.id === 'sibu' || (sc.id === 'radio' && t > E.radio);
    if (sc.id !== 'cta' && !sarawak && L.day >= 0) {
      g.globalAlpha = 0.92; g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.strokeRect(mx, my, mw, mh);
      g.strokeStyle = 'rgba(140,190,230,.85)'; g.lineWidth = 7; g.beginPath(); g.moveTo(mx, my + mh * 0.5); g.bezierCurveTo(mx + mw * 0.3, my + mh * 0.3, mx + mw * 0.45, my + mh * 0.65, mx + mw * 0.62, my + mh * 0.45); g.bezierCurveTo(mx + mw * 0.78, my + mh * 0.3, mx + mw * 0.9, my + mh * 0.6, mx + mw, my + mh * 0.5); g.stroke();
      const d = L.day; const infected = []; for (let k = 1; k <= Math.min(d, 4); k++) infected.push(...INF[k]);
      const p = pct(t) / 100;
      if (d >= 1) { g.save(); g.beginPath(); g.rect(mx, my, mw, mh); g.clip();
        for (const name of (d >= 5 ? Object.keys(KMAP) : infected)) { const [x, y] = KMAP[name]; const r = 14 + p * 120 + Math.sin(t * 3 + x * 9) * 3; const gr = g.createRadialGradient(mx + x * mw, my + y * mh, 0, mx + x * mw, my + y * mh, r); gr.addColorStop(0, 'rgba(220,30,40,.55)'); gr.addColorStop(1, 'rgba(220,30,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(mx + x * mw, my + y * mh, r, 0, 7); g.fill(); }
        g.restore(); }
      const hot = NEW[sc.id] || [];
      for (const [name, [x, y]] of Object.entries(KMAP)) { const on = infected.includes(name) || (d >= 5); const px = mx + x * mw, py = my + y * mh; g.fillStyle = on ? '#ff4a4a' : 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(px, py, hot.includes(name) ? 8 : 4, 0, 7); g.fill();
        if (hot.includes(name)) { g.fillStyle = '#fbf8f1'; g.font = '600 20px HudSans'; g.textAlign = x > 0.5 ? 'right' : 'left'; g.fillText(name.toUpperCase(), px + (x > 0.5 ? -14 : 14), py - 10); g.textAlign = 'left'; } }
      if (L.day === 0 && t > E.pesakit) { const [x, y] = KMAP.HUS; g.fillStyle = '#ff4a4a'; g.beginPath(); g.arc(mx + x * mw, my + y * mh, 5 + Math.abs(Math.sin(t * 4)) * 4, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '600 16px HudSans'; g.fillText('KUCHING', mx + 8, my + 22); g.globalAlpha = 1;
    }
    if (sarawak && sc.id !== 'cta') {
      const sx = 300, sy = 222, sw = 480, sh = 205; const z = sc.id === 'radio' ? easeOut(clamp((t - E.radio) / 0.8)) : 1;
      g.globalAlpha = 0.92 * z; g.beginPath(); SWK.forEach(([x, y], i) => i ? g.lineTo(sx + x * sw, sy + y * sh) : g.moveTo(sx + x * sw, sy + y * sh)); g.closePath(); g.fillStyle = 'rgba(255,255,255,.14)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4; g.stroke();
      const kx = sx + .09 * sw, ky = sy + .80 * sh; g.fillStyle = 'rgba(220,30,40,.7)'; g.beginPath(); g.arc(kx, ky, 14, 0, 7); g.fill();
      if (t > E.sibu - 0.2) { const bx = sx + .38 * sw, by = sy + .62 * sh; const pr = (t * 1.3) % 1; g.fillStyle = '#ff4a4a'; g.beginPath(); g.arc(bx, by, 9, 0, 7); g.fill(); g.globalAlpha = (1 - pr) * z; g.strokeStyle = '#ff4a4a'; g.lineWidth = 3; g.beginPath(); g.arc(bx, by, 9 + pr * 26, 0, 7); g.stroke(); g.globalAlpha = z; g.fillStyle = '#fbf8f1'; g.font = '700 22px HudSans'; g.fillText('SIBU', bx + 16, by - 12); }
      g.fillStyle = '#fbf8f1'; g.font = '600 20px HudSans'; g.fillText('KUCHING', kx + 18, ky + 6); g.globalAlpha = 1;
    }
    // RGB glitch at each new day
    for (const c of DAYCUTS) { const d = t - c; if (d < 0 || d > 0.22) continue; const f = frameIndex(t); for (let i = 0; i < 6; i++) { const y = hash(f, i) * h, sh2 = 20 + hash(f, i + 20) * 120, dx = (hash(f, i + 40) - 0.5) * 120; g.drawImage(glCanvas, 0, y, w, sh2, dx, y, w, sh2); g.fillStyle = i % 2 ? 'rgba(255,40,60,.14)' : 'rgba(60,255,120,.10)'; g.fillRect(0, y, w, sh2); } }
    // radio static before Sibu
    { const d = t - SC.sibu.start; if (d > -0.1 && d < 0.4) { const f = frameIndex(t); for (let i = 0; i < 1400; i++) { g.fillStyle = hash(i, f) > 0.5 ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.7)'; g.fillRect(hash(i, f + 1) * w, hash(i, f + 2) * h, 6, 3); } } }
    // dark green vignette at night
    if (L.stars || L.set === 'dewan') { const gr = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75); gr.addColorStop(0, 'rgba(0,20,0,0)'); gr.addColorStop(1, 'rgba(0,12,4,.45)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  }
  const DAYCUTS = script.scenes.filter((s, i) => i > 0 && LOOK[s.id].day !== LOOK[script.scenes[i - 1].id].day && s.id !== 'cta').map(s => s.start);
  const cuts = script.scenes.slice(1).map(s => s.start).filter(x => x !== SC.cta.start && x !== SC.sibu.start);
  function flash(t) { let v = 0; for (const c of cuts) { const d = t - c; if (d > -0.12 && d < 0.35) v = Math.max(v, (d < 0 ? (d + 0.12) / 0.12 : 1 - d / 0.35) * (DAYCUTS.includes(c) ? 0.85 : 0.35)); } return v; }
  function grade(t) { const L = LOOK[sceneAt(t).id]; const d = L.day; const sat = L.stars ? 0.7 : [1.05, 1.05, 1.1, 0.8, 0.85, 0.7, 0.7, 0.65, 1.0, 0.95][d]; return `saturate(${sat}) contrast(${d >= 5 ? 1.12 : 1.06})`; }

  update(0);
  return { scene, camera, update, drawFx, flash, grade, hud };
}
