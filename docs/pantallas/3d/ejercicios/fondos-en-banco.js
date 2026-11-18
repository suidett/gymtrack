// Fondos en banco (fondos de tríceps con las manos atrás), con peso corporal. Las manos se
// apoyan en el borde de una banca que queda detrás, los pies en el suelo con las rodillas
// dobladas, y el cuerpo baja y sube doblando los codos, con la espalda cerca de la banca.
//
// Cómo está hecho:
//   - La banca del motor va a lo largo (eje z) y aquí hace falta de través, para apoyar las dos
//     manos en su borde: se arma con bloques (cojín de 1 m de ancho, cara de arriba a 0.43 y
//     borde delantero en z = -0.02, y dos patas).
//   - Manos y pies fijos en el mundo en todos los cuadros: no resbalan. Los puños quedan sobre
//     el cojín, junto al borde, al ancho de los hombros; los codos apuntan hacia atrás.
//   - Cada cuadro se armó eligiendo dónde van los hombros y la inclinación del tronco; de ahí
//     salió la pelvis (con esqueleto.js). Arriba los brazos quedan casi rectos (unos 14°) y un
//     poco inclinados hacia atrás; abajo el codo llega a 92° y el brazo queda casi paralelo al
//     suelo.
//   - Al bajar, la cadera se va adelante a la vez que baja: los glúteos pasan justo por delante
//     del borde de la banca sin tocarlo.

const MANO = [0.2, 0.475, -0.06];   // centro del puño izquierdo, sobre el cojín
const PIE = [0.15, 0.075, 0.6];

const cuerpo = (pelvis, cabeceo) => ({ pelvis: { pos: pelvis, cabeceo } });

const base = {
  columna: { flex: 0 },
  cabeza: { flex: 4 },
  brazos: { mano: MANO, polo: [0.15, 0, -1], giro: 0 },
  piernas: { pie: PIE, abre: 8, polo: [0.1, 1, 0.6] },
};

const arriba = cuerpo([0, 0.6608, 0.1081], -10);
const medio = cuerpo([0, 0.5544, 0.1426], -8);
const abajo = cuerpo([0, 0.4225, 0.187], -6);

export default {
  id: 'fondos-en-banco',
  nombre: 'Fondos en banco',
  ceja: 'Brazos · peso corporal',
  periodo: 3.2,
  vista: 'lado',
  equipos: [
    { tipo: 'bloque', pos: [0, 0.39, -0.17], tam: [1.0, 0.08, 0.3], color: 'tapiz' },
    { tipo: 'bloque', pos: [0.42, 0.175, -0.17], tam: [0.05, 0.35, 0.24], color: 'estructura' },
    { tipo: 'bloque', pos: [-0.42, 0.175, -0.17], tam: [0.05, 0.35, 0.24], color: 'estructura' },
  ],
  momentos: [0, 0.24, 0.46],
  cuadros: [
    { t: 0, ...base, ...arriba },
    { t: 0.06 },                  // un instante arriba
    { t: 0.24, ...medio },
    { t: 0.46, ...abajo },
    { t: 0.52 },                  // abajo, un instante
    { t: 0.74, ...medio },
  ],
  trabajan: ['Tríceps'],
  ayudan: ['Pectoral', 'Hombro anterior'],
  pintar: ['triceps'],
  pasos: [
    [0, 'Apoya las manos en el borde de la banca, detrás de ti, con los dedos hacia adelante y los brazos estirados.'],
    [0.06, 'Baja la cadera doblando los codos hacia atrás, con la espalda cerca de la banca.'],
    [0.44, 'Abajo, los codos quedan cerca de 90 grados. No bajes más para no forzar los hombros.'],
    [0.52, 'Empuja con las manos hasta estirar los brazos, sin despegar los pies del suelo.'],
  ],
};
