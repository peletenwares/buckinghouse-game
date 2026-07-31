(function () {
  'use strict';

  // Manual frames conservados para fases futuras (animación de relojes, efectos).
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
    pocket:    { offsetRatioY: 0.30 },

    // collisionOffsetX/Y: offset provisional desde (t.x, t.y) al centro visible.
    // Calculado como (1536 * 0.15 / 2) y (1024 * 0.15 / 2). Calibrar en test visual.
    // bounds: carril de movimiento por blanco (esquina superior-izquierda del sprite).
    // Ancho renderizado = round(1536 * 0.15) = 230 px.
    // left.xMax+230=560 < center.xMin=570; center.xMax+230=880 < right.xMin=890.
    targets: [
      { asset: 'targetNormal', x: 220,  y:  65, scale: 0.15,
        collisionOffsetX: 115, collisionOffsetY: 77,
        bounds: { xMin: 220, xMax: 330, yMin:  45, yMax:  85 } },
      { asset: 'targetNormal', x: 600,  y:  50, scale: 0.15,
        collisionOffsetX: 115, collisionOffsetY: 77,
        bounds: { xMin: 570, xMax: 650, yMin:  35, yMax:  70 } },
      { asset: 'targetGold',   x: 1000, y:  50, scale: 0.15,
        collisionOffsetX: 115, collisionOffsetY: 77,
        bounds: { xMin: 890, xMax: 1020, yMin: 35, yMax:  70 } },
    ],
    zzz: [
      { asset: 'zzzSmall',  x: 400, y: 130, scale: 0.18 },
      { asset: 'zzzMedium', x: 600, y:  80, scale: 0.18 },
      { asset: 'zzzLarge',  x: 790, y:  60, scale: 0.18 },
    ],

    maxDrag:         120,
    minDrag:         12,
    minSpeed:        150,
    maxSpeed:        600,
    gravity:         300,
    hitRadius:       90,
    clockScale:      0.12,
    rotSpeed:        5.0,
    releaseDuration: 0.13,
    dtMax:           0.10,

    // Radios de colisión provisional (px virtuales). Reflejan contenido visible, no PNG completo.
    targetHitRadius:     60,  // provisional Fase 4
    projectileHitRadius: 25,  // provisional Fase 4
    hotDuration:        1.5,  // segundos en estado hot

    // Valores de juego provisionales Fase 4 — SPEC.md no los define numéricamente.
    scorePerHit:  100,
    alarmPerHit:   10,

    // Velocidades de movimiento por nivel de dificultad (px/s).
    // Nivel 0: estático. Niveles 1-3 activos a partir de 40/65/85% de alarma.
    movement: [
      null,
      { speedMin:  30, speedMax:  50 },
      { speedMin:  70, speedMax: 110 },
      { speedMin: 130, speedMax: 170 },
    ],

    hud: {
      font:           'bold 26px monospace',
      colorText:      '#fff',
      shadowColor:    '#000',
      shadowBlur:     4,
      scoreX:         20,
      scoreY:         40,
      alarmLabelX:    20,
      alarmLabelY:    75,
      barX:           20,
      barY:           88,
      barW:           200,
      barH:           18,
      colorBarBg:     '#333',
      colorBarFill:   '#f90',
      colorBarBorder: '#fff',
      barBorderWidth: 1,
    },

    completionMessage: {
      text:        'No hay caso… no hay cómo despertarlos.',
      font:        'bold 34px monospace',
      padding:     20,
      boxHeight:   64,
      centerY:     360,
      colorBox:    'rgba(0,0,0,0.68)',
      colorBorder: 'rgba(255,255,255,0.55)',
      borderWidth: 2,
      colorText:   '#ffffff',
      shadowColor: '#000000',
      shadowBlur:  8,
    },
  };

  // Escenas obligatorias para Fase 5. Fallos se reportan con console.error.
  const SCENE_KEYS = [
    'sceneSleeping',
    'sceneReacting1', 'sceneReacting2', 'sceneYawning',
    'slingshotIdle', 'slingshotPulled', 'slingshotRelease',
    'targetNormal', 'targetHot', 'targetGold',
    'zzzSmall', 'zzzMedium', 'zzzLarge',
    'clockRed',
  ];

  // Claves de escenas que deben tratarse como obligatorias (error, no warn).
  const REQUIRED_SCENE_KEYS = ['sceneSleeping', 'sceneReacting1', 'sceneReacting2', 'sceneYawning'];

  // — Canvas / context —
  var canvas, ctx, assets, _resizeFn;

  // — RAF —
  var _rafId    = null;
  var _lastTime = null;

  // — Estado de la resortera —
  var _state           = 'idle'; // 'idle' | 'pulling' | 'releasing'
  var _releaseTimer    = 0;
  var _pullVX          = 0;
  var _pullVY          = 0;
  var _activePointerId = null;

  // — Proyectiles —
  var _projectiles = []; // { prevX, prevY, x, y, vx, vy, rotation, consumed }

  // — Estado jugable —
  var _score     = 0;
  var _alarm     = 0;   // 0–100
  var _targets   = null; // inicializado en initTargets()
  var _diffLevel = 0;    // 0|1|2|3 — nivel de dificultad activo
  var _phase     = 'playing'; // 'playing' | 'completed'

  // — Refs de handlers para cleanup —
  var _pdownFn, _pmoveFn, _pupFn, _pcancelFn, _plostFn;

  // ---------------------------------------------------------------------------
  // Helpers de dibujo (conservados para fases futuras)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Coordenadas
  // ---------------------------------------------------------------------------

  function toVirtual(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var sx = rect.width  / C.W;
    var sy = rect.height / C.H;
    return { x: (clientX - rect.left) / sx,
             y: (clientY - rect.top)  / sy };
  }

  function pocketPos() {
    var cfg = C.slingshot;
    var def = STAGE2_MANIFEST.slingshotIdle;
    var dh  = Math.round(def.h * cfg.scale);
    return {
      x: cfg.centerX,
      y: cfg.bottomY - dh + Math.round(dh * C.pocket.offsetRatioY),
    };
  }

  // ---------------------------------------------------------------------------
  // Colisión continua — distancia mínima de punto a segmento
  // ---------------------------------------------------------------------------

  function pointSegmentDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      dx = px - ax; dy = py - ay;
      return Math.sqrt(dx * dx + dy * dy);
    }
    var t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    var nx = ax + t * dx - px;
    var ny = ay + t * dy - py;
    return Math.sqrt(nx * nx + ny * ny);
  }

  // ---------------------------------------------------------------------------
  // Dificultad progresiva — helpers
  // ---------------------------------------------------------------------------

  function getSceneKey(alarm) {
    if (alarm >= 85) return 'sceneYawning';
    if (alarm >= 65) return 'sceneReacting2';
    if (alarm >= 40) return 'sceneReacting1';
    return 'sceneSleeping';
  }

  function getZzzCount(alarm) {
    if (alarm >= 85) return 0;
    if (alarm >= 65) return 1;
    if (alarm >= 40) return 2;
    return 3;
  }

  function getDifficultyLevel(alarm) {
    if (alarm >= 85) return 3;
    if (alarm >= 65) return 2;
    if (alarm >= 40) return 1;
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Targets — inicialización
  // ---------------------------------------------------------------------------

  function initTargets() {
    _targets = C.targets.map(function (cfg) {
      return {
        x:                cfg.x,
        y:                cfg.y,
        scale:            cfg.scale,
        restAsset:        cfg.asset,
        collisionOffsetX: cfg.collisionOffsetX,
        collisionOffsetY: cfg.collisionOffsetY,
        hot:              false,
        hotTimer:         0,
        vx:               0,
        vy:               0,
        bounds:           cfg.bounds,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Targets — movimiento y velocidades
  // ---------------------------------------------------------------------------

  // Signos iniciales distintos por target: evitan movimiento sincronizado.
  var _initSignX = [ 1, -1,  1];
  var _initSignY = [ 1,  1, -1];

  function assignTargetVelocities(level) {
    if (level === 0) {
      _targets.forEach(function (t) { t.vx = 0; t.vy = 0; });
      return;
    }
    var cfg = C.movement[level];
    _targets.forEach(function (t, i) {
      var speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
      var currentSpeed = Math.sqrt(t.vx * t.vx + t.vy * t.vy);
      if (currentSpeed > 0) {
        // Escalar magnitud preservando dirección exacta.
        t.vx = (t.vx / currentSpeed) * speed;
        t.vy = (t.vy / currentSpeed) * speed;
      } else {
        // Primera asignación: ángulo entre 25°–65° garantiza diagonal; magnitud exacta = speed.
        var theta = (25 + Math.random() * 40) * Math.PI / 180;
        t.vx = _initSignX[i] * Math.cos(theta) * speed;
        t.vy = _initSignY[i] * Math.sin(theta) * speed;
      }
    });
  }

  function updateTargets(dt) {
    _targets.forEach(function (t) {
      if (t.vx === 0 && t.vy === 0) return;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      var b = t.bounds;
      if (t.x < b.xMin) { t.x = b.xMin; t.vx =  Math.abs(t.vx); }
      if (t.x > b.xMax) { t.x = b.xMax; t.vx = -Math.abs(t.vx); }
      if (t.y < b.yMin) { t.y = b.yMin; t.vy =  Math.abs(t.vy); }
      if (t.y > b.yMax) { t.y = b.yMax; t.vy = -Math.abs(t.vy); }
    });
  }

  // ---------------------------------------------------------------------------
  // Resortera — helpers de estado
  // ---------------------------------------------------------------------------

  function cancelDrag() {
    _state           = 'idle';
    _releaseTimer    = 0;
    _activePointerId = null;
    _pullVX          = 0;
    _pullVY          = 0;
  }

  function launch(startX, startY, dx, dy, dist) {
    var ratio = Math.min(dist, C.maxDrag) / C.maxDrag;
    var speed = C.minSpeed + ratio * (C.maxSpeed - C.minSpeed);
    _projectiles.push({
      prevX:    startX,
      prevY:    startY,
      x:        startX,
      y:        startY,
      vx:       -(dx / dist) * speed,
      vy:       -(dy / dist) * speed,
      rotation: 0,
      consumed: false,
    });
  }

  // ---------------------------------------------------------------------------
  // Pointer events
  // ---------------------------------------------------------------------------

  function onPointerDown(e) {
    if (_phase !== 'playing') return;
    if (_state !== 'idle') return;
    var v  = toVirtual(e.clientX, e.clientY);
    var pk = pocketPos();
    var dx = v.x - pk.x;
    var dy = v.y - pk.y;
    if (Math.sqrt(dx * dx + dy * dy) > C.hitRadius) return;

    canvas.setPointerCapture(e.pointerId);
    _activePointerId = e.pointerId;
    _state = 'pulling';

    var dy2  = Math.max(0, dy);
    var dist = Math.sqrt(dx * dx + dy2 * dy2);
    var cap  = Math.min(dist, C.maxDrag);
    _pullVX  = pk.x + (dist > 0 ? (dx  / dist) * cap : 0);
    _pullVY  = pk.y + (dist > 0 ? (dy2 / dist) * cap : 0);
  }

  function onPointerMove(e) {
    if (_state !== 'pulling' || e.pointerId !== _activePointerId) return;
    var v  = toVirtual(e.clientX, e.clientY);
    var pk = pocketPos();
    var dx = v.x - pk.x;
    var dy = v.y - pk.y;
    var dy2  = Math.max(0, dy);
    var dist = Math.sqrt(dx * dx + dy2 * dy2);
    var cap  = Math.min(dist, C.maxDrag);
    _pullVX  = pk.x + (dist > 0 ? (dx  / dist) * cap : 0);
    _pullVY  = pk.y + (dist > 0 ? (dy2 / dist) * cap : 0);
  }

  function onPointerUp(e) {
    if (_state !== 'pulling' || e.pointerId !== _activePointerId) return;

    var pk   = pocketPos();
    var dx   = _pullVX - pk.x;
    var dy   = _pullVY - pk.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < C.minDrag) {
      cancelDrag();
      return;
    }

    var startX = _pullVX;
    var startY = _pullVY;

    launch(startX, startY, dx, dy, dist);

    _state        = 'releasing';
    _releaseTimer = C.releaseDuration;

    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    _activePointerId = null;
    _pullVX          = 0;
    _pullVY          = 0;
  }

  function onPointerCancel(e) {
    if (e.pointerId !== _activePointerId) return;
    cancelDrag();
  }

  // ---------------------------------------------------------------------------
  // Cierre de etapa
  // ---------------------------------------------------------------------------

  function completeStage() {
    if (_phase !== 'playing') return;
    _phase = 'completed';
    _targets.forEach(function (t) {
      t.vx = 0; t.vy = 0;
      t.hot = false; t.hotTimer = 0;
    });
    cancelDrag();
  }

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------

  function loop(timestamp) {
    _rafId = requestAnimationFrame(loop);

    var dt = 0;
    if (_lastTime !== null) {
      dt = Math.min((timestamp - _lastTime) / 1000, C.dtMax);
    }
    _lastTime = timestamp;

    if (_state === 'releasing') {
      _releaseTimer -= dt;
      if (_releaseTimer <= 0) {
        _state        = 'idle';
        _releaseTimer = 0;
      }
    }

    if (!_targets) { drawScene(); return; }

    // 1 — Enfriar blancos
    _targets.forEach(function (t) {
      if (t.hot) {
        t.hotTimer -= dt;
        if (t.hotTimer <= 0) { t.hot = false; t.hotTimer = 0; }
      }
    });

    // 2 — Dificultad progresiva: nivel sube con la alarma, nunca baja
    if (_phase === 'playing') {
      var newLevel = getDifficultyLevel(_alarm);
      if (newLevel > _diffLevel) {
        _diffLevel = newLevel;
        assignTargetVelocities(_diffLevel);
      }
    }

    // 3 — Mover blancos (rebote en t.bounds)
    if (_phase === 'playing') updateTargets(dt);

    // 4 — Física: guardar posición anterior, luego avanzar
    _projectiles.forEach(function (p) {
      p.prevX     = p.x;
      p.prevY     = p.y;
      p.x        += p.vx * dt;
      p.y        += p.vy * dt;
      p.vy       += C.gravity * dt;
      p.rotation += C.rotSpeed * dt;
    });

    // 5 — Detección de colisión continua
    if (_phase === 'playing') {
      var combined = C.targetHitRadius + C.projectileHitRadius;
      outer: for (var pi = 0; pi < _projectiles.length; pi++) {
        var p = _projectiles[pi];
        if (p.consumed) continue;
        for (var ti = 0; ti < _targets.length; ti++) {
          var t   = _targets[ti];
          var cx  = t.x + t.collisionOffsetX;
          var cy  = t.y + t.collisionOffsetY;
          var d   = pointSegmentDist(cx, cy, p.prevX, p.prevY, p.x, p.y);
          if (d <= combined) {
            p.consumed = true;
            if (!t.hot) {
              t.hot      = true;
              t.hotTimer = C.hotDuration;
              _score    += C.scorePerHit;
              _alarm     = Math.min(100, _alarm + C.alarmPerHit);
              if (_alarm >= 100) {
                completeStage();
                break outer;
              }
            }
            break;
          }
        }
      }
    }

    // 6 — Eliminar proyectiles consumidos o fuera de canvas
    _projectiles = _projectiles.filter(function (p) {
      return !p.consumed
          && p.x > -150 && p.x < C.W + 150
          && p.y > -150 && p.y < C.H + 150;
    });

    drawScene();
  }

  // ---------------------------------------------------------------------------
  // Dibujo
  // ---------------------------------------------------------------------------

  function drawSlingshot() {
    var key = _state === 'pulling'   ? 'slingshotPulled'  :
              _state === 'releasing' ? 'slingshotRelease' :
                                       'slingshotIdle';
    var entry = assets[key];
    if (!entry || !entry.ok) entry = assets.slingshotIdle; // fallback
    if (!entry || !entry.ok) return;

    var cfg = C.slingshot;
    var def = STAGE2_MANIFEST[key] || STAGE2_MANIFEST.slingshotIdle;
    var dw  = Math.round(def.w * cfg.scale);
    var dh  = Math.round(def.h * cfg.scale);
    ctx.drawImage(entry.img, 0, 0, def.w, def.h,
      cfg.centerX - Math.round(dw / 2), cfg.bottomY - dh, dw, dh);
  }

  function drawClock() {
    var entry = assets.clockRed;
    if (!entry || !entry.ok) return;
    var def = STAGE2_MANIFEST.clockRed;
    var dw  = Math.round(def.w * C.clockScale);
    var dh  = Math.round(def.h * C.clockScale);
    ctx.drawImage(entry.img, 0, 0, def.w, def.h,
      Math.round(_pullVX - dw / 2), Math.round(_pullVY - dh / 2), dw, dh);
  }

  function drawProjectile(p) {
    var entry = assets.clockRed;
    if (!entry || !entry.ok) return;
    var def = STAGE2_MANIFEST.clockRed;
    var dw  = Math.round(def.w * C.clockScale);
    var dh  = Math.round(def.h * C.clockScale);
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(p.rotation);
    ctx.drawImage(entry.img, 0, 0, def.w, def.h,
      -Math.round(dw / 2), -Math.round(dh / 2), dw, dh);
    ctx.restore();
  }

  function drawHUD() {
    var h = C.hud;
    ctx.save();
    ctx.font        = h.font;
    ctx.fillStyle   = h.colorText;
    ctx.shadowColor = h.shadowColor;
    ctx.shadowBlur  = h.shadowBlur;
    ctx.fillText('SCORE: ' + _score,       h.scoreX,      h.scoreY);
    ctx.fillText('ALARMA: ' + _alarm + '%', h.alarmLabelX, h.alarmLabelY);
    ctx.shadowBlur = 0;
    ctx.fillStyle  = h.colorBarBg;
    ctx.fillRect(h.barX, h.barY, h.barW, h.barH);
    ctx.fillStyle  = h.colorBarFill;
    ctx.fillRect(h.barX, h.barY, Math.round(h.barW * _alarm / 100), h.barH);
    ctx.strokeStyle = h.colorBarBorder;
    ctx.lineWidth   = h.barBorderWidth;
    ctx.strokeRect(h.barX, h.barY, h.barW, h.barH);
    ctx.restore();
  }

  function drawCompletionMessage() {
    var cm = C.completionMessage;
    ctx.save();
    ctx.font = cm.font;
    var tw = ctx.measureText(cm.text).width;
    var bx = Math.round((C.W - tw) / 2) - cm.padding;
    var by = cm.centerY - Math.round(cm.boxHeight / 2);
    var bw = Math.round(tw) + cm.padding * 2;
    ctx.fillStyle   = cm.colorBox;
    ctx.fillRect(bx, by, bw, cm.boxHeight);
    ctx.strokeStyle = cm.colorBorder;
    ctx.lineWidth   = cm.borderWidth;
    ctx.strokeRect(bx, by, bw, cm.boxHeight);
    ctx.fillStyle    = cm.colorText;
    ctx.shadowColor  = cm.shadowColor;
    ctx.shadowBlur   = cm.shadowBlur;
    ctx.textBaseline = 'middle';
    ctx.fillText(cm.text, bx + cm.padding, by + cm.boxHeight / 2);
    ctx.restore();
  }

  function drawScene() {
    var a = assets;
    var m = STAGE2_MANIFEST;

    ctx.clearRect(0, 0, C.W, C.H);

    // Capa 1 — Escena compuesta según progreso de alarma
    var sceneKey = getSceneKey(_alarm);
    if (!(a[sceneKey] && a[sceneKey].ok)) sceneKey = 'sceneSleeping';
    if (a[sceneKey] && a[sceneKey].ok) {
      ctx.drawImage(a[sceneKey].img,
        0, 0, m[sceneKey].w, m[sceneKey].h,
        0, 0, C.W, C.H);
    }

    // Capa 2 — Blancos con estado dinámico (hot o reposo)
    if (_targets) {
      _targets.forEach(function (t) {
        var key   = t.hot ? 'targetHot' : t.restAsset;
        var asset = a[key];
        if (asset && asset.ok) drawFull(asset.img, m[key], t.x, t.y, t.scale);
      });
    } else {
      C.targets.forEach(function (t) {
        var asset = a[t.asset];
        if (asset && asset.ok) drawFull(asset.img, m[t.asset], t.x, t.y, t.scale);
      });
    }

    // Capa 3 — Zzz (cantidad según progreso de alarma)
    var zzzCount = getZzzCount(_alarm);
    C.zzz.slice(0, zzzCount).forEach(function (z) {
      var asset = a[z.asset];
      if (asset && asset.ok) drawFull(asset.img, m[z.asset], z.x, z.y, z.scale);
    });

    // Capa 4 — Resortera (estado actual)
    drawSlingshot();

    // Capa 5 — Reloj en el pouch durante el arrastre
    if (_state === 'pulling') drawClock();

    // Capa 6 — Proyectiles en vuelo
    _projectiles.forEach(drawProjectile);

    // Capa 7 — HUD (última capa, sobre todo)
    drawHUD();

    // Capa 8 — Mensaje de cierre (solo en estado completed)
    if (_phase === 'completed') drawCompletionMessage();
  }

  // ---------------------------------------------------------------------------
  // Canvas
  // ---------------------------------------------------------------------------

  function resizeS2() {
    var s = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);
    canvas.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 's2canvas';
    canvas.width  = C.W;
    canvas.height = C.H;
    canvas.style.cssText = [
      'position:fixed',
      'left:50%',
      'top:50%',
      'display:block',
      'transform-origin:center center',
      'touch-action:none',
      'cursor:crosshair',
    ].join(';');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    _resizeFn = resizeS2;
    window.addEventListener('resize', _resizeFn);
    resizeS2();

    _pdownFn   = onPointerDown;
    _pmoveFn   = onPointerMove;
    _pupFn     = onPointerUp;
    _pcancelFn = onPointerCancel;
    _plostFn   = onPointerCancel; // lostpointercapture cancela igual que pointercancel
    canvas.addEventListener('pointerdown',        _pdownFn);
    canvas.addEventListener('pointermove',        _pmoveFn);
    canvas.addEventListener('pointerup',          _pupFn);
    canvas.addEventListener('pointercancel',      _pcancelFn);
    canvas.addEventListener('lostpointercapture', _plostFn);
  }

  // ---------------------------------------------------------------------------
  // Carga de assets
  // ---------------------------------------------------------------------------

  function loadSceneAssets() {
    var results = {};
    return Promise.all(SCENE_KEYS.map(function (key) {
      return new Promise(function (resolve) {
        var src = STAGE2_MANIFEST[key].src;
        var img = new Image();
        img.onload  = function () { results[key] = { img: img, ok: true }; resolve(); };
        img.onerror = function () {
          results[key] = { img: null, ok: false };
          if (REQUIRED_SCENE_KEYS.indexOf(key) !== -1) {
            console.error('[Stage2] ERROR: escena obligatoria no cargó:', src);
          } else {
            console.warn('[Stage2] Asset no cargó:', src);
          }
          resolve();
        };
        img.src = src;
      });
    })).then(function () { return results; });
  }

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------

  function devStart() {
    return loadSceneAssets().then(function (loaded) {
      assets     = loaded;
      _score     = 0;
      _alarm     = 0;
      _diffLevel = 0;
      _phase     = 'playing';
      initTargets();
      createCanvas();
      _rafId = requestAnimationFrame(loop);
    });
  }

  function start() {
    // stub — integración Etapa 1 en Fase 7
  }

  function stop() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }

    if (canvas) {
      canvas.removeEventListener('pointerdown',        _pdownFn);
      canvas.removeEventListener('pointermove',        _pmoveFn);
      canvas.removeEventListener('pointerup',          _pupFn);
      canvas.removeEventListener('pointercancel',      _pcancelFn);
      canvas.removeEventListener('lostpointercapture', _plostFn);
      if (_activePointerId !== null) {
        try { canvas.releasePointerCapture(_activePointerId); } catch (err) {}
      }
      canvas.remove();
      canvas = null;
    }

    if (_resizeFn) { window.removeEventListener('resize', _resizeFn); _resizeFn = null; }

    ctx              = null;
    assets           = null;
    _projectiles     = [];
    _state           = 'idle';
    _activePointerId = null;
    _pullVX          = 0;
    _pullVY          = 0;
    _releaseTimer    = 0;
    _lastTime        = null;
    _score           = 0;
    _alarm           = 0;
    _diffLevel       = 0;
    _phase           = 'playing';
    _targets         = null;
  }

  window.Stage2 = { devStart: devStart, start: start, stop: stop };
}());
