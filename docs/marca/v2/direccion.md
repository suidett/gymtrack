# GymTrack: tres direcciones para logo y botones

Fecha: 2026-11-17. Alcance: solo logo y botones. Sin pantallas completas, sin backend.
Se apoya en `investigacion.md` (esta misma carpeta). Lo anterior («Cuaderno Exacto», la G de renglones, las composiciones A a E) quedó descartado y no se repite aquí: nada de libreta, renglones ni azul lapicera.

## Lo que dejó la investigación

- 8 de 12 apps usan la inicial como logo y la mitad usa fondo negro con un color chillón. Mancuernas, rayos, siluetas y lima neón son los clichés.
- Nadie usa verde menta. Las marcas más sobrias (WHOOP, Apple Fitness) dejan el logo en un solo color y reservan el color para los estados.
- En botones manda Hevy (casilla a la derecha que pinta toda la fila), pero usa teclado para kilos y repeticiones y sus botones chicos se ven bajo 48 dp. Ahí está el espacio de GymTrack: más y menos de 56 dp, vibración al confirmar y versión con «reducir movimiento».

Por eso ninguna de las tres direcciones usa la G ni un objeto de gimnasio. En las tres, **el símbolo sale de un botón real de la app**.

## Las tres, de un vistazo

| | 1. Visto | 2. Dupla | 3. Más |
|---|---|---|---|
| Idea en una frase | El logo es el botón de «serie hecha» | Un aro y un disco: lo planeado y lo hecho, tu entrenador y tú | El logo es el botón de más: un poco más cada vez |
| Símbolo | Círculo menta con un visto | Aro vacío junto a un disco lleno | Signo más de dos tonos: un trazo ámbar que cruza un menos |
| Paleta | Menta del PRD, clara | Blanco y negro, violeta solo para foco y avisos | Grafito oscuro con ámbar |
| Carácter de los botones | Redondeados (radio 16), amables | Pastillas: contorno es «por hacer», relleno es «hecho» | Rectos (radio 8), de instrumento |
| Movimiento | Suave, se asienta | Directo, se llena | Seco, casi instantáneo |
| Letra | Manrope + IBM Plex Mono | Instrument Sans + DM Mono | Archivo + JetBrains Mono |
| Riesgo honesto | Un visto es un signo muy común; lo propio lo pone el color menta | Dos círculos son muy simples; hay que cuidar que no parezca un interruptor cualquiera | Un signo más puede recordar a una cruz de farmacia; se evita con trazos delgados, dos tonos y nunca en verde, rojo ni dentro de un círculo |

---

## 1. Visto (slug `visto`)

**Concepto.** El logo es el mismo botón que tocas al terminar una serie: un círculo menta con un visto.

**Por qué calza.** Marcar la serie es lo que más se repite en GymTrack. Si el logo y ese botón son lo mismo, la marca aparece cada vez que cumples. Y el menta está libre: nadie del rubro lo usa.

**Logo.** Círculo lleno menta con un visto grueso en tinta, de puntas redondas. Logotipo «GymTrack» en Manrope 700, mayúsculas y minúsculas, a la derecha. Ícono de app: fondo menta completo y el visto en tinta.

**Paleta (clara / modo gimnasio).**

| Uso | Clara | Modo gimnasio |
|---|---|---|
| Fondo | `#F5F7F5` | `#0E1412` |
| Superficie | `#FFFFFF` | `#18211D` |
| Texto | `#131A17` | `#ECF2EF` |
| Texto secundario | `#56635D` | `#9DADA6` |
| Acción (relleno, con texto tinta) | `#45B392` | `#45B392` |
| Acción presionada | `#37997C` | `#6FD0B2` |
| Acento (texto y bordes de marca) | `#1F6B56` texto, `#2F7F68` bordes | `#6FD0B2` |
| Fila hecha | `#DDF3EC` | `#1D3A31` |
| Peligro | `#B3261E` | `#FF8A80` |

Nunca como texto: la menta `#45B392` sobre fondos claros (contraste 2,6:1).

**Botones.** Radio 16; pastilla completa solo en chips. Primario menta con texto tinta. Más y menos redondos de 56 dp con la cifra al medio en IBM Plex Mono. Marcar serie: círculo de 56 dp que pasa de contorno gris a menta lleno con visto, y pinta la fila entera.

**Movimiento.** Suave y corto: presionar 90 ms, soltar 180 ms, marcar serie 200 ms con el visto que se dibuja. Vibración de confirmación al marcar. Con «reducir movimiento»: solo cambio de color, sin escala ni dibujo.

**No queremos.** Que parezca app de tareas o de mensajería (nada de doble visto), menta como texto, degradados, sombras de neón.

---

## 2. Dupla (slug `dupla`)

**Concepto.** Un aro vacío y un disco lleno, uno al lado del otro: lo planeado y lo hecho, tu entrenador y tú.

**Por qué calza.** GymTrack existe para dos personas que se coordinan, y para pasar de lo que estaba en el plan a lo que hiciste. Ese paso, de vacío a lleno, es también cómo funcionan todos los botones de esta dirección.

**Logo.** Aro (izquierda) y disco (derecha) del mismo tamaño, en un solo color. Logotipo «GymTrack» en Instrument Sans 600. Ícono de app claro, fondo hueso con el símbolo en negro, para distinguirse entre tanto ícono negro.

**Paleta (clara / modo gimnasio).**

| Uso | Clara | Modo gimnasio |
|---|---|---|
| Fondo | `#F4F4F2` | `#0C0C0C` |
| Superficie | `#FFFFFF` | `#1A1A19` |
| Texto | `#111111` | `#F4F4F2` |
| Texto secundario | `#5C5C58` | `#A3A39E` |
| Acción (relleno) | `#111111` con texto blanco | `#F4F4F2` con texto `#111111` |
| Acción presionada | `#3A3A38` | `#CFCFCB` |
| Acento (foco, enlaces, avisos del entrenador) | `#5A45E0` | `#A698FF` |
| Fila hecha | `#E7E7E3` | `#2A2A28` |
| Peligro | `#C0271D` | `#FF7A70` |

Nunca como texto: el gris de bordes `#8A8A85` y el violeta claro `#A698FF` sobre fondos claros.

**Botones.** Todos en forma de pastilla. Regla única: contorno es «por hacer» o secundario; relleno es «principal» o «hecho». Más y menos dentro de una sola pastilla de 56 dp con la cifra al medio en DM Mono. Marcar serie: aro de 56 dp que se llena y queda como disco con visto. El interruptor encendido es, literalmente, el símbolo.

**Movimiento.** Directo, sin achicar ni agrandar nada: las cosas se llenan. Presionar 60 ms, soltar 140 ms, marcar serie 180 ms. Con «reducir movimiento»: cambio instantáneo.

**No queremos.** Que se lea como el botón de pausa o como un interruptor genérico, pastillas de colores, violeta como relleno de botones, sombras.

---

## 3. Más (slug `mas`)

**Concepto.** El logo es el botón de más: entrenar es sumar un poco cada vez.

**Por qué calza.** Los botones de más y menos de 56 dp son lo que GymTrack hace mejor que los líderes (que usan teclado). Un kilo más, una repetición más: es el progreso dicho sin flechas ni escaleras.

**Logo.** Un signo más delgado de dos tonos: un trazo vertical ámbar que cruza un menos claro, con un pequeño corte entre ambos. Logotipo «GymTrack» en Archivo 600. Ícono de app en grafito.

**Paleta (modo gimnasio es la principal / clara).**

| Uso | Modo gimnasio | Clara |
|---|---|---|
| Fondo | `#0F1113` | `#F3F4F5` |
| Superficie | `#1A1D20` (alta `#24282C`) | `#FFFFFF` |
| Texto | `#F2F3F4` | `#0F1113` |
| Texto secundario | `#A0A6AD` | `#555B62` |
| Acción (relleno) | `#F5B83D` con texto `#0F1113` | `#0F1113` con texto blanco |
| Acción presionada | `#D99A1F` | `#2B3035` |
| Acento | `#F5B83D` | `#F5B83D` solo como relleno; texto `#8A5A00` |
| Fila hecha | `#3A2F14` | `#FCEFC9` |
| Peligro | `#FF6B5E` | `#B42318` |

Nunca como texto: el ámbar `#F5B83D` sobre fondos claros (contraste 1,8:1).

**Botones.** Rectos con radio 8. El bloque de más y menos es el protagonista: tres piezas de 56 dp y la cifra grande en JetBrains Mono; el botón de más lleva el símbolo. Marcar serie: cuadrado de 56 dp que se pone ámbar con visto.

**Movimiento.** Seco, de instrumento: el color cambia al tiro al presionar, 100 ms al soltar, las cifras giran como contador en 100 ms. Con «reducir movimiento»: todo instantáneo.

**No queremos.** Cruz de farmacia o de primeros auxilios (nunca verde, rojo, ni dentro de un círculo), lima neón, estética de videojuego, brillos.

---

## Lo que cumplen las tres

- El nombre sigue siendo «GymTrack», en mayúsculas y minúsculas, sin cursiva.
- El símbolo se lee a 16 px y funciona en un solo color.
- Ícono de Android de 512 × 512 con el dibujo dentro del 66 % central.
- Toque mínimo 48 dp; más y menos de 56 dp.
- Contraste AA: texto 4,5:1 y componentes 3:1, en clara y en modo gimnasio (los pares de arriba están calculados).
- Todo se puede construir en React Native con NativeWind y Reanimated.
- Cada animación tiene su versión con «reducir movimiento»; la vibración se mantiene.
- Sin emojis, sin degradados, sin rebotes, sin confeti.

## Qué sigue

Cada dirección se desarrolla por separado en su carpeta (`visto/`, `dupla/`, `mas/`) con el logo, el ícono y la lámina de botones. Después eliges una, o me dices qué mezclar.
