// Prensa de piernas a 45°. Ejemplo de máquina hecha con bloques: el cuerpo queda quieto en el
// asiento y solo se mueven las piernas; la plataforma sigue a los pies.
//
// Cómo se calcularon los números (con esqueleto.js, en Node):
//   - Tronco reclinado 60° (pelvis con cabeceo -60, columna recta): el respaldo queda a 30° del
//     suelo. Así, con las rodillas a 90° la cadera llega a 120° de flexión y la zona lumbar
//     sigue apoyada. Más vertical, la cadera pasaría de 125° y la espalda baja se despegaría.
//   - Los pies (tobillos a ±0.18, ancho de hombros) se mueven por una línea a 45° (el riel) que
//     pasa por la cadera: arriba quedan a 0.853 m de ella (rodillas a 15°, sin bloquear) y abajo
//     a 0.608 m (rodillas a 90°). La plataforma recorre 25 cm.
//   - La cara de la plataforma va 33° de la vertical (talon -123) y no perpendicular al riel:
//     con una placa a 45° el tobillo tendría que doblarse 45° abajo. Así llega a 33°.
//   - Respaldo y asiento tocan el cuerpo: el respaldo es el plano de la espalda alta y la
//     pelvis (los glúteos quedan en el hueco entre los dos cojines) y el asiento toca los
//     glúteos. Las manos toman las manillas al lado del asiento, con los codos algo doblados.
//   - Cámaras propias: la persona mira hacia arriba y adelante y el carro queda delante de
//     ella, así que «frente» mira desde adelante y arriba (se ven la cara y las rodillas en la
//     línea de los pies) y «3/4» desde un costado, arriba y un poco atrás. Sin discos: de lado
//     tapaban los pies y la plataforma.

const PIE_ARRIBA = [0.18, 1.195, 0.643];
const PIE_ABAJO = [0.18, 1.02, 0.469];
const piernas = (pie) => ({ pie, talon: -123, polo: [0.12, 0.82, -0.57] });

const sentado = {
  pelvis: { pos: [0, 0.62, 0], cabeceo: -60 },
  columna: { flex: 0 },
  cabeza: { flex: 5 },
  brazos: { mano: [0.3, 0.716, 0.194], polo: [1, -0.2, -0.3], giro: 0 },
  piernas: piernas(PIE_ARRIBA),
};

// Riel: línea a 45° bajo el carro, a ±0.40. giro [-45] deja el largo (Z) del bloque en el riel.
// Parte en el mismo punto bajo de siempre (y 0.645, z 0.36) y termina 15 cm más allá del borde
// alto del carro cuando la plataforma está arriba (y 1.377, z 1.092): así la máquina no se
// come el cuadro.
const riel = (x) => ({ tipo: 'bloque', pos: [x, 1.0113, 0.7263], tam: [0.06, 0.08, 1.035], giro: [-45, 0, 0], color: 'estructura' });

export default {
  id: 'prensa-de-piernas',
  nombre: 'Prensa de piernas',
  ceja: 'Piernas · máquina',
  periodo: 3.4,
  vista: 'lado',
  vistas: { frente: [0, 0.85, -0.45], tres: [0.75, 0.5, -0.3] },
  equipos: [
    // Cojines
    // Respaldo: desde justo sobre los glúteos hasta 13 cm más allá de la coronilla, con un
    // cabecero de 6 cm donde apoya la cabeza (por la curva de la espalda alta, la cabeza neutra
    // queda unos 6 cm delante del plano del respaldo).
    { tipo: 'bloque', pos: [0, 0.703, -0.455], tam: [0.5, 0.91, 0.08], giro: [-60, 0, 0], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, 0.8793, -0.6164], tam: [0.3, 0.2, 0.06], giro: [-60, 0, 0], color: 'tapiz', radio: 0.025 },
    { tipo: 'bloque', pos: [0, 0.461, 0.255], tam: [0.48, 0.08, 0.4], giro: [-15, 0, 0], color: 'tapiz' },   // asiento
    // Estructura del asiento
    { tipo: 'bloque', pos: [0, 0.03, 0.21], tam: [0.5, 0.06, 1.82], color: 'estructura' },                 // base en el suelo
    { tipo: 'bloque', pos: [0, 0.22, 0.26], tam: [0.3, 0.4, 0.28], color: 'estructura' },                  // pedestal del asiento
    { tipo: 'bloque', pos: [0, 0.3, -0.36], tam: [0.08, 0.6, 0.08], color: 'estructura' },                 // apoyo del respaldo
    // Manillas al lado del asiento
    { tipo: 'bloque', pos: [0.3, 0.716, 0.194], tam: [0.03, 0.03, 0.14], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.3, 0.716, 0.194], tam: [0.03, 0.03, 0.14], color: 'fierro' },
    { tipo: 'bloque', pos: [0.3, 0.35, 0.25], tam: [0.035, 0.7, 0.035], color: 'estructura' },
    { tipo: 'bloque', pos: [-0.3, 0.35, 0.25], tam: [0.035, 0.7, 0.035], color: 'estructura' },
    // Rieles a 45° y sus apoyos
    riel(0.4),
    riel(-0.4),
    { tipo: 'bloque', pos: [0, 0.33, 0.37], tam: [0.86, 0.06, 0.06], color: 'estructura' },                 // travesaño bajo
    { tipo: 'bloque', pos: [0.4, 0.33, 0.37], tam: [0.06, 0.6, 0.06], color: 'estructura' },
    { tipo: 'bloque', pos: [-0.4, 0.33, 0.37], tam: [0.06, 0.6, 0.06], color: 'estructura' },
    { tipo: 'bloque', pos: [0.4, 0.705, 1.07], tam: [0.06, 1.41, 0.06], color: 'estructura' },              // parantes del final
    { tipo: 'bloque', pos: [-0.4, 0.705, 1.07], tam: [0.06, 1.41, 0.06], color: 'estructura' },
    // Plataforma y carro: siguen a los pies (origen en el centro de las plantas, Y sale de la planta)
    { tipo: 'bloque', sigue: 'pies', pos: [0, -0.02, 0.02], tam: [0.7, 0.04, 0.58], color: 'fierro' },
    { tipo: 'bloque', sigue: 'pies', pos: [0, -0.1, 0], tam: [0.86, 0.12, 0.5], color: 'estructura' },
  ],
  momentos: [0, 0.28, 0.5],
  cuadros: [
    { t: 0, ...sentado },
    { t: 0.06 },                                  // un instante arriba
    { t: 0.5, piernas: piernas(PIE_ABAJO) },      // baja controlado hasta 90° de rodilla
    { t: 0.55 },
    { t: 0.9, piernas: piernas(PIE_ARRIBA) },     // empuja hasta casi estirar
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Isquiotibiales', 'Aductores', 'Gemelos'],
  pintar: ['cuadriceps', 'gluteos'],
  pintarAyuda: ['isquios', 'gemelos'],
  pasos: [
    [0, 'Espalda y cadera apoyadas, pies al ancho de los hombros en la plataforma.'],
    [0.06, 'Baja la plataforma controlado, con las rodillas en la línea de los pies.'],
    [0.46, 'Abajo, las rodillas llegan a unos 90 grados sin despegar la espalda baja.'],
    [0.55, 'Empuja con todo el pie hasta casi estirar las piernas, sin bloquear las rodillas.'],
  ],
};
