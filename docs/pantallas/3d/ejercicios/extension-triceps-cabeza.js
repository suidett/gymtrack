// Extensión de tríceps sobre la cabeza con una mancuerna tomada con las dos manos, de pie. Los
// brazos quedan casi verticales junto a la cabeza, con los codos apuntando arriba; solo se
// dobla el codo para bajar la mancuerna detrás de la cabeza y volver a estirar.
//
// Cómo está hecho:
//   - Pies fijos a ±0.13, rodillas apenas sueltas y el tronco quieto. Hombros un poco subidos
//     (escápulas elev 0.03), como pasa con los brazos arriba.
//   - El codo es un punto fijo (calculado con esqueleto.js: el brazo de 0.31 m sale del hombro
//     casi vertical, un poco hacia adentro y adelante). Las manos dan vuelta alrededor de él en
//     el plano x = ±0.045 (los dos puños juntos al centro), con la función `mano`; el polo del
//     codo es la dirección del hombro al codo, así el codo no se mueve.
//   - Arriba el codo queda casi recto (15°); abajo, 132°: las manos quedan detrás de la nuca y
//     el antebrazo pasa a más de 4 cm de la cabeza.
//   - El motor no trae una mancuerna para las dos manos: se arma con bloques que siguen a las
//     manos ('manos': origen entre los puños, Y hacia arriba). Cuelga vertical, con el disco de
//     arriba apoyado en las palmas.

const RAD = Math.PI / 180;
const HOMBRO = [0.19, 1.455, 0];
const CODO = [0.1593, 1.7625, 0.0246];
const HX = 0.045;                                     // media distancia entre los puños
const R = Math.sqrt(0.33 ** 2 - (CODO[0] - HX) ** 2); // radio del giro de la mano en x = HX
const POLO = [CODO[0] - HOMBRO[0], CODO[1] - HOMBRO[1], CODO[2] - HOMBRO[2]];
// Mano con el antebrazo girado f grados desde arriba hacia atrás.
const mano = (f) => ({ mano: [HX, +(CODO[1] + R * Math.cos(f * RAD)).toFixed(4), +(CODO[2] - R * Math.sin(f * RAD)).toFixed(4)], polo: POLO, giro: 0 });

const ARRIBA = -6, ABAJO = 134;
// Cuadros intermedios para que la mano siga el arco alrededor del codo (con dos cuadros iría
// por la cuerda y el codo se movería). Suave al partir y al llegar.
const arco = (t0, t1, f0, f1, n = 6) => Array.from({ length: n }, (_, k) => {
  const u = (k + 1) / n, e = (1 - Math.cos(Math.PI * u)) / 2;
  return { t: +(t0 + (t1 - t0) * u).toFixed(4), brazos: mano(f0 + (f1 - f0) * e) };
});

const dePie = {
  pelvis: { pos: [0, 0.975, 0] },
  columna: { flex: 0 },
  cabeza: { flex: 6 },
  escapulas: { elev: 0.03 },
  piernas: { pie: [0.13, 0.075, 0], abre: 8 },
};

// La mancuerna: mango vertical entre los puños y un disco arriba y otro abajo.
const pieza = (pos, tam, radio) => ({ tipo: 'bloque', sigue: 'manos', pos, tam, color: 'fierro', radio });

export default {
  id: 'extension-triceps-cabeza',
  nombre: 'Extensión de tríceps sobre la cabeza',
  ceja: 'Brazos · mancuerna',
  periodo: 3.4,
  vista: 'lado',
  equipos: [
    pieza([0, -0.055, 0], [0.032, 0.21, 0.032], 0.012),
    pieza([0, 0.065, 0], [0.13, 0.045, 0.13], 0.02),
    pieza([0, -0.175, 0], [0.13, 0.045, 0.13], 0.02),
  ],
  momentos: [0, 0.24, 0.46],
  cuadros: [
    { t: 0, ...dePie, brazos: mano(ARRIBA) },
    { t: 0.06 },                                   // un instante arriba
    ...arco(0.06, 0.46, ARRIBA, ABAJO),            // baja controlado
    { t: 0.52 },                                   // abajo, estira el tríceps
    ...arco(0.52, 0.86, ABAJO, ARRIBA),            // sube y queda arriba hasta que vuelve el ciclo
  ],
  trabajan: ['Tríceps'],
  ayudan: ['Hombros', 'Core'],
  pintar: ['triceps'],
  pasos: [
    [0, 'De pie, sostén una mancuerna con las dos manos sobre la cabeza, brazos estirados.'],
    [0.06, 'Baja la mancuerna detrás de la cabeza doblando los codos, que siguen apuntando arriba.'],
    [0.44, 'Abajo, siente el estiramiento del tríceps sin abrir los codos.'],
    [0.52, 'Estira los codos hasta volver arriba, con el abdomen firme y sin arquear la espalda.'],
  ],
};
