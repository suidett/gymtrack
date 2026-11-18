// Jalón al pecho en polea alta. Sentado, con los muslos bajo el rodillo, tira la barra desde
// arriba (brazos estirados) hasta la parte alta del pecho.
//
// Cómo está hecho:
//   - La torre de la polea hace de columna de la máquina: queda delante, entre las piernas, y la
//     roldana arriba, casi sobre la barra, así el cable baja casi vertical.
//   - Asiento, rodillo para los muslos y la viga del piso son bloques fijos.
//   - Pies fijos en el suelo; la pelvis apenas se inclina atrás (de -8° a -16°): el tronco no
//     se balancea, solo se echa un poco atrás para que la barra pase frente a la cara.
//   - La barra va por el mundo (las manos la siguen): baja en línea casi recta hasta tocar
//     arriba del esternón. Arriba las escápulas suben (elev +) y abajo bajan y se juntan.

const H = 0.47; // cara de arriba del asiento

const PELVIS = [0, 0.64, 0.06];

const sentado = {
  cabeza: { flex: 4 },
  piernas: { pie: [0.2, 0.075, 0.55], abre: 12, polo: [0.35, 0.3, 1] },
};

const AGARRE = 0.38;
const POLO = [0.7, -1, -0.15]; // codos hacia abajo y afuera, apenas atrás
const barra = (y, z, elev, prot, cabeceo, flex) => ({
  pelvis: { pos: PELVIS, cabeceo },
  columna: { flex },
  escapulas: { elev, prot },
  brazos: { mano: [AGARRE, y, z], polo: POLO, giro: -90 },
});

export default {
  id: 'jalon-al-pecho',
  nombre: 'Jalón al pecho',
  ceja: 'Espalda · polea',
  periodo: 3.2,
  vista: 'tres',
  // De frente la torre tapa el pecho: la cámara se corre un poco al lado y arriba.
  // La 3/4 por defecto mira desde atrás, para que se vean los dorsales sin la columna de la torre.
  vistas: { frente: [0.36, 0.3, 1], tres: [0.7, 0.24, -0.72] },
  equipos: [
    { tipo: 'polea', anclaje: [0, 2.25, 0.3], mano: 'ambas', manilla: 'barra' },
    // Asiento y su pata
    { tipo: 'bloque', pos: [0, H - 0.035, 0.0], tam: [0.4, 0.07, 0.38], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (H - 0.07) / 2, 0.0], tam: [0.08, H - 0.07, 0.08], color: 'estructura' },
    // Viga del piso, del asiento a la torre
    { tipo: 'bloque', pos: [0, 0.025, 0.19], tam: [0.08, 0.05, 0.42], color: 'estructura' },
    // Rodillo sobre los muslos, pegado a la torre
    { tipo: 'bloque', pos: [0, 0.675, 0.27], tam: [0.52, 0.08, 0.11], color: 'tapiz' },
  ],
  momentos: [0, 0.22, 0.45],
  cuadros: [
    { t: 0, ...sentado, ...barra(1.69, 0.15, 0.035, 0, -8, -4) },
    { t: 0.08 },
    { t: 0.25, ...barra(1.4, 0.12, 0.01, -0.01, -12, -6) },
    { t: 0.45, ...barra(1.1, 0.035, -0.015, -0.025, -16, -8) },
    { t: 0.53 },                 // aprieta abajo
    { t: 0.75, ...barra(1.42, 0.13, 0.015, -0.01, -11, -6) },
  ],
  trabajan: ['Dorsal ancho', 'Redondo mayor'],
  ayudan: ['Bíceps', 'Romboides', 'Trapecio medio', 'Hombro posterior'],
  pintar: ['dorsales'],
  pasos: [
    [0, 'Sentado, muslos firmes bajo el rodillo y la barra tomada más ancha que los hombros.'],
    [0.08, 'Saca el pecho, echa el tronco un poco atrás y tira la barra con los codos hacia abajo.'],
    [0.43, 'Abajo, la barra toca la parte alta del pecho y las escápulas se juntan.'],
    [0.53, 'Sube controlado hasta estirar los brazos arriba, sin soltar la tensión.'],
  ],
};
