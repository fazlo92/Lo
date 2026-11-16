// "Apa jadi kalau semua orang di Malaysia dapat RM 1 juta esok?" — Kuching, many locations.
// Each location is a THREE.Group ("set"); only the active one is visible. update(t) is pure in t.
import { kit } from '/engine/lib3d.js';

export async function create({ THREE, renderer, script, U }) {
  const { clamp, lerp, smooth, easeOut, hash, mulberry32, frameIndex } = U;
  const K = kit(THREE, U);
  const { box, cyl, sphere, plane, ground, canvasTex, texMat, glow, kf, flicker, windowTex, person, animatePeople, SHIRTS, SKINS } = K;
  const E = script.events;
  const W = script.width, H = script.height;
  const rand = mulberry32(2024);
  const SC = Object.fromEntries(script.scenes.map(s => [s.id, s]));
  const scene = new THREE.Scene();

  // ---------------------------------------------------------------- camera, sky, lights
  const camera = new THREE.PerspectiveCamera(75, W / H, 0.05, 5000);
  scene.add(camera);
  const skyU = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, glowCol: { value: new THREE.Color() }, glow: { value: 0 } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 top, horizon, glowCol; uniform float glow; varying vec3 vD;
      void main(){ float h = vD.y; vec3 c = mix(horizon, top, smoothstep(-0.02, 0.5, h));
        c += glowCol * glow * exp(-max(h,0.)*7.) * 0.7; gl_FragColor = vec4(c,1.); }`,
  })));
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 700; i++) { const th = rand() * 6.283, y = 0.08 + rand() * 0.9, r = Math.sqrt(1 - y * y); sp.push(Math.cos(th) * r * 3500, y * 3500, Math.sin(th) * r * 3500); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
  scene.add(stars);
  // clouds (shared, recoloured per set)
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x888888, fog: false });
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group(); const a = -0.9 + rand() * 1.8, d = 900 + rand() * 900;
    c.position.set(Math.sin(a) * d, 180 + rand() * 260, -Math.cos(a) * d);
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(40 + rand() * 50, 0), cloudMat); s.position.set((k - 2) * 50 + rand() * 20, rand() * 25, rand() * 30); s.scale.y = 0.55; c.add(s); }
    clouds.add(c);
  }
  scene.fog = new THREE.Fog(0xffffff, 80, 1600);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1); scene.add(sun); scene.add(sun.target);

  // ---------------------------------------------------------------- hands + phone (camera rig)
  const rig = new THREE.Group(); camera.add(rig);
  const skin = 0xc68a5f, sleeve = 0x2d4a3e;
  const handL = new THREE.Group(); handL.position.set(-0.085, -0.17, -0.46); handL.rotation.set(0.3, 0.22, 0.1); rig.add(handL);
  box(handL, 0.11, 0.42, 0.1, sleeve, -0.02, -0.33, 0.02).rotation.x = -0.15;
  box(handL, 0.09, 0.11, 0.04, skin, 0, -0.07, -0.012);
  box(handL, 0.025, 0.07, 0.03, skin, 0.055, -0.02, 0.005).rotation.z = -0.5;
  box(handL, 0.078, 0.158, 0.009, 0x16181c, 0, 0.02, 0.012);
  for (let k = 0; k < 3; k++) box(handL, 0.016, 0.022, 0.02, skin, -0.044, -0.02 + k * 0.026, 0.0);
  const phoneT = canvasTex(256, 540);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), new THREE.MeshBasicMaterial({ map: phoneT.tex }));
  phoneScreen.position.set(0, 0.02, 0.0172); handL.add(phoneScreen);
  // right hand (only used at night scene to reach the bowl)
  const handR = new THREE.Group(); rig.add(handR);
  box(handR, 0.12, 0.45, 0.11, sleeve, 0, -0.26, 0.05).rotation.x = -0.4;
  box(handR, 0.1, 0.06, 0.12, skin, 0, 0.0, -0.04);
  for (let k = 0; k < 4; k++) box(handR, 0.02, 0.02, 0.07, skin, -0.035 + k * 0.023, -0.01, -0.12);

  const money = v => 'RM ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function drawPhone(t) {
    const g = phoneT.ctx; const w = 256, h = 540;
    if (t < E.notif) {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#3b5d8f'); grd.addColorStop(1, '#d98c5f');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '600 64px HudSans'; g.fillText('7:02', 128, 150);
      g.font = '600 18px HudSans'; g.fillText('Sabtu, 15 November', 128, 182); g.textAlign = 'left';
    } else {
      g.fillStyle = '#f4f6f9'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#0f7a55'; g.fillRect(0, 0, w, 150);
      g.fillStyle = '#fff'; g.font = '700 24px HudSans'; g.fillText('BANK', 20, 44);
      g.font = '600 16px HudSans'; g.globalAlpha = 0.85; g.fillText('Baki akaun semasa', 20, 92); g.globalAlpha = 1;
      // balance with zero-cut animation
      const cut = smooth(E.balanceCut, E.balanceCut + 0.6, t);
      g.font = '700 30px HudSans';
      if (cut < 1) {
        const full = 'RM 1,000,000.00'; let x = 20;
        for (let i = 0; i < full.length; i++) {
          const c = full[i]; const doomed = i >= 5 && i <= 8; // ",000"
          g.globalAlpha = doomed ? 1 - cut : 1; g.fillStyle = '#fff';
          g.fillText(c, x, 130 - (doomed ? cut * 30 : 0)); x += g.measureText(c).width * (doomed ? 1 - cut : 1);
        }
        g.globalAlpha = 1;
      } else g.fillText('RM 1,000.00', 20, 130);
      g.fillStyle = '#6b7280'; g.font = '600 16px HudSans'; g.fillText('Transaksi terkini', 20, 190);
      const rows = [['Kerajaan Malaysia', '+1,000,000.00', '#0f7a55']];
      if (t > SC.india.start) rows.push(['Kedai Emas', '-8,450.00', '#c0392b']);
      if (t > SC.vivacity.start) rows.push(['Pusat beli-belah', '-12,980.00', '#c0392b']);
      if (t > SC.airport.start) rows.push(['Tiket penerbangan', '-4,200.00', '#c0392b']);
      rows.slice(-4).reverse().forEach(([a, b, c], k) => {
        const y = 222 + k * 56; g.fillStyle = '#fff'; g.fillRect(14, y, 228, 46);
        g.fillStyle = '#111'; g.font = '600 14px HudSans'; g.fillText(a, 24, y + 28);
        g.fillStyle = c; g.textAlign = 'right'; g.fillText(b, 234, y + 28); g.textAlign = 'left';
      });
      // notification banner
      const nb = smooth(E.notif, E.notif + 0.35, t) * (1 - smooth(E.notif + 3.6, E.notif + 4.0, t));
      if (nb > 0) {
        const y = -90 + nb * 104;
        g.fillStyle = 'rgba(255,255,255,.97)'; g.beginPath(); g.roundRect(10, y, 236, 84, 16); g.fill();
        g.fillStyle = '#0f7a55'; g.beginPath(); g.roundRect(22, y + 14, 28, 28, 7); g.fill();
        g.fillStyle = '#111'; g.font = '700 15px HudSans'; g.fillText('BANK · Wang diterima', 60, y + 32);
        g.fillStyle = '#0f7a55'; g.font = '700 20px HudSans'; g.fillText('+RM 1,000,000.00', 22, y + 66);
      }
    }
    phoneT.tex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- set registry
  const sets = {};
  function makeSet(name) { const g = new THREE.Group(); g.visible = false; scene.add(g); sets[name] = { g, update: () => {} }; return sets[name]; }

  // pleated (DUN-style) roof: zig-zag cone
  function pleatedCone(R, Hh, n, color, droop = 0.12, inner = 0.8) {
    const pos = [];
    const ring = [];
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * Math.PI * 2, out = i % 2 === 0;
      ring.push([Math.cos(a) * R * (out ? 1 : inner), out ? 0 : Hh * droop, Math.sin(a) * R * (out ? 1 : inner)]);
    }
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      pos.push(...a, 0, Hh, 0, ...b);          // outer face
      pos.push(...b, 0, Hh * droop * 0.6, 0, ...a); // underside
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide }));
  }
  function tree(parent, x, z, s = 1, col = 0x3f6b35) {
    cyl(parent, 0.25 * s, 0.35 * s, 3 * s, 6, 0x5a4232, x, 1.5 * s, z);
    for (let k = 0; k < 3; k++) sphere(parent, (1.6 - k * 0.3) * s, col, x + (k - 1) * 0.8 * s, (3.4 + k * 0.6) * s, z + (k % 2) * 0.5 * s);
  }
  // stainless mee kolok stall (shared by "gerai" and night scene)
  function meeKolokStall(parent, priceText) {
    const g = new THREE.Group(); parent.add(g);
    const steel = new THREE.MeshLambertMaterial({ color: 0xc9cdd2 });
    box(g, 1.8, 0.95, 0.8, steel, 0, 0.62, 0);
    for (const x of [-0.8, 0.8]) for (const z of [-0.3, 0.3]) cyl(g, 0.06, 0.06, 0.06, 8, 0x222222, x, 0.05, z).rotation.x = Math.PI / 2;
    box(g, 1.85, 0.05, 0.85, 0xb5b9be, 0, 1.12, 0);
    for (const x of [-0.88, 0.88]) box(g, 0.04, 1.0, 0.04, 0xb5b9be, x, 1.62, 0.36);
    for (const x of [-0.88, 0.88]) box(g, 0.04, 1.0, 0.04, 0xb5b9be, x, 1.62, -0.36);
    const glass = new THREE.MeshLambertMaterial({ color: 0xdbe8ee, transparent: true, opacity: 0.25 });
    box(g, 1.76, 0.95, 0.01, glass, 0, 1.62, 0.37);
    const sign = texMat((c, w, h) => {
      const grd = c.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#f5e663'); grd.addColorStop(0.5, '#9fe08a'); grd.addColorStop(1, '#7fd6e6');
      c.fillStyle = grd; c.fillRect(0, 0, w, h);
      c.font = '900 92px HudSans'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = 16; c.strokeStyle = '#fff'; c.strokeText('MEE KOLOK', w / 2, h / 2 + 4);
      c.fillStyle = '#e8402f'; c.fillText('MEE KOLOK', w / 2, h / 2 + 4);
    }, 640, 170);
    box(g, 1.9, 0.5, 0.06, 0xb5b9be, 0, 2.35, 0.36); const sp = plane(g, 1.86, 0.46, sign, 0, 2.35, 0.395);
    const tube = box(g, 1.2, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), 0, 2.64, 0.38);
    const tubeGlow = glow(g, 0xfff3c0, 0.9, 0, 2.6, 0.45);
    // menu cards with price stickers (redrawn by caller)
    const menu = canvasTex(256, 300);
    const menuMesh = plane(g, 0.62, 0.72, new THREE.MeshLambertMaterial({ map: menu.tex }), 0.5, 1.62, 0.38);
    const drawMenu = (price) => {
      const c = menu.ctx; c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, 256, 300);
      const items = [['#f2c46d', 0, 0], ['#e66b4a', 128, 0], ['#f0d9a0', 0, 150], ['#e88a5a', 128, 150]];
      items.forEach(([col, x, y], k) => {
        c.fillStyle = '#ffffff'; c.fillRect(x + 6, y + 6, 116, 138);
        c.fillStyle = col; c.beginPath(); c.ellipse(x + 64, y + 84, 46, 34, 0, 0, 7); c.fill();
        c.fillStyle = '#c0392b'; c.beginPath(); c.ellipse(x + 92, y + 30, 32, 20, 0, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.font = '800 20px HudSans'; c.textAlign = 'center'; c.fillText(k === 0 ? price : '', x + 92, y + 37);
      });
      c.textAlign = 'left'; menu.tex.needsUpdate = true;
    };
    drawMenu(priceText);
    const tutup = texMat((c, w, h) => { c.fillStyle = '#c8a879'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1d10'; c.font = '700 74px HudSans'; c.textAlign = 'center'; c.fillText('TUTUP', w / 2, h / 2 + 26); }, 300, 160);
    const tutupMesh = plane(g, 0.62, 0.33, tutup, -0.4, 1.55, 0.39);
    tutupMesh.visible = false;
    return { g, tube, tubeGlow, drawMenu, tutupMesh };
  }
  const bowl = (parent, x, y, z) => {
    const b = new THREE.Group(); b.position.set(x, y, z); parent.add(b);
    cyl(b, 0.09, 0.055, 0.06, 12, 0xf3f1ea, 0, 0.03, 0);
    cyl(b, 0.082, 0.082, 0.01, 12, 0xe8c66a, 0, 0.058, 0);
    for (let k = 0; k < 3; k++) box(b, 0.04, 0.008, 0.025, 0xb5402c, -0.03 + k * 0.03, 0.066, 0.01 * k);
    sphere(b, 0.012, 0x4f9a3a, 0.03, 0.068, -0.03);
    return b;
  };
  const brickMat = texMat((c, w, h) => {
    c.fillStyle = '#8f8379'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) {
      c.fillStyle = ['#a39486', '#978a7e', '#8a7d72', '#ab9d90'][(x * 7 + y * 3) % 4];
      c.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14);
    }
  }, 256, 256, { repeat: [20, 6] });

  // ================================================================= SET: river (tebingan, jeti, malam, cta)
  const river = makeSet('river');
  {
    const g = river.g;
    ground(g, 80, 8, brickMat, 0, 0, -0.5);
    // railing
    const railPanel = texMat((c, w, h) => {
      c.clearRect(0, 0, w, h); c.strokeStyle = '#141414'; c.lineWidth = 7;
      c.strokeRect(4, 4, w - 8, h - 8);
      for (let i = 0; i < 4; i++) { const cx = 32 + i * 64; c.beginPath(); c.arc(cx, h / 2, 26, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx - 32, 4); c.lineTo(cx + 32, h - 4); c.moveTo(cx + 32, 4); c.lineTo(cx - 32, h - 4); c.stroke(); }
    }, 256, 80, { transparent: true, alphaTest: 0.4 });
    railPanel.side = THREE.DoubleSide;
    for (let x = -40; x < 40; x += 2) {
      box(g, 0.08, 1.1, 0.08, 0x151515, x, 0.55, -4.3);
      sphere(g, 0.06, 0x151515, x, 1.13, -4.3);
      plane(g, 1.92, 0.62, railPanel, x + 1, 0.55, -4.3);
    }
    box(g, 80, 0.06, 0.08, 0x151515, 0, 1.05, -4.3); box(g, 80, 0.05, 0.06, 0x151515, 0, 0.2, -4.3);
    box(g, 80, 1.6, 0.3, 0x6f6a63, 0, -0.8, -4.5);
    // lamp posts + lantern strings
    const lampGlows = [], lanterns = [];
    const posts = [-3.5, -11, -18.5, -26, -33.5];
    for (const x of posts) {
      cyl(g, 0.07, 0.11, 4.4, 8, 0x151515, x, 2.2, -3.9);
      const head = sphere(g, 0.24, new THREE.MeshBasicMaterial({ color: 0xf6f3ea }), x, 4.55, -3.9, 1);
      lampGlows.push({ head, gl: glow(g, 0xffe2a8, 2.4, x, 4.55, -3.9) });
    }
    const lanternMat = new THREE.MeshLambertMaterial({ color: 0xd8262a, emissive: 0x6a0a0a });
    for (let p = 0; p < posts.length - 1; p++) {
      const a = posts[p], b = posts[p + 1];
      for (let k = 1; k < 9; k++) {
        const u = k / 9, x = lerp(a, b, u), y = 4.3 - Math.sin(u * Math.PI) * 1.0;
        lanterns.push(sphere(g, 0.13, lanternMat, x, y, -3.9, 0));
      }
    }
    const wireMat = new THREE.LineBasicMaterial({ color: 0x222222 });
    const wire = pts => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    for (let p = 0; p < posts.length - 1; p++) wire(Array.from({ length: 11 }, (_, k) => { const u = k / 10; return new THREE.Vector3(lerp(posts[p], posts[p + 1], u), 4.3 - Math.sin(u * Math.PI) * 1.0 + 0.13, -3.9); }));
    wire(Array.from({ length: 11 }, (_, k) => { const u = k / 10; return new THREE.Vector3(lerp(-3.5, 1.5, u), 4.3 + u * 2.6 - Math.sin(u * Math.PI) * 0.7 + 0.13, lerp(-3.9, -1.8, u)); }));
    for (let k = 1; k < 9; k++) { const u = k / 9; lanterns.push(sphere(g, 0.13, lanternMat, lerp(-3.5, 1.5, u), 4.3 + u * 2.6 - Math.sin(u * Math.PI) * 0.7, lerp(-3.9, -1.8, u), 0)); }
    // big tree canopy framing the top
    cyl(g, 0.35, 0.5, 6, 7, 0x3d2f25, 2.6, 3, -1.2);
    for (let k = 0; k < 9; k++) sphere(g, 2.2 + rand() * 1.4, k % 2 ? 0x1f3a22 : 0x284a2a, -4 + k * 1.3 + rand(), 7 + rand() * 1.8, -1 - rand() * 4, 0);
    // river (animated low-poly water)
    const wgeo = new THREE.PlaneGeometry(400, 140, 40, 20); wgeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wgeo, new THREE.MeshLambertMaterial({ color: 0x5f7a66, flatShading: true }));
    water.position.set(0, -1.2, -74); g.add(water);
    const wBase = wgeo.attributes.position.array.slice();
    // far bank
    box(g, 400, 2.4, 3, 0x8a8a84, 0, -0.2, -142);
    const slope = box(g, 400, 1, 40, 0x5d9a45, 0, 4, -160); slope.rotation.x = 0.22;
    ground(g, 600, 300, 0x4f8a3e, 0, 8.2, -360);
    for (let i = 0; i < 26; i++) { const x = -160 + i * 13 + rand() * 6; if (Math.abs(x - 30) < 50) continue; tree(g, x, -215 - rand() * 40, 3 + rand() * 2, [0x3f6b35, 0x4d7d3c, 0x355e2e][i % 3]); }
    // pavilion tower (left)
    box(g, 7, 22, 7, 0xe9e2d2, -70, 9, -205); const pr = new THREE.Mesh(new THREE.ConeGeometry(6.5, 6, 4), K.mat(0x6d7f8f)); pr.position.set(-70, 23, -205); pr.rotation.y = Math.PI / 4; g.add(pr);
    // DUN building
    const dun = new THREE.Group(); dun.position.set(44, 8, -175); dun.scale.setScalar(0.9); g.add(dun);
    box(dun, 90, 4, 60, 0xe7e1d6, 0, 2, 0);
    const body = cyl(dun, 24, 24, 16, 18, texMat((c, w, h) => { c.fillStyle = '#efe8dc'; c.fillRect(0, 0, w, h); for (let i = 0; i < 36; i++) { c.fillStyle = '#d99a8c'; c.fillRect(i * w / 36 + 4, h * 0.25, w / 36 - 8, h * 0.6); } }, 512, 128), 0, 12, 0);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, x = Math.cos(a) * 27, z = Math.sin(a) * 27;
      for (const s of [-1, 1]) { const col = box(dun, 0.9, 19, 0.9, 0xf6f2ea, x, 13, z); col.rotation.set(0, -a, s * 0.32); col.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0); }
    }
    const roof1 = pleatedCone(34, 9, 9, 0xd4a03c, 0.25, 0.78); roof1.position.y = 22; dun.add(roof1);
    cyl(dun, 15, 16, 7, 18, 0xe9dfcf, 0, 30, 0);
    const roof2 = pleatedCone(23, 40, 9, 0xd9a443, 0.12, 0.72); roof2.position.y = 33; dun.add(roof2);
    cyl(dun, 0.4, 1.4, 14, 6, 0xc28f37, 0, 79, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.3, x = Math.cos(a) * 40, z = Math.sin(a) * 26; box(dun, 5, 4, 5, 0xefe8dc, x, 6, z); const pc = pleatedCone(5, 4.5, 6, 0xd4a03c, 0.15, 0.8); pc.position.set(x, 8, z); dun.add(pc); }
    const dunLights = glow(g, 0xffd9a0, 60, 30, 22, -230); dunLights.material.opacity = 0;
    // sampan
    const sampan = new THREE.Group(); g.add(sampan);
    box(sampan, 5, 0.6, 1.4, 0x2f6fb5, 0, 0, 0); box(sampan, 1.8, 0.9, 1.2, 0x2a5a90, -0.6, 0.7, 0);
    box(sampan, 2.2, 0.08, 1.5, 0xe8e2d0, -0.6, 1.2, 0);
    // people on promenade
    const promPeople = [];
    promPeople.push(person(g, -7, -2.6, 0.4, { shirt: 0xd77a9a, skin: SKINS[0], phone: true, seed: 1 }));
    promPeople.push(person(g, -9.5, -3.2, -0.6, { shirt: 0x3e5a8c, skin: SKINS[1], phone: true, seed: 2 }));
    promPeople.push(person(g, -14, -2.4, 0.2, { shirt: 0xe0d4b8, skin: SKINS[2], phone: true, seed: 3 }));
    promPeople.push(person(g, -5, -1.0, 1.2, { shirt: 0x2f8f8a, skin: SKINS[3], walk: { dir: { x: 1, z: 0 }, speed: 0.9, span: 12 }, seed: 4 }));
    // jetty + fare board (jeti)
    const jetty = new THREE.Group(); g.add(jetty); jetty.position.set(-16, 0, -4.3);
    box(jetty, 3, 0.2, 14, 0x7a5a3a, 0, -0.2, -7);
    for (let k = 0; k < 6; k++) for (const x of [-1.4, 1.4]) cyl(jetty, 0.12, 0.12, 3, 6, 0x5a4230, x, -1.4, -1 - k * 2.6);
    const moored = new THREE.Group(); jetty.add(moored); moored.position.set(2.8, -0.9, -9); moored.rotation.y = Math.PI / 2;
    box(moored, 5, 0.6, 1.4, 0x2f6fb5, 0, 0, 0); box(moored, 1.8, 0.9, 1.2, 0x2a5a90, -0.6, 0.7, 0); box(moored, 2.2, 0.08, 1.5, 0xe8e2d0, -0.6, 1.2, 0);
    const fareT = canvasTex(400, 300);
    box(g, 0.1, 2.0, 0.1, 0x3a2a1a, -13.2, 1.0, -3.3);
    const fareMesh = plane(g, 1.3, 0.98, new THREE.MeshLambertMaterial({ map: fareT.tex }), -13.2, 2.1, -3.24);
    const drawFare = t => {
      const c = fareT.ctx; c.fillStyle = '#f2ead6'; c.fillRect(0, 0, 400, 300); c.strokeStyle = '#2b4f86'; c.lineWidth = 12; c.strokeRect(6, 6, 388, 288);
      c.fillStyle = '#2b4f86'; c.font = '800 40px HudSans'; c.textAlign = 'center'; c.fillText('TAMBANG', 200, 70); c.fillText('PENAMBANG', 200, 116);
      const k = smooth(E.fare - 0.2, E.fare + 0.3, t);
      c.fillStyle = '#111'; c.font = '800 86px HudSans'; c.fillText('RM 1', 200, 220);
      if (k > 0) {
        c.strokeStyle = '#c0392b'; c.lineWidth = 10; c.beginPath(); c.moveTo(110, 194); c.lineTo(110 + 180 * k, 194); c.stroke();
        c.save(); c.translate(250, 270); c.rotate(-0.08); c.fillStyle = '#c0392b'; c.font = '800 58px HudSans'; c.globalAlpha = k; c.fillText('RM 100', 0, 0); c.restore();
      }
      c.textAlign = 'left'; fareT.tex.needsUpdate = true;
    };
    // night stall + bowl
    const nightStall = meeKolokStall(g, 'RM 5'); nightStall.g.position.set(1.7, 0, -3.6); nightStall.g.rotation.y = -0.35;
    const nightBowl = bowl(nightStall.g, -0.35, 1.15, 0.12);

    river.update = (t, mode) => {
      // water waves
      const p = wgeo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) p[i + 1] = wBase[i + 1] + Math.sin(wBase[i] * 0.08 + t * 1.3) * 0.18 + Math.cos(wBase[i + 2] * 0.11 + t * 0.9) * 0.15;
      wgeo.attributes.position.needsUpdate = true; wgeo.computeVertexNormals();
      sampan.position.set(-60 + ((t * 2.2) % 120), -0.9, -70); sampan.rotation.y = 0;
      const night = mode === 'night';
      water.material.color.setHex(night ? 0x1c2638 : mode === 'jeti' ? 0x6b6a52 : 0x5f7a66);
      lanternMat.emissive.setHex(night ? 0x0 : 0x6a0a0a); lanternMat.color.setHex(night ? 0x4a1414 : 0xd8262a);
      for (const l of lampGlows) { l.gl.material.opacity = night ? 0.55 : 0.0; l.head.material.color.setHex(night ? 0xffe8c0 : 0xf6f3ea); }
      jetty.visible = mode === 'jeti'; fareMesh.visible = mode === 'jeti'; if (mode === 'jeti') drawFare(t);
      nightStall.g.visible = night;
      if (night) { nightStall.tube.material.color.setHex(0xfff6d8); nightStall.tubeGlow.material.opacity = 0.35 + 0.25 * (hash(frameIndex(t) >> 2, 3) > 0.1 ? 1 : 0.3); }
      dunLights.material.opacity = 0;
      // promenade people look at their phones after the notification
      for (const pp of promPeople) if (!pp.walk) { pp.armL.rotation.x = -1.2 * smooth(E.notif + 0.5, E.notif + 1.5, t); pp.head.rotation.x = 0.3 * smooth(E.notif + 0.5, E.notif + 1.5, t); }
    };
  }

  // ================================================================= SET: India Street
  const india = makeSet('india');
  const goldItems = [];
  let soldSign;
  {
    const g = india.g;
    ground(g, 14, 90, texMat((c, w, h) => { c.fillStyle = '#b9ab98'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a39582'; c.lineWidth = 3; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); } }, 256, 256, { repeat: [4, 24] }), 0, 0, -40);
    const cols = ['#efe2c4', '#cfe3d4', '#f0c9b4', '#f3e7a6', '#d8d4ec', '#f6efe4'];
    for (const side of [-1, 1]) for (let i = 0; i < 16; i++) {
      const z = -2 - i * 4.2, x = side * 5.2;
      const fac = windowTex(40 + i + (side > 0 ? 100 : 0), 2, 2, cols[(i + (side > 0 ? 3 : 0)) % 6], '#3b3f48');
      const b = box(g, 3.2, 8, 4.1, fac, x, 4, z);
      box(g, 0.25, 3.2, 0.25, 0xf2ece0, side * 3.45, 1.6, z + 2.0);                 // five-foot-way column
      box(g, 0.6, 0.18, 4.1, 0xe2d6c4, side * 3.6, 3.3, z);                          // ledge
      box(g, 0.05, 2.3, 3.4, new THREE.MeshLambertMaterial({ color: 0x2a2018, emissive: 0xffd9a0, emissiveIntensity: 0.25 }), side * 3.58, 1.25, z);
      box(g, 0.08, 0.6, 3.0, K.mat([0xc0392b, 0x2b6cb0, 0x2f8f6a, 0xd9a443][(i + (side > 0 ? 1 : 0)) % 4]), side * 3.5, 2.85, z);
    }
    // canopy over the street
    const canMat = new THREE.MeshLambertMaterial({ color: 0xb8d6dc, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    for (let i = 0; i < 16; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 4.0, 10, 1, true, -Math.PI / 2, Math.PI), canMat); a.rotation.z = Math.PI / 2; a.position.set(0, 5.6, -2 - i * 4.2); g.add(a); box(g, 7.2, 0.12, 0.12, 0xdedad2, 0, 5.6, -0.1 - i * 4.2); }
    // gold shop on the right (near)
    const shopX = 3.0, shopZ = -6;
    const emasSign = texMat((c, w, h) => { c.fillStyle = '#8c1c1c'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c94c'; c.font = '800 96px HudSans'; c.textAlign = 'center'; c.fillText('KEDAI EMAS', w / 2, h / 2 + 34); }, 640, 160);
    const es = plane(g, 3.4, 0.85, emasSign, shopX + 0.4, 3.0, shopZ + 2.12); es.rotation.y = -Math.PI / 2 + 0.0; es.position.x = 3.42;
    const glassM = new THREE.MeshLambertMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0.3 });
    for (let c2 = 0; c2 < 2; c2++) {
      const cz = shopZ - 0.8 + c2 * 1.6;
      box(g, 0.7, 0.9, 1.3, 0x5a2a1a, 2.7, 0.45, cz);
      box(g, 0.7, 0.35, 1.3, glassM, 2.7, 1.08, cz);
      for (let k = 0; k < 10; k++) {
        const it = new THREE.Mesh(k % 3 ? new THREE.TorusGeometry(0.05, 0.015, 5, 10) : new THREE.BoxGeometry(0.08, 0.04, 0.12), new THREE.MeshLambertMaterial({ color: 0xf2c14e, emissive: 0x6b4a10 }));
        it.position.set(2.55 + (k % 2) * 0.28, 0.96, cz - 0.5 + Math.floor(k / 2) * 0.25); it.rotation.x = k % 3 ? 1.2 : 0;
        g.add(it); goldItems.push({ it, t: E.goldGone - 1.6 + hash(k + c2 * 10, 5) * 2.2 });
      }
    }
    soldSign = plane(g, 1.6, 0.5, texMat((c, w, h) => { c.fillStyle = '#c0392b'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 64px HudSans'; c.textAlign = 'center'; c.fillText('HABIS DIJUAL', w / 2, h / 2 + 22); }, 512, 160), 3.35, 2.1, shopZ);
    soldSign.rotation.y = -Math.PI / 2;
    // crowd
    for (let i = 0; i < 22; i++) {
      const lane = (i % 4 - 1.5) * 1.1, dir = i % 2 ? 1 : -1;
      person(g, lane, -21, dir > 0 ? Math.PI : 0, { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], hair: 0x161210, bag: [0xc0392b, 0xf2c94c, 0x2b6cb0, 0xffffff][i % 4], walk: { dir: { x: 0, z: dir }, speed: 1.1 + hash(i, 2) * 0.4, span: 30 }, seed: 10 + i });
    }
    india.update = t => {
      for (const gi of goldItems) gi.it.visible = t < gi.t;
      const k = easeOut(clamp((t - (E.goldGone + 1.2)) / 0.4));
      soldSign.visible = k > 0; soldSign.position.y = 2.6 - 0.5 * k; soldSign.rotation.z = (1 - k) * 0.3;
    };
  }

  // ================================================================= SET: Vivacity (exterior)
  const viv = makeSet('vivacity');
  {
    const g = viv.g;
    ground(g, 300, 200, 0x3b3c42, 0, 0, -60);
    for (let i = -6; i < 6; i++) box(g, 3, 0.02, 0.2, 0xe8e2d0, i * 7, 0.02, -14);
    box(g, 300, 0.25, 6, 0x9a948c, 0, 0.12, -24);
    const cubeTex = texMat((c, w, h) => {
      const s = 32, hh = s * Math.sqrt(3) / 2;
      c.fillStyle = '#2b2722'; c.fillRect(0, 0, w, h);
      for (let row = -1; row < h / (s * 1.5) + 1; row++) for (let col = -1; col < w / (hh * 2) + 1; col++) {
        const cx = col * hh * 2 + (row % 2) * hh, cy = row * s * 1.5;
        const face = (pts, f) => { c.fillStyle = f; c.beginPath(); c.moveTo(...pts[0]); pts.slice(1).forEach(p => c.lineTo(...p)); c.closePath(); c.fill(); };
        face([[cx, cy], [cx + hh, cy + s / 2], [cx, cy + s], [cx - hh, cy + s / 2]], '#f0c02e');
        face([[cx - hh, cy + s / 2], [cx, cy + s], [cx, cy + 2 * s], [cx - hh, cy + 1.5 * s]], '#8a5a2b');
        face([[cx + hh, cy + s / 2], [cx, cy + s], [cx, cy + 2 * s], [cx + hh, cy + 1.5 * s]], '#3a3530');
      }
    }, 512, 512, { repeat: [5, 2] });
    box(g, 70, 26, 40, cubeTex, 18, 13, -50);
    const pod = windowTex(77, 6, 4, '#d9b6b0', '#3b3f48'); box(g, 46, 18, 36, pod, -40, 9, -48);
    for (let k = 0; k < 4; k++) box(g, 6, 2.5, 0.3, K.mat([0xffffff, 0xd9d4cc, 0xe8e2d8, 0xc9c3ba][k]), -52 + k * 8, 14, -29.8);
    const condo = windowTex(88, 6, 16, '#eef0f2', '#8aa0b4');
    for (const [x, h2] of [[-30, 46], [-8, 52], [14, 50], [36, 44]]) box(g, 16, h2, 14, condo, x, 18 + h2 / 2, -58);
    for (let i = 0; i < 12; i++) tree(g, -50 + i * 9, -22, 1.4, 0x4d7d3c);
    // queue of shoppers carrying bags out of the mall
    for (let i = 0; i < 26; i++) person(g, -14 + i * 1.0, -27 + Math.sin(i) * 0.6, Math.PI / 2, { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], bag: [0xc0392b, 0xf2c94c, 0x2b6cb0, 0xffffff][i % 4], seed: 40 + i, walk: { dir: { x: -1, z: 0 }, speed: 0.6, span: 3 } });
    // trolleys
    for (let i = 0; i < 6; i++) { const tr = new THREE.Group(); tr.position.set(-6 + i * 3.3, 0, -25.5); g.add(tr); box(tr, 0.9, 0.6, 0.6, 0x9aa3ab, 0, 0.75, 0); for (let k = 0; k < 4; k++) box(tr, 0.3, 0.3, 0.3, [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71][k], -0.25 + (k % 2) * 0.4, 1.1 + Math.floor(k / 2) * 0.25, 0); }
    // traffic
    const cars = [];
    for (let i = 0; i < 6; i++) { const c = new THREE.Group(); g.add(c); box(c, 4.2, 1.0, 1.8, [0xc23b3b, 0xe8e8e8, 0x3a6fb5, 0x2b2b2b, 0xd9b44a, 0x7d8a8f][i], 0, 0.7, 0); box(c, 2.2, 0.7, 1.6, 0x24303f, 0, 1.45, 0); cars.push({ c, z: i % 2 ? -10 : -17, sp: (i % 2 ? 1 : -1) * (8 + i), off: i * 23 }); }
    viv.update = t => { for (const c of cars) c.c.position.set(((c.off + c.sp * t) % 160 + 160) % 160 - 80, 0, c.z); };
  }

  // ================================================================= SET: airport
  const airport = makeSet('airport');
  {
    const g = airport.g;
    ground(g, 40, 60, new THREE.MeshLambertMaterial({ color: 0xd9dde2 }), 0, 0, -20);
    const ceil = plane(g, 40, 60, 0xeef1f4, 0, 12, -20); ceil.rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) box(g, 30, 0.1, 0.5, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 11.9, -2 - i * 5);
    // window wall with runway outside
    for (let i = -8; i <= 8; i++) box(g, 0.2, 12, 0.2, 0x6c7680, i * 2.5, 6, -42);
    box(g, 42, 0.2, 0.2, 0x6c7680, 0, 6, -42);
    const outside = ground(g, 800, 400, 0x7d8a6a, 0, -0.05, -240); const runway = ground(g, 800, 30, 0x4a4c52, 0, 0.0, -120);
    const plane3 = new THREE.Group(); g.add(plane3);
    cyl(plane3, 1.8, 1.8, 30, 10, 0xf2f2f2, 0, 0, 0).rotation.z = Math.PI / 2;
    box(plane3, 6, 0.4, 34, 0xe3e3e3, 1, -0.3, 0); box(plane3, 3, 6, 0.4, 0x2f6fb5, 13, 3, 0); box(plane3, 3, 0.3, 10, 0xe3e3e3, 13, 0.5, 0);
    // flight board
    const board = canvasTex(1024, 600);
    const boardMesh = plane(g, 10, 5.86, new THREE.MeshBasicMaterial({ map: board.tex }), -3.5, 6.2, -20);
    box(g, 10.4, 6.2, 0.3, 0x1b1d22, -3.5, 6.2, -20.2);
    const FL = [['SINGAPURA', '09:10'], ['BANGKOK', '09:45'], ['TOKYO', '10:20'], ['LONDON', '11:05'], ['SYDNEY', '11:40'], ['DUBAI', '12:15'], ['SEOUL', '12:50'], ['BALI', '13:30']];
    const drawBoard = t => {
      const c = board.ctx; c.fillStyle = '#0d1117'; c.fillRect(0, 0, 1024, 600);
      c.fillStyle = '#f2c94c'; c.font = '700 40px HudSans'; c.fillText('BERLEPAS', 30, 58);
      c.fillStyle = '#8b95a5'; c.font = '600 24px HudSans'; c.fillText('DESTINASI', 30, 104); c.fillText('MASA', 520, 104); c.fillText('STATUS', 700, 104);
      FL.forEach(([d, m], k) => {
        const y = 156 + k * 56; const ft = E.boardFull - 2.0 + k * 0.32;
        c.fillStyle = k % 2 ? '#141a22' : '#10151c'; c.fillRect(20, y - 38, 984, 52);
        c.fillStyle = '#ffffff'; c.font = '700 34px HudSans'; c.fillText(d, 30, y); c.fillText(m, 520, y);
        const flip = clamp((t - ft) / 0.25);
        if (t < ft) { c.fillStyle = '#37e07a'; c.fillText('DAFTAR MASUK', 700, y); }
        else { c.save(); c.translate(0, y - 12); c.scale(1, Math.abs(Math.cos(flip * Math.PI)) || 0.05); c.fillStyle = flip < 0.5 ? '#37e07a' : '#ff4a3c'; c.fillText(flip < 0.5 ? 'DAFTAR MASUK' : 'PENUH', 700, 12); c.restore(); }
      });
      board.tex.needsUpdate = true;
    };
    // counters + crowd with luggage
    for (let i = 0; i < 5; i++) { box(g, 2.2, 1.1, 0.8, 0xc7ccd2, 5 + 0, 0.55, -6 - i * 3.2); box(g, 2.2, 0.6, 0.1, 0x2b6cb0, 5, 2.4, -6.4 - i * 3.2); }
    for (let i = 0; i < 24; i++) {
      const x = -4 + (i % 6) * 1.4 + hash(i, 1) * 0.5, z = -6 - Math.floor(i / 6) * 3 - hash(i, 2);
      const p = person(g, x, z, Math.PI + (hash(i, 3) - 0.5), { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], seed: 70 + i });
      box(g, 0.45, 0.7, 0.28, [0x2b2b2b, 0x8a3a3a, 0x2b6cb0, 0x6a6a6a][i % 4], x + 0.35, 0.35, z + 0.1);
    }
    airport.update = t => {
      drawBoard(t);
      const u = clamp((t - (SC.airport.start + 0.5)) / 5.5);
      plane3.position.set(60 - u * 140, 1.8 + Math.max(0, u - 0.35) * 40, -150); plane3.rotation.z = -Math.min(0.2, Math.max(0, u - 0.3) * 0.6);
    };
  }

  // ================================================================= SET: food-court stall (gerai)
  const gerai = makeSet('gerai');
  let stallA;
  {
    const g = gerai.g;
    ground(g, 20, 20, texMat((c, w, h) => { c.fillStyle = '#6b4a36'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4e3426'; c.lineWidth = 4; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } }, 256, 256, { repeat: [10, 10] }), 0, 0, -4);
    const zinc = texMat((c, w, h) => { for (let x = 0; x < w; x += 16) { c.fillStyle = x % 32 ? '#3d3f3f' : '#4a4c4b'; c.fillRect(x, 0, 16, h); } }, 256, 256, { repeat: [6, 1] });
    plane(g, 20, 6, zinc, 2, 3, -5.2);
    const roof = plane(g, 22, 14, 0x2f3133, 0, 4.2, -3); roof.rotation.x = Math.PI / 2;
    box(g, 6, 1.2, 0.3, 0xd9cdb8, 2.5, 1.0, -5.0);
    stallA = meeKolokStall(g, 'RM 12'); stallA.g.position.set(0.4, 0, -3.4);
    // neighbouring stall (dark)
    const n2 = new THREE.Group(); g.add(n2); n2.position.set(-2.3, 0, -3.5); box(n2, 1.4, 0.95, 0.8, 0xbfc3c8, 0, 0.62, 0); box(n2, 1.4, 1.0, 0.7, new THREE.MeshLambertMaterial({ color: 0xdbe8ee, transparent: true, opacity: 0.25 }), 0, 1.62, 0);
    // plastic chairs, some upside down on a table
    const chair = (x, z, ry, col, flip = false) => {
      const c = new THREE.Group(); c.position.set(x, flip ? 0.78 : 0, z); c.rotation.y = ry; if (flip) c.rotation.z = Math.PI; g.add(c);
      box(c, 0.45, 0.05, 0.45, col, 0, flip ? -0.44 : 0.44, 0); box(c, 0.45, 0.45, 0.05, col, 0, flip ? -0.7 : 0.7, -0.2);
      for (const a of [-0.18, 0.18]) for (const b of [-0.18, 0.18]) box(c, 0.04, 0.44, 0.04, col, a, flip ? -0.22 : 0.22, b);
      return c;
    };
    box(g, 1.0, 0.04, 1.0, 0xe9e6df, 2.3, 0.75, -1.4); cyl(g, 0.05, 0.05, 0.75, 6, 0x777777, 2.3, 0.37, -1.4);
    chair(2.1, -1.3, 0.3, 0xeeeeee, true); chair(2.6, -1.5, -0.4, 0x8a5a3a, true); chair(1.2, -0.6, 2.4, 0xeeeeee);
    // lorry outside (seen through the side)
    const lorry = new THREE.Group(); lorry.position.set(-7, 0, -9); lorry.rotation.y = 0.5; g.add(lorry);
    box(lorry, 2.4, 2.4, 5, 0xe8e2d0, 0, 1.7, 0); box(lorry, 2.4, 1.8, 1.8, 0x2b6cb0, 0, 1.4, 3.3);
    ground(g, 60, 40, 0x7d8a6a, -14, -0.02, -14);
    gerai.update = t => {
      const on = flicker(t, E.stallOff, 9);
      stallA.tube.material.color.setHex(on ? 0xfff6d8 : 0x3a3a3a); stallA.tubeGlow.material.opacity = on;
      const k = easeOut(clamp((t - (E.stallOff + 0.5)) / 0.35));
      stallA.tutupMesh.visible = k > 0; stallA.tutupMesh.position.y = 1.9 - 0.35 * k;
    };
  }

  // ================================================================= SET: tugu kucing + ATM queue
  const atm = makeSet('atm');
  let atmScreens = [];
  {
    const g = atm.g;
    ground(g, 200, 200, 0x46474c, 0, 0, -40);
    const C = new THREE.Vector3(0, 0, -15);
    cyl(g, 5.2, 5.4, 0.7, 20, 0x9c8a7a, C.x, 0.35, C.z);
    cyl(g, 4.8, 4.8, 0.05, 20, new THREE.MeshLambertMaterial({ color: 0x5f7a6a }), C.x, 0.68, C.z);
    for (let i = 0; i < 9; i++) { const r = sphere(g, 1.0 + rand() * 0.8, [0x7a3f30, 0x8a4a38, 0x6a3428][i % 3], C.x + (rand() - 0.5) * 4, 0.9 + rand() * 0.8, C.z + (rand() - 0.5) * 3, 0); r.scale.y = 0.7; }
    const stripeTex = (base, stripe, patch) => texMat((c, w, h) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      if (stripe) { c.fillStyle = stripe; for (let i = 0; i < 9; i++) c.fillRect(i * w / 9, 0, w / 22, h); }
      if (patch) { c.fillStyle = patch; c.beginPath(); c.ellipse(w * .3, h * .5, w * .18, h * .3, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(w * .75, h * .4, w * .14, h * .22, 0, 0, 7); c.fill(); }
    }, 128, 64);
    const cat = (x, y, z, s, ry, matc, tall) => {
      const c = new THREE.Group(); c.position.set(x, y, z); c.scale.setScalar(s); c.rotation.y = ry; g.add(c);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), matc); body.scale.set(0.8, tall ? 1.7 : 1.1, 0.8); body.position.y = tall ? 0.85 : 0.55; c.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), matc); head.position.set(0, tall ? 1.85 : 1.15, 0.12); c.add(head);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 4), matc); e.position.set(sx * 0.2, (tall ? 1.85 : 1.15) + 0.32, 0.1); c.add(e);
        sphere(c, 0.05, 0x3a8a5a, sx * 0.13, (tall ? 1.85 : 1.15) + 0.05, 0.43); }
      box(c, 0.12, 0.08, 0.1, 0xe7a0a0, 0, (tall ? 1.85 : 1.15) - 0.08, 0.45);
      for (const sx of [-0.18, 0.18]) box(c, 0.14, tall ? 0.5 : 0.35, 0.14, matc, sx, 0.2, 0.25);
      const tail = box(c, 0.1, 0.9, 0.1, matc, 0.35, 0.4, -0.35); tail.rotation.z = -0.6;
      return c;
    };
    const orange = stripeTex('#e8892f', '#1e1a16'), white = stripeTex('#f2f0ea'), bw = stripeTex('#f2f0ea', null, '#1e1e1e'), ow = stripeTex('#f2f0ea', null, '#e8892f');
    cat(C.x + 0.6, 1.9, C.z - 0.6, 2.4, 0.1, orange, true);
    cat(C.x - 1.4, 1.8, C.z - 0.2, 1.9, 0.5, white, true);
    cat(C.x - 0.4, 1.7, C.z + 1.2, 1.3, -0.2, ow, false);
    cat(C.x + 1.6, 1.6, C.z + 0.9, 1.2, -0.6, bw, false);
    cat(C.x + 0.3, 1.6, C.z + 1.9, 0.7, 0, white, false);
    // background: tall office tower + shophouses
    const office = windowTex(501, 6, 20, '#d8cdb4', '#55606e');
    box(g, 18, 70, 18, office, 10, 35, -62);
    for (let i = -6; i <= 6; i++) { const fac = windowTex(600 + i, 3, 3, ['#e7e3dc', '#d9d2c6', '#ece6da'][(i + 9) % 3], '#4a5260'); box(g, 7.8, 11, 6, fac, i * 8, 5.5, -40); box(g, 6, 1.2, 0.2, K.mat([0x3b82c4, 0xe0e0e0, 0xc0392b, 0xf0f0f0][(i + 8) % 4]), i * 8, 4.6, -36.9); }
    // bank front with ATMs (right foreground)
    box(g, 0.4, 4.5, 9, 0xe9e6df, 4.8, 2.25, -5);
    for (let k = 0; k < 3; k++) {
      const z = -2.2 - k * 1.6;
      box(g, 0.6, 1.7, 0.9, 0x2d3a4a, 4.3, 0.85, z);
      const T = canvasTex(256, 160); const scr = plane(g, 0.5, 0.31, new THREE.MeshBasicMaterial({ map: T.tex }), 3.99, 1.32, z); scr.rotation.y = -Math.PI / 2;
      atmScreens.push({ T, at: E.atmEmpty + k * 0.45 });
    }
    // queue around the roundabout
    const queue = [];
    for (let i = 0; i < 40; i++) {
      let x, z;
      if (i < 8) { x = 3.3 - 0; z = -2.6 - i * 0.0 - i * 0.75; x = 3.2; }
      else { const a = -0.3 + (i - 8) * 0.17; x = C.x + Math.cos(a) * 7.5; z = C.z + Math.sin(a) * 7.5 + 2; }
      queue.push(person(g, x, z, i < 8 ? Math.PI : -Math.PI / 2, { shirt: SHIRTS[i % 10], skin: SKINS[i % 6], seed: 120 + i, phone: i % 5 === 2 }));
    }
    const angry = queue[0];
    atm.update = t => {
      for (const s of atmScreens) {
        const c = s.T.ctx; const empty = t >= s.at;
        c.fillStyle = empty ? '#7a1010' : '#0f4c81'; c.fillRect(0, 0, 256, 160); c.fillStyle = '#fff'; c.textAlign = 'center';
        if (empty) { c.font = '800 30px HudSans'; c.fillText('TIADA', 128, 72); c.fillText('WANG TUNAI', 128, 112); }
        else { c.font = '700 22px HudSans'; c.fillText('SILA MASUKKAN', 128, 70); c.fillText('KAD ANDA', 128, 100); }
        s.T.tex.needsUpdate = true;
      }
      angry.armR.rotation.x = t > E.atmEmpty + 0.6 ? -1.6 + Math.abs(Math.sin(t * 9)) * 0.8 : 0;
      for (const q of queue) q.g.rotation.z = Math.sin(t * 2 + q.seed) * 0.02;
    };
  }

  // ================================================================= SET: market (pasar)
  const pasar = makeSet('pasar');
  const priceBoards = [];
  {
    const g = pasar.g;
    ground(g, 30, 40, 0x6f706e, 0, 0, -12);
    const roof = plane(g, 30, 40, 0x7a7670, 0, 5.5, -12); roof.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { box(g, 0.3, 5.5, 0.3, 0x8a8f94, -4.5, 2.75, -3 - i * 5); box(g, 0.3, 5.5, 0.3, 0x8a8f94, 4.5, 2.75, -3 - i * 5); box(g, 2.4, 0.06, 0.12, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 5.3, -3 - i * 5); }
    const produce = [[0x4f9a3a, 0.12], [0xd8322a, 0.05], [0xf2c94c, 0.09], [0xf08a24, 0.1], [0xb9c4cc, 0.08], [0x7a3fa0, 0.1]];
    const BASE = [3, 8, 5, 6, 12, 4];
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const x = side * 2.4, z = -2.8 - i * 3.6;
      box(g, 1.6, 0.85, 2.8, 0x8a6a4a, x, 0.42, z);
      const [col, r] = produce[(i * 2 + (side > 0 ? 1 : 0)) % 6];
      for (let k = 0; k < 26; k++) sphere(g, r * (0.8 + hash(k, i) * 0.6), col, x + (hash(k, 1 + i) - 0.5) * 1.3, 0.9 + hash(k, 7) * 0.25, z + (hash(k, 3 + i) - 0.5) * 2.4, 0);
      const T = canvasTex(256, 180);
      const bm = plane(g, 0.62, 0.44, new THREE.MeshLambertMaterial({ map: T.tex }), x - side * 0.85, 1.25, z + 0.8);
      bm.rotation.y = side * -Math.PI / 2 * 0.7;
      priceBoards.push({ T, base: BASE[(i * 2 + (side > 0 ? 1 : 0)) % 6] });
      person(g, x + side * 1.2, z, side > 0 ? -Math.PI / 2 : Math.PI / 2, { shirt: SHIRTS[(i + 3) % 10], skin: SKINS[i % 6], seed: 200 + i + (side > 0 ? 10 : 0) });
    }
    for (let i = 0; i < 18; i++) person(g, (hash(i, 4) - 0.5) * 2.0, -3 - hash(i, 5) * 12, hash(i, 6) * 6, { shirt: SHIRTS[i % 10], skin: SKINS[(i + 2) % 6], bag: i % 3 ? null : 0xd8322a, seed: 230 + i });
    const mult = t => (t < E.priceUp1 ? 6 : t < E.priceUp2 ? 60 : 240);
    pasar.update = t => {
      for (const b of priceBoards) {
        const c = b.T.ctx; c.fillStyle = '#1d2a22'; c.fillRect(0, 0, 256, 180); c.strokeStyle = '#a07a50'; c.lineWidth = 10; c.strokeRect(0, 0, 256, 180);
        const v = b.base * mult(t);
        const fresh = [E.priceUp1, E.priceUp2].some(e => t > e && t < e + 0.3);
        c.fillStyle = fresh ? '#ffffff' : '#f7f1e3'; c.font = '700 64px Garamond'; c.textAlign = 'center';
        c.fillText('RM ' + v.toLocaleString('en-US'), 128, 112); c.font = 'italic 28px Garamond'; c.fillText('sekilo', 128, 152); c.textAlign = 'left';
        b.T.tex.needsUpdate = true;
      }
    };
  }

  // ================================================================= SET: port (pelabuhan)
  const port = makeSet('pelabuhan');
  let ship;
  {
    const g = port.g;
    ground(g, 60, 12, 0x8a8a86, 0, 0, -1);
    box(g, 60, 0.4, 0.3, 0xf2c94c, 0, 0.2, -7);
    const sea = ground(g, 3000, 3000, new THREE.MeshLambertMaterial({ color: 0x4a3b48 }), 0, -2, -1500);
    const CC = [0xc0392b, 0x2b6cb0, 0x2f8f6a, 0xd9a443, 0x8e44ad, 0xe67e22, 0x7f8c8d];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) for (let s = 0; s < 1 + ((r + c) % 4); s++) box(g, 6, 2.5, 2.4, CC[(r * 3 + c + s) % 7], -26 + r * 6.4, 1.25 + s * 2.55, -2 - c * 2.6);
    const crane = (x, z) => {
      const c = new THREE.Group(); c.position.set(x, 0, z); g.add(c);
      for (const a of [-4, 4]) for (const b of [-3, 3]) box(c, 0.8, 30, 0.8, 0xd7462e, a, 15, b);
      box(c, 9, 1.2, 1.2, 0xd7462e, 0, 30, 0); box(c, 2, 1.6, 60, 0xd7462e, 0, 31, -18);
      const trolley = box(c, 2.5, 1.8, 2.5, 0x333333, 0, 29.5, -20);
      return { c, trolley };
    };
    const cranes = [crane(-16, -8), crane(22, -8)];
    ship = new THREE.Group(); g.add(ship);
    box(ship, 14, 6, 90, 0x2b3a4a, 0, 1, 0); box(ship, 10, 7, 10, 0xf2f2f2, 0, 7, 36);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) box(ship, 12, 2.4, 6.5, CC[(i + k) % 7], 0, 5.2 + k * 2.5, -30 + i * 9);
    const sunS = glow(g, 0xff6a3a, 700, -600, 90, -2600);
    port.update = t => {
      const u = smooth(SC.pelabuhan.start + 1, SC.pelabuhan.end, t);
      ship.position.set(6 + u * 50, -2, -75 - u * 260); ship.rotation.y = -0.15 - u * 0.9;
      cranes.forEach((c, i) => { c.trolley.position.z = -20 + Math.sin(Math.min(t, SC.pelabuhan.start + 2.5 + i) * 0.8) * 8; });
    };
  }

  // ================================================================= SET: living room (rumah)
  const rumah = makeSet('rumah');
  let tvT, fanBlades, tvLight;
  {
    const g = rumah.g;
    ground(g, 10, 10, texMat((c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#8a5a3a', '#7d5034', '#94623f'][i % 3]; c.fillRect(0, i * 32, w, 31); } }, 256, 256, { repeat: [3, 3] }), 0, 0, -1);
    plane(g, 10, 4, 0xe9dfcc, 0, 2, -4.6);
    plane(g, 8, 4, 0xe2d6c0, -3.5, 2, -1).rotation.y = Math.PI / 2;
    const ceil = plane(g, 10, 10, 0xf2ece0, 0, 3.2, -1); ceil.rotation.x = Math.PI / 2;
    // window with night city
    const cityWin = texMat((c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d1430'); gr.addColorStop(1, '#2a2a50'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) { const bx = i * 20 - 4, bh = 50 + (i * 37 % 80); c.fillStyle = '#111628'; c.fillRect(bx, h - bh, 18, bh); for (let y = h - bh + 6; y < h - 4; y += 9) for (let x = bx + 3; x < bx + 16; x += 6) if ((x * y) % 7 < 2) { c.fillStyle = '#f6d58a'; c.fillRect(x, y, 3, 4); } } }, 256, 192, { basic: true });
    plane(g, 1.8, 1.3, cityWin, -2.0, 1.8, -4.55); box(g, 1.9, 0.08, 0.1, 0xffffff, -2.0, 2.47, -4.5); box(g, 1.9, 0.08, 0.1, 0xffffff, -2.0, 1.13, -4.5); box(g, 0.08, 1.4, 0.1, 0xffffff, -2.0, 1.8, -4.5);
    // TV + cabinet
    box(g, 2.4, 0.5, 0.5, 0x5a3e2a, 0.6, 0.25, -4.2);
    box(g, 1.7, 1.0, 0.08, 0x111111, 0.6, 1.15, -4.3);
    tvT = canvasTex(640, 360);
    plane(g, 1.6, 0.9, new THREE.MeshBasicMaterial({ map: tvT.tex }), 0.6, 1.15, -4.25);
    tvLight = new THREE.PointLight(0x9fc2ff, 1.5, 6, 1); tvLight.position.set(0.6, 1.2, -3.6); g.add(tvLight);
    const lamp = new THREE.PointLight(0xffc98a, 1.0, 8, 1); lamp.position.set(-2.5, 2.2, -2); g.add(lamp);
    // sofa arm + coffee table + mug
    box(g, 0.5, 0.7, 1.8, 0x6a7f5a, -0.95, 0.35, 0.1); box(g, 1.3, 0.06, 0.7, 0x7d5034, 0.4, 0.45, -1.6);
    for (const a of [-0.55, 0.55]) for (const b of [-0.3, 0.3]) box(g, 0.05, 0.45, 0.05, 0x5a3e2a, 0.4 + a, 0.22, -1.6 + b);
    cyl(g, 0.045, 0.04, 0.1, 10, 0xf2f2f2, 0.6, 0.53, -1.5);
    // ceiling fan
    const fan = new THREE.Group(); fan.position.set(0.4, 3.0, -2.3); g.add(fan);
    cyl(fan, 0.02, 0.02, 0.3, 6, 0x777777, 0, 0.15, 0); cyl(fan, 0.12, 0.12, 0.08, 10, 0xdddddd, 0, 0, 0);
    fanBlades = new THREE.Group(); fan.add(fanBlades);
    for (let k = 0; k < 3; k++) { const b = box(fanBlades, 0.9, 0.02, 0.16, 0xd9d2c4, 0.5, 0, 0); b.position.set(Math.cos(k * 2.094) * 0.5, 0, Math.sin(k * 2.094) * 0.5); b.rotation.y = -k * 2.094; }
  }
  function drawTV(t) {
    const c = tvT.ctx; const w = 640, h = 360;
    c.fillStyle = '#0b1a33'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c0392b'; c.fillRect(0, 0, w, 52); c.fillStyle = '#fff'; c.font = '800 30px HudSans'; c.fillText('BERITA TERKINI', 18, 37);
    const after = t >= E.zeroCut;
    c.textAlign = 'center';
    if (!after) { c.font = '800 54px HudSans'; c.fillStyle = '#fff'; c.fillText('RINGGIT JATUH', w / 2, 160); c.font = '600 28px HudSans'; c.fillStyle = '#ffb4a8'; c.fillText('Harga naik setiap jam', w / 2, 210); }
    else {
      c.font = '800 46px HudSans'; c.fillStyle = '#fff'; c.fillText('TIGA SIFAR DIBUANG', w / 2, 130);
      c.font = '800 62px HudSans'; c.fillStyle = '#f2c94c'; c.fillText('RM 1,000  →  RM 1', w / 2, 225);
    }
    c.textAlign = 'left';
    c.fillStyle = '#f2c94c'; c.fillRect(0, h - 48, w, 48); c.fillStyle = '#111'; c.font = '700 24px HudSans';
    const tick = '  RINGGIT BAHARU BERKUAT KUASA  •  BANK DIBUKA SEMULA ESOK  •  HARGA DISELARASKAN  •';
    const off = (t * 120) % 1200; c.fillText(tick + tick, -off, h - 16);
    tvT.tex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- per-scene configuration
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const LOOK = {
    tebingan: { set: 'river', mode: 'day', pos: [V(0.6, 1.65, 0.6), V(0.3, 1.65, -0.2)], look: [V(12, 9, -60), V(10, 9, -60)], day: 0, loc: 'TEBINGAN KUCHING',
      sky: [0x3f86d6, 0xcfe6f7], fog: [0xcfe2ee, 120, 1500], hemi: [0xffffff, 0x6a7a55, 1.4], sun: [0xfff2dc, 1.6, V(-80, 120, 60)] },
    india: { set: 'india', pos: [V(0.6, 1.65, 1), V(0.6, 1.65, -1.5)], look: [V(2.2, 1.6, -10), V(2.0, 1.6, -12)], day: 1, loc: 'INDIA STREET',
      sky: [0x4a8fd8, 0xd8ecf8], fog: [0xe6ddd0, 20, 120], hemi: [0xffffff, 0x8a7a66, 1.3], sun: [0xfff0d8, 1.4, V(30, 80, 40)] },
    vivacity: { set: 'vivacity', pos: [V(-8, 1.7, 2), V(-8, 1.7, 0)], look: [V(4, 16, -60), V(4, 17, -60)], day: 1, loc: 'VIVACITY',
      sky: [0x3f86d6, 0xd6eaf7], fog: [0xd6e6f2, 120, 1500], hemi: [0xffffff, 0x666666, 1.3], sun: [0xfff2dc, 1.6, V(60, 120, 80)] },
    airport: { set: 'airport', pos: [V(0.2, 1.65, 1), V(0.2, 1.65, -0.5)], look: [V(-2.5, 5, -20), V(-2.5, 5.2, -20)], day: 2, loc: 'LAPANGAN TERBANG',
      sky: [0x5a9be0, 0xdcecf7], fog: [0xdfe8ef, 60, 600], hemi: [0xffffff, 0xaaaaaa, 1.5], sun: [0xffffff, 1.0, V(20, 80, 40)] },
    gerai: { set: 'gerai', pos: [V(0.5, 1.6, 1.4), V(0.45, 1.6, 0.8)], look: [V(0.2, 1.55, -3.4), V(0.2, 1.5, -3.4)], day: 3, loc: 'MEDAN SELERA',
      sky: [0x8fa7bd, 0xd9d2c0], fog: [0xb9b2a4, 12, 90], hemi: [0xf0e6d6, 0x4a3a2a, 1.0], sun: [0xffe8c8, 0.8, V(-40, 50, 30)] },
    atm: { set: 'atm', pos: [V(-0.6, 1.65, 1.2), V(-0.3, 1.65, 0.2)], look: [V(1.0, 3.2, -15), V(1.4, 3.2, -15)], day: 5, loc: 'TUGU KUCING',
      sky: [0x8a929c, 0xc9ced3], fog: [0xb8bec4, 30, 260], hemi: [0xe8ecf0, 0x55565a, 1.15], sun: [0xdde3ea, 0.6, V(20, 80, 40)] },
    pasar: { set: 'pasar', pos: [V(0, 1.65, 1.2), V(0, 1.65, -1.5)], look: [V(0.2, 1.1, -10), V(0.1, 1.1, -12)], day: 7, loc: 'PASAR',
      sky: [0x8fa7bd, 0xd9d2c0], fog: [0x9a958c, 10, 60], hemi: [0xfff2e0, 0x3a3020, 1.1], sun: [0xffe8c8, 0.7, V(20, 80, 40)] },
    jeti: { set: 'river', mode: 'jeti', pos: [V(-11.6, 1.65, -0.6), V(-11.8, 1.65, -1.0)], look: [V(-16, 2.4, -8), V(-15.5, 2.4, -8)], day: 7, loc: 'JETI PENAMBANG',
      sky: [0x6f8fb8, 0xe0c9a8], fog: [0xd8c6ae, 120, 1500], hemi: [0xfff0dc, 0x6a6a55, 1.2], sun: [0xffd8a8, 1.2, V(-80, 60, 60)] },
    pelabuhan: { set: 'pelabuhan', pos: [V(0, 2.2, 3), V(0, 2.2, 1)], look: [V(2, 6, -60), V(6, 5, -60)], day: 30, loc: 'PELABUHAN',
      sky: [0x3a2850, 0xff7a3a], fog: [0xb85a3a, 200, 2200], hemi: [0xffb08a, 0x2a1a2a, 0.9], sun: [0xff8a50, 1.2, V(-200, 40, -400)], glow: [0xff5a2a, 1.0] },
    rumah: { set: 'rumah', pos: [V(-0.2, 1.15, 1.3), V(-0.1, 1.15, 0.7)], look: [V(0.5, 1.15, -4.3), V(0.55, 1.15, -4.3)], day: 90, loc: 'RUMAH',
      sky: [0x0d1430, 0x2a2a50], fog: [0x222233, 20, 60], hemi: [0x8a8aa8, 0x2a2018, 0.55], sun: [0x9fb2e0, 0.3, V(-20, 40, 20)] },
    malam: { set: 'river', mode: 'night', pos: [V(-0.2, 1.65, 0.8), V(0.3, 1.6, -0.2)], look: [V(10, 4, -40), V(6, 2.5, -20)], day: 90, loc: 'TEBINGAN KUCHING',
      sky: [0x0c1230, 0x3a2f5c], fog: [0x2a2a4a, 80, 900], hemi: [0x6a74a8, 0x1a1418, 0.55], sun: [0x9fb2e0, 0.45, V(-60, 80, -40)], stars: 1 },
    cta: { set: 'river', mode: 'night', pos: [V(0.3, 1.6, -0.2), V(0.35, 1.6, -0.4)], look: [V(6, 2.5, -20), V(6, 3.5, -20)], day: 90, loc: '',
      sky: [0x0c1230, 0x3a2f5c], fog: [0x2a2a4a, 80, 900], hemi: [0x6a74a8, 0x1a1418, 0.55], sun: [0x9fb2e0, 0.45, V(-60, 80, -40)], stars: 1 },
  };

  // ---------------------------------------------------------------- HUD (mee kolok price)
  const PRICE = [[0, 5], [SC.airport.start, 6], [SC.gerai.start, 12], [SC.atm.start, 30], [E.priceUp2, 120], [E.bigJump, 5000], [E.priceBack, 5]];
  const priceAt = t => { let v = 5; for (const [a, p] of PRICE) if (t >= a) v = p; return v; };
  const fmtPrice = v => 'RM ' + v.toLocaleString('en-US', { minimumFractionDigits: v >= 1000 ? 0 : 2, maximumFractionDigits: 2 });
  function hud(t) {
    if (t >= SC.malam.start + 1.5) return null;
    const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
    const L = LOOK[sc.id];
    let v = priceAt(t), value = fmtPrice(v), pop = 1, jitter = 0;
    // slot-machine roll before each rise
    for (const [a, p] of PRICE.slice(1)) {
      const prev = priceAt(a - 0.01);
      if (t > a - 0.6 && t < a && p > prev) { value = fmtPrice(Math.round(lerp(prev, p, hash(frameIndex(t), 3)))); jitter = (hash(frameIndex(t), 5) - 0.5) * 6; }
      if (t >= a && t < a + 0.45 && p !== prev) pop = 1 + 0.22 * (1 - easeOut((t - a) / 0.45));
    }
    if (t >= E.priceBack && t < E.priceBack + 0.9) value = 'RM 5';
    return { label: 'HARGA SEMANGKUK MEE KOLOK', value, stat: `HARI KE-${L.day} · ${L.loc}`, pop, jitter, color: v >= 120 && t < E.priceBack ? '#ff8a7a' : '', opacity: t > SC.malam.start ? 1 - smooth(SC.malam.start, SC.malam.start + 1.5, t) : 1 };
  }

  // ---------------------------------------------------------------- update
  const shakes = [E.priceUp1, E.priceUp2, E.bigJump, E.zeroCut];
  function update(t) {
    const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
    const L = LOOK[sc.id];
    for (const k in sets) sets[k].g.visible = k === L.set;
    const u = smooth(sc.start, sc.end, t);
    const pos = L.pos[0].clone().lerp(L.pos[1], u), look = L.look[0].clone().lerp(L.look[1], u);
    let sx = 0, sy = 0;
    for (const e of shakes) { const d = t - e; if (d >= 0 && d < 0.9) { const a = 0.03 * Math.exp(-d * 5); sx += Math.sin(d * 57) * a; sy += Math.cos(d * 49) * a; } }
    pos.x += Math.sin(t * 0.6) * 0.008 + sx; pos.y += Math.sin(t * 1.1) * 0.006 + sy;
    camera.position.copy(pos); camera.lookAt(look.x + sx * 6, look.y + sy * 6, look.z);
    // environment
    skyU.top.value.setHex(L.sky[0]); skyU.horizon.value.setHex(L.sky[1]);
    skyU.glowCol.value.setHex(L.glow ? L.glow[0] : 0); skyU.glow.value = L.glow ? L.glow[1] : 0;
    scene.fog.color.setHex(L.fog[0]); scene.fog.near = L.fog[1]; scene.fog.far = L.fog[2];
    hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sun.position.copy(pos).add(L.sun[2]); sun.target.position.copy(pos);
    stars.material.opacity = L.stars ? 0.9 : 0;
    const dayish = !L.stars && L.set !== 'rumah';
    clouds.visible = dayish; cloudMat.color.setHex(sc.id === 'pelabuhan' ? 0xff9a6a : sc.id === 'atm' ? 0x9aa0a8 : 0xffffff);
    cloudMat.emissive.setHex(sc.id === 'pelabuhan' ? 0x6a2a1a : sc.id === 'atm' ? 0x55585c : 0x8a8a8a);
    // hands
    const lower = sc.id === 'pelabuhan' ? smooth(62, 65.5, t) * 0.12 : 0;
    rig.position.set(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.004 - lower, 0);
    handL.visible = sc.id !== 'cta' || t < SC.cta.start + 0.5;
    const reach = sc.id === 'malam' || sc.id === 'cta' ? smooth(SC.malam.start + 3.5, SC.malam.start + 6.5, t) : 0;
    handR.visible = reach > 0;
    handR.position.set(lerp(0.32, 0.2, reach), lerp(-0.6, -0.27, reach), lerp(-0.4, -0.62, reach)); handR.rotation.set(-0.3, 0.3, 0.1);
    drawPhone(t);
    // sets
    if (L.set === 'river') river.update(t, L.mode);
    else sets[L.set].update(t);
    if (L.set === 'rumah') { drawTV(t); fanBlades.rotation.y = t * 5; tvLight.intensity = 1.2 + 0.4 * Math.sin(t * 7) * Math.sin(t * 3.1); }
    animatePeople(t);
  }

  // ---------------------------------------------------------------- 2D effects
  function drawFx(g, t, w, h) {
    // rain at the ATM scene
    if (t >= SC.atm.start && t < SC.atm.end) {
      g.strokeStyle = 'rgba(220,230,240,.35)'; g.lineWidth = 2;
      const f = frameIndex(t);
      for (let i = 0; i < 140; i++) { const x = hash(i, 1) * w, y = (hash(i, 2) * h + f * 70) % h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 34); g.stroke(); }
    }
    // zeros flying out of the HUD price
    const z0 = E.priceBack;
    if (t >= z0 && t < z0 + 1.2) {
      g.font = '400 100px Garamond'; g.fillStyle = '#fbf8f1';
      const x0 = 130 + g.measureText('RM 5').width; const k = (t - z0) / 1.2;
      [',', '0', '0', '0'].forEach((c, i) => {
        const d = easeOut(clamp(k * 1.4 - i * 0.12));
        g.globalAlpha = 1 - d; g.save(); g.translate(x0 + i * 46 + d * (60 + i * 30), 1068 - d * (160 + i * 40)); g.rotate(d * (0.6 + i * 0.3)); g.fillText(c, 0, 0); g.restore();
      });
      g.globalAlpha = 1;
    }
  }
  // white flash at each change of location
  const cuts = script.scenes.slice(1).filter(s => !s.continues || true).map(s => s.start).filter(x => x !== SC.cta.start);
  function flash(t) {
    let v = 0;
    for (const c of cuts) { const d = t - c; if (d > -0.12 && d < 0.35) v = Math.max(v, d < 0 ? (d + 0.12) / 0.12 : 1 - d / 0.35); }
    return v * 0.85;
  }
  function grade(t) {
    const sc = script.scenes.find(s => t >= s.start && t < s.end) || script.scenes.at(-1);
    const sat = { tebingan: 1.08, india: 1.08, vivacity: 1.1, airport: 1.0, gerai: 0.85, atm: 0.75, pasar: 0.95, jeti: 1.0, pelabuhan: 1.1, rumah: 0.85, malam: 0.8, cta: 0.8 }[sc.id];
    return `saturate(${sat}) contrast(1.05)`;
  }

  update(0);
  return { scene, camera, update, drawFx, flash, grade, hud };
}
