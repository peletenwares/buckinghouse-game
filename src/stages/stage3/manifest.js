// Stage 3 — "Despertarlos" (etapa oficial, antes wake-up legacy de Stage 2).
// Implementación reutilizada de la etapa wake-up preservada; promovida a Stage 3.
// Assets oficiales de Stage 3 en assets/stage3/.
const STAGE3_MANIFEST = {
  bgEmpty:       { src: 'assets/stage3/backgrounds/living-room-empty.png',    w: 1672, h: 941 },
  bgRef:         { src: 'assets/stage3/backgrounds/living-room-reference.png', w: 1672, h: 941 },
  charShirtless: { src: 'assets/stage3/characters/sleeper-shirtless.png',  w: 1536, h: 1024, cols: 5, rows: 2, cellW: 307.2, cellH: 512 },
  charBlueShirt: { src: 'assets/stage3/characters/sleeper-blue-shirt.png', w: 1536, h: 1024, cols: 4, rows: 2, cellW: 384,   cellH: 512 },
  clocks:        { src: 'assets/stage3/projectiles/alarm-clocks.png',      w: 1536, h: 1024, cols: 4, rows: 1, cellW: 384,   cellH: 1024 },
  slingshot:     { src: 'assets/stage3/projectiles/slingshot.png',         w: 1536, h: 1024, cols: 3, rows: 1, cellW: 512,   cellH: 1024 },
  targets:       { src: 'assets/stage3/targets/targets.png',               w: 1536, h: 1024, cols: 4, rows: 1, cellW: 384,   cellH: 1024 },
  zzz:           { src: 'assets/stage3/sleep/zzz.png',                     w: 1536, h: 1024, cols: 4, rows: 3, cellW: 384,   cellH: 341.33 },
  effects:       { src: 'assets/stage3/fx/game-effects.png',               w: 1536, h: 1024, cols: 3, rows: 2, cellW: 512,   cellH: 512 },
  hud:           { src: 'assets/stage3/ui/hud.png',                        w: 1536, h: 1024 },
  messages:      { src: 'assets/stage3/ui/result-messages.png',            w: 1536, h: 1024 },
  sceneSleeping:  { src: 'assets/stage3/scenes/scene-sleeping.png',   w: 1672, h: 941 },
  sceneReacting1: { src: 'assets/stage3/scenes/scene-reacting-1.png', w: 1672, h: 941 },
  sceneReacting2: { src: 'assets/stage3/scenes/scene-reacting-2.png', w: 1672, h: 941 },
  sceneYawning:   { src: 'assets/stage3/scenes/scene-yawning.png',    w: 1672, h: 941 },
  slingshotIdle:  { src: 'assets/stage3/slingshot/slingshot-idle.png', w: 1024, h: 1024 },
  targetNormal:   { src: 'assets/stage3/targets/target-normal.png',    w: 1536, h: 1024 },
  targetHot:      { src: 'assets/stage3/targets/target-hot.png',       w: 1536, h: 1024 },
  targetGold:     { src: 'assets/stage3/targets/target-gold.png',      w: 1536, h: 1024 },
  zzzSmall:       { src: 'assets/stage3/sleep/zzz-small.png',          w: 1024, h: 1024 },
  zzzMedium:      { src: 'assets/stage3/sleep/zzz-medium.png',         w: 1024, h: 1024 },
  zzzLarge:       { src: 'assets/stage3/sleep/zzz-large.png',          w: 1024, h: 1024 },
  slingshotPulled:  { src: 'assets/stage3/slingshot/slingshot-pulled.png',  w: 1024, h: 1024 },
  slingshotRelease: { src: 'assets/stage3/slingshot/slingshot-release.png', w: 1024, h: 1024 },
  clockRed:         { src: 'assets/stage3/projectiles/alarm-clock-red.png', w: 1024, h: 1024 },
};

function loadStage3Assets() {
  const results = {};
  const promises = Object.entries(STAGE3_MANIFEST).map(([key, def]) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { results[key] = { img, ok: true };        resolve(); };
      img.onerror = () => { results[key] = { img: null, ok: false }; resolve(); };
      img.src = def.src;
    })
  );
  return Promise.all(promises).then(() => results);
}
