// Pájaros (vuelos posteriores) con mancuernas, de pie e inclinado hacia adelante.
//
// Cómo está hecho:
//   - Bisagra de cadera: tronco a unos 70° de la vertical con la espalda recta, rodillas
//     algo dobladas y pies fijos en el suelo. El tronco no se mueve en todo el ciclo.
//   - Las manos van en el marco 'torax' (sigue al tronco): abajo cuelgan bajo el pecho y arriba
//     quedan hacia los lados, a la altura de los hombros, con los codos apenas doblados y
//     apuntando hacia arriba. Agarre neutro: el mango apunta hacia la cabeza.

const inclinado = {
  pelvis: { pos: [0, 0.9, -0.17], cabeceo: 65 },
  columna: { flex: 5 },
  cabeza: { flex: -12 },
  piernas: { pie: [0.13, 0.075, 0.02], abre: 8, polo: [0.15, 0, 1] },
};

const GIRO = 90;
const abajo = { mano: { en: 'torax', pos: [0.13, -0.073, 0.588] }, polo: [1, -0.3, 0], giro: GIRO };
const medio = { mano: { en: 'torax', pos: [0.637, -0.003, 0.42] }, polo: [0.6, 0.2, -0.6], giro: GIRO };
const arriba = { mano: { en: 'torax', pos: [0.82, 0.2, 0.02] }, polo: [0.15, 0.34, -0.94], giro: GIRO };

export default {
  id: 'pajaros',
  nombre: 'Pájaros',
  ceja: 'Hombros · mancuernas',
  periodo: 3,
  vista: 'frente',
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.22, 0.4],
  cuadros: [
    { t: 0, ...inclinado, brazos: abajo },
    { t: 0.06 },
    { t: 0.22, brazos: medio },
    { t: 0.4, brazos: arriba },
    { t: 0.47 },
    { t: 0.72, brazos: medio },
  ],
  trabajan: ['Hombro posterior'],
  ayudan: ['Trapecio medio', 'Romboides', 'Espalda baja'],
  pintar: ['hombros'],
  pasos: [
    [0, 'Inclinado desde la cadera con la espalda recta, mancuernas colgando bajo el pecho.'],
    [0.06, 'Abre los brazos hacia los lados con los codos apenas doblados.'],
    [0.38, 'Arriba, los brazos quedan en línea con los hombros, sin mover el tronco.'],
    [0.47, 'Baja lento y controlado hasta que las mancuernas vuelvan a colgar.'],
  ],
};
