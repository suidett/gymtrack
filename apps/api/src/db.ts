// ─────────────────────────────────────────────────────────────────────────────
// Conexión a la base · Zona: Datos (API)
//
// Qué hace: crea el cliente de Prisma 7 sobre PostgreSQL con el adaptador de `pg`. Es el único
// lugar que abre conexiones; la API y el worker lo llaman una vez al arrancar.
// Tócalo cuando: cambie el pool de conexiones o el adaptador.
// No lo toques para: el esquema de las tablas (prisma/schema.prisma).
// Depende de: el cliente generado en src/generado/prisma (`prisma generate`, no se commitea) y
// @prisma/adapter-pg.
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generado/prisma/client';

export type BaseDeDatos = PrismaClient;

export function crearPrisma(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

/** true si el error es una violación de unicidad (P2002), por ejemplo un correo repetido. */
export function esDuplicado(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}
