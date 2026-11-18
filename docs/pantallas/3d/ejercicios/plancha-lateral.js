// Plancha lateral sobre el antebrazo. Es un ejercicio de mantener la posición: la animación
// parte acostada de lado con la cadera abajo, la sube hasta dejar el cuerpo recto, aguanta la
// mayor parte del ciclo y vuelve a bajar.
//
// Cómo está hecho:
//   - Apoya el lado izquierdo: pelvis con alabeo (inclinada a la izquierda), cabeza hacia +X y
//     pecho hacia +Z, así de frente se ve la línea completa del cuerpo.
//   - Fijos en el mundo: el codo izquierdo en [0, 0.045, 0] con el antebrazo apoyado hacia
//     adelante (puño en [0, 0.045, 0.33]) y el tobillo de abajo en [-1.336, 0.066, 0]. El pie de
//     arriba va sobre el de abajo.
//   - Piernas por ángulos (rectas, juntas), para que los pies queden de canto en el suelo. Para
//     cada alabeo, la pelvis se calculó desde el tobillo fijo, y la flexión lateral de la
//     columna (lado) desde el codo fijo: el hombro queda siempre a un brazo (0.31 m) del codo.
//     El polo del codo apunta del hombro al codo, así el codo no se desliza.
//   - Arriba: alabeo 71.4, columna recta; hombro sobre el codo y cuerpo en línea. Abajo: alabeo
//     85, la cadera casi toca el suelo y la cintura se dobla de lado (descanso).
//   - La mano derecha va en la cadera (marco de la pelvis).

const PUNO = [0, 0.045, 0.33];
const brazoIzq = (polo) => ({ mano: PUNO, polo, giro: 0 });
const paso = (a, pos, lado, polo, cabeza = 0) => ({
  pelvis: { pos, alabeo: a }, columna: { lado }, cabeza: { lado: cabeza }, brazoIzq: brazoIzq(polo),
});

const abajo = paso(85, [-0.4344, 0.1828, 0], -47.5, [-0.0554, -0.3047, 0], 14);
const medio = paso(78.2, [-0.4546, 0.2888, 0], -23.6, [-0.0469, -0.3066, 0], 7);
const arriba = paso(71.4, [-0.4871, 0.3916, 0], 0, [0, -0.3101, 0], 0);

const fijo = {
  piernas: { cadera: [0, -3.5, 0], rodilla: 0, tobillo: 0 },
  brazoDer: { mano: { en: 'pelvis', pos: [-0.2, 0.03, 0.02] }, polo: [-0.3, 0.3, -1], giro: 0 },
};

export default {
  id: 'plancha-lateral',
  nombre: 'Plancha lateral',
  ceja: 'Core · peso corporal',
  periodo: 7,
  vista: 'frente',
  // De lado, en diagonal y un poco de arriba: recto desde la cabeza, la cabeza tapa todo.
  vistas: { lado: [1, 0.4, 0.55] },
  equipos: [{ tipo: 'suelo', colchoneta: { pos: [-0.6, 0.08], tam: [1.9, 0.62] } }],
  momentos: [0, 0.19, 0.5],
  cuadros: [
    { t: 0, ...fijo, ...abajo },
    { t: 0.08 },
    { t: 0.19, ...medio },
    { t: 0.3, ...arriba },
    { t: 0.8 },                 // aguanta
    { t: 0.87, ...medio },
    { t: 0.94, ...abajo },
  ],
  trabajan: ['Oblicuos', 'Transverso abdominal'],
  ayudan: ['Glúteo medio', 'Hombros', 'Espalda baja'],
  pintar: ['abdomen', 'lumbares'],
  pasos: [
    [0, 'De lado, con el codo justo bajo el hombro, el antebrazo apoyado y las piernas juntas.'],
    [0.08, 'Sube la cadera hasta dejar el cuerpo recto de la cabeza a los pies.'],
    [0.3, 'Mantén la posición sin dejar caer la cadera. Respira normal.'],
    [0.8, 'Al terminar el tiempo, baja la cadera con control y cambia de lado.'],
  ],
};
