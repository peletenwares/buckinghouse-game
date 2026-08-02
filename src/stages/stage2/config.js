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

  // Jugador — render (content-box, x=centro, y=pies)
  player: {
    renderH: 150,           // altura visual del personaje en canvas
    hitW: 46,               // ancho del hitbox (centrado en x)
    hitH: 120,              // alto del hitbox (desde los pies hacia arriba)
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

  // Escenas — worldW y groundY.
  // worldW ≤ bg.scaledW (1988) para que el fondo cubra 1:1 sin repetir ni costuras.
  // groundY = línea de pies alineada con la vereda/suelo real de cada fondo.
  scenes: {
    APARTMENT_RUN:           { worldW: 1980, groundY: 615 },
    MOVING_PLATFORM_CROSSING:{ worldW: 1980, groundY: 600 },
    SANTA_LUCIA_LANES:       { worldW: 1980, groundY: 608 },
    METRO_GATE:              { worldW:  600, groundY: 600 },
    BUS_STOP:                { worldW: 1980, groundY: 560 },
    CLINIC_RUN:              { worldW: 1980, groundY: 600 },
  },

  // Background (todos 2084×755)
  bg: {
    srcW: 2084, srcH: 755,
    get scaledW() { return Math.round(this.srcW * (S2C.H / this.srcH)); },
    get scaledH() { return S2C.H; },
  },

  // NPC — vendedor (renderH = alto visual; hitbox relativo a x,y con y=groundY-renderH)
  vendor: {
    renderH: 140,
    hitW: 50, hitH: 120, hitOX: 45, hitOY: 20,
    fps: 4,
    stunDuration: 0.8,
    timePenalty:  2,
    cooldown:     2.5,
  },

  // NPC — peatón lento
  pedestrian: {
    renderH: 140,
    hitW: 44, hitH: 120, hitOX: 48, hitOY: 20,
    fps: 6,
    speed: 75,  // px/s (misma dirección que jugadora)
  },

  // NPC — velociraptor (abuela apurada)
  velociraptor: {
    renderH: 122,
    hitW: 70, hitH: 96, hitOX: 26, hitOY: 26,
    fps: 12,
    speed:        220,   // px/s hacia la izquierda
    pushback:     150,   // px que retrocede el jugador
    stunDuration: 0.5,
    timePenalty:  3,
    cooldown:     3,
    invulDuration:1.5,
  },

  // NPC — cantante
  singer: {
    renderH: 140,
    fps: 4,
    influenceW: 280,  // ancho de la zona de lentificación
    speedFactor: 0.60,
  },

  // Ítems (draw ancla 'center' sobre el centro del hitbox)
  bipCredit: {
    renderH: 52,
    hitW: 44, hitH: 40, hitOX: 4, hitOY: 4,
    fps: 4,
    required: 5,     // objetivo visible del HUD
    bonusTime: 2,    // +s por cada Bip extra una vez alcanzado el objetivo
  },
  bonusClock: {
    renderH: 54,
    hitW: 44, hitH: 44, hitOX: 4, hitOY: 4,
    fps: 4,
    timeBonus: 5,
  },
  headphones: {
    renderH: 52,
    hitW: 44, hitH: 40, hitOX: 4, hitOY: 4,
    fps: 3,
    duration: 8,
  },

  // FX — icono de notas musicales (índice 3 en la hoja 3×2)
  fx: {
    noteFrames: [3],
    renderH: 34,
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

  // Carriles de Santa Lucía — apoyados en la vereda/plaza (Y de los pies).
  // 3 filas de profundidad sobre el suelo real; escala por profundidad.
  lanes: {
    y: [548, 578, 608],       // fondo (lejos) → frente (cerca)
    scale: [0.84, 0.92, 1.0], // escala visual por profundidad
    transitionSpeed: 520,     // px/s de transición suave entre carriles
    jumpH: 96,                // altura de salto dentro de un carril
    defaultLane: 1,           // carril inicial (central)
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
