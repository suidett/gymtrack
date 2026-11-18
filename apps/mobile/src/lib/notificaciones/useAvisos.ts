// ─────────────────────────────────────────────────────────────────────────────
// Estado de los avisos para Perfil · Zona: Notificaciones (app)
//
// Qué hace: useAvisos() lee si los avisos están activos en este teléfono y entrega lo que Perfil
// necesita para mostrar el botón o el texto:
//   const a = useAvisos();
//   a.estado === 'sin_pedir' && <Boton titulo="Activar avisos" onPress={a.activar} />
//   a.mensaje  el texto para cada estado (bloqueados, falta agregar a inicio, listo)
// `activar` llama al pedido de permiso sin esperar nada antes (en el iPhone el permiso solo sale
// desde un toque) y devuelve { estado, mensaje } para mostrarlo en el aviso de la pantalla.
// Tócalo cuando: Perfil necesite otro dato de los avisos.
// Depende de: react, ./instancia y ./registro.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { activarAvisos, desactivarAvisos, estadoAvisos, plataformaDeAvisos } from './instancia';
import { mensajeDeEstado, type EstadoAvisos, type ResultadoAvisos } from './registro';

export function useAvisos() {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    estadoAvisos()
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado('no_disponible'));
    return () => {
      vivo = false;
    };
  }, []);

  const activar = useCallback(async (): Promise<ResultadoAvisos> => {
    setOcupado(true);
    try {
      const r = await activarAvisos();
      if (r.estado !== 'error') setEstado(r.estado);
      return r;
    } finally {
      setOcupado(false);
    }
  }, []);

  const desactivar = useCallback(async () => {
    setOcupado(true);
    try {
      await desactivarAvisos();
      setEstado(await estadoAvisos().catch(() => 'no_disponible' as const));
    } finally {
      setOcupado(false);
    }
  }, []);

  return {
    /** null mientras se lee. */
    estado,
    mensaje: estado ? mensajeDeEstado(estado, plataformaDeAvisos) : '',
    ocupado,
    activar,
    desactivar,
  };
}
