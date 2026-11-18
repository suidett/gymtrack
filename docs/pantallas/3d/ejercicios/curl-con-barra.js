// Curl de bíceps con barra, de pie. Los brazos van por ángulos (como curl-con-mancuernas): el
// hombro casi no se mueve, los codos quedan pegados al costado y solo se dobla el codo. Agarre
// supino (palmas hacia adelante) al ancho de los hombros; la barra va entre los dos puños.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Pies fijos a ±0.12, rodillas casi estiradas (pelvis a 0.983); el tronco no se mueve.
//   - Abajo el brazo va 5° adelante y el codo 10° doblado: la barra queda frente a los
//     muslos, rozándolos, sin atravesarlos.
//   - Arriba, 135° de codo con el hombro solo 12° adelante: la barra llega frente a la parte alta
//     del pecho, separada de él. No se sube más para no sacar los codos hacia adelante.

const brazo = (fl, codo) => ({ hombro: [fl, 5, 0], codo, giro: 90 });

const quieto = {
  pelvis: { pos: [0, 0.983, 0] },
  cabeza: { flex: 4 },
  piernas: { pie: [0.12, 0.075, 0], abre: 8 },
};

export default {
  id: 'curl-con-barra',
  nombre: 'Curl con barra',
  ceja: 'Brazos · barra',
  periodo: 3.2,
  vista: 'tres',
  // De lado justo, el disco cercano tapa los brazos: la cámara se corre un poco hacia adelante.
  vistas: { lado: [1, 0.14, 0.5] },
  equipos: [{ tipo: 'barra', en: 'manos', discos: [0.12] }],
  momentos: [0, 0.2, 0.4],
  cuadros: [
    { t: 0, ...quieto, brazos: brazo(5, 10) },
    { t: 0.06 },                                  // un instante abajo
    { t: 0.2, brazos: brazo(7, 85) },
    { t: 0.4, brazos: brazo(12, 135) },
    { t: 0.48 },                                  // arriba, aprieta
    { t: 0.72, brazos: brazo(7, 85) },            // baja más lento que sube
    { t: 0.94, brazos: brazo(5, 12) },
  ],
  trabajan: ['Bíceps'],
  ayudan: ['Braquial', 'Antebrazos'],
  pintar: ['biceps'],
  pasos: [
    [0, 'De pie, toma la barra con las palmas hacia adelante, al ancho de los hombros.'],
    [0.06, 'Sube la barra doblando los codos, sin despegarlos del cuerpo ni balancearte.'],
    [0.4, 'Arriba, la barra queda frente al pecho. Aprieta el bíceps un instante.'],
    [0.48, 'Baja lento hasta estirar los brazos, sin soltar la tensión.'],
  ],
};
