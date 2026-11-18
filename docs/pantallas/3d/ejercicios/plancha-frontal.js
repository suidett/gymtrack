// Plancha frontal sobre antebrazos. Es un ejercicio de mantener la posición: la animación
// parte con las rodillas apoyadas, despega las rodillas hasta dejar el cuerpo recto, aguanta
// la mayor parte del ciclo y vuelve a bajar las rodillas.
//
// Cómo está hecho:
//   - Fijos en el mundo en todo el ciclo: los antebrazos (codo bajo el hombro y puño en
//     [±0.1, 0.045, 0.33]) y la punta de los pies en [±0.1, 0.006, -1.305]. Los hombros quedan
//     en [±0.19, 0.353, 0], justo sobre los codos, y la pelvis se calculó para que lleguen ahí.
//   - En plancha la pelvis tiene cabeceo 81.8 con la columna recta: hombro, cadera y tobillo
//     quedan en una línea. El pie se apoya en la punta (talon 60, unos 25 grados de flexión del
//     tobillo, como en una plancha real) y la rodilla queda casi estirada (7 grados).
//   - Con las rodillas abajo baja la pelvis (cabeceo 70), el pie se para más (talon 78) y las
//     rodillas tocan el suelo; hombro, cadera y rodilla siguen en línea.

const ESC = { prot: 0.015 };   // empuja el suelo: escápulas un poco separadas
const brazos = { mano: [0.1, 0.045, 0.33], polo: [0, -1, -1], giro: 0 };

const rodillas = {
  pelvis: { pos: [0, 0.2132, -0.428], cabeceo: 70 },
  columna: { flex: 0 },
  cabeza: { flex: -6 },
  escapulas: ESC,
  brazos,
  piernas: { pie: [0.1, 0.2092, -1.2869], talon: 78, polo: [0, -1, 0] },
};

const plancha = {
  pelvis: { pos: [0, 0.3037, -0.4475], cabeceo: 81.8 },
  piernas: { pie: [0.1, 0.2049, -1.3505], talon: 60, polo: [0, -1, 0] },
};

export default {
  id: 'plancha-frontal',
  nombre: 'Plancha frontal',
  ceja: 'Core · peso corporal',
  periodo: 7,
  vista: 'lado',
  // Lado un poco más bajo para que se vea el abdomen; frente en diagonal, porque recto desde
  // la cabeza solo se ven la cabeza y los antebrazos.
  vistas: { lado: [1, -0.03, 0.03], frente: [0.55, 0.35, 1] },
  equipos: [{ tipo: 'suelo', colchoneta: { pos: [0, -0.5], tam: [0.62, 1.95] } }],
  momentos: [0, 0.18, 0.5],
  cuadros: [
    { t: 0, ...rodillas },
    { t: 0.08 },
    { t: 0.28, ...plancha },
    { t: 0.8 },                 // aguanta
    { t: 0.94, ...rodillas },
  ],
  trabajan: ['Abdomen', 'Transverso abdominal'],
  ayudan: ['Oblicuos', 'Glúteos', 'Hombros'],
  pintar: ['abdomen'],
  pasos: [
    [0, 'Antebrazos en el suelo con los codos bajo los hombros y las puntas de los pies apoyadas.'],
    [0.08, 'Despega las rodillas hasta dejar el cuerpo recto de la cabeza a los talones.'],
    [0.28, 'Mantén la posición: abdomen y glúteos apretados, sin hundir ni subir la cadera.'],
    [0.8, 'Al terminar el tiempo, baja las rodillas con control.'],
  ],
};
