// ─────────────────────────────────────────────────────────────────────────────
// Encuesta inicial · Zona: Rutas (área Encuesta)
//
// Qué hace: monta la Encuesta inicial (PAN-04) en /encuesta. La ve el alumno con
// encuesta_pendiente al ingresar o al crear su cuenta; al terminar, la pantalla refresca el
// usuario y lleva a Hoy.
// Tócalo cuando: cambie la URL o las opciones de esta ruta. La pantalla vive en
// src/features/acceso/PantallaEncuesta.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx) ni las preguntas
// (src/features/acceso/encuesta.ts).
// Depende de: @/features/acceso.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaEncuesta } from '@/features/acceso';

export default function Encuesta() {
  return <PantallaEncuesta />;
}
