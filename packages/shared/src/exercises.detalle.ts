// ─────────────────────────────────────────────────────────────────────────────
// Técnica y músculos de la biblioteca base · Zona: Datos
//
// Qué hace: para cada uno de los 67 ejercicios de la biblioteca base (por su id corto, el mismo de
// exercises.seed.ts sin "base-"), los pasos de la técnica en orden y los músculos que trabajan
// (principales) y los que ayudan (secundarios). exercises.seed.ts une los pasos en `instrucciones`
// (uno por línea) y la API los manda en la ficha del ejercicio junto con `musculos`.
// ARCHIVO GENERADO: sale de docs/pantallas/3d/ejercicios/<id>.js (los campos `pasos`, `trabajan`
// y `ayudan` de cada visor 3D). No lo edites a mano.
// Tócalo cuando: cambie un paso o un músculo en docs/pantallas/3d/ejercicios, o se agregue un
// ejercicio a la biblioteca. Hay que regenerarlo desde esos archivos (un script de Node que los
// importe con import() y vuelque pasos sin el tiempo `t`, trabajan y ayudan) para que la app y
// la API no queden con el texto viejo. Al desplegar, la semilla de la API copia las instrucciones
// nuevas a la base.
// No lo toques para: cambiar nombre, grupo, equipo o incremento de un ejercicio
// (exercises.seed.ts) ni la animación del visor 3D (docs/pantallas/3d).
// Depende de: nada en código; su contenido viene de docs/pantallas/3d/ejercicios.
// ─────────────────────────────────────────────────────────────────────────────

/** La técnica y los músculos de un ejercicio de la biblioteca base. */
export interface DetalleEjercicioBase {
  /** Los pasos de la técnica, en el orden en que se hacen. */
  pasos: readonly string[];
  /** Los músculos principales. */
  trabajan: readonly string[];
  /** Los músculos que ayudan (secundarios). */
  ayudan: readonly string[];
}

/** Técnica y músculos por id corto de la biblioteca base (`press-de-banca`). */
export const DETALLE_BASE: Readonly<Record<string, DetalleEjercicioBase>> = {
  'sentadilla-trasera': {
    pasos: [
      'Barra sobre la espalda alta, manos por fuera de los hombros y codos hacia abajo.',
      'Baja llevando la cadera atrás y abajo, con las rodillas en la línea de los pies.',
      'Abajo, los muslos quedan paralelos al suelo o un poco más.',
      'Sube empujando el suelo con todo el pie, con el pecho firme.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Aductores', 'Espalda baja', 'Core'],
  },
  'sentadilla-frontal': {
    pasos: [
      'Barra adelante sobre los hombros, codos altos apuntando al frente.',
      'Baja con el tronco derecho y las rodillas hacia adelante, en la línea de los pies.',
      'Abajo, la cadera queda bajo las rodillas y los codos siguen arriba.',
      'Sube empujando el suelo con todo el pie, sin dejar caer los codos.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Aductores', 'Espalda alta', 'Core'],
  },
  'sentadilla-bulgara': {
    pasos: [
      'Empeine de atrás sobre la banca y el pie de adelante plano, lejos de la banca.',
      'Baja en vertical con el tronco apenas inclinado y el peso en el pie de adelante.',
      'Abajo, la rodilla de atrás casi toca el suelo y la de adelante va hacia la punta.',
      'Sube empujando con todo el pie de adelante.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Aductores', 'Isquiotibiales', 'Core'],
  },
  'sentadilla-goblet': {
    pasos: [
      'Kettlebell frente al pecho tomada por las asas, codos abajo y pies algo más abiertos que los hombros.',
      'Baja entre las piernas con el pecho arriba y las rodillas hacia las puntas.',
      'Abajo, los codos apuntan al suelo entre las rodillas y la espalda queda recta.',
      'Sube empujando el suelo con todo el pie, sin soltar la kettlebell del pecho.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Aductores', 'Core', 'Espalda alta'],
  },
  'prensa-de-piernas': {
    pasos: [
      'Espalda y cadera apoyadas, pies al ancho de los hombros en la plataforma.',
      'Baja la plataforma controlado, con las rodillas en la línea de los pies.',
      'Abajo, las rodillas llegan a unos 90 grados sin despegar la espalda baja.',
      'Empuja con todo el pie hasta casi estirar las piernas, sin bloquear las rodillas.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Isquiotibiales', 'Aductores', 'Gemelos'],
  },
  'extension-de-cuadriceps': {
    pasos: [
      'Siéntate con la espalda apoyada, las rodillas en el borde del asiento y el rodillo sobre los tobillos.',
      'Estira las rodillas y sube el rodillo, sin despegar la cadera del asiento.',
      'Arriba, las piernas quedan casi rectas: aprieta el cuádriceps un segundo.',
      'Baja lento hasta que las rodillas vuelvan a 90 grados.',
    ],
    trabajan: ['Cuádriceps'],
    ayudan: [],
  },
  'curl-femoral-acostado': {
    pasos: [
      'Acuéstate boca abajo con las rodillas justo fuera de la banca y el rodillo detrás de los tobillos.',
      'Dobla las rodillas y lleva los talones hacia los glúteos, con la cadera pegada a la banca.',
      'Arriba, aprieta los isquiotibiales un segundo sin arquear la espalda.',
      'Baja lento hasta que las piernas queden casi rectas.',
    ],
    trabajan: ['Isquiotibiales'],
    ayudan: ['Gemelos'],
  },
  'curl-femoral-sentado': {
    pasos: [
      'Siéntate con la espalda apoyada, la almohadilla firme sobre los muslos y el rodillo detrás de los tobillos.',
      'Dobla las rodillas y lleva los talones hacia abajo y atrás, sin levantar la cadera.',
      'Abajo, los talones quedan bajo el asiento: aprieta los isquiotibiales un segundo.',
      'Vuelve lento hasta que las piernas queden casi rectas.',
    ],
    trabajan: ['Isquiotibiales'],
    ayudan: ['Gemelos'],
  },
  'peso-muerto': {
    pasos: [
      'Barra sobre la mitad del pie, manos por fuera de las piernas, espalda recta y hombros sobre la barra.',
      'Empuja el suelo con las piernas: la barra sube pegada a las canillas.',
      'Pasadas las rodillas, lleva la cadera adelante hasta quedar derecho.',
      'Baja al revés: cadera atrás primero y, pasadas las rodillas, dóblalas hasta dejar la barra en el suelo.',
    ],
    trabajan: ['Glúteos', 'Isquiotibiales', 'Espalda baja'],
    ayudan: ['Cuádriceps', 'Trapecio', 'Dorsal ancho', 'Antebrazos'],
  },
  'peso-muerto-sumo': {
    pasos: [
      'Pies bien abiertos con las puntas afuera, manos por dentro de las rodillas y pecho arriba.',
      'Empuja el suelo abriendo las rodillas: la barra sube pegada a las piernas.',
      'Junta la cadera con la barra hasta quedar derecho, sin echarte atrás.',
      'Baja controlado: cadera atrás y rodillas afuera hasta dejar la barra en el suelo.',
    ],
    trabajan: ['Glúteos', 'Cuádriceps', 'Aductores'],
    ayudan: ['Isquiotibiales', 'Espalda baja', 'Trapecio', 'Antebrazos'],
  },
  'peso-muerto-rumano': {
    pasos: [
      'De pie, barra en las manos con los brazos colgando y las rodillas apenas flexionadas.',
      'Lleva la cadera atrás con la espalda recta; la barra baja rozando los muslos.',
      'Baja hasta media tibia o hasta sentir el estiramiento detrás de los muslos.',
      'Sube llevando la cadera adelante hasta quedar derecho, con los glúteos apretados.',
    ],
    trabajan: ['Isquiotibiales', 'Glúteos'],
    ayudan: ['Espalda baja', 'Dorsal ancho', 'Antebrazos'],
  },
  'peso-muerto-rumano-mancuernas': {
    pasos: [
      'De pie, mancuernas delante de los muslos y rodillas apenas dobladas.',
      'Lleva la cadera atrás con la espalda recta: las mancuernas bajan pegadas a las piernas.',
      'Para cuando sientas estirar la parte de atrás del muslo, con las mancuernas justo bajo las rodillas.',
      'Sube llevando la cadera adelante y aprieta los glúteos arriba.',
    ],
    trabajan: ['Isquiotibiales', 'Glúteos'],
    ayudan: ['Espalda baja', 'Antebrazos', 'Core'],
  },
  'hip-thrust': {
    pasos: [
      'Espalda alta en el borde de la banca, barra sobre la cadera y pies firmes al ancho de la cadera.',
      'Empuja con los talones y sube la cadera, con el mentón recogido y las costillas abajo.',
      'Arriba, tronco y muslos quedan en línea y paralelos al suelo: aprieta los glúteos.',
      'Baja la cadera controlada, sin mover la espalda del borde.',
    ],
    trabajan: ['Glúteos'],
    ayudan: ['Isquiotibiales', 'Cuádriceps', 'Core'],
  },
  'zancadas-caminando': {
    pasos: [
      'De pie, una mancuerna en cada mano a los costados.',
      'Da un paso largo adelante y apoya todo el pie.',
      'Baja en vertical hasta que la rodilla de atrás casi toque el suelo, con el tronco derecho.',
      'Empuja con el pie de adelante, sube y trae el de atrás. El próximo paso va con la otra pierna.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Isquiotibiales', 'Aductores', 'Gemelos', 'Core'],
  },
  'estocada-estatica': {
    pasos: [
      'Un pie adelante y otro atrás, al ancho de la cadera, con el talón de atrás arriba.',
      'Baja en vertical, con el tronco derecho y el peso repartido entre los dos pies.',
      'Abajo, la rodilla de atrás casi toca el suelo y las dos quedan en ángulo recto.',
      'Sube empujando con el pie de adelante, sin mover los pies.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Aductores', 'Isquiotibiales', 'Gemelos', 'Core'],
  },
  'step-up': {
    pasos: [
      'Pie izquierdo completo sobre el cajón y el derecho en el suelo, mancuernas a los costados.',
      'Empuja con el pie de arriba y sube sin impulsarte con el de abajo.',
      'Arriba, quedas derecho con los dos pies sobre el cajón.',
      'Baja controlado con el mismo pie que subiste; el de arriba no se mueve.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Isquiotibiales', 'Gemelos', 'Core'],
  },
  'abductores-maquina': {
    pasos: [
      'Siéntate con la espalda apoyada, los pies en los apoyos y las almohadillas por fuera de las rodillas.',
      'Abre las piernas empujando las almohadillas hacia afuera, con la espalda pegada al respaldo.',
      'Abre hasta donde controles y aguanta un segundo.',
      'Vuelve lento, sin dejar que el peso caiga de golpe.',
    ],
    trabajan: ['Glúteo medio', 'Glúteo menor'],
    ayudan: ['Tensor de la fascia lata'],
  },
  'elevacion-talones-pie': {
    pasos: [
      'De pie bajo las almohadillas, con la base de los dedos en el borde y los talones abajo, estirando la pantorrilla.',
      'Sube los talones lo más alto que puedas, con las rodillas estiradas pero sin bloquearlas.',
      'Arriba, quédate en punta de pies y aprieta la pantorrilla un segundo.',
      'Baja lento hasta que los talones queden bajo el borde.',
    ],
    trabajan: ['Gemelos', 'Sóleo'],
    ayudan: ['Core'],
  },
  'elevacion-talones-sentado': {
    pasos: [
      'Siéntate con la base de los dedos en el borde, la almohadilla sobre los muslos y los talones abajo.',
      'Sube los talones empujando con la punta de los pies, sin tirar con los brazos.',
      'Arriba, aprieta la pantorrilla un segundo.',
      'Baja lento hasta estirar bien la pantorrilla.',
    ],
    trabajan: ['Sóleo', 'Gemelos'],
    ayudan: [],
  },
  'sentadilla-peso-corporal': {
    pasos: [
      'De pie, con los pies al ancho de los hombros, las puntas un poco afuera y los brazos estirados al frente.',
      'Baja llevando la cadera atrás y abajo, con las rodillas en la línea de los pies.',
      'Abajo, los muslos quedan paralelos al suelo o un poco más, con los talones apoyados.',
      'Sube empujando el suelo con todo el pie hasta quedar derecho.',
    ],
    trabajan: ['Cuádriceps', 'Glúteos'],
    ayudan: ['Aductores', 'Core'],
  },
  'puente-de-gluteo': {
    pasos: [
      'Acuéstate boca arriba con las rodillas dobladas, los pies apoyados al ancho de la cadera y los brazos en el suelo.',
      'Empuja con los talones y sube la cadera apretando los glúteos.',
      'Arriba, hombros, cadera y rodillas quedan en línea, sin arquear la zona lumbar.',
      'Baja lento hasta que los glúteos casi toquen el suelo.',
    ],
    trabajan: ['Glúteos'],
    ayudan: ['Isquiotibiales', 'Core'],
  },
  'press-de-banca': {
    pasos: [
      'Acostado, pies firmes en el suelo, glúteos y espalda alta apoyados en la banca.',
      'Baja la barra controlada hacia el esternón, con los codos entre 45 y 70 grados del cuerpo.',
      'Abajo, la barra toca el pecho y los antebrazos quedan verticales.',
      'Empuja hacia arriba y un poco hacia la cara hasta estirar los brazos sobre los hombros.',
    ],
    trabajan: ['Pectoral', 'Tríceps'],
    ayudan: ['Hombro anterior', 'Dorsal ancho', 'Antebrazos'],
  },
  'press-de-banca-inclinado': {
    pasos: [
      'Banca a unos 30 grados, glúteos y espalda apoyados, pies firmes y barra sobre los hombros.',
      'Baja la barra controlada hacia la parte alta del pecho, con los codos a unos 60 grados del cuerpo.',
      'Abajo, la barra toca el pecho justo bajo las clavículas.',
      'Empuja hacia arriba hasta estirar los brazos, con la barra sobre los hombros.',
    ],
    trabajan: ['Pectoral superior', 'Hombro anterior', 'Tríceps'],
    ayudan: ['Serrato anterior', 'Antebrazos'],
  },
  'press-con-mancuernas': {
    pasos: [
      'Acostado, pies firmes en el suelo y una mancuerna en cada mano sobre los hombros.',
      'Baja las mancuernas controladas hacia los lados del pecho, con los codos a unos 45 a 60 grados del cuerpo.',
      'Abajo, las mancuernas quedan a la altura del pecho y los antebrazos verticales.',
      'Empuja hacia arriba y un poco hacia adentro, sin chocar las mancuernas.',
    ],
    trabajan: ['Pectoral', 'Tríceps'],
    ayudan: ['Hombro anterior', 'Serrato anterior', 'Antebrazos'],
  },
  'press-inclinado-mancuernas': {
    pasos: [
      'Banca a unos 30 grados, espalda apoyada y una mancuerna en cada mano sobre los hombros.',
      'Baja las mancuernas controladas hacia los lados de la parte alta del pecho, con los codos a unos 60 grados del cuerpo.',
      'Abajo, las mancuernas quedan a los lados del pecho y los antebrazos verticales.',
      'Empuja hacia arriba y un poco hacia adentro, sin chocar las mancuernas.',
    ],
    trabajan: ['Pectoral superior', 'Hombro anterior', 'Tríceps'],
    ayudan: ['Serrato anterior', 'Antebrazos'],
  },
  'press-en-maquina': {
    pasos: [
      'Sentado con la espalda apoyada, pies firmes y los brazos adelante tomando las manillas.',
      'Deja volver las manillas controladas hasta que las manos queden a los lados del pecho.',
      'Atrás, los codos llegan a la línea del tronco, sin despegar la espalda del respaldo.',
      'Empuja hacia adelante hasta casi estirar los brazos, sin trabar los codos.',
    ],
    trabajan: ['Pectoral', 'Tríceps'],
    ayudan: ['Hombro anterior', 'Serrato anterior', 'Antebrazos'],
  },
  'fondos-en-paralelas': {
    pasos: [
      'Apoyado en las barras con los brazos estirados, el tronco un poco adelante y las rodillas dobladas.',
      'Baja doblando los codos hacia atrás mientras inclinas el pecho hacia adelante.',
      'Abajo, los brazos quedan casi paralelos al suelo, sin hundir los hombros.',
      'Empuja las barras hasta estirar los brazos, sin trabar los codos.',
    ],
    trabajan: ['Pectoral inferior', 'Tríceps'],
    ayudan: ['Hombro anterior', 'Core', 'Serrato anterior'],
  },
  'flexiones': {
    pasos: [
      'Manos en el suelo un poco más abiertas que los hombros y cuerpo recto de la cabeza a los talones.',
      'Baja doblando los codos a unos 45 grados del tronco, con el abdomen y los glúteos firmes.',
      'Abajo, el pecho queda cerca del suelo.',
      'Empuja el suelo hasta estirar los brazos, sin que se hunda la cadera.',
    ],
    trabajan: ['Pectoral', 'Tríceps'],
    ayudan: ['Hombro anterior', 'Core', 'Serrato'],
  },
  'aperturas-con-mancuernas': {
    pasos: [
      'Acostado, mancuernas sobre el pecho con las palmas enfrentadas y los codos un poco doblados.',
      'Abre los brazos en arco hacia los lados, sin cambiar el ángulo de los codos.',
      'Baja hasta sentir el pecho estirado, con las manos a la altura del pecho.',
      'Cierra por el mismo arco, como si abrazaras un barril, hasta juntar las mancuernas sobre el pecho.',
    ],
    trabajan: ['Pectoral'],
    ayudan: ['Hombro anterior', 'Bíceps', 'Serrato anterior'],
  },
  'cruce-de-poleas': {
    pasos: [
      'De pie entre las dos poleas altas, un pie adelante y el tronco un poco inclinado.',
      'Baja las manos en arco hacia adelante, con los codos un poco doblados y fijos.',
      'Junta las manos frente al ombligo y aprieta el pecho un instante.',
      'Vuelve abriendo lento por el mismo arco hasta sentir el pecho estirado.',
    ],
    trabajan: ['Pectoral'],
    ayudan: ['Hombro anterior', 'Bíceps', 'Core'],
  },
  'pec-deck': {
    pasos: [
      'Sentado con la espalda apoyada, brazos a la altura de los hombros y codos en 90 grados contra los cojines.',
      'Junta los codos al frente empujando los cojines con los antebrazos.',
      'Adelante, los cojines casi se tocan: aprieta el pecho un instante.',
      'Abre lento hasta que los codos queden un poco detrás del cuerpo.',
    ],
    trabajan: ['Pectoral'],
    ayudan: ['Hombro anterior', 'Serrato anterior'],
  },
  'dominadas': {
    pasos: [
      'Cuelga de la barra con agarre prono, un poco más ancho que los hombros y los brazos estirados.',
      'Baja los hombros y tira llevando los codos hacia abajo y atrás.',
      'Sube hasta que el mentón pase la barra, con el pecho hacia ella.',
      'Baja controlado hasta estirar los brazos, sin balancearte.',
    ],
    trabajan: ['Dorsal ancho', 'Bíceps'],
    ayudan: ['Trapecio medio', 'Romboides', 'Antebrazos', 'Core'],
  },
  'jalon-al-pecho': {
    pasos: [
      'Sentado, muslos firmes bajo el rodillo y la barra tomada más ancha que los hombros.',
      'Saca el pecho, echa el tronco un poco atrás y tira la barra con los codos hacia abajo.',
      'Abajo, la barra toca la parte alta del pecho y las escápulas se juntan.',
      'Sube controlado hasta estirar los brazos arriba, sin soltar la tensión.',
    ],
    trabajan: ['Dorsal ancho', 'Redondo mayor'],
    ayudan: ['Bíceps', 'Romboides', 'Trapecio medio', 'Hombro posterior'],
  },
  'remo-con-barra': {
    pasos: [
      'Rodillas algo flexionadas, tronco inclinado a 45 grados con la espalda recta y brazos estirados.',
      'Tira la barra hacia el abdomen bajo llevando los codos atrás, pegados al cuerpo.',
      'Arriba, junta las escápulas un instante sin levantar el tronco.',
      'Baja controlado hasta estirar los brazos, con el tronco quieto.',
    ],
    trabajan: ['Dorsal ancho', 'Espalda media', 'Bíceps'],
    ayudan: ['Hombro posterior', 'Espalda baja', 'Isquiotibiales', 'Antebrazos'],
  },
  'remo-con-mancuerna': {
    pasos: [
      'Rodilla y mano del mismo lado en la banca, espalda recta y la mancuerna colgando bajo el hombro.',
      'Tira la mancuerna hacia la cadera, con el codo pegado al cuerpo y hacia atrás.',
      'Arriba, junta la escápula a la columna sin girar el tronco.',
      'Baja controlado hasta estirar el brazo y sentir el estiramiento en la espalda.',
    ],
    trabajan: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
    ayudan: ['Bíceps', 'Hombro posterior', 'Antebrazos', 'Core'],
  },
  'remo-en-polea-baja': {
    pasos: [
      'Sentado, pies en la plataforma con las rodillas un poco dobladas y los brazos estirados.',
      'Tira la manilla hacia el abdomen llevando los codos atrás, pegados al cuerpo.',
      'Al final, junta las escápulas con el pecho arriba y el tronco derecho.',
      'Estira los brazos controlado, dejando que los hombros vayan un poco adelante.',
    ],
    trabajan: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
    ayudan: ['Bíceps', 'Hombro posterior', 'Lumbares', 'Antebrazos'],
  },
  'remo-en-maquina': {
    pasos: [
      'Sentado, el pecho apoyado en el cojín y las manillas tomadas con los brazos estirados.',
      'Tira las manillas hacia atrás llevando los codos pegados al cuerpo.',
      'Al final, junta las escápulas sin despegar el pecho del cojín.',
      'Estira los brazos controlado hasta sentir la espalda abierta.',
    ],
    trabajan: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
    ayudan: ['Bíceps', 'Hombro posterior', 'Antebrazos'],
  },
  'remo-invertido': {
    pasos: [
      'Colgado bajo la barra, brazos estirados, talones en el suelo y el cuerpo recto.',
      'Tira el pecho hacia la barra llevando los codos atrás, sin doblar la cadera.',
      'Arriba, el pecho toca la barra y las escápulas se juntan.',
      'Baja controlado hasta estirar los brazos, con el cuerpo siempre recto.',
    ],
    trabajan: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
    ayudan: ['Bíceps', 'Hombro posterior', 'Core', 'Glúteos'],
  },
  'pull-over-en-polea': {
    pasos: [
      'De pie frente a la polea, cadera un poco atrás, espalda recta y brazos arriba casi estirados.',
      'Baja la barra en arco con los brazos rectos, llevando la fuerza desde la espalda.',
      'Abajo, la barra llega a los muslos. Aprieta los dorsales sin mover el tronco.',
      'Sube controlado por el mismo arco hasta sentir la espalda estirada.',
    ],
    trabajan: ['Dorsal ancho', 'Redondo mayor'],
    ayudan: ['Tríceps (cabeza larga)', 'Hombro posterior', 'Core'],
  },
  'face-pull': {
    pasos: [
      'De pie frente a la polea, cuerda tomada con los brazos estirados a la altura de la cara.',
      'Tira la cuerda hacia la frente con los codos altos y abiertos hacia los lados.',
      'Al final, separa las manos a los lados de la cabeza y junta las escápulas.',
      'Estira los brazos controlado de vuelta hacia la polea.',
    ],
    trabajan: ['Hombro posterior', 'Trapecio medio', 'Romboides'],
    ayudan: ['Manguito rotador', 'Bíceps'],
  },
  'encogimientos': {
    pasos: [
      'De pie, con una mancuerna a cada lado, brazos estirados y palmas hacia el cuerpo.',
      'Sube los hombros hacia las orejas, en línea recta, sin doblar los codos.',
      'Arriba, aprieta un segundo. No gires los hombros ni bajes la cabeza.',
      'Baja lento hasta que los hombros queden estirados abajo.',
    ],
    trabajan: ['Trapecio'],
    ayudan: ['Elevador de la escápula', 'Antebrazos'],
  },
  'press-militar': {
    pasos: [
      'De pie, barra sobre las clavículas, manos un poco más abiertas que los hombros y codos bajo la barra o un poco adelante.',
      'Aprieta glúteos y abdomen y empuja la barra recto hacia arriba, llevando la cabeza un poco atrás.',
      'Cuando la barra pasa la frente, mete la cabeza y el pecho bajo la barra.',
      'Arriba, brazos estirados sobre los hombros. Baja controlado por el mismo camino.',
    ],
    trabajan: ['Hombros', 'Tríceps'],
    ayudan: ['Trapecio', 'Pectoral superior', 'Core'],
  },
  'press-hombros-mancuernas': {
    pasos: [
      'Sentado con la espalda apoyada y las mancuernas arriba, sobre los hombros.',
      'Baja las mancuernas controlado, abriendo los codos un poco hacia adelante.',
      'Abajo, las mancuernas quedan a la altura de las orejas y los antebrazos verticales.',
      'Empuja hacia arriba hasta casi estirar los brazos, sin chocar las mancuernas.',
    ],
    trabajan: ['Hombro anterior', 'Hombro lateral', 'Tríceps'],
    ayudan: ['Trapecio', 'Pectoral superior', 'Core'],
  },
  'press-hombros-maquina': {
    pasos: [
      'Sentado con la espalda apoyada, toma las manillas con los brazos casi estirados.',
      'Baja controlado, con los codos hacia abajo y un poco adelante.',
      'Abajo, las manillas quedan a la altura de las orejas.',
      'Empuja hacia arriba sin bloquear los codos ni despegar la espalda.',
    ],
    trabajan: ['Hombro anterior', 'Hombro lateral', 'Tríceps'],
    ayudan: ['Trapecio', 'Pectoral superior'],
  },
  'press-arnold': {
    pasos: [
      'Sentado con la espalda apoyada, mancuernas frente al mentón y palmas hacia ti.',
      'Abre los codos hacia los lados mientras giras las manos y empiezas a subir.',
      'Arriba, brazos casi estirados y palmas hacia adelante.',
      'Baja controlado haciendo el giro al revés hasta volver frente al mentón.',
    ],
    trabajan: ['Hombro anterior', 'Hombro lateral', 'Tríceps'],
    ayudan: ['Trapecio', 'Pectoral superior', 'Core'],
  },
  'elevaciones-laterales': {
    pasos: [
      'De pie, mancuernas al costado, codos apenas doblados y hombros abajo.',
      'Sube los brazos por los lados y un poco adelante, guiando con los codos.',
      'Para a la altura de los hombros, sin encogerlos.',
      'Baja lento y controlado hasta el costado.',
    ],
    trabajan: ['Hombro lateral'],
    ayudan: ['Hombro anterior', 'Trapecio'],
  },
  'elevaciones-laterales-polea': {
    pasos: [
      'De costado a la polea baja, toma la manilla con la mano más lejana frente a la cadera.',
      'Sube el brazo hacia el costado con el codo apenas doblado, sin inclinar el cuerpo.',
      'Arriba, la mano queda a la altura del hombro y un poco adelante.',
      'Baja lento resistiendo el cable hasta volver frente a la cadera.',
    ],
    trabajan: ['Hombro lateral'],
    ayudan: ['Hombro anterior', 'Trapecio', 'Core'],
  },
  'elevaciones-frontales': {
    pasos: [
      'De pie, mancuernas frente a los muslos y codos apenas doblados.',
      'Sube los brazos al frente sin balancear el cuerpo.',
      'Arriba, las manos quedan a la altura de los hombros.',
      'Baja lento y controlado hasta volver frente a los muslos.',
    ],
    trabajan: ['Hombro anterior'],
    ayudan: ['Hombro lateral', 'Pectoral superior', 'Trapecio', 'Core'],
  },
  'pajaros': {
    pasos: [
      'Inclinado desde la cadera con la espalda recta, mancuernas colgando bajo el pecho.',
      'Abre los brazos hacia los lados con los codos apenas doblados.',
      'Arriba, los brazos quedan en línea con los hombros, sin mover el tronco.',
      'Baja lento y controlado hasta que las mancuernas vuelvan a colgar.',
    ],
    trabajan: ['Hombro posterior'],
    ayudan: ['Trapecio medio', 'Romboides', 'Espalda baja'],
  },
  'curl-con-barra': {
    pasos: [
      'De pie, toma la barra con las palmas hacia adelante, al ancho de los hombros.',
      'Sube la barra doblando los codos, sin despegarlos del cuerpo ni balancearte.',
      'Arriba, la barra queda frente al pecho. Aprieta el bíceps un instante.',
      'Baja lento hasta estirar los brazos, sin soltar la tensión.',
    ],
    trabajan: ['Bíceps'],
    ayudan: ['Braquial', 'Antebrazos'],
  },
  'curl-con-mancuernas': {
    pasos: [
      'De pie, una mancuerna en cada mano, brazos al costado y palmas mirando hacia el cuerpo.',
      'Sube doblando los codos sin despegarlos del cuerpo y gira las palmas hacia arriba.',
      'Arriba, las mancuernas quedan cerca de los hombros. Aprieta el bíceps un instante.',
      'Baja lento hasta estirar los brazos, sin balancear el cuerpo.',
    ],
    trabajan: ['Bíceps'],
    ayudan: ['Braquial', 'Antebrazos'],
  },
  'curl-martillo': {
    pasos: [
      'De pie, una mancuerna en cada mano y las palmas mirando hacia el cuerpo.',
      'Sube doblando los codos sin girar las muñecas: el pulgar apunta hacia arriba.',
      'Arriba, las mancuernas quedan frente a los hombros, con los codos pegados al cuerpo.',
      'Baja lento hasta estirar los brazos, sin balancear el cuerpo.',
    ],
    trabajan: ['Braquial', 'Braquiorradial'],
    ayudan: ['Bíceps'],
  },
  'curl-en-polea': {
    pasos: [
      'De pie frente a la polea baja, toma la barra con las palmas hacia adelante.',
      'Sube la barra doblando los codos, sin despegarlos del cuerpo ni echarte atrás.',
      'Arriba, la barra queda frente al pecho. Aprieta el bíceps un instante.',
      'Baja lento resistiendo el cable hasta estirar los brazos.',
    ],
    trabajan: ['Bíceps'],
    ayudan: ['Braquial', 'Antebrazos'],
  },
  'curl-predicador': {
    pasos: [
      'Sentado, con el pecho contra el atril y la parte de atrás de los brazos apoyada en el cojín.',
      'Sube la manilla doblando los codos, sin despegar los brazos del cojín.',
      'Arriba, el antebrazo queda casi vertical. Aprieta el bíceps un instante.',
      'Baja lento hasta casi estirar los brazos, sin trabar los codos.',
    ],
    trabajan: ['Bíceps'],
    ayudan: ['Braquial', 'Antebrazos'],
  },
  'extension-triceps-polea': {
    pasos: [
      'De pie frente a la polea alta, toma la cuerda con los codos pegados al cuerpo.',
      'Empuja la cuerda hacia abajo estirando los codos, sin moverlos de su lugar.',
      'Abajo, estira los brazos por completo y abre un poco la cuerda.',
      'Sube controlado hasta que las manos lleguen a la altura del pecho.',
    ],
    trabajan: ['Tríceps'],
    ayudan: ['Antebrazos', 'Core'],
  },
  'press-frances': {
    pasos: [
      'Acostado en la banca, la barra arriba con los brazos estirados y las manos al ancho de los hombros.',
      'Baja la barra hacia la frente doblando solo los codos; los brazos no se mueven.',
      'Abajo, la barra queda justo sobre la frente y los codos apuntan al techo.',
      'Estira los codos y vuelve a subir la barra hasta arriba.',
    ],
    trabajan: ['Tríceps'],
    ayudan: ['Antebrazos'],
  },
  'extension-triceps-cabeza': {
    pasos: [
      'De pie, sostén una mancuerna con las dos manos sobre la cabeza, brazos estirados.',
      'Baja la mancuerna detrás de la cabeza doblando los codos, que siguen apuntando arriba.',
      'Abajo, siente el estiramiento del tríceps sin abrir los codos.',
      'Estira los codos hasta volver arriba, con el abdomen firme y sin arquear la espalda.',
    ],
    trabajan: ['Tríceps'],
    ayudan: ['Hombros', 'Core'],
  },
  'fondos-en-banco': {
    pasos: [
      'Apoya las manos en el borde de la banca, detrás de ti, con los dedos hacia adelante y los brazos estirados.',
      'Baja la cadera doblando los codos hacia atrás, con la espalda cerca de la banca.',
      'Abajo, los codos quedan cerca de 90 grados. No bajes más para no forzar los hombros.',
      'Empuja con las manos hasta estirar los brazos, sin despegar los pies del suelo.',
    ],
    trabajan: ['Tríceps'],
    ayudan: ['Pectoral', 'Hombro anterior'],
  },
  'press-cerrado': {
    pasos: [
      'Acostado en la banca, toma la barra con las manos al ancho de los hombros, brazos estirados.',
      'Baja la barra hacia la parte baja del pecho con los codos pegados al cuerpo.',
      'Abajo, la barra toca el pecho y los codos quedan junto al tronco, sin abrirse.',
      'Empuja hasta estirar los brazos, con la barra sobre los hombros.',
    ],
    trabajan: ['Tríceps', 'Pectoral'],
    ayudan: ['Hombro anterior'],
  },
  'plancha-frontal': {
    pasos: [
      'Antebrazos en el suelo con los codos bajo los hombros y las puntas de los pies apoyadas.',
      'Despega las rodillas hasta dejar el cuerpo recto de la cabeza a los talones.',
      'Mantén la posición: abdomen y glúteos apretados, sin hundir ni subir la cadera.',
      'Al terminar el tiempo, baja las rodillas con control.',
    ],
    trabajan: ['Abdomen', 'Transverso abdominal'],
    ayudan: ['Oblicuos', 'Glúteos', 'Hombros'],
  },
  'plancha-lateral': {
    pasos: [
      'De lado, con el codo justo bajo el hombro, el antebrazo apoyado y las piernas juntas.',
      'Sube la cadera hasta dejar el cuerpo recto de la cabeza a los pies.',
      'Mantén la posición sin dejar caer la cadera. Respira normal.',
      'Al terminar el tiempo, baja la cadera con control y cambia de lado.',
    ],
    trabajan: ['Oblicuos', 'Transverso abdominal'],
    ayudan: ['Glúteo medio', 'Hombros', 'Espalda baja'],
  },
  'crunch-en-polea': {
    pasos: [
      'De rodillas frente a la polea alta, con la cuerda tomada a los lados de la cabeza.',
      'Enrolla el tronco hacia abajo y lleva los codos hacia los muslos. La cadera casi no se mueve.',
      'Abajo, aprieta el abdomen un instante.',
      'Sube controlado hasta estirar el tronco, con las manos siempre junto a la cabeza.',
    ],
    trabajan: ['Abdomen'],
    ayudan: ['Oblicuos'],
  },
  'elevacion-piernas-colgado': {
    pasos: [
      'Cuélgate de la barra con las manos al ancho de los hombros y el cuerpo quieto.',
      'Sube las piernas estiradas apretando el abdomen, sin balancearte.',
      'Arriba, las piernas quedan un poco sobre la horizontal y la pelvis se enrolla hacia adelante.',
      'Baja lento y controlado hasta quedar colgado otra vez.',
    ],
    trabajan: ['Abdomen', 'Flexores de cadera'],
    ayudan: ['Oblicuos', 'Antebrazos', 'Dorsal ancho'],
  },
  'rueda-abdominal': {
    pasos: [
      'De rodillas, con las manos en la rueda un poco por delante de los hombros y los brazos estirados.',
      'Rueda hacia adelante con el abdomen apretado, sin hundir la espalda baja.',
      'Llega hasta donde mantengas la espalda recta, con el pecho cerca del suelo.',
      'Vuelve tirando con el abdomen hasta quedar otra vez sobre las rodillas.',
    ],
    trabajan: ['Abdomen'],
    ayudan: ['Dorsal ancho', 'Hombros', 'Tríceps', 'Glúteos'],
  },
  'paseo-del-granjero': {
    pasos: [
      'De pie, una kettlebell en cada mano a los costados, pecho arriba y hombros abajo.',
      'Camina con pasos cortos y firmes, apoyando todo el pie.',
      'Mantén el tronco derecho: que el peso no te incline hacia ningún lado.',
      'Al final del recorrido, detente quieto antes de dejar las pesas en el suelo.',
    ],
    trabajan: ['Abdomen', 'Oblicuos', 'Antebrazos'],
    ayudan: ['Trapecio', 'Glúteos', 'Piernas'],
  },
  'pallof-press': {
    pasos: [
      'De lado a la banda o polea, pies al ancho de los hombros y la manilla en el pecho con las dos manos.',
      'Empuja la manilla recto hacia adelante hasta estirar los brazos.',
      'Aguanta 2 segundos sin dejar que la banda o el cable te giren el tronco ni la cadera.',
      'Vuelve la manilla al pecho con control. Al terminar, cambia de lado.',
    ],
    trabajan: ['Oblicuos', 'Transverso abdominal'],
    ayudan: ['Abdomen', 'Glúteo medio', 'Hombros'],
  },
  'dead-bug': {
    pasos: [
      'De espalda, brazos estirados hacia el techo y caderas y rodillas en 90 grados.',
      'Estira a la vez un brazo hacia atrás y la pierna contraria hacia adelante, sin tocar el suelo.',
      'Vuelve al centro despacio, con la espalda baja pegada al suelo.',
      'Repite con el otro brazo y la otra pierna, alternando.',
    ],
    trabajan: ['Abdomen', 'Transverso abdominal'],
    ayudan: ['Oblicuos', 'Flexores de cadera'],
  },
};
