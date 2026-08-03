'use strict';

// ── Helpers compartidos entre escenas ────────────────────────────────────────

// Fondo: una sola imagen escalada a la altura del viewport, desplazada 1:1 con
// la cámara. worldW ≤ bg.scaledW garantiza que cubre toda la escena sin repetir
// ni dejar costuras. El suelo pintado se desplaza junto al jugador.
function drawBg(ctx, entry, def, camX) {
  if (!entry || !entry.ok || !def) { ctx.fillStyle = '#20222e'; ctx.fillRect(0,0,S2C.W,S2C.H); return; }
  var sw = S2C.bg.scaledW, sh = S2C.bg.scaledH;
  var x = Math.round(-camX);
  ctx.drawImage(entry.img, 0, 0, def.w, def.h, x, 0, sw, sh);
  // Seguridad: si por worldW/redondeo el borde derecho no llegara, repite el borde.
  if (x + sw < S2C.W) {
    ctx.drawImage(entry.img, 0, 0, def.w, def.h, x + sw, 0, sw, sh);
  }
}

function clampCamera(camX, playerX, worldW) {
  var target = playerX - S2C.camera.leadX;
  camX += (target - camX) * 0.12;
  return Math.max(0, Math.min(camX, Math.max(0, worldW - S2C.W)));
}

// Elige un entero dentro de [min,max].
function pickCount(range) {
  return range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
}

// Reparte N valores X repartidos en [x0,x1] con leve jitter (sin solapes).
function spreadX(n, x0, x1, jitter) {
  var out = [], step = (x1 - x0) / Math.max(1, n);
  for (var i = 0; i < n; i++) {
    out.push(Math.round(x0 + step * (i + 0.5) + (Math.random() * 2 - 1) * (jitter || 0)));
  }
  return out;
}

// Marca vertical de meta reutilizable.
function drawGoalMarker(ctx, screenX, topY, botY, color, label) {
  if (screenX < -20 || screenX > S2C.W + 20) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(screenX), topY, 5, botY - topY);
  ctx.font = 'bold 13px "Nunito",system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, Math.round(screenX) + 2, topY - 6);
  ctx.restore();
}

// ── Máquina de estados ────────────────────────────────────────────────────────

function makeSceneManager(assets, onTransition, onWin, onLose) {
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
      drawBg(ctx, assets.bgApartment, S2_MANIFEST.bgApartment, 0);
      ctx.fillStyle = 'rgba(18,14,24,0.72)';
      ctx.fillRect(0, 0, S2C.W, S2C.H);

      var alpha = Math.min(1, timer * 1.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 40px "Baloo 2","Nunito",system-ui,sans-serif';
      ctx.fillText('El trayecto', S2C.W / 2, 280);
      ctx.font = 'bold 20px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('Carmen 121 → Clínica', S2C.W / 2, 326);
      ctx.font = '16px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('Acompaña a Nico: recoge 5 saldos Bip y llega a tiempo', S2C.W / 2, 380);
      ctx.fillText('Toca o presiona para comenzar', S2C.W / 2, 420);
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: APARTMENT_RUN — Carmen 121, vereda (suelo invisible)
// ─────────────────────────────────────────────────────────────────────────────
function makeApartmentRun(assets, sm) {
  var CFG    = S2C.scenes.APARTMENT_RUN;
  var worldW = CFG.worldW;
  var gY     = CFG.groundY;

  var player, camX;
  var platforms, vendors, pedestrians, velociraptors, items;
  var showMsg;

  function buildEntities() {
    var B = S2C.balance;
    // Suelo invisible alineado con la vereda del fondo.
    platforms = [ makePlatform(0, gY, worldW, 'platWide', assets, { ghost: true }) ];

    // Máx 1 vendedor (obstáculo puntual).
    vendors = [];
    if (B.apartmentVendorMax >= 1) { var vd = makeVendor(880, assets); vd.setGround(gY); vendors.push(vd); }

    // Peatones lentos = obstáculo principal, repartidos dentro del recorrido.
    pedestrians = [];
    spreadX(pickCount(B.apartmentPedestrianCount), 340, 1300, 90).forEach(function(px) {
      var p = makePedestrian(px, assets); p.setGround(gY); pedestrians.push(p);
    });

    velociraptors = [];

    // 6 saldos Bip repartidos por el recorrido (nunca juntos), antes de la salida.
    var pcts = [0.10, 0.26, 0.42, 0.58, 0.74, 0.90];
    items = pcts.map(function(pc) { return makeItem(Math.round(worldW * pc), gY - 74, 'bipCredit', assets); });
    items.push(makeItem(760, gY - 150, 'bonusClock', assets));
  }

  // 1 velociraptor como introducción, cerca del final (dentro del recorrido).
  var raptorSpawnPoints = [ { worldX: 1050, spawned: false } ];

  function checkRaptorSpawns() {
    raptorSpawnPoints.forEach(function(sp) {
      if (!sp.spawned && player.x + S2C.W > sp.worldX) {
        sp.spawned = true;
        velociraptors.push(makeVelociraptor(sp.worldX + 340, gY, assets, false));
      }
    });
  }

  return {
    enter: function(gs) {
      player  = makeS2Player(120, gY, assets);
      camX    = 0;
      showMsg = gs._showMsg;
      buildEntities();
      gs.checkpoint = { scene: 'APARTMENT_RUN', playerX: 120, bipOnEnter: gs.bipCount };
    },

    update: function(dt, gs) {
      player.update(dt, platforms, gY, false);
      if (player.x < 40) { player.x = 40; player.vx = 0; }
      if (player.x > worldW - 20) player.x = worldW - 20;
      camX = clampCamera(camX, player.x, worldW);

      vendors.forEach(function(v) { v.update(dt); v.checkCollision(player, gs, showMsg); });
      pedestrians.forEach(function(p) { p.update(dt); p.checkCollision(player); });
      checkRaptorSpawns();
      velociraptors.forEach(function(v) { v.update(dt, camX); v.checkCollision(player, gs, showMsg); });
      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      if (player.x >= worldW - 60) {
        if (gs.bipCount < S2C.bipCredit.required) {
          player.x = worldW - 65;
          player.vx = 0;
          showMsg('Nico necesita ' + S2C.bipCredit.required + ' saldos Bip', '#ffaa00');
        } else {
          // Checkpoint: solo guarda progreso, NO suma tiempo.
          showMsg('¡Saldo listo! Al metro', '#6bff9e');
          gs.checkpoint = null;
          sm.transitionTo('MOVING_PLATFORM_CROSSING');
        }
      }
    },

    draw: function(ctx, gs) {
      drawBg(ctx, assets.bgApartment, S2_MANIFEST.bgApartment, camX);
      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      // Orden por profundidad (pies): más lejos primero.
      var actors = [player].concat(vendors, pedestrians, velociraptors.filter(function(v){return v.active;}));
      actors.sort(function(a,b){ return (a.y + (a.h||0)) - (b.y + (b.h||0)); });
      actors.forEach(function(a){ a.draw(ctx, camX); });

      drawGoalMarker(ctx, worldW - 60 - camX, gY - 150, gY, 'rgba(255,209,102,0.85)', 'Cruce');
    },

    getPlayer: function() { return player; },
    debugInfo: function() { return { groundY: gY, platforms: platforms, actors: [player].concat(vendors,pedestrians,velociraptors), items: items, camX: camX, worldW: worldW }; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: MOVING_PLATFORM_CROSSING — única escena con plataformas
// ─────────────────────────────────────────────────────────────────────────────
function makePlatformCrossing(assets, sm) {
  var CFG    = S2C.scenes.MOVING_PLATFORM_CROSSING;
  var worldW = CFG.worldW;
  var gY     = CFG.groundY;

  var player, camX, showMsg;
  var platforms, autos, items;
  var falling, fade;
  var START_X = 120;
  var FALL_Y = gY + 70;   // caer al foso

  function buildEntities() {
    var startFloor = makePlatform(0,    gY,      320, 'platWide',  assets);
    var endFloor   = makePlatform(1660, gY,      320, 'platWide',  assets);

    var p1 = makeMovingPlatform(360,  gY - 150, gY - 50,  240, 70,  'platMed',  assets);
    var p2 = makeMovingPlatform(660,  gY - 240, gY - 120, 170, -70, 'platMed',  assets);
    var p3 = makePlatform(880, gY - 190, 220, 'platRest', assets);
    var p4 = makeMovingPlatform(1160, gY - 250, gY - 140, 130, 90,  'platSmall', assets);
    var p5 = makePlatform(1320, gY - 170, 170, 'platMed',  assets);
    var p6 = makePlatform(1500, gY - 120, 200, 'platWide', assets);

    platforms = [startFloor, p1, p2, p3, p4, p5, p6, endFloor];

    autos = [ makeAuto(-60, 170, assets), makeAuto(520, 220, assets), makeAuto(1080, 190, assets) ];

    // Sin saldo Bip en el cruce (solo se recoge en APARTMENT_RUN).
    items = [ makeItem(890, gY - 250, 'bonusClock', assets) ];
  }

  // Reinicia TODO el cruce: plataformas a su ciclo inicial y Nico al comienzo.
  function restartCrossing() {
    platforms.forEach(function(pl) { if (pl.reset) pl.reset(); });
    player.x = START_X; player.y = gY;
    player.vx = 0; player.vy = 0;
  }

  return {
    enter: function(gs) {
      player  = makeS2Player(START_X, gY, assets);
      camX    = 0;
      showMsg = gs._showMsg;
      falling = false; fade = 0;
      buildEntities();
      // Único checkpoint: el inicio del cruce.
      gs.checkpoint = { scene: 'MOVING_PLATFORM_CROSSING', playerX: START_X };
    },

    update: function(dt, gs) {
      // Fundido breve tras caer: al llegar al pico, reinicia el cruce completo.
      if (falling) {
        fade += dt;
        if (fade >= 0.28 && fade - dt < 0.28) restartCrossing();
        if (fade >= 0.56) { falling = false; fade = 0; }
      }

      platforms.forEach(function(pl) { if (pl.update) pl.update(dt); });
      autos.forEach(function(a) { a.update(dt); });

      if (!falling) player.update(dt, platforms, gY + 9999, false);  // sin suelo continuo

      if (player.x < 30) { player.x = 30; player.vx = 0; }
      if (player.x > worldW - 20) player.x = worldW - 20;
      camX = clampCamera(camX, player.x, worldW);

      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      // Caída → penaliza UNA vez, reinicia el cruce entero (sin progreso parcial).
      if (!falling && player.y > FALL_Y) {
        falling = true; fade = 0;
        gs.falls++;
        gs.timer -= S2C.fall.timePenalty;
        showMsg('-' + S2C.fall.timePenalty + 's — vuelta al inicio del cruce', '#ff6b6b');
        player.vx = 0; player.vy = 0;
      }

      if (!falling && player.x >= 1700) {
        // Checkpoint: solo guarda progreso, NO suma tiempo.
        showMsg('¡Cruce logrado!', '#6bff9e');
        sm.transitionTo('SANTA_LUCIA_LANES');
      }
    },

    draw: function(ctx, gs) {
      drawBg(ctx, assets.bgCrossing, S2_MANIFEST.bgCrossing, camX);
      autos.forEach(function(a) { a.draw(ctx, camX); });
      platforms.forEach(function(pl) { pl.draw(ctx, camX); });
      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      player.draw(ctx, camX);
      drawGoalMarker(ctx, 1700 - camX, 80, gY, 'rgba(255,209,102,0.85)', 'Metro');
      // Fundido de reinicio de cruce
      if (falling) {
        var a = 1 - Math.abs(fade - 0.28) / 0.28;   // sube y baja
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a));
        ctx.fillStyle = '#0b0b12'; ctx.fillRect(0, 0, S2C.W, S2C.H);
        ctx.restore();
      }
    },

    getPlayer: function() { return player; },
    debugInfo: function() { return { groundY: gY, platforms: platforms, actors: [player], items: items, camX: camX, worldW: worldW, fallY: FALL_Y }; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: SANTA_LUCIA_LANES — 3 carriles sobre la plaza (con profundidad)
// ─────────────────────────────────────────────────────────────────────────────
function makeSantaLuciaLanes(assets, sm) {
  var CFG    = S2C.scenes.SANTA_LUCIA_LANES;
  var worldW = CFG.worldW;
  var LANES  = S2C.lanes.y;
  var LSCALE = S2C.lanes.scale;
  var baseRenderH = S2C.player.renderH;

  var player, camX, showMsg;
  var currentLane, targetLaneY;
  var laneJumpVy, onLaneGround;
  var npcs, items;
  var patternIndex, nextPatternX;

  function laneScale(li) { return LSCALE[li]; }

  function spawnRaptorPattern(patternX) {
    var pattern = S2C.luciaPatterns[patternIndex % S2C.luciaPatterns.length];
    patternIndex++;
    pattern.raptors.forEach(function(r) {
      var raptor = makeVelociraptor(patternX + S2C.W + 80, LANES[r.lane], assets, patternIndex % 2 === 0);
      raptor.lane = r.lane;
      raptor.depthScale = laneScale(r.lane);
      npcs.push(raptor);
    });
  }

  function spawnSinger(x, lane) {
    var gender = npcs.length % 2 === 0 ? 'male' : 'female';
    var singer = makeSinger(x, assets, gender);
    singer.setGround(LANES[lane]);
    singer.depthScale = laneScale(lane);
    singer.lane = lane;
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
      nextPatternX = 620;

      player = makeS2Player(150, LANES[currentLane], assets);
      player.onGround = true;
      player.renderH = baseRenderH * laneScale(currentLane);

      npcs  = [];
      // Sin saldo Bip aquí (solo se recoge en APARTMENT_RUN).
      items = [
        makeItem(700,  LANES[0] - 52, 'headphones', assets),
        makeItem(1300, LANES[2] - 52, 'bonusClock', assets),
      ];

      // Peatones lentos en carriles de fondo/medio
      var pedA = makePedestrian(520, assets); pedA.setGround(LANES[0]); pedA.depthScale = laneScale(0); pedA.lane = 0; npcs.push(pedA);
      var pedB = makePedestrian(1300, assets); pedB.setGround(LANES[1]); pedB.depthScale = laneScale(1); pedB.lane = 1; npcs.push(pedB);

      spawnSinger(760, 0);
      spawnSinger(1500, 2);

      gs.checkpoint = { scene: 'SANTA_LUCIA_LANES', playerX: 150 };
      S2Input.updateUpDown(true);
    },

    update: function(dt, gs) {
      if (S2Input.pressed('up')   && currentLane > 0) { currentLane--; targetLaneY = LANES[currentLane]; }
      if (S2Input.pressed('down') && currentLane < 2) { currentLane++; targetLaneY = LANES[currentLane]; }

      var dy = targetLaneY - player.y;
      var lerpAmount = Math.min(1, S2C.lanes.transitionSpeed * dt / Math.max(1, Math.abs(dy)));
      player.y += dy * lerpAmount;
      if (Math.abs(player.y - targetLaneY) < 2) player.y = targetLaneY;
      player.renderH = baseRenderH * laneScale(currentLane);

      if (S2Input.pressed('jump') && onLaneGround) {
        laneJumpVy = -S2C.lanes.jumpH * 9;
        onLaneGround = false;
      }
      if (!onLaneGround) {
        laneJumpVy += S2C.gravity * dt;
        var jumpY = player.y + laneJumpVy * dt;
        if (jumpY >= targetLaneY) { player.y = targetLaneY; laneJumpVy = 0; onLaneGround = true; }
        else player.y = jumpY;
      }

      player.update(dt, null, targetLaneY + 1, true);
      if (player.x < 40) { player.x = 40; player.vx = 0; }
      if (player.x > worldW - 40) player.x = worldW - 40;
      camX = clampCamera(camX, player.x, worldW);

      npcs.forEach(function(n) {
        if (!n.active) return;
        if (n.update) n.update(dt, camX - S2C.W);
        // Colisión sólo si el actor va en el mismo carril (esquive por carril).
        if (n.checkCollision && (n.lane == null || n.lane === currentLane)) {
          n.checkCollision(player, gs, showMsg);
        }
        if (n.checkSlowdown) n.checkSlowdown(player, gs);  // cantante: por proximidad X
      });
      npcs = npcs.filter(function(n) { return n.active; });

      if (player.x + S2C.W * 1.2 > nextPatternX && nextPatternX < worldW - 200) {
        spawnRaptorPattern(nextPatternX);
        nextPatternX += 360 + Math.random() * 160;
      }

      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      if (player.x >= worldW - 60) {
        // Checkpoint: solo avanza de escena, NO suma tiempo.
        sm.transitionTo('METRO_GATE');
      }
    },

    draw: function(ctx, gs) {
      drawBg(ctx, assets.bgMetro, S2_MANIFEST.bgMetro, camX);

      // Guías de carril sutiles apoyadas en la plaza.
      LANES.forEach(function(ly) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#0a0a12';
        ctx.beginPath();
        ctx.ellipse(S2C.W / 2, ly + 2, S2C.W, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Dibujables ordenados por profundidad (pies).
      var drawables = [];
      items.forEach(function(it) { if (it.active) drawables.push({ sy: it.y + 40, d: function(){ it.draw(ctx, camX); } }); });
      npcs.forEach(function(n) { if (n.active) drawables.push({ sy: n.y + n.h, d: function(){ n.draw(ctx, camX); } }); });
      drawables.push({ sy: player.y, d: function(){ player.draw(ctx, camX); } });
      drawables.sort(function(a, b) { return a.sy - b.sy; });
      drawables.forEach(function(o) { o.d(); });

      // Única entrada exterior visible = meta.
      drawGoalMarker(ctx, worldW - 60 - camX, 120, LANES[2], 'rgba(107,255,158,0.9)', 'Entrada Metro');

      var laneLabels = ['Fondo', 'Central', 'Frente'];
      ctx.font = '13px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'right';
      ctx.fillText('Carril: ' + laneLabels[currentLane] + '  (▲▼)', S2C.W - 12, 70);
    },

    leave: function() { S2Input.updateUpDown(false); },
    getPlayer: function() { return player; },
    // Carriles con obstáculo (raptor/peatón) inminente delante del jugador.
    laneHint: function() {
      var blocked = [false, false, false];
      npcs.forEach(function(n) {
        if (!n.active || n.lane == null) return;
        var ahead = n.x - player.x;
        if (ahead > -60 && ahead < 360) blocked[n.lane] = true;
      });
      return { player: currentLane, blocked: blocked };
    },
    debugInfo: function() { return { groundY: LANES[2], lanes: LANES, actors: [player].concat(npcs), items: items, camX: camX, worldW: worldW }; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: METRO_GATE — acceso al metro, validación Bip
// ─────────────────────────────────────────────────────────────────────────────
function makeMetroGate(assets, sm) {
  var CFG    = S2C.scenes.METRO_GATE;
  var gY     = CFG.groundY;
  var timer  = 0;
  var descent = 0;           // transición breve "bajando al metro"
  var DESCENT = 0.9;
  var bipAnimDone = false;
  var turnstile, validator, player, showMsg;

  var PHASES = [
    { t: 0.0, label: '' },
    { t: 0.6, label: 'Nico se acerca al validador…' },
    { t: 1.2, label: '¡Bip!' },
    { t: 1.8, label: 'Torniquete abierto' },
    { t: 2.4, label: '' },
  ];

  return {
    enter: function(gs) {
      timer  = 0; descent = 0; bipAnimDone = false;
      player = makeS2Player(80, gY, assets);
      player.state = 'walk'; player.setAnim('walk');
      player.vx = S2C.moveSpeed;
      showMsg = gs._showMsg;
      turnstile = makeTurnstile(470, gY - 96, assets);
      validator = makeValidator(360, gY - 84, assets);
      gs.checkpoint = null;
    },

    update: function(dt, gs) {
      // Transición breve de descenso antes de la cutscene del torniquete.
      if (descent < DESCENT) { descent += dt; return; }
      timer += dt;
      if (timer < 0.9) { player.x += S2C.moveSpeed * 0.6 * dt; player.x = Math.min(player.x, 300); }

      if (timer >= 1.0 && !bipAnimDone) {
        bipAnimDone = true;
        player.state = 'bip'; player.setAnim('bip'); player.vx = 0;
        validator.activate();
      }
      if (timer >= 1.6) turnstile.open();
      if (timer >= 1.9) { player.state = 'walk'; player.setAnim('walk'); player.vx = S2C.moveSpeed; }

      player.update(dt, null, gY, false);
      if (validator) validator.update(dt);
      if (turnstile) turnstile.update(dt);

      if (timer >= S2C.metroGate.bipAnimDuration + 0.4) {
        // Validación Bip completada; NO suma tiempo.
        sm.transitionTo('METRO_TRANSITION');
      }
    },

    draw: function(ctx, gs) {
      drawBg(ctx, assets.bgMetro, S2_MANIFEST.bgMetro, 0);
      // Orden: torniquete detrás, validador, jugadora al frente.
      if (turnstile) turnstile.draw(ctx, 0);
      if (validator)  validator.draw(ctx, 0);
      player.draw(ctx, 0);

      var phase = '';
      for (var i = 0; i < PHASES.length; i++) if (timer >= PHASES[i].t) phase = PHASES[i].label;
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

      // Overlay de descenso al metro (transición breve).
      if (descent < DESCENT) {
        ctx.save();
        ctx.globalAlpha = 1 - descent / DESCENT * 0.6;
        ctx.fillStyle = '#0b0b12'; ctx.fillRect(0, 0, S2C.W, S2C.H);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.font = 'bold 20px "Nunito",system-ui,sans-serif';
        ctx.fillText('Bajando al metro…', S2C.W / 2, S2C.H / 2);
        ctx.restore();
      }
    },

    getPlayer: function() { return player; },
    debugInfo: function() { return { groundY: gY, actors: [player], props: [turnstile, validator], camX: 0, worldW: CFG.worldW }; },
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
    enter: function(gs) { timer = 0; metro = makeMetro(assets); skippable = false; },
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
      ctx.fillStyle = '#12131f'; ctx.fillRect(0, 0, S2C.W, S2C.H);
      metro.draw(ctx);
      var prog = Math.min(1, timer / S2C.metroTransition.duration);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(S2C.W / 2 - 80, S2C.H - 52, 160, 8);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(S2C.W / 2 - 80, S2C.H - 52, Math.round(160 * prog), 8);
      ctx.font = '16px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('Nico viaja en metro…', S2C.W / 2, S2C.H - 60);
      if (skippable) {
        ctx.font = '13px "Nunito",system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('(Saltar con Espacio)', S2C.W / 2, S2C.H - 20);
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: BUS_STOP — paradero, vereda (suelo invisible)
// ─────────────────────────────────────────────────────────────────────────────
function makeBusStop(assets, sm) {
  var CFG    = S2C.scenes.BUS_STOP;
  var worldW = CFG.worldW;
  var gY     = CFG.groundY;
  var BUS    = S2C.busStop;

  var B2 = S2C.balance;
  var player, camX, showMsg;
  var platforms, vendors, pedestrians, velociraptors, items;
  var pedestriansN;
  var micro;
  var doorTimer, doorOpen, missWait, microCount;

  function buildEntities() {
    platforms = [ makePlatform(0, gY, worldW, 'platWide', assets, { ghost: true }) ];

    // Máx 1 vendedor (obstáculo puntual), fuera del pasillo de la 1ª micro.
    vendors = [];
    if (B2.busStopVendorMax >= 1) { var vd = makeVendor(300, assets); vd.setGround(gY); vendors.push(vd); }

    // Peatones lentos (4–6): obstáculo principal. Posiciones que NO tapan el
    // pasillo hacia la puerta al arrancar; los de la izquierda derivan a la derecha.
    var pedSlots = [180, 360, 1040, 1260, 1520, 1780];
    pedestriansN = pickCount(B2.busStopPedestrianCount);
    pedestrians = [];
    pedSlots.slice(0, pedestriansN).forEach(function(px) {
      var p = makePedestrian(px, assets); p.setGround(gY); pedestrians.push(p);
    });

    // Velociraptores (2–4): entran desde la derecha y cruzan hacia la puerta.
    var rapSlots = [1180, 1420, 1680, 1920];
    var rapN = pickCount(B2.busStopVelociraptorCount);
    velociraptors = [];
    rapSlots.slice(0, rapN).forEach(function(rx, i) {
      velociraptors.push(makeVelociraptor(rx, gY, assets, i % 2 === 0));
    });

    // Sin saldo Bip aquí; solo un reloj bonus fuera del pasillo.
    items = [ makeItem(1120, gY - 150, 'bonusClock', assets) ];
  }

  return {
    enter: function(gs) {
      // Nico aparece cerca (alcanza la puerta en <1s si reacciona ya).
      player  = makeS2Player(600, gY, assets);
      camX    = clampCamera(0, player.x, worldW);
      showMsg = gs._showMsg;
      doorOpen = false; missWait = 0; microCount = 1;
      buildEntities();
      // 1ª micro LLEGA desde fuera de pantalla (state 'arriving'); se abre y
      // arranca su cuenta regresiva sólo al detenerse en la parada.
      micro = makeMicro(BUS.microStartX, gY, assets);
      gs.checkpoint = { scene: 'BUS_STOP', playerX: 600 };
    },

    update: function(dt, gs) {
      player.update(dt, platforms, gY, false);
      if (player.x < 20) player.x = 20;
      if (player.x > worldW - 20) player.x = worldW - 20;
      camX = clampCamera(camX, player.x, worldW);

      vendors.forEach(function(v) { v.update(dt); v.checkCollision(player, gs, showMsg); });
      pedestrians.forEach(function(p) { p.update(dt); p.checkCollision(player); });
      velociraptors.forEach(function(v) { v.update(dt, camX - S2C.W); v.checkCollision(player, gs, showMsg); });
      velociraptors = velociraptors.filter(function(v) { return v.active; });
      items.forEach(function(it) { it.update(dt); it.collect(player, gs, showMsg); });

      if (micro && micro.active) {
        micro.update(dt);
        if (micro.state === 'open') {
          if (!doorOpen) {  // recién detenida y abierta: arranca su cuenta regresiva
            doorOpen = true;
            // 1ª micro: ventana justa (reflejo); 2ª+ : ventana amplia.
            doorTimer = (microCount === 1) ? BUS.firstBusWaitSeconds : BUS.doorOpenTime;
          }
          doorTimer -= dt;

          var pb = player.hitbox();
          var doorHit = { x: micro.doorX, y: micro.y, w: micro.doorW, h: micro.rH };
          if (pb.x + pb.w > doorHit.x && pb.x < doorHit.x + doorHit.w) {
            if (microCount === 1) gs.caughtFirstBus = true;
            // Abordar avanza de escena; NO suma tiempo.
            showMsg('¡Subiste a la micro!', '#6bff9e');
            sm.transitionTo('BUS_TRANSITION');
            return;
          }
          if (doorTimer <= 0) {
            micro.state = 'leaving'; doorOpen = false;
            showMsg('Se fue la micro… ' + BUS.nextBusDelay + 's para la próxima', '#ffaa00');
            missWait = BUS.nextBusDelay;
          }
        }
      }

      // La espera de la siguiente micro corre AUNQUE la anterior siga saliendo de
      // cuadro (evita tiempo muerto). El reloj global nunca se detiene.
      if (missWait > 0) {
        missWait -= dt;
        if (missWait <= 0) {
          micro = makeMicro(BUS.microStartX, gY, assets);  // 2ª+ también llega desde fuera de pantalla
          microCount++; doorOpen = false;
        }
      }
    },

    draw: function(ctx, gs) {
      drawBg(ctx, assets.bgBusStop, S2_MANIFEST.bgBusStop, camX);
      // El paradero ya está pintado en el fondo (no se dibuja prop duplicado).

      var actors = [player].concat(vendors, pedestrians, velociraptors.filter(function(v){return v.active;}));
      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      actors.sort(function(a,b){ return (a.y + (a.h||0)) - (b.y + (b.h||0)); });
      actors.forEach(function(a){ a.draw(ctx, camX); });

      if (micro && micro.active) {
        micro.draw(ctx, camX);
        if (doorOpen && doorTimer > 0) {
          ctx.font = 'bold 26px "Nunito",system-ui,sans-serif';
          ctx.fillStyle = doorTimer < 3 ? '#ff6b6b' : '#ffd166';
          ctx.textAlign = 'center';
          ctx.fillText('¡Sube! ' + Math.ceil(doorTimer) + 's', Math.round(micro.x + micro.rW / 2 - camX), micro.y - 14);
        }
      } else if (missWait > 0) {
        ctx.font = 'bold 16px "Nunito",system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        ctx.fillText('Próxima micro: ' + Math.ceil(missWait) + 's', S2C.W / 2, 84);
      }
    },

    getPlayer: function() { return player; },
    boardHint: function() {
      if (!micro || !micro.active) return { present: false, open: false, doorX: null };
      return { present: true, open: micro.state === 'open',
               doorX: micro.doorX + micro.doorW / 2, doorW: micro.doorW };
    },
    debugInfo: function() { return { groundY: gY, platforms: platforms, actors: [player].concat(vendors,pedestrians,velociraptors), items: items, camX: camX, worldW: worldW, micro: micro }; },
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
      microCut = makeMicro(-200, S2C.H / 2 + 70, assets);
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
      ctx.fillStyle = '#12131f'; ctx.fillRect(0, 0, S2C.W, S2C.H);
      microCut.draw(ctx, 0);
      var prog = Math.min(1, timer / S2C.busTransition.duration);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(S2C.W / 2 - 80, S2C.H - 52, 160, 8);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(S2C.W / 2 - 80, S2C.H - 52, Math.round(160 * prog), 8);
      ctx.font = '16px "Nunito",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('Nico va rumbo a la clínica…', S2C.W / 2, S2C.H - 60);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: CLINIC_RUN — frente de la clínica, vereda (suelo invisible)
// ─────────────────────────────────────────────────────────────────────────────
function makeClinicRun(assets, sm) {
  var CFG    = S2C.scenes.CLINIC_RUN;
  var worldW = CFG.worldW;
  var gY     = CFG.groundY;

  var player, camX, showMsg;
  var platforms, vendors, velociraptors, items;
  var GOAL_X = worldW - 120;

  function buildEntities() {
    platforms = [ makePlatform(0, gY, worldW, 'platWide', assets, { ghost: true }) ];
    // Tramo final: 1 vendedor + 1 raptor (carga aligerada para el presupuesto de 60 s).
    vendors   = [ makeVendor(700, assets) ];
    vendors.forEach(function(v) { v.setGround(gY); });
    velociraptors = [ makeVelociraptor(1350, gY, assets, true) ];
    // Sólo un reloj bonus de puntuación (el objetivo Bip ya se cumplió en el piso).
    items = [ makeItem(920, gY - 150, 'bonusClock', assets) ];
  }

  return {
    enter: function(gs) {
      player  = makeS2Player(90, gY, assets);
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
        player.vx = 0; player.state = 'win'; player.setAnim('win');
        sm.transitionTo('COMPLETE');
      }
    },

    draw: function(ctx, gs) {
      drawBg(ctx, assets.bgClinic, S2_MANIFEST.bgClinic, camX);
      items.forEach(function(it) { if (it.active) it.draw(ctx, camX); });
      var actors = [player].concat(vendors, velociraptors.filter(function(v){return v.active;}));
      actors.sort(function(a,b){ return (a.y + (a.h||0)) - (b.y + (b.h||0)); });
      actors.forEach(function(a){ a.draw(ctx, camX); });
      drawGoalMarker(ctx, GOAL_X - camX, gY - 150, gY, 'rgba(107,255,158,0.9)', 'Clínica');
    },

    getPlayer: function() { return player; },
    debugInfo: function() { return { groundY: gY, platforms: platforms, actors: [player].concat(vendors,velociraptors), items: items, camX: camX, worldW: worldW }; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCENA: COMPLETE / FAILED
// ─────────────────────────────────────────────────────────────────────────────
function makeEndScene(assets, sm, isWin) {
  return {
    enter: function(gs) {},
    update: function(dt, gs) {},
    draw: function(ctx, gs) { /* overlay dibujado por stage2.js */ },
  };
}
