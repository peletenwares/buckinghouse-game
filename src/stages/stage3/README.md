# Etapa 3 — Despertarlos

Tercera y última etapa del juego. Nico usa una **resortera** para lanzar
**relojes despertadores** a dos hombres dormidos; cada impacto sube la barra de
**alarma**. Al llegar al 100 %, la etapa se completa y el juego muestra la
pantalla final (GAME COMPLETE).

> Origen: esta etapa es la antigua «wake-up» que estuvo archivada como legacy de
> la Etapa 2. Fue **promovida** a Etapa 3 oficial reutilizando su implementación
> preservada (no se reconstruyó desde cero).

## Archivos

```
src/stages/stage3/
  manifest.js   STAGE3_MANIFEST + loadStage3Assets()   (assets en assets/stage3/)
  stage3.js     motor de la etapa; expone window.Stage3
assets/stage3/  assets oficiales de la Etapa 3 (escenas, resortera, relojes, blancos, Zzz)
stage3-dev.html   página de desarrollo (Stage3.devStart())
debug-stage3.html galería de assets
```

## API pública (`window.Stage3`)

| Método | Descripción |
|--------|-------------|
| `Stage3.start(opts)` | Inicia la etapa. `opts.onComplete(stats)` se invoca **una vez** al llegar la alarma a 100 % (lo usa el host para pasar a la pantalla final). |
| `Stage3.stop()` | Detiene el loop, quita el canvas y los listeners, y resetea el estado. |
| `Stage3.devStart()` | Arranque autónomo para `stage3-dev.html` (sin host). |
| `Stage3.state()` | Introspección para QA: `{phase, alarm, score, projectiles, started}`. |

## Aislamiento respecto de la Etapa 2

Para evitar colisiones al cargar ambas etapas en `index.html`, los globales de la
Etapa 3 están renombrados: `window.Stage3`, `STAGE3_MANIFEST`, `loadStage3Assets`,
y el canvas usa `id="s3canvas"` (la Etapa 2 usa `Stage2`, `S2_MANIFEST`,
`s2canvas`). El grueso del motor vive dentro de un IIFE, así que no filtra otros
símbolos al ámbito global.

## Ejecutar

```bash
python -m http.server 5500
```

- Etapa 3 (dev): `http://localhost:5500/stage3-dev.html`
- Galería de assets: `http://localhost:5500/debug-stage3.html`
- Juego completo (llega a la Etapa 3 tras completar la 2): `http://localhost:5500/`

Las URLs antiguas `stage2-legacy-wake-up.html` y
`debug-stage2-legacy-wake-up.html` se conservan por compatibilidad y redirigen
aquí.

## Mecánica (resumen)

- Escena compuesta según el progreso de alarma: durmiendo → reaccionando →
  bostezando.
- Resortera con estados idle / cargada / disparo; física de proyectiles con
  gravedad y colisión continua (segmento–punto) contra los blancos.
- Cada impacto válido: +puntaje y +alarma; los blancos entran en «hot» con
  enfriamiento. Al 100 % de alarma → `completeStage()` (idempotente) → mensaje de
  cierre y, en el flujo integrado, pantalla final del juego.
