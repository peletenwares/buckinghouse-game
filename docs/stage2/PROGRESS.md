# Progreso etapa 2

## Fase actual

Fase 0 completada — Fase 1 (Validación de assets) pendiente.

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

## Pendiente

- Fase 1: Validación de assets
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

- `assets/stage2/` está vacío — Fase 1 no puede iniciar hasta que existan los assets.
