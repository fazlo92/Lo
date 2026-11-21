// "Apa jadi kalau RM1 berganda setiap hari selama 30 hari?" — Kuching. Every day is shown on screen.
import { kit } from '/engine/lib3d.js';

export async function create({ THREE, renderer, script, U }) {
  const { clamp, lerp, smooth, easeOut, hash, mulberry32, frameIndex } = U;
  const K = kit(THREE, U);
  const { box, cyl, sphere, plane, ground, canvasTex, texMat, glow, windowTex, person, animatePeople, SHIRTS, SKINS } = K;
  const E = script.events, W = script.width, H = script.height;
  const SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
  const rand = mulberry32(2048);
  const scene = new THREE.Scene();
  const BM = c => new THREE.MeshBasicMaterial({ color: c });
  const sceneAt = t => script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
  const DAYT = Array.from({ length: 30 }, (_, i) => E['d' + (i + 1)]);
  const dayAt = t => { let d = 0; for (let i = 0; i < 30; i++) if (t >= DAYT[i]) d = i + 1; return d; };
  const val = d => d < 1 ? 0 : Math.pow(2, d - 1);
  const rm = v => 'RM' + Math.round(v).toLocaleString('en-US');

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

  // ------------------------------------------------ hand + phone (safe zone)
  const rig = new THREE.Group(); camera.add(rig);
  const skin = 0xc68a5f, sleeve = 0x2a4a6a;
  const handL = new THREE.Group(); handL.position.set(-0.085, -0.17, -0.46); handL.rotation.set(0.3, 0.22, 0.1); rig.add(handL);
  box(handL, 0.11, 0.42, 0.1, sleeve, -0.02, -0.33, 0.02).rotation.x = -0.15;
  box(handL, 0.09, 0.11, 0.04, skin, 0, -0.07, -0.012);
  box(handL, 0.025, 0.07, 0.03, skin, 0.055, -0.02, 0.005).rotation.z = -0.5;
  box(handL, 0.078, 0.158, 0.009, 0x16181c, 0, 0.02, 0.012);
  for (let k = 0; k < 3; k++) box(handL, 0.016, 0.022, 0.02, skin, -0.044, -0.02 + k * 0.026, 0.0);
  const phoneT = canvasTex(256, 540);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), new THREE.MeshBasicMaterial({ map: phoneT.tex })); phoneScreen.position.set(0, 0.02, 0.0172); handL.add(phoneScreen);
  const phoneGlow = glow(handL, 0xffe8a0, 0.5, 0, 0.02, 0.03); phoneGlow.material.opacity = 0;

  function drawPhone(t, id) {
    const g = phoneT.ctx, w = 256, h = 540; g.textAlign = 'center';
    const choice = (pulse) => {
      g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '800 22px HudSans'; g.fillText('PILIH SATU', 128, 90);
      const b = (y, c, l1, l2, hi) => { g.fillStyle = c; g.globalAlpha = hi ? 1 : 0.9; g.beginPath(); g.roundRect(20, y, 216, 130, 18); g.fill(); g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = '900 30px HudSans'; g.fillText(l1, 128, y + 58); g.font = '700 18px HudSans'; g.fillText(l2, 128, y + 94); if (hi) { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.roundRect(14, y - 6, 228, 142, 22); g.stroke(); } };
      b(140, '#0f7a55', 'RM1 JUTA', 'tunai hari ini', pulse === 1); b(310, '#b8860b', 'RM1 × 2', 'setiap hari, 30 hari', pulse === 2);
    };
    if (id === 'hook') { choice(t > E.pilih + 1.2 ? (Math.floor(t * 2) % 2 ? 1 : 2) : 0); }
    else if (id === 'cta') { choice(Math.floor(t * 2) % 2 ? 1 : 2); }
    else if (id === 'belum') { choice(t > E.belumSejuta ? 1 : 0); }
    else {
      const d = dayAt(t), v = val(d);
      g.fillStyle = '#f4f6f9'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8860b'; g.fillRect(0, 0, w, 170);
      g.fillStyle = '#fff'; g.font = '800 20px HudSans'; g.fillText('BAKI AKAUN', 128, 50); g.font = '600 15px HudSans'; g.fillText(`Hari ${d} / 30`, 128, 78);
      const s = rm(v); g.font = `900 ${s.length > 10 ? 24 : 34}px HudSans`; g.fillText(s, 128, 132);
      if (d >= 2) { const dt = t - DAYT[d - 1]; const k = easeOut(clamp(dt / 0.3)) * (1 - smooth(1.4, 1.8, dt)); if (k > 0) { g.globalAlpha = k; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(14, 190, 228, 64, 14); g.fill(); g.fillStyle = '#0f7a55'; g.font = '800 16px HudSans'; g.fillText('Wang diterima', 128, 214); g.fillStyle = '#111'; g.font = '900 20px HudSans'; g.fillText('+' + rm(val(d - 1)), 128, 242); g.globalAlpha = 1; } }
      g.textAlign = 'left'; g.fillStyle = '#6b7280'; g.font = '600 14px HudSans'; g.fillText('Sejarah', 20, 290);
      for (let k = 0; k < 6 && d - k >= 1; k++) { const dd = d - k, y = 304 + k * 38; g.fillStyle = '#fff'; g.fillRect(14, y, 228, 32); g.fillStyle = '#111'; g.font = '600 14px HudSans'; g.fillText('Hari ' + dd, 24, y + 21); g.textAlign = 'right'; g.fillStyle = '#0f7a55'; g.fillText(rm(val(dd)), 232, y + 21); g.textAlign = 'left'; }
    }
    g.textAlign = 'left'; phoneT.tex.needsUpdate = true;
  }

  // ------------------------------------------------ helpers
  const sets = {};
  const makeSet = name => { const g = new THREE.Group(); g.visible = false; scene.add(g); sets[name] = { g, update: () => {} }; return sets[name]; };
  const tileMat = (a, b, rep) => texMat((c, w, h) => { c.fillStyle = a; c.fillRect(0, 0, w, h); c.strokeStyle = b; c.lineWidth = 4; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } }, 256, 256, { repeat: rep });
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
  const noteTex = texMat((c, w, h) => { c.fillStyle = '#2f7a4a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8e0b8'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#d8f0e0'; c.font = '800 70px Garamond'; c.fillText('100', 20, 82); c.beginPath(); c.arc(w * 0.72, h / 2, 40, 0, 7); c.fill(); }, 320, 140);
  const coinMat = new THREE.MeshLambertMaterial({ color: 0xe0b84a, emissive: 0x4a3410 });
  const brick = texMat((c, w, h) => { c.fillStyle = '#8f8379'; c.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { c.fillStyle = ['#a39486', '#978a7e', '#8a7d72', '#ab9d90'][(x * 7 + y * 3) % 4]; c.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14); } }, 256, 256, { repeat: [20, 6] });

  // ================================================= RIVERFRONT (hook, belum, jutawan, separuh, eksponen, cta)
  const river = makeSet('river'); const cityLit = [];
  {
    const g = river.g;
    ground(g, 80, 8, brick, 0, 0, -0.5);
    const rail = texMat((c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#141414'; c.lineWidth = 7; c.strokeRect(4, 4, w - 8, h - 8); for (let i = 0; i < 4; i++) { const cx = 32 + i * 64; c.beginPath(); c.arc(cx, h / 2, 26, 0, 7); c.stroke(); } }, 256, 80, { transparent: true, alphaTest: 0.4 }); rail.side = THREE.DoubleSide;
    for (let x = -40; x < 40; x += 2) { box(g, 0.08, 1.1, 0.08, 0x151515, x, 0.55, -4.3); plane(g, 1.92, 0.62, rail, x + 1, 0.55, -4.3); }
    box(g, 80, 0.06, 0.08, 0x151515, 0, 1.05, -4.3);
    river.lamps = []; for (const x of [-9, 6]) { cyl(g, 0.07, 0.11, 4.4, 8, 0x151515, x, 2.2, -3.9); const hd = sphere(g, 0.24, BM(0xf6f3ea), x, 4.55, -3.9, 1); river.lamps.push({ hd, gl: glow(g, 0xffe2a8, 2.6, x, 4.55, -3.9) }); }
    for (let k = 1; k < 20; k++) sphere(g, 0.13, new THREE.MeshLambertMaterial({ color: 0xd8262a, emissive: 0x6a0a0a }), -9 + k * 0.78, 4.3 - Math.sin((k % 10) / 10 * Math.PI) * 1.0, -3.9, 0);
    river.water = ground(g, 400, 160, new THREE.MeshLambertMaterial({ color: 0x5f7a66 }), 0, -1.2, -84);
    box(g, 400, 2.4, 3, 0x8a8a84, 0, -0.2, -162); ground(g, 600, 300, 0x4f8a3e, 0, 4, -320);
    dun(g, 22, 6, -205, 0.85);
    for (let i = 0; i < 12; i++) { const hgt = 24 + hash(i, 1) * 60, x = -150 + i * 18, z = -230 - hash(i, 2) * 50; box(g, 13, hgt, 13, windowTex(700 + i, 4, 10, '#c9c3ba', '#4a5260'), x, 4 + hgt / 2, z); const lit = box(g, 13.1, hgt, 13.1, new THREE.MeshBasicMaterial({ map: windowTex(800 + i, 4, 10, '#3a4050', '#1a1e28', 0.6, '#ffd58a').map, fog: false }), x, 4 + hgt / 2, z); cityLit.push(lit); }
    // giant golden bar for "separuh"
    river.bar = new THREE.Group(); river.bar.position.set(-6, 24, -60); g.add(river.bar);
    box(river.bar, 40, 5, 1, new THREE.MeshBasicMaterial({ color: 0x2a2416, transparent: true, opacity: 0.85 }), 0, 0, 0);
    river.fill = box(river.bar, 40, 4.4, 1.2, new THREE.MeshBasicMaterial({ color: 0xf2c94c }), 0, 0, 0.1); river.fill.geometry.translate(20, 0, 0); river.fill.position.x = -20;
    river.update = (t, mode) => {
      const night = mode === 'night'; river.water.material.color.setHex(night ? 0x141c2c : mode === 'dusk' ? 0x7a6a62 : 0x5f7a66);
      for (const l of river.lamps) l.gl.material.opacity = night ? 0.7 : 0; for (const c of cityLit) c.visible = night;
      const showBar = sceneAt(t).id === 'separuh'; river.bar.visible = showBar; if (showBar) river.fill.scale.x = Math.max(0.001, 0.5 * easeOut(clamp((t - SC.separuh.start) / 1.2)));
    };
  }

  // ================================================= KOPITIAM (days 1–7): coins pile up, laksa on day 4
  const kopi = makeSet('kopi'); const coinStacks = []; let laksaG, laugh;
  {
    const g = kopi.g;
    ground(g, 20, 20, tileMat('#e8e0d0', '#c9bfac', [10, 10]), 0, 0, -4);
    plane(g, 20, 4, 0xf0e2b6, 0, 2, -7); plane(g, 20, 20, 0xf6f1e4, 0, 3.8, -2).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const f = new THREE.Group(); f.position.set(-3 + i * 3, 3.6, -3.5); g.add(f); for (let k = 0; k < 3; k++) { const b = box(f, 0.9, 0.02, 0.14, 0x5a4a3a, 0.45, 0, 0); b.position.set(Math.cos(k * 2.09) * 0.45, 0, Math.sin(k * 2.09) * 0.45); b.rotation.y = -k * 2.09; } kopi['fan' + i] = f; }
    plane(g, 2.8, 1.0, texMat((c, w, h) => { c.fillStyle = '#7a1d1d'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c94c'; c.font = '800 70px HudSans'; c.textAlign = 'center'; c.fillText('KOPITIAM', w / 2, 100); }, 512, 160), 0, 2.9, -6.95);
    // marble table
    const top = cyl(g, 0.6, 0.6, 0.05, 24, new THREE.MeshLambertMaterial({ color: 0xf2f0ea }), 0, 0.76, -1.6); cyl(g, 0.06, 0.08, 0.74, 8, 0x333333, 0, 0.37, -1.6);
    // teh C peng (layered glass)
    const glassM = new THREE.MeshLambertMaterial({ color: 0xe9f0f4, transparent: true, opacity: 0.35 });
    cyl(g, 0.05, 0.042, 0.16, 12, glassM, -0.3, 0.87, -1.7); cyl(g, 0.046, 0.04, 0.05, 12, 0x7a4a2a, -0.3, 0.82, -1.7); cyl(g, 0.047, 0.044, 0.05, 12, 0xd8b890, -0.3, 0.87, -1.7); cyl(g, 0.048, 0.046, 0.04, 12, 0xf2efe6, -0.3, 0.92, -1.7);
    // coin stacks: up to 64 coins in 8 stacks
    for (let s2 = 0; s2 < 8; s2++) { const st = []; for (let k = 0; k < 8; k++) { const c = cyl(g, 0.028, 0.028, 0.008, 14, coinMat, 0.05 + (s2 % 4) * 0.075, 0.79 + k * 0.009, -1.5 - Math.floor(s2 / 4) * 0.075); st.push(c); } coinStacks.push(st); }
    laksaG = new THREE.Group(); laksaG.position.set(0.25, 0.79, -1.85); g.add(laksaG);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.07, 0.07, 18, 1, true), new THREE.MeshLambertMaterial({ color: 0xf3efe4, side: THREE.DoubleSide })); bowl.position.y = 0.035; laksaG.add(bowl);
    cyl(laksaG, 0.122, 0.122, 0.005, 18, 0xd27a3a, 0, 0.06, 0); for (let k = 0; k < 3; k++) { const pr = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.009, 5, 10, Math.PI * 1.3), K.mat(0xf08a6a)); pr.rotation.set(-Math.PI / 2, 0, k); pr.position.set(-0.03 + k * 0.03, 0.068, 0.04); laksaG.add(pr); }
    for (let k = 0; k < 4; k++) box(laksaG, 0.06, 0.005, 0.012, 0xf2c94c, -0.05, 0.065, -0.03 + k * 0.012);
    // customers at the next table
    cyl(g, 0.6, 0.6, 0.05, 24, 0xf2f0ea, 1.9, 0.76, -3.2); cyl(g, 0.06, 0.08, 0.74, 8, 0x333333, 1.9, 0.37, -3.2);
    laugh = [person(g, 1.3, -3.2, Math.PI / 2 - 0.4, { pose: 'sit', shirt: 0xd9c14a, skin: SKINS[1], seed: 5 }), person(g, 2.5, -3.3, -Math.PI / 2 - 0.3, { pose: 'sit', shirt: 0x3e5a8c, skin: SKINS[3], seed: 6 })];
    person(g, -2.2, -4.6, 0.4, { shirt: 0xf2f2f2, skin: SKINS[0], seed: 7 });
    kopi.update = t => {
      const d = dayAt(t), coins = Math.min(64, val(d));
      coinStacks.forEach((st, si) => st.forEach((c, k) => { const idx = si * 8 + k; c.visible = idx < coins; }));
      laksaG.visible = t >= E.laksa - 0.2;
      const lk = t > E.ketawa - 0.2 ? 1 : 0; laugh.forEach((p, i) => { p.head.rotation.x = lk ? -0.3 + Math.abs(Math.sin(t * 12 + i)) * 0.3 : 0; p.armR.rotation.x = lk ? -1.4 : 0; });
      for (let i = 0; i < 3; i++) kopi['fan' + i].rotation.y = t * 5 + i;
    };
  }

  // ================================================= COUNTER (days 8–14): note stacks grow
  const kaunter = makeSet('kaunter'); const noteStacks = [];
  {
    const g = kaunter.g;
    ground(g, 20, 20, tileMat('#d8d2c4', '#bfb7a6', [8, 8]), 0, 0, -4); plane(g, 20, 4, 0xe6e0d2, 0, 2, -6); plane(g, 20, 20, 0xf6f3ec, 0, 3.6, -2).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) box(g, 2.4, 0.05, 0.3, BM(0xffffff), -2.5 + i * 2.5, 3.55, -2.5);
    box(g, 4, 1.05, 0.8, 0x2b4f86, 0, 0.52, -1.9); box(g, 4.1, 0.06, 0.9, 0xf2f2f2, 0, 1.08, -1.9);
    box(g, 4, 1.2, 0.04, new THREE.MeshLambertMaterial({ color: 0xcfe6ee, transparent: true, opacity: 0.25 }), 0, 1.7, -2.3);
    plane(g, 2.6, 0.7, texMat((c, w, h) => { c.fillStyle = '#2b4f86'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 70px HudSans'; c.textAlign = 'center'; c.fillText('KAUNTER', w / 2, 100); }, 512, 140), 0, 2.9, -5.95);
    person(g, 0.2, -2.8, 0, { shirt: 0xf2f2f2, pants: 0x2b4f86, skin: SKINS[2], seed: 11 });
    for (let s2 = 0; s2 < 6; s2++) { const st = new THREE.Group(); st.position.set(-0.55 + (s2 % 3) * 0.3, 1.11, -1.65 - Math.floor(s2 / 3) * 0.18); g.add(st); const bl = box(st, 0.26, 1, 0.12, new THREE.MeshLambertMaterial({ color: 0x2f7a4a }), 0, 0.5, 0); const tp = plane(st, 0.26, 0.12, noteTex, 0, 1.001, 0); tp.rotation.x = -Math.PI / 2; noteStacks.push({ st, bl, tp }); }
    kaunter.update = t => { const d = dayAt(t); const v = val(d); const total = Math.log2(Math.max(1, v / 100)); noteStacks.forEach((n, i) => { const hgt = clamp(total - i * 0.9, 0, 1.3) * 0.18 + 0.002; n.bl.scale.y = hgt; n.bl.position.y = hgt / 2; n.tp.position.y = hgt + 0.001; n.st.visible = hgt > 0.004; }); };
  }

  // ================================================= SHOWROOM (motor / car)
  const showroom = makeSet('showroom'); let motor, carG, tagT, confetti = [];
  {
    const g = showroom.g;
    ground(g, 30, 30, tileMat('#f0f0ee', '#dcdcd8', [10, 10]), 0, 0, -6); plane(g, 30, 6, 0xeaeaea, 0, 3, -12); plane(g, 30, 30, 0x2a2c30, 0, 6, -6).rotation.x = Math.PI / 2;
    plane(g, 14, 4, BM(0x9fc8e8), -9, 2.5, -11.95);
    cyl(g, 2.2, 2.2, 0.15, 32, 0x2a2c30, 0, 0.08, -4.5); cyl(g, 2.25, 2.25, 0.03, 32, BM(0xf2c94c), 0, 0.17, -4.5);
    motor = new THREE.Group(); motor.position.set(0, 0.17, -4.5); g.add(motor);
    for (const z of [-0.65, 0.65]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 8, 18), K.mat(0x111111)); w.position.set(0, 0.38, z); w.rotation.y = Math.PI / 2; motor.add(w); }
    box(motor, 0.3, 0.35, 1.0, 0xc0392b, 0, 0.75, 0); box(motor, 0.32, 0.12, 0.55, 0x111111, 0, 0.98, -0.15); box(motor, 0.25, 0.5, 0.18, 0xc0392b, 0, 0.95, 0.55); box(motor, 0.7, 0.05, 0.05, 0x888888, 0, 1.22, 0.6);
    carG = new THREE.Group(); carG.position.set(0, 0.17, -4.5); g.add(carG);
    box(carG, 1.8, 0.7, 4.2, 0x2b6cb0, 0, 0.6, 0); box(carG, 1.6, 0.6, 2.2, 0x1a2a3a, 0, 1.25, -0.2);
    for (const x of [-0.85, 0.85]) for (const z of [-1.3, 1.3]) cyl(carG, 0.33, 0.33, 0.22, 12, 0x111111, x, 0.33, z).rotation.z = Math.PI / 2;
    for (const x of [-0.6, 0.6]) glow(carG, 0xfff2c0, 0.6, x, 0.65, 2.12);
    tagT = canvasTex(400, 220); const tag = plane(g, 1.0, 0.55, new THREE.MeshBasicMaterial({ map: tagT.tex }), 1.9, 1.2, -3.4); tag.rotation.y = -0.4; showroom.tag = tag;
    const spot = new THREE.SpotLight(0xffffff, 8, 20, 0.5, 0.4, 1); spot.position.set(0, 5.8, -3); spot.target.position.set(0, 0, -4.5); g.add(spot); g.add(spot.target);
    for (let i = 0; i < 60; i++) { const c = plane(g, 0.06, 0.1, BM([0xf2c94c, 0xd8262a, 0x2b6cb0, 0x37e07a, 0xffffff][i % 5]), 0, 0, 0); c.material.side = THREE.DoubleSide; confetti.push({ c, x: (hash(i, 1) - 0.5) * 5, z: -4.5 + (hash(i, 2) - 0.5) * 4, s: hash(i, 3) }); }
    person(g, 2.8, -6, -0.6, { shirt: 0x111111, pants: 0x111111, skin: SKINS[0], seed: 21 });
    showroom.update = (t, mode) => {
      const car = mode === 'car'; motor.visible = !car; carG.visible = car; (car ? carG : motor).rotation.y = t * 0.6;
      const d = dayAt(t); const c2 = tagT.ctx; c2.fillStyle = '#fff'; c2.fillRect(0, 0, 400, 220); c2.fillStyle = '#111'; c2.textAlign = 'center'; c2.font = '700 34px HudSans'; c2.fillText(car ? 'KERETA' : 'MOTOSIKAL', 200, 60);
      c2.fillStyle = '#0f7a55'; c2.font = '900 50px HudSans'; c2.fillText('MAMPU ✓', 200, 140); c2.fillStyle = '#6b7280'; c2.font = '600 24px HudSans'; c2.fillText('Baki: ' + rm(val(d)), 200, 192); c2.textAlign = 'left'; tagT.tex.needsUpdate = true;
      const c0 = car ? DAYT[17] : DAYT[14]; const show = t > c0 + 0.6;
      confetti.forEach(q => { const dt = t - c0 - 0.6; q.c.visible = show && dt < 4; if (!q.c.visible) return; q.c.position.set(q.x + Math.sin(dt * 3 + q.s * 9) * 0.3, 5 - dt * (1.2 + q.s), q.z); q.c.rotation.set(dt * 5 * q.s, dt * 3, 0); });
    };
  }

  // ================================================= SKY OF MONEY (days 22–28) and AERIAL FINALE (day 30)
  const langit = makeSet('langit'); const rain = [];
  {
    const g = langit.g;
    ground(g, 1200, 1200, 0x3a4a3a, 0, 0, -300);
    ground(g, 1200, 120, new THREE.MeshLambertMaterial({ color: 0x5f7a66 }), 0, 0.2, -120);
    for (let i = 0; i < 60; i++) { const x = -300 + hash(i, 1) * 600, z = -10 + hash(i, 2) * 80, hgt = 8 + hash(i, 3) * 50; box(g, 12, hgt, 12, windowTex(900 + i % 8, 4, 8, ['#d9d4cc', '#c9c3ba', '#e8e2d8'][i % 3], '#4a5260', 0.3, '#ffd58a'), x, hgt / 2, z); }
    for (let i = 0; i < 40; i++) { const x = -300 + hash(i, 7) * 600, z = -200 - hash(i, 8) * 150; box(g, 10, 6 + hash(i, 9) * 20, 10, 0xd8d2c8, x, 6, z); }
    dun(g, 40, 0, -190, 0.9);
    for (let i = 0; i < 260; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.4), noteTex); n.material.side = THREE.DoubleSide; g.add(n); rain.push({ n, x: (hash(i, 11) - 0.5) * 200, z: -40 + hash(i, 12) * 180, sp: 8 + hash(i, 13) * 10, ph: hash(i, 14) * 40, i }); }
    langit.update = (t, mode) => {
      const d = dayAt(t); const share = clamp((d - 21) / 9, 0.05, 1);
      rain.forEach(r => { r.n.visible = mode !== 'finale' && r.i / rain.length < share; if (!r.n.visible) return; const y = 160 - ((t * r.sp + r.ph * 10) % 170); r.n.position.set(r.x + Math.sin(t + r.i) * 4, y, r.z); r.n.rotation.set(t * 2 + r.i, t * 1.3 + r.i, 0); });
    };
  }

  // ------------------------------------------------ per-scene look
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const DAY = { sky: [0x4a8fd8, 0xd8ecf8], fog: [0xdfe8ef, 120, 1500], hemi: [0xffffff, 0x6a7a55, 1.4], sun: [0xfff2dc, 1.6, V(-80, 120, 60)] };
  const DUSK = { sky: [0x3a3a7a, 0xf6a86a], fog: [0xe0a888, 120, 1500], hemi: [0xffd8b8, 0x4a3a3a, 1.1], sun: [0xffa870, 1.2, V(-80, 30, -60)] };
  const NIGHT = { sky: [0x05070f, 0x1a1a3a], fog: [0x0c1020, 80, 900], hemi: [0x5a6490, 0x101018, 0.6], sun: [0x8fa2d0, 0.4, V(-60, 80, -40)], stars: 1 };
  const LOOK = {
    hook: { set: 'river', mode: 'day', pos: [V(0.4, 1.65, 0.6), V(0.2, 1.65, 0.0)], look: [V(12, 8, -60), V(14, 9, -60)], ...DAY },
    kopitiam: { set: 'kopi', pos: [V(-0.1, 1.45, -0.6), V(-0.05, 1.4, -0.75)], look: [V(0.1, 0.8, -1.7), V(0.12, 0.82, -1.75)], sky: [0x6aa8e0, 0xf6d6a8], fog: [0xe8dcc8, 15, 60], hemi: [0xfff2dc, 0x6a5040, 1.3], sun: [0xffe2b0, 0.8, V(20, 30, 10)] },
    kedai: { set: 'kaunter', pos: [V(-0.1, 1.55, -0.3), V(0, 1.5, -0.55)], look: [V(-0.25, 1.15, -1.7), V(-0.2, 1.2, -1.8)], sky: [0x6aa8e0, 0xf6d6a8], fog: [0xe6e0d2, 15, 60], hemi: [0xffffff, 0x8a8a80, 1.4], sun: [0xffffff, 0.5, V(10, 30, 10)] },
    motor: { set: 'showroom', mode: 'motor', pos: [V(-0.6, 1.6, 0.6), V(-0.3, 1.5, -0.2)], look: [V(0.4, 0.8, -4.5), V(0.5, 0.8, -4.5)], sky: [0x6aa8e0, 0xd8ecf8], fog: [0xeeeeee, 20, 80], hemi: [0xffffff, 0x8a8a8a, 1.2], sun: [0xffffff, 0.5, V(10, 30, 10)] },
    kereta: { set: 'showroom', mode: 'car', pos: [V(-0.6, 1.6, 0.8), V(-0.3, 1.55, 0.2)], look: [V(0.4, 0.8, -4.5), V(0.5, 0.8, -4.5)], sky: [0x6aa8e0, 0xd8ecf8], fog: [0xeeeeee, 20, 80], hemi: [0xffffff, 0x8a8a8a, 1.2], sun: [0xffffff, 0.5, V(10, 30, 10)] },
    belum: { set: 'river', mode: 'dusk', pos: [V(0.2, 1.65, 0.6), V(0.0, 1.65, 0.2)], look: [V(14, 8, -60), V(12, 8, -60)], ...DUSK },
    jutawan: { set: 'river', mode: 'dusk', pos: [V(0.0, 1.65, 0.2), V(0.0, 1.7, 0.0)], look: [V(12, 8, -60), V(12, 14, -60)], ...DUSK },
    langit: { set: 'langit', mode: 'rain', pos: [V(0, 70, 190), V(0, 74, 175)], look: [V(10, 40, -60), V(10, 46, -60)], ...DUSK, fog: [0xd8a888, 200, 1800] },
    separuh: { set: 'river', mode: 'night', pos: [V(-1, 1.65, 0.8), V(-1, 1.65, 0.4)], look: [V(-6, 10, -60), V(-6, 11, -60)], ...NIGHT },
    klimaks: { set: 'langit', mode: 'finale', pos: [V(0, 140, 160), V(0, 120, 120)], look: [V(20, 0, -120), V(20, 0, -130)], ...NIGHT, hemi: [0x8a8aa0, 0x202028, 0.8] },
    eksponen: { set: 'river', mode: 'night', pos: [V(-1, 1.65, 0.4), V(-1, 1.7, 0.2)], look: [V(10, 14, -200), V(10, 18, -200)], ...NIGHT },
    cta: { set: 'river', mode: 'night', pos: [V(-1, 1.7, 0.2), V(-1, 1.7, 0.1)], look: [V(10, 18, -200), V(10, 20, -200)], ...NIGHT },
  };

  // ------------------------------------------------ HUD
  function hud(t) {
    const sc = sceneAt(t); if (sc.id === 'cta') return null;
    const d = dayAt(t); if (d < 1) return { label: 'BAKI AKAUN', value: 'RM0', stat: 'HARI 0 / 30', color: '' };
    const s = rm(val(d)); const dt = t - DAYT[d - 1];
    return { label: 'BAKI AKAUN', value: s, stat: `HARI ${d} / 30`, color: d >= 21 ? '#f2c94c' : '', pop: 1 + 0.18 * (1 - easeOut(clamp(dt / 0.35))) , opacity: sc.id === 'eksponen' ? 1 - smooth(SC.eksponen.start + 2, SC.eksponen.start + 3, t) : 1 };
  }

  // ------------------------------------------------ update
  function update(t) {
    const sc = sceneAt(t), L = LOOK[sc.id];
    for (const k in sets) sets[k].g.visible = k === L.set;
    const u = smooth(sc.start, sc.end, t);
    const pos = L.pos[0].clone().lerp(L.pos[1], u), look = L.look[0].clone().lerp(L.look[1], u);
    let sx = 0, sy = 0; for (const e of [DAYT[20], DAYT[29]]) { const d = t - e; if (d >= 0 && d < 0.9) { const a = 0.03 * Math.exp(-d * 5); sx += Math.sin(d * 57) * a; sy += Math.cos(d * 49) * a; } }
    pos.x += Math.sin(t * 0.6) * 0.008 + sx; pos.y += Math.sin(t * 1.1) * 0.006 + sy;
    camera.position.copy(pos); camera.lookAt(look.x + sx * 6, look.y + sy * 6, look.z);
    skyU.top.value.setHex(L.sky[0]); skyU.horizon.value.setHex(L.sky[1]);
    scene.fog.color.setHex(L.fog[0]); scene.fog.near = L.fog[1]; scene.fog.far = L.fog[2];
    hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sun.position.copy(pos).add(L.sun[2]); sun.target.position.copy(pos);
    stars.material.opacity = L.stars ? 0.9 : 0;
    clouds.visible = !L.stars && ['river', 'langit'].includes(L.set); cloudMat.color.setHex(L === LOOK.belum || L === LOOK.jutawan || L === LOOK.langit ? 0xffb88a : 0xffffff);
    rig.position.set(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.004, 0);
    handL.visible = L.set !== 'langit';
    drawPhone(t, sc.id); phoneGlow.material.opacity = L.stars ? 0.5 : 0;
    sets[L.set].update(t, L.mode);
    animatePeople(t);
  }

  // ------------------------------------------------ 2D: 30-day calendar, RM1 juta bar, equation, graph, fireworks
  const glCanvas = renderer.domElement;
  function drawFx(g, t, w, h) {
    const sc = sceneAt(t), d = dayAt(t);
    // calendar grid (6 × 5), top of screen
    if (sc.id !== 'cta') {
      const cx0 = 318, cy0 = 226, cw = 70, chh = 30, gap = 4;
      for (let i = 0; i < 30; i++) { const x = cx0 + (i % 6) * (cw + gap), y = cy0 + Math.floor(i / 6) * (chh + gap); const on = i < d, now = i === d - 1;
        g.fillStyle = on ? (i >= 20 ? '#f2c94c' : '#2f9a5a') : 'rgba(255,255,255,.16)'; g.globalAlpha = 0.92; g.beginPath(); g.roundRect(x, y, cw, chh, 6); g.fill();
        if (now) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
        g.globalAlpha = 1; g.fillStyle = on ? (i >= 20 ? '#2a1e00' : '#fff') : 'rgba(255,255,255,.7)'; g.font = '700 18px HudSans'; g.textAlign = 'center'; g.fillText(String(i + 1), x + cw / 2, y + 22); }
      g.textAlign = 'left';
    }
    // RM1 juta bar (until it breaks on day 21)
    const breakT = DAYT[20];
    if (['kopitiam', 'kedai', 'motor', 'kereta', 'belum', 'jutawan'].includes(sc.id) && t < breakT + 1.2) {
      const bx = 330, by = 880, bw = 430, bh = 26; const frac = clamp(val(d) / 1e6, 0, 1);
      g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(bx, by, bw, bh, 13); g.fill();
      const big = sc.id === 'belum' || sc.id === 'jutawan';
      if (t < breakT) { g.fillStyle = '#0f7a55'; g.beginPath(); g.roundRect(bx, by, Math.max(13, bw * frac), bh, 13); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.roundRect(bx, by, bw, bh, 13); g.stroke();
      g.fillStyle = '#fbf8f1'; g.font = `700 ${big ? 22 : 18}px HudSans`; g.fillText('MATLAMAT: RM1 JUTA', bx, by - 10); g.textAlign = 'right'; g.fillText((frac * 100).toFixed(frac < 0.01 ? 4 : 1) + '%', bx + bw, by - 10); g.textAlign = 'left';
      if (t >= breakT) { const k = (t - breakT) / 1.2; for (let i = 0; i < 14; i++) { const px = bx + hash(i, 1) * bw, vy = -200 + hash(i, 2) * 120; g.globalAlpha = 1 - k; g.fillStyle = '#f2c94c'; g.save(); g.translate(px + (hash(i, 3) - 0.5) * 300 * k, by + vy * k + 400 * k * k); g.rotate(k * 6 * hash(i, 4)); g.fillRect(-18, -8, 36, 16); g.restore(); } g.globalAlpha = 1; }
    }
    // equation for the current day
    if (d >= 2 && !['eksponen', 'cta', 'separuh', 'klimaks'].includes(sc.id)) { const dt = t - DAYT[d - 1]; const k = easeOut(clamp(dt / 0.25)); g.globalAlpha = k * 0.95; g.font = '700 32px HudSans'; g.fillStyle = '#fff'; g.textAlign = 'center';
      const txt = `${rm(val(d - 1))} × 2 = ${rm(val(d))}`; const tw = g.measureText(txt).width + 36; g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(540 - tw / 2, 808 - 30, tw, 46, 14); g.fill(); g.fillStyle = '#fff'; g.fillText(txt, 540, 808); g.textAlign = 'left'; g.globalAlpha = 1; }
    // halfway label for day 29
    if (sc.id === 'separuh') { g.font = '800 34px HudSans'; g.fillStyle = '#f2c94c'; g.textAlign = 'center'; g.fillText('SEPARUH DARIPADA RM536,870,912', 540, 690); g.textAlign = 'left'; }
    // exponential graph
    if (sc.id === 'eksponen') { const gx = 330, gy = 600, gw = 440, gh = 300; const k = clamp((t - SC.eksponen.start) / 2.2);
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(gx - 20, gy - 20, gw + 40, gh + 60, 18); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx, gy + gh); g.lineTo(gx + gw, gy + gh); g.stroke();
      g.strokeStyle = '#f2c94c'; g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 60 * k; i++) { const x = i / 60, y = Math.pow(2, x * 29) / Math.pow(2, 29); const px = gx + x * gw, py = gy + gh - y * gh; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
      g.fillStyle = '#fff'; g.font = '600 20px HudSans'; g.fillText('Hari 1', gx, gy + gh + 30); g.textAlign = 'right'; g.fillText('Hari 30', gx + gw, gy + gh + 30); g.textAlign = 'left'; g.font = '800 28px HudSans'; g.fillStyle = '#f2c94c'; g.fillText('× 2  × 2  × 2 …', gx + 10, gy + 30); }
    // fireworks at day 30
    if (sc.id === 'klimaks') { for (let b = 0; b < 6; b++) { const t0 = DAYT[29] + 0.3 + b * 0.55, dt = t - t0; if (dt < 0 || dt > 1.6) continue; const cx = 220 + hash(b, 1) * 640, cy = 520 + hash(b, 2) * 300, col = ['#f2c94c', '#ff5a6a', '#7dd3fc', '#a3e635'][b % 4];
      for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, r = easeOut(dt / 1.2) * (110 + hash(b, 3) * 60); g.globalAlpha = 1 - dt / 1.6; g.fillStyle = col; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r + dt * dt * 40, 5, 0, 7); g.fill(); } } g.globalAlpha = 1;
      g.font = '800 30px HudSans'; g.fillStyle = '#f2c94c'; g.textAlign = 'center'; g.fillText('LEBIH SETENGAH BILION RINGGIT!', 540, 860); g.textAlign = 'left'; }
    // confetti on becoming a millionaire
    if (sc.id === 'jutawan') { const dt = t - DAYT[20]; for (let i = 0; i < 80; i++) { const x = hash(i, 5) * w, y = -40 + ((dt * (300 + hash(i, 6) * 300)) + hash(i, 7) * 400) % (h + 80); g.fillStyle = ['#f2c94c', '#ff5a6a', '#7dd3fc', '#a3e635', '#fff'][i % 5]; g.save(); g.translate(x, y); g.rotate(dt * 4 + i); g.fillRect(-6, -10, 12, 20); g.restore(); } }
  }
  const cuts = script.scenes.slice(1).map(s => s.start).filter(x => x !== SC.cta.start);
  function flash(t) { let v = 0; for (const c of cuts) { const d = t - c; if (d > -0.12 && d < 0.35) v = Math.max(v, d < 0 ? (d + 0.12) / 0.12 : 1 - d / 0.35); }
    for (const e of [DAYT[20], DAYT[29]]) { const d = t - e; if (d > 0 && d < 0.5) v = Math.max(v, 1 - d / 0.5); } return v * 0.75; }
  function grade() { return 'saturate(1.08) contrast(1.05)'; }

  update(0);
  return { scene, camera, update, drawFx, flash, grade, hud };
}
