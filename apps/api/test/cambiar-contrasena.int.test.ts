// ─────────────────────────────────────────────────────────────────────────────
// Pruebas: cambiar la contraseña con la sesión abierta · Zona: Cuentas (API)
//
// Qué prueba: POST /v1/me/password (Perfil > Datos personales). Con la actual correcta guarda la
// nueva, entrega una sesión nueva y cierra las demás; la vieja deja de servir para entrar. Con la
// actual mala, la nueva igual a la actual o una nueva débil responde 422 con el campo, y sin
// sesión responde 401.
// ─────────────────────────────────────────────────────────────────────────────
import { expect, it } from 'vitest';
import { CLAVE, describeConBase, PERSONAS, usarEntorno } from './ayudantes';

const NUEVA = 'OtraClave.2026';

describeConBase('Cuentas: cambiar la contraseña', () => {
  const e = usarEntorno();
  const correo = PERSONAS.camila.email;
  const cambiar = (access: string, payload: object) =>
    e.pedir({ method: 'POST', url: '/v1/me/password', headers: { authorization: `Bearer ${access}` }, payload });

  it('CLA-001 con la actual correcta cambia la contraseña, da otra sesión y cierra las demás', async () => {
    const s = await e.registrar('camila');
    const r = await cambiar(s.tokens.access_token, { password_actual: CLAVE, password: NUEVA });
    expect(r.status).toBe(200);
    expect(r.json.usuario.email).toBe(correo);
    expect(typeof r.json.tokens.access_token).toBe('string');

    // La sesión de antes ya no renueva; la nueva sí.
    const vieja = await e.pedir({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: s.tokens.refresh_token } });
    expect(vieja.status).toBe(401);
    const nueva = await e.pedir({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: r.json.tokens.refresh_token } });
    expect(nueva.status).toBe(200);

    // Entra con la nueva y no con la vieja.
    const conVieja = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: correo, password: CLAVE } });
    expect(conVieja.status).toBe(401);
    const conNueva = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: correo, password: NUEVA } });
    expect(conNueva.status).toBe(200);
  });

  it('CLA-002 la actual mala, la misma de antes o una débil dan 422 con el campo', async () => {
    const s = await e.registrar('camila');
    const mala = await cambiar(s.tokens.access_token, { password_actual: `${CLAVE}x`, password: NUEVA });
    expect(mala.status).toBe(422);
    expect(mala.json.error.details).toMatchObject({ campo: 'password_actual' });

    const igual = await cambiar(s.tokens.access_token, { password_actual: CLAVE, password: CLAVE });
    expect(igual.status).toBe(422);
    expect(igual.json.error.details).toMatchObject({ campo: 'password' });

    const debil = await cambiar(s.tokens.access_token, { password_actual: CLAVE, password: 'corta' });
    expect(debil.status).toBe(400);

    // Nada de eso cambió la contraseña.
    const login = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: correo, password: CLAVE } });
    expect(login.status).toBe(200);
  });

  it('CLA-003 sin sesión responde 401', async () => {
    const r = await e.pedir({ method: 'POST', url: '/v1/me/password', payload: { password_actual: CLAVE, password: NUEVA } });
    expect(r.status).toBe(401);
  });
});
