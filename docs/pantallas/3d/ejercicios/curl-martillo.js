// Curl martillo con mancuernas, de pie, los dos brazos a la vez. Igual que el curl con
// mancuernas, pero el antebrazo no gira: el agarre es neutro todo el recorrido (palmas mirando
// hacia el cuerpo y el mango apuntando hacia adelante, como si se sostuviera un martillo).
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Pies fijos a ±0.12, rodillas casi estiradas (pelvis a 0.983); el tronco no se mueve.
//   - Brazo 6° separado del cuerpo: la mancuerna pasa por el costado del muslo sin tocarlo.
//   - Abajo el codo queda casi recto (8°). Arriba, 132° de flexión con el hombro solo 6°
//     adelante: la mancuerna llega frente al hombro sin chocar con él.

const brazo = (hombro, codo) => ({ hombro, codo, giro: 0 });

const quieto = {
  pelvis: { pos: [0, 0.983, 0] },
  cabeza: { flex: 4 },
  piernas: { pie: [0.12, 0.075, 0], abre: 8 },
};

export default {
  id: 'curl-martillo',
  nombre: 'Curl martillo',
  ceja: 'Brazos · mancuernas',
  periodo: 3.2,
  vista: 'tres',
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.2, 0.4],
  cuadros: [
    { t: 0, ...quieto, brazos: brazo([0, 6, 0], 8) },
    { t: 0.06 },                                     // un instante abajo
    { t: 0.2, brazos: brazo([2, 6, 0], 80) },
    { t: 0.4, brazos: brazo([6, 6, 0], 132) },
    { t: 0.48 },                                     // arriba, aprieta
    { t: 0.72, brazos: brazo([2, 6, 0], 80) },       // baja más lento que sube
    { t: 0.94, brazos: brazo([0, 6, 0], 10) },
  ],
  trabajan: ['Braquial', 'Braquiorradial'],
  ayudan: ['Bíceps'],
  pintar: ['antebrazos', 'biceps'],
  pasos: [
    [0, 'De pie, una mancuerna en cada mano y las palmas mirando hacia el cuerpo.'],
    [0.06, 'Sube doblando los codos sin girar las muñecas: el pulgar apunta hacia arriba.'],
    [0.4, 'Arriba, las mancuernas quedan frente a los hombros, con los codos pegados al cuerpo.'],
    [0.48, 'Baja lento hasta estirar los brazos, sin balancear el cuerpo.'],
  ],
};
