// ─────────────────────────────────────────────────────────────────────────────
// Instancia de la API del entrenador · Zona: Entrenador (app)
//
// Qué hace: tres cosas que las pantallas del entrenador comparten en el teléfono:
// - apiEntrenador: las llamadas de ./api.ts sobre api.llamar de @/lib/sesion (Bearer y renovación).
// - El último código de invitación, guardado en AsyncStorage por entrenador. §API no tiene una
//   ruta para leer el código vigente (solo POST, que genera otro e invalida el anterior, P-14),
//   así que sin esto cada vez que se abre Perfil habría que generar uno nuevo. No es un secreto:
//   está hecho para mandarse por WhatsApp.
// - useInsigniaAlertas: cuántas alertas nuevas hay, para la insignia de la pestaña Alertas.
// Tócalo cuando: la API publique una ruta para leer el código vigente, o el layout de pestañas
// pase a leer la insignia de otro lado.
// No lo toques para: las llamadas en sí (api.ts).
// Depende de: @/lib/sesion (api), AsyncStorage y zustand.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from '@/lib/sesion';
import { crearApiEntrenador } from './api';
import type { Invitacion } from './contrato';

// ── API ──────────────────────────────────────────────────────────────────────
export const apiEntrenador = crearApiEntrenador(api.llamar);

// ── Código de invitación guardado ────────────────────────────────────────────
const clave = (usuarioId: string) => `gymtrack:entrenador:${usuarioId}:invitacion`;

export async function leerCodigoGuardado(usuarioId: string): Promise<Invitacion | null> {
  try {
    const crudo = await AsyncStorage.getItem(clave(usuarioId));
    if (!crudo) return null;
    const v = JSON.parse(crudo) as Partial<Invitacion>;
    return typeof v.codigo === 'string' && typeof v.vence_at === 'string' ? { codigo: v.codigo, vence_at: v.vence_at } : null;
  } catch {
    return null;
  }
}

export async function guardarCodigo(usuarioId: string, inv: Invitacion): Promise<void> {
  try {
    await AsyncStorage.setItem(clave(usuarioId), JSON.stringify(inv));
  } catch {
    // Si no se pudo guardar, la próxima vez se genera otro. No vale la pena avisar.
  }
}

// ── Insignia de Alertas ──────────────────────────────────────────────────────
interface EstadoInsignia {
  nuevas: number;
  fijar(n: number): void;
}

/**
 * Alertas nuevas del entrenador. Clientes y Alertas la actualizan cada vez que cargan.
 * En entrenador/_layout.tsx: `tabBarBadge: nuevas || undefined` en la pestaña Alertas.
 */
export const useInsigniaAlertas = create<EstadoInsignia>((set) => ({
  nuevas: 0,
  fijar: (n) => set({ nuevas: Math.max(0, n) }),
}));
