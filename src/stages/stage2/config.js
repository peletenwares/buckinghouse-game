'use strict';

// Todos los valores configurables de la Stage 2 Commute.
const S2C = {
  W: 1280, H: 720,
  dtMax: 0.05,

  // Física
  gravity:    900,   // px/s²
  jumpSpeed:  510,   // px/s hacia arriba
  moveSpeed:  260,   // px/s horizontal normal
  friction:   0.18,  // factor de deceleración cuando no hay input (por frame dt)

  // Coyote time y jump buffer
  coyoteTime:  0.10, // s tras dejar plataforma en que aún puede saltar
  jumpBuffer:  0.12, // s antes de aterrizar en que el salto se encola

  // Jugador — render
  player: {
    fw: 512, fh: 512,      // tamaño de frame en spritesheet
    renderH: 96,            // altura renderizada en canvas
    get renderW() { return this.renderH; }, // frame cuadrado
    hitW: 38,               // ancho del hitbox
    hitH: 82,               // alto del hitbox
    hitOX: 29,              // offset X desde esquina del frame al hitbox (centrado)
    hitOY: 14,              // offset Y desde esquina del frame al hitbox
    invulDuration: 1.5,     // s de invulnerabilidad tras daño
    stunDuration:  0.8,     // s de aturdimiento por vendedor
  },

  // Cámara
  camera: {
    leadX:    380,  // mantener jugador a esta distancia del borde izq
    smoothing: 7,   // velocidad de seguimiento (mayor = más tenso)
  },

  // Cronómetro
  timer: {
    start:         150,
    minCheckpoint:  10,  // tiempo mínimo garantizado al restaurar checkpoint
  },

  // Escenas — worldW y groundY
  scenes: {
    APARTMENT_RUN:           { worldW: 3700, groundY: 558 },
    MOVING_PLATFORM_CROSSING:{ worldW: 2100, groundY: 558 },
    SANTA_LUCIA_LANES:       { worldW: 3200, groundY: 558 },
    METRO_GATE:              { worldW:  600, groundY: 558 },
    BUS_STOP:                { worldW: 1400, groundY: 558 },
    CLINIC_RUN:              { worldW: 1900, groundY: 558 },
  },

  // Background (todos 2084×755)
  bg: {
    srcW: 2084, srcH: 755,
    get scaledW() { return Math.round(this.srcW * (S2C.H / this.srcH)); },
    get scaledH() { return S2C.H; },
  },

  // NPC — vendedor
  vendor: {
    fw: 512, fh: 512, cols: 2, rows: 3, totalFrames: 6,
    renderH: 90,
    hitW: 36, hitH: 78, hitOX: 27, hitOY: 12,
    fps: 3,
    stunDuration: 0.8,
    timePenalty:  2,
    cooldown:     2.5,
  },

  // NPC — peatón lento
  pedestrian: {
    fw: 512, fh: 512, cols: 3, rows: 2, totalFrames: 6,
    renderH: 90,
    hitW: 32, hitH: 76, hitOX: 29, hitOY: 14,
    fps: 5,
    speed: 75,  // px/s (misma dirección que jugadora)
  },

  // NPC — velociraptor
  velociraptor: {
    fw: 512, fh: 512, cols: 2, rows: 3, totalFrames: 6,
    renderH: 78,
    hitW: 52, hitH: 64, hitOX: 13, hitOY: 14,
    fps: 10,
    speed:        220,   // px/s hacia la izquierda
    pushback:     150,   // px que retrocede el jugador
    stunDuration: 0.5,
    timePenalty:  3,
    cooldown:     3,
    invulDuration:1.5,
  },

  // NPC — cantante
  singer: {
    fw: 512, fh: 512, cols: 3, rows: 2, totalFrames: 6,
    renderH: 90,
    hitW: 34, hitH: 76, hitOX: 28, hitOY: 14,
    fps: 4,
    influenceW: 280,  // ancho de la zona de lentificación
    speedFactor: 0.60,
  },

  // Ítems
  bipCredit: {
    fw: 512, fh: 512, cols: 3, rows: 2, totalFrames: 6,
    renderH: 44,
    hitW: 36, hitH: 36, hitOX: 4, hitOY: 4,
    fps: 4,
    required: 5,
  },
  bonusClock: {
    fw: 512, fh: 512, cols: 2, rows: 2, totalFrames: 4,
    renderH: 44,
    hitW: 36, hitH: 36, hitOX: 4, hitOY: 4,
    fps: 4,
    timeBonus: 5,
  },
  headphones: {
    fw: 512, fh: 512, cols: 2, rows: 2, totalFrames: 4,
    renderH: 40,
    hitW: 32, hitH: 32, hitOX: 4, hitOY: 4,
    fps: 3,
    duration: 8,
  },

  // FX — notas musicales
  fx: {
    fw: 256, fh: 256, cols: 4, rows: 4,
    noteFrames: [0, 1, 2, 3],   // índices de notas en la hoja
    renderH: 28,
  },

  // Plataformas
  platform: {
    h: 22,  // grosor lógico del hitbox
  },

  // Plataformas móviles
  movingPlatform: {
    defaultSpeed: 90,
  },

  // Caída
  fall: {
    timePenalty:   5,
    invulDuration: 1.5,
    fallThreshold: 680,  // jugadora por debajo de esta Y = caída
  },

  // Transiciones cinematográficas
  metroTransition: {
    duration:  3.5,
    skipDelay: 1.0,
  },
  busTransition: {
    duration: 3.0,
  },

  // Metro gate
  metroGate: {
    playerTargetX: 200,    // X donde se detiene la jugadora frente al validador
    bipAnimDuration: 2.2,  // s de la animación completa
    turnstileOpenDelay: 1.6,
    doorOpenDelay: 1.8,
    bonus: 15,
  },

  // Bus stop
  busStop: {
    microArrivalTime: 3.5,   // s tras entrar en la escena
    doorOpenTime:     8.0,   // s con la puerta abierta
    microDepartX:    1300,   // X donde sale la micro
    microSpeedDepart: 300,
    missWaitTime:     5.0,   // s hasta la siguiente micro
    bonus: 12,
  },

  // Checkpoints — bonus por escena
  checkpointBonus: {
    APARTMENT_RUN:            15,
    MOVING_PLATFORM_CROSSING: 20,
    METRO_GATE:               15,
    BUS_STOP:                 12,
  },

  // Victoria — estrellas
  stars: {
    three: 25,
    two:   10,
  },

  // HUD
  hud: {
    barH:     52,
    fontSm:   'bold 16px "Nunito", system-ui, sans-serif',
    fontMd:   'bold 20px "Nunito", system-ui, sans-serif',
    fontLg:   'bold 28px "Nunito", system-ui, sans-serif',
    colorBg:  'rgba(18,14,24,0.80)',
    colorText:'#ffffff',
    colorWarn:'#ff6b6b',
    colorOk:  '#6bff9e',
  },

  // Carriles de Santa Lucía (Y de los pies del personaje)
  lanes: {
    y: [308, 438, 558],  // top, center, bottom
    transitionSpeed: 600, // px/s de transición suave entre carriles
    jumpH: 120,           // altura de salto dentro de un carril
    defaultLane: 1,       // carril inicial (center)
  },

  // Santa Lucía — patrones de velociraptores
  luciaPatterns: [
    { raptors: [{ lane: 1 }] },
    { raptors: [{ lane: 0 }] },
    { raptors: [{ lane: 2 }] },
    { raptors: [{ lane: 0 }, { lane: 2 }] },
    { raptors: [{ lane: 1 }, { lane: 2 }] },
    { raptors: [{ lane: 0 }, { lane: 1 }] },
  ],

  // Debug
  debugHotkey: true,  // teclas de dev solo si ?debug=1
};
