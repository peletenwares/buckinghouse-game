'use strict';

// ── Helpers ──────────────────────────────────────────────────────────────────

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawSpriteFrame(ctx, entry, def, frame, dx, dy, renderH, flipX) {
  if (!entry || !entry.ok) return;
  var col = frame % def.cols;
  var row = Math.floor(frame / def.cols);
  var sx = col * def.fw, sy = row * def.fh;
  var dw = renderH, dh = renderH; // frame cuadrado
  ctx.save();
  if (flipX) {
    ctx.scale(-1, 1);
    ctx.drawImage(entry.img, sx, sy, def.fw, def.fh, -(Math.round(dx) + dw), Math.round(dy), dw, dh);
  } else {
    ctx.drawImage(entry.img, sx, sy, def.fw, def.fh, Math.round(dx), Math.round(dy), dw, dh);
  }
  ctx.restore();
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
function makePlatform(x, y, w, assetKey, assets) {
  var C = S2C.platform;
  return {
    x: x, y: y, w: w, h: C.h,
    active: true,
    vx: 0, vy: 0,
    assetKey: assetKey,
    draw: function(ctx, camX) {
      var entry = assets[assetKey];
      var def   = S2_MANIFEST[assetKey];
      if (!entry || !entry.ok || !def) {
        // fallback visual mínimo (no usar si asset carga)
        ctx.fillStyle = 'rgba(80,60,40,0.8)';
        ctx.fillRect(this.x - camX, this.y, this.w, this.h);
        return;
      }
      // Renderizar frame 0, estirado al ancho lógico
      var sx = 0, sy = 0, sw = def.fw, sh = def.fh;
      ctx.drawImage(entry.img, sx, sy, sw, sh,
        Math.round(this.x - camX), Math.round(this.y), this.w, this.h);
    },
    drawDebug: function(ctx, camX) {
      ctx.strokeStyle = 'rgba(255,200,0,0.7)';
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
    assetKey: assetKey,
    update: function(dt) {
      this.y += this.vy * dt;
      if (this.y >= this.yMax) { this.y = this.yMax; this.vy = -Math.abs(this.vy); }
      if (this.y <= this.yMin) { this.y = this.yMin; this.vy =  Math.abs(this.vy); }
    },
    draw: function(ctx, camX) {
      var entry = assets[assetKey];
      var def   = S2_MANIFEST[assetKey];
      if (!entry || !entry.ok || !def) {
        ctx.fillStyle = 'rgba(60,90,140,0.8)';
        ctx.fillRect(this.x - camX, this.y, this.w, this.h);
        return;
      }
      ctx.drawImage(entry.img, 0, 0, def.fw, def.fh,
        Math.round(this.x - camX), Math.round(this.y), this.w, this.h);
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
  var rH = 72;
  return {
    x: x, y: y, w: 44, h: rH,
    active: true,
    _frame: 0, _animTimer: 0,
    hitbox: function() { return { x: this.x + 4, y: this.y, w: 36, h: rH }; },
    update: function(dt) { advanceFrame(this, dt, 2, 6, true); },
    draw: function(ctx, camX) {
      var entry = assets.barrierProp;
      var def   = S2_MANIFEST.barrierProp;
      if (!entry || !entry.ok) return;
      drawSpriteFrame(ctx, entry, def, this._frame, this.x - camX, this.y - rH + this.h, rH, false);
    },
  };
}

// ── Vendedor (NPC) ────────────────────────────────────────────────────────────
function makeVendor(x, assets) {
  var CC = S2C.vendor;
  var rH = CC.renderH;
  var groundY = 0; // se asigna en init de la escena
  return {
    x: x, y: 0,
    w: rH, h: rH,
    active: true,
    _frame: 0, _animTimer: 0,
    cooldown: 0,
    setGround: function(gy) { this.y = gy - rH; },
    hitbox: function() { return { x: this.x + CC.hitOX, y: this.y + CC.hitOY, w: CC.hitW, h: CC.hitH }; },
    update: function(dt) {
      advanceFrame(this, dt, CC.fps, CC.totalFrames, true);
      if (this.cooldown > 0) this.cooldown -= dt;
    },
    draw: function(ctx, camX) {
      var entry = assets.vendor;
      var def   = S2_MANIFEST.vendor;
      if (!entry || !entry.ok) return;
      drawSpriteFrame(ctx, entry, def, this._frame, this.x - camX, this.y, rH, false);
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
    _frame: 0, _animTimer: 0,
    speed: CC.speed,
    setGround: function(gy) { this.y = gy - rH; },
    hitbox: function() { return { x: this.x + CC.hitOX, y: this.y + CC.hitOY, w: CC.hitW, h: CC.hitH }; },
    update: function(dt) {
      advanceFrame(this, dt, CC.fps, CC.totalFrames, true);
      this.x += this.speed * dt;
    },
    draw: function(ctx, camX) {
      var entry = assets.pedestrian;
      var def   = S2_MANIFEST.pedestrian;
      if (!entry || !entry.ok) return;
      drawSpriteFrame(ctx, entry, def, this._frame, this.x - camX, this.y, rH, false);
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
      // Bloqueo suave: empujar al jugador fuera
      if (pb.x + pb.w / 2 < hb.x + hb.w / 2) {
        player.x = hb.x - pb.w / 2 - player.hitOX;
        player.vx = Math.min(player.vx, 0);
      } else {
        player.x = hb.x + hb.w + pb.w / 2 - player.hitOX + player.hitW;
        player.vx = Math.max(player.vx, this.speed);
      }
    },
  };
}

// ── Velociraptor (NPC) ────────────────────────────────────────────────────────
function makeVelociraptor(x, laneY, assets, useAlt) {
  var CC = S2C.velociraptor;
  var rH = CC.renderH;
  var key = useAlt ? 'velociraptor2' : 'velociraptor';
  return {
    x: x, y: laneY - rH,
    w: rH, h: rH,
    active: true,
    _frame: 0, _animTimer: 0,
    cooldown: 0,
    lane: null,
    hitbox: function() { return { x: this.x + CC.hitOX, y: this.y + CC.hitOY, w: CC.hitW, h: CC.hitH }; },
    update: function(dt, worldLeft) {
      advanceFrame(this, dt, CC.fps, CC.totalFrames, true);
      if (this.cooldown > 0) this.cooldown -= dt;
      this.x -= CC.speed * dt;
      if (this.x < worldLeft - rH * 2) this.active = false;
    },
    draw: function(ctx, camX) {
      var entry = assets[key];
      var def   = S2_MANIFEST[key];
      if (!entry || !entry.ok) return;
      // raptor mira a la izquierda (viene de la derecha)
      drawSpriteFrame(ctx, entry, def, this._frame, this.x - camX, this.y, rH, true);
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
    _frame: 0, _animTimer: 0,
    gender: gender || 'male',
    setGround: function(gy) { this.y = gy - rH; },
    influenceBox: function() {
      return { x: this.x - CC.influenceW / 2, y: this.y - 20,
               w: CC.influenceW + rH, h: rH + 40 };
    },
    hitbox: function() { return this.influenceBox(); },
    update: function(dt) {
      advanceFrame(this, dt, CC.fps, CC.totalFrames, true);
      noteTimer += dt;
      if (noteTimer > 0.4) {
        noteTimer = 0;
        notes.push({ x: this.x + rH * 0.5, y: this.y, vy: -40, alpha: 1.0,
                     frame: Math.floor(Math.random() * 4) });
      }
      for (var i = notes.length - 1; i >= 0; i--) {
        notes[i].y  += notes[i].vy * dt;
        notes[i].alpha -= dt * 0.8;
        if (notes[i].alpha <= 0) notes.splice(i, 1);
      }
    },
    draw: function(ctx, camX) {
      var entry = assets[key];
      var def   = S2_MANIFEST[key];
      if (!entry || !entry.ok) return;
      drawSpriteFrame(ctx, entry, def, this._frame, this.x - camX, this.y, rH, false);
      // Notas musicales desde FX
      var fxEntry = assets.fx;
      var fxDef   = S2_MANIFEST.fx;
      var nRH = S2C.fx.renderH;
      notes.forEach(function(n) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, n.alpha);
        if (fxEntry && fxEntry.ok && fxDef) {
          var col = n.frame % fxDef.cols;
          var row = Math.floor(n.frame / fxDef.cols);
          ctx.drawImage(fxEntry.img, col * fxDef.fw, row * fxDef.fh, fxDef.fw, fxDef.fh,
            Math.round(n.x - camX - nRH / 2), Math.round(n.y), nRH, nRH);
        }
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
    update: function(dt) { advanceFrame(this, dt, CC.fps, CC.totalFrames, true); },
    draw: function(ctx, camX) {
      var entry = assets[assetKey];
      var def   = S2_MANIFEST[assetKey];
      if (!entry || !entry.ok) return;
      drawSpriteFrame(ctx, entry, def, this._frame, this.x - camX, this.y, rH, false);
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
        gs.bipCount++;
        showMsg('Saldo Bip +1', '#ffd166');
      } else if (type === 'bonusClock') {
        gs.timer += CC.timeBonus;
        showMsg('+' + CC.timeBonus + 's', '#6bff9e');
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
  // frames: 0-2 = cerrado, 3-5 = abriendo
  var rH = 90;
  return {
    x: x, y: y,
    active: true,
    state: 'closed',  // closed | opening | open
    _frame: 0, _animTimer: 0,
    openTimer: 0,
    draw: function(ctx, camX) {
      var entry = assets.turnstile;
      var def   = S2_MANIFEST.turnstile;
      if (!entry || !entry.ok) return;
      drawSpriteFrame(ctx, entry, def, this._frame, this.x - camX, this.y - rH, rH, false);
    },
    open: function() {
      if (this.state !== 'closed') return;
      this.state = 'opening';
      this._frame = 0;
    },
    update: function(dt) {
      if (this.state === 'opening') {
        advanceFrame(this, dt, 4, 6, false);
        if (this._frame >= 5) { this.state = 'open'; }
      }
    },
  };
}

// ── Validador Bip ─────────────────────────────────────────────────────────────
function makeValidator(x, y, assets) {
  var rH = 70;
  return {
    x: x, y: y,
    active: true,
    _frame: 0, _animTimer: 0,
    activated: false,
    draw: function(ctx, camX) {
      var entry = assets.validator;
      var def   = S2_MANIFEST.validator;
      if (!entry || !entry.ok) return;
      drawSpriteFrame(ctx, entry, def, this._frame, this.x - camX, this.y - rH, rH, false);
    },
    activate: function() {
      if (this.activated) return;
      this.activated = true;
    },
    update: function(dt) {
      if (this.activated) {
        advanceFrame(this, dt, 5, 4, true);
      }
    },
  };
}

// ── Micro (autobús) ───────────────────────────────────────────────────────────
function makeMicro(startX, groundY, assets) {
  var rH = 130;
  var rW = rH; // frame cuadrado
  return {
    x: startX, y: groundY - rH,
    state: 'arriving',  // arriving | open | closing | leaving
    active: true,
    _frame: 0, _animTimer: 0,
    doorTimer: 0,

    // X de la puerta (donde el jugador sube)
    get doorX() { return this.x + 20; },
    get doorW()  { return 36; },

    update: function(dt) {
      advanceFrame(this, dt, 6, 6, true);
      if (this.state === 'arriving') {
        var target = 800;
        this.x += (target - this.x) * Math.min(1, dt * 3);
        if (Math.abs(this.x - target) < 2) { this.x = target; this.state = 'open'; }
      } else if (this.state === 'leaving') {
        this.x += S2C.busStop.microSpeedDepart * dt;
        if (this.x > S2C.busStop.microDepartX) this.active = false;
      }
    },
    draw: function(ctx, camX) {
      var entry = assets.micro;
      var def   = S2_MANIFEST.micro;
      if (!entry || !entry.ok) return;
      var frame = this._frame % (def.cols * def.rows);
      var col = frame % def.cols;
      var row = Math.floor(frame / def.cols);
      ctx.drawImage(entry.img, col * def.fw, row * def.fh, def.fw, def.fh,
        Math.round(this.x - camX), Math.round(this.y), rW, rH);
    },
    drawDebug: function(ctx, camX) {
      ctx.strokeStyle = '#0ff'; ctx.lineWidth = 1;
      ctx.strokeRect(this.x - camX, this.y, rW, rH);
      if (this.state === 'open') {
        ctx.fillStyle = 'rgba(0,255,255,0.1)';
        ctx.fillRect(this.doorX - camX, this.y, this.doorW, rH);
      }
    },
  };
}

// ── Metro (tren — solo transición visual) ────────────────────────────────────
function makeMetro(assets) {
  var rH = 160;
  return {
    x: -rH, y: 0,
    active: true,
    _frame: 0, _animTimer: 0,
    update: function(dt) {
      advanceFrame(this, dt, 8, 6, true);
      this.x += 420 * dt;
    },
    draw: function(ctx) {
      var entry = assets.metro;
      var def   = S2_MANIFEST.metro;
      if (!entry || !entry.ok) return;
      var frame = this._frame % (def.cols * def.rows);
      var col = frame % def.cols;
      var row = Math.floor(frame / def.cols);
      ctx.drawImage(entry.img, col * def.fw, row * def.fh, def.fw, def.fh,
        Math.round(this.x), Math.round(this.y + 280), rH * 3, rH);
    },
  };
}

// ── Autos (hazard visual en cruce) ───────────────────────────────────────────
function makeAuto(x, speed, assets) {
  var rH = 60;
  return {
    x: x, y: S2C.fall.fallThreshold - rH,
    active: true,
    _frame: 0, _animTimer: 0,
    speed: speed,
    update: function(dt) {
      advanceFrame(this, dt, 6, 6, true);
      this.x += this.speed * dt;
      if (this.x > S2C.W + 200) this.x = -200;
    },
    draw: function(ctx) {
      var entry = assets.autos;
      var def   = S2_MANIFEST.autos;
      if (!entry || !entry.ok) return;
      var frame = (this._frame || 0) % (def.cols * def.rows);
      var col = frame % def.cols;
      var row = Math.floor(frame / def.cols);
      ctx.drawImage(entry.img, col * def.fw, row * def.fh, def.fw, def.fh,
        Math.round(this.x), Math.round(this.y), rH * 2, rH);
    },
  };
}
