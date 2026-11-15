// "Apa jadi kalau semua orang di Kuching tiba-tiba tak pandai matematik?" — one day, 7am to 9pm.
import { kit } from '/engine/lib3d.js';

export async function create({ THREE, renderer, script, U }) {
  const { clamp, lerp, smooth, easeOut, hash, mulberry32, frameIndex } = U;
  const K = kit(THREE, U);
  const { box, cyl, sphere, plane, ground, canvasTex, texMat, glow, flicker, windowTex, person, animatePeople, SHIRTS, SKINS } = K;
  const E = script.events, W = script.width, H = script.height;
  const SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
  const rand = mulberry32(77);
  const scene = new THREE.Scene();
  const glitchDigits = (str, t, amt, salt = 0) => [...str].map((c, i) => /[0-9]/.test(c) && hash(i + salt * 13, frameIndex(t) >> 1) < amt ? '0123456789?'[Math.floor(hash(i * 7 + salt, frameIndex(t)) * 11)] : c).join('');

  // ------------------------------------------------ camera, sky, lights
  const camera = new THREE.PerspectiveCamera(75, W / H, 0.05, 5000); scene.add(camera);
  const skyU = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, glowCol: { value: new THREE.Color() }, glow: { value: 0 } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 top, horizon, glowCol; uniform float glow; varying vec3 vD;
      void main(){ float h = vD.y; vec3 c = mix(horizon, top, smoothstep(-0.02, 0.5, h)); c += glowCol * glow * exp(-max(h,0.)*7.) * 0.7; gl_FragColor = vec4(c,1.); }`,
  })));
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 900; i++) { const th = rand() * 6.283, y = 0.06 + rand() * 0.9, r = Math.sqrt(1 - y * y); sp.push(Math.cos(th) * r * 3500, y * 3500, Math.sin(th) * r * 3500); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false })); scene.add(stars);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x888888, fog: false });
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group(); const a = -1 + rand() * 2, d = 900 + rand() * 900; c.position.set(Math.sin(a) * d, 180 + rand() * 260, -Math.cos(a) * d);
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(40 + rand() * 50, 0), cloudMat); s.position.set((k - 2) * 50, rand() * 25, rand() * 30); s.scale.y = 0.55; c.add(s); }
    clouds.add(c);
  }
  scene.fog = new THREE.Fog(0xffffff, 80, 1600);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1); scene.add(sun); scene.add(sun.target);

  // ------------------------------------------------ hands + phone
  const rig = new THREE.Group(); camera.add(rig);
  const skin = 0xc68a5f, sleeve = 0x3a4a6a;
  const handL = new THREE.Group(); handL.position.set(-0.14, -0.21, -0.46); handL.rotation.set(0.3, 0.22, 0.1); rig.add(handL);
  box(handL, 0.11, 0.42, 0.1, sleeve, -0.02, -0.33, 0.02).rotation.x = -0.15;
  box(handL, 0.09, 0.11, 0.04, skin, 0, -0.07, -0.012);
  box(handL, 0.025, 0.07, 0.03, skin, 0.055, -0.02, 0.005).rotation.z = -0.5;
  box(handL, 0.078, 0.158, 0.009, 0x16181c, 0, 0.02, 0.012);
  for (let k = 0; k < 3; k++) box(handL, 0.016, 0.022, 0.02, skin, -0.044, -0.02 + k * 0.026, 0.0);
  const phoneT = canvasTex(256, 540);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), new THREE.MeshBasicMaterial({ map: phoneT.tex }));
  phoneScreen.position.set(0, 0.02, 0.0172); handL.add(phoneScreen);
  const phoneGlow = glow(handL, 0xbfe0ff, 0.5, 0, 0.02, 0.03); phoneGlow.material.opacity = 0;
  const handR = new THREE.Group(); rig.add(handR); handR.visible = false;
  box(handR, 0.12, 0.45, 0.11, sleeve, 0, -0.26, 0.05).rotation.x = -0.4;
  box(handR, 0.1, 0.06, 0.12, skin, 0, 0.0, -0.04);
  const note10 = plane(handR, 0.15, 0.068, texMat((c, w, h) => { c.fillStyle = '#c9473e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff3e6'; c.font = '700 70px Garamond'; c.fillText('10', 24, 84); c.fillText('10', w - 100, h - 24); }, 512, 232), 0, 0.03, -0.12);
  note10.rotation.x = -1.2;

  function drawPhone(t, sc) {
    const g = phoneT.ctx, w = 256, h = 540;
    const dark = (bg) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); };
    g.textAlign = 'center';
    if (sc === 'rumah') {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#24345c'); grd.addColorStop(1, '#d98c5f'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = '600 20px HudSans'; g.fillText('PENGGERA', 128, 120);
      g.font = '600 72px HudSans'; g.fillText(t < E.alarm ? '7:00' : glitchDigits('7:00', t, 0.8, 1).replace(/^(.)/, m => hash(frameIndex(t) >> 2, 9) > 0.5 ? m : '?'), 128, 210);
      g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(128, 400, 44, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 18px HudSans'; g.fillText('HENTI', 128, 406);
    } else if (sc === 'atm') {
      dark('#f4f6f9'); g.fillStyle = '#0f7a55'; g.fillRect(0, 0, w, 160);
      g.fillStyle = '#fff'; g.font = '700 22px HudSans'; g.fillText('BANK', 128, 40); g.font = '600 15px HudSans'; g.fillText('Baki akaun', 128, 84);
      g.font = '700 32px HudSans'; g.fillText(t < E.baki ? 'RM 3,500.00' : glitchDigits('RM 3,500.00', t, 0.9, 4).replace(/,/g, hash(frameIndex(t) >> 1, 2) > 0.5 ? ',' : '.'), 128, 132);
      if (t > E.gaji - 0.3) { const y = 190; g.fillStyle = '#fff'; g.fillRect(14, y, 228, 70); g.fillStyle = '#0f7a55'; g.font = '700 16px HudSans'; g.fillText('GAJI MASUK', 128, y + 28); g.fillStyle = '#111'; g.font = '700 22px HudSans'; g.fillText(t < E.baki ? '+RM 3,500.00' : '+RM ' + glitchDigits('3,500.00', t, 1, 6), 128, y + 56); }
    } else if (sc === 'airportLuar' || sc === 'airportDalam') {
      dark('#ffffff'); g.fillStyle = '#c0392b'; g.fillRect(0, 0, w, 90); g.fillStyle = '#fff'; g.font = '700 22px HudSans'; g.fillText('PAS MENAIKI', 128, 56);
      g.fillStyle = '#111'; g.font = '800 46px HudSans'; g.fillText('KCH → KUL', 128, 170); g.font = '600 18px HudSans'; g.fillText('PINTU 3 · 12:30', 128, 210);
      if (t > E.batal) { g.save(); g.translate(128, 330); g.rotate(-0.25); g.strokeStyle = '#c0392b'; g.lineWidth = 8; g.strokeRect(-100, -40, 200, 80); g.fillStyle = '#c0392b'; g.font = '900 52px HudSans'; g.fillText('BATAL', 0, 18); g.restore(); }
    } else if (['loji', 'gelap'].includes(sc)) {
      dark('#0a0a0c'); g.fillStyle = '#9aa0a8'; g.font = '600 22px HudSans'; g.fillText('TIADA ISYARAT', 128, 250); g.font = '600 16px HudSans'; g.fillText('Bateri ' + glitchDigits('12%', t, 0.8, 3), 128, 290);
    } else if (sc === 'twist' || sc === 'cta') {
      dark('#0d0f14'); g.fillStyle = '#ffffff'; g.font = '300 26px HudSans'; g.fillText('KALKULATOR', 128, 70);
      g.font = '600 64px HudSans'; g.fillStyle = '#9fe0b0'; g.fillText('1 + 1 = 2', 128, 220);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = c === 3 ? '#e8892f' : '#2a2d33'; g.beginPath(); g.arc(46 + c * 55, 300 + r * 58, 22, 0, 7); g.fill(); }
    } else {
      // calculator showing nonsense, different per scene
      const sums = { laksa: ['8 − 10 =', '80'], satok: ['2 × 15 =', '2015'], terubuk: ['30 × 50% =', '45'], jalan: ['60 km/j =', '600'], hospitalLuar: ['2 × 1 =', '21'], farmasi: ['2 ÷ 1 =', '20?'], jambatan: ['168 + 168 =', '3'], };
      const [a, b] = sums[sc] || ['1 + 1 =', '11'];
      dark('#0d0f14'); g.fillStyle = '#ffffff'; g.font = '300 22px HudSans'; g.fillText('KALKULATOR', 128, 60);
      g.font = '600 34px HudSans'; g.fillStyle = '#c9ccd2'; g.fillText(a, 128, 170); g.font = '700 70px HudSans'; g.fillStyle = '#ff7a6a'; g.fillText(glitchDigits(b, t, 0.25, 5), 128, 250);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = c === 3 ? '#e8892f' : '#2a2d33'; g.beginPath(); g.arc(46 + c * 55, 320 + r * 54, 21, 0, 7); g.fill(); }
    }
    g.textAlign = 'left'; phoneT.tex.needsUpdate = true;
  }

  // ------------------------------------------------ set registry + shared builders
  const sets = {};
  const makeSet = name => { const g = new THREE.Group(); g.visible = false; scene.add(g); sets[name] = { g, update: () => {} }; return sets[name]; };
  function pleatedCone(R, Hh, n, color, droop = 0.12, inner = 0.8) {
    const pos = [], ring = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, out = i % 2 === 0; ring.push([Math.cos(a) * R * (out ? 1 : inner), out ? 0 : Hh * droop, Math.sin(a) * R * (out ? 1 : inner)]); }
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; pos.push(...a, 0, Hh, 0, ...b); pos.push(...b, 0, Hh * droop * 0.6, 0, ...a); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide }));
  }
  function tree(parent, x, z, s = 1, col = 0x3f6b35) {
    cyl(parent, 0.25 * s, 0.35 * s, 3 * s, 6, 0x5a4232, x, 1.5 * s, z);
    for (let k = 0; k < 3; k++) sphere(parent, (1.6 - k * 0.3) * s, col, x + (k - 1) * 0.8 * s, (3.4 + k * 0.6) * s, z + (k % 2) * 0.5 * s);
  }
  function dunBuilding(parent, x, y, z, s) {
    const dun = new THREE.Group(); dun.position.set(x, y, z); dun.scale.setScalar(s); parent.add(dun);
    box(dun, 90, 4, 60, 0xe7e1d6, 0, 2, 0);
    cyl(dun, 24, 24, 16, 18, texMat((c, w, h) => { c.fillStyle = '#efe8dc'; c.fillRect(0, 0, w, h); for (let i = 0; i < 36; i++) { c.fillStyle = '#d99a8c'; c.fillRect(i * w / 36 + 4, h * 0.25, w / 36 - 8, h * 0.6); } }, 512, 128), 0, 12, 0);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; for (const sg of [-1, 1]) { const col = box(dun, 0.9, 19, 0.9, 0xf6f2ea, Math.cos(a) * 27, 13, Math.sin(a) * 27); col.rotation.set(0, -a, sg * 0.32); } }
    const r1 = pleatedCone(34, 9, 9, 0xd4a03c, 0.25, 0.78); r1.position.y = 22; dun.add(r1);
    cyl(dun, 15, 16, 7, 18, 0xe9dfcf, 0, 30, 0);
    const r2 = pleatedCone(23, 40, 9, 0xd9a443, 0.12, 0.72); r2.position.y = 33; dun.add(r2);
    cyl(dun, 0.4, 1.4, 14, 6, 0xc28f37, 0, 79, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.3, px = Math.cos(a) * 40, pz = Math.sin(a) * 26; box(dun, 5, 4, 5, 0xefe8dc, px, 6, pz); const pc = pleatedCone(5, 4.5, 6, 0xd4a03c, 0.15, 0.8); pc.position.set(px, 8, pz); dun.add(pc); }
    return dun;
  }
  function steelStall(parent, signText, price) {
    const g = new THREE.Group(); parent.add(g);
    const steel = new THREE.MeshLambertMaterial({ color: 0xc9cdd2 });
    box(g, 1.8, 0.95, 0.8, steel, 0, 0.62, 0);
    for (const x of [-0.8, 0.8]) for (const z of [-0.3, 0.3]) cyl(g, 0.06, 0.06, 0.06, 8, 0x222222, x, 0.05, z).rotation.x = Math.PI / 2;
    box(g, 1.85, 0.05, 0.85, 0xb5b9be, 0, 1.12, 0);
    for (const x of [-0.88, 0.88]) for (const z of [-0.36, 0.36]) box(g, 0.04, 1.0, 0.04, 0xb5b9be, x, 1.62, z);
    box(g, 1.76, 0.95, 0.01, new THREE.MeshLambertMaterial({ color: 0xdbe8ee, transparent: true, opacity: 0.25 }), 0, 1.62, 0.37);
    const sign = texMat((c, w, h) => {
      const grd = c.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#f5e663'); grd.addColorStop(0.5, '#9fe08a'); grd.addColorStop(1, '#7fd6e6');
      c.fillStyle = grd; c.fillRect(0, 0, w, h); c.font = '900 76px HudSans'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = 14; c.strokeStyle = '#fff'; c.strokeText(signText, w / 2, h / 2 + 4); c.fillStyle = '#e8402f'; c.fillText(signText, w / 2, h / 2 + 4);
    }, 640, 170);
    box(g, 1.9, 0.5, 0.06, 0xb5b9be, 0, 2.35, 0.36); plane(g, 1.86, 0.46, sign, 0, 2.35, 0.395);
    box(g, 1.2, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), 0, 2.64, 0.38);
    const menu = texMat((c) => { c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, 256, 300); c.fillStyle = '#e88a3a'; c.beginPath(); c.ellipse(90, 170, 70, 52, 0, 0, 7); c.fill(); c.fillStyle = '#f2c94c'; c.fillRect(50, 140, 60, 14); c.fillStyle = '#c0392b'; c.beginPath(); c.ellipse(190, 70, 54, 34, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '800 34px HudSans'; c.textAlign = 'center'; c.fillText(price, 190, 82); }, 256, 300);
    plane(g, 0.62, 0.72, menu, 0.5, 1.62, 0.38);
    return g;
  }
  const brickMat = texMat((c, w, h) => { c.fillStyle = '#8f8379'; c.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { c.fillStyle = ['#a39486', '#978a7e', '#8a7d72', '#ab9d90'][(x * 7 + y * 3) % 4]; c.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14); } }, 256, 256, { repeat: [20, 6] });
  const tileMat = (a, b, rep) => texMat((c, w, h) => { c.fillStyle = a; c.fillRect(0, 0, w, h); c.strokeStyle = b; c.lineWidth = 4; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } }, 256, 256, { repeat: rep });

  // ================================================= BEDROOM (rumah)
  const rumah = makeSet('rumah'); let clockT;
  {
    const g = rumah.g;
    ground(g, 8, 8, texMat((c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#8a5a3a', '#7d5034', '#94623f'][i % 3]; c.fillRect(0, i * 32, w, 31); } }, 256, 256, { repeat: [3, 3] }), 0, 0, -1);
    plane(g, 8, 3.2, 0xe8e0d0, 0, 1.6, -3.2); const lw = plane(g, 8, 3.2, 0xdcd2c0, -2.4, 1.6, -1); lw.rotation.y = Math.PI / 2; const rw = plane(g, 8, 3.2, 0xdcd2c0, 2.4, 1.6, -1); rw.rotation.y = -Math.PI / 2;
    const ceil = plane(g, 8, 8, 0xf3eee4, 0, 3.2, -1); ceil.rotation.x = Math.PI / 2;
    // window with morning Kuching + DUN roof
    const win = texMat((c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6aa8e0'); gr.addColorStop(1, '#f6d6a8'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#5d8a4a'; c.fillRect(0, h * 0.72, w, h * 0.28);
      for (let i = 0; i < 9; i++) { c.fillStyle = ['#c9c3b8', '#e2dccf', '#b8b2a8'][i % 3]; const bh = 30 + (i * 37 % 60); c.fillRect(i * 30, h * 0.72 - bh, 26, bh); }
      c.fillStyle = '#d9a443'; c.beginPath(); c.moveTo(180, 70); c.lineTo(230, 140); c.lineTo(130, 140); c.closePath(); c.fill(); c.fillStyle = '#efe8dc'; c.fillRect(140, 140, 80, 22);
    }, 256, 200, { basic: true });
    plane(g, 1.6, 1.25, win, 0.9, 1.75, -3.18); box(g, 1.7, 0.08, 0.1, 0xffffff, 0.9, 2.4, -3.15); box(g, 1.7, 0.08, 0.1, 0xffffff, 0.9, 1.1, -3.15); box(g, 0.08, 1.35, 0.1, 0xffffff, 0.9, 1.75, -3.15);
    for (const x of [-0.05, 1.85]) box(g, 0.5, 1.6, 0.05, 0xe7a5a0, x, 1.7, -3.1);    // curtains
    // bed edge + blanket at bottom
    box(g, 2.2, 0.5, 2.0, 0xf2f2f2, -0.2, 0.25, 0.2); box(g, 2.2, 0.12, 1.4, 0x4a7fb5, -0.2, 0.55, 0.0);
    // side table + alarm clock
    box(g, 0.6, 0.6, 0.5, 0x7d5034, 0.6, 0.3, -1.4);
    box(g, 0.34, 0.18, 0.12, 0x1a1a1a, 0.6, 0.7, -1.4);
    clockT = canvasTex(256, 128);
    plane(g, 0.3, 0.14, new THREE.MeshBasicMaterial({ map: clockT.tex }), 0.6, 0.7, -1.33);
    cyl(g, 0.08, 0.1, 0.25, 8, 0xe0d4b8, 0.35, 0.73, -1.5); sphere(g, 0.13, new THREE.MeshBasicMaterial({ color: 0xfff1d0 }), 0.35, 0.95, -1.5, 1);
    const sunL = new THREE.PointLight(0xffe2b0, 1.6, 8, 1); sunL.position.set(0.9, 1.9, -2.6); g.add(sunL);
    rumah.update = t => {
      const c = clockT.ctx; c.fillStyle = '#080808'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#ff4a3c'; c.font = '700 88px HudSans'; c.textAlign = 'center';
      const opts = ['7:00', '70:0', '0:07', '?:??', '7:77', '00:7'];
      const s = t < E.alarm - 1 ? '7:00' : opts[Math.floor(hash(frameIndex(t) >> 3, 4) * opts.length)];
      if (Math.floor(t * 2) % 2 || t < E.alarm - 1) c.fillText(s, 128, 98); c.textAlign = 'left'; clockT.tex.needsUpdate = true;
    };
  }

  // ================================================= LAKSA STALL
  const laksa = makeSet('laksa'); let bowlG, notes = [], calcT;
  {
    const g = laksa.g;
    ground(g, 20, 20, tileMat('#6b4a36', '#4e3426', [10, 10]), 0, 0, -4);
    plane(g, 20, 6, texMat((c, w, h) => { for (let x = 0; x < w; x += 16) { c.fillStyle = x % 32 ? '#3d3f3f' : '#4a4c4b'; c.fillRect(x, 0, 16, h); } }, 256, 256, { repeat: [6, 1] }), 2, 3, -5.2);
    const roof = plane(g, 22, 14, 0x2f3133, 0, 4.2, -3); roof.rotation.x = Math.PI / 2;
    const st = steelStall(g, 'LAKSA SARAWAK', 'RM 8'); st.position.set(0.3, 0, -2.2);
    // laksa bowl on the counter (front, close)
    bowlG = new THREE.Group(); bowlG.position.set(0.05, 1.15, -1.75); g.add(bowlG);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.09, 0.08, 20, 1, true), new THREE.MeshLambertMaterial({ color: 0xf3efe4, side: THREE.DoubleSide })); bowl.position.y = 0.04; bowlG.add(bowl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.006, 4, 24), K.mat(0xd4a03c)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.08; bowlG.add(rim);
    cyl(bowlG, 0.162, 0.162, 0.005, 20, 0xd27a3a, 0, 0.07, 0);
    for (let k = 0; k < 6; k++) box(bowlG, 0.08, 0.006, 0.018, 0xf2c94c, -0.08 + (k % 2) * 0.02, 0.078, -0.03 + k * 0.016).rotation.y = 0.3;     // omelette
    for (let k = 0; k < 10; k++) box(bowlG, 0.05, 0.006, 0.008, 0xf2ece0, 0.0 + hash(k, 1) * 0.06, 0.078, -0.1 + hash(k, 2) * 0.05).rotation.y = hash(k, 3) * 3; // chicken
    for (let k = 0; k < 3; k++) { const pr = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.012, 5, 10, Math.PI * 1.3), K.mat(0xf08a6a)); pr.rotation.set(-Math.PI / 2, 0, k); pr.position.set(-0.03 + k * 0.04, 0.085, 0.08); bowlG.add(pr); }
    for (let k = 0; k < 14; k++) { const b = cyl(bowlG, 0.003, 0.003, 0.06, 4, 0xf8f6ea, 0.09 + hash(k, 5) * 0.04, 0.08, -0.02 + hash(k, 6) * 0.08); b.rotation.set(1.5, hash(k, 7) * 3, 0.3); }
    for (const [x, z] of [[0.04, -0.06], [0.08, -0.03]]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), K.mat(0x7fb34a)); l.position.set(x, 0.078, z); bowlG.add(l); }
    sphere(bowlG, 0.022, 0x8a2a1a, 0.0, 0.08, 0.0, 1).scale.y = 0.5;
    // calculator on the counter
    calcT = canvasTex(256, 120);
    box(g, 0.14, 0.02, 0.2, 0x2a2d33, -0.35, 1.16, -1.7); plane(g, 0.12, 0.05, new THREE.MeshBasicMaterial({ map: calcT.tex }), -0.35, 1.172, -1.76).rotation.x = -Math.PI / 2;
    // RM50 notes that fall on the counter
    const n50 = texMat((c, w, h) => { c.fillStyle = '#3b8a8a'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8f0e8'; c.font = '700 70px Garamond'; c.fillText('50', 24, 84); c.fillText('50', w - 100, h - 24); }, 512, 232);
    for (let k = 0; k < 8; k++) { const n = plane(g, 0.15, 0.068, n50, 0, 0, 0); n.material.side = THREE.DoubleSide; notes.push(n); }
    person(g, 0.3, -3.1, 0, { shirt: 0xe0d4b8, skin: SKINS[1], seed: 3 });
    laksa.update = t => {
      const c = calcT.ctx; c.fillStyle = '#c8d6b0'; c.fillRect(0, 0, 256, 120); c.fillStyle = '#1a1a1a'; c.font = '700 56px HudSans'; c.textAlign = 'right';
      c.fillText(t < E.pulang ? '8 − 10' : glitchDigits('80', t, 0.2, 2), 240, 86); c.textAlign = 'left'; calcT.tex.needsUpdate = true;
      handR.visible = t > E.bayar - 0.6 && t < E.pulang + 0.6;
      const k = smooth(E.bayar - 0.6, E.bayar, t); handR.position.set(0.24, lerp(-0.55, -0.24, k), lerp(-0.4, -0.6, k)); handR.rotation.set(-0.2, 0.2, 0);
      notes.forEach((n, i) => {
        const t0 = E.pulang + 0.2 + i * 0.12, d = clamp((t - t0) / 0.5);
        n.visible = t > t0; n.position.set(0.25 + hash(i, 1) * 0.3 - 0.15, lerp(1.6, 1.17 + i * 0.003, easeOut(d)), -1.75 + hash(i, 2) * 0.2);
        n.rotation.set(-Math.PI / 2 + (1 - d) * 1.5, hash(i, 3) * 2, 0);
      });
    };
  }

  // ================================================= MEDAN NIAGA SATOK (entrance) + TERUBUK STALL
  const satok = makeSet('satok');
  {
    const g = satok.g;
    ground(g, 200, 120, 0x55565c, 0, 0, -40);
    for (let i = -4; i <= 4; i++) box(g, 0.12, 0.02, 4, 0xffffff, i * 2.6, 0.02, -4);
    // shell roof
    const shellGeo = new THREE.SphereGeometry(12, 20, 10, 0, Math.PI, 0, Math.PI / 2);
    const shellMat = texMat((c, w, h) => { c.fillStyle = '#a9adb1'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6d7175'; c.lineWidth = 6; for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(i * w / 10, 0); c.lineTo(i * w / 10, h); c.stroke(); } for (let j = 1; j < 6; j++) { c.beginPath(); c.moveTo(0, j * h / 6); c.lineTo(w, j * h / 6); c.stroke(); } }, 512, 256);
    shellMat.side = THREE.DoubleSide;
    const shell = new THREE.Mesh(shellGeo, shellMat); shell.scale.set(0.9, 1.4, 0.55); shell.rotation.y = 0; shell.position.set(0, 7.5, -16); g.add(shell);
    const rimS = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.35, 6, 30, Math.PI), K.mat(0xe9e4d8)); rimS.scale.set(1, 1.55, 1); rimS.position.set(0, 7.5, -16); g.add(rimS);
    box(g, 22, 0.6, 6, 0x8a8e93, 0, 7.4, -17);
    // glass canopy over the door
    const gc = box(g, 8, 0.12, 3, new THREE.MeshLambertMaterial({ color: 0x9fb8c8, transparent: true, opacity: 0.6 }), 0, 6.6, -13.4); gc.rotation.x = 0.25;
    for (const x of [-9, -3.6, 3.6, 9]) box(g, 0.9, 6.8, 0.9, 0xe2702a, x, 3.4, -14);
    const sign = texMat((c, w, h) => { c.fillStyle = '#d9262c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 96px HudSans'; c.textAlign = 'center'; c.fillText('MEDAN NIAGA SATOK', w / 2 + 60, h / 2 + 34); c.fillStyle = '#fff'; c.fillRect(20, 20, 200, h - 40); c.fillStyle = '#2f8f4a'; c.beginPath(); c.moveTo(60, h - 40); c.lineTo(120, 40); c.lineTo(180, h - 40); c.fill(); }, 1400, 170);
    box(g, 19, 1.5, 0.4, 0xd9262c, 0, 6.0, -13.8); plane(g, 18.8, 1.4, sign, 0, 6.0, -13.58);
    box(g, 18, 4.5, 0.3, 0x2a2420, 0, 2.3, -16.5);
    for (let k = 0; k < 5; k++) { box(g, 2.2, 0.8, 1.2, [0xc0392b, 0x2b6cb0, 0xc0392b, 0x8a5a3a, 0x2b6cb0][k], -6 + k * 3, 0.4, -15.6); }
    for (let i = 0; i < 8; i++) person(g, -7 + i * 2, -15 + hash(i, 4), Math.PI, { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], seed: 30 + i, walk: { dir: { x: 1, z: 0 }, speed: 0.6, span: 4 } });
    for (let i = 0; i < 5; i++) { const c = cyl(g, 0.02, 0.18, 0.5, 8, 0xf07a1a, -4 + i * 2, 0.25, -11); box(g, 0.4, 0.04, 0.4, 0xf07a1a, -4 + i * 2, 0.02, -11); }
    // red multi-pitched roofs in the distance (complex)
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.ConeGeometry(7, 3.5, 4), K.mat(0xd2552c)); r.position.set(24 + i * 11, 8.2, -30 - i * 3); r.rotation.y = Math.PI / 4; g.add(r); box(g, 10, 6.5, 10, 0xe6dccb, 24 + i * 11, 3.25, -30 - i * 3); }
    for (const x of [-14, 14]) { cyl(g, 0.12, 0.15, 6, 8, 0x2f8f4a, x, 3, -9); sphere(g, 0.35, new THREE.MeshBasicMaterial({ color: 0xf6f3ea }), x, 6.1, -9, 1); }
  }
  const terubuk = makeSet('terubuk'); let scaleT, paperMesh, discT;
  {
    const g = terubuk.g;
    ground(g, 20, 20, new THREE.MeshLambertMaterial({ color: 0x5a5c5e }), 0, 0, -4);
    const back = plane(g, 20, 6, 0xe58a6a, 0, 3, -8); box(g, 20, 0.4, 0.2, 0xffffff, 0, 5.8, -7.9);
    for (let i = 0; i < 4; i++) box(g, 3, 2.6, 0.1, 0xd9d9d9, -6 + i * 4, 1.3, -7.9);
    const awn = plane(g, 8, 10, 0xc7c3bc, 0, 3.6, -3); awn.rotation.x = Math.PI / 2;
    // long sloping table with red trays of fish
    const table = new THREE.Group(); table.position.set(0.3, 0, -3); table.rotation.y = 0.18; g.add(table);
    box(table, 1.6, 0.8, 5.5, 0x6a6a6a, 0, 0.4, 0);
    const fishGeo = new THREE.SphereGeometry(0.075, 10, 6); fishGeo.scale(1.3, 0.5, 3.6);
    const fishMat = new THREE.MeshLambertMaterial({ color: 0xc4d0d8, emissive: 0x2a3440, flatShading: true });
    const tailGeo = new THREE.ConeGeometry(0.05, 0.12, 4); tailGeo.rotateX(Math.PI / 2);
    for (let tray = 0; tray < 4; tray++) {
      const tz = -2.0 + tray * 1.3;
      box(table, 1.45, 0.08, 1.15, 0xd82a2a, 0, 0.86, tz);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) {
        const f = new THREE.Mesh(fishGeo, fishMat); f.position.set(-0.55 + r * 0.45 + (k % 2) * 0.02, 0.93 + k * 0.004, tz - 0.48 + k * 0.12); f.rotation.set(0.15, 0.75, 0.25); table.add(f);
        const tl = new THREE.Mesh(tailGeo, fishMat); tl.position.copy(f.position).add(new THREE.Vector3(0.16, 0.03, 0.16)); tl.rotation.copy(f.rotation); table.add(tl);
      }
    }
    // hanging bulbs
    for (let i = 0; i < 3; i++) { box(g, 0.01, 1.2, 0.01, 0x222222, 0.2 + i * 0.4, 3.0, -2.2 - i * 1.5); const b = cyl(g, 0.12, 0.2, 0.3, 10, new THREE.MeshBasicMaterial({ color: 0xfff6e0 }), 0.2 + i * 0.4, 2.3, -2.2 - i * 1.5); glow(g, 0xfff0c8, 1.2, 0.2 + i * 0.4, 2.2, -2.2 - i * 1.5); }
    // green price boards
    const board = texMat((c, w, h) => { c.fillStyle = '#7ccf3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#a6e65c'; for (let i = 0; i < 40; i++) c.fillRect((i * 37) % w, (i * 53) % h, 8, 8); c.fillStyle = '#1a4ab0'; c.font = '800 34px HudSans'; c.textAlign = 'center'; c.fillText('IKAN TERUBUK', w / 2, 60); c.fillText('MASIN', w / 2, 100); c.fillStyle = '#c0392b'; c.font = '900 64px HudSans'; c.fillText('3 EKOR', w / 2, 190); c.font = '800 40px HudSans'; c.fillText('RM 30', w / 2, 240); }, 300, 270);
    const pb = plane(g, 0.6, 0.54, board, 1.25, 1.35, -2.0); pb.rotation.y = -0.6;
    // digital scale + paper note
    box(g, 0.4, 0.08, 0.35, 0xdfe2e6, -0.45, 0.88, -1.15); box(g, 0.36, 0.02, 0.3, 0xbfc4c9, -0.45, 0.93, -1.15);
    box(g, 0.22, 0.1, 0.04, 0x1a1a1a, -0.45, 0.9, -0.97);
    scaleT = canvasTex(256, 110); plane(g, 0.2, 0.08, new THREE.MeshBasicMaterial({ map: scaleT.tex }), -0.45, 0.9, -0.948);
    paperMesh = plane(g, 0.28, 0.2, texMat((c, w, h) => { c.fillStyle = '#fbf7ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a8a'; c.font = 'italic 700 92px Garamond'; c.fillText('20 kg', 22, 130); c.strokeStyle = '#c0392b'; c.lineWidth = 6; c.beginPath(); c.arc(140, 100, 110, 0, 7); c.stroke(); }, 300, 200), -0.1, 0.89, -0.85);
    paperMesh.rotation.x = -Math.PI / 2; paperMesh.rotation.z = 0.2;
    // discount sign
    discT = canvasTex(320, 260); const ds = plane(g, 0.62, 0.5, new THREE.MeshLambertMaterial({ map: discT.tex }), -0.95, 1.35, -1.9); ds.rotation.y = 0.5;
    person(g, -1.3, -3.2, 0.6, { shirt: 0x2c3140, skin: SKINS[2], seed: 51 });
    terubuk.update = t => {
      const c = scaleT.ctx; c.fillStyle = '#9fc48a'; c.fillRect(0, 0, 256, 110); c.fillStyle = '#122'; c.font = '700 70px HudSans'; c.textAlign = 'right'; c.fillText('2.00', 200, 84); c.font = '700 30px HudSans'; c.fillText('kg', 248, 84); c.textAlign = 'left'; scaleT.tex.needsUpdate = true;
      paperMesh.visible = t > E.baca20 + 0.3; paperMesh.scale.setScalar(easeOut(clamp((t - E.baca20 - 0.3) / 0.3)) || 0.001);
      const d = discT.ctx; d.fillStyle = '#ffe14a'; d.fillRect(0, 0, 320, 260); d.fillStyle = '#c0392b'; d.font = '900 54px HudSans'; d.textAlign = 'center'; d.fillText('DISKAUN', 160, 70); d.font = '900 84px HudSans'; d.fillText('50%', 160, 150);
      d.fillStyle = '#111'; d.font = '800 46px HudSans'; d.fillText('RM 30', 160, 218);
      const k = smooth(E.mahal - 0.2, E.mahal + 0.3, t);
      if (k > 0) { d.strokeStyle = '#c0392b'; d.lineWidth = 7; d.beginPath(); d.moveTo(90, 202); d.lineTo(90 + 140 * k, 202); d.stroke(); d.save(); d.translate(250, 250); d.rotate(-0.2); d.fillStyle = '#c0392b'; d.globalAlpha = k; d.font = '900 42px HudSans'; d.fillText('RM 45', 0, 0); d.restore(); }
      d.textAlign = 'left'; discT.tex.needsUpdate = true;
    };
  }

  // ================================================= TUGU KUCING + BANK
  const atm = makeSet('atm'); let shutter, atmScreens = [];
  {
    const g = atm.g;
    ground(g, 200, 200, 0x46474c, 0, 0, -40);
    const C = new THREE.Vector3(0, 0, -15);
    cyl(g, 5.2, 5.4, 0.7, 20, 0x9c8a7a, C.x, 0.35, C.z); cyl(g, 4.8, 4.8, 0.05, 20, new THREE.MeshLambertMaterial({ color: 0x5f7a6a }), C.x, 0.68, C.z);
    for (let i = 0; i < 9; i++) { const r = sphere(g, 1.0 + rand() * 0.8, [0x7a3f30, 0x8a4a38, 0x6a3428][i % 3], C.x + (rand() - 0.5) * 4, 0.9 + rand() * 0.8, C.z + (rand() - 0.5) * 3, 0); r.scale.y = 0.7; }
    const st = (base, stripe, patch) => texMat((c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); if (stripe) { c.fillStyle = stripe; for (let i = 0; i < 9; i++) c.fillRect(i * w / 9, 0, w / 22, h); } if (patch) { c.fillStyle = patch; c.beginPath(); c.ellipse(w * .3, h * .5, w * .18, h * .3, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(w * .75, h * .4, w * .14, h * .22, 0, 0, 7); c.fill(); } }, 128, 64);
    const cat = (x, y, z, s, ry, m, tall) => {
      const c = new THREE.Group(); c.position.set(x, y, z); c.scale.setScalar(s); c.rotation.y = ry; g.add(c);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), m); body.scale.set(0.8, tall ? 1.7 : 1.1, 0.8); body.position.y = tall ? 0.85 : 0.55; c.add(body);
      const hy = tall ? 1.85 : 1.15; const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), m); head.position.set(0, hy, 0.12); c.add(head);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 4), m); e.position.set(sx * 0.2, hy + 0.32, 0.1); c.add(e); sphere(c, 0.05, 0x3a8a5a, sx * 0.13, hy + 0.05, 0.43); }
      box(c, 0.12, 0.08, 0.1, 0xe7a0a0, 0, hy - 0.08, 0.45); for (const sx of [-0.18, 0.18]) box(c, 0.14, tall ? 0.5 : 0.35, 0.14, m, sx, 0.2, 0.25);
      const tail = box(c, 0.1, 0.9, 0.1, m, 0.35, 0.4, -0.35); tail.rotation.z = -0.6;
    };
    const orange = st('#e8892f', '#1e1a16'), white = st('#f2f0ea'), bw = st('#f2f0ea', null, '#1e1e1e'), ow = st('#f2f0ea', null, '#e8892f');
    cat(0.6, 1.9, C.z - 0.6, 2.4, 0.1, orange, true); cat(-1.4, 1.8, C.z - 0.2, 1.9, 0.5, white, true); cat(-0.4, 1.7, C.z + 1.2, 1.3, -0.2, ow, false); cat(1.6, 1.6, C.z + 0.9, 1.2, -0.6, bw, false); cat(0.3, 1.6, C.z + 1.9, 0.7, 0, white, false);
    box(g, 18, 70, 18, windowTex(501, 6, 20, '#d8cdb4', '#55606e'), 10, 35, -62);
    for (let i = -6; i <= 6; i++) { box(g, 7.8, 11, 6, windowTex(600 + i, 3, 3, ['#e7e3dc', '#d9d2c6', '#ece6da'][(i + 9) % 3], '#4a5260'), i * 8, 5.5, -40); box(g, 6, 1.2, 0.2, K.mat([0x3b82c4, 0xe0e0e0, 0xc0392b, 0xf0f0f0][(i + 8) % 4]), i * 8, 4.6, -36.9); }
    box(g, 0.4, 4.5, 9, 0xe9e6df, 4.8, 2.25, -5);
    for (let k = 0; k < 2; k++) { const z = -2.2 - k * 1.6; box(g, 0.6, 1.7, 0.9, 0x2d3a4a, 4.3, 0.85, z); const T = canvasTex(256, 160); const scr = plane(g, 0.5, 0.31, new THREE.MeshBasicMaterial({ map: T.tex }), 3.99, 1.32, z); scr.rotation.y = -Math.PI / 2; atmScreens.push(T); }
    // bank counter door with roller shutter
    box(g, 0.3, 3.0, 2.6, 0x3a3f46, 4.65, 1.5, -6.8);
    shutter = plane(g, 2.4, 2.8, texMat((c, w, h) => { for (let y = 0; y < h; y += 12) { c.fillStyle = y % 24 ? '#a8adb3' : '#9298a0'; c.fillRect(0, y, w, 12); } c.fillStyle = '#c0392b'; c.fillRect(30, h / 2 - 50, w - 60, 100); c.fillStyle = '#fff'; c.font = '800 46px HudSans'; c.textAlign = 'center'; c.fillText('KAUNTER', w / 2, h / 2 - 6); c.fillText('DITUTUP', w / 2, h / 2 + 42); }, 300, 340), 4.48, 1.5, -6.8);
    shutter.rotation.y = -Math.PI / 2;
    const queue = [];
    for (let i = 0; i < 30; i++) { const a = -0.3 + i * 0.2; queue.push(person(g, C.x + Math.cos(a) * 7.5, C.z + Math.sin(a) * 7.5 + 2, -Math.PI / 2, { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], seed: 120 + i, phone: i % 3 === 0 })); }
    atm.update = t => {
      for (const T of atmScreens) { const c = T.ctx; c.fillStyle = '#0f4c81'; c.fillRect(0, 0, 256, 160); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '700 26px HudSans'; c.fillText('BAKI ANDA:', 128, 66); c.font = '800 34px HudSans'; c.fillText('RM ' + glitchDigits('8,8?8.88', t, 1, 9), 128, 112); c.textAlign = 'left'; T.tex.needsUpdate = true; }
      const k = smooth(E.tutup - 0.2, E.tutup + 0.7, t); shutter.position.y = lerp(4.3, 1.5, k); shutter.scale.y = 1;
      for (const q of queue) q.head.rotation.y = Math.sin(t * 2 + q.seed) * 0.5;
    };
  }

  // ================================================= ROAD + PETROL STATION
  const jalan = makeSet('jalan'); let speedT, pumpTs = [], puddle, lightCountT;
  {
    const g = jalan.g;
    ground(g, 200, 200, 0xbdbab2, 0, 0, -30);
    ground(g, 200, 12, 0x3a3b40, 0, 0.01, -26);
    for (let i = -10; i < 10; i++) box(g, 3, 0.02, 0.2, 0xe8e2d0, i * 7, 0.03, -26);
    // canopy
    const cg = new THREE.Group(); cg.position.set(2, 0, -10); g.add(cg);
    const red = new THREE.MeshLambertMaterial({ color: 0xd8262a });
    box(cg, 22, 1.4, 12, red, 0, 6.6, 0); box(cg, 21.6, 0.08, 11.6, 0xeeeeee, 0, 5.86, 0);
    for (const x of [-11, 11]) cyl(cg, 0.7, 0.7, 1.4, 12, red, x, 6.6, 0).rotation.x = Math.PI / 2;
    box(cg, 6, 1.42, 12.02, 0x1a1a1a, 9, 6.6, 0);
    for (let i = 0; i < 6; i++) box(cg, 18, 0.04, 0.1, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 5.8, -5 + i * 2);
    // arch pump islands
    const archShape = new THREE.Shape(); archShape.moveTo(-1.2, 0); archShape.lineTo(-1.2, 4); archShape.absarc(0, 4, 1.2, Math.PI, 0, true); archShape.lineTo(1.2, 0); archShape.lineTo(0.8, 0); archShape.lineTo(0.8, 4); archShape.absarc(0, 4, 0.8, 0, Math.PI, false); archShape.lineTo(-0.8, 0); archShape.lineTo(-1.2, 0);
    const archGeo = new THREE.ExtrudeGeometry(archShape, { depth: 0.6, bevelEnabled: false, curveSegments: 10 });
    [[-6, 0xd8262a, '3'], [-1, 0xd8262a, '5'], [4, 0xd8262a, '7'], [9, 0x2a5fc0, '9']].forEach(([x, col, num], k) => {
      const a = new THREE.Mesh(archGeo, K.mat(col)); a.position.set(x, 0, -0.3); a.rotation.y = Math.PI / 2; cg.add(a);
      const nm = plane(cg, 0.7, 0.7, texMat((c, w, h) => { c.fillStyle = '#fff'; c.font = '800 110px HudSans'; c.textAlign = 'center'; c.fillText(num, w / 2, 100); }, 128, 128, { transparent: true }), x + 0.31, 4.3, 0.95); nm.rotation.y = Math.PI / 2;
      box(cg, 0.5, 1.6, 0.9, 0xf2f2f2, x, 0.8, 0.0); box(cg, 0.52, 0.3, 0.92, col, x, 1.6, 0.0);
      const T = canvasTex(256, 160); const s = plane(cg, 0.45, 0.28, new THREE.MeshBasicMaterial({ map: T.tex }), x + 0.26, 1.2, 0); s.rotation.y = Math.PI / 2; pumpTs.push(T);
    });
    puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshLambertMaterial({ color: 0x2a2418, transparent: true, opacity: 0.8 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(-1.6, 0.02, -10); g.add(puddle);
    // queued cars
    for (let i = 0; i < 10; i++) { const c = new THREE.Group(); c.position.set(-30 + i * 5.2, 0, -24 + (i % 2) * 4); g.add(c); box(c, 4.2, 1.0, 1.8, [0xc23b3b, 0xe8e8e8, 0x3a6fb5, 0x2b2b2b, 0xd9b44a, 0x7d8a8f][i % 6], 0, 0.7, 0); box(c, 2.2, 0.7, 1.6, 0x24303f, 0, 1.45, 0); }
    // speed sign
    cyl(g, 0.06, 0.06, 2.2, 6, 0x888888, -2.6, 1.1, -6);
    speedT = canvasTex(256, 256); const ssn = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ map: speedT.tex })); ssn.position.set(-2.6, 2.35, -5.95); g.add(ssn);
    // traffic light with countdown
    cyl(g, 0.08, 0.1, 4, 6, 0x3b3f44, 6, 2, -20); box(g, 0.45, 1.2, 0.3, 0x1f2226, 6, 4.2, -20);
    const redL = glow(g, 0xff3a2a, 1.6, 6, 4.55, -19.8);
    lightCountT = canvasTex(128, 80); plane(g, 0.42, 0.26, new THREE.MeshBasicMaterial({ map: lightCountT.tex }), 6, 3.4, -19.84);
    for (let i = 0; i < 5; i++) person(g, -1 - i * 0.8, -6.5 - (i % 2), 0.4, { shirt: SHIRTS[i + 3], skin: SKINS[i % 6], seed: 90 + i });
    jalan.update = t => {
      const s = speedT.ctx; s.fillStyle = '#fff'; s.beginPath(); s.arc(128, 128, 124, 0, 7); s.fill(); s.strokeStyle = '#d8262a'; s.lineWidth = 28; s.beginPath(); s.arc(128, 128, 108, 0, 7); s.stroke();
      const opts = ['60', '600', '6', '0.6', '06'], v = t < E.hadLaju + 0.3 ? '60' : opts[Math.floor(hash(frameIndex(t) >> 3, 2) * opts.length)];
      s.fillStyle = '#111'; s.font = `800 ${v.length > 2 ? 78 : 110}px HudSans`; s.textAlign = 'center'; s.fillText(v, 128, 162); s.textAlign = 'left'; speedT.tex.needsUpdate = true;
      const run = clamp((t - E.pam) / 4);
      pumpTs.forEach((T, i) => { const c = T.ctx; c.fillStyle = '#0e1a10'; c.fillRect(0, 0, 256, 160); c.fillStyle = '#7dff8a'; c.font = '700 40px HudSans'; const v2 = t < E.pam ? 50 : 50 + (t - E.pam) * (300 + i * 97) * (1 + run * 6); c.fillText('RM ' + v2.toFixed(2), 14, 64); c.font = '600 26px HudSans'; c.fillText((v2 / 3.87).toFixed(1) + ' L', 14, 120); T.tex.needsUpdate = true; });
      const pr = clamp((t - E.pam - 0.5) / 3); puddle.scale.setScalar(0.01 + pr * 3.5);
      const l = lightCountT.ctx; l.fillStyle = '#111'; l.fillRect(0, 0, 128, 80); l.fillStyle = '#ff5a4a'; l.font = '700 52px HudSans'; l.textAlign = 'center'; l.fillText(glitchDigits(String(Math.max(0, 30 - Math.floor(t - SC.jalan.start))), t, t > E.lumpuh ? 1 : 0.2, 3), 64, 60); l.textAlign = 'left'; lightCountT.tex.needsUpdate = true;
    };
  }

  // ================================================= AIRPORT: exterior + interior
  const apLuar = makeSet('airportLuar');
  {
    const g = apLuar.g;
    ground(g, 300, 300, 0x5d8a45, 0, 0, -60); ground(g, 300, 10, 0x55565c, 0, 0.02, -18);
    // ramp deck
    box(g, 120, 0.8, 6, 0xc9cdd2, -10, 5.6, -24); box(g, 120, 0.9, 0.08, 0xdddddd, -10, 6.4, -21.1);
    for (let i = 0; i < 10; i++) cyl(g, 0.7, 0.7, 5.6, 12, 0xa7abb0, -50 + i * 9, 2.8, -24);
    box(g, 120, 6, 0.3, new THREE.MeshLambertMaterial({ color: 0x3a5060, transparent: true, opacity: 0.85 }), -10, 3, -30);
    // trumpet columns with bowl canopies
    const bowlGeo = new THREE.LatheGeometry([new THREE.Vector2(0.4, 0), new THREE.Vector2(1.2, 0.6), new THREE.Vector2(3.0, 1.6), new THREE.Vector2(4.2, 2.6), new THREE.Vector2(4.5, 3.2)], 16);
    const bowlMat = new THREE.MeshLambertMaterial({ color: 0xa8acb2, side: THREE.DoubleSide });
    const under = new THREE.MeshLambertMaterial({ color: 0x8a5a3a, side: THREE.BackSide });
    for (let i = 0; i < 9; i++) {
      const x = -48 + i * 9.5, z = -32 - i * 0.6;
      cyl(g, 0.55, 0.7, 12, 10, 0x8f949a, x, 6, z);
      const b = new THREE.Mesh(bowlGeo, bowlMat); b.position.set(x, 12, z); b.scale.set(1, 1, 0.7); g.add(b);
      const b2 = new THREE.Mesh(bowlGeo, under); b2.position.copy(b.position); b2.scale.copy(b.scale); g.add(b2);
    }
    const bigRoof = box(g, 26, 1.2, 20, 0xa8acb2, 38, 17, -38); bigRoof.rotation.z = 0.35;
    box(g, 30, 14, 18, 0x9aa0a6, 40, 7, -44);
    for (let i = 0; i < 12; i++) person(g, -10 + i * 2, -21 + (i % 2), 0, { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], y: 6.0, seed: 300 + i });
    for (let i = 0; i < 4; i++) { const c = new THREE.Group(); c.position.set(-20 + i * 9, 0, -18); g.add(c); box(c, 4.2, 1.0, 1.8, [0xe8e8e8, 0xd9b44a, 0x2b2b2b, 0xc23b3b][i], 0, 0.7, 0); box(c, 2.2, 0.7, 1.6, 0x24303f, 0, 1.45, 0); }
  }
  const apDalam = makeSet('airportDalam'); let boardT;
  {
    const g = apDalam.g;
    ground(g, 16, 60, texMat((c, w, h) => { c.fillStyle = '#e9dccb'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a5a3a'; c.fillRect(0, 120, w, 16); c.fillStyle = '#b5523a'; c.fillRect(110, 0, 36, 36); }, 256, 256, { repeat: [3, 10] }), 0, 0, -25);
    const ceil = plane(g, 16, 60, texMat((c, w, h) => { for (let x = 0; x < w; x += 16) { c.fillStyle = x % 32 ? '#7a4f2e' : '#6e4628'; c.fillRect(x, 0, 16, h); } }, 256, 256, { repeat: [3, 10] }), 0, 5, -25); ceil.rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) for (const x of [-3, 3]) { sphere(g, 0.25, new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), x, 4.9, -2 - i * 5, 1); glow(g, 0xffc860, 2.2, x, 4.7, -2 - i * 5); }
    for (let i = 0; i < 8; i++) for (const x of [-4.5, 4.5]) cyl(g, 0.5, 0.5, 5, 16, new THREE.MeshLambertMaterial({ color: 0xc9ced4, emissive: 0x30302a }), x, 2.5, -3 - i * 6);
    plane(g, 60, 5, 0xe9e3d8, -7.5, 2.5, -25).rotation.y = Math.PI / 2;
    const win = plane(g, 60, 5, new THREE.MeshBasicMaterial({ color: 0x9fc8e8 }), 7.5, 2.5, -25); win.rotation.y = -Math.PI / 2;
    for (let i = 0; i < 20; i++) box(g, 0.12, 5, 0.12, 0xdddddd, 7.4, 2.5, -2 - i * 3);
    // signs
    const signA = texMat((c, w, h) => { c.fillStyle = '#7a4a2e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '600 34px HudSans'; c.fillText('Balai Berlepas', 24, 56); c.font = '800 180px HudSans'; c.fillText('A', 70, 250); c.font = '800 90px HudSans'; c.fillText('←', 60, 360); }, 300, 400);
    plane(g, 1.2, 1.6, signA, -2, 1.6, -9);
    const gate = texMat((c, w, h) => { c.fillStyle = '#e8892f'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 110px HudSans'; c.textAlign = 'center'; c.fillText('3', w / 2, 100); }, 128, 128);
    plane(g, 0.7, 0.7, gate, 3.2, 3.3, -14);
    for (let i = 0; i < 8; i++) { box(g, 0.5, 0.45, 0.5, 0xe0909a, -6.4, 0.45, -6 - i * 0.6); box(g, 0.1, 0.5, 0.5, 0xe0909a, -6.7, 0.8, -6 - i * 0.6); }
    // flight board
    boardT = canvasTex(1024, 600); box(g, 4.6, 2.8, 0.2, 0x1b1d22, 1.2, 3.0, -16); plane(g, 4.4, 2.6, new THREE.MeshBasicMaterial({ map: boardT.tex }), 1.2, 3.0, -15.89);
    // plane outside
    const pl = new THREE.Group(); pl.position.set(22, 2.5, -30); g.add(pl); cyl(pl, 2, 2, 30, 10, 0xf2f2f2, 0, 0, 0).rotation.x = Math.PI / 2; box(pl, 34, 0.4, 5, 0xe3e3e3, 0, -0.5, 0); box(pl, 0.4, 6, 3, 0x2f6fb5, 0, 3, 13);
    for (let i = 0; i < 14; i++) person(g, -3 + (i % 5) * 1.4, -7 - Math.floor(i / 5) * 2.5, Math.PI + hash(i, 4), { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], seed: 330 + i, bag: i % 3 ? null : 0x2b2b2b });
    const FL = [['KUALA LUMPUR', '12:30'], ['SINGAPURA', '12:45'], ['KOTA KINABALU', '13:10'], ['MIRI', '13:25'], ['SIBU', '13:40'], ['JOHOR BAHRU', '14:05'], ['PULAU PINANG', '14:30']];
    apDalam.update = t => {
      const c = boardT.ctx; c.fillStyle = '#0d1117'; c.fillRect(0, 0, 1024, 600); c.fillStyle = '#f2c94c'; c.font = '700 40px HudSans'; c.fillText('BERLEPAS', 30, 56);
      FL.forEach(([d, m], k) => { const y = 120 + k * 66; const ft = E.batal + k * 0.22; c.fillStyle = k % 2 ? '#141a22' : '#10151c'; c.fillRect(20, y - 44, 984, 60);
        c.fillStyle = '#fff'; c.font = '700 36px HudSans'; c.fillText(d, 30, y); c.fillText(glitchDigits(m, t, 0.5, k), 560, y);
        const on = t >= ft; c.fillStyle = on ? '#ff4a3c' : '#37e07a'; c.fillText(on ? 'BATAL' : 'ATAS JADUAL', 740, y); });
      boardT.tex.needsUpdate = true;
    };
  }

  // ================================================= HOSPITAL: exterior + pharmacy
  const hospLuar = makeSet('hospitalLuar');
  {
    const g = hospLuar.g;
    ground(g, 300, 300, 0x6a9a50, 0, -0.01, -60); ground(g, 12, 80, 0x3d3e43, 0, 0, -30);
    for (const s of [-1, 1]) for (let i = 0; i < 18; i++) box(g, 0.3, 0.25, 2, i % 2 ? 0x111111 : 0xffffff, s * 6, 0.12, -2 - i * 2);
    const main = windowTex(901, 12, 6, '#e3c9c2', '#5a6470');
    box(g, 70, 18, 14, main, 0, 9, -70);
    const roofM = K.mat(0xc8503a);
    const hip = (w, d, h, x, y, z) => { const r = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofM); r.scale.set(w * 0.72, h, d * 0.72); r.rotation.y = Math.PI / 4; r.position.set(x, y + h / 2, z); g.add(r); };
    hip(70, 14, 4, 0, 18, -70); box(g, 10, 24, 10, 0xe8d2cc, 0, 12, -64); hip(11, 11, 4, 0, 24, -64);
    const nameT = texMat((c, w, h) => { c.fillStyle = '#e8d2cc'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a2a5a'; c.font = '800 40px HudSans'; c.textAlign = 'center'; c.fillText('HOSPITAL UMUM SARAWAK', w / 2, h / 2 + 14); }, 600, 90);
    plane(g, 9.5, 1.4, nameT, 0, 21.5, -58.9);
    for (const x of [-32, 32]) { box(g, 8, 22, 8, 0xe3c9c2, x, 11, -66); hip(9, 9, 3, x, 22, -66); }
    box(g, 40, 13, 16, windowTex(902, 10, 4, '#9fb8d8', '#3a4a5a'), 34, 6.5, -55);
    box(g, 50, 7, 20, 0xeadcd8, -40, 3.5, -48); hip(52, 22, 5, -40, 7, -48);
    // gate + guardhouse
    for (const x of [-9, -4.5, 4.5, 9]) box(g, 1.2, 2.6, 1.2, 0xe8c9b8, x, 1.3, -12);
    box(g, 2.0, 2.4, 2.0, 0xf2eee6, 0, 1.2, -14); hip(2.6, 2.6, 1.2, 0, 2.4, -14);
    for (const x of [-6.6, 6.6]) box(g, 3.2, 1.8, 0.08, 0xffffff, x, 0.9, -12);
    // ambulance
    const amb = new THREE.Group(); amb.position.set(-3, 0, -30); amb.rotation.y = 0.3; g.add(amb); box(amb, 2.2, 2.4, 5, 0xf2f2f2, 0, 1.5, 0); box(amb, 2.22, 0.3, 5.02, 0xd8262a, 0, 1.4, 0); const al = glow(amb, 0x4a7aff, 1.8, 0, 2.9, 1.5); amb.userData.al = al;
    for (let i = 0; i < 10; i++) tree(g, -40 + i * 9, -40, 1.6, 0x3f6b35);
    hospLuar.update = t => { amb.userData.al.material.color.setHex(Math.floor(t * 4) % 2 ? 0x4a7aff : 0xff3a3a); };
  }
  const farmasi = makeSet('farmasi'); let labelT, doctor;
  {
    const g = farmasi.g;
    ground(g, 12, 12, tileMat('#e6ece9', '#cdd6d2', [6, 6]), 0, 0, -3);
    plane(g, 12, 4, 0xeaf2ef, 0, 2, -5); const ceil = plane(g, 12, 12, 0xf6f8f7, 0, 3.4, -3); ceil.rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) box(g, 2.4, 0.05, 0.3, new THREE.MeshBasicMaterial({ color: 0xffffff }), -2 + i * 2, 3.35, -2.5);
    // shelves with boxes
    for (let r = 0; r < 4; r++) { box(g, 5, 0.05, 0.4, 0xffffff, 0.5, 0.8 + r * 0.5, -4.8); for (let k = 0; k < 14; k++) box(g, 0.25, 0.3, 0.25, [0xf2f2f2, 0x9fd0e8, 0xf2c94c, 0xe88a8a, 0x9fe0a0][(k + r) % 5], -1.6 + k * 0.3, 0.98 + r * 0.5, -4.75); }
    // counter
    box(g, 4, 1.0, 0.8, 0x2f8f8a, 0.4, 0.5, -1.9); box(g, 4.1, 0.06, 0.9, 0xf2f2f2, 0.4, 1.03, -1.9);
    const sg = texMat((c, w, h) => { c.fillStyle = '#2f8f8a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 70px HudSans'; c.textAlign = 'center'; c.fillText('FARMASI', w / 2, 90); }, 512, 128);
    plane(g, 2.2, 0.55, sg, 0.4, 2.9, -4.95);
    // big medicine bottle on the counter, label facing us
    const bt = new THREE.Group(); bt.position.set(0.0, 1.06, -1.6); g.add(bt);
    cyl(bt, 0.11, 0.11, 0.3, 16, new THREE.MeshLambertMaterial({ color: 0xc8742a, transparent: true, opacity: 0.92 }), 0, 0.15, 0);
    cyl(bt, 0.09, 0.09, 0.08, 16, 0xffffff, 0, 0.34, 0);
    labelT = canvasTex(400, 260);
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.2, 24, 1, true, -0.9, 1.8), new THREE.MeshBasicMaterial({ map: labelT.tex })); lab.position.y = 0.15; lab.rotation.y = 0; bt.add(lab);
    // doctor shrugging
    doctor = person(g, 0.9, -2.7, 0, { shirt: 0xf6f6f6, pants: 0x2c3e66, skin: SKINS[0], seed: 401 });
    box(doctor.g, 0.4, 0.75, 0.24, 0xffffff, 0, 1.0, 0.0);
    farmasi.update = t => {
      const c = labelT.ctx; c.fillStyle = '#ffffff'; c.fillRect(0, 0, 400, 260); c.fillStyle = '#2f8f8a'; c.fillRect(0, 0, 400, 50); c.fillStyle = '#fff'; c.font = '700 28px HudSans'; c.textAlign = 'center'; c.fillText('UBAT', 200, 36);
      const opts = ['2', '20?', '200?', '0.2?', '22?'], v = t < E.duaPuluh ? '2' : opts[Math.floor(hash(frameIndex(t) >> 3, 8) * opts.length)];
      c.fillStyle = '#111'; c.font = '900 72px HudSans'; c.fillText(v + ' BIJI', 200, 140); c.font = '700 42px HudSans'; c.fillText('SEHARI', 200, 200); c.textAlign = 'left'; labelT.tex.needsUpdate = true;
      const sh = t > E.duaPuluh + 1.2 ? Math.abs(Math.sin((t - E.duaPuluh) * 3)) : 0;
      doctor.armL.rotation.z = -sh * 1.2; doctor.armR.rotation.z = sh * 1.2; doctor.head.rotation.z = sh * 0.15;
    };
  }

  // ================================================= RIVER (bridge, night, twist, cta)
  const river = makeSet('river'); let bridgeA, bridgeB, cranes = [], ambLights = [], halfReveal;
  {
    const g = river.g;
    ground(g, 80, 8, brickMat, 0, 0, -0.5);
    const railPanel = texMat((c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#141414'; c.lineWidth = 7; c.strokeRect(4, 4, w - 8, h - 8); for (let i = 0; i < 4; i++) { const cx = 32 + i * 64; c.beginPath(); c.arc(cx, h / 2, 26, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx - 32, 4); c.lineTo(cx + 32, h - 4); c.moveTo(cx + 32, 4); c.lineTo(cx - 32, h - 4); c.stroke(); } }, 256, 80, { transparent: true, alphaTest: 0.4 });
    railPanel.side = THREE.DoubleSide;
    for (let x = -40; x < 40; x += 2) { box(g, 0.08, 1.1, 0.08, 0x151515, x, 0.55, -4.3); plane(g, 1.92, 0.62, railPanel, x + 1, 0.55, -4.3); }
    box(g, 80, 0.06, 0.08, 0x151515, 0, 1.05, -4.3); box(g, 80, 1.6, 0.3, 0x6f6a63, 0, -0.8, -4.5);
    const wgeo = new THREE.PlaneGeometry(400, 160, 40, 20); wgeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wgeo, new THREE.MeshLambertMaterial({ color: 0x6b6a52, flatShading: true })); water.position.set(0, -1.2, -84); g.add(water); river.water = water; river.wgeo = wgeo; river.wBase = wgeo.attributes.position.array.slice();
    box(g, 400, 2.4, 3, 0x8a8a84, 0, -0.2, -162); const slope = box(g, 400, 1, 40, 0x5d9a45, 0, 4, -180); slope.rotation.x = 0.22; ground(g, 600, 300, 0x4f8a3e, 0, 8.2, -380);
    for (let i = 0; i < 24; i++) { const x = -160 + i * 14 + rand() * 6; if (Math.abs(x + 40) < 45) continue; tree(g, x, -235 - rand() * 40, 3 + rand() * 2, [0x3f6b35, 0x4d7d3c, 0x355e2e][i % 3]); }
    dunBuilding(g, -30, 8, -205, 0.85);
    // city across (right)
    for (let i = 0; i < 16; i++) box(g, 14, 20 + hash(i, 1) * 60, 14, windowTex(700 + i, 4, 10, ['#d9d4cc', '#c9c3ba', '#e8e2d8'][i % 3], '#4a5260', 0.5), 40 + i * 16, 10 + hash(i, 1) * 30, -320 - hash(i, 2) * 60);
    // new S-bridge, two halves that miss
    const deckMat = new THREE.MeshLambertMaterial({ color: 0xf6f6f0, emissive: 0x555550 });
    const half = (pts, yOff, xOff) => {
      const grp = new THREE.Group(); g.add(grp); const segs = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b);
        const s = box(grp, 4.2, 1.1, len + 0.1, deckMat, mid.x + xOff, mid.y + yOff, mid.z); s.lookAt(new THREE.Vector3(b.x + xOff, b.y + yOff, b.z)); segs.push(s);
      }
      grp.userData.segs = segs; return grp;
    };
    // two halves crossing the river in front of us (S-wiggle), meant to meet at x≈0 — but they miss
    const mk = (x0, x1, zc, y) => Array.from({ length: 25 }, (_, i) => { const u = i / 24, x = lerp(x0, x1, u); return new THREE.Vector3(x, y + Math.sin(u * Math.PI) * 1.5, zc + Math.sin(x * 0.07) * 10); });
    bridgeA = half(mk(-70, -1.5, -48, 14), 0, 0);
    bridgeB = half(mk(70, 1.5, -48, 14).map(v => v.add(new THREE.Vector3(0, 0, -9))), 4.5, 0);
    // workers staring at each other across the gap
    const tipA = mk(-70, -1.5, -48, 14).at(-1), tipB = mk(70, 1.5, -48, 14).at(-1).add(new THREE.Vector3(0, 4.5, -9));
    person(g, tipA.x - 1.2, tipA.z, Math.PI / 2, { shirt: 0xf07a1a, y: tipA.y + 0.55, seed: 610 }).g.scale.setScalar(1.6);
    person(g, tipB.x + 1.2, tipB.z, -Math.PI / 2, { shirt: 0xf07a1a, y: tipB.y + 0.55, seed: 611 }).g.scale.setScalar(1.6);
    const pylon = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); for (const sd of [-1, 1]) { const l = box(p, 0.8, 26, 0.8, 0xf6f6f2, sd * 3, 12, 0); l.rotation.z = sd * -0.12; } cyl(p, 6, 6, 0.6, 20, 0xf2f2ee, 0, 1, 0); const r = pleatedCone(6.5, 1.5, 10, 0xe8c040, 0.05, 0.95); r.position.y = 2.2; p.add(r); return p; };
    pylon(-32, -1, -48 + Math.sin(-32 * 0.07) * 10).scale.y = 1.4; pylon(32, -1, -57 + Math.sin(32 * 0.07) * 10).scale.y = 1.4;
    const crane = (x, z) => { const c = new THREE.Group(); c.position.set(x, -1, z); g.add(c); box(c, 1.2, 30, 1.2, 0xf2c94c, 0, 15, 0); const jib = box(c, 24, 1, 1, 0xf2c94c, 8, 30, 0); box(c, 0.05, 10, 0.05, 0x222222, 18, 25, 0); return { c, jib }; };
    cranes = [crane(-12, -40), crane(14, -64)];
    for (let i = 0; i < 4; i++) { const a = glow(g, i % 2 ? 0xff3a3a : 0x4a7aff, 6, 30 + i * 18, 10, -170); ambLights.push(a); }
    // phone light for twist
    river.update = (t, mode) => {
      const p = river.wgeo.attributes.position.array, wb = river.wBase;
      for (let i = 0; i < p.length; i += 3) p[i + 1] = wb[i + 1] + Math.sin(wb[i] * 0.08 + t * 1.3) * 0.18 + Math.cos(wb[i + 2] * 0.11 + t * 0.9) * 0.15;
      river.wgeo.attributes.position.needsUpdate = true; river.wgeo.computeVertexNormals();
      const night = mode !== 'day'; water.material.color.setHex(night ? 0x141c2c : 0x8a6a42);
      // bridge build-out: segments appear from both ends toward the middle
      const prog = mode === 'day' ? smooth(E.bina - 0.5, E.takJumpa + 0.2, t) : 1;
      bridgeA.userData.segs.forEach((s, i, arr) => s.visible = i / arr.length <= prog);
      bridgeB.userData.segs.forEach((s, i, arr) => s.visible = (arr.length - 1 - i) / arr.length <= prog);
      cranes.forEach((c, i) => { c.jib.rotation.y = Math.sin(t * 0.4 + i) * 0.3; c.c.visible = true; });
      for (const [i, a] of ambLights.entries()) { a.visible = mode === 'gelap'; a.position.x = 30 + i * 18 + Math.sin(t * 0.7 + i) * 10; a.material.opacity = Math.floor(t * 4 + i) % 2 ? 1 : 0.2; }
    };
  }

  // ================================================= CONTROL ROOM (loji)
  const loji = makeSet('loji'); let gaugeTs = [], screenTs = [], roomLights = [];
  {
    const g = loji.g;
    ground(g, 12, 12, tileMat('#9aa0a6', '#7d838a', [6, 6]), 0, 0, -3);
    plane(g, 12, 4, 0xc9cdd2, 0, 2, -5); const ceil = plane(g, 12, 12, 0xe0e3e6, 0, 3.4, -3); ceil.rotation.x = Math.PI / 2;
    const win = texMat((c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a2850'); gr.addColorStop(1, '#ff6a3a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1418'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(40 + i * 70, h - 30, 30, 18, 0, Math.PI, 0); c.fill(); c.fillRect(10 + i * 70, h - 30, 60, 30); } c.fillRect(220, 40, 16, h); c.fillRect(244, 70, 12, h); }, 256, 160, { basic: true });
    plane(g, 3.4, 1.4, win, -2.6, 2.3, -4.95);
    for (let i = 0; i < 6; i++) { const T = canvasTex(128, 128); gaugeTs.push(T); plane(g, 0.45, 0.45, new THREE.MeshBasicMaterial({ map: T.tex }), 0.4 + (i % 3) * 0.6, 2.5 - Math.floor(i / 3) * 0.6, -4.94); }
    for (let i = 0; i < 2; i++) { const T = canvasTex(512, 256); screenTs.push(T); box(g, 1.3, 0.75, 0.1, 0x111111, 2.4 + i * 0.0, 2.6 - i * 0.9, -4.9); plane(g, 1.2, 0.66, new THREE.MeshBasicMaterial({ map: T.tex }), 2.4, 2.6 - i * 0.9, -4.84); }
    box(g, 6, 0.9, 1.0, 0x5a6470, 0.4, 0.45, -2.6); box(g, 6, 0.1, 1.1, 0x3a4048, 0.4, 0.92, -2.6);
    for (let k = 0; k < 20; k++) box(g, 0.08, 0.04, 0.08, [0xff3a3a, 0x37e07a, 0xf2c94c][k % 3], -2 + k * 0.25, 0.97, -2.5);
    for (let i = 0; i < 3; i++) { const l = box(g, 2.4, 0.05, 0.3, new THREE.MeshBasicMaterial({ color: 0xffffff }), -2 + i * 2.2, 3.35, -2.5); roomLights.push(l); }
    const pl = new THREE.PointLight(0xffffff, 1.4, 10, 1); pl.position.set(0, 3, -2); g.add(pl); loji.pl = pl;
    person(g, -0.6, -1.6, Math.PI, { shirt: 0x2b6cb0, skin: SKINS[3], seed: 500 }); person(g, 1.4, -1.8, Math.PI + 0.3, { shirt: 0x2b6cb0, skin: SKINS[1], seed: 501 });
    loji.update = t => {
      gaugeTs.forEach((T, i) => { const c = T.ctx; c.fillStyle = '#f2f2f2'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 4; c.stroke(); c.fillStyle = '#c0392b'; c.fillRect(64, 6, 4, 14);
        const a = t > E.klorin ? t * (6 + i * 3) + i : -1 + Math.sin(t + i) * 0.2; c.save(); c.translate(64, 64); c.rotate(a); c.fillStyle = '#c0392b'; c.fillRect(-2, -50, 4, 54); c.restore(); T.tex.needsUpdate = true; });
      screenTs.forEach((T, i) => { const c = T.ctx; c.fillStyle = '#04140a'; c.fillRect(0, 0, 512, 256); c.fillStyle = i ? '#ffcf4a' : '#7dff8a'; c.font = '700 54px HudSans';
        const lab = i ? 'VOLTAN' : 'KLORIN', at = i ? E.voltan : E.klorin, unit = i ? 'kV' : 'mg/L';
        c.fillText(lab, 24, 80); c.font = '800 80px HudSans'; c.fillText((t < at ? (i ? '33.0' : '0.5') : '???') + ' ' + unit, 24, 190); T.tex.needsUpdate = true; });
      const on = flicker(t, E.padam, 4); roomLights.forEach(l => l.material.color.setHex(on ? 0xffffff : 0x222222)); loji.pl.intensity = on ? 1.4 : 0;
    };
  }

  // ------------------------------------------------ per-scene look
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const LOOK = {
    rumah: { set: 'rumah', pos: [V(-0.3, 1.35, 1.2), V(-0.2, 1.3, 0.8)], look: [V(0.6, 1.1, -3), V(0.7, 1.0, -3)], time: '7:00 PAGI', loc: 'RUMAH', sky: [0x6aa8e0, 0xf6d6a8], fog: [0xf6e6d0, 20, 60], hemi: [0xfff2dc, 0x6a5040, 1.2], sun: [0xffe2b0, 1.0, V(20, 30, 10)], level: 0 },
    laksa: { set: 'laksa', pos: [V(0.1, 1.55, -0.6), V(0.1, 1.5, -0.8)], look: [V(0.05, 1.15, -2.4), V(0.05, 1.12, -2.4)], time: '7:30 PAGI', loc: 'GERAI LAKSA', sky: [0x8fb8e0, 0xf2e2c8], fog: [0xc9bfae, 12, 90], hemi: [0xf6ead8, 0x4a3a2a, 1.2], sun: [0xffe8c8, 0.8, V(-40, 50, 30)], level: 0 },
    satok: { set: 'satok', pos: [V(1, 1.65, 2), V(0.6, 1.65, 0)], look: [V(0, 6.5, -16), V(0, 6.3, -16)], time: '9:00 PAGI', loc: 'MEDAN NIAGA SATOK', sky: [0x4a8fd8, 0xd8ecf8], fog: [0xdfe8ef, 60, 600], hemi: [0xffffff, 0x666666, 1.3], sun: [0xfff2dc, 1.5, V(40, 80, 60)], level: 0 },
    terubuk: { set: 'terubuk', pos: [V(-0.7, 1.75, 1.3), V(-0.6, 1.7, 0.9)], look: [V(0.2, 0.9, -3.0), V(0.1, 0.9, -2.8)], time: '9:00 PAGI', loc: 'MEDAN NIAGA SATOK', sky: [0x8fb8e0, 0xf2e2c8], fog: [0xd8d0c4, 15, 80], hemi: [0xffffff, 0x555555, 1.2], sun: [0xfff2dc, 0.8, V(20, 50, 30)], level: 0 },
    atm: { set: 'atm', pos: [V(-0.6, 1.65, 1.2), V(-0.3, 1.65, 0.2)], look: [V(1.6, 3.0, -15), V(2.6, 2.4, -10)], time: '10:00 PAGI', loc: 'TUGU KUCING', sky: [0x5a9be0, 0xdcecf7], fog: [0xd6e2ea, 60, 500], hemi: [0xffffff, 0x666666, 1.3], sun: [0xfff2dc, 1.4, V(40, 80, 40)], level: 1 },
    jalan: { set: 'jalan', pos: [V(-4.2, 1.65, 0.5), V(-3.5, 1.65, -2)], look: [V(-2.0, 1.9, -6), V(-1, 1.6, -10)], time: '11:00 PAGI', loc: 'JALAN RAYA', sky: [0x3f86d6, 0xd6eaf7], fog: [0xd6e6f2, 80, 900], hemi: [0xffffff, 0x777777, 1.35], sun: [0xfff6e0, 1.7, V(30, 120, 40)], level: 1 },
    airportLuar: { set: 'airportLuar', pos: [V(-8, 1.7, 6), V(-6, 1.7, 4)], look: [V(-2, 10, -32), V(2, 10, -32)], time: '12:00 T/HARI', loc: 'LAPANGAN TERBANG', sky: [0x3f86d6, 0xd6eaf7], fog: [0xd6e6f2, 120, 1500], hemi: [0xffffff, 0x777777, 1.4], sun: [0xfffaf0, 1.8, V(0, 140, 40)], level: 2 },
    airportDalam: { set: 'airportDalam', pos: [V(-0.5, 1.65, 0), V(-0.3, 1.65, -3)], look: [V(1.0, 2.6, -16), V(1.2, 2.9, -16)], time: '12:00 T/HARI', loc: 'LAPANGAN TERBANG', sky: [0x3f86d6, 0xd6eaf7], fog: [0xe8dccb, 20, 120], hemi: [0xffe8c8, 0x6a5040, 1.2], sun: [0xffe8c0, 0.6, V(20, 40, 20)], level: 2 },
    hospitalLuar: { set: 'hospitalLuar', pos: [V(0, 1.65, 4), V(0, 1.65, 1)], look: [V(0, 10, -60), V(0, 11, -60)], time: '2:00 PETANG', loc: 'HOSPITAL', sky: [0x6aa0dc, 0xe0ecf4], fog: [0xe0ecf4, 120, 1200], hemi: [0xffffff, 0x777777, 1.35], sun: [0xfff2dc, 1.5, V(-40, 100, 60)], level: 2 },
    farmasi: { set: 'farmasi', pos: [V(-0.1, 1.5, -0.4), V(-0.05, 1.45, -0.7)], look: [V(0.0, 1.2, -1.6), V(0.0, 1.2, -1.6)], time: '2:00 PETANG', loc: 'HOSPITAL', sky: [0x6aa0dc, 0xe0ecf4], fog: [0xe6ece9, 15, 60], hemi: [0xffffff, 0x8a9a96, 1.3], sun: [0xffffff, 0.5, V(10, 40, 20)], level: 2 },
    jambatan: { set: 'river', mode: 'day', pos: [V(-1, 1.65, 0.5), V(-0.5, 1.65, -0.8)], look: [V(-1, 14, -50), V(0, 14.5, -52)], time: '4:00 PETANG', loc: 'WATERFRONT', sky: [0x5a7ab8, 0xf2b07a], fog: [0xe8c0a0, 150, 1500], hemi: [0xfff0dc, 0x6a6a55, 1.2], sun: [0xffc890, 1.4, V(-80, 50, -60)], level: 2, glow: [0xff9a5a, 0.5] },
    loji: { set: 'loji', pos: [V(-0.3, 1.65, 1.6), V(-0.2, 1.65, 1.0)], look: [V(0.6, 2.1, -5), V(0.8, 2.0, -5)], time: '6:00 PETANG', loc: 'LOJI AIR & JANAKUASA', sky: [0x3a2850, 0xff6a3a], fog: [0x6a5a6a, 15, 60], hemi: [0xffd8c0, 0x2a2a3a, 0.9], sun: [0xff8a50, 0.6, V(-30, 20, -40)], level: 3 },
    gelap: { set: 'river', mode: 'gelap', pos: [V(-4, 1.65, 0.8), V(-4, 1.65, 0.2)], look: [V(-10, 6, -80), V(0, 6, -90)], time: '9:00 MALAM', loc: 'SELURUH KUCHING', sky: [0x05070f, 0x141a30], fog: [0x0c1020, 60, 700], hemi: [0x3a4468, 0x0a0a10, 0.45], sun: [0x8fa2d0, 0.35, V(-60, 80, -40)], level: 3, stars: 1 },
    twist: { set: 'river', mode: 'night', pos: [V(-4, 1.65, 0.2), V(-4, 1.7, 0.0)], look: [V(0, 10, -90), V(0, 30, -90)], time: '', loc: '', sky: [0x05070f, 0x1a1a3a], fog: [0x0c1020, 60, 700], hemi: [0x3a4468, 0x0a0a10, 0.35], sun: [0x8fa2d0, 0.3, V(-60, 80, -40)], level: 3, stars: 1 },
    cta: { set: 'river', mode: 'night', pos: [V(-4, 1.7, 0.0), V(-4, 1.7, -0.1)], look: [V(0, 30, -90), V(0, 32, -90)], time: '', loc: '', sky: [0x05070f, 0x1a1a3a], fog: [0x0c1020, 60, 700], hemi: [0x3a4468, 0x0a0a10, 0.35], sun: [0x8fa2d0, 0.3, V(-60, 80, -40)], level: 3, stars: 1 },
  };

  // ------------------------------------------------ HUD: error counter
  const COUNT = [[0, 0], [SC.laksa.start, 12], [SC.satok.start, 480], [SC.atm.start, 3600], [SC.jalan.start, 9300], [SC.airportLuar.start, 21000], [SC.hospitalLuar.start, 48000], [SC.jambatan.start, 120000], [SC.loji.start, 640000], [SC.gelap.start, 2000000]];
  const COLORS = ['', '#ffd84a', '#ff9a4a', '#ff5a4a'];
  function hud(t) {
    if (t >= SC.twist.start + 1.5) return null;
    const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
    const L = LOOK[sc.id];
    let v = 0; for (let i = 0; i < COUNT.length; i++) if (t >= COUNT[i][0]) { const next = COUNT[i + 1]; const k = next ? smooth(COUNT[i][0], COUNT[i][0] + 1.2, t) : 1; v = Math.round(lerp(i ? COUNT[i - 1][1] : 0, COUNT[i][1], k)); }
    if (sc.id === 'gelap') v = 2000000 + Math.floor((t - sc.start) * 37511);
    let value = v.toLocaleString('en-US') + (sc.id === 'gelap' ? '+' : '');
    const flash = L.level === 3 && Math.floor(t * 3) % 2;
    let time = L.time; if (hash(frameIndex(t) >> 2, 11) < 0.12 + L.level * 0.06) time = glitchDigits(time, t, 0.7, 2);
    return { label: 'KESILAPAN KIRAAN DI KUCHING', value, stat: `${time} · ${L.loc}`, color: COLORS[L.level] || '', opacity: flash ? 0.75 : (t > SC.twist.start ? 1 - smooth(SC.twist.start, SC.twist.start + 1.5, t) : 1), pop: 1 + 0.15 * (1 - smooth(sc.start, sc.start + 0.4, t)) * (sc.start > 0 ? 1 : 0) };
  }

  // ------------------------------------------------ update
  const shakes = [E.pulang + 0.3, E.mahal, E.tutup, E.lumpuh, E.batal, E.duaPuluh, E.takJumpa, E.padam];
  function update(t) {
    const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
    const L = LOOK[sc.id];
    for (const k in sets) sets[k].g.visible = k === L.set;
    const u = smooth(sc.start, sc.end, t);
    const pos = L.pos[0].clone().lerp(L.pos[1], u), look = L.look[0].clone().lerp(L.look[1], u);
    let sx = 0, sy = 0;
    for (const e of shakes) { const d = t - e; if (d >= 0 && d < 0.9) { const a = 0.03 * Math.exp(-d * 5) * (1 + L.level * 0.4); sx += Math.sin(d * 57) * a; sy += Math.cos(d * 49) * a; } }
    pos.x += Math.sin(t * 0.6) * 0.008 + sx; pos.y += Math.sin(t * 1.1) * 0.006 + sy;
    camera.position.copy(pos); camera.lookAt(look.x + sx * 6, look.y + sy * 6, look.z);
    skyU.top.value.setHex(L.sky[0]); skyU.horizon.value.setHex(L.sky[1]); skyU.glowCol.value.setHex(L.glow ? L.glow[0] : 0); skyU.glow.value = L.glow ? L.glow[1] : 0;
    scene.fog.color.setHex(L.fog[0]); scene.fog.near = L.fog[1]; scene.fog.far = L.fog[2];
    hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sun.position.copy(pos).add(L.sun[2]); sun.target.position.copy(pos);
    stars.material.opacity = L.stars ? (sc.id === 'twist' || sc.id === 'cta' ? 1 : 0.7) : 0;
    clouds.visible = !L.stars && !['rumah', 'laksa', 'terubuk', 'farmasi', 'loji', 'airportDalam'].includes(sc.id);
    cloudMat.color.setHex(sc.id === 'jambatan' ? 0xffc8a0 : 0xffffff);
    rig.position.set(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.004, 0);
    handR.visible = false;
    drawPhone(t, sc.id);
    phoneGlow.material.opacity = ['twist', 'cta', 'gelap'].includes(sc.id) ? 0.6 : 0;
    if (L.set === 'river') river.update(t, L.mode); else sets[L.set].update(t);
    animatePeople(t);
  }

  // ------------------------------------------------ 2D effects
  function drawFx(g, t, w, h) {
    // icons during the lesson
    if (t >= SC.twist.start && t < SC.cta.start + 0.5) {
      const icons = [[E.laksaIcon, '🍜'], [E.jambatanIcon, '🌉'], [E.airIcon, '💧'], [E.nyawaIcon, '❤️']];
      g.font = '110px "Noto Color Emoji"'; g.textAlign = 'center';
      icons.forEach(([at, em], i) => { const k = easeOut(clamp((t - at) / 0.4)); if (k <= 0) return; g.globalAlpha = k * (1 - smooth(SC.cta.start - 0.3, SC.cta.start + 0.4, t)); g.fillText(em, w / 2 + (i - 1.5) * 200, 980 - (1 - k) * 40); });
      g.globalAlpha = 1; g.textAlign = 'left';
    }
    // red alarm vignette in the last disaster scenes
    const L = LOOK[(script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1)).id];
    if (L.level === 3 && t < SC.twist.start) { const a = 0.18 + 0.12 * Math.sin(t * 6); const gr = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, `rgba(200,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  }
  const cuts = script.scenes.slice(1).map(s => s.start).filter(x => x !== SC.cta.start);
  function flash(t) { let v = 0; for (const c of cuts) { const d = t - c; if (d > -0.12 && d < 0.35) v = Math.max(v, d < 0 ? (d + 0.12) / 0.12 : 1 - d / 0.35); } return v * 0.8; }
  function grade(t) { const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1); const lv = LOOK[sc.id].level; return `saturate(${[1.08, 1.0, 0.95, 0.9][lv]}) contrast(${1.04 + lv * 0.02})`; }

  update(0);
  return { scene, camera, update, drawFx, flash, grade, hud };
}
