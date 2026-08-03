# Etapa 2 — Operación Despertar

## Acceso

- Solo se desbloquea después de completar la etapa 1.
- El progreso debe persistir después de recargar.
- Debe existir acceso de desarrollo para probarla directamente.
- Reintentar etapa 2 no debe alterar el progreso de etapa 1.

## Escenario

- Pantalla fija horizontal 16:9.
- Fondo de la sala sin personajes.
- Los dos personajes se renderizan como sprites independientes sobre el sofá.
- El lanzador se ubica en el centro inferior.

## Mecánica

- El jugador apunta y lanza relojes.
- Aparecen blancos móviles y Zzz flotantes.
- Los impactos generan puntaje, combo y carga de alarma.
- Las Zzz no eliminadas aumentan la barra Pantalla llena.
- La dificultad aumenta progresivamente.
- Al llenar la alarma aparece un blanco dorado.
- El jugador recibe un reloj dorado.
- Impactar el blanco dorado despierta a ambos personajes.

## Victoria

- Impactar el blanco dorado con el reloj dorado.
- Reproducir la animación de despertar.
- Mostrar resultado y guardar progreso.

## Derrota

- Tiempo agotado.
- Barra Pantalla llena al 100 %.

## Fases

1. Blancos grandes y lentos.
2. Blancos medianos y más Zzz.
3. Blancos pequeños y rápidos.
4. Blanco y reloj dorados.