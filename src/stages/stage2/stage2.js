(function () {
'use strict';

// ── Estado de carga y ciclo de vida ─────────────────────────────────────────
var _canvas, _ctx;
var _rafId = null, _lastTime = null;
var _started = false, _startPromise = null, _runToken = 0;
var _resizeFn, _s1hudEl;

// ── Estado de juego ──────────────────────────────────────────────────────────
var _assets = null;
var _sm     = null;  // SceneManager
var _gs     = null;  // gameState

// ── Hook de completado hacia el host (progresión → Etapa 3) ───────────────────
var _onComplete       = null;   // callback opcional pasado por start({onComplete})
var _completeNotified = false;  // asegura una sola notificación por partida

// ── Modo debug ───────────────────────────────────────────────────────────────
var _debug = (typeof location !== 'undefined' && location.search.indexOf('debug=1') !== -1);

// ── Mensajes en pantalla ─────────────────────────────────────────────────────
var _messages = [];

function showMsg(text, color) {
  _messages.push({ text: text, color: color || '#ffffff', y: 240, alpha: 1, timer: 1.8 });
  if (_gs) _gs._showMsg = showMsg; // asegurar referencia
}

function updateMessages(dt) {
  _messages = _messages.filter(function(m) {
    m.timer -= dt;
    m.y     -= 28 * dt;
    m.alpha  = Math.min(1, m.timer * 1.5);
    return m.timer > 0;
  });
}

function drawMessages(ctx) {
  _messages.forEach(function(m) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, m.alpha);
    ctx.font      = S2C.hud.fontLg;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(18,14,24,0.65)';
    var tw = ctx.measureText(m.text).width;
    ctx.fillRect(Math.round(S2C.W / 2 - tw / 2 - 10), Math.round(m.y - 24), tw + 20, 34);
    ctx.fillStyle = m.color;
    ctx.fillText(m.text, S2C.W / 2, m.y);
    ctx.restore();
  });
}

// ── HUD principal ─────────────────────────────────────────────────────────────
var SCENE_ICONS = {
  INTRO:                     '🏠',
  APARTMENT_RUN:             '🏠',
  MOVING_PLATFORM_CROSSING:  '🌉',
  SANTA_LUCIA_LANES:         '🚇',
  METRO_GATE:                '🎫',
  METRO_TRANSITION:          '🚊',
  BUS_STOP:                  '🚌',
  BUS_TRANSITION:            '🚌',
  CLINIC_RUN:                '🏥',
  COMPLETE:                  '🎉',
  FAILED:                    '💤',
};

function drawHUD(ctx, gs) {
  var H = S2C.hud;

  // Barra semitransparente
  ctx.fillStyle = H.colorBg;
  ctx.fillRect(0, 0, S2C.W, H.barH);

  // ── Cronómetro (centro) ──
  var mm = Math.floor(gs.timer / 60);
  var ss = Math.floor(gs.timer % 60).toString().padStart(2, '0');
  ctx.font      = H.fontLg;
  ctx.textAlign = 'center';
  ctx.fillStyle = gs.timer < 20 ? H.colorWarn : H.colorText;
  ctx.fillText(mm + ':' + ss, S2C.W / 2, 34);

  // ── Saldo Bip (izquierda) — objetivo fijo en 5; extras como bonus ──
  var req   = S2C.bipCredit.required;
  var shown = Math.min(gs.bipCount, req);
  ctx.font      = H.fontMd;
  ctx.textAlign = 'left';
  ctx.fillStyle = gs.bipCount >= req ? H.colorOk : H.colorText;
  ctx.fillText('Bip ' + shown + '/' + req, 14, 33);
  if (gs.bipBonus) {
    ctx.font = H.fontSm;
    ctx.fillStyle = '#ffd166';
    ctx.fillText('+' + gs.bipBonus + ' bonus', 96, 32);
  }

  // ── Audífonos (derecha) ──
  if (gs.headphonesTimer > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a0c4ff';
    ctx.font = H.fontSm;
    ctx.fillText('Audífonos ' + gs.headphonesTimer.toFixed(1) + 's', S2C.W - 14, 22);
  }

  // ── Escena / progreso (derecha) ──
  var scKey = _sm ? _sm.key : '';
  var icon  = SCENE_ICONS[scKey] || '';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = H.fontSm;
  ctx.fillText(icon, S2C.W - 14, 42);
}

// ── HUD de victoria ───────────────────────────────────────────────────────────
function drawWinScreen(ctx, gs) {
  ctx.fillStyle = 'rgba(18,14,24,0.88)';
  ctx.fillRect(0, 0, S2C.W, S2C.H);

  var stars = gs.timer >= S2C.stars.three ? 3 :
              gs.timer >= S2C.stars.two   ? 2 : 1;
  gs.stars = stars;

  ctx.textAlign = 'center';
  ctx.font = 'bold 46px "Baloo 2","Nunito",system-ui,sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText('¡Llegaste a tiempo!', S2C.W / 2, 200);

  ctx.font = 'bold 28px "Nunito",system-ui,sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), S2C.W / 2, 260);

  ctx.font = '20px "Nunito",system-ui,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  var mm = Math.floor(gs.timer / 60);
  var ss = Math.floor(gs.timer % 60).toString().padStart(2, '0');
  ctx.fillText('Tiempo restante: ' + mm + ':' + ss, S2C.W / 2, 306);
  ctx.fillText('Puntaje: '           + (gs.score || 0), S2C.W / 2, 336);
  ctx.fillText('Saldo Bip recogido: ' + gs.bipCount, S2C.W / 2, 366);
  ctx.fillText('Golpes recibidos: '   + gs.hits,     S2C.W / 2, 396);
  ctx.fillText('Caídas: '             + gs.falls,    S2C.W / 2, 426);
  if (gs.caughtFirstBus) {
    ctx.fillStyle = '#6bff9e';
    ctx.fillText('Alcanzaste la primera micro', S2C.W / 2, 440);
  }

  // Con host (progresión), el avance lo controla el botón DOM "Continuar a Etapa 3".
  if (!_onComplete) {
    ctx.font = '17px "Nunito",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('Presiona Espacio para reiniciar', S2C.W / 2, 510);
    if (S2Input.pressed('jump') || S2Input.pressed('right')) {
      restartGame();
    }
  } else {
    ctx.font = '17px "Nunito",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('Etapa 2 completada', S2C.W / 2, 510);
  }
}

// ── HUD de derrota ────────────────────────────────────────────────────────────
function drawLoseScreen(ctx, gs) {
  ctx.fillStyle = 'rgba(18,14,24,0.90)';
  ctx.fillRect(0, 0, S2C.W, S2C.H);

  ctx.textAlign = 'center';
  ctx.font = 'bold 40px "Baloo 2","Nunito",system-ui,sans-serif';
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('Otra vez llegaste tarde…', S2C.W / 2, 230);

  ctx.font = '20px "Nunito",system-ui,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('El tiempo se agotó', S2C.W / 2, 290);
  ctx.fillText('Saldo recogido: ' + gs.bipCount, S2C.W / 2, 330);

  ctx.font = '17px "Nunito",system-ui,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('Espacio — reintentar Stage 2', S2C.W / 2, 430);

  if (S2Input.pressed('jump') || S2Input.pressed('right')) {
    restartGame();
  }
}

// ── Debug de escena: suelo, carriles, hitboxes, anclas de pies ────────────────
function drawSceneDebug(ctx) {
  if (!_sm || !_sm.scene || !_sm.scene.debugInfo) return;
  var info = _sm.scene.debugInfo();
  var camX = info.camX || 0;

  ctx.save();
  ctx.lineWidth = 1;

  // Línea de suelo
  if (typeof info.groundY === 'number') {
    ctx.strokeStyle = 'rgba(0,255,180,0.9)';
    ctx.beginPath(); ctx.moveTo(0, info.groundY); ctx.lineTo(S2C.W, info.groundY); ctx.stroke();
    ctx.fillStyle = 'rgba(0,255,180,0.9)'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('groundY ' + Math.round(info.groundY), 4, info.groundY - 3);
  }
  // Carriles
  if (info.lanes) {
    info.lanes.forEach(function(ly, i) {
      ctx.strokeStyle = 'rgba(120,200,255,0.8)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(S2C.W, ly); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(120,200,255,0.9)'; ctx.font = '11px monospace';
      ctx.fillText('lane ' + i + ' y=' + ly, 4, ly - 3);
    });
  }
  // Plataformas
  if (info.platforms) info.platforms.forEach(function(p) { if (p.drawDebug) p.drawDebug(ctx, camX); });
  // Zona de caída
  if (typeof info.fallY === 'number') {
    ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(0, info.fallY); ctx.lineTo(S2C.W, info.fallY); ctx.stroke();
    ctx.setLineDash([]);
  }
  // Hitboxes + ancla de pies de actores
  function drawHB(o, color) {
    if (!o || !o.hitbox) return;
    var hb = o.hitbox();
    ctx.strokeStyle = color;
    ctx.strokeRect(Math.round(hb.x - camX), Math.round(hb.y), Math.round(hb.w), Math.round(hb.h));
    // ancla de pies (centro-inferior del hitbox)
    var fx = hb.x + hb.w / 2 - camX, fy = hb.y + hb.h;
    ctx.fillStyle = '#ff3';
    ctx.fillRect(Math.round(fx) - 2, Math.round(fy) - 2, 4, 4);
  }
  (info.actors || []).forEach(function(a) { if (a && a.active !== false) drawHB(a, 'rgba(0,255,0,0.85)'); });
  (info.items || []).forEach(function(it) { if (it && it.active) drawHB(it, 'rgba(255,255,0,0.7)'); });
  (info.props || []).forEach(function(p) {
    if (p && typeof p.x === 'number') {
      ctx.fillStyle = '#f0f'; ctx.fillRect(Math.round(p.x - camX) - 2, Math.round((p.y||0)) - 2, 4, 4);
    }
  });
  if (info.micro && info.micro.active) {
    ctx.strokeStyle = 'rgba(0,255,255,0.8)';
    ctx.strokeRect(Math.round(info.micro.x - camX), Math.round(info.micro.y), Math.round(info.micro.rW), Math.round(info.micro.rH));
    if (info.micro.state === 'open') {
      ctx.fillStyle = 'rgba(0,255,255,0.18)';
      ctx.fillRect(Math.round(info.micro.doorX - camX), Math.round(info.micro.y), Math.round(info.micro.doorW), Math.round(info.micro.rH));
    }
  }
  ctx.restore();
}

// ── Debug overlay ─────────────────────────────────────────────────────────────
function drawDebugOverlay(ctx, gs) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 56, 240, 160);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#0f0';
  ctx.textAlign = 'left';
  var lines = [
    'FPS: ' + Math.round(1 / (_lastDt || 0.016)),
    'Scene: ' + (_sm ? _sm.key : '—'),
    'Timer: ' + (_gs ? _gs.timer.toFixed(2) : '—'),
    'Bip: ' + (_gs ? _gs.bipCount : '—'),
    'Hits: ' + (_gs ? _gs.hits : '—'),
    'Falls: ' + (_gs ? _gs.falls : '—'),
    'Headphones: ' + (_gs ? _gs.headphonesTimer.toFixed(1) : '—'),
    'Checkpoint: ' + (_gs && _gs.checkpoint ? _gs.checkpoint.scene : 'none'),
    'Bounds(B): ' + (_dbgBounds ? 'ON' : 'off'),
  ];
  lines.forEach(function(l, i) { ctx.fillText(l, 6, 72 + i * 16); });
  ctx.restore();

  // Debug teclas
  if (S2Input.pressed('dbgNext'))     { if (_sm) _sm.transitionTo(nextSceneKey(_sm.key)); }
  if (S2Input.pressed('dbgTimeUp'))   { if (_gs) _gs.timer = Math.min(S2C.timer.max, _gs.timer + 15); }
  if (S2Input.pressed('dbgTimeDown')) { if (_gs) _gs.timer = Math.max(0, _gs.timer - 15); }
  if (S2Input.pressed('dbgInvul') && _sm && _sm.scene && _sm.scene.getPlayer) {
    _sm.scene.getPlayer().invulTimer = 30;
  }
  if (S2Input.pressed('dbgBounds')) _dbgBounds = !_dbgBounds;
}

var _lastDt = 0.016;
var _dbgBounds = false;   // vista de hitboxes/suelo/carriles (tecla B)

var SCENE_ORDER = [
  'INTRO','APARTMENT_RUN','MOVING_PLATFORM_CROSSING','SANTA_LUCIA_LANES',
  'METRO_GATE','METRO_TRANSITION','BUS_STOP','BUS_TRANSITION','CLINIC_RUN','COMPLETE',
];
function nextSceneKey(current) {
  var i = SCENE_ORDER.indexOf(current);
  return SCENE_ORDER[Math.min(i + 1, SCENE_ORDER.length - 1)];
}

// ── Loop principal ────────────────────────────────────────────────────────────
function loop(timestamp) {
  _rafId = requestAnimationFrame(loop);

  var dt = 0;
  if (_lastTime !== null) dt = Math.min((timestamp - _lastTime) / 1000, S2C.dtMax);
  _lastTime = timestamp;
  _lastDt   = dt;

  // Cronómetro global
  var scKey = _sm ? _sm.key : '';
  var timerRunning = scKey !== 'COMPLETE' && scKey !== 'FAILED' && scKey !== 'INTRO';
  if (timerRunning && _gs) {
    _gs.timer -= dt;
    // Techo duro: el cronómetro jamás supera el presupuesto total.
    if (_gs.timer > S2C.timer.max) _gs.timer = S2C.timer.max;
    if (_gs.timer <= 0) { _gs.timer = 0; _sm.transitionTo('FAILED'); }
  }

  // Audífonos
  if (_gs && _gs.headphonesTimer > 0) _gs.headphonesTimer = Math.max(0, _gs.headphonesTimer - dt);

  // Actualizar escena (usa pressed() con estado del frame anterior)
  if (_sm) _sm.update(dt);
  updateMessages(dt);

  // Dibujar
  _ctx.clearRect(0, 0, S2C.W, S2C.H);
  if (_sm) _sm.draw(_ctx);
  drawMessages(_ctx);

  if (_gs && scKey !== 'COMPLETE' && scKey !== 'FAILED') {
    drawHUD(_ctx, _gs);
  }
  if (_gs && scKey === 'COMPLETE') drawWinScreen(_ctx, _gs);
  if (_gs && scKey === 'FAILED')   drawLoseScreen(_ctx, _gs);

  if (_debug && _dbgBounds && scKey !== 'COMPLETE' && scKey !== 'FAILED') drawSceneDebug(_ctx);
  if (_debug) drawDebugOverlay(_ctx, _gs);

  // Guardar estado del frame actual como "previo" para pressed() del próximo frame
  S2Input.tick();

  // Notificar al host UNA sola vez al completar (progresión hacia la Etapa 3).
  // Va al FINAL del loop: si el host llama Stage2.stop() en el callback, ya no
  // queda dibujo pendiente que use el contexto destruido. gs.stars ya fue
  // calculado por drawWinScreen y los stats se capturan antes de invocar.
  if (scKey === 'COMPLETE' && _onComplete && !_completeNotified) {
    _completeNotified = true;
    _onComplete({
      timer: _gs.timer, score: _gs.score, bipCount: _gs.bipCount,
      stars: _gs.stars, hits: _gs.hits, falls: _gs.falls,
    });
  }
}

// ── Inicialización de estado ──────────────────────────────────────────────────
function freshGameState() {
  var gs = {
    timer:           S2C.timer.start,
    score:           0,
    bipCount:        0,
    bipBonus:        0,
    falls:           0,
    hits:            0,
    caughtFirstBus:  false,
    headphonesTimer: 0,
    checkpoint:      null,
    stars:           0,
    _showMsg:        showMsg,
  };
  return gs;
}

function restartGame() {
  _messages = [];
  _completeNotified = false;
  _gs = freshGameState();
  _sm.init(_gs);
}

// ── Canvas ────────────────────────────────────────────────────────────────────
function createCanvas() {
  _canvas = document.createElement('canvas');
  _canvas.id = 's2canvas';
  _canvas.width  = S2C.W;
  _canvas.height = S2C.H;
  _canvas.style.cssText = [
    'position:fixed',
    'left:50%',
    'top:50%',
    'transform-origin:center center',
    'display:block',
    'touch-action:none',
    'z-index:10',
  ].join(';');
  document.body.appendChild(_canvas);
  _ctx = _canvas.getContext('2d');
  _resizeFn = resizeCanvas;
  window.addEventListener('resize', _resizeFn);
  resizeCanvas();
}

function resizeCanvas() {
  if (!_canvas) return;
  var s = Math.min(window.innerWidth / S2C.W, window.innerHeight / S2C.H);
  _canvas.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
}

function destroyCanvas() {
  if (_resizeFn) { window.removeEventListener('resize', _resizeFn); _resizeFn = null; }
  if (_canvas && _canvas.parentNode) _canvas.parentNode.removeChild(_canvas);
  _canvas = null; _ctx = null;
}

// ── Stage1 HUD ────────────────────────────────────────────────────────────────
function hideS1HUD() {
  _s1hudEl = document.getElementById('hud');
  if (_s1hudEl) {
    _s1hudEl.dataset.s2prev = _s1hudEl.style.display;
    _s1hudEl.style.display = 'none';
  }
}
function showS1HUD() {
  if (_s1hudEl) {
    _s1hudEl.style.display = _s1hudEl.dataset.s2prev || '';
    delete _s1hudEl.dataset.s2prev;
    _s1hudEl = null;
  }
}

// ── API pública ───────────────────────────────────────────────────────────────
function devStart() {
  return loadS2Assets().then(function(loaded) {
    _assets = loaded;
    _gs = freshGameState();
    createCanvas();
    S2Input.init({ touch: true, upDown: false });
    _sm = makeSceneManager(_assets, null,
      function() { /* win callback no-op en devStart */ },
      function() { /* lose callback no-op en devStart */ }
    );
    _sm.init(_gs);
    _rafId = requestAnimationFrame(loop);
  });
}

function start(opts) {
  // opts.onComplete(stats) se invoca UNA vez al llegar a la clínica (COMPLETE).
  _onComplete = (opts && typeof opts.onComplete === 'function') ? opts.onComplete : null;
  _completeNotified = false;

  if (_startPromise) return _startPromise;
  if (_started)      return Promise.resolve();

  _started = true;
  _runToken++;
  var token = _runToken;

  _startPromise = loadS2Assets().then(function(loaded) {
    if (!_started || token !== _runToken) {
      var e = new Error('Stage2 start cancelled');
      e.code = 'STAGE2_START_CANCELLED';
      return Promise.reject(e);
    }
    _assets = loaded;
    _gs = freshGameState();
    hideS1HUD();
    createCanvas();
    S2Input.init({ touch: true, upDown: false });
    _sm = makeSceneManager(_assets, null, null, null);
    _sm.init(_gs);
    _rafId = requestAnimationFrame(loop);
  }).catch(function(err) {
    _startPromise = null;
    if (err && err.code === 'STAGE2_START_CANCELLED') return Promise.reject(err);
    console.error('[Stage2] error cargando assets:', err);
    _started = false;
    return Promise.reject(err);
  });

  return _startPromise;
}

function stop() {
  _runToken++;
  _startPromise = null;

  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  S2Input.destroy();
  destroyCanvas();
  showS1HUD();

  _assets  = null;
  _sm      = null;
  _gs      = null;
  _messages = [];
  _lastTime = null;
  _started  = false;
  _onComplete = null;
  _completeNotified = false;
}

function restart() {
  if (!_started || !_sm) return;
  _messages = [];
  restartGame();
}

function resize() {
  resizeCanvas();
}

// Introspección para QA/tests (no altera el juego).
function state() {
  return {
    key: _sm ? _sm.key : null,
    timer: _gs ? _gs.timer : null,
    bipCount: _gs ? _gs.bipCount : null,
    bipBonus: _gs ? _gs.bipBonus : null,
    score: _gs ? _gs.score : null,
    hits: _gs ? _gs.hits : null,
    falls: _gs ? _gs.falls : null,
    caughtFirstBus: _gs ? _gs.caughtFirstBus : null,
    playerX: (_sm && _sm.scene && _sm.scene.getPlayer) ? _sm.scene.getPlayer().x : null,
    playerY: (_sm && _sm.scene && _sm.scene.getPlayer) ? _sm.scene.getPlayer().y : null,
    onGround: (_sm && _sm.scene && _sm.scene.getPlayer) ? !!(_sm.scene.getPlayer().onGround || _sm.scene.getPlayer().onPlatform) : null,
    laneHint: (_sm && _sm.scene && _sm.scene.laneHint) ? _sm.scene.laneHint() : null,
    boardHint: (_sm && _sm.scene && _sm.scene.boardHint) ? _sm.scene.boardHint() : null,
  };
}

window.Stage2 = { devStart: devStart, start: start, stop: stop, restart: restart, resize: resize, state: state };

}());
