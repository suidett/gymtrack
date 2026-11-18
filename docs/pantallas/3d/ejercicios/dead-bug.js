// Dead bug. Acostado de espalda sobre una colchoneta: brazos hacia el techo y caderas y
// rodillas en 90 grados. Se estiran a la vez el brazo y la pierna contrarios, sin tocar el
// suelo, y se vuelve al centro; después el otro par.
//
// Cómo está hecho:
//   - Pelvis con cabeceo -94 y a 0.152 m: glúteos, espalda alta y cabeza quedan apoyados en la
//     colchoneta (12 mm). La espalda baja no se despega en todo el ciclo. Con ese cabeceo la
//     pelvis queda 4 grados más allá de horizontal, por eso los 86 grados de cadera y de hombro
//     dejan el muslo y el brazo verticales.
//   - Brazos y piernas por ángulos (no apoyan en nada). El brazo va de 86 a 172 grados de
//     flexión: la mano queda unos 12 cm sobre el suelo, detrás de la cabeza. La pierna se estira
//     entera (cadera en 0): queda 4 grados sobre horizontal y el talón unos 16 cm sobre el suelo.

const arriba = { hombro: [86, 0, 0], codo: 0 };          // brazo vertical, hacia el techo
const atras = { hombro: [172, 0, 0], codo: 0 };          // brazo estirado sobre la cabeza
const mesa = { cadera: [86, 0, 0], rodilla: 90, tobillo: 0 };   // muslo vertical y canilla horizontal
const estirada = { cadera: [0, 0, 0], rodilla: 0, tobillo: 0 };

const base = {
  pelvis: { pos: [0, 0.152, 0], cabeceo: -94 },
  columna: { flex: 0 },
  cabeza: { flex: -12 },
};

export default {
  id: 'dead-bug',
  nombre: 'Dead bug',
  ceja: 'Core · peso corporal',
  periodo: 6.4,
  vista: 'tres',
  // De frente, en diagonal desde los pies y un poco de arriba, para que se vea el cruce de
  // brazo y pierna (recto desde los pies solo se ven dos piernas enormes).
  vistas: { frente: [0.55, 0.45, 1] },
  equipos: [{ tipo: 'suelo', colchoneta: { pos: [0, -0.05], tam: [0.62, 1.9] } }],
  momentos: [0, 0.15, 0.27],
  cuadros: [
    { t: 0, ...base, brazoIzq: arriba, brazoDer: arriba, piernaIzq: mesa, piernaDer: mesa },
    { t: 0.05 },
    // Brazo derecho atrás y pierna izquierda adelante.
    { t: 0.25, brazoDer: atras, piernaIzq: estirada },
    { t: 0.3 },
    { t: 0.48, brazoDer: arriba, piernaIzq: mesa },
    { t: 0.55 },
    // Ahora el brazo izquierdo y la pierna derecha.
    { t: 0.75, brazoIzq: atras, piernaDer: estirada },
    { t: 0.8 },
    // vuelve al centro en t = 1
  ],
  trabajan: ['Abdomen', 'Transverso abdominal'],
  ayudan: ['Oblicuos', 'Flexores de cadera'],
  pintar: ['abdomen'],
  pasos: [
    [0, 'De espalda, brazos estirados hacia el techo y caderas y rodillas en 90 grados.'],
    [0.05, 'Estira a la vez un brazo hacia atrás y la pierna contraria hacia adelante, sin tocar el suelo.'],
    [0.3, 'Vuelve al centro despacio, con la espalda baja pegada al suelo.'],
    [0.55, 'Repite con el otro brazo y la otra pierna, alternando.'],
  ],
};
