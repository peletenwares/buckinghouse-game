'use strict';

// Manifiesto de assets de la Stage 2 Commute.
// Dimensiones verificadas con Python struct el 2026-08-02.
// Grilla estándar 512×512 por frame en todos los sprites.
// Los fondos son imágenes únicas 2084×755 (no grilla).
const S2_MANIFEST = {

  // ── Fondos (imagen única, sin grilla) ───────────────────────────────────
  bgApartment: { src: 'assets/stage2-commute/backgrounds/01-escenario-inicio.png', w: 2084, h: 755 },
  bgCrossing:  { src: 'assets/stage2-commute/backgrounds/sprite-cruce.png',         w: 2084, h: 755 },
  bgMetro:     { src: 'assets/stage2-commute/backgrounds/02-escenario.png',          w: 2084, h: 755 },
  bgBusStop:   { src: 'assets/stage2-commute/backgrounds/03-escenario.png',          w: 2084, h: 755 },
  bgClinic:    { src: 'assets/stage2-commute/backgrounds/04-escenario-fin.png',      w: 2084, h: 755 },

  // ── FX (1024×1024 → 4×4 = 16 frames de 256×256) ────────────────────────
  fx: { src: 'assets/stage2-commute/fx/hoja-fx-2d.png',
        w: 1024, h: 1024, cols: 4, rows: 4, fw: 256, fh: 256 },

  // ── Ítems (512×512 por frame) ────────────────────────────────────────────
  bipCredit:  { src: 'assets/stage2-commute/items/01-saldo-bip.png',
                w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  headphones: { src: 'assets/stage2-commute/items/sprite-audifonos.png',
                w: 1024, h: 1024, cols: 2, rows: 2, fw: 512, fh: 512 },
  bonusClock: { src: 'assets/stage2-commute/items/sprite-reloj-bonus.png',
                w: 1024, h: 1024, cols: 2, rows: 2, fw: 512, fh: 512 },

  // ── NPCs (512×512 por frame) ─────────────────────────────────────────────
  singerMale:   { src: 'assets/stage2-commute/npc/sprite-cantante-callejero.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  singerFemale: { src: 'assets/stage2-commute/npc/sprite-cantante-callejero-femenino.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  pedestrian:   { src: 'assets/stage2-commute/npc/sprites-peaton-lento.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  velociraptor: { src: 'assets/stage2-commute/npc/sprites-velociraptors.png',
                  w: 1024, h: 1536, cols: 2, rows: 3, fw: 512, fh: 512 },
  velociraptor2:{ src: 'assets/stage2-commute/npc/sprites-velociraptors-02.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  vendor:       { src: 'assets/stage2-commute/npc/sprites-vendedor.png',
                  w: 1024, h: 1536, cols: 2, rows: 3, fw: 512, fh: 512 },

  // ── Jugadora — 8 hojas de animación (512×512 por frame) ─────────────────
  // 01,02 son portrait (1024×1536 → 2×3 = 6 frames)
  // 03-08 son landscape (1536×1024 → 3×2 = 6 frames)
  playerWalk:   { src: 'assets/stage2-commute/player/01-personaje-principal-sprites.png',
                  w: 1024, h: 1536, cols: 2, rows: 3, fw: 512, fh: 512 },
  playerRun:    { src: 'assets/stage2-commute/player/02-personaje-principal-sprites.png',
                  w: 1024, h: 1536, cols: 2, rows: 3, fw: 512, fh: 512 },
  playerIdle:   { src: 'assets/stage2-commute/player/03-personaje-principal-sprites.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  playerJump:   { src: 'assets/stage2-commute/player/04-personaje-principal-sprites.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  playerHurt:   { src: 'assets/stage2-commute/player/05-personaje-principal-sprites.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  playerBip:    { src: 'assets/stage2-commute/player/06-personaje-principal-sprites.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  playerWin:    { src: 'assets/stage2-commute/player/07-personaje-principal-sprites.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  playerLose:   { src: 'assets/stage2-commute/player/08-personaje-principal-sprites.png',
                  w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },

  // ── Props (512×512 por frame; frame 0 = variante principal) ─────────────
  barrierProp:   { src: 'assets/stage2-commute/props/sprite-barrera-obra.png',
                   w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  busstopProp:   { src: 'assets/stage2-commute/props/sprite-paradero.png',
                   w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  platWide:      { src: 'assets/stage2-commute/props/sprite-plataforma-ancha.png',
                   w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  platRest:      { src: 'assets/stage2-commute/props/sprite-plataforma-descanso.png',
                   w: 1024, h: 1024, cols: 2, rows: 2, fw: 512, fh: 512 },
  platMed:       { src: 'assets/stage2-commute/props/sprite-plataforma-mediana.png',
                   w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  platSmall:     { src: 'assets/stage2-commute/props/sprite-plataforma-pequeña.png',
                   w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  turnstile:     { src: 'assets/stage2-commute/props/sprite-torniquete.png',
                   w: 1536, h: 1024, cols: 3, rows: 2, fw: 512, fh: 512 },
  validator:     { src: 'assets/stage2-commute/props/sprite-validador.png',
                   w: 1024, h: 1024, cols: 2, rows: 2, fw: 512, fh: 512 },

  // ── Vehículos (1024×1536 → 2×3 = 6 frames de 512×512) ──────────────────
  autos: { src: 'assets/stage2-commute/vehicles/sprites-autos.png',
           w: 1024, h: 1536, cols: 2, rows: 3, fw: 512, fh: 512 },
  metro: { src: 'assets/stage2-commute/vehicles/sprites-metro.png',
           w: 1024, h: 1536, cols: 2, rows: 3, fw: 512, fh: 512 },
  micro: { src: 'assets/stage2-commute/vehicles/sprites-micro.png',
           w: 1024, h: 1536, cols: 2, rows: 3, fw: 512, fh: 512 },
};

// Carga todos los assets. Resuelve aunque alguno falle.
// Retorna { key: { img, ok, src } }.
function loadS2Assets() {
  var results = {};
  var promises = Object.keys(S2_MANIFEST).map(function(key) {
    return new Promise(function(resolve) {
      var def = S2_MANIFEST[key];
      var img = new Image();
      img.onload  = function() { results[key] = { img: img, ok: true,  src: def.src }; resolve(); };
      img.onerror = function() {
        results[key] = { img: null, ok: false, src: def.src };
        console.error('[Stage2] Asset no cargó:', def.src);
        resolve();
      };
      img.src = def.src;
    });
  });
  return Promise.all(promises).then(function() { return results; });
}
