# Investigación breve: logos y botones en apps de gimnasio

Fecha: 17-11-2026. Alcance: solo logo y botones (pedido del usuario).

**Método.** Revisé los íconos actuales de 14 apps (sacados de la API pública de App Store y mirados en captura), las cabeceras de sus sitios oficiales (capturas), los centros de ayuda oficiales y unas pocas guías de diseño. Hice unas 14 búsquedas. Los colores son aproximados, muestreados del ícono. Lo que no pude verificar dice **no verificado**.

---

## 1. Logos e íconos de app

| App | Tipo | Símbolo del ícono | Color (aprox.) | Logotipo | Qué comunica |
|---|---|---|---|---|---|
| Strong | Registrador | Barra olímpica horizontal con dos discos, plana | Fondo petróleo oscuro `#102830`, discos azules `#30A0F8` | STRONG en mayúsculas, palo seco negrita, blanco | Literal: «esto es para levantar pesas». Serio y utilitario |
| Hevy | Registrador (y Hevy Coach) | Trazo grueso de una sola línea: dos corchetes redondeados enlazados, se lee como H o eslabón | Negro y blanco | HEVY en mayúsculas, grotesca geométrica, negro | Abstracto: conexión y comunidad. Hevy Coach repite el mismo símbolo y le suma la palabra «Coach» |
| Fitbod | Registrador con IA | Hexágono blanco con volumen y una F calada | Degradado rojo magenta `#F02850` a `#980020` | **No verificado** (el sitio pide verificación antibots) | Tecnología y sistema, con energía |
| JEFIT | Registrador | J blanca con un corte en forma de rayo | Azul `#3078F8` | JEFIT en cursiva negrita azul, con la J de rayo | Velocidad y energía |
| Alpha Progression | Registrador | Mancuerna en diagonal a 45° | Negro con azul `#0080F8` | «Alpha Progression» en grotesca negrita, mayúsculas y minúsculas | Literal: pesas. El nombre tiene la α, pero el ícono no la usa |
| Boostcamp | Programas y registro | B armada con bloques y chevrones | Naranja `#F8A010` en degradado | BOOSTCAMP en mayúsculas, grotesca de peso regular | Empuje y progreso |
| TrueCoach (ahora parte de Xplor) | Entrenador y alumno | C hexagonal con un chevrón hacia arriba | Violeta `#4010C0` | «xplor truecoach» en minúsculas, geométrica liviana | Subir, progreso. Aire de software para empresas |
| Everfit (dos apps) | Entrenador y alumno | Ala o flecha horizontal que forma una F con velocidad | Lima `#D8F830` con negro; la app del coach invierte (negro con brillo lima) | «everfit» en minúsculas muy espaciadas | Velocidad, deporte de rendimiento |
| ABC Trainerize | Entrenador y alumno | Según su blog: persona activa, rayo y «líneas de movimiento». En la web es un trazo amarillo de una sola línea | Amarillo con negro | TRAINERIZE en mayúsculas, negrita, blanco | Energía. Su ícono propio casi no se ve: muchos alumnos usan apps de marca blanca del gimnasio (en App Store encontré la de un gimnasio, no la oficial) |
| WHOOP | Referencia de diseño | «Puck»: círculo de línea fina con una W hecha de trazos diagonales | Marca solo en negro o blanco; el color se reserva para los datos (verde azulado `#00F19F` solo para llamados a la acción) | WHOOP en mayúsculas. Titulares en Proxima Nova Bold con 10 % de espaciado; cifras en DINPro | Premium y sobrio. El color significa algo, no decora |
| Ladder | Referencia de diseño | Tramo de escalera inclinado que se lee como H, con bisel | Lima neón `#E0F800` con negro | LADDER en mayúsculas extendidas, con cortes rectos | Progresión (subir peldaños), energía joven |
| Apple Fitness | Referencia de diseño | Tres anillos concéntricos (rosa rojo, verde, cian) sobre negro | Multicolor sobre negro | Del sistema | Cerrar el día. El símbolo **es** el indicador de progreso |
| Lyfta (extra) | Registrador | Figura humana levantando una pesa | Azul `#30A0F8` | No revisado | Ejemplo del cliché de la silueta |

### Patrones que se repiten

- **Monograma de la inicial** en 8 de 12: H (Hevy), F (Fitbod), J (JEFIT), B (Boostcamp), C (TrueCoach), F (Everfit), H (Ladder), W (WHOOP). Es el patrón dominante y, por lo mismo, el más genérico.
- **Fondo negro o casi negro** en 7 de los 14 íconos (Strong, Hevy, Hevy Coach, Alpha, WHOOP, Everfit Coach, Apple Fitness).
- **Un solo acento saturado**: azul eléctrico (Strong, JEFIT, Alpha, Lyfta), lima neón (Everfit, Ladder), rojo o naranja (Fitbod, Boostcamp), violeta (TrueCoach), amarillo (Trainerize). **Ninguno usa verde menta o salvia** como color de marca.
- **Logotipo en mayúsculas, palo seco y negrita** en 7 (Strong, Hevy, JEFIT, Boostcamp, Trainerize, WHOOP, Ladder). Las plataformas de entrenador usan minúsculas para verse más cercanas (TrueCoach, Everfit).
- **Inclinación y velocidad**: cursiva (JEFIT), ala (Everfit), escalera inclinada (Ladder), líneas de movimiento (Trainerize).
- **Dos apps, una marca**: Hevy Coach suma la palabra «Coach»; Everfit invierte los colores para la app del entrenador.

### Clichés del rubro a evitar

- Mancuerna, barra o discos literales (Strong, Alpha Progression).
- Rayo (JEFIT, Trainerize).
- Silueta humana o figura levantando pesas (Lyfta, Trainerize).
- Alas, cursivas y líneas de velocidad (Everfit, JEFIT, Trainerize).
- Hexágonos «tecnológicos» con volumen y chevrones hacia arriba (Fitbod, TrueCoach, Boostcamp).
- Lima neón sobre negro, la moda actual (Everfit, Ladder).
- Mayúsculas pesadas que gritan; también llamas, músculos, pesas rusas y degradados.
- Del trabajo rechazado de GymTrack (no repetir): libreta o cuaderno, renglones, la «G de renglones», azul lapicera.

---

## 2. Botones y microinteracciones en registradores

| Momento | Patrón observado | Dónde | Por qué funciona con una mano y cansado |
|---|---|---|---|
| Marcar una serie | Casilla en el borde derecho de la fila. Al tocarla, **toda la fila** se pinta verde claro y parte el descanso | Hevy (visto en capturas de su sitio y en su ayuda) | Un solo blanco en la zona del pulgar diestro. El color de la fila confirma de un vistazo, sin leer. Nada de formularios |
| Lo de la vez pasada | Columna «Anterior» en gris con la marca previa; solo cambias lo distinto | Hevy (visto); es la recomendación general de las guías | Menos decisiones y menos tipeo |
| Kilos y repeticiones | **Teclado numérico del sistema**, sin botones de más y menos | Hevy (visto); Fitbod: «toca el campo y escribe» (ayuda oficial). Strong: calculadora de discos y de calentamiento (ficha de App Store). Si Strong usa teclado propio: **no verificado** | Rápido para saltos grandes, pero el teclado tapa media pantalla y sus teclas son chicas |
| Tipo de serie | Letra en la columna de la serie (W naranja = calentamiento) en vez de chips | Hevy (visto). Strong etiqueta calentamiento, fallo y drop set (ficha de App Store) | No suma controles a la fila |
| Descanso | Parte solo al marcar la serie. Barra fija abajo con la cuenta grande (02:20) y tres botones: −15, +15 y Omitir (relleno, en color) | Hevy (visto). Boostcamp: hoja con −15/+15, pausa y omitir | Abajo está al alcance del pulgar. Cifras grandes se leen de lejos. Ajustas en pasos fijos sin teclado |
| Descanso fuera de la app | Widget o Live Activity: marcas series y ajustas ±15 s con el teléfono bloqueado | Hevy (iOS y Android), Boostcamp (iOS) | No hay que desbloquear con las manos con magnesio |
| Elegir duración | Rueda en hoja inferior con botón ancho «Listo» | Hevy (visto) | Un gesto de pulgar y un botón grande al final |
| Terminar | Píldora azul «Finish» arriba a la derecha | Hevy (visto) | Lejos del pulgar: cuesta tocarla por error |
| Empezar entrenamiento | Botón ancho de «empezar entrenamiento vacío» | Hevy (tiene página de la función). Diseño exacto: **no verificado** | — |
| Sonido y vibración | Hevy: sonido «Check Set» al marcar, con volumen ajustable. StrongLifts: alerta «Rest done» y aviso previo. Hápticos en Hevy o Strong: **no verificado** | Ayudas oficiales | Aviso sin mirar la pantalla |

**Reglas de diseño de descanso** (análisis de screensdesign sobre varias apps): separa pausa, omitir y terminar; muestra la siguiente serie bajo la cuenta; distingue «listo» de «corriendo»; si el descanso parte solo, que el cambio se note.

**Hápticos en Android**: `CONFIRM` es una vibración corta y liviana para una acción lograda; `REJECT` es más fuerte, para un error. Google recomienda usar estas constantes semánticas y no duraciones en milisegundos.

### Patrones de botones

1. Una sola acción principal por fila (marcar), en el borde derecho.
2. La confirmación es un cambio de color de toda la superficie, no un ícono chico.
3. El descanso parte solo y vive abajo, fijo.
4. Se ajusta con pasos fijos (±15 s) en vez de teclado.
5. Se prellena con lo de la vez pasada.
6. La acción de cierre queda lejos del pulgar.
7. Ojo: en la captura de Hevy, los botones −15 y +15 se ven más bajos que 48 dp (no lo medí). El líder no cumple la medida que pide nuestro PRD.

---

## 3. Huecos donde GymTrack puede diferenciarse siendo minimalista

1. **Color libre**: nadie de la muestra usa verde menta como marca. La menta de los tokens es territorio propio frente al azul eléctrico, el lima neón y el rojo. Como texto sobre blanco no pasa el contraste: ahí van menta profunda `#2f7f68` o tinta.
2. **Símbolo sin inicial y sin objeto de gimnasio**: 8 de 12 usan monograma. Un signo de la acción central (serie hecha, avanzar a la siguiente, dos personas que se coordinan) se distingue más que otra G.
3. **El símbolo como indicador** (lo que hace Apple Fitness): la forma del logo puede ser también el estado «hecho» del botón de marcar serie. Marca y producto quedan amarrados.
4. **Calma en vez de grito**: el rubro usa mayúsculas, cursivas, neón y rayos. Un logotipo en mayúsculas y minúsculas, peso medio y sin cursiva ya se ve distinto. Manrope lo permite.
5. **El color significa algo** (como WHOOP): la marca en tinta o blanco, y el color reservado para estados como «serie hecha». Calza con el modo gimnasio oscuro.
6. **Entrenador y alumno**: la competencia directa tiene las marcas más genéricas (chevrón, ala, rayo), y Trainerize vive en marca blanca. Hay espacio para un símbolo que nombre la relación y que conviva con el nombre del entrenador.
7. **Más y menos de 56 dp**: los líderes usan teclado. Botones grandes con un paso según el ejercicio (2,5 kg o 1 repetición), repetición si mantienes presionado y escritura directa al tocar la cifra son un hueco real.
8. **Descanso abajo con controles de 56 dp** y vibración `CONFIRM` al terminar. Con «reducir movimiento»: sin barra animada, solo la cifra y la vibración.
9. **Marcar serie**: relleno de toda la fila y vibración `CONFIRM`. Con «reducir movimiento»: cambio de color instantáneo, sin escala ni rebote.

---

## Fuentes

**Íconos y fichas (App Store)**
- API de búsqueda: https://itunes.apple.com/search?term=hevy&entity=software&country=us
- Strong https://apps.apple.com/us/app/id464254577 · Hevy https://apps.apple.com/us/app/id1458862350 · Hevy Coach https://apps.apple.com/us/app/id6502961756
- Fitbod https://apps.apple.com/us/app/id1041517543 · JEFIT https://apps.apple.com/us/app/id449810000 · Alpha Progression https://apps.apple.com/us/app/id1462277793
- Boostcamp https://apps.apple.com/us/app/id1529354455 · TrueCoach https://apps.apple.com/us/app/id1439127794 · Everfit https://apps.apple.com/us/app/id1438926364 · Everfit for Coach https://apps.apple.com/us/app/id1485827117
- WHOOP https://apps.apple.com/us/app/id933944389 · Ladder https://apps.apple.com/us/app/id1502936453 · Apple Fitness https://apps.apple.com/us/app/id1208224953 · Lyfta https://apps.apple.com/us/app/id6443740936

**Sitios oficiales (cabeceras capturadas)**
- https://www.hevyapp.com/ · https://www.strong.app/ · https://www.jefit.com/ · https://alphaprogression.com/en · https://www.boostcamp.app/
- https://truecoach.co/ · https://everfit.io/ · https://www.trainerize.com/ · https://www.joinladder.com/
- Fitbod (https://fitbod.me/) y WHOOP (https://www.whoop.com/) bloquearon la captura.

**Marca**
- Trainerize, nueva identidad: https://www.trainerize.com/blog/our-brand-evolution-the-story-behind-the-new-tz-app-identity
- WHOOP, guía de marca (PDF): https://developer.whoop.com/assets/files/WHOOP%20-%20Brand%20&%20Design%20Guidelines-bdea3554e94b4ea09e68695b1e8dc8e7.pdf
- Strong, íconos alternativos en la versión PRO: https://screensdesign.com/showcase/strong-workout-tracker-gym-log

**Botones y descanso**
- Hevy, descanso automático (con capturas): https://www.hevyapp.com/features/workout-rest-timer/
- Hevy, Live Activity: https://www.hevyapp.com/features/live-activity/
- Hevy, cómo registrar: https://help.hevyapp.com/hc/en-us/articles/35361530647959
- Hevy, sonidos: https://help.hevyapp.com/hc/en-us/articles/35385404949143-Rest-Timer-Default-Rest-Timer-How-to-Add-Adjust-Volume-and-Sound
- Fitbod, editar series: https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod
- Boostcamp, descanso: https://www.boostcamp.app/features/rest-timer
- StrongLifts, descanso: https://support.stronglifts.com/article/25-rest-timer
- Controles de descanso en varias apps: https://screensdesign.com/articles/workout-app-rest-timer-controls-ux/
- Guía de diseño de apps de fitness: https://madegooddesigns.com/fitness-app-design/
- Uso con una mano (resume el estudio de Hoober): https://www.monterail.com/blog/thumb-friendly-navigation-word-oriented-design
- Hápticos en Android: https://developer.android.com/develop/ui/views/haptics/haptic-feedback y https://source.android.com/docs/core/interaction/haptics/haptics-ux-foundation
