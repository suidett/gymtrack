// Press francés con barra, acostado en una banca plana (extensión de tríceps acostado). Misma
// postura que el press banca; los brazos van por ángulos en el marco del tórax: el brazo queda
// quieto, apenas inclinado hacia la cabeza, y solo se dobla el codo para bajar la barra hacia la
// frente y volver a estirar.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Banca de 0.43 m y cuerpo apoyado como en ejercicios/press-de-banca.js.
//   - En el marco del tórax acostado, 80° de flexión del hombro es el brazo vertical; con 88°
//     el brazo queda unos 8° inclinado hacia la cabeza, que mantiene la tensión arriba. Arriba
//     la barra queda sobre el mentón.
//   - Agarre cerrado (los puños a ±0.16) y codos apuntando al techo, sin abrirse.
//   - Abajo, 118° de codo: la barra queda a unos 3 cm de la frente, sin tocarla (14 cm del
//     centro de la cabeza).

const brazo = (codo) => ({ hombro: [88, -3, 0], codo, giro: -90 });

const acostado = {
  pelvis: { pos: [0, 0.58, 0.3], cabeceo: -82 },
  columna: { flex: -18 },
  cabeza: { flex: -4 },
  escapulas: { prot: -0.02 },
  // Pies planos a ±0.24, rodillas a ±0.27: de frente no se abren como rana.
  piernas: { pie: [0.24, 0.075, 0.6], abre: 8, polo: [0.12, 1, 0.4] },
};

export default {
  id: 'press-frances',
  nombre: 'Press francés',
  ceja: 'Brazos · barra',
  periodo: 3.2,
  vista: 'lado',
  // De lado justo, el disco cercano tapa la cabeza: la cámara se corre un poco hacia los pies.
  // De frente, desde los pies y arriba, para que no se vea la entrepierna.
  vistas: { lado: [1, 0.2, 0.35], frente: [0, 0.9, 0.6] },
  equipos: [
    { tipo: 'banca', alto: 0.43, z: -0.05, largo: 1.2, ancho: 0.28 },
    { tipo: 'barra', en: 'manos', discos: [0.12] },
  ],
  momentos: [0, 0.24, 0.44],
  cuadros: [
    { t: 0, ...acostado, brazos: brazo(8) },
    { t: 0.06 },                               // un instante arriba
    { t: 0.24, brazos: brazo(60) },
    { t: 0.44, brazos: brazo(118) },
    { t: 0.52 },                               // abajo, sin apoyar
    { t: 0.76, brazos: brazo(55) },
  ],
  trabajan: ['Tríceps'],
  ayudan: ['Antebrazos'],
  pintar: ['triceps'],
  pasos: [
    [0, 'Acostado en la banca, la barra arriba con los brazos estirados y las manos al ancho de los hombros.'],
    [0.06, 'Baja la barra hacia la frente doblando solo los codos; los brazos no se mueven.'],
    [0.42, 'Abajo, la barra queda justo sobre la frente y los codos apuntan al techo.'],
    [0.52, 'Estira los codos y vuelve a subir la barra hasta arriba.'],
  ],
};
