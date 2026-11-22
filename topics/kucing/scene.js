// "Apa jadi kalau semua rumah di Kuching bela seekor kucing?" — cheerful, cats everywhere, maths on a yellow note card.
import { kit } from '/engine/lib3d.js';

export async function create({ THREE, renderer, script, U }) {
  const { clamp, lerp, smooth, easeOut, hash, mulberry32, frameIndex } = U;
  const K = kit(THREE, U);
  const { box, cyl, sphere, plane, ground, canvasTex, texMat, glow, windowTex, person, animatePeople, SHIRTS, SKINS } = K;
  const E = script.events, W = script.width, H = script.height;
  const SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
  const rand = mulberry32(162802);
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

  // ------------------------------------------------ hands + phone (safe zone)
  const rig = new THREE.Group(); camera.add(rig);
  const skin = 0xc68a5f, sleeve = 0xe8a040;
  const handL = new THREE.Group(); handL.position.set(-0.085, -0.17, -0.46); handL.rotation.set(0.3, 0.22, 0.1); rig.add(handL);
  box(handL, 0.11, 0.42, 0.1, sleeve, -0.02, -0.33, 0.02).rotation.x = -0.15;
  box(handL, 0.09, 0.11, 0.04, skin, 0, -0.07, -0.012);
  box(handL, 0.025, 0.07, 0.03, skin, 0.055, -0.02, 0.005).rotation.z = -0.5;
  box(handL, 0.078, 0.158, 0.009, 0x16181c, 0, 0.02, 0.012);
  for (let k = 0; k < 3; k++) box(handL, 0.016, 0.022, 0.02, skin, -0.044, -0.02 + k * 0.026, 0.0);
  const phoneT = canvasTex(256, 540);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), new THREE.MeshBasicMaterial({ map: phoneT.tex })); phoneScreen.position.set(0, 0.02, 0.0172); handL.add(phoneScreen);
  const handR = new THREE.Group(); rig.add(handR); handR.visible = false;
  box(handR, 0.12, 0.45, 0.11, sleeve, 0, -0.26, 0.05).rotation.x = -0.4; box(handR, 0.1, 0.05, 0.12, skin, 0, 0.0, -0.04);
  for (let k = 0; k < 4; k++) box(handR, 0.02, 0.02, 0.07, skin, -0.035 + k * 0.023, -0.01, -0.12);

  const catFace = (g, x, y, s, col = '#f08a2a') => { g.fillStyle = col; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * s * 0.9, y - s * 0.3); g.lineTo(x + d * s * 0.6, y - s * 1.3); g.lineTo(x + d * s * 0.15, y - s * 0.75); g.fill(); } g.fillStyle = '#2a7a3a'; for (const d of [-1, 1]) { g.beginPath(); g.arc(x + d * s * 0.38, y - s * 0.1, s * 0.16, 0, 7); g.fill(); } g.fillStyle = '#e87a8a'; g.beginPath(); g.arc(x, y + s * 0.2, s * 0.1, 0, 7); g.fill(); };
  function drawPhone(t, id) {
    const g = phoneT.ctx, w = 256, h = 540; g.textAlign = 'center';
    g.fillStyle = '#fff7ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff9a3a'; g.fillRect(0, 0, w, 110); g.fillStyle = '#fff'; g.font = '800 22px HudSans';
    if (id === 'hook' || id === 'pengajaran' || id === 'cta') {
      g.fillText('KUCING SAYA', 128, 74); catFace(g, 128, 230, 70); g.fillStyle = '#3a2a1a'; g.font = '800 26px HudSans'; g.fillText('Si Oren 🐾', 128, 350); g.font = '600 16px HudSans'; g.fillStyle = '#6b5a4a'; g.fillText('Makan hari ini: 60 g ✓', 128, 384);
      if (id === 'hook' && t > E.baharu) { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(12, 410, 232, 64, 14); g.fill(); g.fillStyle = '#ff7a2a'; g.font = '800 15px HudSans'; g.fillText('🐾 Ada kucing di', 128, 436); g.fillText('depan pintu anda!', 128, 458); }
      if (id === 'pengajaran' && t > E.mandul) { g.fillStyle = '#0f7a55'; g.font = '800 18px HudSans'; g.fillText('✚ Temujanji vet: Mandul', 128, 440); }
    } else if (id === 'taman') { g.fillText('BAHAGIAN KUCHING', 128, 74); g.fillStyle = '#3a2a1a'; g.font = '700 18px HudSans'; g.fillText('Isi rumah (Banci 2020)', 128, 170); g.font = '900 40px HudSans'; g.fillText('162,802', 128, 222); g.font = '700 18px HudSans'; g.fillText('Kucing', 128, 300); g.font = '900 40px HudSans'; g.fillStyle = '#ff7a2a'; g.fillText(t > E.jumlah1 ? '162,802' : '…', 128, 352); }
    else if (id === 'makanan' || id === 'kos') { g.fillText('RESIT KEDAI HAIWAN', 128, 74); g.textAlign = 'left'; g.fillStyle = '#3a2a1a'; g.font = '600 15px HudSans';
      const rows = id === 'makanan' ? [['Makanan 60 g', 'x162,802'], ['Jumlah', '9,768 kg'], ['Beg 10 kg', '~1,000']] : [['RM15/kg × 60 g', 'RM0.90'], ['× 162,802', 'RM146,522'], ['× 30 hari', 'RM4.4 juta']];
      rows.forEach(([a, b], k) => { g.fillText(a, 18, 160 + k * 46); g.textAlign = 'right'; g.font = '800 16px HudSans'; g.fillText(b, 238, 160 + k * 46); g.textAlign = 'left'; g.font = '600 15px HudSans'; g.fillStyle = '#d8c8b0'; g.fillRect(18, 172 + k * 46, 220, 1); g.fillStyle = '#3a2a1a'; }); }
    else { g.fillText('KALKULATOR', 128, 74); g.fillStyle = '#3a2a1a'; g.font = '700 22px HudSans'; g.fillText('× 162,802', 128, 200); g.font = '900 36px HudSans'; g.fillStyle = '#ff7a2a'; g.fillText({ najis: '6.5 tan', anak: '227,923', setahun: 'RM53 juta' }[id] || '', 128, 260); }
    g.textAlign = 'left'; phoneT.tex.needsUpdate = true;
  }

  // ------------------------------------------------ helpers + cat model
  const sets = {};
  const makeSet = name => { const g = new THREE.Group(); g.visible = false; scene.add(g); sets[name] = { g, update: () => {} }; return sets[name]; };
  const tileMat = (a, b, rep) => texMat((c, w, h) => { c.fillStyle = a; c.fillRect(0, 0, w, h); c.strokeStyle = b; c.lineWidth = 4; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } }, 256, 256, { repeat: rep });
  const pat = (base, stripe, patch) => texMat((c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); if (stripe) { c.fillStyle = stripe; for (let i = 0; i < 9; i++) c.fillRect(i * w / 9, 0, w / 22, h); } if (patch) { c.fillStyle = patch; c.beginPath(); c.ellipse(w * .3, h * .5, w * .18, h * .3, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(w * .75, h * .4, w * .14, h * .22, 0, 0, 7); c.fill(); } }, 128, 64);
  const PATS = [pat('#f08a2a', '#b85a10'), pat('#f4f2ec'), pat('#f4f2ec', null, '#1e1e1e'), pat('#8a8e94', '#5a5e64'), pat('#f4f2ec', null, '#e8892f')];
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x5fd07a }), noseM = K.mat(0xe7a0a0);
  const cats = [];
  function cat(parent, x, z, ry, p = 0, s = 1, o = {}) {
    const c = new THREE.Group(); c.position.set(x, o.y || 0, z); c.rotation.y = ry; c.scale.setScalar(s * 0.45); parent.add(c);
    const m = PATS[p % PATS.length];
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), m); body.scale.set(0.8, 0.75, 1.15); body.position.y = 0.5; c.add(body);
    const head = new THREE.Group(); head.position.set(0, 0.95, 0.45); c.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), m));
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 4), m); e.position.set(sx * 0.2, 0.32, 0); head.add(e); const ey = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), eyeM); ey.position.set(sx * 0.13, 0.05, 0.31); head.add(ey); }
    box(head, 0.08, 0.06, 0.06, noseM, 0, -0.06, 0.34);
    for (const sx of [-0.2, 0.2]) for (const sz of [-0.3, 0.3]) box(c, 0.14, 0.32, 0.14, m, sx, 0.16, sz);
    const tail = new THREE.Group(); tail.position.set(0, 0.6, -0.55); c.add(tail); const tl = box(tail, 0.09, 0.8, 0.09, m, 0, 0.35, 0); tail.rotation.x = -0.5;
    const o2 = { c, head, tail, seed: cats.length, walk: o.walk, base: new THREE.Vector3(x, o.y || 0, z), ry, appear: o.appear ?? -1, hop: o.hop || 0 };
    cats.push(o2); return o2;
  }
  function animateCats(t) {
    for (const k of cats) { if (!k.c.parent.visible) continue; const s = k.seed;
      k.c.visible = t >= k.appear; if (!k.c.visible) continue;
      const pop = k.appear > 0 ? easeOut(clamp((t - k.appear) / 0.35)) : 1;
      k.tail.rotation.z = Math.sin(t * 3 + s) * 0.5; k.head.rotation.y = Math.sin(t * 0.9 + s) * 0.4; k.head.rotation.z = Math.sin(t * 0.6 + s * 2) * 0.12;
      let y = k.base.y; if (k.walk) { const { dir, speed, span } = k.walk; const d = ((t * speed + s * 2.3) % span) - span / 2; k.c.position.x = k.base.x + dir.x * d; k.c.position.z = k.base.z + dir.z * d; y += Math.abs(Math.sin(t * speed * 5 + s)) * 0.06; }
      if (k.hop) y += Math.abs(Math.sin(t * 3 + s)) * k.hop;
      k.c.position.y = y; k.c.scale.setScalar(k.c.userData.s0 * Math.max(0.001, pop)); }
  }
  const _cat = cat; // record base scale
  function catS(...a) { const k = _cat(...a); k.c.userData.s0 = k.c.scale.x; return k; }
  function terrace(parent, x, z, ry, col, roof, k) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
    box(g, 5.8, 3.2, 8, col, 0, 1.6, 0); box(g, 5.8, 3, 7.8, col, 0, 4.7, -0.2);
    const r = box(g, 6.2, 0.3, 5, roof, 0, 6.6, 1.6); r.rotation.x = -0.45; const r2 = box(g, 6.2, 0.3, 5, roof, 0, 6.6, -2.2); r2.rotation.x = 0.45;
    box(g, 1.1, 2.1, 0.1, 0x6a4a2a, -1.4, 1.05, 4.02); box(g, 2.2, 1.2, 0.1, BM(0x9fc8e8), 1.2, 1.8, 4.02); box(g, 2.6, 1.2, 0.1, BM(0x9fc8e8), 0, 4.8, 3.82);
    box(g, 5.8, 0.9, 0.1, 0xf2f2f2, 0, 0.45, 6.5); for (let i = 0; i < 6; i++) box(g, 0.06, 0.9, 0.06, 0x333333, -2.6 + i, 0.45, 6.5);
    ground(g, 5.8, 2.5, 0xc0b8a8, 0, 0.02, 5.2);
    const door = box(g, 1.1, 2.1, 0.08, 0x8a5a3a, -1.4, 1.05, 4.06); door.geometry.translate(0.55, 0, 0); door.position.x = -1.95; g.userData.door = door;
    return g;
  }
  function pleatedCone(R, Hh, n, color, droop = 0.12, inner = 0.8) {
    const pos = [], ring = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, out = i % 2 === 0; ring.push([Math.cos(a) * R * (out ? 1 : inner), out ? 0 : Hh * droop, Math.sin(a) * R * (out ? 1 : inner)]); }
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; pos.push(...a, 0, Hh, 0, ...b); pos.push(...b, 0, Hh * droop * 0.6, 0, ...a); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide }));
  }
  const WALLS = [0xf6e6c8, 0xe8d8f0, 0xd8ecd8, 0xf8d8c8, 0xd8e4f4, 0xfff2b8], ROOFS = [0xc0502a, 0x2b6cb0, 0x8a3a3a, 0x3a7a5a];

  // ================================================= TUGU KUCING (hook, pengajaran, cta)
  const tugu = makeSet('tugu'); let liveCat, statueSmall;
  {
    const g = tugu.g;
    ground(g, 200, 200, 0x55565c, 0, 0, -40);
    for (let i = -10; i < 10; i++) box(g, 3, 0.02, 0.2, 0xe8e2d0, i * 7, 0.02, -4);
    const C = new THREE.Vector3(0, 0, -15);
    cyl(g, 5.2, 5.4, 0.7, 20, 0x9c8a7a, C.x, 0.35, C.z); cyl(g, 4.8, 4.8, 0.05, 20, new THREE.MeshLambertMaterial({ color: 0x5f8aa0 }), C.x, 0.68, C.z);
    for (let i = 0; i < 9; i++) { const r = sphere(g, 1.0 + rand() * 0.8, [0x7a3f30, 0x8a4a38, 0x6a3428][i % 3], C.x + (rand() - 0.5) * 4, 0.9 + rand() * 0.8, C.z + (rand() - 0.5) * 3, 0); r.scale.y = 0.7; }
    const statue = (x, y, z, s, ry, m, tall) => { const c = new THREE.Group(); c.position.set(x, y, z); c.scale.setScalar(s); c.rotation.y = ry; g.add(c);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), m); body.scale.set(0.8, tall ? 1.7 : 1.1, 0.8); body.position.y = tall ? 0.85 : 0.55; c.add(body);
      const hy = tall ? 1.85 : 1.15; const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), m); head.position.set(0, hy, 0.12); c.add(head);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 4), m); e.position.set(sx * 0.2, hy + 0.32, 0.1); c.add(e); sphere(c, 0.05, 0x3a8a5a, sx * 0.13, hy + 0.05, 0.43); }
      return c; };
    statue(0.6, 1.9, C.z - 0.6, 2.4, 0.1, PATS[0], true); statue(-1.4, 1.8, C.z - 0.2, 1.9, 0.5, PATS[1], true); statue(-0.4, 1.7, C.z + 1.2, 1.3, -0.2, PATS[4], false); statue(1.6, 1.6, C.z + 0.9, 1.2, -0.6, PATS[2], false);
    statueSmall = statue(0.3, 1.6, C.z + 1.9, 0.7, 0, PATS[1], false);
    for (let i = -6; i <= 6; i++) box(g, 7.8, 11, 6, windowTex(600 + i, 3, 3, ['#e7e3dc', '#d9d2c6', '#ece6da'][(i + 9) % 3], '#4a5260'), i * 8, 5.5, -40);
    box(g, 18, 70, 18, windowTex(501, 6, 20, '#d8cdb4', '#55606e'), 10, 35, -62);
    liveCat = catS(g, 0.3, C.z + 2.0, 0, 1, 1.0, { y: 1.6 });
    // a few street cats around the roundabout
    for (let i = 0; i < 5; i++) catS(g, -4 + i * 2, -9 - (i % 2), Math.PI / 2, i + 2, 1.0, { walk: { dir: { x: 1, z: 0 }, speed: 0.5, span: 5 }, appear: -1 });
    tugu.lap = catS(g, 0.35, -1.8, Math.PI + 0.4, 0, 0.7, { y: 0.0 });
    tugu.update = (t, mode) => {
      const jump = mode === 'hook' ? smooth(E.baharu, E.baharu + 1.0, t) : 1; const run = mode === 'hook' ? clamp((t - E.baharu - 1.0) / 2.5) : 1;
      statueSmall.visible = mode === 'hook' && t < E.baharu + 0.05;
      liveCat.c.visible = mode === 'hook' && t > E.baharu - 0.05;
      liveCat.base.set(lerp(0.3, 0.3 + run * 8, run), lerp(1.6, 0, jump) + Math.sin(jump * Math.PI) * 1.2, lerp(C.z + 2.0, C.z + 5, jump)); liveCat.c.rotation.y = run > 0 ? Math.PI / 2 : Math.PI * jump;
      tugu.lap.c.visible = mode === 'end'; };
  }

  // ================================================= TERRACE ESTATE (aerial + lanes)
  const taman = makeSet('taman'); const doors = [], porchCats = [], kittenBoxes = [], kittens = [];
  {
    const g = taman.g;
    ground(g, 600, 600, 0x5d8a45, 0, -0.02, -100);
    for (let r = 0; r < 8; r++) { const z = -10 - r * 22; ground(g, 400, 7, 0x4a4b50, 0, 0, z + 7.5); for (let i = -14; i < 14; i++) box(g, 2, 0.02, 0.15, 0xe8e2d0, i * 6, 0.02, z + 7.5);
      for (let i = -10; i <= 10; i++) { const h = terrace(g, i * 6, z, 0, WALLS[(i + r * 3 + 30) % 6], ROOFS[(i + r + 20) % 4], i); doors.push({ d: h.userData.door, at: 0, i, r });
        if (r < 6 && Math.abs(i) <= 6) porchCats.push(catS(g, i * 6 - 0.6, z + 5.0, 0, (i + r + 10) % 5, 1.1, { appear: 1e9 })); } }
    // stagger the "cat at every door" wave by distance from the camera
    porchCats.forEach(k => { const d = Math.hypot(k.base.x, k.base.z + 10); k.appear = E.isi + 0.4 + d / 140 * (E.jumlah1 - E.isi); });
    doors.forEach(o => { const d = Math.hypot(o.i * 6, o.r * 22); o.at = E.isi + 0.3 + d / 140 * (E.jumlah1 - E.isi); });
    // kitten boxes on porches (Bulan 6)
    for (let i = -4; i <= 4; i++) { const b = new THREE.Group(); b.position.set(i * 6 + 1.2, 0, -10 + 5.2); g.add(b); box(b, 0.8, 0.45, 0.6, 0xc9a36a, 0, 0.23, 0); for (const s of [-1, 1]) { const f = box(b, 0.8, 0.02, 0.3, 0xc9a36a, 0, 0.45, s * 0.42); f.rotation.x = s * -0.9; } kittenBoxes.push(b);
      for (let k = 0; k < 4; k++) kittens.push(catS(g, i * 6 + 1.2 + (k - 1.5) * 0.18, -10 + 5.2, (hash(i, k) - 0.5), k + i + 10, 0.45, { y: 0.35, appear: 1e9 })); }
    for (let i = 0; i < 40; i++) kittens.push(catS(g, (hash(i, 1) - 0.5) * 40, -3 + hash(i, 2) * 3, hash(i, 3) * 6, i, 0.5, { appear: 1e9, walk: { dir: { x: hash(i, 4) > 0.5 ? 1 : -1, z: 0 }, speed: 0.8 + hash(i, 5), span: 10 } }));
    for (let i = 0; i < 30; i++) kittens.push(catS(g, -36 + i * 2.5, -10 + 6.4, Math.PI, i + 3, 0.5, { y: 0.9, appear: 1e9 }));
    for (let i = 0; i < 16; i++) kittens.push(catS(g, -24 + i * 3, -12.5, Math.PI / 2, i + 7, 0.55, { y: 6.9, appear: 1e9 }));
    kittens.forEach((k, i) => { k.kAppear = E.anak65 - 0.2 + (i / kittens.length) * 2.8; });
    // garbage truck with stacked litter boxes (Bulan 3)
    const truck = new THREE.Group(); truck.position.set(-30, 0, -2.5); g.add(truck); taman.truck = truck;
    box(truck, 2.6, 2.4, 2.5, 0xf07a1a, 3.4, 1.6, 0); box(truck, 5.5, 2.8, 2.5, 0x3a8a5a, -0.8, 1.8, 0); box(truck, 2.4, 1.0, 2.6, BM(0x1a2a3a), 3.6, 2.2, 0);
    for (const x of [-2.5, 0.5, 3.4]) for (const z of [-1.2, 1.2]) cyl(truck, 0.5, 0.5, 0.35, 10, 0x111111, x, 0.5, z).rotation.x = Math.PI / 2;
    taman.litter = []; for (let k = 0; k < 18; k++) { const b = box(truck, 0.9, 0.35, 0.65, [0x2b6cb0, 0xf2c94c, 0xe87a8a, 0x5fd07a][k % 4], -2.8 + (k % 5) * 1.0, 3.4 + Math.floor(k / 5) * 0.38, (k % 2 - 0.5) * 0.8); b.userData.k = k; taman.litter.push(b); }
    taman.guilty = catS(g, 4.5, -1.6, -0.4, 0, 1.3, {});
    person(g, 6.2, -2.6, -1.2, { shirt: 0xf07a1a, skin: SKINS[1], seed: 31 });
    taman.update = (t, mode) => {
      for (const o of doors) o.d.rotation.y = -1.3 * smooth(o.at, o.at + 0.4, t);
      const showK = mode === 'anak'; for (const b of kittenBoxes) b.visible = showK || mode === 'najis';
      for (const k of kittens) k.appear = showK ? k.kAppear : 1e9;
      truck.visible = mode === 'najis'; taman.guilty.c.visible = mode === 'najis';
      if (mode === 'najis') { truck.position.x = lerp(-30, 2, easeOut(clamp((t - SC.najis.start) / 2.5))); const n = Math.floor(clamp((t - E.tan65) / 3) * 18); taman.litter.forEach(b => b.visible = b.userData.k < n); }
    };
  }

  // ================================================= PET SHOP (makanan) + COUNTER (kos)
  const kedai = makeSet('kedai'); const bags = [], pile = [];
  let regT, receipt, coinsG;
  {
    const g = kedai.g;
    ground(g, 24, 40, tileMat('#f4efe4', '#e0d6c4', [8, 12]), 0, 0, -12); plane(g, 24, 40, 0xfaf6ee, 0, 4.5, -12).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) box(g, 0.3, 0.05, 3, BM(0xffffff), 0, 4.45, -3 - i * 5);
    plane(g, 3.2, 0.9, texMat((c, w, h) => { c.fillStyle = '#ff9a3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 64px HudSans'; c.textAlign = 'center'; c.fillText('🐾 KEDAI HAIWAN', w / 2, 100); }, 640, 160), 0, 3.6, -19.9);
    plane(g, 24, 4.5, 0xffe8c8, 0, 2.25, -20);
    const bagCols = [0xd8262a, 0x2b6cb0, 0x3a8a5a, 0xf2a020, 0x8e44ad];
    for (const s of [-1, 1]) for (let b2 = 0; b2 < 5; b2++) { const z = -4 - b2 * 3.2; box(g, 1.0, 3.0, 3.0, 0xe8e2d8, s * 3.2, 1.5, z);
      for (let lv = 0; lv < 4; lv++) { box(g, 1.1, 0.05, 3.0, 0xc9c3b8, s * 2.95, 0.3 + lv * 0.7, z); for (let k = 0; k < 5; k++) { const bg = box(g, 0.35, 0.55, 0.5, bagCols[(k + lv + b2) % 5], s * 2.75, 0.6 + lv * 0.7, z - 1.15 + k * 0.57); bags.push({ m: bg, p0: bg.position.clone(), s, i: bags.length }); } } }
    // mountain of 10 kg bags in the aisle, a cat on top
    for (let k = 0; k < 60; k++) { const lay = Math.floor(Math.sqrt(k)); const ring = k - lay * lay; const a = ring / Math.max(1, lay * 2 + 1) * Math.PI * 2; const r = Math.max(0, 1.6 - lay * 0.35);
      const b = box(g, 0.6, 0.35, 0.9, bagCols[k % 5], Math.cos(a) * r, 0.18 + (5 - lay) * 0.33, -9 + Math.sin(a) * r * 0.7); b.rotation.y = a; b.position.y = 0.18 + lay * 0.0; pile.push({ b, k, lay }); }
    pile.forEach(p => { p.b.position.y = 0.18 + (5 - Math.min(5, p.lay)) * 0.0 + (p.lay) * 0.0; });
    kedai.top = catS(g, 0, -9, 0.3, 0, 1.4, { y: 2.0 });
    // counter + register + coins + receipt
    const ct = new THREE.Group(); ct.position.set(0, 0, -2.2); g.add(ct); kedai.counter = ct;
    box(ct, 3.2, 1.05, 0.8, 0xff9a3a, 0, 0.52, 0); box(ct, 3.3, 0.06, 0.9, 0xf8f4ec, 0, 1.08, 0);
    box(ct, 0.6, 0.35, 0.45, 0x2a2d33, 0.8, 1.28, 0); regT = canvasTex(256, 96); const scr = plane(ct, 0.5, 0.18, new THREE.MeshBasicMaterial({ map: regT.tex }), 0.8, 1.5, 0.12); scr.rotation.x = -0.4;
    receipt = new THREE.Group(); ct.add(receipt); receipt.position.set(0.8, 1.12, 0.3);
    for (let k = 0; k < 40; k++) { const p = plane(receipt, 0.18, 0.12, BM(0xfdfdf8), 0, 0, 0); p.material.side = THREE.DoubleSide; p.userData.k = k; }
    coinsG = new THREE.Group(); ct.add(coinsG); coinsG.position.set(-0.4, 1.12, 0.2);
    const coinM = new THREE.MeshLambertMaterial({ color: 0xd8d8d0, emissive: 0x222222 });
    for (let k = 0; k < 3; k++) cyl(coinsG, k ? 0.032 : 0.04, k ? 0.032 : 0.04, 0.008, 14, coinM, k * 0.09, 0.005, 0);
    kedai.pusher = catS(ct, -0.75, 0.1, Math.PI / 2, 2, 0.9, { y: 1.1 });
    kedai.noteStacks = []; for (let k = 0; k < 6; k++) { const n = box(ct, 0.28, 1, 0.13, new THREE.MeshLambertMaterial({ color: 0x2f7a4a }), -1.25 + (k % 3) * 0.32, 1.1, -0.15 - Math.floor(k / 3) * 0.18); kedai.noteStacks.push(n); }
    kedai.update = (t, mode) => {
      const food = mode === 'makanan';
      const out = clamp((t - E.darab1) / 3.5);
      bags.forEach(b => { const gone = hash(b.i, 3) < out; const k = gone ? clamp((t - (E.darab1 + hash(b.i, 3) * 3.5)) / 0.6) : 0; b.m.visible = food ? k < 1 : (hash(b.i, 3) > 0.9); b.m.position.set(b.p0.x - b.s * k * 1.8, b.p0.y + Math.sin(k * Math.PI) * 1.2, b.p0.z + k * 3); b.m.rotation.set(k * 4, k * 3, 0); });
      const grow = food ? clamp((t - E.beg + 0.4) / 1.8) : 0; pile.forEach(p => { p.b.visible = food && p.k / pile.length < grow; p.b.position.y = 0.18 + p.lay * 0.32; });
      kedai.top.c.visible = food && grow > 0.95; kedai.top.base.y = 0.18 + 7 * 0.32;
      ct.visible = !food;
      if (!food) {
        const c = regT.ctx; c.fillStyle = '#0e1a10'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#7dff8a'; c.font = '700 40px HudSans'; c.textAlign = 'right';
        const v = t < E.darab2 ? 0.9 : t < E.rm44 ? lerp(0.9, 146522, clamp((t - E.darab2) / 1.6)) : 4395654; c.fillText('RM' + Math.round(v).toLocaleString('en-US'), 246, 64); c.textAlign = 'left'; regT.tex.needsUpdate = true;
        const k2 = t > E.kecil ? easeOut(clamp((t - E.kecil) / 0.6)) : 0; coinsG.position.x = -0.4 + k2 * 0.15; kedai.pusher.c.rotation.z = Math.sin(t * 6) * 0.05 * k2;
        const len = clamp((t - E.darab2) / 4); receipt.children.forEach(p => { const k = p.userData.k; p.visible = k / 40 < len; const s2 = k * 0.11; p.position.set(0, -Math.min(s2, 1.1), 0.05 + Math.max(0, s2 - 1.1)); p.rotation.x = s2 < 1.1 ? 0 : -Math.PI / 2; });
        const st = clamp((t - E.rm147) / 2.5); kedai.noteStacks.forEach((n, i) => { const hgt = Math.max(0.001, clamp(st * 6 - i, 0, 1) * 0.35); n.scale.y = hgt; n.position.y = 1.11 + hgt / 2; });
      }
    };
  }

  // ================================================= AERIAL KUCHING (setahun)
  const udara = makeSet('udara'); const dots = [];
  {
    const g = udara.g;
    ground(g, 1600, 1600, 0x4f8a3e, 0, 0, -300); ground(g, 1600, 120, new THREE.MeshLambertMaterial({ color: 0x6a8a8a }), 0, 0.3, -160);
    for (let i = 0; i < 90; i++) { const x = -400 + hash(i, 1) * 800, z = -80 + hash(i, 2) * 220; if (Math.abs(z + 160) < 70) continue; const hgt = 4 + hash(i, 3) * 26; box(g, 10, hgt, 10, WALLS[i % 6], x, hgt / 2, z); }
    for (let i = 0; i < 60; i++) { const x = -400 + hash(i, 7) * 800, z = -240 - hash(i, 8) * 260; box(g, 10, 4 + hash(i, 9) * 12, 10, WALLS[(i + 2) % 6], x, 5, z); }
    const dun = new THREE.Group(); dun.position.set(30, 0, -250); dun.scale.setScalar(0.9); g.add(dun); box(dun, 90, 4, 60, 0xe7e1d6, 0, 2, 0); cyl(dun, 24, 24, 16, 18, 0xefe8dc, 0, 12, 0); const r2 = pleatedCone(23, 40, 9, 0xd9a443, 0.12, 0.72); r2.position.y = 22; dun.add(r2);
    for (let i = 0; i < 300; i++) { const d = sphere(g, 1.4, BM(0xff9a3a), -380 + hash(i, 11) * 760, 2, -420 + hash(i, 12) * 560, 0); dots.push({ d, i }); }
    udara.update = t => { const k = clamp((t - SC.setahun.start) / 3); dots.forEach(o => { o.d.visible = o.i / dots.length < k; o.d.position.y = 2 + Math.abs(Math.sin(t * 3 + o.i)) * 1.5; }); };
  }

  // ------------------------------------------------ per-scene look
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const DAY = { sky: [0x4aa0e8, 0xdcf0fa], fog: [0xe6f2f8, 120, 1400], hemi: [0xffffff, 0x6a7a55, 1.45], sun: [0xfff2dc, 1.6, V(-60, 120, 60)] };
  const GOLD = { sky: [0x5a6ab8, 0xffc890], fog: [0xf0c8a0, 120, 1400], hemi: [0xffe8c8, 0x5a4a3a, 1.25], sun: [0xffb870, 1.4, V(-80, 40, -40)] };
  const LOOK = {
    hook: { set: 'tugu', mode: 'hook', pos: [V(-0.6, 1.65, 1.2), V(-0.3, 1.65, 0.2)], look: [V(0.6, 2.6, -15), V(1.2, 2.2, -12)], ...DAY },
    taman: { set: 'taman', pos: [V(0, 6, 8), V(0, 60, 30)], look: [V(0, 2, -20), V(0, 0, -70)], ...DAY },
    makanan: { set: 'kedai', mode: 'makanan', pos: [V(0, 1.65, 2), V(0, 1.75, 0.5)], look: [V(0, 1.6, -9), V(0, 1.4, -9)], ...DAY, fog: [0xfaf6ee, 20, 90], hemi: [0xffffff, 0xb8a888, 1.5], sun: [0xffffff, 0.4, V(10, 30, 10)] },
    kos: { set: 'kedai', mode: 'kos', pos: [V(-0.2, 1.75, 0.9), V(-0.1, 1.7, 0.5)], look: [V(0.0, 1.2, -2.2), V(0.1, 1.2, -2.2)], ...DAY, fog: [0xfaf6ee, 20, 90], hemi: [0xffffff, 0xb8a888, 1.5], sun: [0xffffff, 0.4, V(10, 30, 10)] },
    najis: { set: 'taman', mode: 'najis', pos: [V(9, 2.2, 8), V(8, 2.2, 7)], look: [V(0, 2.4, -3), V(1, 2.4, -3)], ...DAY },
    anak: { set: 'taman', mode: 'anak', pos: [V(1.2, 1.5, -2.6), V(1.2, 9, 14)], look: [V(1.2, 0.4, -4.8), V(0, 2, -12)], ...DAY },
    setahun: { set: 'udara', pos: [V(0, 180, 160), V(0, 160, 120)], look: [V(0, 0, -150), V(0, 0, -170)], ...GOLD },
    pengajaran: { set: 'tugu', mode: 'end', pos: [V(-0.3, 1.6, 1.2), V(-0.2, 1.55, 0.6)], look: [V(0.6, 3, -15), V(0.5, 1.2, -6)], ...GOLD },
    cta: { set: 'tugu', mode: 'end', pos: [V(-0.2, 1.55, 0.6), V(-0.2, 1.55, 0.55)], look: [V(0.5, 1.2, -6), V(0.5, 1.3, -6)], ...GOLD },
  };

  // ------------------------------------------------ HUD
  const STAT = { hook: 'HARI 1 · KUCHING', taman: 'HARI 1 · BAHAGIAN KUCHING', makanan: 'MAKANAN: 9.8 TAN / HARI', kos: 'KOS: RM4.4 JUTA / BULAN', najis: 'NAJIS: 6.5 TAN / HARI', anak: 'BULAN 6 · ANAK KUCING', setahun: 'KOS: RM53 JUTA / TAHUN', pengajaran: '' };
  function count(t) { if (t < E.isi) return 0; if (t < E.jumlah1) return Math.round(162802 * easeOut(clamp((t - E.isi) / (E.jumlah1 - E.isi)))); if (t < E.anak65) return 162802; if (t < E.jumlah2 + 0.6) return Math.round(lerp(162802, 227923, easeOut(clamp((t - E.anak65) / (E.jumlah2 + 0.6 - E.anak65))))); return 227923; }
  function hud(t) { const sc = sceneAt(t); if (sc.id === 'cta') return null; const c = count(t);
    return { label: '🐾 BILANGAN KUCING', value: c.toLocaleString('en-US'), stat: STAT[sc.id], color: c > 162802 ? '#ffd84a' : '', opacity: sc.id === 'pengajaran' ? 1 - smooth(E.bandar, E.bandar + 1, t) : 1 }; }

  // ------------------------------------------------ update
  function update(t) {
    const sc = sceneAt(t), L = LOOK[sc.id];
    for (const k in sets) sets[k].g.visible = k === L.set;
    const u = smooth(sc.start, sc.end, t);
    const pos = L.pos[0].clone().lerp(L.pos[1], u), look = L.look[0].clone().lerp(L.look[1], u);
    pos.x += Math.sin(t * 0.6) * 0.008; pos.y += Math.sin(t * 1.1) * 0.006;
    camera.position.copy(pos); camera.lookAt(look);
    skyU.top.value.setHex(L.sky[0]); skyU.horizon.value.setHex(L.sky[1]);
    scene.fog.color.setHex(L.fog[0]); scene.fog.near = L.fog[1]; scene.fog.far = L.fog[2];
    hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sun.position.copy(pos).add(L.sun[2]); sun.target.position.copy(pos);
    clouds.visible = ['tugu', 'taman', 'udara'].includes(L.set); cloudMat.color.setHex(L === LOOK.setahun || L.mode === 'end' ? 0xffc8a0 : 0xffffff);
    rig.position.set(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.004, 0);
    handL.visible = !['taman', 'udara'].includes(L.set) || sc.id === 'najis';
    const pet = sc.id === 'pengajaran' || sc.id === 'cta' ? smooth(E.bandar - 0.5, E.bandar + 1, t) : 0; handR.visible = pet > 0;
    handR.visible = false; handR.rotation.set(-0.5, 0.2, 0);
    drawPhone(t, sc.id);
    sets[L.set].update(t, L.mode);
    animateCats(t); animatePeople(t);
  }

  // ------------------------------------------------ 2D: period strip, yellow note card, district map, 10% icons, RM53 juta, icons, paws
  const PERIODS = [['HARI 1', 'hook'], ['MINGGU 1', 'makanan'], ['BULAN 1', 'kos'], ['BULAN 3', 'najis'], ['BULAN 6', 'anak'], ['TAHUN 1', 'setahun']];
  const ORDER = ['hook', 'taman', 'makanan', 'kos', 'najis', 'anak', 'setahun', 'pengajaran', 'cta'];
  const CARD = {
    taman: [['isi', '162,802 rumah'], ['jumlah1', '162,802 × 1 = 162,802 🐾']],
    makanan: [['g60', '60 g sehari'], ['tan98', '162,802 × 60 g ≈ 9.8 tan'], ['beg', '9,768 kg ÷ 10 kg ≈ 1,000 beg']],
    kos: [['sen90', '60 g × RM15/kg = RM0.90'], ['rm147', 'RM0.90 × 162,802 ≈ RM147,000'], ['rm44', '× 30 hari ≈ RM4.4 juta']],
    najis: [['najis40', '40 g × 162,802'], ['tan65', '≈ 6.5 tan sehari'], ['tan195', '× 30 ≈ 195 tan']],
    anak: [['persen10', '162,802 × 10% = 16,280'], ['anak65', '16,280 × 4 = 65,120'], ['jumlah2', '162,802 + 65,120 = 227,922']],
    setahun: [['tan3500', '9.8 tan × 365 ≈ 3,565 tan'], ['rm53', 'RM146,522 × 365 ≈ RM53 juta']],
  };
  const KM = [['Satok', .30, .32], ['Petra Jaya', .40, .18], ['Matang', .14, .30], ['Batu Kawa', .22, .55], ['Bau', .18, .80], ['Lundu', .02, .62]];
  function drawFx(g, t, w, h) {
    const sc = sceneAt(t), si = ORDER.indexOf(sc.id);
    // period strip
    if (sc.id !== 'cta' && sc.id !== 'pengajaran') { const x0 = 300, y0 = 232, cw = 76, ch = 34;
      PERIODS.forEach(([lab, id], i) => { const on = ORDER.indexOf(id) <= si && !(id === 'hook' && false), now = id === sc.id || (sc.id === 'taman' && id === 'hook'); const x = x0 + i * (cw + 4);
        g.globalAlpha = 0.95; g.fillStyle = on ? (now ? '#ff9a3a' : '#ffcf8a') : 'rgba(255,255,255,.22)'; g.beginPath(); g.roundRect(x, y0, cw, ch, 8); g.fill(); g.globalAlpha = 1;
        g.fillStyle = on ? '#3a1e00' : 'rgba(255,255,255,.8)'; g.font = '800 14px HudSans'; g.textAlign = 'center'; g.fillText(lab, x + cw / 2, y0 + 22); }); g.textAlign = 'left'; }
    // yellow note card with handwritten maths
    const lines = CARD[sc.id];
    if (lines) { const shown = lines.filter(([e]) => t >= E[e]); if (shown.length) { const cx = 330, cy = 650, cw = 430, lh = 52, chh = 30 + lines.length * lh; const k = easeOut(clamp((t - E[lines[0][0]]) / 0.3));
      g.save(); g.translate(cx + cw / 2, cy + chh / 2); g.rotate(-0.025); g.scale(k, k); g.translate(-(cx + cw / 2), -(cy + chh / 2));
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(cx + 8, cy + 8, cw, chh); g.fillStyle = '#fff3a8'; g.fillRect(cx, cy, cw, chh); g.fillStyle = '#ffe070'; g.fillRect(cx, cy, cw, 14);
      g.strokeStyle = 'rgba(80,140,200,.35)'; g.lineWidth = 2; for (let i = 1; i <= lines.length; i++) { g.beginPath(); g.moveTo(cx + 10, cy + 14 + i * lh); g.lineTo(cx + cw - 10, cy + 14 + i * lh); g.stroke(); }
      shown.forEach(([e, txt], i) => { const dt = t - E[e], n = Math.floor(clamp(dt / 0.6) * txt.length); g.fillStyle = '#1a2a6a'; g.font = 'italic 700 30px Garamond'; g.fillText(txt.slice(0, n), cx + 18, cy + 4 + (i + 1) * lh);
        if (i === shown.length - 1 && dt > 0.7 && dt < 4) { const tw = g.measureText(txt).width; g.strokeStyle = '#d8262a'; g.lineWidth = 3; g.beginPath(); g.ellipse(cx + 18 + tw * 0.75, cy + (i + 1) * lh - 6, tw * 0.3, 22, 0, 0, Math.PI * 2 * clamp((dt - 0.7) / 0.4)); g.stroke(); } });
      g.restore(); } }
    // Bahagian Kuching district map during "taman"
    if (sc.id === 'taman' && t > E.satok - 0.3) { const mx = 330, my = 470, mw = 420, mh = 150; const k = easeOut(clamp((t - E.satok + 0.3) / 0.4));
      g.globalAlpha = 0.9 * k; g.fillStyle = 'rgba(20,30,20,.55)'; g.beginPath(); g.roundRect(mx, my, mw, mh, 14); g.fill(); g.globalAlpha = k;
      KM.forEach(([n, x, y], i) => { const on = t > E.satok + i * 0.25; const px = mx + 20 + x * (mw - 40) * 2.2 % (mw - 40), py = my + 20 + y * (mh - 40); g.fillStyle = on ? '#ff9a3a' : 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(px, py, on ? 8 : 5, 0, 7); g.fill(); if (on) { g.fillStyle = '#fff'; g.font = '700 18px HudSans'; g.fillText(n, px + 12, py + 6); } });
      g.globalAlpha = 1; }
    // 10% icon row
    if (sc.id === 'anak' && t > E.persen10 && t < E.anak65 + 0.4) { for (let i = 0; i < 10; i++) { const x = 360 + i * 40, y = 600; g.globalAlpha = i === 0 ? 1 : 0.35; catFaceFx(g, x, y, 15, i === 0 ? '#ff7a2a' : '#ffffff'); } g.globalAlpha = 1; }
    // RM53 juta billboard
    if (sc.id === 'setahun' && t > E.rm53 - 0.1) { const k = easeOut(clamp((t - E.rm53 + 0.1) / 0.4)); g.save(); g.translate(540, 900); g.scale(k, k); g.font = '900 110px HudSans'; g.textAlign = 'center'; g.lineWidth = 12; g.strokeStyle = '#5a2a00'; g.strokeText('RM53 JUTA', 0, 0); g.fillStyle = '#ffd84a'; g.fillText('RM53 JUTA', 0, 0); g.restore(); g.textAlign = 'left'; }
    // lesson icons
    if (sc.id === 'pengajaran') { if (t > E.didarab && t < E.bandar) { const k = 1 - clamp((t - E.didarab - 1.5) / 1.5); g.font = '900 120px HudSans'; g.textAlign = 'center'; g.globalAlpha = 0.9; g.fillStyle = '#ffd84a'; g.save(); g.translate(540, 780); g.scale(0.4 + k * 0.6, 0.4 + k * 0.6); g.fillText('× 162,802', 0, 0); g.restore(); g.globalAlpha = 1; g.textAlign = 'left'; }
      if (t > E.mandul - 0.2) { const k = easeOut(clamp((t - E.mandul + 0.2) / 0.4)); g.font = '110px "Noto Color Emoji"'; g.textAlign = 'center'; g.globalAlpha = k; g.fillText('🏥', 440, 780); g.fillText('❤️', 640, 780); g.globalAlpha = 1; g.textAlign = 'left'; } }
    // paw prints walking towards the comments
    if (sc.id === 'cta') { const n = Math.floor((t - SC.cta.start) * 3); g.font = '60px "Noto Color Emoji"'; for (let i = 0; i < Math.min(n, 8); i++) g.fillText('🐾', 380 + (i % 2) * 70, 760 + i * 70); }
  }
  function catFaceFx(g, x, y, s, col) { catFace(g, x, y, s, col); }
  // cat leaping across the screen between periods
  const leaps = script.scenes.slice(1).map(s => s.start).filter(x => x !== SC.cta.start);
  const glCanvas = renderer.domElement;
  function flash(t) { let v = 0; for (const c of leaps) { const d = t - c; if (d > -0.1 && d < 0.25) v = Math.max(v, d < 0 ? (d + 0.1) / 0.1 : 1 - d / 0.25); } return v * 0.45; }
  const drawFx2 = drawFx;
  function drawFxAll(g, t, w, h) { drawFx2(g, t, w, h); for (const c of leaps) { const d = t - c + 0.35; if (d < 0 || d > 0.7) continue; const k = d / 0.7; const x = -200 + k * (w + 400), y = 1500 - Math.sin(k * Math.PI) * 500; g.save(); g.translate(x, y); g.rotate(-0.3 + k * 0.6); g.fillStyle = '#f08a2a'; g.beginPath(); g.ellipse(0, 0, 110, 46, 0, 0, 7); g.fill(); catFace(g, 110, -30, 50); g.fillRect(-190, -16, 90, 16); g.restore(); } }
  function grade() { return 'saturate(1.12) contrast(1.04)'; }

  update(0);
  return { scene, camera, update, drawFx: drawFxAll, flash, grade, hud };
}
