# Progreso etapa 2

## Fase actual

Fase 1 completada — Fase 2 (Escena estática) pendiente.

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

## Pendiente

- Fase 2: Escena estática
- Fase 3: Lanzamiento
- Fase 4: Loop jugable
- Fase 5: Dificultad progresiva
- Fase 6: Final dorado
- Fase 7: Integración con Etapa 1

## Decisiones

- La etapa 2 estará aislada en `src/stages/stage2/stage2.js`.
- Mínimo contacto con `index.html` (solo Fase 7).
- Fondo sin personajes.
- Personajes como sprites independientes sobre el sofá.
- Lanzador centrado abajo.
- Estado de Etapa 2 completamente separado del objeto `S` de Etapa 1.

## Problemas conocidos

- `charShirtless` cellW = 307.2 (no entero) y `zzz` cellH = 341.33 (no entero). Funciona en Canvas 2D con float; confirmar visualmente en Fase 2 si hay costuras sub-pixel.
- `targets` frame 0 es amarillo/dorado — rol exacto vs. "blanco dorado" del SPEC pendiente de aclarar antes de Fase 6.
- `hud` y `messages` son compuestos, no grilla. Coordenadas exactas de cada elemento TBD en Fase 2.
