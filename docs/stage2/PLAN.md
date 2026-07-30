# Plan de desarrollo — Etapa 2

## Objetivo

Implementar la etapa 2 como un módulo separado, sin romper la etapa 1.

La etapa 2 será un minijuego de pantalla fija donde el jugador lanza relojes desde el centro inferior hacia blancos móviles y Zzz. La dificultad aumenta progresivamente y termina con un reloj dorado lanzado hacia un blanco dorado para despertar a ambas personas.

## Reglas de ejecución

- Ejecutar una sola fase por sesión.
- No avanzar si la fase actual no está validada.
- No usar placeholders para reemplazar assets.
- No modificar la etapa 1 salvo durante la fase final de integración.
- Hacer un commit después de cada fase aprobada.
- Registrar avances y problemas en `PROGRESS.md`.
- No hacer deploy sin autorización.

---

## Fase 0 — Inspección del repositorio

### Objetivo

Entender la arquitectura actual antes de modificar código.

### Tareas

- Identificar framework o motor.
- Localizar archivos de etapa 1.
- Identificar navegación, progreso y persistencia.
- Identificar comandos de desarrollo, build y pruebas.
- Detectar riesgos de regresión.
- Proponer la estructura mínima de etapa 2.

### No hacer

- No modificar archivos.
- No crear etapa 2.
- No cambiar navegación.
- No tocar assets.

### Criterio de aprobación

- Existe un diagnóstico claro de la arquitectura.
- Se conocen los archivos que controlan etapa 1.
- Se define dónde vivirá etapa 2.
- Se conocen los comandos de validación.

---

## Fase 1 — Validación de assets

### Objetivo

Confirmar que todos los recursos de etapa 2 cargan y pueden recortarse correctamente.

### Tareas

- Localizar las rutas reales de todos los PNG.
- Medir ancho y alto.
- Confirmar transparencia.
- Detectar filas, columnas, márgenes y frames.
- Crear un manifiesto técnico de recortes.
- Crear una galería debug de assets.

### Assets

- Fondo sin personajes.
- Fondo de referencia con personajes.
- Sprite sheet personaje 1.
- Sprite sheet personaje 2.
- Relojes.
- Blancos.
- Zzz.
- Barras.
- Estrellas y alarma.
- Mensajes.

### No hacer

- No crear gameplay.
- No posicionar todavía la escena final.
- No agregar física.
- No usar formas o emojis como reemplazo.

### Criterio de aprobación

- Todos los assets cargan.
- No existen errores 404.
- No hay errores de consola.
- Cada frame puede mostrarse por separado.
- Ninguna sprite sheet completa aparece como elemento jugable.
- El manifiesto de recortes queda documentado.

### Commit sugerido

```text
feat(stage2): add validated asset manifest and debug gallery