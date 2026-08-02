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

## Spritesheets — mapeo real verificado (QA visual 2026-08-02)

Las hojas son arte generado con layout **irregular** (frames no cuadrados,
personajes que se tocan, padding interno, filas con espaciado variable). **No**
son grillas uniformes 512×512. Por eso `manifest.js` almacena, por cada frame,
un **content-box** real `{sx,sy,sw,sh}` recortado ajustado al contenido, más
`refH`/`refW` (referencia para escalar preservando aspecto) y `anchor`
(`feet` = pies abajo-centro, `center` = centrado). El manifest se genera con un
analizador de canal alfa que detecta las bandas de fila reales antes de recortar,
evitando incluir la cabeza del personaje de la fila vecina.

| Asset | Archivo | Dim | Grilla real | Frames usados | Contenido | Anclaje |
|-------|---------|-----|-------------|---------------|-----------|---------|
| Fondos ×5 | backgrounds/*.png | 2084×755 | imagen única | 1 | escenarios | — |
| playerWalk | player/01 | 1024×1536 | 5×3 | 5 (fila 0) | caminar | pies |
| playerRun | player/01 | 1024×1536 | 5×3 | 9 (filas 1–2) | correr | pies |
| playerIdle | player/03 | 1536×1024 | 4×1 | 4 | reposo | pies |
| playerJump | player/04 | 1536×1024 | 5×1 | 5 | salto/impulso | pies |
| playerHurt | player/05 | 1536×1024 | 4×1 | 4 | golpe (estrellas) | pies |
| playerBip | player/06 | 1536×1024 | 4×1 | 4 | validar tarjeta | pies |
| playerWin | player/07 | 1536×1024 | 4×1 | 4 | celebración | pies |
| playerLose | player/08 | 1536×1024 | 4×1 | 4 | derrota | pies |
| singerMale | npc/sprite-cantante-callejero | 1536×1024 | 6×1 | 6 | cantante + parlante | pies |
| singerFemale | npc/…-femenino | 1536×1024 | 6×1 | 6 | cantante | pies |
| pedestrian | npc/sprites-peaton-lento | 1536×1024 | 6×1 | 6 | peatón | pies |
| vendor | npc/sprites-vendedor | 1024×1536 | 4×3 | 4 (fila 0) | vendedor con carrito | pies |
| velociraptor | npc/sprites-velociraptors | 1024×1536 | 4×4 | 16 | abuela apurada | pies |
| velociraptor2 | npc/sprites-velociraptors-02 | 1536×1024 | 6×1 | 6 | abuela (variante) | pies |
| bipCredit | items/01-saldo-bip | 1536×1024 | 3×1 | 3 | tarjeta "SALDO Bip" | centro |
| bonusClock | items/sprite-reloj-bonus | 1024×1024 | 1×1 | 1 | cronómetro | centro |
| headphones | items/sprite-audifonos | 1024×1024 | 1×1 | 1 | audífonos | centro |
| fx | fx/hoja-fx-2d | 1024×1024 | 3×2 | 6 iconos | 0 polvo · 1 destello · 2 estrellas · 3 notas · 4 impacto · 5 cristal | centro |
| barrierProp | props/sprite-barrera-obra | 1536×1024 | 1×1 | 1 | barrera de obra | pies |
| busstopProp | props/sprite-paradero | 1536×1024 | 1×1 | 1 | paradero | pies |
| platWide | props/sprite-plataforma-ancha | 1536×1024 | 1×1 | 1 | plataforma | superficie |
| platMed | props/…-mediana | 1536×1024 | 1×1 | 1 | plataforma | superficie |
| platSmall | props/…-pequeña | 1536×1024 | 1×1 | 1 | plataforma | superficie |
| platRest | props/…-descanso | 1024×1024 | 1×1 | 1 | plataforma descanso | superficie |
| turnstile | props/sprite-torniquete | 1536×1024 | 5×1 | 5 | cerrado(rojo)→abierto | pies |
| validator | props/sprite-validador | 1024×1024 | 1×1 | 1 | validador Bip | pies |
| micro | vehicles/sprites-micro | 1024×1536 | 2×4 | 2 (0 puerta cerrada, 1 abierta) | micro | pies |
| metro | vehicles/sprites-metro | 1024×1536 | box explícito | 1 | tren 2 vagones | pies |
| autos | vehicles/sprites-autos | 1024×1536 | 2×5 | 10 (1 fijo por instancia) | autos | pies |

El notas-FX del cantante usa el ícono índice 3 (`S2C.fx.noteFrames`).
La hoja `npc/sprites-cantantes.png` existe pero no se usa (variantes duplicadas).

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
