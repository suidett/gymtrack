// Peso muerto convencional con barra. De pie, pies al ancho de la cadera y la barra en el
// suelo sobre la mitad del pie; las manos la toman por fuera de las piernas.
//
// Cómo está hecho:
//   - La barra va en el mundo y sube en línea recta (x, z fijos; solo cambia su altura). Las
//     manos la siguen y la barra se dibuja entre ellas.
//   - `alinear` deja el hombro un poco por delante de la barra al partir y sobre ella o apenas
//     detrás al final. La altura de la pelvis de cada cuadro se calculó con esqueleto.js para
//     que los brazos queden estirados justo hasta la barra.
//   - Al subir, primero se estiran las rodillas con el ángulo de la espalda casi igual (la
//     barra pasa la rodilla con la canilla vertical) y después se extiende la cadera. Al bajar
//     es al revés: cadera atrás con las rodillas casi rectas y, pasada la rodilla, se doblan.
//   - Pies fijos en el suelo; la espalda va recta (columna sin flexión) en todo el recorrido.

const BZ = 0.11;     // la barra queda sobre la mitad del pie, rozando las canillas
const AGARRE = 0.26; // media distancia entre las manos (por fuera de las rodillas)
const HOMBRO = [0.19, 0.15, 0]; // articulación del hombro en el marco del tórax

// Un cuadro: altura de la barra, altura de la pelvis, cabeceo del tronco, flexión de la
// columna, hombro delante (+) o detrás (-) de la barra y cabeza.
const c = (t, barra, pelvis, cabeceo, flex, adelante, cabeza) => ({
  t,
  pelvis: { pos: [0, pelvis, 0], cabeceo },
  columna: { flex },
  cabeza: { flex: cabeza },
  alinear: { en: 'torax', pos: HOMBRO, z: BZ + adelante },
  brazos: { mano: [AGARRE, barra, BZ], polo: [0, 0, -1], giro: -90 },
});

export default {
  id: 'peso-muerto',
  nombre: 'Peso muerto convencional',
  ceja: 'Piernas · barra',
  periodo: 4.2,
  vista: 'tres',
  equipos: [{ tipo: 'barra', en: 'manos', discos: [0.225, 0.225] }],
  momentos: [0, 0.2, 0.5],
  cuadros: [
    // Abajo: cadera más alta que las rodillas, hombros sobre la barra, canillas casi verticales.
    // Pies al ancho de la cadera, puntas un poco afuera y rodillas en la línea de los pies.
    { ...c(0, 0.225, 0.641, 61, 0, 0.035, -12), piernas: { pie: [0.12, 0.075, 0], abre: 10, polo: [0.17, 0, 1] } },
    { t: 0.06 },                          // se arma abajo
    c(0.13, 0.36, 0.755, 58, 0, 0.03, -11),
    c(0.2, 0.5, 0.876, 55, 0, 0.025, -10), // la barra pasa la rodilla
    c(0.25, 0.575, 0.886, 44, 0, 0.005, -8),
    c(0.3, 0.65, 0.903, 32, 0, -0.015, -6),
    c(0.35, 0.73, 0.925, 15, -1, -0.065, -3),
    c(0.4, 0.815, 0.986, 0, -2, -0.13, 0), // arriba: cadera y rodillas estiradas
    { t: 0.48 },                          // un instante arriba
    c(0.53, 0.73, 0.944, 22, -1, -0.045, -4),
    c(0.58, 0.62, 0.92, 42, 0, 0.005, -8),
    c(0.63, 0.5, 0.876, 55, 0, 0.025, -10),
    c(0.73, 0.36, 0.755, 58, 0, 0.03, -11),
    c(0.84, 0.225, 0.641, 61, 0, 0.035, -12),
    // queda apoyada hasta t = 1 y vuelve a empezar
  ],
  trabajan: ['Glúteos', 'Isquiotibiales', 'Espalda baja'],
  ayudan: ['Cuádriceps', 'Trapecio', 'Dorsal ancho', 'Antebrazos'],
  pintar: ['gluteos', 'isquios', 'lumbares'],
  pasos: [
    [0, 'Barra sobre la mitad del pie, manos por fuera de las piernas, espalda recta y hombros sobre la barra.'],
    [0.06, 'Empuja el suelo con las piernas: la barra sube pegada a las canillas.'],
    [0.22, 'Pasadas las rodillas, lleva la cadera adelante hasta quedar derecho.'],
    [0.48, 'Baja al revés: cadera atrás primero y, pasadas las rodillas, dóblalas hasta dejar la barra en el suelo.'],
  ],
};
