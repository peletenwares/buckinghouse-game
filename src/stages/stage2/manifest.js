'use strict';

// Manifiesto de assets de la Stage 2 Commute — GENERADO automáticamente.
// Cada frame es un content-box real {sx,sy,sw,sh} recortado de la hoja.
// refH/refW = dimensión de contenido de referencia (para escalar preservando aspecto).
// anchor: "feet" (pies=abajo-centro) | "center".
const S2_MANIFEST = {

  // ── Fondos (imagen única) ─────────────────────────────────────
  bgApartment: { src: 'assets/stage2-commute/backgrounds/01-escenario-inicio.png', w: 2084, h: 755, kind: 'bg' },
  bgCrossing: { src: 'assets/stage2-commute/backgrounds/sprite-cruce.png', w: 2084, h: 755, kind: 'bg' },
  bgMetro: { src: 'assets/stage2-commute/backgrounds/02-escenario.png', w: 2084, h: 755, kind: 'bg' },
  bgBusStop: { src: 'assets/stage2-commute/backgrounds/03-escenario.png', w: 2084, h: 755, kind: 'bg' },
  bgClinic: { src: 'assets/stage2-commute/backgrounds/04-escenario-fin.png', w: 2084, h: 755, kind: 'bg' },

  // ── Sprites (content-box por frame) ───────────────────────────
  playerWalk: { src: 'assets/stage2-commute/player/01-personaje-principal-sprites.png', w: 1024, h: 1536, cols: 5, rows: 3, anchor: 'feet', refH: 381, refW: 205,
    frames: [{sx:3,sy:42,sw:202,sh:381}, {sx:205,sy:45,sw:205,sh:377}, {sx:410,sy:45,sw:204,sh:378}, {sx:614,sy:45,sw:205,sh:377}, {sx:819,sy:45,sw:123,sh:377}] },
  playerRun: { src: 'assets/stage2-commute/player/01-personaje-principal-sprites.png', w: 1024, h: 1536, cols: 5, rows: 3, anchor: 'feet', refH: 361, refW: 205,
    frames: [{sx:3,sy:495,sw:202,sh:361}, {sx:205,sy:495,sw:205,sh:348}, {sx:410,sy:496,sw:204,sh:347}, {sx:614,sy:496,sw:205,sh:346}, {sx:819,sy:495,sw:149,sh:348}, {sx:2,sy:931,sw:203,sh:329}, {sx:205,sy:929,sw:205,sh:318}, {sx:410,sy:945,sw:204,sh:301}, {sx:614,sy:926,sw:205,sh:320}] },
  playerIdle: { src: 'assets/stage2-commute/player/03-personaje-principal-sprites.png', w: 1536, h: 1024, cols: 4, rows: 1, anchor: 'feet', refH: 426, refW: 384,
    frames: [{sx:97,sy:330,sw:196,sh:426}, {sx:426,sy:330,sw:342,sh:426}, {sx:768,sy:329,sw:384,sh:426}, {sx:1152,sy:329,sw:125,sh:426}] },
  playerJump: { src: 'assets/stage2-commute/player/04-personaje-principal-sprites.png', w: 1536, h: 1024, cols: 5, rows: 1, anchor: 'feet', refH: 319, refW: 301,
    frames: [{sx:167,sy:435,sw:140,sh:202}, {sx:307,sy:357,sw:297,sh:246}, {sx:678,sy:276,sw:158,sh:233}, {sx:928,sy:315,sw:301,sh:319}, {sx:1229,sy:380,sw:104,sh:251}] },
  playerHurt: { src: 'assets/stage2-commute/player/05-personaje-principal-sprites.png', w: 1536, h: 1024, cols: 4, rows: 1, anchor: 'feet', refH: 373, refW: 263,
    frames: [{sx:93,sy:354,sw:263,sh:317}, {sx:400,sy:330,sw:240,sh:338}, {sx:777,sy:297,sw:210,sh:373}, {sx:1153,sy:350,sw:204,sh:321}] },
  playerBip: { src: 'assets/stage2-commute/player/06-personaje-principal-sprites.png', w: 1536, h: 1024, cols: 4, rows: 1, anchor: 'feet', refH: 334, refW: 283,
    frames: [{sx:124,sy:356,sw:192,sh:333}, {sx:426,sy:356,sw:283,sh:333}, {sx:768,sy:356,sw:267,sh:333}, {sx:1178,sy:355,sw:178,sh:334}] },
  playerWin: { src: 'assets/stage2-commute/player/07-personaje-principal-sprites.png', w: 1536, h: 1024, cols: 4, rows: 1, anchor: 'feet', refH: 448, refW: 371,
    frames: [{sx:152,sy:305,sw:214,sh:428}, {sx:469,sy:285,sw:244,sh:448}, {sx:781,sy:311,sw:371,sh:422}, {sx:1152,sy:312,sw:179,sh:420}] },
  playerLose: { src: 'assets/stage2-commute/player/08-personaje-principal-sprites.png', w: 1536, h: 1024, cols: 4, rows: 1, anchor: 'feet', refH: 364, refW: 384,
    frames: [{sx:117,sy:344,sw:232,sh:358}, {sx:413,sy:344,sw:355,sh:359}, {sx:768,sy:339,sw:384,sh:364}, {sx:1152,sy:344,sw:186,sh:358}] },
  singerMale: { src: 'assets/stage2-commute/npc/sprite-cantante-callejero.png', w: 1536, h: 1024, cols: 6, rows: 1, anchor: 'feet', refH: 339, refW: 256,
    frames: [{sx:64,sy:357,sw:192,sh:338}, {sx:256,sy:357,sw:256,sh:339}, {sx:512,sy:358,sw:256,sh:337}, {sx:768,sy:359,sw:256,sh:336}, {sx:1024,sy:369,sw:256,sh:326}, {sx:1280,sy:358,sw:235,sh:337}] },
  singerFemale: { src: 'assets/stage2-commute/npc/sprite-cantante-callejero-femenino.png', w: 1536, h: 1024, cols: 6, rows: 1, anchor: 'feet', refH: 339, refW: 256,
    frames: [{sx:53,sy:343,sw:203,sh:339}, {sx:256,sy:343,sw:256,sh:339}, {sx:512,sy:345,sw:256,sh:337}, {sx:768,sy:344,sw:256,sh:338}, {sx:1024,sy:344,sw:227,sh:338}, {sx:1308,sy:344,sw:174,sh:339}] },
  pedestrian: { src: 'assets/stage2-commute/npc/sprites-peaton-lento.png', w: 1536, h: 1024, cols: 6, rows: 1, anchor: 'feet', refH: 401, refW: 256,
    frames: [{sx:75,sy:291,sw:181,sh:399}, {sx:256,sy:291,sw:256,sh:400}, {sx:512,sy:290,sw:256,sh:401}, {sx:768,sy:290,sw:241,sh:401}, {sx:1044,sy:291,sw:236,sh:400}, {sx:1280,sy:290,sw:223,sh:401}] },
  vendor: { src: 'assets/stage2-commute/npc/sprites-vendedor.png', w: 1024, h: 1536, cols: 4, rows: 3, anchor: 'feet', refH: 304, refW: 244,
    frames: [{sx:42,sy:52,sw:214,sh:304}, {sx:256,sy:52,sw:244,sh:303}, {sx:541,sy:52,sw:209,sh:303}, {sx:779,sy:52,sw:217,sh:303}] },
  velociraptor: { src: 'assets/stage2-commute/npc/sprites-velociraptors.png', w: 1024, h: 1536, cols: 4, rows: 4, anchor: 'feet', refH: 269, refW: 256,
    frames: [{sx:23,sy:46,sw:233,sh:269}, {sx:256,sy:48,sw:256,sh:267}, {sx:512,sy:48,sw:256,sh:267}, {sx:768,sy:49,sw:208,sh:266}, {sx:29,sy:398,sw:227,sh:254}, {sx:256,sy:397,sw:256,sh:255}, {sx:512,sy:396,sw:256,sh:256}, {sx:768,sy:396,sw:213,sh:255}, {sx:31,sy:730,sw:225,sh:258}, {sx:256,sy:731,sw:256,sh:256}, {sx:512,sy:733,sw:256,sh:255}, {sx:768,sy:731,sw:216,sh:257}, {sx:29,sy:1070,sw:227,sh:252}, {sx:256,sy:1070,sw:256,sh:252}, {sx:512,sy:1069,sw:256,sh:253}, {sx:768,sy:1068,sw:208,sh:254}] },
  velociraptor2: { src: 'assets/stage2-commute/npc/sprites-velociraptors-02.png', w: 1536, h: 1024, cols: 6, rows: 1, anchor: 'feet', refH: 226, refW: 256,
    frames: [{sx:0,sy:386,sw:256,sh:224}, {sx:256,sy:386,sw:256,sh:223}, {sx:512,sy:384,sw:256,sh:226}, {sx:768,sy:386,sw:256,sh:224}, {sx:1024,sy:385,sw:256,sh:225}, {sx:1280,sy:386,sw:192,sh:223}] },
  bipCredit: { src: 'assets/stage2-commute/items/01-saldo-bip.png', w: 1536, h: 1024, cols: 3, rows: 1, anchor: 'center', refH: 266, refW: 366,
    frames: [{sx:107,sy:364,sw:351,sh:242}, {sx:576,sy:340,sw:366,sh:266}, {sx:1060,sy:364,sw:358,sh:242}] },
  headphones: { src: 'assets/stage2-commute/items/sprite-audifonos.png', w: 1024, h: 1024, cols: 1, rows: 1, anchor: 'center', refH: 643, refW: 700,
    frames: [{sx:162,sy:151,sw:700,sh:643}] },
  bonusClock: { src: 'assets/stage2-commute/items/sprite-reloj-bonus.png', w: 1024, h: 1024, cols: 1, rows: 1, anchor: 'center', refH: 647, refW: 575,
    frames: [{sx:225,sy:145,sw:575,sh:647}] },
  fx: { src: 'assets/stage2-commute/fx/hoja-fx-2d.png', w: 1024, h: 1024, cols: 3, rows: 2, anchor: 'center', refH: 221, refW: 268,
    frames: [{sx:55,sy:255,sw:268,sh:100}, {sx:359,sy:170,sw:265,sh:221}, {sx:703,sy:201,sw:240,sh:151}, {sx:62,sy:647,sw:222,sh:103}, {sx:396,sy:656,sw:253,sh:122}, {sx:734,sy:571,sw:224,sh:217}] },
  barrierProp: { src: 'assets/stage2-commute/props/sprite-barrera-obra.png', w: 1536, h: 1024, cols: 1, rows: 1, anchor: 'feet', refH: 517, refW: 1008,
    frames: [{sx:264,sy:204,sw:1008,sh:517}] },
  busstopProp: { src: 'assets/stage2-commute/props/sprite-paradero.png', w: 1536, h: 1024, cols: 1, rows: 1, anchor: 'feet', refH: 842, refW: 335,
    frames: [{sx:579,sy:81,sw:335,sh:842}] },
  platWide: { src: 'assets/stage2-commute/props/sprite-plataforma-ancha.png', w: 1536, h: 1024, cols: 1, rows: 1, anchor: 'feet', refH: 414, refW: 1365,
    frames: [{sx:85,sy:266,sw:1365,sh:414}] },
  platRest: { src: 'assets/stage2-commute/props/sprite-plataforma-descanso.png', w: 1024, h: 1024, cols: 1, rows: 1, anchor: 'feet', refH: 347, refW: 816,
    frames: [{sx:104,sy:337,sw:816,sh:347}] },
  platMed: { src: 'assets/stage2-commute/props/sprite-plataforma-mediana.png', w: 1536, h: 1024, cols: 1, rows: 1, anchor: 'feet', refH: 349, refW: 1097,
    frames: [{sx:219,sy:323,sw:1097,sh:349}] },
  platSmall: { src: 'assets/stage2-commute/props/sprite-plataforma-pequeña.png', w: 1536, h: 1024, cols: 1, rows: 1, anchor: 'feet', refH: 162, refW: 796,
    frames: [{sx:369,sy:417,sw:796,sh:162}] },
  turnstile: { src: 'assets/stage2-commute/props/sprite-torniquete.png', w: 1536, h: 1024, cols: 5, rows: 1, anchor: 'feet', refH: 258, refW: 308,
    frames: [{sx:48,sy:367,sw:259,sh:258}, {sx:307,sy:367,sw:307,sh:258}, {sx:614,sy:367,sw:308,sh:258}, {sx:922,sy:367,sw:307,sh:258}, {sx:1229,sy:368,sw:269,sh:258}] },
  validator: { src: 'assets/stage2-commute/props/sprite-validador.png', w: 1024, h: 1024, cols: 1, rows: 1, anchor: 'feet', refH: 557, refW: 446,
    frames: [{sx:290,sy:201,sw:446,sh:557}] },
  micro: { src: 'assets/stage2-commute/vehicles/sprites-micro.png', w: 1024, h: 1536, cols: 2, rows: 4, anchor: 'feet', refH: 202, refW: 466,
    frames: [{sx:34,sy:55,sw:466,sh:202}, {sx:528,sy:57,sw:464,sh:201}] },
  metro: { src: 'assets/stage2-commute/vehicles/sprites-metro.png', w: 1024, h: 1536, cols: 1, rows: 1, anchor: 'feet', refH: 218, refW: 976,
    frames: [{sx:22,sy:788,sw:976,sh:218}] },
  autos: { src: 'assets/stage2-commute/vehicles/sprites-autos.png', w: 1024, h: 1536, cols: 2, rows: 5, anchor: 'feet', refH: 144, refW: 439,
    frames: [{sx:74,sy:164,sw:350,sh:143}, {sx:517,sy:177,sw:403,sh:129}, {sx:71,sy:404,sw:393,sh:141}, {sx:522,sy:401,sw:438,sh:144}, {sx:69,sy:651,sw:379,sh:135}, {sx:530,sy:657,sw:409,sh:129}, {sx:68,sy:891,sw:373,sh:141}, {sx:529,sy:896,sw:427,sh:136}, {sx:67,sy:1148,sw:421,sh:134}, {sx:529,sy:1145,sw:439,sh:137}] },
};


// Carga todos los assets. Resuelve aunque alguno falle.
function loadS2Assets() {
  var results = {};
  var promises = Object.keys(S2_MANIFEST).map(function(key) {
    return new Promise(function(resolve) {
      var def = S2_MANIFEST[key];
      var img = new Image();
      img.onload  = function() { results[key] = { img: img, ok: true,  src: def.src }; resolve(); };
      img.onerror = function() {
        results[key] = { img: null, ok: false, src: def.src };
        console.error('[Stage2] Asset no cargo:', def.src);
        resolve();
      };
      img.src = def.src;
    });
  });
  return Promise.all(promises).then(function() { return results; });
}
