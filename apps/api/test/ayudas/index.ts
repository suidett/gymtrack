// ─────────────────────────────────────────────────────────────────────────────
// Ayudas de prueba de los módulos · Zona: Pruebas (API)
//
// Qué hace: la puerta de las ayudas para escribir pruebas de un módulo rápido:
//   import { describeConBase, usarEntornoApi, idEjercicioBase } from './ayudas';
//   describeConBase('Ejercicios', () => {
//     const e = usarEntornoApi();
//     it('INT-050 Martina ve la biblioteca base', async () => {
//       const { martina } = await e.escena();
//       const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/exercises' });
//       expect(r.status).toBe(200);
//     });
//   });
// Tócalo cuando: agregues un archivo a esta carpeta.
// No lo toques para: escribir una prueba.
// Depende de: los archivos de esta carpeta y test/ayudantes.ts.
// ─────────────────────────────────────────────────────────────────────────────
export { AHORA, bearer, CLAVE, describeConBase, HAY_BASE, PERSONAS, revisarSobre } from '../ayudantes';
export { idConsejo, idEjercicioBase, uuidV7Fijo } from '../../src/compartido/semilla';
export * from './base';
export * from './entorno';
export * from './personas';
