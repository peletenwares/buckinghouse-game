# Buckinghouse — Juego de tres etapas

Juego web 2D (Vanilla JS + Canvas, sitio estático, sin build). El juego completo
encadena tres etapas y una pantalla final:

```
STAGE 1 — Rescate de gatos
   → STAGE 2 — El trayecto de Nico a la clínica
      → STAGE 3 — Despertar a los dos hombres
         → GAME COMPLETE / FIN
```

- **Etapa 1 — Rescate de gatos.** Natalia recorre el patio de Buckinghouse,
  rescata a siete gatos y evita obstáculos. Los gatos rescatados forman una
  caravana que sigue al personaje.
- **Etapa 2 — El trayecto.** **Nico** viaja de Carmen 121 a la clínica: corre por
  el departamento, cruza plataformas móviles, esquiva en Santa Lucía, valida el
  Bip en el metro, toma la micro y llega a la clínica. Presupuesto **total de
  60 segundos** (el HUD inicia en `1:00`).
- **Etapa 3 — Despertarlos.** Con una resortera y relojes despertadores, Nico
  intenta despertar a los dos hombres dormidos hasta llenar la barra de alarma.

## Ejecutar localmente

Sitio estático; sirve la carpeta raíz con cualquier servidor:

```bash
python -m http.server 5500
```

Luego abre `http://localhost:5500/`.

### Rutas

| Ruta | Qué es |
|------|--------|
| `index.html` | Juego completo con progresión de las 3 etapas y selector |
| `stage2-dev.html` | Etapa 2 (trayecto) en aislamiento, para desarrollo |
| `stage3-dev.html` | Etapa 3 (despertarlos) en aislamiento, para desarrollo |
| `debug-stage2.html` | Galería de assets de la Etapa 2 |
| `debug-stage3.html` | Galería de assets de la Etapa 3 |
| `stage2-legacy-wake-up.html` | Compatibilidad: redirige a `stage3-dev.html` |

Añade `?debug=1` a `index.html` para desbloquear todas las etapas en el selector
y habilitar teclas de desarrollo dentro de la Etapa 2.

## Etapa 2 — cronómetro de 60 segundos

- El cronómetro empieza en **60 s** y **solo baja**; ningún elemento suma tiempo.
- No hay bonos de checkpoint ni relojes que aumenten el reloj: los checkpoints
  solo guardan progreso, y los relojes bonus / saldos Bip extra dan **puntaje**.
- Techo duro: el cronómetro nunca supera 60 s.
- Una partida correcta se completa en ~45–55 s (exigente pero posible sin usar
  teclas de debug).

## Progresión y desbloqueo de etapas

En el flujo normal:

- La **Etapa 2** se desbloquea al completar la Etapa 1.
- La **Etapa 3** se desbloquea al completar la Etapa 2.

El progreso se guarda en `localStorage`, clave `buckinghouse_progress`:

```json
{ "stage1Completed": true, "stage2Completed": true, "stage3Completed": false }
```

El selector de etapas (botón «Seleccionar etapa») respeta estos desbloqueos.
Con `?debug=1` todas las etapas quedan disponibles (no en producción).

### Limpiar el progreso guardado

En la consola del navegador:

```js
localStorage.removeItem('buckinghouse_progress');
```

(o borra los datos del sitio). Al recargar, solo la Etapa 1 queda desbloqueada.

## Pruebas

- **Unitarias / config (navegador):** abre `tests/stage2-commute.test.html` con el
  servidor local. Verifica el cronómetro de 60 s, la ausencia de bonos de tiempo,
  el uso del nombre «Nico» y la ausencia del término de parentesco prohibido.
- **Etapa 2 completable (Node):** `node tests/stage2-completable.js` — un bot
  headless comprueba que la Etapa 2 se completa dentro de 60 s.
- **Flujo completo (navegador real):** `node tests/e2e-flow.js` — requiere
  Playwright (`npm i -D playwright`) y Chrome/Edge. Conduce
  Stage 1 → Stage 2 → Stage 3 → GAME_COMPLETE y valida cero errores y cero 404.

## Documentación por etapa

- Etapa 2: [`src/stages/stage2/README.md`](src/stages/stage2/README.md)
- Etapa 3: [`src/stages/stage3/README.md`](src/stages/stage3/README.md)
- Avance del proyecto: [`docs/stage2/PROGRESS.md`](docs/stage2/PROGRESS.md)
