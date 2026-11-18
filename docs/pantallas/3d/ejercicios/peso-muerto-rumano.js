// Peso muerto rumano con barra. De pie, barra en las manos con los brazos colgando; la cadera
// va atrás con las rodillas casi fijas y el tronco baja casi hasta horizontal.
//
// Cómo se calcularon los números (con esqueleto.js, en Node):
//   - Pies al ancho de la cadera (tobillos a ±0.12), fijos en el suelo: no resbalan.
//   - Las rodillas parten con 17° de flexión y llegan a 25° abajo: casi fijas. La canilla pasa
//     de 7° hacia adelante a vertical, y así la cadera se va atrás (la pelvis retrocede 11 cm)
//     mientras el tronco se inclina. Cada pose de la pelvis sale de poner la cadera donde la
//     deja esa rodilla.
//   - La barra va en el mundo y las manos la siguen. En cada cuadro se buscó la barra a 64 cm
//     del hombro (codos casi rectos) y a 8 mm por delante de la superficie del muslo, la rodilla
//     o la canilla: baja rozando las piernas y queda sobre la mitad del pie (z entre 0,07 y 0,11).
//   - Abajo el tronco queda a unos 84° de la vertical, con la espalda recta (columna casi sin
//     flexión), y la barra llega a la parte alta de la tibia, unos 13 cm bajo la rodilla.
//   - Los brazos van un poco hacia atrás (los dorsales llevan la barra contra las piernas).

const MANO = 0.235;                 // media distancia entre las manos, justo por fuera de los muslos
const PIE = [0.12, 0.075, 0];       // tobillo izquierdo; el derecho se refleja
const brazos = (y, z) => ({ mano: [MANO, y, z], polo: [0.35, -0.2, -1], giro: -90 });

const arriba = {
  pelvis: { pos: [0, 0.975, -0.019], cabeceo: 4 },
  columna: { flex: 0 },
  cabeza: { flex: -4 },
  brazos: brazos(0.795, 0.109),
  piernas: { pie: PIE, abre: 6, polo: [0.12, 0, 1] },
};
// Bajando y subiendo pasa por las mismas poses intermedias.
const p1 = { pelvis: { pos: [0, 0.968, -0.038], cabeceo: 25 }, cabeza: { flex: -6 }, brazos: brazos(0.742, 0.094) };
const p2 = { pelvis: { pos: [0, 0.953, -0.061], cabeceo: 45 }, cabeza: { flex: -9 }, brazos: brazos(0.657, 0.092) };
const p3 = { pelvis: { pos: [0, 0.935, -0.081], cabeceo: 62 }, cabeza: { flex: -12 }, brazos: brazos(0.547, 0.1) };
const p4 = { pelvis: { pos: [0, 0.917, -0.106], cabeceo: 74 }, columna: { flex: 1 }, cabeza: { flex: -14 }, brazos: brazos(0.452, 0.075) };
const abajo = { pelvis: { pos: [0, 0.902, -0.132], cabeceo: 82 }, columna: { flex: 2 }, cabeza: { flex: -16 }, brazos: brazos(0.366, 0.069) };

export default {
  id: 'peso-muerto-rumano',
  nombre: 'Peso muerto rumano',
  ceja: 'Piernas · barra',
  periodo: 4.2,
  vista: 'lado',   // de lado se ve la bisagra de cadera; el motor aclara el disco cercano
  equipos: [{ tipo: 'barra', en: 'manos', discos: [0.225, 0.16] }],
  momentos: [0, 0.3, 0.5],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.06 },                       // pausa arriba
    { t: 0.17, ...p1 },
    { t: 0.26, ...p2, columna: { flex: 0 } },
    { t: 0.34, ...p3, columna: { flex: 0 } },
    { t: 0.42, ...p4 },
    { t: 0.5, ...abajo },
    { t: 0.54 },                       // un instante abajo
    { t: 0.61, ...p4 },
    { t: 0.68, ...p3, columna: { flex: 0 } },
    { t: 0.75, ...p2, columna: { flex: 0 } },
    { t: 0.83, ...p1 },
    { t: 0.92, ...arriba },
  ],
  trabajan: ['Isquiotibiales', 'Glúteos'],
  ayudan: ['Espalda baja', 'Dorsal ancho', 'Antebrazos'],
  pintar: ['isquios', 'gluteos'],
  pintarAyuda: ['lumbares', 'dorsales', 'antebrazos'],
  pasos: [
    [0, 'De pie, barra en las manos con los brazos colgando y las rodillas apenas flexionadas.'],
    [0.06, 'Lleva la cadera atrás con la espalda recta; la barra baja rozando los muslos.'],
    [0.42, 'Baja hasta media tibia o hasta sentir el estiramiento detrás de los muslos.'],
    [0.54, 'Sube llevando la cadera adelante hasta quedar derecho, con los glúteos apretados.'],
  ],
};
