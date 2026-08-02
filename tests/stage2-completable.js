// Prueba headless (Node) — la Stage 2 (trayecto de Nico) es completable dentro
// del presupuesto de 60 s. Un bot simple (mantener derecha + saltar al trabarse)
// recorre las escenas reales y debe llegar a COMPLETE con el cronómetro > 0.
//
// Uso:  node tests/stage2-completable.js   [trials]
// Sin dependencias externas: carga los módulos de Stage 2 en un contexto vm con
// stubs de canvas/DOM y ejecuta el loop de juego con dt fijo.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TRIALS = parseInt(process.argv[2] || '8', 10);
const files = ['config.js', 'manifest.js', 'input.js', 'player.js', 'entities.js', 'scenes.js'];

function makeCtx() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: { width: 1280, height: 720 },
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => ({}), measureText: () => ({ width: 42 }), getImageData: () => ({ data: [] }),
  };
  return new Proxy(base, { get(t, k) { return (k in t) ? t[k] : function () {}; }, set(t, k, v) { t[k] = v; return true; } });
}

function makeEl() {
  return {
    style: { cssText: '', transform: '', setProperty() {} }, dataset: {}, textContent: '',
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {},
    appendChild() {}, removeChild() {}, remove() {}, getContext: makeCtx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    parentNode: null, classList: { add() {}, remove() {}, toggle() {} }, width: 0, height: 0, id: '',
  };
}

function loadStage2() {
  const listeners = {};
  const win = {
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener(t, fn) { if (listeners[t]) listeners[t] = listeners[t].filter(f => f !== fn); },
    innerWidth: 1280, innerHeight: 720,
  };
  const doc = { createElement: () => makeEl(), getElementById: () => null, body: { appendChild() {}, removeChild() {} }, addEventListener() {} };
  const sandbox = {
    console, Math, Date, JSON, Array, Object, Number, String, Boolean, parseInt, parseFloat, isNaN,
    setTimeout: () => 0, clearTimeout: () => {}, performance: { now: () => 0 },
    Image: class { constructor() { this.onload = null; this.onerror = null; } set src(v) { this._s = v; } get src() { return this._s; } },
    window: win, document: doc,
  };
  sandbox.globalThis = sandbox; sandbox.__makeCtx = makeCtx;
  vm.createContext(sandbox);
  let src = '';
  for (const f of files) src += fs.readFileSync(path.join(ROOT, 'src/stages/stage2', f), 'utf8') + '\n';
  src += `;globalThis.__S2C = S2C; globalThis.__mk = makeSceneManager;`;
  vm.runInContext(src, sandbox, { filename: 'stage2-bundle.js' });
  return { sandbox, emit: (type, ev) => (listeners[type] || []).forEach(fn => fn(ev)) };
}

function runOnce() {
  const { sandbox, emit } = loadStage2();
  const S2Input = sandbox.S2Input, S2C = sandbox.__S2C, ctx = makeCtx();
  const gs = { timer: 60, score: 0, bipCount: 0, bipBonus: 0, falls: 0, hits: 0, caughtFirstBus: false, headphonesTimer: 0, checkpoint: null, stars: 0, _showMsg() {} };
  const sm = sandbox.__mk({}, null, null, null);
  S2Input.init({ touch: false, upDown: false });
  sm.init(gs);

  const dt = 1 / 60;
  const NONPLAY = { COMPLETE: 1, FAILED: 1, INTRO: 1 };
  emit('keydown', { code: 'ArrowRight', key: 'ArrowRight', preventDefault() {} });
  let prevX = 0, stall = 0, cool = 0, hop = 0, spaceFrames = 0, elapsed = 0, wall = 0, lastScene = sm.key, stuckAt = 0;

  for (let i = 0; i < 130 * 60; i++) {
    wall += dt;
    const pl = (sm.scene && sm.scene.getPlayer) ? sm.scene.getPlayer() : null;
    const x = pl ? pl.x : prevX;
    stall = Math.abs(x - prevX) < 0.6 ? stall + 1 : 0; prevX = x;
    let jump = false;
    if (sm.key === 'MOVING_PLATFORM_CROSSING') { hop += dt; if (hop >= 0.6) { jump = true; hop = 0; } }
    if (stall > 10) jump = true;
    if (cool > 0) { cool -= dt; jump = false; }
    if (jump && spaceFrames === 0) { emit('keydown', { code: 'Space', key: ' ', preventDefault() {} }); spaceFrames = 2; cool = 0.25; }
    if (spaceFrames > 0 && --spaceFrames === 0) emit('keyup', { code: 'Space', key: ' ', preventDefault() {} });

    const running = !NONPLAY[sm.key];
    if (running) { gs.timer -= dt; if (gs.timer > S2C.timer.max) gs.timer = S2C.timer.max; if (gs.timer <= 0) { gs.timer = 0; sm.transitionTo('FAILED'); } elapsed += dt; }
    if (gs.headphonesTimer > 0) gs.headphonesTimer = Math.max(0, gs.headphonesTimer - dt);
    sm.update(dt); sm.draw(ctx); S2Input.tick();

    if (sm.key !== lastScene) { lastScene = sm.key; stuckAt = wall; }
    if (sm.key === 'COMPLETE') return { ok: true, elapsed, timerLeft: gs.timer };
    if (sm.key === 'FAILED') return { ok: false, reason: 'FAILED', elapsed, timerLeft: gs.timer };
    if (wall - stuckAt > 25) return { ok: false, reason: 'STUCK@' + sm.key, elapsed, timerLeft: gs.timer };
  }
  return { ok: false, reason: 'TIMEOUT', elapsed, timerLeft: gs.timer };
}

let fails = 0, best = 99, worst = 0;
for (let i = 0; i < TRIALS; i++) {
  const r = runOnce();
  const secs = r.elapsed.toFixed(1);
  console.log((r.ok ? 'PASS' : 'FAIL') + ' trial ' + (i + 1) + ' — ' + (r.ok ? ('completó en ' + secs + 's, quedaban ' + r.timerLeft.toFixed(1) + 's') : r.reason));
  if (!r.ok) fails++; else { best = Math.min(best, r.elapsed); worst = Math.max(worst, r.elapsed); }
}
if (fails === 0) console.log('\nOK — ' + TRIALS + '/' + TRIALS + ' completaron dentro de 60s (' + best.toFixed(1) + '–' + worst.toFixed(1) + 's).');
else console.log('\nFALLARON ' + fails + '/' + TRIALS + ' partidas.');
process.exit(fails ? 1 : 0);
