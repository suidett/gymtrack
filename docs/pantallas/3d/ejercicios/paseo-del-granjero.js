// Paseo del granjero. De pie, con una kettlebell pesada en cada mano colgando a los costados,
// camina con pasos cortos y firmes manteniendo el tronco derecho, sin inclinarse hacia ningún
// lado. La animación da tres pasos (izquierdo, derecho y junta el izquierdo), se queda quieta
// un momento y vuelve a empezar desde el punto de partida.
//
// Cómo está hecho:
//   - Los pies son objetivos fijos en el mundo mientras apoyan (no resbalan). Al despegar, el
//     talón sube con la bola del pie fija (despegue) y después el pie viaja por el aire unos
//     9 cm sobre el suelo, al lado del pie de apoyo, y baja casi vertical (talón primero)
//     hasta quedar plano 45 cm más adelante.
//   - La pelvis avanza todo el tiempo: más alta cuando apoya un solo pie y más baja con los dos
//     pies en el suelo, y se corre 3 cm hacia el pie de apoyo.
//   - Tronco derecho, pecho arriba y hombros abajo y atrás. Las manos van en el marco del tórax,
//     a los costados y un poco separadas del muslo; las kettlebells cuelgan hacia abajo.
//   - Al terminar el ciclo la figura vuelve de golpe al punto de partida (salto de 0.9 m en
//     menos de 20 ms): una animación que se repite no puede avanzar para siempre. La revisión
//     automática lo marca como «pie que resbala» en t = 1; no es un deslizamiento, es el corte.

const BOLA = [0, -0.075, 0.135];          // bola del pie respecto del tobillo (pie plano)
const R = Math.PI / 180;
// Tobillo con el talón levantado `th` grados y la bola del pie fija en (x, z de la bola).
const despegue = (x, zBola, th) => ({
  pie: [x, +(0.075 * Math.cos(th * R) + 0.135 * Math.sin(th * R)).toFixed(4),
    +(zBola + 0.075 * Math.sin(th * R) - 0.135 * Math.cos(th * R)).toFixed(4)],
  talon: th,
});
const plano = (x, z) => ({ pie: [x, 0.075, z], talon: 0 });
const aire = (x, y, z, th = 5) => ({ pie: [x, y, z], talon: th });

const X = 0.11;                // medio ancho entre los pies
const Z0 = -0.45;              // parte 45 cm atrás para que el recorrido quede centrado
const POLO = [0.15, 0, 1];     // rodillas hacia adelante
const pierna = (p) => ({ ...p, polo: POLO });
const izq = (p) => ({ piernaIzq: pierna(p) });
const der = (p) => ({ piernaDer: pierna(p) });
const pelvis = (x, y, z) => ({ pelvis: { pos: [x, y, z], cabeceo: 3 } });

const dePie = {
  ...pelvis(0, 0.982, Z0 + 0.03),
  columna: { flex: -3 },
  cabeza: { flex: 0 },
  escapulas: { prot: -0.01 },
  brazos: { mano: { en: 'torax', pos: [0.27, -0.455, 0.0] }, polo: [0.3, 0, -1], giro: 0 },
  ...izq(plano(X, Z0)),
  ...der(plano(-X, Z0)),
};

export default {
  id: 'paseo-del-granjero',
  nombre: 'Paseo del granjero',
  ceja: 'Core · kettlebell',
  periodo: 3.6,
  vista: 'lado',
  equipos: [{ tipo: 'kettlebell', mano: 'izq', cuelga: true }, { tipo: 'kettlebell', mano: 'der', cuelga: true }],
  momentos: [0, 0.2, 0.43],
  cuadros: [
    { t: 0, ...dePie },
    { t: 0.06 },
    // Paso 1: el pie izquierdo avanza 45 cm.
    { t: 0.12, ...pelvis(-0.03, 0.98, Z0 + 0.05), ...izq(despegue(X, Z0 + 0.135, 15)) },
    { t: 0.19, ...pelvis(-0.03, 0.975, Z0 + 0.12), ...izq(aire(X, 0.165, Z0 + 0.22)) },
    { t: 0.25, ...pelvis(-0.015, 0.96, Z0 + 0.2), ...izq(aire(X, 0.1, Z0 + 0.435, -8)) },
    { t: 0.28, ...pelvis(0, 0.95, Z0 + 0.24), ...izq(plano(X, Z0 + 0.45)) },
    // Paso 2: el derecho pasa al lado del izquierdo y cae 45 cm más adelante.
    { t: 0.35, ...pelvis(0.03, 0.955, Z0 + 0.33), ...der(despegue(-X, Z0 + 0.135, 15)) },
    { t: 0.42, ...pelvis(0.03, 0.975, Z0 + 0.48), ...der(aire(-X, 0.17, Z0 + 0.6)) },
    { t: 0.48, ...pelvis(0.015, 0.96, Z0 + 0.64), ...der(aire(-X, 0.1, Z0 + 0.885, -8)) },
    { t: 0.51, ...pelvis(0, 0.95, Z0 + 0.69), ...der(plano(-X, Z0 + 0.9)) },
    // Paso 3: el izquierdo se junta con el derecho y queda de pie.
    { t: 0.58, ...pelvis(-0.03, 0.955, Z0 + 0.77), ...izq(despegue(X, Z0 + 0.585, 15)) },
    { t: 0.65, ...pelvis(-0.03, 0.98, Z0 + 0.87), ...izq(aire(X, 0.15, Z0 + 0.74)) },
    { t: 0.71, ...pelvis(-0.01, 0.98, Z0 + 0.91), ...izq(aire(X, 0.1, Z0 + 0.885, -8)) },
    { t: 0.74, ...pelvis(0, 0.982, Z0 + 0.93), ...izq(plano(X, Z0 + 0.9)) },
    // Quieto hasta casi el final y vuelve de golpe al punto de partida (no se desliza).
    { t: 0.996 },
  ],
  trabajan: ['Abdomen', 'Oblicuos', 'Antebrazos'],
  ayudan: ['Trapecio', 'Glúteos', 'Piernas'],
  pintar: ['abdomen', 'antebrazos'],
  pasos: [
    [0, 'De pie, una kettlebell en cada mano a los costados, pecho arriba y hombros abajo.'],
    [0.06, 'Camina con pasos cortos y firmes, apoyando todo el pie.'],
    [0.35, 'Mantén el tronco derecho: que el peso no te incline hacia ningún lado.'],
    [0.74, 'Al final del recorrido, detente quieto antes de dejar las pesas en el suelo.'],
  ],
};
