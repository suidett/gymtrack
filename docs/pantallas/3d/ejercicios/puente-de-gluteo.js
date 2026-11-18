// Puente de glúteo. Boca arriba sobre una colchoneta, rodillas dobladas y pies apoyados; la
// cadera sube hasta que hombros, cadera y rodillas quedan en línea, y baja hasta casi tocar el
// suelo con los glúteos.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Los hombros no se mueven del suelo: el tronco gira alrededor del punto [0, 0.14, -0.1] del
//     tórax (la espalda alta), fijo sobre la colchoneta (y = 0.012, z = -0.3). Para cada cabeceo
//     de la pelvis se buscó su posición; son las cinco FASES, de abajo hacia arriba.
//   - Abajo (cabeceo -94) los glúteos rozan el suelo. Arriba (cabeceo -114) el tronco sube 24
//     grados y los pies están puestos para que el muslo siga esa misma línea con la rodilla a 90.
//   - La cabeza se dobla hacia el pecho lo justo para seguir apoyada en el suelo.
//   - Pies y manos son objetivos fijos en el suelo: no resbalan.

const FASES = [
  { pelvis: { pos: [0, 0.142, 0.132], cabeceo: -94 }, cabeza: { flex: -5 } },
  { pelvis: { pos: [0, 0.180, 0.119], cabeceo: -99 }, cabeza: { flex: 0 } },
  { pelvis: { pos: [0, 0.215, 0.103], cabeceo: -104 }, cabeza: { flex: 8 } },
  { pelvis: { pos: [0, 0.250, 0.083], cabeceo: -109 }, cabeza: { flex: 18 } },
  { pelvis: { pos: [0, 0.282, 0.061], cabeceo: -114 }, cabeza: { flex: 30 } },
];
// Cuadros de un tramo, suaves al partir y al llegar (sin repetir el primero).
const suave = (u) => (1 - Math.cos(Math.PI * u)) / 2;
const tramo = (t0, t1, orden) => orden.slice(1).map((k, i) => ({
  t: t0 + (t1 - t0) * suave((i + 1) / (orden.length - 1)), ...FASES[k],
}));

const abajo = {
  ...FASES[0],
  columna: { flex: 0 },
  // Brazos estirados en el suelo junto al cuerpo, palmas abajo.
  brazos: { mano: [0.27, 0.047, 0.27], polo: [1, 0.3, 0], giro: -90 },
  // Pies al ancho de la cadera; las rodillas apuntan hacia arriba, en la línea de los pies.
  piernas: { pie: [0.12, 0.075, 0.66], abre: 5, polo: [0.05, 1, 0.3] },
};

export default {
  id: 'puente-de-gluteo',
  nombre: 'Puente de glúteo',
  ceja: 'Piernas · peso corporal',
  periodo: 3,
  vista: 'lado',
  // De frente, en diagonal desde los pies y un poco de arriba: recto desde los pies se ven
  // unas piernas gigantes.
  vistas: { frente: [0.55, 0.4, 1] },
  equipos: [{ tipo: 'suelo', colchoneta: { pos: [0, -0.02], tam: [0.62, 1.85] } }],
  momentos: [0, 0.2, 0.4],
  cuadros: [
    { t: 0, ...abajo },
    { t: 0.08 },
    ...tramo(0.08, 0.38, [0, 1, 2, 3, 4]),
    { t: 0.5 },                               // arriba, apretando
    ...tramo(0.5, 1, [4, 3, 2, 1, 0]),        // el último (t = 1) se descarta
  ],
  trabajan: ['Glúteos'],
  ayudan: ['Isquiotibiales', 'Core'],
  pintar: ['gluteos'],
  pasos: [
    [0, 'Acuéstate boca arriba con las rodillas dobladas, los pies apoyados al ancho de la cadera y los brazos en el suelo.'],
    [0.08, 'Empuja con los talones y sube la cadera apretando los glúteos.'],
    [0.36, 'Arriba, hombros, cadera y rodillas quedan en línea, sin arquear la zona lumbar.'],
    [0.5, 'Baja lento hasta que los glúteos casi toquen el suelo.'],
  ],
};
