// "Apa jadi kalau nombor tidak wujud?" — POV at a mamak table in Kuala Lumpur.
// Everything in update(t) is a pure function of t so frames can render in parallel.

// ---------------------------------------------------------------- timeline
const TL = {
  vanishStart: 9.3,   // digits begin to disappear
  vanishSpread: 1.3,
  chipsDie: 22.2,     // every chip stops
  carsStop: 22.6,
  phoneDark: 24.9,
  signalFreeze: 26.5,
  gridStart: 32.0,    // power stations trip one by one
  gridEnd: 35.4,
  shopDark: 34.9,
  trainStop: 36.4,
  restore: 38.0,      // numbers return (white flash)
  phoneBoot: 41.0,
};

export async function create({ THREE, renderer, script, U }) {
  const { clamp, lerp, smooth, easeOut, hash, mulberry32, frameIndex } = U;
  const rand = mulberry32(1337);
  const scene = new THREE.Scene();
  const W = script.width, H = script.height;

  // ---------------------------------------------------------- helpers
  const matCache = new Map();
  const mat = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }));
    return matCache.get(key);
  };
  const box = (w, h, d, color, x = 0, y = 0, z = 0, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? mat(color) : color);
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const cyl = (rt, rb, h, seg, color, x = 0, y = 0, z = 0, parent = scene) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'number' ? mat(color) : color);
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const canvasTex = (w, h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { c, ctx: c.getContext('2d'), tex };
  };
  const glowTex = (() => {
    const { c, ctx, tex } = canvasTex(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); tex.needsUpdate = true; return tex;
  })();
  const glow = (color, size, x, y, z, parent = scene) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); return s;
  };
  const col = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(k));
  // keyframed value: [[t, v], ...]
  const kf = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return lerp(v0, v1, smooth(t0, t1, t));
    }
    return keys.at(-1)[1];
  };
  // power switch with a short flicker before going dark
  const power = (t, offAt, onAt = Infinity, seed = 0) => {
    if (t >= onAt) return 1;
    if (t >= offAt) return 0;
    if (t > offAt - 0.45) return hash(frameIndex(t), seed) > 0.45 ? 1 : 0.15;
    return 1;
  };

  // ------------------------------------------------------- camera + sky
  const camera = new THREE.PerspectiveCamera(80, W / H, 0.05, 4000);
  const camBase = new THREE.Vector3(0, 1.22, 0.3);
  scene.add(camera);

  const skyU = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, glowCol: { value: new THREE.Color(0xff8a3d) }, glow: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 top, horizon, glowCol; uniform float glow; varying vec3 vD;
      void main(){ float h = vD.y; vec3 c = mix(horizon, top, smoothstep(-0.02, 0.45, h));
        c += glowCol * glow * exp(-max(h,0.)*9.) * 0.55; gl_FragColor = vec4(c,1.); }`,
  }));
  scene.add(sky);
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 900; i++) {
    const th = rand() * Math.PI * 2, y = 0.06 + rand() * 0.94, r = Math.sqrt(1 - y * y);
    sp.push(Math.cos(th) * r * 2500, y * 2500, Math.sin(th) * r * 2500);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
  scene.add(stars);
  const moonDir = new THREE.Vector3(-0.2, 0.34, -1).normalize();
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(34, 1), new THREE.MeshBasicMaterial({ color: 0xf3ead2, fog: false }));
  moon.position.copy(moonDir).multiplyScalar(2200); scene.add(moon);
  const moonGlow = glow(0xbfcfff, 260, ...moon.position.toArray());

  scene.fog = new THREE.Fog(0x2b2a44, 40, 900);

  // ------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight(0x5363a0, 0x2a2018, 1.1); scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0x9db2e8, 0.5); moonLight.position.copy(moonDir).multiplyScalar(100); scene.add(moonLight);
  const shopLight = new THREE.PointLight(0xfff0cc, 3.2, 16, 0.5); shopLight.position.set(0, 3.2, 1.2); scene.add(shopLight);
  const streetLight = new THREE.PointLight(0xffb066, 2.0, 22, 0.6); streetLight.position.set(1.5, 6, -12); scene.add(streetLight);

  // ------------------------------------------------------------ ground
  const floorT = canvasTex(256, 256);
  { const g = floorT.ctx; g.fillStyle = '#8d8178'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#6f645d'; g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); } }
  floorT.tex.wrapS = floorT.tex.wrapT = THREE.RepeatWrapping; floorT.tex.repeat.set(12, 10); floorT.tex.needsUpdate = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), new THREE.MeshLambertMaterial({ map: floorT.tex }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -3.5); scene.add(floor);
  box(24, 0.18, 0.3, 0x9a948c, 0, 0.09, -8.6);                       // kerb
  const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 13), mat(0x2c2b30)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -15.2); scene.add(road);
  for (let i = -20; i < 20; i++) box(1.6, 0.02, 0.14, 0xd8d2c0, i * 3.6, 0.03, -15.2);  // lane dashes
  const far = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), mat(0x1d1c24)); far.rotation.x = -Math.PI / 2; far.position.set(0, -0.02, -1520); scene.add(far);
  box(300, 0.2, 3, 0x7d766f, 0, 0.1, -23);                          // far sidewalk

  // ------------------------------------------------------ window textures
  function windowTextures(seed, cols, rows, facade, lit) {
    const r = mulberry32(seed);
    const map = canvasTex(256, 512), emi = canvasTex(256, 512);
    map.ctx.fillStyle = facade; map.ctx.fillRect(0, 0, 256, 512);
    emi.ctx.fillStyle = '#000'; emi.ctx.fillRect(0, 0, 256, 512);
    const cw = 256 / cols, rh = 512 / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const px = x * cw + cw * 0.2, py = y * rh + rh * 0.22, w = cw * 0.6, h = rh * 0.56;
      map.ctx.fillStyle = '#1b2233'; map.ctx.fillRect(px, py, w, h);
      if (r() < lit) {
        const warm = r(); emi.ctx.fillStyle = warm < 0.6 ? '#ffd58a' : warm < 0.85 ? '#fff1d0' : '#bfe0ff';
        emi.ctx.globalAlpha = 0.6 + r() * 0.4; emi.ctx.fillRect(px, py, w, h); emi.ctx.globalAlpha = 1;
      }
    }
    for (const t of [map.tex, emi.tex]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; }
    return { map: map.tex, emi: emi.tex };
  }
  const winVariants = [1, 2, 3, 4].map(s => windowTextures(s * 97, 4, 8, ['#3a4258', '#434a5c', '#36404f', '#4a4a56'][s - 1], 0.55));

  // Buildings that can lose power. Each has: material, offAt, back (flicker back on in scene 5).
  const powered = [];
  function building(x, z, w, h, d, variant, unitW = 12, unitH = 24) {
    const v = winVariants[variant % 4];
    const map = v.map.clone(), emi = v.emi.clone();
    for (const t of [map, emi]) { t.repeat.set(Math.max(1, Math.round(w / unitW * 2)) / 2, Math.max(1, Math.round(h / unitH))); t.needsUpdate = true; }
    const m = new THREE.MeshLambertMaterial({ map, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 1, flatShading: true });
    const mesh = box(w, h, d, m, x, h / 2, z);
    return mesh;
  }
  function registerPower(material, x, z, prop = 'emissiveIntensity', on = 1) {
    // grid fails left-to-right across the horizon (by bearing angle)
    const bearing = Math.atan2(x, -z);
    powered.push({ material, prop, on, bearing, seed: powered.length * 13 + 7 });
  }

  // Skyline
  for (let i = 0; i < 70; i++) {
    const z = -90 - rand() * 520, spread = Math.abs(z) * 0.5;
    const x = (rand() * 2 - 1) * spread;
    const w = 14 + rand() * 26, h = 30 + rand() * rand() * 190 + Math.abs(z) * 0.06, d = 14 + rand() * 20;
    const b = building(x, z, w, h, d, i);
    registerPower(b.material, x, z);
  }
  // Twin towers (tiered octagons with spires)
  const towers = [];
  for (const tx of [-58, -26]) {
    const v = windowTextures(555, 10, 40, '#7b8696', 0.75);
    const m = new THREE.MeshLambertMaterial({ map: v.map, emissiveMap: v.emi, emissive: 0xdde8ff, emissiveIntensity: 1.1, flatShading: true });
    let y = 0; const tiers = [[13, 150], [11, 60], [9, 35], [7, 22], [5, 14]];
    for (const [r, h] of tiers) { cyl(r * 0.95, r, h, 8, m, tx, y + h / 2, -620); y += h; }
    cyl(0.4, 2.2, 70, 6, 0xb8c2d0, tx, y + 35, -620);
    const tip = glow(0xff4a4a, 18, tx, y + 72, -620);
    towers.push({ m, tip, x: tx });
  }
  // Shophouses across the road
  const shopSigns = [];
  for (let i = -5; i <= 5; i++) {
    const x = i * 4.2, h = 6.5 + (i % 3 === 0 ? 2.5 : 0);
    const b = building(x, -26, 4.1, h, 4, i + 9, 4, 3);
    registerPower(b.material, x, -60);
    const sign = box(3.6, 0.9, 0.15, new THREE.MeshLambertMaterial({ color: 0x222222, emissive: [0xffe08a, 0xff7a6b, 0x9ee6ff, 0xfff4e0][(i + 9) % 4], emissiveIntensity: 0.9 }), x, 3.6, -23.9);
    shopSigns.push(sign);
    registerPower(sign.material, x, -60, 'emissiveIntensity', 0.9);
    const front = box(3.2, 2.6, 0.1, new THREE.MeshLambertMaterial({ color: 0x111111, emissive: 0xffd9a0, emissiveIntensity: 0.55 }), x, 1.4, -23.9);
    registerPower(front.material, x, -60, 'emissiveIntensity', 0.55);
  }

  // LED sign (dies with the chips)
  const LED_TEXT = '  TEH TARIK RM2.50  *  ROTI CANAI RM1.80  *  BUKA 24 JAM  *  NASI LEMAK RM4.50  *';
  const led = canvasTex(1024, 128);
  led.tex.wrapS = THREE.RepeatWrapping;
  const ledMesh = box(7.5, 1.0, 0.2, new THREE.MeshBasicMaterial({ map: led.tex, fog: false }), -1.2, 4.9, -23.8);
  box(7.8, 1.2, 0.15, 0x15151a, -1.2, 4.9, -23.95);

  // ------------------------------------------------------------- LRT
  const guideY = 10.5, guideZ = -42;
  box(200, 1.1, 2.4, 0x9aa0a8, 0, guideY, guideZ);
  box(200, 0.5, 0.3, 0x8a9098, 0, guideY + 0.75, guideZ + 1.1);
  for (let i = -6; i <= 6; i++) cyl(0.8, 0.9, guideY, 8, 0x8e949b, i * 16 + 5, guideY / 2, guideZ);
  const train = new THREE.Group(); scene.add(train);
  const trainWin = new THREE.MeshLambertMaterial({ color: 0x1b2233, emissive: 0xeaf4ff, emissiveIntensity: 0.9 });
  for (let c = 0; c < 2; c++) {
    const cx = -c * 12.4 - 6;
    box(12, 3.0, 2.6, 0xe9edf2, cx, guideY + 2.1, guideZ, train);
    box(12, 0.5, 2.62, 0x2f6fd0, cx, guideY + 1.0, guideZ, train);
    for (let k = 0; k < 5; k++) box(1.6, 1.0, 2.64, trainWin, cx - 4.8 + k * 2.4, guideY + 2.4, guideZ, train);
  }
  const trainLamp = glow(0xffffff, 3, 0.05, guideY + 1.6, guideZ + 1.0, train);
  const trainPos = t => {
    const v = 0.9, a0 = 33.6, a1 = TL.trainStop, base = -8;
    if (t < a0) return base + v * t;
    const u = Math.min(t, a1) - a0, D = a1 - a0;
    return base + v * a0 + v * (u - u * u / (2 * D));
  };

  // -------------------------------------------------------------- cars
  const cars = [];
  const carCols = [0xc23b3b, 0xe8e8e8, 0x3a6fb5, 0x2b2b2b, 0xd9b44a, 0x7d8a8f];
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group(); scene.add(g);
    const dir = i % 2 ? 1 : -1, lane = dir > 0 ? -17.6 : -12.8;
    box(4.2, 0.9, 1.8, carCols[i % 6], 0, 0.7, 0, g);
    box(2.3, 0.7, 1.6, 0x24303f, -0.2 * dir, 1.45, 0, g);
    for (const wx of [-1.3, 1.3]) for (const wz of [-0.85, 0.85]) cyl(0.35, 0.35, 0.25, 8, 0x111111, wx, 0.35, wz, g).rotation.x = Math.PI / 2;
    const head = glow(0xfff2c0, 2.0, 2.15 * dir, 0.8, 0.9, g);
    const tail = glow(0xff3030, 1.2, -2.15 * dir, 0.8, 0.9, g);
    g.position.set(0, 0, lane);
    cars.push({ g, dir, offset: rand() * 120, speed: 9 + rand() * 5, head, tail });
  }
  const carTravel = t => { // integral of speed factor (1 → 0 between carsStop and +2s)
    const a = TL.carsStop, D = 2.2;
    if (t < a) return t; const u = Math.min(t - a, D); return a + u - u * u / (2 * D);
  };

  // ------------------------------------------- traffic light + street lamps
  const tlGroup = new THREE.Group(); tlGroup.position.set(2.0, 0, -9.3); scene.add(tlGroup);
  cyl(0.08, 0.1, 3.6, 6, 0x3b3f44, 0, 1.8, 0, tlGroup);
  box(0.42, 1.2, 0.3, 0x1f2226, 0, 3.9, 0, tlGroup);
  const tlLamps = [0xff3a2a, 0xffb020, 0x37e07a].map((c, k) => {
    const m = new THREE.MeshBasicMaterial({ color: c });
    const lamp = cyl(0.12, 0.12, 0.05, 10, m, 0, 4.28 - k * 0.38, 0.17, tlGroup); lamp.rotation.x = Math.PI / 2;
    const gl = glow(c, 1.3, 0, 4.28 - k * 0.38, 0.25, tlGroup);
    return { m, gl, c: new THREE.Color(c) };
  });
  const lamps = [];
  for (const [lx, lz] of [[-3.5, -9.0], [4.5, -9.0], [-8, -21.5], [7, -21.5]]) {
    cyl(0.07, 0.1, 6, 6, 0x4a4e55, lx, 3, lz);
    box(1.2, 0.08, 0.12, 0x4a4e55, lx + 0.5, 6, lz);
    const head = box(0.5, 0.12, 0.3, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), lx + 1.0, 5.93, lz);
    const g = glow(0xffc070, 3.2, lx + 1.0, 5.8, lz);
    lamps.push({ head, g, bearing: Math.atan2(lx, -lz) });
  }

  // ------------------------------------------------------ mamak furniture
  const steel = 0xb9bfc4;
  function table(x, z, r = 0.45) {
    cyl(r, r, 0.04, 10, steel, x, 0.74, z); cyl(0.04, 0.04, 0.72, 6, 0x9da3a8, x, 0.37, z); cyl(0.28, 0.3, 0.03, 8, 0x9da3a8, x, 0.02, z);
  }
  function stool(x, z, color) { cyl(0.17, 0.15, 0.45, 8, color, x, 0.225, z); }
  const people = [];
  function person(x, z, yaw, shirt, skin, hair, seed) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g);
    box(0.36, 0.5, 0.22, shirt, 0, 0.75, 0, g);               // torso
    box(0.3, 0.14, 0.5, 0x2c3140, 0, 0.47, -0.16, g);         // thighs
    const headG = new THREE.Group(); headG.position.set(0, 1.12, 0); g.add(headG);
    box(0.2, 0.24, 0.2, skin, 0, 0, 0, headG);
    box(0.22, 0.08, 0.22, hair, 0, 0.12, 0.01, headG);
    const armL = box(0.09, 0.4, 0.09, shirt, -0.22, 0.75, -0.08, g); armL.rotation.x = -0.6;
    const armR = box(0.09, 0.4, 0.09, shirt, 0.22, 0.75, -0.08, g); armR.rotation.x = -0.6;
    people.push({ g, headG, seed, baseYaw: yaw });
  }
  table(-1.1, -3.2); stool(-1.6, -3.0, 0xd23c3c); stool(-0.6, -3.5, 0x2f63c9);
  person(-1.6, -3.0, -Math.PI / 2 + 0.3, 0x6c8f5a, 0xc48a5c, 0x1a1412, 1);
  person(-0.62, -3.55, Math.PI * 0.75, 0xe0d4b8, 0x9c6a43, 0x161210, 2);
  table(1.25, -4.6); stool(0.75, -4.4, 0x2f63c9); stool(1.75, -4.9, 0xd23c3c);
  person(0.75, -4.4, -Math.PI / 2 - 0.2, 0xb85445, 0xd29a70, 0x241a14, 3);
  person(1.78, -4.95, Math.PI / 2 + 0.5, 0x3e5a8c, 0xa87150, 0x0f0c0b, 4);
  table(-0.5, -6.6); stool(-1.0, -6.4, 0xd23c3c); stool(0.0, -6.9, 0x2f63c9);
  person(-1.0, -6.4, -Math.PI / 2, 0xd9c14a, 0xc48a5c, 0x2b211a, 5);
  person(0.02, -6.95, Math.PI / 2 + 0.3, 0xf2f2f2, 0xb27a52, 0x1a1412, 6);
  person(2.6, -7.2, Math.PI, 0x5b4a7a, 0xc48a5c, 0x161210, 7);    // standing-ish passer-by
  // shop pillars framing the view
  box(0.45, 3.6, 0.45, 0xd8cfc2, -1.85, 1.8, -3.9); box(0.45, 3.6, 0.45, 0xd8cfc2, 2.3, 1.8, -3.4);

  // ---------------------------------------- text planes with vanishing digits
  // Each digit gets its own vanish/return time so they disappear one by one.
  const digitPlanes = [];
  function digitVis(i, salt, t) {
    const off = TL.vanishStart + hash(i, salt) * TL.vanishSpread;
    const on = TL.restore + hash(i, salt + 99) * 0.5;
    if (t >= on) return 1;
    if (t >= off) return 0;
    if (t > off - 0.35) return hash(frameIndex(t), i * 31 + salt) > 0.5 ? 1 : 0;
    return 1;
  }
  function textPlane({ w, h, cw, ch, salt, draw, mesh }) {
    const T = canvasTex(cw, ch);
    const digits = []; // filled on first draw: {x,y,size,char}
    const p = { T, mesh, salt, digits, draw, w, h, cw, ch, last: -1 };
    mesh.material.map = T.tex; mesh.material.needsUpdate = true;
    // draw string char-by-char so each digit can vanish
    p.text = (ctx, str, x, y, font, color, t, align = 'left', record = true) => {
      ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
      let cx = align === 'right' ? x - ctx.measureText(str).width : align === 'center' ? x - ctx.measureText(str).width / 2 : x;
      for (const c of str) {
        const cwid = ctx.measureText(c).width;
        if (/[0-9]/.test(c)) {
          const idx = p.dc++;
          if (record && !p.recorded) digits.push({ x: cx + cwid / 2, y: y - parseInt(font.match(/(\d+)px/)[1]) * 0.35, char: c, size: parseInt(font.match(/(\d+)px/)[1]) });
          const v = digitVis(idx, salt, t);
          if (v > 0) ctx.fillText(c, cx, y);
          else if (t < TL.restore && t < TL.vanishStart + TL.vanishSpread + 0.6 && hash(frameIndex(t), idx + salt) < 0.15) { ctx.globalAlpha = 0.5; ctx.fillText('?', cx, y); ctx.globalAlpha = 1; }
        } else ctx.fillText(c, cx, y);
        cx += cwid;
      }
    };
    digitPlanes.push(p);
    return p;
  }
  function redraw(p, t) { p.dc = 0; p.draw(p, p.T.ctx, t); p.recorded = true; p.T.tex.needsUpdate = true; }

  // Menu A-frame board
  const menuMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.9), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  menuMesh.position.set(0.95, 0.98, -2.9); menuMesh.rotation.set(-0.12, -0.38, 0); scene.add(menuMesh);
  box(0.66, 0.94, 0.02, 0x6b4a2b, 0, 0, -0.012, menuMesh);
  cyl(0.015, 0.015, 1.0, 4, 0x6b4a2b, 0.95 - 0.26, 0.5, -2.82).rotation.z = 0.08;
  cyl(0.015, 0.015, 1.0, 4, 0x6b4a2b, 0.95 + 0.26, 0.5, -3.0).rotation.z = -0.08;
  const MENU = [['Teh Tarik', '2.50'], ['Roti Canai', '1.80'], ['Nasi Lemak', '4.50'], ['Milo Ais', '3.20'], ['Mee Goreng', '6.00'], ['Maggi Goreng', '5.50']];
  const menu = textPlane({ w: 0.62, h: 0.9, cw: 512, ch: 744, salt: 11, mesh: menuMesh, draw(p, g, t) {
    g.fillStyle = '#1f3a2e'; g.fillRect(0, 0, 512, 744);
    g.strokeStyle = '#c9b28a'; g.lineWidth = 10; g.strokeRect(14, 14, 484, 716);
    g.font = '600 74px Garamond'; g.fillStyle = '#f7f1e3'; g.textAlign = 'left';
    g.fillText('MENU', 256 - g.measureText('MENU').width / 2, 112);
    MENU.forEach(([name, price], k) => {
      const y = 210 + k * 88;
      p.text(g, name, 46, y, 'italic 400 46px Garamond', '#f7f1e3', t);
      p.text(g, 'RM ' + price, 470, y, '500 46px Garamond', '#ffd98a', t, 'right');
    });
  } });

  // Wall clock on the right pillar
  const clockMesh = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true }));
  clockMesh.position.set(-1.62, 2.1, -3.66); clockMesh.rotation.y = 0.0; scene.add(clockMesh);
  const clockStopAt = TL.chipsDie;
  const clock = textPlane({ w: 0.52, h: 0.52, cw: 512, ch: 512, salt: 23, mesh: clockMesh, draw(p, g, t) {
    g.clearRect(0, 0, 512, 512);
    g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(256, 256, 252, 0, 7); g.fill();
    g.fillStyle = '#f6f2e8'; g.beginPath(); g.arc(256, 256, 232, 0, 7); g.fill();
    for (let n = 1; n <= 12; n++) {
      const a = n / 12 * Math.PI * 2;
      p.text(g, String(n), 256 + Math.sin(a) * 180, 256 - Math.cos(a) * 180 + 22, '500 62px Garamond', '#222', t, 'center');
    }
    const secs = 47 * 60 + 20 * 3600 + Math.floor(Math.min(t, clockStopAt));
    const hand = (ang, len, wid, c) => { g.save(); g.translate(256, 256); g.rotate(ang); g.fillStyle = c; g.fillRect(-wid / 2, -len, wid, len + 20); g.restore(); };
    hand(((secs / 3600) % 12) / 12 * Math.PI * 2, 120, 14, '#222');
    hand(((secs / 60) % 60) / 60 * Math.PI * 2, 175, 9, '#222');
    hand((secs % 60) / 60 * Math.PI * 2, 190, 4, '#c0392b');
    g.fillStyle = '#222'; g.beginPath(); g.arc(256, 256, 14, 0, 7); g.fill();
  } });

  // Banknote on the table
  const noteMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.068), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  noteMesh.rotation.set(-Math.PI / 2, 0, 0.35); noteMesh.position.set(0.13, 0.765, -0.72); scene.add(noteMesh);
  const note = textPlane({ w: 0.15, h: 0.068, cw: 512, ch: 232, salt: 37, mesh: noteMesh, draw(p, g, t) {
    g.fillStyle = '#c9473e'; g.fillRect(0, 0, 512, 232);
    g.fillStyle = '#e07c62'; g.beginPath(); g.arc(380, 116, 80, 0, 7); g.fill();
    g.strokeStyle = '#f2d0b8'; g.lineWidth = 6; g.strokeRect(10, 10, 492, 212);
    p.text(g, '10', 30, 86, '600 70px Garamond', '#fff3e6', t);
    p.text(g, '10', 482, 210, '600 70px Garamond', '#fff3e6', t, 'right');
    g.font = 'italic 400 30px Garamond'; g.fillStyle = '#fff3e6'; g.fillText('SEPULUH RINGGIT', 40, 190);
  } });

  // ---------------------------------------------------------- our table
  box(1.0, 0.04, 0.85, steel, 0, 0.74, -0.72);
  for (const [lx, lz] of [[-0.45, -0.35], [0.45, -0.35], [-0.45, -1.1], [0.45, -1.1]]) cyl(0.02, 0.02, 0.72, 6, 0x9da3a8, lx, 0.37, lz);
  cyl(0.11, 0.09, 0.015, 12, 0xf0ece4, -0.2, 0.765, -0.95);            // saucer
  // roti canai on a plate
  cyl(0.13, 0.12, 0.015, 14, 0xf4f1ea, -0.22, 0.765, -0.92);
  cyl(0.1, 0.1, 0.02, 9, 0xd9a35c, -0.22, 0.78, -0.92);

  // ------------------------------------------------------------- hands (camera-attached)
  const rig = new THREE.Group(); camera.add(rig);
  const skin = 0xc68a5f, sleeve = 0x283a66;
  // left hand + phone
  const handL = new THREE.Group(); handL.position.set(-0.14, -0.2, -0.46); handL.rotation.set(0.3, 0.22, 0.1); rig.add(handL);
  box(0.11, 0.42, 0.1, sleeve, -0.02, -0.33, 0.02, handL).rotation.x = -0.15;
  box(0.09, 0.11, 0.04, skin, 0, -0.07, -0.012, handL);
  box(0.025, 0.07, 0.03, skin, 0.055, -0.02, 0.005, handL).rotation.z = -0.5;      // thumb
  const phone = box(0.078, 0.158, 0.009, 0x16181c, 0, 0.02, 0.012, handL);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  phoneScreen.position.set(0, 0.02, 0.0172); handL.add(phoneScreen);
  for (let k = 0; k < 3; k++) box(0.016, 0.022, 0.02, skin, -0.044, -0.02 + k * 0.026, 0.0, handL);  // fingers wrap left edge
  // right hand + teh tarik
  const handR = new THREE.Group(); handR.position.set(0.23, -0.31, -0.66); handR.rotation.set(0.2, -0.2, -0.05); rig.add(handR);
  box(0.12, 0.42, 0.11, sleeve, 0.04, -0.3, 0.06, handR).rotation.set(-0.5, 0, 0.15);
  const glassM = new THREE.MeshLambertMaterial({ color: 0xe9f0f4, transparent: true, opacity: 0.35, flatShading: true });
  cyl(0.042, 0.036, 0.13, 12, glassM, 0, 0.065, 0, handR);
  cyl(0.039, 0.034, 0.1, 12, 0xb7764a, 0, 0.05, 0, handR);
  cyl(0.04, 0.039, 0.022, 12, 0xf1e1c4, 0, 0.111, 0, handR);
  box(0.1, 0.075, 0.05, skin, 0.0, 0.03, 0.045, handR);
  for (let k = 0; k < 3; k++) box(0.022, 0.018, 0.06, skin, -0.035, 0.0 + k * 0.024, 0.02, handR);
  box(0.02, 0.06, 0.025, skin, -0.05, 0.065, 0.045, handR).rotation.z = 0.4;

  const phonePlane = textPlane({ w: 0.07, h: 0.148, cw: 256, ch: 540, salt: 53, mesh: phoneScreen, draw(p, g, t) {
    if (t >= TL.phoneDark && t < TL.phoneBoot) {
      g.fillStyle = '#050506'; g.fillRect(0, 0, 256, 540);
      if (t < TL.phoneDark + 0.25) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, 266, 256, 8); }
      p.dc += 99; return;
    }
    if (t >= TL.phoneBoot) {
      g.fillStyle = '#050506'; g.fillRect(0, 0, 256, 540);
      const a = (t - TL.phoneBoot) * 5;
      g.strokeStyle = '#f2f2f2'; g.lineWidth = 8; g.lineCap = 'round';
      g.globalAlpha = smooth(TL.phoneBoot, TL.phoneBoot + 0.6, t);
      g.beginPath(); g.arc(128, 270, 34, a, a + 4.2); g.stroke(); g.globalAlpha = 1;
      p.dc += 99; return;
    }
    g.fillStyle = '#f5f6f8'; g.fillRect(0, 0, 256, 540);
    p.text(g, '20:47', 22, 34, '600 22px HudSans', '#111', t);
    p.text(g, '100%', 234, 34, '600 20px HudSans', '#111', t, 'right');
    g.fillStyle = '#2b5fd9'; g.fillRect(0, 54, 256, 120);
    g.font = '700 26px HudSans'; g.fillStyle = '#fff'; g.fillText('BAYAR', 22, 102);
    g.font = '600 18px HudSans'; g.fillText('Restoran Mamak', 22, 140);
    g.font = '600 18px HudSans'; g.fillStyle = '#6b7280'; g.fillText('JUMLAH', 22, 226);
    p.text(g, 'RM 7.50', 22, 290, '700 50px HudSans', '#111', t);
    g.fillStyle = '#e5e7eb'; g.fillRect(22, 320, 212, 2);
    p.text(g, 'Teh Tarik x1', 22, 360, '600 18px HudSans', '#374151', t);
    p.text(g, 'Roti Canai x2', 22, 392, '600 18px HudSans', '#374151', t);
    g.fillStyle = '#2b5fd9'; g.beginPath(); g.roundRect(22, 440, 212, 62, 31); g.fill();
    g.font = '700 22px HudSans'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('BAYAR SEKARANG', 128, 479); g.textAlign = 'left';
  } });

  // LED sign drawing (not a textPlane: scrolls) — digits vanish by time, sign dies with chips
  function drawLED(t) {
    const g = led.ctx; g.fillStyle = '#120808'; g.fillRect(0, 0, 1024, 128);
    const alive = power(t, TL.chipsDie, Infinity, 77);
    if (!alive) { led.tex.needsUpdate = true; return; }
    g.font = '700 74px HudSans'; g.textBaseline = 'middle';
    const scroll = (t * 160) % 2600;
    let x = 1024 - scroll;
    for (let rep = 0; rep < 2; rep++) for (const c of LED_TEXT) {
      const wdt = g.measureText(c).width;
      const isD = /[0-9]/.test(c);
      const v = isD ? digitVis(Math.floor(x), 71, t) : 1;
      if (x > -80 && x < 1100 && v) { g.fillStyle = '#ff5a3c'; g.fillText(c, x, 66); }
      x += wdt;
    }
    // LED dot mask
    g.fillStyle = 'rgba(18,8,8,.55)';
    for (let yy = 0; yy < 128; yy += 8) g.fillRect(0, yy, 1024, 3);
    for (let xx = 0; xx < 1024; xx += 8) g.fillRect(xx, 0, 3, 128);
    led.tex.needsUpdate = true;
  }

  // ------------------------------------------------ digit particles (B2)
  scene.updateMatrixWorld(true);
  camera.position.copy(camBase); camera.lookAt(0, 1.32, -6); camera.updateMatrixWorld(true);
  for (const p of digitPlanes) redraw(p, 0);
  const digitTex = {};
  for (const d of '0123456789') {
    const T = canvasTex(64, 64); T.ctx.font = '500 56px Garamond'; T.ctx.fillStyle = '#fff'; T.ctx.textAlign = 'center'; T.ctx.textBaseline = 'middle';
    T.ctx.fillText(d, 32, 34); T.tex.needsUpdate = true; digitTex[d] = T.tex;
  }
  const particles = [];
  for (const p of digitPlanes) {
    p.digits.forEach((d, idx) => {
      const u = d.x / p.cw - 0.5, v = 0.5 - d.y / p.ch;
      const local = new THREE.Vector3(u * p.w, v * p.h, 0.01);
      const world = p.mesh.localToWorld(local.clone());
      const off = TL.vanishStart + hash(idx, p.salt) * TL.vanishSpread;
      const worldSize = d.size / p.ch * p.h;
      for (let k = 0; k < 2; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: digitTex[d.char], color: 0xffffff, transparent: true, depthWrite: false, fog: false }));
        scene.add(s); s.visible = false;
        particles.push({ s, p0: world, t0: off + k * 0.08, size: Math.max(worldSize * 1.4, 0.012), seed: idx * 7 + p.salt + k * 1000 });
      }
    });
  }
  // extra particles drifting from the LED sign + skyline
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: digitTex[String(i % 10)], color: 0xffb08a, transparent: true, depthWrite: false, fog: false }));
    scene.add(s); s.visible = false;
    particles.push({ s, p0: new THREE.Vector3(-4.6 + rand() * 6.8, 4.9, -23.6), t0: TL.vanishStart + rand() * TL.vanishSpread, size: 0.35, seed: 5000 + i });
  }

  // ------------------------------------------------------------ icon (1 2 3 cubes)
  const icon = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(30, W / H, 0.1, 100) };
  icon.camera.position.set(0, 0, 10);
  icon.scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.6));
  const il = new THREE.DirectionalLight(0xffffff, 1.4); il.position.set(2, 3, 5); icon.scene.add(il);
  const iconGroup = new THREE.Group(); iconGroup.position.set(0, 1.92, 0); iconGroup.scale.setScalar(0.8); icon.scene.add(iconGroup);
  const cubes = ['1', '2', '3'].map((d, k) => {
    const T = canvasTex(128, 128);
    T.ctx.fillStyle = ['#2f63c9', '#f2efe6', '#2f63c9'][k]; T.ctx.fillRect(0, 0, 128, 128);
    T.ctx.font = '600 100px Garamond'; T.ctx.fillStyle = ['#f2efe6', '#2f63c9', '#f2efe6'][k]; T.ctx.textAlign = 'center'; T.ctx.textBaseline = 'middle';
    T.ctx.fillText(d, 64, 72); T.tex.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ map: T.tex, transparent: true }));
    m.position.x = (k - 1) * 0.4; iconGroup.add(m); return m;
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  ring.rotation.x = 1.25; iconGroup.add(ring);
  const ringDot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  iconGroup.add(ringDot);

  // ------------------------------------------------------------- update
  const shakeEvents = [TL.vanishStart, TL.chipsDie, ...Array.from({ length: 7 }, (_, i) => lerp(TL.gridStart, TL.gridEnd, i / 6)), TL.shopDark, TL.restore];
  const bearingMin = -0.9, bearingMax = 0.9;

  function update(t) {
    // --- camera: breathing + shake + slow push
    let sx = 0, sy = 0;
    for (const e of shakeEvents) {
      const dt = t - e; if (dt < 0 || dt > 1.2) continue;
      const amp = (e === TL.restore ? 0.025 : e >= TL.gridStart && e <= TL.gridEnd ? 0.018 : 0.01) * Math.exp(-dt * 5);
      sx += Math.sin(dt * 61 + e) * amp; sy += Math.cos(dt * 53 + e * 2) * amp;
    }
    const push = smooth(0, 60, t) * 0.12;
    camera.position.set(camBase.x + Math.sin(t * 0.6) * 0.006 + sx, camBase.y + Math.sin(t * 1.1) * 0.005 + sy, camBase.z - push);
    camera.lookAt(sx * 4, 1.32 + sy * 4, -6);
    rig.position.set(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.004, 0);
    const lift = 0.02 * Math.sin(Math.min(t, 4) * 0.4); handR.position.y = -0.31 + lift;

    // --- grid power timeline
    const gridOff = b => lerp(TL.gridStart, TL.gridEnd, clamp((b - bearingMin) / (bearingMax - bearingMin)));
    for (const p of powered) {
      const offAt = gridOff(p.bearing) + (hash(p.seed, 3) - 0.5) * 0.5;
      let v = power(t, offAt, Infinity, p.seed) * p.on;
      if (t > TL.restore + 1.5) { // a few flicker back after the reboot
        const back = hash(p.seed, 8) < 0.22, at = TL.restore + 2 + hash(p.seed, 9) * 7;
        if (back && t > at) v = p.on * (0.35 + 0.4 * hash(p.seed, 10)) * (hash(frameIndex(t) >> 2, p.seed) > 0.12 ? 1 : 0.2);
      }
      p.material[p.prop] = v;
    }
    for (const tw of towers) {
      const v = power(t, TL.gridEnd + 0.3 + (tw.x > -40 ? 0.25 : 0), Infinity, 41);
      tw.m.emissiveIntensity = 1.1 * v; tw.tip.material.opacity = v * (0.6 + 0.4 * Math.sin(t * 3));
    }
    for (const l of lamps) {
      const v = power(t, gridOff(l.bearing) - 0.2, Infinity, 5);
      l.head.material.color.setHex(v ? 0xffd9a0 : 0x2a2a2a); l.g.material.opacity = v;
    }
    streetLight.intensity = 2.0 * power(t, TL.gridStart + 1.0, Infinity, 6);
    shopLight.intensity = 3.2 * Math.max(power(t, TL.shopDark, Infinity, 7), 0.0);
    // after restore, our shop flickers back weakly
    if (t > TL.restore + 6.5) shopLight.intensity = 1.3 * (hash(frameIndex(t) >> 1, 77) > 0.08 ? 1 : 0.3);

    // --- sky / fog / ambience
    const dark = smooth(TL.gridStart, TL.gridEnd + 0.8, t);
    const cold = smooth(TL.vanishStart, TL.chipsDie + 2, t);
    skyU.top.value.copy(col(0x26305e, 0x141a3e, dark));
    skyU.horizon.value.copy(col(col(0x7a4a66, 0x4a4a70, cold).getHex(), 0x2e3462, dark));
    if (t > TL.restore) { skyU.top.value.copy(col(0x141a3e, 0x241e58, smooth(TL.restore, TL.restore + 3, t))); skyU.horizon.value.copy(col(0x2e3462, 0x5a3c7a, smooth(TL.restore, TL.restore + 3, t))); }
    skyU.glow.value = lerp(1, 0.05, dark) + (t > TL.restore ? 0.15 * smooth(TL.restore + 2, TL.restore + 9, t) : 0);
    scene.fog.color.copy(skyU.horizon.value);
    stars.material.opacity = lerp(0.15, 1, smooth(TL.gridEnd - 1, TL.gridEnd + 2, t));
    hemi.intensity = lerp(1.1, 0.75, dark);
    moonLight.intensity = lerp(0.5, 1.4, dark);
    moonGlow.material.opacity = lerp(0.35, 0.8, dark);

    // --- LRT
    train.position.x = trainPos(t);
    const tOn = power(t, TL.trainStop, Infinity, 9);
    trainWin.emissiveIntensity = 0.9 * tOn; trainLamp.material.opacity = tOn;

    // --- cars
    const travel = carTravel(t);
    const carLights = power(t, TL.phoneDark, Infinity, 12);
    for (const c of cars) {
      const L = 140; const x = ((c.offset + c.speed * travel) % L) - L / 2;
      c.g.position.x = c.dir * x; c.head.material.opacity = carLights; c.tail.material.opacity = carLights * 0.9;
    }

    // --- traffic light: cycles, freezes on red at chipsDie, dies with the grid
    let phase = Math.floor(t / 3.2) % 3; // 0 green 1 amber 2 red
    if (t >= TL.chipsDie) phase = 2;
    const tlPow = power(t, TL.gridStart + 0.6, Infinity, 15);
    tlLamps.forEach((l, k) => {
      const on = tlPow && ((phase === 0 && k === 2) || (phase === 1 && k === 1) || (phase === 2 && k === 0));
      l.m.color.copy(on ? l.c : new THREE.Color(0x1a1a1a)); l.gl.material.opacity = on ? 1 : 0;
    });

    // --- people: idle bob; look around in scene 2; glance up at blackout
    for (const p of people) {
      const s = p.seed;
      let yaw = Math.sin(t * 0.7 + s) * 0.15;
      const lookAround = smooth(TL.vanishStart + 0.8, TL.vanishStart + 2, t) * (1 - smooth(TL.gridStart, TL.gridStart + 2, t));
      yaw += lookAround * Math.sin(t * 1.6 + s * 2) * 0.7;
      p.headG.rotation.y = yaw;
      p.headG.rotation.x = -smooth(TL.gridStart + s * 0.3, TL.gridStart + 1 + s * 0.3, t) * 0.4 + lookAround * 0.1;
      p.g.position.y = Math.sin(t * 1.4 + s) * 0.006;
    }
    if (people[6]) people[6].g.position.x = 2.6 - Math.min(t, TL.vanishStart + 1) * 0.12;

    // --- text planes
    for (const p of digitPlanes) redraw(p, t);
    drawLED(t);
    if (t >= TL.restore) phoneScreen.material.color.setScalar(1);

    // --- particles
    for (const q of particles) {
      const dt = t - q.t0;
      if (dt < 0 || dt > 3.2 || t >= TL.restore) { q.s.visible = false; continue; }
      q.s.visible = true;
      const r1 = hash(q.seed, 1) - 0.5, r2 = hash(q.seed, 2), r3 = hash(q.seed, 3) - 0.5;
      const sc = q.size > 0.2 ? 6 : 1;
      q.s.position.set(q.p0.x + r1 * dt * 0.5 * sc + Math.sin(dt * 3 + q.seed) * 0.02 * sc,
                       q.p0.y + (0.35 + r2 * 0.5) * dt * sc + 0.08 * dt * dt * sc,
                       q.p0.z + r3 * dt * 0.3 * sc);
      const k = 1 + dt * 1.2;
      q.s.scale.set(q.size * k, q.size * k, 1);
      q.s.material.rotation = r1 * dt * 3;
      q.s.material.opacity = (1 - smooth(1.2, 3.2, dt)) * (dt < 0.1 ? dt / 0.1 : 1);
    }

    // --- icon cubes: spin; break apart when numbers vanish; reassemble on restore
    const ex = smooth(TL.vanishStart + 0.1, TL.vanishStart + 1.6, t) * (1 - smooth(TL.restore, TL.restore + 0.9, t));
    const iconVis = t < TL.vanishStart + 1.6 || t > TL.restore ? 1 : 0;
    const iconFadeOut = 1 - smooth(46.5, 47.8, t);
    iconGroup.visible = iconVis > 0 && iconFadeOut > 0.01;
    iconGroup.rotation.y = Math.sin(t * 0.8) * 0.35;
    cubes.forEach((c, k) => {
      const a = (k - 1);
      c.position.set(a * 0.4 + a * ex * 1.4, ex * (0.6 + k * 0.25) * (k === 1 ? 1.4 : 1), ex * (k - 1) * 0.8);
      c.rotation.set(t * 0.9 + ex * (k + 1) * 3, t * 1.3 + k + ex * 4, ex * 2);
      c.material.opacity = (1 - ex) * iconFadeOut;
      c.scale.setScalar(1 - ex * 0.5);
    });
    const ra = t * 2.2;
    ring.material.opacity = (1 - ex) * 0.8 * iconFadeOut; ringDot.material.opacity = ring.material.opacity;
    ringDot.position.set(Math.cos(ra) * 0.75, Math.sin(ra) * 0.75 * Math.cos(1.25), Math.sin(ra) * 0.75 * Math.sin(1.25));
  }

  // ------------------------------------------------------ 2D effects layer
  const glCanvas = renderer.domElement;
  function drawFx(g, t, w, h) {
    // RGB slice glitch bursts
    const bursts = [[TL.vanishStart, 0.5], [TL.vanishStart + 0.5, 0.25], [TL.vanishStart + 1.0, 0.3], [TL.chipsDie, 0.6], [TL.phoneDark, 0.3], [TL.restore - 0.3, 0.25]];
    for (const [bt, dur] of bursts) {
      if (t < bt || t > bt + dur) continue;
      const f = frameIndex(t);
      for (let i = 0; i < 7; i++) {
        const y = hash(f, i) * h, sh = 20 + hash(f, i + 20) * 120, dx = (hash(f, i + 40) - 0.5) * 120;
        g.drawImage(glCanvas, 0, y, w, sh, dx, y, w, sh);
        g.fillStyle = i % 2 ? 'rgba(255,40,80,.12)' : 'rgba(60,160,255,.12)'; g.fillRect(0, y, w, sh);
      }
    }
    // binary rain: "kosong dan satu" then it shatters when the chips die
    const b0 = 20.6, b1 = TL.chipsDie, b2 = TL.chipsDie + 1.6;
    if (t > b0 && t < b2) {
      g.font = '600 34px HudSans'; g.textAlign = 'center';
      const cols = 22;
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * w / cols;
        const speed = 900 + hash(c, 1) * 900, start = hash(c, 2) * 1400;
        for (let r = 0; r < 18; r++) {
          let y = ((t - b0) * speed + start - r * 44) % (h + 800) - 400;
          if (y < -40 || y > h) continue;
          let a = (1 - r / 18) * smooth(b0, b0 + 0.3, t);
          let xx = x;
          if (t > b1) { const dt = t - b1; y += dt * dt * 1800 * (0.5 + hash(c, r)); xx += (hash(r, c) - 0.5) * dt * 500; a *= 1 - smooth(0, 1.6, dt); }
          g.fillStyle = `rgba(143,184,240,${a * 0.75})`;
          g.fillText(hash(c * 31 + r, Math.floor(t * 12)) > 0.5 ? '1' : '0', xx, y);
        }
      }
    }
    // dark vignette breathing during blackout
    const d = smooth(TL.gridEnd - 0.5, TL.gridEnd + 1.5, t) * (1 - smooth(TL.restore - 0.1, TL.restore, t));
    if (d > 0) { g.fillStyle = `rgba(0,0,8,${0.18 * d})`; g.fillRect(0, 0, w, h); }
  }

  function flash(t) {
    if (t > TL.vanishStart && t < TL.vanishStart + 0.25) return 0.25 * (1 - (t - TL.vanishStart) / 0.25);
    if (t < TL.restore - 0.2 || t > TL.restore + 1.6) return 0;
    if (t < TL.restore) return smooth(TL.restore - 0.2, TL.restore, t);
    return 1 - smooth(TL.restore + 0.15, TL.restore + 1.6, t);
  }

  function grade(t) {
    const sat = kf([[0, 1.05], [TL.vanishStart, 1.05], [12, 0.85], [TL.chipsDie, 0.8], [25, 0.55], [TL.restore, 0.6], [42, 0.75]], t);
    const bri = kf([[0, 1], [TL.gridStart, 1], [TL.gridEnd + 1, 0.9], [TL.restore, 0.9], [TL.restore + 2, 1]], t);
    const con = kf([[0, 1.05], [TL.chipsDie, 1.1], [TL.gridEnd, 1.15], [TL.restore + 2, 1.05]], t);
    return `saturate(${sat.toFixed(3)}) brightness(${bri.toFixed(3)}) contrast(${con.toFixed(3)})`;
  }

  return { scene, camera, update, icon, drawFx, flash, grade };
}
