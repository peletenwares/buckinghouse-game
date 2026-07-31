(function () {
  'use strict';

  // MF.zzz eliminado — reemplazado por PNG individuales (zzz-small/medium/large).
  // clocks y effects documentados para fases futuras; no se cargan en escena estática.
  const MF = {
    clocks: [
      { sx:   10, sy: 280, sw: 355, sh: 490 }, // col=0 — rojo
      null,                                      // col=1 — azul; trail pendiente
      { sx:  773, sy: 280, sw: 368, sh: 490 }, // col=2 — verde
      { sx: 1155, sy: 265, sw: 375, sh: 500 }, // col=3 — dorado
    ],
    effects: [
      { sx:   60, sy:  40, sw: 400, sh: 380 },
      { sx:  542, sy:  40, sw: 450, sh: 390 },
      { sx: 1084, sy:  40, sw: 400, sh: 390 },
      { sx:   30, sy: 552, sw: 450, sh: 450 },
      { sx:  542, sy: 552, sw: 450, sh: 450 },
      { sx: 1074, sy: 552, sw: 415, sh: 420 },
    ],
  };

  const C = {
    W: 1280, H: 720,
    slingshot: { centerX: 640, bottomY: 720, scale: 0.30 },
    targets: [
      { asset: 'targetNormal', x: 220,  y: 120, scale: 0.15 },
      { asset: 'targetHot',    x: 600,  y:  95, scale: 0.15 },
      { asset: 'targetGold',   x: 1000, y: 130, scale: 0.15 },
    ],
    zzz: [
      { asset: 'zzzSmall',  x: 400, y: 130, scale: 0.18 },
      { asset: 'zzzMedium', x: 600, y:  80, scale: 0.18 },
      { asset: 'zzzLarge',  x: 790, y:  60, scale: 0.18 },
    ],
  };

  // sceneSleeping es obligatorio. Las demás entradas fallan con console.warn.
  const SCENE_KEYS = [
    'sceneSleeping',
    'slingshotIdle',
    'targetNormal', 'targetHot', 'targetGold',
    'zzzSmall', 'zzzMedium', 'zzzLarge',
  ];

  let canvas, ctx, assets, _resizeFn;

  // Conservados para fases futuras (clocks animation, effects).
  function getFrameRect(def, col, row) {
    const sx0 = Math.round(col       * def.w / def.cols);
    const sx1 = Math.round((col + 1) * def.w / def.cols);
    const sy0 = Math.round(row       * def.h / def.rows);
    const sy1 = Math.round((row + 1) * def.h / def.rows);
    return { sx: sx0, sy: sy0, sw: sx1 - sx0, sh: sy1 - sy0 };
  }

  function drawFrame(img, def, col, row, dx, dy, scale) {
    const { sx, sy, sw, sh } = getFrameRect(def, col, row);
    ctx.drawImage(img, sx, sy, sw, sh,
      Math.round(dx), Math.round(dy),
      Math.round(sw * scale), Math.round(sh * scale));
  }

  function drawManualFrame(img, mf, dx, dy, scale) {
    ctx.drawImage(img, mf.sx, mf.sy, mf.sw, mf.sh,
      Math.round(dx), Math.round(dy),
      Math.round(mf.sw * scale), Math.round(mf.sh * scale));
  }

  function drawFull(img, def, dx, dy, scale) {
    const dw = Math.round(def.w * scale);
    const dh = Math.round(def.h * scale);
    ctx.drawImage(img, 0, 0, def.w, def.h, Math.round(dx), Math.round(dy), dw, dh);
  }

  function draw() {
    const a = assets;
    const m = STAGE2_MANIFEST;

    ctx.clearRect(0, 0, C.W, C.H);

    // Capa 1 — Escena compuesta (fondo + personajes dormidos)
    if (a.sceneSleeping && a.sceneSleeping.ok) {
      ctx.drawImage(a.sceneSleeping.img,
        0, 0, m.sceneSleeping.w, m.sceneSleeping.h,
        0, 0, C.W, C.H);
    }

    // Capa 2 — Resortera en reposo, centrada en la base
    if (a.slingshotIdle && a.slingshotIdle.ok) {
      const cfg = C.slingshot;
      const def = m.slingshotIdle;
      const dw = Math.round(def.w * cfg.scale);
      const dh = Math.round(def.h * cfg.scale);
      ctx.drawImage(a.slingshotIdle.img, 0, 0, def.w, def.h,
        cfg.centerX - Math.round(dw / 2), cfg.bottomY - dh, dw, dh);
    }

    // Capa 3 — Blancos individuales
    C.targets.forEach(function (t) {
      const asset = a[t.asset];
      if (asset && asset.ok) {
        drawFull(asset.img, m[t.asset], t.x, t.y, t.scale);
      }
    });

    // Capa 4 — Zzz individuales
    C.zzz.forEach(function (z) {
      const asset = a[z.asset];
      if (asset && asset.ok) {
        drawFull(asset.img, m[z.asset], z.x, z.y, z.scale);
      }
    });
  }

  function resizeS2() {
    var s = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);
    canvas.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 's2canvas';
    canvas.width  = C.W;
    canvas.height = C.H;
    canvas.style.cssText = 'position:fixed;left:50%;top:50%;display:block;transform-origin:center center;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    _resizeFn = resizeS2;
    window.addEventListener('resize', _resizeFn);
    resizeS2();
  }

  function loadSceneAssets() {
    var results = {};
    return Promise.all(SCENE_KEYS.map(function (key) {
      return new Promise(function (resolve) {
        var src = STAGE2_MANIFEST[key].src;
        var img = new Image();
        img.onload  = function () { results[key] = { img: img, ok: true }; resolve(); };
        img.onerror = function () {
          results[key] = { img: null, ok: false };
          if (key === 'sceneSleeping') {
            console.error('[Stage2] ERROR: escena base obligatoria no cargó:', src);
          } else {
            console.warn('[Stage2] Asset no cargó:', src);
          }
          resolve();
        };
        img.src = src;
      });
    })).then(function () { return results; });
  }

  function devStart() {
    return loadSceneAssets().then(function (loaded) {
      assets = loaded;
      createCanvas();
      draw();
    });
  }

  function start() {
    // stub — integración Etapa 1 en Fase 7
  }

  function stop() {
    if (_resizeFn) window.removeEventListener('resize', _resizeFn);
    if (canvas)    { canvas.remove(); canvas = null; }
    ctx    = null;
    assets = null;
  }

  window.Stage2 = { devStart: devStart, start: start, stop: stop };
}());
