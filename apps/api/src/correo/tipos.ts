// ─────────────────────────────────────────────────────────────────────────────
// Tipos del correo · Zona: Correo (API)
//
// Qué hace: la forma de un correo que sale y el contrato que cumple cada adaptador (Resend,
// consola, memoria). Cualquier adaptador nuevo implementa AdaptadorCorreo y nada más cambia.
// Tócalo cuando: un correo necesite un campo nuevo (adjuntos, etiquetas).
// No lo toques para: el texto de un correo (plantillas.ts) ni para elegir el adaptador (index.ts).
// Depende de: nada.
// ─────────────────────────────────────────────────────────────────────────────

// aviso: los correos de src/modulos/notificaciones (alertas y dolor para el entrenador, la prueba).
export type EtiquetaCorreo = 'bienvenida' | 'recuperacion' | 'aviso';

export interface CorreoSaliente {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  etiqueta: EtiquetaCorreo;
  /** Solo para el log: el id del usuario, nunca el correo (§Seguridad, SEG-018). */
  usuarioId: string;
}

export interface AdaptadorCorreo {
  readonly nombre: 'resend' | 'smtp' | 'consola' | 'memoria';
  enviar(correo: CorreoSaliente): Promise<void>;
}
