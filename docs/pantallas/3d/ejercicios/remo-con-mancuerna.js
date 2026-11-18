// Remo con mancuerna, con rodilla y mano apoyadas en una banca plana. Rodilla y mano derechas
// sobre la banca, pie izquierdo en el suelo y la mano izquierda rema.
//
// Cómo está hecho:
//   - La banca del motor va centrada en x = 0, así que la figura se corre a la izquierda
//     (pelvis en x = 0.13): rodilla y mano derechas quedan sobre el cojín.
//   - Tronco quieto y casi paralelo al suelo (la línea de la espalda sube unos 10 grados hacia
//     la cabeza). Con la rodilla en la banca la cadera no puede subir más, así que lo que baja
//     son los hombros: la mano de apoyo va un poco adelante del hombro, con el brazo firme.
//     Todo lo que apoya va fijo en el mundo (rodilla y canilla en la banca, pie izquierdo,
//     mano derecha): no resbala nada.
//   - El pie derecho cuelga fuera del borde de la banca (la banca termina justo en el tobillo).
//   - La mancuerna va con agarre neutro (giro 0) y sube en arco hacia la cadera, con el codo
//     pegado al cuerpo. Arriba la mancuerna queda junto a la cadera y el codo unos 10 cm sobre
//     la línea de la espalda. Las escápulas se abren abajo (prot +) y
//     se juntan arriba (prot -).

const base = {
  pelvis: { pos: [0.13, 0.925, 0], cabeceo: 78 },
  columna: { flex: 0 },
  cabeza: { flex: -12 },
  // Rodilla derecha sobre la banca y canilla apoyada hacia atrás; el pie cuelga del borde.
  piernaDer: { pie: [0.0, 0.475, -0.478], polo: [0, -1, 0.6], talon: 138 },
  // Pie izquierdo plano en el suelo, al lado de la banca, con la rodilla suelta.
  piernaIzq: { pie: [0.36, 0.075, 0.06], abre: 5, polo: [0.2, 0, 1] },
  // Mano derecha apoyada en la banca, un poco adelante del hombro, con el brazo firme.
  brazoDer: { mano: [-0.04, 0.475, 0.74], polo: [-0.3, 0.2, -1], giro: 0 },
};

const POLO = [0.1, 0.53, -0.84]; // codo hacia atrás y arriba, pegado al cuerpo
const rema = (pos, prot) => ({ escapulas: { prot }, brazoIzq: { mano: pos, polo: POLO, giro: 0 } });

export default {
  id: 'remo-con-mancuerna',
  nombre: 'Remo con mancuerna',
  ceja: 'Espalda · mancuerna',
  periodo: 3,
  vista: 'tres',
  equipos: [
    { tipo: 'banca', alto: 0.43, z: 0.16, largo: 1.24, ancho: 0.28 },
    { tipo: 'mancuernas', mano: 'izq' },
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...base, ...rema([0.33, 0.4, 0.46], 0.012) },
    { t: 0.08 },
    { t: 0.24, ...rema([0.35, 0.68, 0.3], 0) },
    { t: 0.42, ...rema([0.36, 0.9, 0.03], -0.015) },
    { t: 0.52 },                 // aprieta arriba
    { t: 0.76, ...rema([0.35, 0.64, 0.33], 0.006) },
  ],
  trabajan: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
  ayudan: ['Bíceps', 'Hombro posterior', 'Antebrazos', 'Core'],
  pintar: ['dorsales', 'trapecio'],
  pasos: [
    [0, 'Rodilla y mano del mismo lado en la banca, espalda recta y la mancuerna colgando bajo el hombro.'],
    [0.08, 'Tira la mancuerna hacia la cadera, con el codo pegado al cuerpo y hacia atrás.'],
    [0.4, 'Arriba, junta la escápula a la columna sin girar el tronco.'],
    [0.52, 'Baja controlado hasta estirar el brazo y sentir el estiramiento en la espalda.'],
  ],
};
