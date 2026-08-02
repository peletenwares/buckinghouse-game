'use strict';

// ── Helpers compartidos entre escenas ────────────────────────────────────────

function drawBackground(ctx, entry, def, camX, worldW) {
  if (!entry || !entry.ok || !def) return;
  var bgCfg = S2C.bg;
  var sw = bgCfg.scaledW;
  var sh = bgCfg.scaledH;
  // Calcular cuántas copias se necesitan
  var copies = Math.ceil(worldW / sw) + 1;
  for (var i = 0; i < copies; i++) {
    var dx = Math.round(i * sw - camX % sw - (sw - (camX % sw) > sw * 0.5 ? sw : 0));
    // Dibujar con desplazamiento correcto
    ctx.drawImage(entry.img, 0, 0, def.w, def.h,
      Math.round(-((camX) % sw) + i * sw), 0, sw, sh);
  }
}

function drawBgSimple(ctx, entry, def, camX, worldW) {
  if (!entry || !entry.ok || !def) return;
  var bgCfg = S2C.bg;
  var sw = bgCfg.scaledW;
  var sh = bgCfg.scaledH;
  var offset = -(camX % sw);
  var numCopies = Math.ceil(worldW / sw) + 1;
  for (var i = 0; i < numCopies; i++) {
    ctx.drawImage(entry.img, 0, 0, def.w, def.h,
      Math.round(offset + i * sw), 0, sw, sh);
  }
}

function clampCamera(camX, playerX, worldW) {
  var target = playerX - S2C.camera.leadX;
  camX += (target - camX) * 0.12;
  return Math.max(0, Math.min(camX, worldW - S2C.W));
}

// ── Máquina de estados ────────────────────────────────────────────────────────

function makeSceneManager(assets, onTransition, onWin, onLose) {
  var SCENES_ORDER = [
    'INTRO',
    'APARTMENT_RUN',
    'MOVING_PLATFORM_CROSSING',
    'SANTA_LUCIA_LANES',
    'METRO_GATE',
    'METRO_TRANSITION',
    'BUS_STOP',
    'BUS_TRANSITION',
    'CLINIC_RUN',
    'COMPLETE',
    'FAILED',
  ];

  var current = null;
  var key = 'INTRO';

  var sm = {
    key: key,
    scene: null,
    player: null,
    gameState: null,

    init: function(gs) {
      this.gameState = gs;
      this.transitionTo('INTRO');
    },

    transitionTo: function(newKey) {
      // Avisar a la escena actual que va a salir
      if (this.scene && this.scene.leave) this.scene.leave();
      key = newKey;
      this.key = newKey;
      this.scene = buildScene(newKey, assets, this);
      if (this.scene && this.scene.enter) this.scene.enter(this.gameState);
      if (onTransition) onTransition(newKey);
    },

    update: function(dt) {
      if (this.scene && this.scene.update) this.scene.update(dt, this.gameState);
    },

    draw: function(ctx) {
      if (this.scene && this.scene.draw) this.scene.draw(ctx, this.gameState);
    },
  };

  // ── Constructor de escenas por clave ────────────────────────────────────

  function buildScene(k, assets, sm) {
    switch (k) {
      case 'INTRO':                     return makeIntroScene(assets, sm);
      case 'APARTMENT_RUN':             return makeApartmentRun(assets, sm);
      case 'MOVING_PLATFORM_CROSSING':  return makePlatformCrossing(assets, sm);
      case 'SANTA_LUCIA_LANES':         return makeSantaLuciaLanes(assets, sm);
      case 'METRO_GATE':                return makeMetroGate(assets, sm);
      case 'METRO_TRANSITION':          return makeMetroTransition(assets, sm);
      case 'BUS_STOP':                  return makeBusStop(assets, sm);
      case 'BUS_TRANSITION':            return makeBusTransition(assets, sm);
      case 'CLINIC_RUN':                return makeClinicRun(assets, sm);
      case 'COMPLETE':                  if (onWin) onWin(); return makeEndScene(assets, sm, true);
      case 'FAILED':                    if (onLose) onLose(); return makeEndScene(assets, sm, false);
      default: return null;
    }
  }

  return sm;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: INTRO
// ─────────────────────────────────────────────────────────────────────────────
function makeIntroScene(assets, sm) {
  var timer = 0;
  var DURATION = 2.5;
  return {
    enter: function(gs) { timer = 0; },
    update: function(dt, gs) {
      timer += dt;
      if (timer >= DURATION || S2Input.pressed('jump') || S2Input.pressed('right')) {
        sm.transitionTo('APARTMENT_RUN');
      }
    },
    draw: function(ctx) {
      var entry = assets.bgApartment;
      var def   = S2_MANIFEST.bgApartment;
      drawBgSimple(ctx, entry, def, 0, S2C.W);

      // Overlay oscuro
      ctx.fillStyle = 'rgba(18,14,24,0.72)';
      ctx.fillRect(0, 0, S2C.W, S2C.H);

      var alpha = Math.min(1, timer * 1.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 40px "Baloo 2","Nunito",system-ui,sans-serif';
      ctx.fillText('El trayecto', S2C.W / 2, 290);
      ctx.font = 'bold 20px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('Carmen 121 → Clínica', S2C.W / 2, 336);
      ctx.font = '16px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('Toca o presiona para comenzar', S2C.W / 2, 420);
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: APARTMENT_RUN
// ─────────────────────────────────────────────────────────────────────────────
function makeApartmentRun(assets, sm) {
  var CFG    = S2C.scenes.APARTMENT_RUN;
  var worldW = CFG.worldW;
  var gY     = CFG.groundY;

  var player, camX;
  var platforms, vendors, pedestrians, velociraptors, items;
  var showMsg;

  function buildEntities() {
    platforms = [
      makePlatform(0, gY, worldW, 'platWide', assets),
    ];

    vendors = [
      makeVendor(680, assets),
      makeVendor(2180, assets),
    ];
    vendors.forEach(function(v) { v.setGround(gY); });

    pedestrians = [
      makePedestrian(1180, assets),
      makePedestrian(2900, assets),
    ];
    pedestrians.forEach(function(p) { p.setGround(gY); });

    velociraptors = [];
    // Se generan dinámicamente cuando la cámara avanza

    items = [
      // Saldo Bip × 7 (necesitan 5)
      makeItem(480,  gY - 56, 'bipCredit',  assets),
      makeItem(900,  gY - 56, 'bipCredit',  assets),
      makeItem(1380, gY - 56, 'bipCredit',  assets),
      makeItem(1920, gY - 56, 'bipCredit',  assets),
      makeItem(2440, gY - 56, 'bipCredit',  assets),
      makeItem(2850, gY - 56, 'bipCredit',  assets),
      makeItem(3350, gY - 56, 'bipCredit',  assets),
      // Reloj bonus (opcional, en una posición elevada)
      makeItem(2700, gY - 150, 'bonusClock', assets),
    ];
  }

  var raptorSpawnPoints = [
    { worldX: 2600, spawned: false, speed: 220 },
    { worldX: 3200, spawned: false, speed: 260 },
  ];

  function checkRaptorSpawns(gs) {
    raptorSpawnPoints.forEach(function(sp) {
      if (!sp.spawned && player.x + S2C.W > sp.worldX) {
        sp.spawned = true;
        var v = makeVelociraptor(sp.worldX + 400, gY, assets, false);
        velociraptors.push(v);
      }
    });
  }

  return {
    checkpoint: { scene: 'APARTMENT_RUN', playerX: 150, bipCount: 0 },

    enter: function(gs) {
      player  = makeS2Player(150, gY, assets);
      camX    = 0;
      showMsg = gs._showMsg;
      buildEntities();
      gs.checkpoint = { scene: 'APARTMENT_RUN', playerX: 150, bipOnEnter: gs.bipCount };
    },

    update: function(dt, gs) {
      player.update(dt, platforms, gY, false);

      // Limitar al mundo
      if (player.x < 40) { player.x = 40; player.vx = 0; }
      if (player.x > worldW - 20) player.x = worldW - 20;

      camX = clampCamera(camX, player.x, worldW);

      vendors.forEach(function(v) { v.update(dt); v.checkCollision(player, gs, showMsg); });
      pedestrians.forEach(function(p) { p.update(dt); p.checkCollision(player); });
      checkRaptorSpawns(gs);
      velociraptors.forEach(function(v) { v.update(dt, camX); v.checkCollision(player, gs, showMsg); });
      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      // Requisito de saldo al intentar pasar la meta
      if (player.x >= worldW - 60) {
        if (gs.bipCount < S2C.bipCredit.required) {
          player.x = worldW - 65;
          player.vx = 0;
          showMsg('Necesitas ' + S2C.bipCredit.required + ' saldos Bip', '#ffaa00');
        } else {
          gs.timer += S2C.checkpointBonus.APARTMENT_RUN;
          showMsg('Saldo Bip cargado! +' + S2C.checkpointBonus.APARTMENT_RUN + 's', '#6bff9e');
          gs.checkpoint = null;
          sm.transitionTo('MOVING_PLATFORM_CROSSING');
        }
      }
    },

    draw: function(ctx, gs) {
      drawBgSimple(ctx, assets.bgApartment, S2_MANIFEST.bgApartment, camX, worldW);
      platforms.forEach(function(pl) { pl.draw(ctx, camX); });
      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      vendors.forEach(function(v) { v.draw(ctx, camX); });
      pedestrians.forEach(function(p) { p.draw(ctx, camX); });
      velociraptors.forEach(function(v) { if (v.active) v.draw(ctx, camX); });
      player.draw(ctx, camX);

      // Marca de meta
      var goalX = worldW - 60 - camX;
      if (goalX < S2C.W) {
        ctx.fillStyle = 'rgba(255,209,102,0.85)';
        ctx.fillRect(goalX, gY - 120, 6, 120);
        ctx.font = 'bold 13px "Nunito",system-ui,sans-serif';
        ctx.fillStyle = '#ffd166';
        ctx.textAlign = 'center';
        ctx.fillText('Cruce', goalX + 3, gY - 125);
      }
    },

    getPlayer: function() { return player; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: MOVING_PLATFORM_CROSSING
// ─────────────────────────────────────────────────────────────────────────────
function makePlatformCrossing(assets, sm) {
  var CFG    = S2C.scenes.MOVING_PLATFORM_CROSSING;
  var worldW = CFG.worldW;
  var gY     = CFG.groundY;

  var player, camX, showMsg;
  var platforms, autos, items;
  var respawnX, respawnY, falling;
  var FALL_Y = S2C.fall.fallThreshold;

  function buildEntities() {
    // Piso de inicio y fin
    var startFloor = makePlatform(0,    gY,   280, 'platWide',  assets);
    var endFloor   = makePlatform(1820, gY,  1000, 'platRest',  assets);

    // Plataformas de cruce
    var p1 = makeMovingPlatform(310,  gY - 180, gY - 70,  280, 80, 'platWide',  assets);
    var p2 = makeMovingPlatform(640,  gY - 280, gY - 160, 180, -80,'platMed',   assets);
    var p3 = makePlatform(870, gY - 220, 240, 'platRest',  assets); // descanso fijo
    var p4 = makeMovingPlatform(1160, gY - 310, gY - 200,  90, 110,'platSmall', assets);
    var p5 = makePlatform(1300, gY - 240, 160, 'platMed',  assets);
    var p6 = makePlatform(1510, gY - 180, 280, 'platWide', assets);

    platforms = [startFloor, p1, p2, p3, p4, p5, p6, endFloor];

    autos = [
      makeAuto(-60, 180, assets),
      makeAuto(500, 240, assets),
      makeAuto(1100, 200, assets),
    ];

    items = [
      makeItem(920, gY - 300, 'bonusClock', assets),
      makeItem(1460, gY - 320, 'bipCredit', assets),
    ];
  }

  return {
    enter: function(gs) {
      player  = makeS2Player(120, gY, assets);
      camX    = 0;
      showMsg = gs._showMsg;
      respawnX = 120; respawnY = gY;
      falling  = false;
      buildEntities();
      gs.checkpoint = { scene: 'MOVING_PLATFORM_CROSSING', playerX: 120 };
    },

    update: function(dt, gs) {
      platforms.forEach(function(pl) { if (pl.update) pl.update(dt); });
      autos.forEach(function(a) { a.update(dt); });

      player.update(dt, platforms, gY + 9999, false);  // groundY muy abajo (sin suelo)

      if (player.x < 30) { player.x = 30; player.vx = 0; }
      camX = clampCamera(camX, player.x, worldW);

      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      // Detectar caída
      if (!falling && player.y > FALL_Y) {
        falling = true;
        gs.falls++;
        gs.timer -= S2C.fall.timePenalty;
        showMsg('-' + S2C.fall.timePenalty + 's — caída', '#ff6b6b');
        player.invulTimer = S2C.fall.invulDuration;
        player.stun(0.4);
        // Respawn en último punto seguro
        setTimeout(function() {
          player.x = respawnX;
          player.y = respawnY;
          player.vx = 0;
          player.vy = 0;
          falling = false;
        }, 500);
      }

      // Actualizar punto de respawn si el jugador avanza en suelo/plataforma
      if (player.onGround || player.onPlatform) {
        if (player.x > respawnX) {
          respawnX = player.x;
          respawnY = player.y;
        }
      }

      // Meta
      if (player.x >= 1800) {
        gs.timer += S2C.checkpointBonus.MOVING_PLATFORM_CROSSING;
        showMsg('+' + S2C.checkpointBonus.MOVING_PLATFORM_CROSSING + 's — cruce completado!', '#6bff9e');
        sm.transitionTo('SANTA_LUCIA_LANES');
      }
    },

    draw: function(ctx, gs) {
      drawBgSimple(ctx, assets.bgCrossing, S2_MANIFEST.bgCrossing, camX, worldW);
      // Autos se dibujan en el plano de fondo sin cámara (o con camX para coherencia)
      autos.forEach(function(a) { a.draw(ctx); });
      platforms.forEach(function(pl) { pl.draw(ctx, camX); });
      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      player.draw(ctx, camX);
      // Indicador de meta
      var goalX = 1800 - camX;
      if (goalX > 0 && goalX < S2C.W) {
        ctx.fillStyle = 'rgba(255,209,102,0.85)';
        ctx.fillRect(goalX, 80, 4, S2C.H - 80);
        ctx.font = 'bold 12px "Nunito",system-ui,sans-serif';
        ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center';
        ctx.fillText('Metro', goalX + 2, 76);
      }
    },

    getPlayer: function() { return player; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: SANTA_LUCIA_LANES (3 carriles laterales)
// ─────────────────────────────────────────────────────────────────────────────
function makeSantaLuciaLanes(assets, sm) {
  var CFG    = S2C.scenes.SANTA_LUCIA_LANES;
  var worldW = CFG.worldW;
  var LANES  = S2C.lanes.y;

  var player, camX, showMsg;
  var currentLane, targetLaneY;
  var laneJumpVy, onLaneGround;
  var npcs, items;
  var patternIndex, nextPatternX;

  // Spawn de NPCs en carriles
  function spawnRaptorPattern(patternX) {
    var pattern = S2C.luciaPatterns[patternIndex % S2C.luciaPatterns.length];
    patternIndex++;
    pattern.raptors.forEach(function(r) {
      var gy = LANES[r.lane];
      var raptor = makeVelociraptor(patternX + S2C.W + 80, gy, assets, patternIndex % 2 === 0);
      raptor.lane = r.lane;
      npcs.push(raptor);
    });
  }

  function spawnSinger(x) {
    var gender = npcs.length % 2 === 0 ? 'male' : 'female';
    var lane = Math.floor(Math.random() * 3);
    var singer = makeSinger(x, assets, gender);
    singer.y = LANES[lane] - S2C.singer.renderH;
    singer.laneIdx = lane;
    npcs.push(singer);
  }

  return {
    enter: function(gs) {
      currentLane = S2C.lanes.defaultLane;
      targetLaneY = LANES[currentLane];
      laneJumpVy  = 0;
      onLaneGround = true;
      camX  = 0;
      showMsg = gs._showMsg;
      patternIndex = 0;
      nextPatternX = 700;

      player = makeS2Player(150, LANES[currentLane], assets);
      player.onGround = true;

      npcs  = [];
      items = [
        makeItem(350,  LANES[1] - 50, 'bipCredit',  assets),
        makeItem(650,  LANES[0] - 50, 'bipCredit',  assets),
        makeItem(1100, LANES[2] - 50, 'bipCredit',  assets),
        makeItem(1500, LANES[1] - 50, 'bipCredit',  assets),
        makeItem(1900, LANES[0] - 50, 'bipCredit',  assets),
        makeItem(2400, LANES[1] - 50, 'headphones', assets),
        makeItem(2800, LANES[2] - 50, 'bonusClock', assets),
      ];

      // Peatones en carril superior
      npcs.push(makePedestrian(500, assets));
      npcs[npcs.length-1].y = LANES[0] - S2C.pedestrian.renderH;
      npcs.push(makePedestrian(1300, assets));
      npcs[npcs.length-1].y = LANES[0] - S2C.pedestrian.renderH;

      // Cantantes
      spawnSinger(800);
      spawnSinger(2100);
      spawnSinger(2600);

      gs.checkpoint = { scene: 'SANTA_LUCIA_LANES', playerX: 150 };
      S2Input.updateUpDown(true);
    },

    update: function(dt, gs) {
      // ── Cambio de carril (arriba/abajo) ──
      if (S2Input.pressed('up')   && currentLane > 0) { currentLane--; targetLaneY = LANES[currentLane]; }
      if (S2Input.pressed('down') && currentLane < 2) { currentLane++; targetLaneY = LANES[currentLane]; }

      // ── Transición suave de Y ──
      var dy = targetLaneY - player.y;
      var lerpAmount = Math.min(1, S2C.lanes.transitionSpeed * dt / Math.max(1, Math.abs(dy)));
      player.y += dy * lerpAmount;
      if (Math.abs(player.y - targetLaneY) < 2) player.y = targetLaneY;

      // ── Salto dentro del carril ──
      if (S2Input.pressed('jump') && onLaneGround) {
        laneJumpVy = -S2C.lanes.jumpH * 9;
        onLaneGround = false;
      }
      if (!onLaneGround) {
        laneJumpVy += S2C.gravity * dt;
        var jumpY = player.y + laneJumpVy * dt;
        if (jumpY >= targetLaneY) {
          player.y = targetLaneY;
          laneJumpVy = 0;
          onLaneGround = true;
        } else {
          player.y = jumpY;
        }
      }

      player.update(dt, null, targetLaneY + 1, true);
      if (player.x < 40) { player.x = 40; player.vx = 0; }
      camX = clampCamera(camX, player.x, worldW);

      // ── NPCs ──
      npcs.forEach(function(n) {
        if (!n.active) return;
        if (n.update) n.update(dt, camX - S2C.W);
        if (n.checkCollision) n.checkCollision(player, gs, showMsg);
        if (n.checkSlowdown) n.checkSlowdown(player, gs);
      });
      npcs = npcs.filter(function(n) { return n.active; });

      // Spawn de patrones de velociraptores
      if (player.x + S2C.W * 1.5 > nextPatternX) {
        spawnRaptorPattern(nextPatternX);
        nextPatternX += 400 + Math.random() * 200;
      }

      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      // Meta
      if (player.x >= worldW - 80) {
        sm.transitionTo('METRO_GATE');
      }
    },

    draw: function(ctx, gs) {
      drawBgSimple(ctx, assets.bgMetro, S2_MANIFEST.bgMetro, camX, worldW);

      // Carril guías visuales
      LANES.forEach(function(ly, i) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, ly - 2, S2C.W, 4);
      });

      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      npcs.forEach(function(n)  { if (n.active)  n.draw(ctx, camX);  });
      player.draw(ctx, camX);

      // Indicador de carril
      var laneLabels = ['Superior', 'Central', 'Inferior'];
      ctx.font = '13px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'right';
      ctx.fillText('Carril: ' + laneLabels[currentLane], S2C.W - 12, 70);
    },

    leave: function() {
      S2Input.updateUpDown(false);
    },

    getPlayer: function() { return player; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: METRO_GATE (cutscene de validación Bip)
// ─────────────────────────────────────────────────────────────────────────────
function makeMetroGate(assets, sm) {
  var CFG    = S2C.scenes.METRO_GATE;
  var gY     = CFG.groundY;
  var timer  = 0;
  var bipAnimDone = false;
  var turnstile, validator, player, showMsg;

  var PHASES = [
    { t: 0.0, label: '' },
    { t: 0.6, label: 'Acercándose al validador…' },
    { t: 1.2, label: '¡Bip!' },
    { t: 1.8, label: 'Torniquete abierto' },
    { t: 2.4, label: '' },
  ];

  return {
    enter: function(gs) {
      timer  = 0;
      player = makeS2Player(80, gY, assets);
      player.state = 'walk';
      player.setAnim('walk');
      player.vx = S2C.moveSpeed;
      showMsg = gs._showMsg;

      turnstile = makeTurnstile(340, gY - 90, assets);
      validator  = makeValidator(290, gY - 70, assets);

      gs.checkpoint = null;
    },

    update: function(dt, gs) {
      timer += dt;

      // Jugadora camina hasta el validador
      if (timer < 0.8) {
        player.x += S2C.moveSpeed * 0.6 * dt;
        player.x = Math.min(player.x, 230);
      }

      if (timer >= 1.0 && !bipAnimDone) {
        bipAnimDone = true;
        player.state = 'bip';
        player.setAnim('bip');
        player.vx = 0;
        validator.activate();
      }
      if (timer >= 1.6) turnstile.open();
      if (timer >= 1.9) {
        player.state = 'walk';
        player.setAnim('walk');
        player.vx = S2C.moveSpeed;
      }

      player.update(dt, null, gY, false);
      if (validator) validator.update(dt);
      if (turnstile) turnstile.update(dt);

      if (timer >= S2C.metroGate.bipAnimDuration + 0.4) {
        gs.timer += S2C.checkpointBonus.METRO_GATE;
        showMsg('+' + S2C.checkpointBonus.METRO_GATE + 's', '#6bff9e');
        sm.transitionTo('METRO_TRANSITION');
      }
    },

    draw: function(ctx, gs) {
      drawBgSimple(ctx, assets.bgMetro, S2_MANIFEST.bgMetro, 0, S2C.W);
      if (turnstile) turnstile.draw(ctx, 0);
      if (validator)  validator.draw(ctx, 0);
      player.draw(ctx, 0);

      // Subtítulos de la cutscene
      var phase = '';
      for (var i = 0; i < PHASES.length; i++) {
        if (timer >= PHASES[i].t) phase = PHASES[i].label;
      }
      if (phase) {
        ctx.save();
        ctx.font = 'bold 17px "Nunito",system-ui,sans-serif';
        ctx.fillStyle = 'rgba(18,14,24,0.8)';
        ctx.fillRect(0, S2C.H - 80, S2C.W, 50);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(phase, S2C.W / 2, S2C.H - 48);
        ctx.restore();
      }
    },

    getPlayer: function() { return player; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: METRO_TRANSITION (cinemática)
// ─────────────────────────────────────────────────────────────────────────────
function makeMetroTransition(assets, sm) {
  var timer = 0;
  var skippable = false;
  var metro;

  return {
    enter: function(gs) {
      timer  = 0;
      metro  = makeMetro(assets);
      skippable = false;
    },
    update: function(dt, gs) {
      timer += dt;
      if (!skippable && timer > S2C.metroTransition.skipDelay) skippable = true;
      metro.update(dt);
      if (timer >= S2C.metroTransition.duration ||
          (skippable && (S2Input.pressed('jump') || S2Input.pressed('right')))) {
        sm.transitionTo('BUS_STOP');
      }
    },
    draw: function(ctx, gs) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, S2C.W, S2C.H);
      metro.draw(ctx);

      // Barra de progreso
      var prog = Math.min(1, timer / S2C.metroTransition.duration);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(S2C.W / 2 - 80, S2C.H - 52, 160, 8);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(S2C.W / 2 - 80, S2C.H - 52, Math.round(160 * prog), 8);

      ctx.font = '16px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('Rumbo al paradero…', S2C.W / 2, S2C.H - 60);
      if (skippable) {
        ctx.font = '13px "Nunito",system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('(Saltar con Espacio)', S2C.W / 2, S2C.H - 20);
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: BUS_STOP
// ─────────────────────────────────────────────────────────────────────────────
function makeBusStop(assets, sm) {
  var CFG    = S2C.scenes.BUS_STOP;
  var worldW = CFG.worldW;
  var gY     = CFG.groundY;
  var BUS    = S2C.busStop;

  var player, camX, showMsg;
  var platforms, vendors, velociraptors, items;
  var micro;
  var microTimer, doorTimer, doorOpen, microLeft, missWait, microCount;

  function buildEntities() {
    platforms = [makePlatform(0, gY, worldW, 'platWide', assets)];
    vendors   = [makeVendor(320, assets), makeVendor(700, assets)];
    vendors.forEach(function(v) { v.setGround(gY); });

    velociraptors = [];

    items = [
      makeItem(240, gY - 56, 'bipCredit',  assets),
      makeItem(550, gY - 56, 'bipCredit',  assets),
      makeItem(450, gY - 140, 'bonusClock', assets),
    ];
  }

  function spawnMicro() {
    micro = makeMicro(-300, gY, assets);
    doorTimer = 0;
    doorOpen  = false;
    microLeft = false;
    microTimer = BUS.microArrivalTime;
  }

  return {
    enter: function(gs) {
      player  = makeS2Player(80, gY, assets);
      camX    = 0;
      showMsg = gs._showMsg;
      microTimer  = BUS.microArrivalTime;
      doorTimer   = 0;
      doorOpen    = false;
      microLeft   = false;
      missWait    = 0;
      microCount  = 0;
      micro = null;
      buildEntities();
      // Spawn inicial de velociraptor
      velociraptors.push(makeVelociraptor(900, gY, assets, true));
      gs.checkpoint = { scene: 'BUS_STOP', playerX: 80 };
    },

    update: function(dt, gs) {
      player.update(dt, platforms, gY, false);
      if (player.x < 20) player.x = 20;
      camX = clampCamera(camX, player.x, worldW);

      vendors.forEach(function(v) { v.update(dt); v.checkCollision(player, gs, showMsg); });
      velociraptors.forEach(function(v) { v.update(dt, camX - S2C.W); v.checkCollision(player, gs, showMsg); });
      velociraptors = velociraptors.filter(function(v) { return v.active; });
      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      if (!micro && missWait <= 0) {
        microTimer -= dt;
        if (microTimer <= 0) {
          spawnMicro();
          microCount++;
        }
      }

      if (micro && micro.active) {
        micro.update(dt);

        if (micro.state === 'open') {
          if (!doorOpen) {
            doorOpen = true;
            doorTimer = BUS.doorOpenTime;
          }
          doorTimer -= dt;

          // Cuenta regresiva visible de la puerta
          if (doorTimer > 0 && doorTimer < BUS.doorOpenTime) {
            // Se dibuja en draw()
          }

          // Jugadora llegó a la puerta
          var pb = player.hitbox();
          var doorHit = { x: micro.x + 10, y: micro.y, w: 50, h: 120 };
          if (pb.x + pb.w > doorHit.x && pb.x < doorHit.x + doorHit.w) {
            if (microCount === 1) {
              gs.caughtFirstBus = true;
            }
            gs.timer += BUS.bonus;
            showMsg('¡Micro a tiempo! +' + BUS.bonus + 's', '#6bff9e');
            sm.transitionTo('BUS_TRANSITION');
            return;
          }

          if (doorTimer <= 0) {
            micro.state = 'leaving';
            doorOpen = false;
            showMsg('Se fue la micro… espera 5s', '#ffaa00');
            missWait = BUS.missWaitTime;
          }
        } else if (micro.state === 'leaving' && !micro.active) {
          microTimer = BUS.missWaitTime;
          micro = null;
        }
      } else if (micro && !micro.active) {
        micro = null;
        if (missWait <= 0) microTimer = BUS.microArrivalTime;
      }

      if (missWait > 0) {
        missWait -= dt;
        if (missWait <= 0) microTimer = BUS.microArrivalTime;
      }
    },

    draw: function(ctx, gs) {
      drawBgSimple(ctx, assets.bgBusStop, S2_MANIFEST.bgBusStop, camX, worldW);

      // Paradero (prop)
      drawContentFrame(ctx, assets.busstopProp, S2_MANIFEST.busstopProp, 0,
        620 - camX, gY, 150, false);

      platforms.forEach(function(pl) { pl.draw(ctx, camX); });
      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      vendors.forEach(function(v) { v.draw(ctx, camX); });
      velociraptors.forEach(function(v) { if (v.active) v.draw(ctx, camX); });

      if (micro && micro.active) {
        micro.draw(ctx, camX);
        if (doorOpen && doorTimer > 0) {
          ctx.font = 'bold 22px "Nunito",system-ui,sans-serif';
          ctx.fillStyle = doorTimer < 3 ? '#ff6b6b' : '#ffd166';
          ctx.textAlign = 'center';
          ctx.fillText(Math.ceil(doorTimer) + 's', Math.round(micro.x + 40 - camX), micro.y - 14);
        }
      } else if (microTimer > 0 && !micro) {
        ctx.font = 'bold 16px "Nunito",system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText('Próxima micro: ' + Math.ceil(microTimer) + 's', S2C.W / 2, 90);
      }

      player.draw(ctx, camX);
    },

    getPlayer: function() { return player; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: BUS_TRANSITION (cinemática)
// ─────────────────────────────────────────────────────────────────────────────
function makeBusTransition(assets, sm) {
  var timer = 0;
  var microCut;
  return {
    enter: function(gs) {
      timer = 0;
      microCut = makeMicro(0, S2C.H / 2 + 20, assets);
      microCut.state = 'leaving';
    },
    update: function(dt, gs) {
      timer += dt;
      microCut.update(dt);
      if (timer >= S2C.busTransition.duration ||
          (timer > 1 && (S2Input.pressed('jump') || S2Input.pressed('right')))) {
        sm.transitionTo('CLINIC_RUN');
      }
    },
    draw: function(ctx, gs) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, S2C.W, S2C.H);
      microCut.draw(ctx, 0);
      var prog = Math.min(1, timer / S2C.busTransition.duration);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(S2C.W / 2 - 80, S2C.H - 52, 160, 8);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(S2C.W / 2 - 80, S2C.H - 52, Math.round(160 * prog), 8);
      ctx.font = '16px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('Rumbo a la clínica…', S2C.W / 2, S2C.H - 60);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: CLINIC_RUN
// ─────────────────────────────────────────────────────────────────────────────
function makeClinicRun(assets, sm) {
  var CFG    = S2C.scenes.CLINIC_RUN;
  var worldW = CFG.worldW;
  var gY     = CFG.groundY;

  var player, camX, showMsg;
  var platforms, vendors, velociraptors, items;
  var GOAL_X = worldW - 120;

  function buildEntities() {
    platforms = [makePlatform(0, gY, worldW, 'platWide', assets)];
    vendors   = [makeVendor(450, assets), makeVendor(1100, assets)];
    vendors.forEach(function(v) { v.setGround(gY); });
    velociraptors = [makeVelociraptor(1400, gY, assets, true)];
    items = [
      makeItem(350,  gY - 56, 'bipCredit',  assets),
      makeItem(700,  gY - 56, 'bipCredit',  assets),
      makeItem(900,  gY - 150,'bonusClock', assets),
      makeItem(1300, gY - 56, 'bipCredit',  assets),
    ];
  }

  return {
    enter: function(gs) {
      player  = makeS2Player(80, gY, assets);
      camX    = 0;
      showMsg = gs._showMsg;
      buildEntities();
    },

    update: function(dt, gs) {
      player.update(dt, platforms, gY, false);
      if (player.x < 20) player.x = 20;
      camX = clampCamera(camX, player.x, worldW);

      vendors.forEach(function(v) { v.update(dt); v.checkCollision(player, gs, showMsg); });
      velociraptors.forEach(function(v) { v.update(dt, camX - S2C.W); v.checkCollision(player, gs, showMsg); });
      velociraptors = velociraptors.filter(function(v) { return v.active; });
      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      if (player.x >= GOAL_X) {
        player.vx = 0;
        player.state = 'win';
        player.setAnim('win');
        sm.transitionTo('COMPLETE');
      }
    },

    draw: function(ctx, gs) {
      drawBgSimple(ctx, assets.bgClinic, S2_MANIFEST.bgClinic, camX, worldW);
      platforms.forEach(function(pl) { pl.draw(ctx, camX); });
      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      vendors.forEach(function(v) { v.draw(ctx, camX); });
      velociraptors.forEach(function(v) { if (v.active) v.draw(ctx, camX); });
      player.draw(ctx, camX);

      // Entrada de clínica
      var ex = GOAL_X - camX;
      if (ex > 0 && ex < S2C.W + 60) {
        ctx.fillStyle = 'rgba(107,255,158,0.85)';
        ctx.fillRect(ex, gY - 140, 8, 140);
        ctx.font = 'bold 13px "Nunito",system-ui,sans-serif';
        ctx.fillStyle = '#6bff9e';
        ctx.textAlign = 'center';
        ctx.fillText('Clínica', ex + 4, gY - 146);
      }
    },

    getPlayer: function() { return player; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: COMPLETE / FAILED
// ─────────────────────────────────────────────────────────────────────────────
function makeEndScene(assets, sm, isWin) {
  return {
    enter: function(gs) {},
    update: function(dt, gs) {},
    draw: function(ctx, gs) {
      // El draw real lo hace stage2.js (los screens superpuestos)
    },
  };
}
