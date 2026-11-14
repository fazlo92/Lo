import * as THREE from 'three';
import { createOverlay } from './overlay.js';
import * as U from './util.js';

const params = new URLSearchParams(location.search);
const topic = params.get('topic') || 'nombor';
const script = await (await fetch(`/topics/${topic}/script.json`)).json();

await Promise.all([
  document.fonts.load('500 40px Garamond'), document.fonts.load('italic 400 40px Garamond'),
  document.fonts.load('400 40px Garamond'), document.fonts.load('600 20px HudSans'),
  document.fonts.load('700 20px HudSans'), document.fonts.load('40px "Noto Color Emoji"', '👇'),
]);

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(script.width, script.height, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

const fx = document.getElementById('fx').getContext('2d');
const overlay = createOverlay(script);
const mod = await import(`/topics/${topic}/scene.js`);
const world = await mod.create({ THREE, renderer, script, U });

function renderFrame(t) {
  world.update(t);
  renderer.clear();
  renderer.render(world.scene, world.camera);
  if (world.icon) { renderer.clearDepth(); renderer.render(world.icon.scene, world.icon.camera); }
  canvas.style.filter = world.grade ? world.grade(t) : 'none';
  fx.clearRect(0, 0, script.width, script.height);
  if (world.drawFx) world.drawFx(fx, t, script.width, script.height);
  overlay.update(t);
  overlay.setFlash(world.flash ? world.flash(t) : 0);
}
window.renderFrame = t => { renderFrame(t); return true; };
window.__script = script;

if (params.has('play')) {
  const t0 = performance.now() - (parseFloat(params.get('t')) || 0) * 1000;
  const loop = () => { renderFrame(((performance.now() - t0) / 1000) % script.duration); requestAnimationFrame(loop); };
  loop();
} else {
  renderFrame(parseFloat(params.get('t')) || 0);
}
window.__ready = true;
