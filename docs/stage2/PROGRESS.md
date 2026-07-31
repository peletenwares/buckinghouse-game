# Progreso etapa 2

## Fase actual

Fase 4 completada — Fase 5 (Dificultad progresiva) pendiente.

## Completado

### Fase 0 — Inspección del repositorio (2026-07-30)

**Arquitectura:**
- Motor: Vanilla JS + Canvas 2D, sin bundler, sin framework.
- Entry point único: `index.html` (1 628 líneas, monolítico).
- Resolución virtual: 1 280 × 720 px.
- Loop: `requestAnimationFrame` → `loop()` → `step()` + `draw()`.
- Despliegue: Vercel (sitio estático, sin build step).
- Dev server: `python -m http.server 5500`.

**Persistencia:** ninguna implementada — no hay localStorage ni similar.

**Tests:** ninguno automatizado — solo playtesting manual.

**Zonas críticas de Etapa 1 (no tocar):**
- `reset()` línea 316–339
- `step()` línea 873–906
- `draw()` línea 1 509–1 531
- `win()` línea 1 580–1 586 (punto de enlace futuro a Etapa 2)
- `#winScreen` HTML línea 153–157

**Directorios preparados pero vacíos:**
- `src/stages/stage2/` — código de Etapa 2 irá aquí
- `assets/stage2/` — assets de Etapa 2 irán aquí

**Estrategia de aislamiento aprobada:**
- Módulo: `src/stages/stage2/stage2.js`
- API: `Stage2.start()`, `Stage2.stop()`, `Stage2.devStart()`
- Persistencia: `localStorage['buckinghouse_progress']`
- Cambios a `index.html`: mínimos, solo en Fase 7

### Fase 1 — Validación de assets (2026-07-30)

**Archivos creados:**
- `src/stages/stage2/manifest.js` — manifiesto técnico con rutas, dimensiones y cuadrículas de los 11 assets.
- `debug-stage2.html` — galería debug standalone en la raíz; abre con `python -m http.server 5500`.

**Manifiesto de assets confirmado:**

| Clave | Ruta | Dimensiones | Cuadrícula | cellW | cellH |
|---|---|---|---|---|---|
| bgEmpty | backgrounds/living-room-empty.png | 1672×941 | — (imagen completa) | — | — |
| bgRef | backgrounds/living-room-reference.png | 1672×941 | — (solo referencia) | — | — |
| charShirtless | characters/sleeper-shirtless.png | 1536×1024 | 5×2 | 307.2 | 512 |
| charBlueShirt | characters/sleeper-blue-shirt.png | 1536×1024 | 4×2 | 384 | 512 |
| clocks | projectiles/alarm-clocks.png | 1536×1024 | 4×1 | 384 | 1024 |
| slingshot | projectiles/slingshot.png | 1536×1024 | 3×1 | 512 | 1024 |
| targets | targets/targets.png | 1536×1024 | 4×1 | 384 | 1024 |
| zzz | sleep/zzz.png | 1536×1024 | 4×3 | 384 | 341.33 |
| effects | fx/game-effects.png | 1536×1024 | 3×2 | 512 | 512 |
| hud | ui/hud.png | 1536×1024 | compuesto | — | — |
| messages | ui/result-messages.png | 1536×1024 | compuesto | — | — |

**Contenido visual confirmado:**
- `clocks`: rojo (0), azul (1), verde (2), dorado (3).
- `slingshot`: reposo (0), cargado (1), tensado/disparando (2). No estaba en ASSETS.md original.
- `targets`: frío/dorado (0), calentando (1), llameante (2), peligro-rojo con triángulo (3).
- `zzz`: 12 celdas (4×3); celda [fila 2, col 2] vacía; 11 variantes activas.
- `effects`: 6 frames, efectos de chispa/estrella dorada.
- `hud`: elementos UI dispersos (barras, timer, objetivos, pausa, estrellas, contador relojes).
- `messages`: 5 elementos (banner victoria, icono derrota, 2×Reintentar, Siguiente).
- Fondos: AR 1672/941 ≈ 16:9 idéntico al canvas — escala limpia a 1280×720 sin distorsión.

**Verificación:**
- 11/11 assets cargados sin 404.
- Cero errores de consola.
- Cada frame recortado individualmente; ninguna hoja completa visible como elemento jugable.
- Etapa 1 no modificada; sin regresiones.

### Fase 2 — Escena estática (2026-07-30) — commit e553a8f

**Archivos creados:**
- `src/stages/stage2/stage2.js` — módulo IIFE que expone `Stage2.devStart / start / stop`.
- `stage2-dev.html` — página dev standalone; carga manifest.js + stage2.js y llama `Stage2.devStart()`.

**Archivos modificados:**
- `src/stages/stage2/manifest.js` — extendido con 11 entradas nuevas: 4 escenas compuestas, 4 relojes individuales, 3 Zzz, 3 resorteras, 3 blancos individuales.

**Assets incorporados:**

| Grupo | Archivos | Dimensiones |
|---|---|---|
| Escenas compuestas | `scenes/scene-sleeping.png`, `scene-reacting-1.png`, `scene-reacting-2.png`, `scene-yawning.png` | 1672×941 RGB |
| Relojes | `projectiles/alarm-clock-red/blue/green/gold.png` | 1024×1024 RGBA |
| Zzz | `sleep/zzz-small/medium/large.png` | 1024×1024 RGBA |
| Resortera | `slingshot/slingshot-idle/pulled/release.png` | 1024×1024 RGBA |
| Blancos | `targets/target-normal/hot/gold.png` | 1536×1024 RGBA |

**Composición de la escena estática:**
- Capa 1: `sceneSleeping` (1672×941 → escala a 1280×720, sin distorsión perceptible).
- Capa 2: `slingshotIdle` centrado en la base (centerX=640, bottomY=720, scale=0.30).
- Capa 3: 3 blancos individuales (`targetNormal`, `targetHot`, `targetGold`) en zona superior.
- Capa 4: 3 Zzz individuales (`zzzSmall`, `zzzMedium`, `zzzLarge`) flotando sobre los personajes.

**Verificación:**
- 8/8 assets cargados (200 OK); cero errores 404; cero errores de consola.
- Sintaxis JS validada con `node new Function()`.
- Validación visual completada en `http://localhost:5500/stage2-dev.html`.
- `index.html` y Etapa 1 sin modificaciones; sin regresiones.
- Working tree limpio tras commit.

### Fase 3 — Apuntado y Lanzamiento (2026-07-30) — commit 9f48e94

**Archivos modificados:**
- `src/stages/stage2/manifest.js` — añadidas 3 entradas: `slingshotPulled`, `slingshotRelease`, `clockRed`.
- `src/stages/stage2/stage2.js` — reescritura completa: RAF loop con delta time, estado de resortera, pointer events, física de proyectiles.

**Mecánica implementada:**
- Apuntado mediante Pointer Events API (mouse y touch unificados).
- Resortera muestra `slingshotIdle`, `slingshotPulled` o `slingshotRelease` según estado.
- Reloj rojo (`clockRed`) visible en la posición del pouch durante el arrastre.
- Restricción: el pouch solo puede moverse hacia abajo o lateralmente, nunca por encima de su posición de reposo.
- `minDrag = 12 px` virtuales: clics sin arrastre suficiente cancelan sin lanzar.
- Al soltar: proyectil creado en la posición visual exacta del pouch, sin salto.
- Dirección opuesta al arrastre; potencia proporcional a la distancia clampeada (150–600 px/s).
- Física con delta time: velocidades en px/s, gravedad 300 px/s², rotación 5 rad/s.
- Cap de dt a 100 ms para evitar saltos tras cambio de pestaña.
- Múltiples proyectiles pueden coexistir simultáneamente.
- Proyectiles eliminados automáticamente al salir completamente del canvas.
- Solo el puntero activo (por `pointerId`) puede mover o soltar la resortera.
- `pointercancel` y `lostpointercapture` cancelan el arrastre limpiamente sin lanzar.
- `stop()` cancela RAF, remueve todos los listeners, libera pointer capture si aplica, vacía proyectiles y reinicia estado.

**Verificación:**
- Sintaxis JS validada con `node new Function()`.
- Validación visual completada en `http://localhost:5500/stage2-dev.html`.
- `index.html` y Etapa 1 sin modificaciones; sin regresiones.
- Working tree limpio tras commit.

### Fase 4 — Loop jugable (2026-07-30) — commit 7e057b9

**Archivos modificados:**
- `src/stages/stage2/stage2.js` — colisiones continuas, puntaje, alarma, HUD funcional.

**Mecánica implementada:**
- Detección de colisión continua (segmento–punto): cada proyectil guarda `prevX/prevY` y la posición actual; se calcula la distancia mínima entre el centro del blanco y el segmento de trayectoria. Evita que relojes rápidos atraviesen blancos entre frames.
- Radio combinado: `targetHitRadius (60 px) + projectileHitRadius (25 px)` — valores provisionales que reflejan el contenido visible, no el PNG completo 1536×1024 con espacio transparente.
- Prevención de impactos duplicados: flag `consumed` en el proyectil. En el mismo frame, un proyectil no puede impactar dos blancos ni ser contado dos veces. Un blanco ya en estado hot absorbe el proyectil en silencio sin sumar puntaje.
- Puntaje: **100 puntos por impacto** *(provisional Fase 4 — SPEC.md no define valores numéricos)*.
- Progreso de alarma: **+10% por impacto** *(provisional Fase 4)*; 10 impactos válidos llenan la barra al 100%.
- Cooldown hot: 1.5 segundos. Al expirar el blanco regresa a su `restAsset` (`targetNormal` o `targetGold`).
- El blanco dorado (`targetGold`) muestra `targetHot` durante el cooldown y **regresa a `targetGold`** al enfriarse — `restAsset` se conserva sin alterar.
- Alarma limitada a 100 % con `Math.min`. No existe victoria ni efecto adicional al llegar al 100 % en esta fase.
- Offsets de colisión (`collisionOffsetX: 115, collisionOffsetY: 77`) definidos por blanco en `C.targets` como valores provisionales; pendiente calibración visual.
- HUD funcional con Canvas 2D: texto de score, porcentaje de alarma y barra de progreso. Todas las posiciones, colores y tipografías centralizadas en `C.hud` — sin números mágicos en `drawHUD()`.

**Verificación:**
- Sintaxis JS validada con `node new Function()`.
- Validación visual completada en `http://localhost:5500/stage2-dev.html`.
- `index.html` y Etapa 1 sin modificaciones; sin regresiones.
- Working tree limpio tras commit.

## Pendiente

- Fase 5: Dificultad progresiva
- Fase 6: Final dorado
- Fase 7: Integración con Etapa 1

## Decisiones

- La etapa 2 estará aislada en `src/stages/stage2/stage2.js`.
- Mínimo contacto con `index.html` (solo Fase 7).
- Lanzador centrado abajo.
- Estado de Etapa 2 completamente separado del objeto `S` de Etapa 1.
- **Abandono de sprite sheets problemáticos:** `sleeper-shirtless.png` no tiene padding entre frames (figuras se solapan en x≈268-307); cualquier recorte rectangular produce sangrado o amputación. `zzz.png` (4×3) requería coordenadas manuales difíciles de calibrar sin herramienta de medición exacta.
- **Estrategia adoptada — escenas compuestas + PNG individuales:** cada estado del juego (durmiendo, reaccionando, bostezando) es una imagen completa 1672×941 con personajes ya integrados. Los proyectiles, Zzz, resorteras y blancos son PNG individuales con canal alfa, eliminando toda lógica de recorte de sprite sheet para estos elementos.
- Los helpers `getFrameRect`, `drawFrame` y `drawManualFrame` se conservan en `stage2.js` para uso futuro en animación de relojes (`alarm-clocks.png`) y efectos (`game-effects.png`).

## Problemas conocidos

- `targets` frame 3 (peligro-rojo con triángulo) de la sprite sheet original no tiene contraparte en los nuevos PNG individuales. Pendiente de aclarar antes de Fase 5.
- `hud` y `messages` son compuestos, no grilla. Coordenadas exactas de cada elemento TBD en Fase 3 o posterior.
- `scene-sleeping.png` fue corregida de 1671×941 a 1672×941 (1 px añadido al borde derecho por artefacto de generación). Las otras tres escenas miden 1672×941 correctamente.
