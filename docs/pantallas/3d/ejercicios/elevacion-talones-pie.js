// Elevación de talones de pie en máquina. Los hombros bajo las almohadillas, la planta apoyada
// en el borde del escalón por la base de los dedos y los talones en el aire; solo se mueve el
// tobillo: los talones bajan bajo el borde y suben hasta quedar en punta de pies.
//
// Cómo está hecho:
//   - Los pies usan pivote 'bola': la base de los dedos queda fija en el borde y `talon` gira
//     el pie (negativo = talón abajo, positivo = arriba). Así el pie no resbala.
//   - El cuerpo sube y baja derecho con el tobillo (función `pose`): las rodillas quedan
//     estiradas sin bloquear y la cadera sobre el tobillo.
//   - El escalón es angosto, justo bajo la base de los dedos, porque el pie de la figura es
//     rígido y la punta bajaría dentro de un escalón ancho.
//   - Las almohadillas y el travesaño siguen al tórax y corren por el parante fijo de atrás.

const RAD = Math.PI / 180;
const ESCALON = 0.12;          // alto del borde
const BOLA = [0.11, ESCALON, 0];
// Tobillo con el talón girado `T` grados alrededor de la base de los dedos.
const tobillo = (T) => {
  const a = T * RAD;
  return [BOLA[0], BOLA[1] + 0.075 * Math.cos(a) + 0.135 * Math.sin(a), BOLA[2] + 0.075 * Math.sin(a) - 0.135 * Math.cos(a)];
};
const pose = (T) => {
  const k = tobillo(T);
  return {
    pelvis: { pos: [0, k[1] + 0.05 + 0.857, k[2]] },
    piernas: { pie: BOLA, pivote: 'bola', talon: T, abre: 0, polo: [0, 0, 1] },
  };
};
const arco = (t0, t1, T0, T1, n = 6) => Array.from({ length: n }, (_, i) => {
  const u = (i + 1) / n, e = (1 - Math.cos(Math.PI * u)) / 2;
  return { t: t0 + (t1 - t0) * u, ...pose(T0 + (T1 - T0) * e) };
});

const ABAJO = -20, ARRIBA = 34;

const inicio = {
  ...pose(ABAJO),
  columna: { flex: 0 },
  cabeza: { flex: -4 },
  // Manos en las manillas de las almohadillas, codos hacia abajo.
  brazos: { mano: { en: 'torax', pos: [0.24, 0.2, 0.22] }, polo: [0.3, -1, -0.2], giro: 0 },
};

export default {
  id: 'elevacion-talones-pie',
  nombre: 'Elevación de talones de pie',
  ceja: 'Piernas · máquina',
  periodo: 3,
  vista: 'lado',
  equipos: [
    // Escalón con su base.
    { tipo: 'bloque', pos: [0, ESCALON / 2, BOLA[2]], tam: [0.6, ESCALON, 0.05], color: 'estructura', radio: 0.01 },
    { tipo: 'bloque', pos: [0, 0.015, -0.2], tam: [0.7, 0.03, 0.7], color: 'estructura' },
    // Parante fijo detrás de la persona.
    { tipo: 'bloque', pos: [0, 1.0, -0.5], tam: [0.08, 2.0, 0.08], color: 'estructura' },
    // Lo que se mueve con los hombros: almohadillas, manillas y travesaño.
    { tipo: 'bloque', sigue: 'torax', pos: [0.13, 0.245, -0.01], tam: [0.12, 0.06, 0.2], color: 'tapiz', radio: 0.025 },
    { tipo: 'bloque', sigue: 'torax', pos: [-0.13, 0.245, -0.01], tam: [0.12, 0.06, 0.2], color: 'tapiz', radio: 0.025 },
    { tipo: 'bloque', sigue: 'torax', pos: [0.24, 0.2, 0.17], tam: [0.03, 0.03, 0.14], color: 'fierro' },
    { tipo: 'bloque', sigue: 'torax', pos: [-0.24, 0.2, 0.17], tam: [0.03, 0.03, 0.14], color: 'fierro' },
    { tipo: 'bloque', sigue: 'torax', pos: [0.21, 0.245, 0.09], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    { tipo: 'bloque', sigue: 'torax', pos: [-0.21, 0.245, 0.09], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    { tipo: 'bloque', sigue: 'torax', pos: [0, 0.255, -0.15], tam: [0.5, 0.05, 0.05], color: 'fierro' },
    { tipo: 'bloque', sigue: 'torax', pos: [0, 0.255, -0.28], tam: [0.05, 0.05, 0.26], color: 'fierro' },
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...inicio },
    { t: 0.08 },
    ...arco(0.08, 0.4, ABAJO, ARRIBA),
    { t: 0.5 },
    ...arco(0.5, 1, ARRIBA, ABAJO),   // el último (t = 1) se descarta: el ciclo vuelve al primero
  ],
  trabajan: ['Gemelos', 'Sóleo'],
  ayudan: ['Core'],
  pintar: ['gemelos'],
  pasos: [
    [0, 'De pie bajo las almohadillas, con la base de los dedos en el borde y los talones abajo, estirando la pantorrilla.'],
    [0.08, 'Sube los talones lo más alto que puedas, con las rodillas estiradas pero sin bloquearlas.'],
    [0.38, 'Arriba, quédate en punta de pies y aprieta la pantorrilla un segundo.'],
    [0.5, 'Baja lento hasta que los talones queden bajo el borde.'],
  ],
};
