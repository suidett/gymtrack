// Curl de bíceps con mancuernas, de pie, los dos brazos a la vez. Los brazos van por ángulos:
// el hombro casi no se mueve (codos fijos al costado) y solo cambian la flexión del codo y el
// giro del antebrazo, que pasa de martillo (palma hacia el cuerpo) a supino (palma arriba).
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Pies fijos a ±0.12, rodillas casi estiradas (pelvis a 0.983); el tronco no se mueve.
//   - Brazo 6° separado del cuerpo: el codo queda junto al tronco (x 0.22) y la mancuerna
//     no toca el muslo al bajar.
//   - Abajo el codo queda casi recto (8°), sin trabarlo. A 90° de flexión el antebrazo ya giró
//     casi entero (75°) y el mango va cruzado. Arriba, 143° de flexión: la mancuerna llega a unos
//     3 cm bajo el hombro y 20 cm adelante, con el codo apenas 5° adelante.

const brazo = (hombro, codo, giro) => ({ hombro, codo, giro });

const quieto = {
  pelvis: { pos: [0, 0.983, 0] },
  cabeza: { flex: 4 },
  piernas: { pie: [0.12, 0.075, 0], abre: 8 },
};

export default {
  id: 'curl-con-mancuernas',
  nombre: 'Curl con mancuernas',
  ceja: 'Brazos · mancuernas',
  periodo: 3.2,
  vista: 'tres',
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.2, 0.4],
  cuadros: [
    { t: 0, ...quieto, brazos: brazo([0, 6, 0], 8, 0) },
    { t: 0.06 },                                         // un instante abajo
    { t: 0.2, brazos: brazo([1, 6, 0], 90, 75) },
    { t: 0.4, brazos: brazo([5, 6, 0], 143, 90) },
    { t: 0.48 },                                         // arriba, aprieta
    { t: 0.72, brazos: brazo([1, 6, 0], 90, 80) },       // baja más lento que sube
    { t: 0.94, brazos: brazo([0, 6, 0], 10, 10) },
  ],
  trabajan: ['Bíceps'],
  ayudan: ['Braquial', 'Antebrazos'],
  pintar: ['biceps'],
  pintarAyuda: ['antebrazos'],
  pasos: [
    [0, 'De pie, una mancuerna en cada mano, brazos al costado y palmas mirando hacia el cuerpo.'],
    [0.06, 'Sube doblando los codos sin despegarlos del cuerpo y gira las palmas hacia arriba.'],
    [0.4, 'Arriba, las mancuernas quedan cerca de los hombros. Aprieta el bíceps un instante.'],
    [0.48, 'Baja lento hasta estirar los brazos, sin balancear el cuerpo.'],
  ],
};
