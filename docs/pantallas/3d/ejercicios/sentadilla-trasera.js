// Sentadilla trasera con barra. Ejercicio de ejemplo para los demás: de pie, con la barra
// sobre el trapecio y los pies fijos en el suelo.
//
// Cómo está hecho:
//   - Los pies son objetivos fijos en el mundo (no se mueven entre cuadros): así no resbalan.
//   - Las manos van en el marco 'torax', sobre la barra, y la barra se dibuja entre las manos
//     (equipo 'barra' en: 'manos'). Así la barra sigue a la espalda sola.
//   - `alinear` corre la pelvis en z para que la barra quede siempre sobre la mitad del pie
//     (z = 0.065), que es la trayectoria real: la barra baja y sube en línea recta.
//   - Solo cambian la altura de la pelvis, su cabeceo, la columna y la cabeza; las rodillas
//     salen de la IK hacia el polo, en la línea de los pies.

// Barra sobre el trapecio, en el marco del tórax; las manos la toman por fuera de los hombros.
const BARRA = [0, 0.16, -0.122];
const MANO = [0.4, BARRA[1], BARRA[2]];

const arriba = {
  pelvis: { pos: [0, 0.976, 0], cabeceo: 11 },
  columna: { flex: 2 },
  cabeza: { flex: -12 },
  alinear: { en: 'torax', pos: BARRA, z: 0.065 },
  // Codos hacia abajo y atrás (polo en el marco del tórax, igual que la mano).
  brazos: { mano: { en: 'torax', pos: MANO }, polo: [0.2, -1, -0.45] },
  // Pies al ancho de los hombros (tobillos a ±0.20), puntas 20° afuera; las rodillas apuntan
  // hacia las puntas.
  piernas: { pie: [0.2, 0.075, 0], abre: 20, polo: [0.55, 0, 0.84] },
};

const abajo = {
  pelvis: { pos: [0, 0.437, 0], cabeceo: 33 },
  columna: { flex: 6 },
  cabeza: { flex: -24 },
  piernas: { polo: [0.45, 0, 0.89] },
};

export default {
  id: 'sentadilla-trasera',
  nombre: 'Sentadilla trasera',
  ceja: 'Piernas · barra',
  periodo: 3.6,
  vista: 'tres',
  equipos: [{ tipo: 'barra', en: 'manos', discos: [0.225, 0.16] }],
  momentos: [0, 0.29, 0.5],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.1 },                 // pausa arriba: repite el cuadro anterior
    { t: 0.5, ...abajo },
    { t: 0.56 },                // un instante abajo
    // vuelve sola al primer cuadro en t = 1
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Aductores', 'Espalda baja', 'Core'],
  pintar: ['cuadriceps', 'gluteos'],
  pintarAyuda: ['core'],
  pasos: [
    [0, 'Barra sobre la espalda alta, manos por fuera de los hombros y codos hacia abajo.'],
    [0.1, 'Baja llevando la cadera atrás y abajo, con las rodillas en la línea de los pies.'],
    [0.46, 'Abajo, los muslos quedan paralelos al suelo o un poco más.'],
    [0.56, 'Sube empujando el suelo con todo el pie, con el pecho firme.'],
  ],
};
