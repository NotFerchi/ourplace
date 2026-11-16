// Ajustes personales de Our Place. Cambia aquí sin tocar el resto del código.
export const CONFIG = {
  // Modelo propio exportado desde Blender (Fase 4).
  // 1. Copia tu archivo a  client/public/models/my-place.glb
  // 2. Cambia `enabled` a true.
  // Si el archivo falta o falla, la app vuelve sola a la escena placeholder.
  model: {
    enabled: false,
    url: '/models/my-place.glb',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
  },

  // Rango visible de la agenda (se amplía solo si un bloque empieza antes).
  agenda: { startHour: 6, endHour: 24 },
}
