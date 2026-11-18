// Remo con barra. De pie, con el tronco inclinado a 45° y fijo; solo se mueven los brazos y
// las escápulas. La barra va en el mundo y las manos la siguen.
//
// Cómo se calcularon los números (con esqueleto.js, en Node):
//   - Pies algo más abiertos que la cadera (tobillos a ±0.15), puntas 8° afuera, fijos en el
//     suelo. Rodillas a 29° de flexión con la canilla 6° hacia adelante; la cadera queda donde
//     la deja esa rodilla y la pelvis se inclina 46° (columna sin flexión: espalda recta).
//   - Abajo: codos casi rectos (10°) y la barra 3 cm por delante de los muslos, justo sobre las
//     rodillas. Los brazos van un poco hacia atrás para que el peso quede sobre la mitad del
//     pie (el centro de masa con la barra queda en z ≈ 0,08, entre el talón y la punta).
//   - Arriba: la barra toca el abdomen bajo (6 mm de separación), con 99° de codo. Los codos
//     quedan detrás de la espalda y cerca del cuerpo (brazo a 33° del tronco, codo a 26 cm del
//     centro). Las escápulas van adelante abajo y se juntan arriba.
//   - Entre abajo y arriba la barra va en línea recta, hacia arriba y un poco hacia el cuerpo;
//     se revisó que no toque los muslos ni el tronco en ningún instante.

const MANO = 0.29;                      // media distancia entre las manos: justo por fuera de piernas y hombros
const POLO = [0.12, 0.7, -0.7];         // codos hacia el techo y atrás, pegados al cuerpo
const brazos = (y, z) => ({ mano: [MANO, y, z], polo: POLO, giro: -90 });

const postura = {
  pelvis: { pos: [0, 0.93, -0.094], cabeceo: 46 },
  columna: { flex: 0 },
  cabeza: { flex: -15 },                // cuello neutro, mirada al suelo un poco adelante
  piernas: { pie: [0.15, 0.075, 0], abre: 8, polo: [0.2, 0, 1] },
};
const abajo = { ...postura, escapulas: { prot: 0.02, elev: 0 }, brazos: brazos(0.607, 0.14) };
const arriba = { escapulas: { prot: -0.03, elev: 0 }, brazos: brazos(0.888, 0.043) };

export default {
  id: 'remo-con-barra',
  nombre: 'Remo con barra',
  ceja: 'Espalda · barra',
  periodo: 2.8,
  vista: 'tres',
  // De lado, un poco desde atrás: el disco cercano queda por delante del cuerpo y se ven los
  // codos que suben detrás de la espalda.
  vistas: { lado: [1, 0.18, -0.55] },
  equipos: [{ tipo: 'barra', en: 'manos', discos: [0.225] }],
  momentos: [0, 0.23, 0.38],
  cuadros: [
    { t: 0, ...abajo },
    { t: 0.08 },                 // un instante abajo
    { t: 0.38, ...arriba },
    { t: 0.48 },                 // aprieta arriba
    { t: 0.88, ...abajo },       // baja más lento de lo que sube
  ],
  trabajan: ['Dorsal ancho', 'Espalda media', 'Bíceps'],
  ayudan: ['Hombro posterior', 'Espalda baja', 'Isquiotibiales', 'Antebrazos'],
  pintar: ['dorsales', 'trapecio', 'biceps'],
  pintarAyuda: ['hombros', 'lumbares', 'isquios', 'antebrazos'],
  pasos: [
    [0, 'Rodillas algo flexionadas, tronco inclinado a 45 grados con la espalda recta y brazos estirados.'],
    [0.08, 'Tira la barra hacia el abdomen bajo llevando los codos atrás, pegados al cuerpo.'],
    [0.38, 'Arriba, junta las escápulas un instante sin levantar el tronco.'],
    [0.48, 'Baja controlado hasta estirar los brazos, con el tronco quieto.'],
  ],
};
