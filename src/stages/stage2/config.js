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

  // Cronómetro — presupuesto TOTAL de la etapa: 60 s (1:00).
  // Regla dura: nunca aumenta. No hay bonos de tiempo de ningún tipo.
  // El cronómetro solo baja; los checkpoints guardan progreso, no suman tiempo.
  timer: {
    start:  60,   // HUD inicia en 1:00
    max:    60,   // techo duro: el cronómetro jamás supera este valor
  },

  // Escenas — worldW y groundY.
  // worldW ≤ bg.scaledW (1988) para que el fondo cubra 1:1 sin repetir ni costuras.
  // groundY = línea de pies alineada con la vereda/suelo real de cada fondo.
  scenes: {
    APARTMENT_RUN:           { worldW: 1980, groundY: 615 },
    MOVING_PLATFORM_CROSSING:{ worldW: 1980, groundY: 600 },
    SANTA_LUCIA_LANES:       { worldW: 1980, groundY: 608 },
    METRO_GATE:              { worldW:  800, groundY: 600 },
    BUS_STOP:                { worldW: 1980, groundY: 560 },
    CLINIC_RUN:              { worldW: 1980, groundY: 600 },
  },

  // Balance y distribución de obstáculos por escena (centralizado).
  balance: {
    apartmentPedestrianCount: [3, 5],  // obstáculo principal del piso
    apartmentVendorMax:       1,
    busStopPedestrianCount:   [4, 6],
    busStopVelociraptorCount: [2, 4],
    busStopVendorMax:         1,
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
    required: 5,        // objetivo visible del HUD
    bonusScore: 100,    // puntos por cada Bip extra (SIN efecto en el cronómetro)
  },
  bonusClock: {
    renderH: 54,
    hitW: 44, hitH: 44, hitOX: 4, hitOY: 4,
    fps: 4,
    score: 200,         // coleccionable de puntuación; NO afecta el cronómetro
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

  // Transiciones cinematográficas (usan el mismo cronómetro global; no lo pausan).
  // Acortadas para el presupuesto de 60 s.
  metroTransition: {
    duration:  2.2,
    skipDelay: 0.8,
  },
  busTransition: {
    duration: 2.2,
  },

  // Metro gate
  metroGate: {
    playerTargetX: 200,    // X donde se detiene la jugadora frente al validador
    bipAnimDuration: 2.2,  // s de la animación completa
    turnstileOpenDelay: 1.6,
    doorOpenDelay: 1.8,
  },

  // Bus stop
  busStop: {
    // La PRIMERA micro está presente al entrar con la puerta abierta y espera
    // sólo firstBusWaitSeconds (reflejo). Las siguientes esperan doorOpenTime.
    firstBusWaitSeconds: 2.5, // s abierta la primera micro (ventana justa para abordar)
    doorOpenTime:     6.0,   // s abierta desde la 2ª micro en adelante
    nextBusDelay:     5.0,   // s hasta la siguiente micro tras perder una (penaliza el reloj global)
    microDepartX:    2200,   // X donde sale la micro
    microSpeedDepart: 320,
    firstMicroX:      700,   // X de la primera micro (ya presente)
  },

  // Victoria — estrellas (según segundos restantes; presupuesto total 60 s).
  stars: {
    three: 15,   // terminar con ≥15 s restantes (run limpio y veloz)
    two:    5,
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
