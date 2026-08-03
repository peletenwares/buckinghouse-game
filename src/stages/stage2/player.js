'use strict';

// Fábrica de jugadora. Requiere S2C (config) y assets cargados.
function makeS2Player(startX, startY, assets) {
  var C = S2C.player;

  // ── Sprites ──────────────────────────────────────────────────────────────
  var ANIM = {
    idle:  { key: 'playerIdle',  fps:  4, loop: true  },
    walk:  { key: 'playerWalk',  fps:  8, loop: true  },
    run:   { key: 'playerRun',   fps: 12, loop: true  },
    jump:  { key: 'playerJump',  fps: 10, loop: false },
    hurt:  { key: 'playerHurt',  fps:  8, loop: false },
    bip:   { key: 'playerBip',   fps:  6, loop: false },
    win:   { key: 'playerWin',   fps:  5, loop: true  },
    lose:  { key: 'playerLose',  fps:  4, loop: false },
  };

  var p = {
    // Posición (pies del personaje)
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,

    // Estado de física
    onGround: false,
    onPlatform: null,
    coyoteTimer: 0,
    jumpBufferTimer: 0,

    // Estado de juego
    state: 'idle',   // idle | walk | run | jump | hurt | bip | win | lose
    invulTimer: 0,
    stunTimer: 0,
    facingRight: true,

    // Animación
    animKey: 'idle',
    animFrame: 0,
    animTimer: 0,

    // Zona de influencia de cantante (activa cuando hay speedFactor)
    speedFactor: 1.0,

    // Hitbox (relativo a frame top-left)
    hitOX: C.hitOX,
    hitOY: C.hitOY,
    hitW:  C.hitW,
    hitH:  C.hitH,
    renderH: C.renderH,

    hitbox: function() {
      // x = centro horizontal, y = pies (base) de la jugadora
      return {
        x: this.x - this.hitW / 2,
        y: this.y - this.hitH,
        w: this.hitW,
        h: this.hitH,
      };
    },

    setAnim: function(key) {
      if (this.animKey === key) return;
      this.animKey = key;
      this.animFrame = 0;
      this.animTimer = 0;
    },

    tickAnim: function(dt) {
      var anim = ANIM[this.animKey];
      if (!anim) return;
      this.animTimer += dt;
      var interval = 1 / anim.fps;
      while (this.animTimer >= interval) {
        this.animTimer -= interval;
        var def = S2_MANIFEST[anim.key];
        var total = (def && def.frames) ? def.frames.length : 1;
        if (anim.loop) {
          this.animFrame = (this.animFrame + 1) % total;
        } else {
          this.animFrame = Math.min(this.animFrame + 1, total - 1);
        }
      }
    },

    stun: function(duration) {
      this.stunTimer = duration;
      this.state = 'hurt';
      this.setAnim('hurt');
      this.invulTimer = Math.max(this.invulTimer, S2C.player.invulDuration);
    },

    // Actualiza física. Recibe lista de plataformas de la escena.
    update: function(dt, platforms, groundY, inLaneMode) {
      if (this.invulTimer > 0) this.invulTimer -= dt;

      // Stun: bloquea input
      var stunned = this.stunTimer > 0;
      if (stunned) {
        this.stunTimer -= dt;
        this.vx *= 0.85;
        this._applyGravityAndMove(dt, platforms, groundY, inLaneMode);
        this.tickAnim(dt);
        return;
      }

      this.speedFactor = 1.0;  // resetear cada frame; la escena lo sobreescribe si hay cantante

      var leftHeld  = S2Input.is('left');
      var rightHeld = S2Input.is('right');
      var jumpPress = S2Input.pressed('jump');

      // Buffer de salto
      if (jumpPress) this.jumpBufferTimer = S2C.jumpBuffer;
      else if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

      // Movimiento horizontal (no en modo lane)
      if (!inLaneMode) {
        var spd = S2C.moveSpeed * this.speedFactor;
        if (leftHeld) {
          this.vx = -spd;
          this.facingRight = false;
        } else if (rightHeld) {
          this.vx = spd;
          this.facingRight = true;
        } else {
          this.vx *= (1 - S2C.friction);
          if (Math.abs(this.vx) < 5) this.vx = 0;
        }
      } else {
        // Modo carril: la escena controla Y; aquí solo X
        var lspd = S2C.moveSpeed * this.speedFactor;
        if (leftHeld)  { this.vx = -lspd; this.facingRight = false; }
        else if (rightHeld) { this.vx =  lspd; this.facingRight = true;  }
        else { this.vx *= (1 - S2C.friction); if (Math.abs(this.vx) < 5) this.vx = 0; }
      }

      // Coyote time
      if (!this.onGround && !inLaneMode) {
        if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
      }

      // Salto
      var canJump = this.onGround || this.coyoteTimer > 0;
      if (this.jumpBufferTimer > 0 && canJump && !inLaneMode) {
        this.vy = -S2C.jumpSpeed;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
      }

      this._applyGravityAndMove(dt, platforms, groundY, inLaneMode);
      this._updateState();
      this.tickAnim(dt);
    },

    _applyGravityAndMove: function(dt, platforms, groundY, inLaneMode) {
      if (!inLaneMode) {
        this.vy += S2C.gravity * dt;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.onPlatform = null;

      if (!inLaneMode) {
        var landed = false;
        // Colisión con plataformas (desde arriba)
        if (platforms && this.vy >= 0) {
          for (var i = 0; i < platforms.length; i++) {
            var pl = platforms[i];
            if (!pl.active) continue;
            var hb = this.hitbox();
            // El pie inferior del hitbox estaba por encima del techo de la plataforma antes del movimiento
            var prevFeetY = hb.y + hb.h - this.vy * dt;
            var nowFeetY  = hb.y + hb.h;
            var inX = hb.x < pl.x + pl.w && hb.x + hb.w > pl.x;
            if (inX && prevFeetY <= pl.y + S2C.platform.h * 0.5 && nowFeetY >= pl.y) {
              this.y = pl.y;  // pies sobre la superficie de la plataforma
              this.vy = 0;
              this.onGround  = true;
              this.onPlatform = pl;
              this.coyoteTimer = S2C.coyoteTime;
              if (pl.vy) this.y += pl.vy * dt;
              if (pl.vx) this.x += pl.vx * dt;
              landed = true;
              break;
            }
          }
        }

        // Colisión con suelo
        if (this.y >= groundY) {
          this.y = groundY;
          this.vy = 0;
          if (!this.onGround) this.coyoteTimer = S2C.coyoteTime;
          this.onGround = true;
          landed = true;
        }

        if (!landed) {
          this.onGround   = false;
          this.onPlatform = null;
        }
      }
    },

    _updateState: function() {
      if (this.stunTimer > 0) { this.state = 'hurt'; return; }
      if (this.state === 'bip' || this.state === 'win' || this.state === 'lose') return;
      if (!this.onGround) { this.state = 'jump'; this.setAnim('jump'); return; }
      if (this.vx !== 0) {
        var fast = Math.abs(this.vx) > S2C.moveSpeed * 0.8;
        this.state = fast ? 'run' : 'walk';
        this.setAnim(fast ? 'run' : 'walk');
      } else {
        this.state = 'idle';
        this.setAnim('idle');
      }
    },

    draw: function(ctx, camX) {
      var anim = ANIM[this.animKey] || ANIM.idle;
      var entry = assets[anim.key];
      var def   = S2_MANIFEST[anim.key];
      if (!entry || !entry.ok || !def) return;

      ctx.save();
      if (this.invulTimer > 0) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.invulTimer * 20);
      // x = centro, y = pies. Content-box escalado a renderH preservando aspecto.
      drawContentFrame(ctx, entry, def, this.animFrame,
        this.x - camX, this.y, this.renderH, !this.facingRight, 'feet');
      ctx.restore();
    },

    drawHitbox: function(ctx, camX) {
      var hb = this.hitbox();
      ctx.strokeStyle = 'rgba(0,255,0,0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hb.x - camX, hb.y, hb.w, hb.h);
    },
  };

  return p;
}
