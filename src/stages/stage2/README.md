# Stage 2 — El Trayecto (Commute)

La protagonista debe llegar desde Carmen 121 hasta la clínica usando el Metro Santa Lucía y un micro.

## Flujo de escenas

```
INTRO
→ APARTMENT_RUN       (Carmen 121 — recoger ≥5 saldos Bip)
→ MOVING_PLATFORM_CROSSING  (cruce de plataformas móviles)
→ SANTA_LUCIA_LANES   (3 carriles hacia el metro)
→ METRO_GATE          (cutscene validación Bip + torniquete)
→ METRO_TRANSITION    (cinemática ~3.5s)
→ BUS_STOP            (alcanzar la micro)
→ BUS_TRANSITION      (cinemática ~3s)
→ CLINIC_RUN          (llegar a la entrada de la clínica)
→ COMPLETE / FAILED
```

Desde cualquier escena: `timer ≤ 0 → FAILED`.

## Arquitectura de archivos

```
src/stages/stage2/
  config.js    — S2C: todas las constantes configurables
  manifest.js  — S2_MANIFEST: rutas y grillas de sprites + loadS2Assets()
  input.js     — S2Input: teclado + botones táctiles dinámicos
  player.js    — makeS2Player(): física, animación, hitbox
  entities.js  — fábricas: NPCs, ítems, plataformas, vehículos
  scenes.js    — makeSceneManager() + todas las escenas
  stage2.js    — IIFE: game loop, HUD, API pública
  README.md    — este archivo
```

## API pública

```javascript
Stage2.start()    // Carga assets e inicia; devuelve Promise
Stage2.stop()     // Cancela RAF, limpia listeners y canvas
Stage2.restart()  // Reinicia el estado de juego sin recargar
Stage2.resize()   // Reajusta el canvas al tamaño de pantalla
Stage2.devStart() // Igual que start() pero standalone (sin Stage1)
```

## Controles

| Acción | Teclado | Táctil |
|--------|---------|--------|
| Mover | ◀ ▶ / A D | Botones ◀ ▶ |
| Saltar | Espacio / ArrowUp / W | Botón ⤒ |
| Cambiar carril (Santa Lucía) | ▲ ▼ | Botones ▲ ▼ (aparecen solo en esa escena) |
| Pausar / reiniciar | Escape / P | — |

## Escenas detalladas

### APARTMENT_RUN
- Fondo: `bgApartment` (01-escenario-inicio.png)
- Coleccionar ≥ 5 de los 7 saldos Bip disponibles
- Entidades: vendedor (−2s), peatón lento (bloqueo), velociraptor (−3s, empuje)
- Al completar: +15s, checkpoint

### MOVING_PLATFORM_CROSSING
- Fondo: `bgCrossing` (sprite-cruce.png)
- 3 plataformas móviles + 2 fijas
- Caída: −5s, respawn en último punto seguro
- Al completar: +20s

### SANTA_LUCIA_LANES
- Fondo: `bgMetro` (02-escenario.png)
- 3 carriles verticales (Y: 308, 438, 558 px)
- Arriba/Abajo cambia carril suavemente
- Cantantes crean zona de lentificación × 0.6
- Audífonos neutralizan lentificación por 8s
- Patrones de velociraptores garantizan siempre un carril libre

### METRO_GATE
- Cutscene: jugadora camina al validador, usa Bip, torniquete se abre
- +15s al pasar

### METRO_TRANSITION / BUS_TRANSITION
- Cinemáticas de ~3-4s, saltables con Espacio tras 1s

### BUS_STOP
- Fondo: `bgBusStop` (03-escenario.png)
- Micro llega en 3.5s, puerta abierta 8s
- Perder la micro: esperar 5s sin reiniciar la escena
- Al subir: +12s

### CLINIC_RUN
- Fondo: `bgClinic` (04-escenario-fin.png)
- Llegar a la entrada marca la victoria

## Configuración

Todos los valores están en `config.js` bajo `S2C`:
- `S2C.timer.start`: 150s
- `S2C.bipCredit.required`: 5
- `S2C.checkpointBonus.*`: bonos por escena
- `S2C.lanes.y`: posiciones Y de los 3 carriles
- `S2C.busStop.doorOpenTime`: 8s
- etc.

## Spritesheets — análisis real (2026-08-02)

| Asset | Dimensiones | Grilla | Frames | Frame |
|-------|------------|--------|--------|-------|
| Fondos ×5 | 2084×755 | imagen única | 1 | — |
| playerWalk (01) | 1024×1536 | 2×3 | 6 | 512×512 |
| playerRun (02) | 1024×1536 | 2×3 | 6 | 512×512 |
| playerIdle (03) | 1536×1024 | 3×2 | 6 | 512×512 |
| playerJump (04) | 1536×1024 | 3×2 | 6 | 512×512 |
| playerHurt (05) | 1536×1024 | 3×2 | 6 | 512×512 |
| playerBip (06) | 1536×1024 | 3×2 | 6 | 512×512 |
| playerWin (07) | 1536×1024 | 3×2 | 6 | 512×512 |
| playerLose (08) | 1536×1024 | 3×2 | 6 | 512×512 |
| vendor | 1024×1536 | 2×3 | 6 | 512×512 |
| pedestrian | 1536×1024 | 3×2 | 6 | 512×512 |
| velociraptor | 1024×1536 | 2×3 | 6 | 512×512 |
| velociraptor2 | 1536×1024 | 3×2 | 6 | 512×512 |
| singerMale | 1536×1024 | 3×2 | 6 | 512×512 |
| singerFemale | 1536×1024 | 3×2 | 6 | 512×512 |
| bipCredit | 1536×1024 | 3×2 | 6 | 512×512 |
| bonusClock | 1024×1024 | 2×2 | 4 | 512×512 |
| headphones | 1024×1024 | 2×2 | 4 | 512×512 |
| fx | 1024×1024 | 4×4 | 16 | 256×256 |
| autos/metro/micro | 1024×1536 | 2×3 | 6 | 512×512 |
| platWide/Med/Small | 1536×1024 | 3×2 | 6 | 512×512 |
| platRest/validator | 1024×1024 | 2×2 | 4 | 512×512 |
| turnstile | 1536×1024 | 3×2 | 6 | 512×512 |
| barrierProp/busstopProp | 1536×1024 | 3×2 | 6 | 512×512 |

*Grilla inferida del tamaño: todos usan frame 512×512 o 256×256 (FX).
La asignación de secuencias a las hojas es tentativa y debe verificarse visualmente.*

## Debug

Añadir `?debug=1` a la URL muestra overlay con FPS, escena, estado, timer, etc.

Teclas de debug (solo con `?debug=1`):
- `]` — escena siguiente
- `=` — +15s al timer
- `-` — −15s al timer
- `N` — completar objetivo actual
- `I` — activar invulnerabilidad 30s

## Ejecución local

```bash
python -m http.server 5500
```

- Nueva Stage 2: `http://localhost:5500/stage2-dev.html`
- Nueva Stage 2 (debug): `http://localhost:5500/stage2-dev.html?debug=1`
- Galería de assets: `http://localhost:5500/debug-stage2.html`
- Stage 1 → Stage 2: `http://localhost:5500/`
- Stage 2 legacy (wake-up): `http://localhost:5500/stage2-legacy-wake-up.html`
- Debug legacy: `http://localhost:5500/debug-stage2-legacy-wake-up.html`

## Stage 2 anterior (wake-up — archivada)

La Stage 2 experimental de despertar personas está archivada en:

```
src/stages/stage2-legacy-wake-up/
  manifest.js  (STAGE2_MANIFEST + loadStage2Assets)
  stage2.js    (juego de resortera con relojes)
assets/stage2/ (intacta, no reutilizar)
stage2-legacy-wake-up.html
debug-stage2-legacy-wake-up.html
```

No forma parte del flujo productivo. Conservada íntegramente como referencia.
