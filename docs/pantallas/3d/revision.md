# Revisión de arte y técnica · prueba de 10 ejercicios en 3D

Revisé los 10 en la hoja de revisión y en el teléfono (lado, frente y 3/4, varios instantes, modo gimnasio y clara). También medí las articulaciones con el esqueleto. No toqué código.

## Veredicto

La prueba sirve para decidir: el movimiento se entiende, no hay articulaciones al revés, nada atraviesa el cuerpo ni el equipo, los pies no resbalan, no hay saltos entre cuadros y la consola no muestra errores. La revisión automática sale sin avisos en los 10.

Lo que falta antes de hacer los 67 son tres cosas del motor que se repiten en varios ejercicios, y ajustes chicos por ejercicio.

| Ejercicio | Técnica | Se ve bien en el teléfono | Estado |
|---|---|---|---|
| Sentadilla trasera | Bien | Sí en 3/4; de lado el disco tapa el tronco | Ajuste chico |
| Press banca | Bien arriba; piernas muy abiertas | El pecho casi no se ve | Ajustar |
| Peso muerto rumano | Bien | Sí | Listo |
| Dominadas | Bien | Figura chica y dorsales ocultos | Ajustar cámara |
| Remo con barra | Bien; agarre angosto | Sí | Ajuste chico |
| Prensa de piernas | Bien | La máquina domina a la figura | Ajustar |
| Press militar | Codos abiertos a media subida | Sí | Ajustar |
| Curl con mancuernas | Bien | Sí | Listo |
| Elevaciones laterales | Bien | Sí | Listo |
| Flexiones | Codos demasiado altos abajo | Sí | Ajustar (depende del motor) |

## Motor (afecta a varios)

1. **Mano y muñeca.** La mano es un puño con la muñeca recta, así que el antebrazo queda unos 6 cm largo. Por eso en flexiones el codo sube 18 cm sobre el hombro abajo, y en press militar los codos se abren. Agregar por brazo `muneca: <grados>` con mano abierta y el objetivo en la base de la palma.
2. **Disco cercano en vista de lado.** Tapa tronco, cara o piernas en todos los ejercicios con barra, y cada agente lo resolvió con una cámara distinta. Resolverlo una vez en el motor: en `lado`, dibujar el disco del lado de la cámara como un aro (solo el borde) o con 25 % de opacidad, y volver todos a la vista lateral por defecto.
3. **Margen del encuadre.** Dejar 8 % de aire en los cuatro bordes y subir el encuadre para que nada quede bajo el rótulo «Arrastra para girar» (hoy lo pisan la pata de la barra de dominadas, la base de la prensa y el pie en press banca).
4. **Tríceps.** Desde adelante se ve como una línea fina ámbar en el borde del brazo, parece un error de dibujo. Agrandar la pieza para que cubra la mitad trasera del brazo.
5. **Músculos que ayudan.** Hoy no se pintan. Pintarlos con ámbar mezclado al 35 % con el gris de la figura, para que el 3D diga lo mismo que la lista.
6. **Colchoneta en tema clara.** Es un gris oscuro muy pesado sobre blanco. Usar el token de superficie secundaria del tema, no un gris fijo.
7. **Revisión automática.** Que `dominadas` y `paralelas` entreguen su barra a `revisar()`, para que el choque con la cabeza se revise solo.

## Páginas

1. `ejercicios-3d.html`: la cabecera dice «10 ejercicios» y el select ya lista 67. `revision.html`: el select dice «Los 10». Usar el largo real del índice.
2. El select dice «Press de banca» y el título «Press banca». Dejar un solo nombre (el de la biblioteca).
3. En «Trabajan», los músculos que ayudan llevan un cuadrado vacío que parece casilla para marcar. Cambiarlo por un punto ámbar apagado o un cuadrado relleno gris.
4. `revision.html`: agrupar los equipos repetidos («17 bloques» en vez de «bloque, bloque, ...»).

## Por ejercicio

**Sentadilla trasera**
- Pies de ±0.17 a ±0.20 (ancho de hombros), con las rodillas siguiendo la punta.
- Sin más cambios: profundidad, tronco y trayectoria de la barra están bien.

**Press banca**
- Piernas: pies de ±0.30 a ±0.24 y un poco atrás (z 0.60), rodillas a ±0.27. Hoy de frente se ve como rana.
- `vistas.tres: [0.75, 0.7, 0.2]` (más desde arriba) para que se vea el pecho y el recorrido de los codos.
- `vistas.frente: [0, 0.9, 0.6]` (desde los pies y arriba). La actual muestra sobre todo la entrepierna y las rodillas.
- `trabajan`: Pectoral y Tríceps. Pasar «Hombro anterior» a `ayudan` y sacar `hombros` de `pintar`, igual que en flexiones.

**Peso muerto rumano**
- Sin cambios de técnica. Cuando el motor resuelva el disco, quitar `vistas.lado`.

**Dominadas**
- Vista por defecto desde atrás en 3/4: `vistas.tres: [0.7, 0.24, -0.72]`. Con la actual los dorsales, que son lo que trabaja, no se ven.
- Barra de `ancho` 1.6 a 1.2 y sin patas largas, para que la figura se vea más grande en el teléfono.
- Pies con las puntas menos estiradas (tobillo a unos 20 grados) y rodillas apenas dobladas, que se ve más natural colgado.

**Remo con barra**
- Agarre de ±0.25 a ±0.29 (justo por fuera de las piernas y los hombros).
- Paso 1: cambiar «45°» por «45 grados», como en el resto.

**Prensa de piernas**
- Acortar los rieles para que terminen 15 cm sobre el punto más alto de la plataforma. Hoy la máquina ocupa casi todo el cuadro y la persona queda chica.
- Alargar el respaldo 12 cm: la cabeza queda en el borde.
- Dejar la estructura un tono más oscura que la figura para que el cuerpo resalte.
- La vista «Frente» desde arriba se entiende y muestra las rodillas. Dejarla.

**Press militar**
- A media subida (t 0.2 a 0.3) el codo queda 7 cm por fuera de la mano y de frente el antebrazo se ve inclinado. Llevar el polo del codo más adelante y adentro para que el codo quede en x ≤ 0.31, bajo la barra.
- `momentos: [0, 0.28, 0.46]` para que la hoja muestre el paso por la frente.
- Dejar 4 pasos, como los demás: unir el 4 y el 5.

**Curl con mancuernas**
- Sin cambios.

**Elevaciones laterales**
- Opcional: llevar los brazos 15 a 20 grados hacia adelante (plano de la escápula). Es más amable con el hombro y es lo que enseña un entrenador.

**Flexiones**
- Abajo el codo queda 18 cm sobre el hombro. Mientras el motor no tenga muñeca: parar con el pecho a 10 cm del suelo y abrir las manos a ±0.33. Cuando exista `muneca`, volver a 6 cm y quitar los bloques que hacen de dedos.
- Colchoneta de 0.8 m de ancho: hoy las manos quedan en el borde.
- Pasar «Core» a `ayudan` y sacar `abdomen` de `pintar`. Trabajan pectoral y tríceps.

## Consistencia entre los 10

- Figura, colores y equipo son coherentes. El ámbar se lee bien en los dos temas.
- Ritmo: periodos entre 2,8 y 4,2 s, bajada más lenta que la subida y pausa corta arriba y abajo. Está bien y se siente parejo.
- Textos: tuteo correcto, sin emojis ni guion largo. Solo unificar «grados» y los 4 pasos.
- Vista por defecto: usar 3/4 en todos salvo cuando otra muestre mejor el músculo (lado en peso muerto rumano y prensa, frente en elevaciones, atrás en dominadas).
- Los ejercicios con barra se ven más chicos porque la barra de 2,2 m manda el encuadre. Acortar la barra dibujada a 1,9 m gana cerca de 15 % de tamaño de figura.

# Mitad inferior

Revisé los 26 ejercicios de piernas y core en la hoja de revisión (lado, frente y 3/4, en el inicio, la mitad y el punto más exigente), más el bloqueo del peso muerto en el teléfono. Miré los avisos de la revisión automática de cada uno. No toqué código.

## Veredicto

Los 26 se entienden y la técnica es aprobable: no hay articulaciones al revés, nada atraviesa el cuerpo ni el equipo, y los equipos son simples y se leen. 24 salen sin avisos; los 2 que avanzan (zancadas caminando y paseo del granjero) marcan solo el corte del ciclo. Lo que hay que arreglar es poco y casi todo es de cámara.

| Ejercicio | Técnica | Se entiende | Estado |
|---|---|---|---|
| Sentadilla frontal | Bien | Sí en frente y 3/4; de lado el disco tapa el tronco | Ajuste chico |
| Sentadilla goblet | Bien | Sí | Listo |
| Sentadilla búlgara | Bien | Sí | Listo |
| Peso muerto convencional | Bien | Sí; de lado el disco tapa las piernas | Ajuste chico |
| Peso muerto sumo | Bien | Sí; igual que el convencional | Ajuste chico |
| Peso muerto rumano con mancuernas | Bien; abajo la cabeza baja de la cadera | Sí | Ajuste chico |
| Zancadas caminando | Bien; pies casi en una línea | Sí; salto al reiniciar | Ajustar |
| Estocada estática | Bien; pies casi en una línea | Sí | Ajuste chico |
| Step up al cajón | Bien | Sí | Listo |
| Extensión de cuádriceps | Bien | Sí | Listo |
| Curl femoral acostado | Bien; brazos muy abiertos | Sí | Ajuste chico |
| Curl femoral sentado | Bien | Sí; el ámbar queda tapado por el asiento | Listo |
| Hip thrust | Bien | Sí | Listo |
| Abductores en máquina | Bien | Sí de frente; casi no se ve ámbar | Listo (depende del motor) |
| Elevación de talones de pie | Bien | Sí | Listo |
| Elevación de talones sentado | Bien | Sí | Listo |
| Sentadilla con peso corporal | Bien | Sí | Listo |
| Puente de glúteo | Bien | Sí de lado; de frente se deforma | Ajustar cámara |
| Plancha frontal | Bien | Sí de lado; de frente se deforma | Ajustar cámara |
| Plancha lateral | Bien | Sí de frente; de lado se deforma | Ajustar cámara |
| Crunch en polea | Bien | Sí | Listo |
| Elevación de piernas colgado | Bien | Sí | Listo |
| Rueda abdominal | Bien | Sí | Listo |
| Paseo del granjero | Bien | Sí; salto al reiniciar | Ajustar |
| Pallof press | Bien | Sí; se ve polea y la biblioteca dice banda | Ajuste chico |
| Dead bug | Bien | Sí de lado; de frente se deforma | Ajustar cámara |

## Motor (afecta a varios)

1. **Vista a lo largo del cuerpo en ejercicios de suelo.** En puente de glúteo, plancha frontal y dead bug la vista `frente` mira desde los pies o la cabeza, y en plancha lateral pasa lo mismo con `lado`: la cámara queda pegada y se ve una cabeza o unas piernas gigantes. Mientras el motor no lo resuelva, cada archivo lo arregla con su `vistas` (ver abajo).
2. **Ciclos que avanzan.** Zancadas caminando y paseo del granjero vuelven de golpe al punto de partida y la revisión lo marca como pie que resbala 90 cm. Que `revisar` ignore el corte entre t = 1 y t = 0, y que el motor haga un fundido corto (unos 0,2 s) cuando el ejercicio declare que avanza.
3. **Disco cercano en vista de lado.** Se repite en sentadilla frontal, peso muerto y peso muerto sumo. Es el punto 2 de la revisión de los 10; con ese arreglo estos tres quedan listos sin tocarlos.
4. **Glúteo medio.** No existe como parte para pintar, así que abductores pinta el glúteo mayor y sentado casi no se ve. Agregar una parte en el costado de la cadera.
5. **Banda elástica.** No hay equipo para el pallof press. Basta una variante de la polea sin torre: un poste delgado y una cinta más gruesa que el cable.

## Por ejercicio

- **sentadilla-frontal.** Nada de técnica. Se arregla con el punto 3 del motor; no cambiar la cámara por ahora.
- **sentadilla-goblet.** Sin arreglos.
- **sentadilla-bulgara.** Sin arreglos.
- **peso-muerto.** Cambiar `momentos` a `[0, 0.2, 0.5]`: hoy el tercer cuadro (t 0,06) es casi igual al inicio y la hoja nunca muestra el bloqueo arriba.
- **peso-muerto-sumo.** El mismo cambio de `momentos` a `[0, 0.2, 0.5]`.
- **peso-muerto-rumano-mancuernas.** En el punto más bajo (t 0,44) subir el tronco unos 8 a 10 grados para que la cabeza no quede bajo la línea de la cadera; las mancuernas siguen llegando bajo la rodilla.
- **zancadas-caminando.** Separar los pies al ancho de la cadera (unos 10 cm a cada lado de la línea media): de frente la pierna de atrás queda escondida detrás de la de adelante.
- **zancadas-caminando.** Dejar una pausa de pie de unos 0,4 s antes del corte, para que el salto se lea como reinicio y no como error, hasta que llegue el punto 2 del motor.
- **estocada-estatica.** Separar los pies al ancho de la cadera, igual que en zancadas.
- **step-up.** Sin arreglos.
- **extension-de-cuadriceps.** Sin arreglos.
- **curl-femoral-acostado.** Acercar las manillas hasta dejarlas bajo los hombros: de frente los codos se abren como alas y distraen de las piernas.
- **curl-femoral-sentado.** Sin arreglos. El ámbar queda bajo el muslo y el asiento lo tapa; no vale la pena mover la máquina por eso.
- **hip-thrust.** Sin arreglos.
- **abductores-maquina.** Sin arreglos en el archivo. Cuando exista la parte del glúteo medio (punto 4 del motor), pintar esa.
- **elevacion-talones-pie.** Sin arreglos.
- **elevacion-talones-sentado.** Sin arreglos.
- **sentadilla-peso-corporal.** Sin arreglos.
- **puente-de-gluteo.** Agregar `vistas: { frente: [0.55, 0.4, 1] }` (desde los pies, en diagonal y un poco de arriba) para que no se vean piernas gigantes.
- **plancha-frontal.** Agregar `vistas: { frente: [0.55, 0.35, 1] }`: hoy de frente solo se ve la cabeza y los antebrazos enormes.
- **plancha-frontal.** Bajar un poco la cámara de `lado` (por ejemplo `[1, 0.05, 0.03]`) para que se vea el abdomen en ámbar, que hoy queda escondido bajo el tronco.
- **plancha-lateral.** Agregar `vistas: { lado: [1, 0.4, 0.55] }`: hoy de lado se ve la cabeza gigante y tapa todo. La pose de descanso con la columna inclinada no molesta, es solo el inicio.
- **crunch-en-polea.** Sin arreglos.
- **elevacion-piernas-colgado.** Sin arreglos.
- **rueda-abdominal.** Sin arreglos. La rueda facetada y sin giro no se nota en el teléfono.
- **paseo-del-granjero.** Dejar una pausa de pie de unos 0,4 s antes del corte, igual que en zancadas, hasta que llegue el punto 2 del motor.
- **pallof-press.** Hasta que exista la banda, decir «banda o polea» en la ceja y en los pasos para que el dibujo y el texto coincidan.
- **dead-bug.** Agregar `vistas: { frente: [0.55, 0.45, 1] }`: desde los pies se ven solo dos piernas enormes y no se entiende el cruce de brazo y pierna.

## Músculos pintados

Correctos en los 26. Dos avisos, ninguno es un error del archivo: en abductores falta la parte del glúteo medio (motor), y en curl femoral sentado, plancha frontal y rueda abdominal el ámbar existe pero queda tapado en la vista por defecto.

# Mitad superior

Revisé los 31 ejercicios de pecho, espalda, hombros y brazos en la hoja de revisión (lado, frente y 3/4, en el inicio, la mitad y el punto más exigente) y tres de ellos en el teléfono. No toqué código.

## Veredicto

Los 31 se entienden y la técnica es aprobable. No vi articulaciones al revés, piezas que se atraviesen, pies que resbalen ni cámaras que corten. La revisión automática sale sin avisos en los 31 y la consola no muestra errores. Los textos visibles no traen guion largo ni el símbolo de grados.

Hay dos ejercicios con un ajuste de técnica (remo con mancuerna y press cerrado), cuatro arreglos que se repiten en varios y ajustes chicos de cámara y de músculos pintados. Nada de esto pide más detalle.

## Se repite en varios

1. **Piernas de rana en la banca plana.** press-con-mancuernas, aperturas-con-mancuernas, press-frances y press-cerrado heredan las piernas de press-de-banca: copiar el arreglo que ya se pidió ahí (pies a ±0.24 y z 0.60, rodillas a ±0.27).
2. **Vista de frente en la banca plana.** En esos mismos cuatro, la vista de frente muestra la entrepierna: usar `vistas.frente: [0, 0.9, 0.6]` y `vistas.tres: [0.75, 0.7, 0.2]`, igual que press-de-banca.
3. **Torre de la polea (motor).** Mide más de 2 m aunque la polea esté baja, y achica la figura en el teléfono (curl-en-polea, remo-en-polea-baja, elevaciones-laterales-polea): que la torre termine 15 cm sobre la roldana.
4. **Hombro anterior en los ejercicios de pecho.** En los ocho de pecho aparece en `trabajan` y se pinta: pasarlo a `ayudan` y sacar `hombros` de `pintar`, como se pidió en press-de-banca (se queda solo en los dos inclinados, donde sí es principal).

## Por ejercicio

**Press de banca inclinado**
- A media bajada los brazos quedan abiertos en cruz (90 grados): cerrar los codos a unos 60 grados del tronco en todo el recorrido.

**Press con mancuernas**
- Solo los arreglos 1, 2 y 4 de arriba.

**Press inclinado con mancuernas**
- A media bajada los codos se abren en cruz: llevarlos a unos 60 grados del tronco, igual que el inclinado con barra.

**Press en máquina**
- Listo. Solo el arreglo 4.

**Fondos en paralelas**
- Acortar los parantes de las paralelas para que la figura se vea más grande en el teléfono. Técnica bien.

**Aperturas con mancuernas**
- Arreglos 1, 2 y 4. El arco de los brazos y la profundidad están bien.

**Cruce de poleas**
- Las manos terminan frente a la pelvis: subirlas unos 12 cm, frente al ombligo, como dice el paso 3.

**Pec deck**
- Listo. De frente los cojines tapan el pecho al cerrar, pero el 3/4 por defecto se entiende.

**Jalón al pecho**
- Vista por defecto desde atrás, `vistas.tres: [0.7, 0.24, -0.72]`: con la actual no se ven los dorsales y la columna de la máquina tapa medio cuerpo.
- Sacar `biceps` de `pintar` (está en `ayudan`).

**Remo con mancuerna**
- La espalda queda con la cabeza más baja que la cadera: doblar la rodilla de la pierna que va al suelo para bajar la cadera y dejar el tronco paralelo al suelo.
- Arriba el codo sube unos 30 cm sobre la espalda y la mancuerna queda a la altura de las costillas: bajar el codo a unos 10 cm sobre la espalda y llevar la mancuerna a la cadera.
- Sacar `biceps` de `pintar`.

**Remo en polea baja**
- Listo. Sacar `biceps` de `pintar`.

**Remo en máquina**
- Listo. Sacar `biceps` de `pintar`.

**Remo invertido**
- Arriba la cabeza pasa sobre la barra con el cuerpo a 46 grados: terminar con el pecho tocando la barra a unos 40 grados.
- Sacar `biceps` de `pintar`.

**Pull over en polea**
- Listo.

**Face pull**
- Listo. Los hombros se pintan completos; cuando el motor separe el hombro posterior, pintar solo ese.

**Encogimientos**
- Listo. El 3/4 desde atrás es la decisión correcta.

**Press de hombros con mancuernas**
- Listo.

**Press de hombros en máquina**
- Listo.

**Press Arnold**
- Listo. El giro se entiende.

**Elevaciones laterales en polea**
- Se pintan los dos hombros y solo trabaja el izquierdo: si el motor lo permite, pintar solo el lado que sube.

**Elevaciones frontales**
- Listo.

**Pájaros**
- Listo.

**Curl con barra**
- Listo.

**Curl martillo**
- Listo.

**Curl en polea**
- Listo, salvo la torre (arreglo 3).

**Curl predicador**
- Listo.

**Extensión de tríceps en polea**
- La torre queda pegada al cuerpo y tapa las manos en 3/4 y de frente: usar `vista: 'lado'` por defecto y alejar el anclaje a z 0.60.

**Press francés**
- Arreglos 1 y 2. El recorrido de la barra hasta la frente está bien.

**Extensión de tríceps sobre la cabeza**
- Listo.

**Fondos en banco**
- Listo.

**Press cerrado**
- Discos chicos (0.12 m, como en curl con barra y press francés): los grandes tapan el pecho y los brazos de lado.
- A media bajada el antebrazo se inclina unos 20 grados: abrir el agarre a ±0.22 para que quede vertical.
- Arreglos 1 y 2.

## Consistencia

- Figura, equipos y ritmo son parejos con los 10 primeros: periodos de 2,6 a 3,6 s y máquinas de pocas piezas.
- Las vistas corridas para esquivar discos y torres son aceptables mientras el motor no resuelva el disco cercano y la altura de la torre; después, volver a las vistas rectas.
