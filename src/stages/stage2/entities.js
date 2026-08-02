'use strict';

// ── Helpers ──────────────────────────────────────────────────────────────────

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// Nº de frames reales de un asset (content-boxes en el manifest).
function s2FrameCount(key) {
  var def = S2_MANIFEST[key];
  return (def && def.frames && def.frames.length) ? def.frames.length : 1;
}

// Dibuja el frame `idx` de una hoja usando su content-box real, escalado a
// `targetH` preservando aspecto. Ancla:
//   - 'feet'   → (footX, footY) = base centro (pies)
//   - 'center' → (footX, footY) = centro del sprite
// El anchor se toma de def.anchor salvo override.
function drawContentFrame(ctx, entry, def, idx, footX, footY, targetH, flipX, anchorOverride) {
  if (!entry || !entry.ok || !def || !def.frames || !def.frames.length) return;
  var n = def.frames.length;
  var i = ((Math.floor(idx) % n) + n) % n;
  var f = def.frames[i];
  var scale = targetH / def.refH;
  var dw = f.sw * scale, dh = f.sh * scale;
  var anchor = anchorOverride || def.anchor || 'feet';
  var dx = footX - dw / 2;
  var dy = (anchor === 'center') ? (footY - dh / 2) : (footY - dh);
  ctx.save();
  if (flipX) {
    ctx.scale(-1, 1);
    ctx.drawImage(entry.img, f.sx, f.sy, f.sw, f.sh,
      -(Math.round(dx) + dw), Math.round(dy), dw, dh);
  } else {
    ctx.drawImage(entry.img, f.sx, f.sy, f.sw, f.sh,
      Math.round(dx), Math.round(dy), dw, dh);
  }
  ctx.restore();
}

// Dibuja un content-box estirado a un rectángulo lógico exacto (para plataformas).
function drawContentStretched(ctx, entry, def, idx, dx, dy, dw, dh) {
  if (!entry || !entry.ok || !def || !def.frames || !def.frames.length) return false;
  var f = def.frames[idx % def.frames.length];
  ctx.drawImage(entry.img, f.sx, f.sy, f.sw, f.sh,
    Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
  return true;
}

function advanceFrame(entity, dt, fps, totalFrames, loop) {
  entity._animTimer = (entity._animTimer || 0) + dt;
  var interval = 1 / fps;
  while (entity._animTimer >= interval) {
    entity._animTimer -= interval;
    if (loop) entity._frame = (entity._frame + 1) % totalFrames;
    else entity._frame = Math.min((entity._frame || 0) + 1, totalFrames - 1);
  }
}

// ── Plataforma estática ───────────────────────────────────────────────────────
// opts.ghost = true → solo colisión (no dibuja); usado como suelo invisible
// alineado con la vereda del fondo en las escenas planas.
function makePlatform(x, y, w, assetKey, assets, opts) {
  var C = S2C.platform;
  opts = opts || {};
  return {
    x: x, y: y, w: w, h: C.h,
    active: true,
    ghost: !!opts.ghost,
    vx: 0, vy: 0,
    assetKey: assetKey,
    draw: function(ctx, camX) {
      if (this.ghost) return;  // suelo invisible: colisión sin dibujo
      var entry = assets[assetKey];
      var def   = S2_MANIFEST[assetKey];
      var visH = def && def.refW ? Math.min(this.w * def.refH / def.refW, 120) : this.h;
      var dy   = this.y + this.h - visH;
      if (!drawContentStretched(ctx, entry, def, 0, this.x - camX, dy, this.w, visH)) {
        ctx.fillStyle = 'rgba(80,60,40,0.85)';
        ctx.fillRect(this.x - camX, this.y, this.w, this.h);
      }
    },
    drawDebug: function(ctx, camX) {
      ctx.strokeStyle = this.ghost ? 'rgba(0,255,180,0.9)' : 'rgba(255,200,0,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - camX, this.y, this.w, this.h);
    },
  };
}

// ── Plataforma móvil ─────────────────────────────────────────────────────────
function makeMovingPlatform(x, yMin, yMax, w, speed, assetKey, assets) {
  var C = S2C.platform;
  return {
    x: x, y: yMin, w: w, h: C.h,
    active: true,
    yMin: yMin, yMax: yMax,
    vx: 0, vy: speed,
    _y0: yMin, _vy0: speed,   // estado inicial (para reiniciar el cruce)
    assetKey: assetKey,
    reset: function() { this.y = this._y0; this.vy = this._vy0; },
    update: function(dt) {
      this.y += this.vy * dt;
      if (this.y >= this.yMax) { this.y = this.yMax; this.vy = -Math.abs(this.vy); }
      if (this.y <= this.yMin) { this.y = this.yMin; this.vy =  Math.abs(this.vy); }
    },
    draw: function(ctx, camX) {
      var entry = assets[assetKey];
      var def   = S2_MANIFEST[assetKey];
      var visH = def && def.refW ? Math.min(this.w * def.refH / def.refW, 90) : this.h;
      var dy   = this.y + this.h - visH;
      if (!drawContentStretched(ctx, entry, def, 0, this.x - camX, dy, this.w, visH)) {
        ctx.fillStyle = 'rgba(60,90,140,0.85)';
        ctx.fillRect(this.x - camX, this.y, this.w, this.h);
      }
    },
    drawDebug: function(ctx, camX) {
      ctx.strokeStyle = 'rgba(100,200,255,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - camX, this.y, this.w, this.h);
      ctx.setLineDash([3,3]);
      ctx.strokeStyle = 'rgba(100,200,255,0.3)';
      ctx.strokeRect(this.x - camX, this.yMin, this.w, this.yMax - this.yMin);
      ctx.setLineDash([]);
    },
  };
}

// ── Barrera de obra ───────────────────────────────────────────────────────────
function makeBarrier(x, y, assets) {
  var rH = 80;
  return {
    x: x, y: y, w: 90, h: rH,
    active: true,
    _frame: 0, _animTimer: 0,
    hitbox: function() { return { x: this.x + 8, y: this.y, w: this.w - 16, h: rH }; },
    update: function(dt) {},
    draw: function(ctx, camX) {
      drawContentFrame(ctx, assets.barrierProp, S2_MANIFEST.barrierProp, 0,
        this.x + this.w / 2 - camX, this.y + rH, rH, false);
    },
  };
}

// ── Vendedor (NPC) ────────────────────────────────────────────────────────────
function makeVendor(x, assets) {
  var CC = S2C.vendor;
  var rH = CC.renderH;
  return {
    x: x, y: 0,
    w: rH, h: rH,
    active: true,
    depthScale: 1,
    _frame: 0, _animTimer: 0,
    cooldown: 0,
    setGround: function(gy) { this.y = gy - rH; },
    hitbox: function() {
      var s = this.depthScale, cx = this.x + rH / 2, footY = this.y + rH;
      var w = CC.hitW * s, h = CC.hitH * s;
      return { x: cx - w / 2, y: footY - h, w: w, h: h };
    },
    update: function(dt) {
      advanceFrame(this, dt, CC.fps, s2FrameCount('vendor'), true);
      if (this.cooldown > 0) this.cooldown -= dt;
    },
    draw: function(ctx, camX) {
      drawContentFrame(ctx, assets.vendor, S2_MANIFEST.vendor, this._frame,
        this.x + rH / 2 - camX, this.y + rH, rH * this.depthScale, false);
    },
    drawDebug: function(ctx, camX) {
      var hb = this.hitbox();
      ctx.strokeStyle = '#f80'; ctx.lineWidth = 1;
      ctx.strokeRect(hb.x - camX, hb.y, hb.w, hb.h);
    },
    checkCollision: function(player, gs, showMsg) {
      if (!this.active || this.cooldown > 0 || player.invulTimer > 0) return;
      if (!overlaps(player.hitbox(), this.hitbox())) return;
      this.cooldown = CC.cooldown;
      player.stun(CC.stunDuration);
      player.vx = -80;
      gs.timer -= CC.timePenalty;
      gs.hits++;
      showMsg('-' + CC.timePenalty + 's', '#ff8888');
    },
  };
}

// ── Peatón lento (NPC) ───────────────────────────────────────────────────────
function makePedestrian(x, assets) {
  var CC = S2C.pedestrian;
  var rH = CC.renderH;
  return {
    x: x, y: 0,
    w: rH, h: rH,
    active: true,
    depthScale: 1,
    _frame: 0, _animTimer: 0,
    speed: CC.speed,
    setGround: function(gy) { this.y = gy - rH; },
    hitbox: function() {
      var s = this.depthScale, cx = this.x + rH / 2, footY = this.y + rH;
      var w = CC.hitW * s, h = CC.hitH * s;
      return { x: cx - w / 2, y: footY - h, w: w, h: h };
    },
    update: function(dt) {
      advanceFrame(this, dt, CC.fps, s2FrameCount('pedestrian'), true);
      this.x += this.speed * dt;
    },
    draw: function(ctx, camX) {
      drawContentFrame(ctx, assets.pedestrian, S2_MANIFEST.pedestrian, this._frame,
        this.x + rH / 2 - camX, this.y + rH, rH * this.depthScale, false);
    },
    drawDebug: function(ctx, camX) {
      var hb = this.hitbox();
      ctx.strokeStyle = '#8f8'; ctx.lineWidth = 1;
      ctx.strokeRect(hb.x - camX, hb.y, hb.w, hb.h);
    },
    checkCollision: function(player) {
      if (!this.active) return;
      var hb = this.hitbox();
      var pb = player.hitbox();
      if (!overlaps(pb, hb)) return;
      if (player.x < hb.x + hb.w / 2) {
        player.x = hb.x - player.hitW / 2;
        player.vx = Math.min(player.vx, 0);
      } else {
        player.x = hb.x + hb.w + player.hitW / 2;
        player.vx = Math.max(player.vx, this.speed);
      }
    },
  };
}

// ── Velociraptor (abuela apurada) (NPC) ───────────────────────────────────────
function makeVelociraptor(x, laneY, assets, useAlt) {
  var CC = S2C.velociraptor;
  var rH = CC.renderH;
  var key = useAlt ? 'velociraptor2' : 'velociraptor';
  return {
    x: x, y: laneY - rH,
    w: rH, h: rH,
    active: true,
    depthScale: 1,
    _frame: 0, _animTimer: 0,
    cooldown: 0,
    lane: null,
    assetKey: key,
    hitbox: function() {
      var s = this.depthScale, cx = this.x + rH / 2, footY = this.y + rH;
      var w = CC.hitW * s, h = CC.hitH * s;
      return { x: cx - w / 2, y: footY - h, w: w, h: h };
    },
    update: function(dt, worldLeft) {
      advanceFrame(this, dt, CC.fps, s2FrameCount(key), true);
      if (this.cooldown > 0) this.cooldown -= dt;
      this.x -= CC.speed * dt;
      if (this.x < worldLeft - rH * 2) this.active = false;
    },
    draw: function(ctx, camX) {
      // mira a la izquierda (viene de la derecha) → flip
      drawContentFrame(ctx, assets[key], S2_MANIFEST[key], this._frame,
        this.x + rH / 2 - camX, this.y + rH, rH * this.depthScale, true);
    },
    drawDebug: function(ctx, camX) {
      var hb = this.hitbox();
      ctx.strokeStyle = '#f44'; ctx.lineWidth = 1;
      ctx.strokeRect(hb.x - camX, hb.y, hb.w, hb.h);
    },
    checkCollision: function(player, gs, showMsg) {
      if (!this.active || this.cooldown > 0 || player.invulTimer > 0) return;
      if (!overlaps(player.hitbox(), this.hitbox())) return;
      this.cooldown = CC.cooldown;
      player.stun(CC.stunDuration);
      player.vx = -CC.pushback;
      player.invulTimer = CC.invulDuration;
      gs.timer -= CC.timePenalty;
      gs.hits++;
      showMsg('-' + CC.timePenalty + 's', '#ff4444');
    },
  };
}

// ── Cantante (NPC) ────────────────────────────────────────────────────────────
function makeSinger(x, assets, gender) {
  var CC = S2C.singer;
  var rH = CC.renderH;
  var key = (gender === 'female') ? 'singerFemale' : 'singerMale';
  var noteTimer = 0;
  var notes = [];
  return {
    x: x, y: 0,
    w: rH, h: rH,
    active: true,
    depthScale: 1,
    _frame: 0, _animTimer: 0,
    gender: gender || 'male',
    setGround: function(gy) { this.y = gy - rH; },
    influenceBox: function() {
      var s = this.depthScale;
      return { x: this.x + rH / 2 - CC.influenceW / 2, y: this.y + rH - rH * s - 20,
               w: CC.influenceW, h: rH * s + 40 };
    },
    hitbox: function() { return this.influenceBox(); },
    update: function(dt) {
      advanceFrame(this, dt, CC.fps, s2FrameCount(key), true);
      noteTimer += dt;
      if (noteTimer > 0.45) {
        noteTimer = 0;
        notes.push({ x: this.x + rH * 0.5, y: this.y + rH - rH * this.depthScale, vy: -40, alpha: 1.0 });
      }
      for (var i = notes.length - 1; i >= 0; i--) {
        notes[i].y  += notes[i].vy * dt;
        notes[i].alpha -= dt * 0.8;
        if (notes[i].alpha <= 0) notes.splice(i, 1);
      }
    },
    draw: function(ctx, camX) {
      drawContentFrame(ctx, assets[key], S2_MANIFEST[key], this._frame,
        this.x + rH / 2 - camX, this.y + rH, rH * this.depthScale, false);
      // Notas musicales (FX icono de notas)
      var fxEntry = assets.fx;
      var fxDef   = S2_MANIFEST.fx;
      var noteFrame = S2C.fx.noteFrames[0];
      var nRH = S2C.fx.renderH;
      notes.forEach(function(n) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, n.alpha);
        drawContentFrame(ctx, fxEntry, fxDef, noteFrame,
          n.x - camX, n.y, nRH, false, 'center');
        ctx.restore();
      });
    },
    checkSlowdown: function(player, gs) {
      if (!this.active) return;
      if (gs.headphonesTimer > 0) return;
      if (overlaps(player.hitbox(), this.influenceBox())) {
        player.speedFactor = Math.min(player.speedFactor, S2C.singer.speedFactor);
      }
    },
  };
}

// ── Ítem genérico ─────────────────────────────────────────────────────────────
function makeItem(x, y, type, assets) {
  var CC = S2C[type];
  var keys = { bipCredit: 'bipCredit', bonusClock: 'bonusClock', headphones: 'headphones' };
  var assetKey = keys[type];
  var rH = CC.renderH;
  return {
    x: x, y: y,
    type: type,
    active: true,
    _frame: 0, _animTimer: 0,
    hitbox: function() {
      return { x: this.x + CC.hitOX, y: this.y + CC.hitOY, w: CC.hitW, h: CC.hitH };
    },
    update: function(dt) { advanceFrame(this, dt, CC.fps, s2FrameCount(assetKey), true); },
    draw: function(ctx, camX) {
      // Ancla 'center' sobre el centro del hitbox
      drawContentFrame(ctx, assets[assetKey], S2_MANIFEST[assetKey], this._frame,
        this.x + CC.hitOX + CC.hitW / 2 - camX, this.y + CC.hitOY + CC.hitH / 2, rH, false, 'center');
    },
    drawDebug: function(ctx, camX) {
      var hb = this.hitbox();
      ctx.strokeStyle = '#ff0'; ctx.lineWidth = 1;
      ctx.strokeRect(hb.x - camX, hb.y, hb.w, hb.h);
    },
    collect: function(player, gs, showMsg) {
      if (!this.active) return false;
      if (!overlaps(player.hitbox(), this.hitbox())) return false;
      this.active = false;
      if (type === 'bipCredit') {
        if (gs.bipCount < CC.required) {
          gs.bipCount++;
          showMsg('Saldo Bip ' + gs.bipCount + '/' + CC.required, '#ffd166');
        } else {
          // Bip extra: puntuación, SIN efecto en el cronómetro.
          gs.bipBonus = (gs.bipBonus || 0) + 1;
          gs.score = (gs.score || 0) + CC.bonusScore;
          showMsg('Bip extra +' + CC.bonusScore + ' pts', '#ffd166');
        }
      } else if (type === 'bonusClock') {
        // Coleccionable de puntuación; NO afecta el cronómetro.
        gs.score = (gs.score || 0) + CC.score;
        showMsg('+' + CC.score + ' pts', '#6bff9e');
      } else if (type === 'headphones') {
        gs.headphonesTimer = CC.duration;
        showMsg('Audífonos ' + CC.duration + 's', '#a0c4ff');
      }
      return true;
    },
  };
}

// ── Torniquete ────────────────────────────────────────────────────────────────
function makeTurnstile(x, y, assets) {
  // frames: 0 cerrado(rojo) … 4 abierto
  var rH = 96;
  var TOTAL = s2FrameCount('turnstile');
  return {
    x: x, y: y,
    active: true,
    state: 'closed',  // closed | opening | open
    _frame: 0, _animTimer: 0,
    draw: function(ctx, camX) {
      drawContentFrame(ctx, assets.turnstile, S2_MANIFEST.turnstile, this._frame,
        this.x - camX, this.y + rH, rH, false);
    },
    open: function() {
      if (this.state !== 'closed') return;
      this.state = 'opening';
    },
    update: function(dt) {
      if (this.state === 'opening') {
        advanceFrame(this, dt, 6, TOTAL, false);
        if (this._frame >= TOTAL - 1) this.state = 'open';
      }
    },
  };
}

// ── Validador Bip ─────────────────────────────────────────────────────────────
function makeValidator(x, y, assets) {
  var rH = 84;
  return {
    x: x, y: y,
    active: true,
    _frame: 0, _animTimer: 0,
    activated: false,
    blink: 0,
    draw: function(ctx, camX) {
      drawContentFrame(ctx, assets.validator, S2_MANIFEST.validator, 0,
        this.x - camX, this.y + rH, rH, false);
      // Destello verde al activar
      if (this.activated) {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.blink * 12);
        ctx.fillStyle = '#6bff9e';
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y + rH * 0.5, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
    activate: function() { this.activated = true; },
    update: function(dt) { if (this.activated) this.blink += dt; },
  };
}

// ── Micro (autobús) ───────────────────────────────────────────────────────────
function makeMicro(startX, groundY, assets) {
  var rH = 176;
  var def = S2_MANIFEST.micro;
  var rW = def && def.refW ? rH * def.refW / def.refH : rH;  // aspecto real
  return {
    x: startX, y: groundY - rH,
    state: 'arriving',  // arriving | open | leaving
    active: true,
    doorTimer: 0,
    rW: rW, rH: rH,

    // Puerta ~centro-izquierda de la carrocería (el frente mira a la derecha).
    get doorX() { return this.x + rW * 0.40; },
    get doorW()  { return rW * 0.22; },

    update: function(dt) {
      if (this.state === 'arriving') {
        var target = 700;
        this.x += (target - this.x) * Math.min(1, dt * 3);
        if (Math.abs(this.x - target) < 2) { this.x = target; this.state = 'open'; }
      } else if (this.state === 'leaving') {
        this.x += S2C.busStop.microSpeedDepart * dt;
        if (this.x > S2C.busStop.microDepartX) this.active = false;
      }
    },
    draw: function(ctx, camX) {
      var frame = (this.state === 'open') ? 1 : 0;  // 1=puerta abierta
      drawContentFrame(ctx, assets.micro, S2_MANIFEST.micro, frame,
        this.x + rW / 2 - camX, this.y + rH, rH, false);
    },
    drawDebug: function(ctx, camX) {
      ctx.strokeStyle = '#0ff'; ctx.lineWidth = 1;
      ctx.strokeRect(this.x - camX, this.y, rW, rH);
      if (this.state === 'open') {
        ctx.fillStyle = 'rgba(0,255,255,0.15)';
        ctx.fillRect(this.doorX - camX, this.y, this.doorW, rH);
      }
    },
  };
}

// ── Metro (tren — solo transición visual) ────────────────────────────────────
function makeMetro(assets) {
  var rH = 150;
  var def = S2_MANIFEST.metro;
  var rW = def && def.refW ? rH * def.refW / def.refH : rH * 4;
  return {
    x: -rW, y: 0,
    rW: rW, rH: rH,
    active: true,
    update: function(dt) { this.x += 420 * dt; },
    draw: function(ctx) {
      // El tren avanza a la derecha: su frente (cabina) debe mirar a la derecha → flip.
      drawContentFrame(ctx, assets.metro, S2_MANIFEST.metro, 0,
        this.x + rW / 2, S2C.H / 2 + 120, rH, true);
    },
  };
}

// ── Autos (hazard visual en cruce) ───────────────────────────────────────────
function makeAuto(x, speed, assets) {
  var rH = 74;
  var def = S2_MANIFEST.autos;
  var rW = def && def.refW ? rH * def.refW / def.refH : rH * 1.5;
  var variant = Math.floor(Math.random() * s2FrameCount('autos'));  // 1 auto fijo
  return {
    x: x, y: S2C.fall.fallThreshold - rH + 6,
    rW: rW, rH: rH,
    active: true,
    speed: speed,
    update: function(dt) {
      this.x += this.speed * dt;
      if (this.x > S2C.W + 220) this.x = -220;
    },
    draw: function(ctx) {
      drawContentFrame(ctx, assets.autos, S2_MANIFEST.autos, variant,
        this.x + rW / 2, this.y + rH, rH, this.speed < 0);
    },
  };
}
