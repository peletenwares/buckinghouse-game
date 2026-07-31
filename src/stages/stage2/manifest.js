const STAGE2_MANIFEST = {
  bgEmpty:       { src: 'assets/stage2/backgrounds/living-room-empty.png',    w: 1672, h: 941 },
  bgRef:         { src: 'assets/stage2/backgrounds/living-room-reference.png', w: 1672, h: 941 },
  charShirtless: { src: 'assets/stage2/characters/sleeper-shirtless.png',  w: 1536, h: 1024, cols: 5, rows: 2, cellW: 307.2, cellH: 512 },
  charBlueShirt: { src: 'assets/stage2/characters/sleeper-blue-shirt.png', w: 1536, h: 1024, cols: 4, rows: 2, cellW: 384,   cellH: 512 },
  clocks:        { src: 'assets/stage2/projectiles/alarm-clocks.png',      w: 1536, h: 1024, cols: 4, rows: 1, cellW: 384,   cellH: 1024 },
  slingshot:     { src: 'assets/stage2/projectiles/slingshot.png',         w: 1536, h: 1024, cols: 3, rows: 1, cellW: 512,   cellH: 1024 },
  targets:       { src: 'assets/stage2/targets/targets.png',               w: 1536, h: 1024, cols: 4, rows: 1, cellW: 384,   cellH: 1024 },
  zzz:           { src: 'assets/stage2/sleep/zzz.png',                     w: 1536, h: 1024, cols: 4, rows: 3, cellW: 384,   cellH: 341.33 },
  effects:       { src: 'assets/stage2/fx/game-effects.png',               w: 1536, h: 1024, cols: 3, rows: 2, cellW: 512,   cellH: 512 },
  hud:           { src: 'assets/stage2/ui/hud.png',                        w: 1536, h: 1024 },
  messages:      { src: 'assets/stage2/ui/result-messages.png',            w: 1536, h: 1024 },
  sceneSleeping:  { src: 'assets/stage2/scenes/scene-sleeping.png',   w: 1672, h: 941 },
  sceneReacting1: { src: 'assets/stage2/scenes/scene-reacting-1.png', w: 1672, h: 941 },
  sceneReacting2: { src: 'assets/stage2/scenes/scene-reacting-2.png', w: 1672, h: 941 },
  sceneYawning:   { src: 'assets/stage2/scenes/scene-yawning.png',    w: 1672, h: 941 },
  slingshotIdle:  { src: 'assets/stage2/slingshot/slingshot-idle.png', w: 1024, h: 1024 },
  targetNormal:   { src: 'assets/stage2/targets/target-normal.png',    w: 1536, h: 1024 },
  targetHot:      { src: 'assets/stage2/targets/target-hot.png',       w: 1536, h: 1024 },
  targetGold:     { src: 'assets/stage2/targets/target-gold.png',      w: 1536, h: 1024 },
  zzzSmall:       { src: 'assets/stage2/sleep/zzz-small.png',          w: 1024, h: 1024 },
  zzzMedium:      { src: 'assets/stage2/sleep/zzz-medium.png',         w: 1024, h: 1024 },
  zzzLarge:       { src: 'assets/stage2/sleep/zzz-large.png',          w: 1024, h: 1024 },
};

function loadStage2Assets() {
  const results = {};
  const promises = Object.entries(STAGE2_MANIFEST).map(([key, def]) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { results[key] = { img, ok: true };        resolve(); };
      img.onerror = () => { results[key] = { img: null, ok: false }; resolve(); };
      img.src = def.src;
    })
  );
  return Promise.all(promises).then(() => results);
}
