// Shared low-poly building blocks for topic scenes.
export function kit(THREE, U) {
  const { clamp, lerp, smooth, hash, frameIndex } = U;
  const matCache = new Map();
  const mat = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }));
    return matCache.get(key);
  };
  const M = c => (typeof c === 'number' ? mat(c) : c);
  const box = (parent, w, h, d, color, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color)); m.position.set(x, y, z); parent.add(m); return m;
  };
  const cyl = (parent, rt, rb, h, seg, color, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(color)); m.position.set(x, y, z); parent.add(m); return m;
  };
  const sphere = (parent, r, color, x = 0, y = 0, z = 0, detail = 0) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), M(color)); m.position.set(x, y, z); parent.add(m); return m;
  };
  const plane = (parent, w, h, color, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M(color)); m.position.set(x, y, z); parent.add(m); return m;
  };
  const ground = (parent, w, d, color, x = 0, y = 0, z = 0) => { const g = plane(parent, w, d, color, x, y, z); g.rotation.x = -Math.PI / 2; return g; };
  const canvasTex = (w, h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { c, ctx: c.getContext('2d'), tex };
  };
  const texMat = (draw, w, h, opts = {}) => {
    const T = canvasTex(w, h); draw(T.ctx, w, h); T.tex.needsUpdate = true;
    if (opts.repeat) { T.tex.wrapS = T.tex.wrapT = THREE.RepeatWrapping; T.tex.repeat.set(...opts.repeat); }
    const m = opts.basic ? new THREE.MeshBasicMaterial({ map: T.tex, transparent: !!opts.transparent, fog: opts.fog ?? true })
      : new THREE.MeshLambertMaterial({ map: T.tex, transparent: !!opts.transparent, alphaTest: opts.alphaTest || 0 });
    m.userData.T = T; return m;
  };
  const glowTex = (() => {
    const T = canvasTex(128, 128); const g = T.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    T.ctx.fillStyle = g; T.ctx.fillRect(0, 0, 128, 128); T.tex.needsUpdate = true; return T.tex;
  })();
  const glow = (parent, color, size, x, y, z) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); return s;
  };
  const kf = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return lerp(v0, v1, smooth(t0, t1, t));
    }
    return keys.at(-1)[1];
  };
  const flicker = (t, offAt, seed = 0) => (t >= offAt ? 0 : t > offAt - 0.45 ? (hash(frameIndex(t), seed) > 0.45 ? 1 : 0.15) : 1);

  // Window-grid facade textures
  function windowTex(seed, cols, rows, facade, pane, lit = 0, litColor = '#ffd58a') {
    const r = U.mulberry32(seed);
    return texMat((g, w, h) => {
      g.fillStyle = facade; g.fillRect(0, 0, w, h);
      const cw = w / cols, rh = h / rows;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        g.fillStyle = r() < lit ? litColor : pane; g.fillRect(x * cw + cw * .18, y * rh + rh * .2, cw * .64, rh * .55);
      }
    }, 256, 512);
  }

  // Low-poly person. pose: 'stand' | 'walk' | 'sit'
  const people = [];
  function person(parent, x, z, yaw, o = {}) {
    const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.rotation.y = yaw; parent.add(g);
    const shirt = o.shirt ?? 0x6c8f5a, pants = o.pants ?? 0x2c3140, skin = o.skin ?? 0xc48a5c, hair = o.hair ?? 0x1a1412;
    const sit = o.pose === 'sit';
    const legL = new THREE.Group(), legR = new THREE.Group();
    legL.position.set(-0.09, 0.82, 0); legR.position.set(0.09, 0.82, 0); g.add(legL, legR);
    box(legL, 0.13, 0.8, 0.14, pants, 0, -0.4, 0); box(legR, 0.13, 0.8, 0.14, pants, 0, -0.4, 0);
    if (sit) { legL.rotation.x = legR.rotation.x = -Math.PI / 2; g.position.y -= 0.35; }
    box(g, 0.38, 0.55, 0.22, shirt, 0, 1.1, 0);
    const head = new THREE.Group(); head.position.set(0, 1.5, 0); g.add(head);
    box(head, 0.2, 0.24, 0.2, skin, 0, 0, 0); box(head, 0.22, 0.08, 0.22, hair, 0, 0.12, 0.01);
    const armL = new THREE.Group(), armR = new THREE.Group();
    armL.position.set(-0.24, 1.33, 0); armR.position.set(0.24, 1.33, 0); g.add(armL, armR);
    box(armL, 0.09, 0.5, 0.09, shirt, 0, -0.25, 0); box(armR, 0.09, 0.5, 0.09, shirt, 0, -0.25, 0);
    if (o.bag) box(armR, 0.22, 0.26, 0.1, o.bag, 0, -0.55, 0.02);
    if (o.phone) { armL.rotation.x = -1.2; box(armL, 0.05, 0.09, 0.01, 0x111111, 0, -0.5, 0.03); }
    const p = { g, head, legL, legR, armL, armR, seed: o.seed ?? people.length, walk: o.walk || null, base: new THREE.Vector3(x, g.position.y, z), yaw };
    people.push(p); return p;
  }
  function animatePeople(t, list = people) {
    for (const p of list) {
      if (!p.g.parent || !p.g.parent.visible) continue;
      const s = p.seed;
      p.head.rotation.y = Math.sin(t * 0.7 + s) * 0.2;
      if (p.walk) {
        const { dir, speed, span } = p.walk;
        const d = ((t * speed + s * 3.7) % span) - span / 2;
        p.g.position.set(p.base.x + dir.x * d, p.base.y, p.base.z + dir.z * d);
        const ph = t * speed * 4 + s;
        p.legL.rotation.x = Math.sin(ph) * 0.5; p.legR.rotation.x = -Math.sin(ph) * 0.5;
        p.armL.rotation.x = p.armL.userData.fixed ? p.armL.rotation.x : -Math.sin(ph) * 0.4;
        p.g.position.y = p.base.y + Math.abs(Math.sin(ph)) * 0.03;
      } else p.g.position.y = p.base.y + Math.sin(t * 1.4 + s) * 0.005;
    }
  }
  const SHIRTS = [0x6c8f5a, 0xe0d4b8, 0xb85445, 0x3e5a8c, 0xd9c14a, 0xf2f2f2, 0x5b4a7a, 0x2f8f8a, 0xd77a9a, 0x8a5a3a];
  const SKINS = [0xc48a5c, 0x9c6a43, 0xd29a70, 0xa87150, 0xb27a52, 0xe0b090];

  return { mat, box, cyl, sphere, plane, ground, canvasTex, texMat, glow, kf, flicker, windowTex, person, people, animatePeople, SHIRTS, SKINS };
}
