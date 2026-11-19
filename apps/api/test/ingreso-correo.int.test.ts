// ─────────────────────────────────────────────────────────────────────────────
// Pruebas: correo «Iniciaste sesión» · Zona: Cuentas (API)
//
// Qué prueba: cada ingreso con contraseña manda un correo al correo de la cuenta que entró, con la
// hora en su zona; un ingreso fallido y renovar el token no mandan nada. El ingreso con Google
// usa el mismo envío (avisarIngreso desde abrirSesion, en src/cuentas/servicio.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { expect, it } from 'vitest';
import { CLAVE, describeConBase, PERSONAS, usarEntorno } from './ayudantes';

describeConBase('Cuentas: correo al iniciar sesión', () => {
  const e = usarEntorno();
  const correo = PERSONAS.camila.email;

  it('ING-001 entrar con contraseña manda «Iniciaste sesión» al correo de la cuenta', async () => {
    await e.registrar('camila');
    await e.esperarCorreos();
    const antes = e.buzon.todos().length;
    const r = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: correo, password: CLAVE } });
    expect(r.status).toBe(200);
    await e.esperarCorreos();
    const nuevos = e.buzon.todos().slice(antes);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]).toMatchObject({ para: correo, etiqueta: 'ingreso', asunto: 'Iniciaste sesión en GymTrack' });
    expect(nuevos[0]!.texto).toContain('con tu correo y contraseña');
    expect(nuevos[0]!.texto).toContain('Olvidé mi contraseña');
  });

  it('ING-002 una contraseña mala y renovar el token no mandan correo', async () => {
    const s = await e.registrar('camila');
    await e.esperarCorreos();
    const antes = e.buzon.todos().length;
    const mala = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: correo, password: `${CLAVE}x` } });
    expect(mala.status).toBe(401);
    const renovada = await e.pedir({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: s.tokens.refresh_token } });
    expect(renovada.status).toBe(200);
    await e.esperarCorreos();
    expect(e.buzon.todos().length).toBe(antes);
  });
});
