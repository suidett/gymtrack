# Revisión de dirección de arte: Visto, Dupla y Más

Fecha: 2026-11-17. Revisé las láminas de logo, los PNG de 16 px ampliados, los íconos de 512 con sus máscaras, las capturas de botones por tramos y el CSS de cada `botones.html`.

## Orden

1. **Más**
2. **Dupla**
3. **Visto**

**Recomendación.** Me quedo con Más: es el único símbolo que no se confunde con el de otra app, a 16 px sale nítido y sus botones son los mejor resueltos para el gimnasio con poca luz. Dupla tiene el sistema de botones más coherente, pero su ícono es el más anónimo. Visto es correcta y la más barata de construir, pero un visto dentro de un círculo es el signo más común que existe. Si quieres mezclar: el logo y los botones de Más, con el aro vacío de Dupla para la serie pendiente.

## Lo que cumplen las tres

- Las tres siguen siendo distintas: redondo y menta, pastilla en blanco y negro, recto en grafito y ámbar.
- No hay degradados, sombras, filtros, `backdrop-filter`, modos de fusión ni máscaras en el CSS. Todo sale con vistas, bordes, opacidad y transformaciones, más `react-native-svg` para los trazos.
- Ninguna curva tiene rebote. Nada pasa de 250 ms salvo el ciclo de carga.
- «Reducir movimiento» funciona con el interruptor y con la preferencia del sistema; la carga pasa a texto fijo.
- Medidas de 48 y 56 dp, y la regla de qué color nunca es texto, se respetan en lo que vi.
- Nada recuerda a la libreta ni a los renglones rechazados. No vi mancuernas, rayos ni lima neón.

No probé nada en un teléfono Android real ni revisé los valores de contraste uno por uno: tomé los que calcularon los diseñadores.

## Más

**Veredicto.** La más propia y la que mejor responde al uso real. Le falta pulir el botón de más, la serie pendiente y la versión clara.

Fortalezas:
- Símbolo propio, sin contenedor, que a 16 px queda nítido al píxel.
- El bloque de más y menos es el mejor de las tres: tres piezas separadas, cifra grande, límites claros.
- La fila hecha en ámbar se distingue de un vistazo, en gimnasio y en clara.
- Movimiento seco y coherente con las formas rectas.

Arreglos:
1. Serie pendiente: quitar el visto tenue del cuadrado vacío. Hoy parece una casilla ya marcada o deshabilitada.
2. Mostrar los kilos enteros sin decimal («85», no «85,0») y resolver el giro de dígitos igual.
3. Menos de 18 × 4 dp, para que pese lo mismo que los tramos del más.
4. Logotipo: cerrar el par «m T»; a tamaño grande se lee «Gym Track».
5. Clara: el ámbar casi desaparece. Darle un segundo lugar fijo además de la fila hecha (por ejemplo el interruptor encendido, con borde `#8A5A00`).
6. Ícono: negro con un color vivo es lo que hace la mitad del rubro. Probar una variante con fondo `#1A1D20` y compararla en una grilla de lanzador junto a otros íconos.
7. Entregar `captura-botones-clara.png`; hoy solo existe la captura en gimnasio.
8. Renombrar `simbolo.svg` a «sobre oscuro» o dejar como archivo base la versión de un color: abierto sobre blanco, los tramos claros no se ven.

## Dupla

**Veredicto.** El sistema de botones más coherente: una sola regla (contorno o relleno) explica todo. El logo es el punto débil.

Fortalezas:
- La serie pendiente es un aro vacío, sin visto fantasma: la más clara de las tres.
- Chips, interruptor y carga repiten el aro y el disco sin forzarlo.
- El violeta aparece solo en foco, enlaces y avisos del entrenador.
- Ícono claro, que se separa de tanto ícono negro.

Arreglos:
1. Ícono: el símbolo se ve chico y anónimo sobre el hueso. Subirlo al 64 % del ancho y revisar que siga dentro del 66 %.
2. Dos círculos lado a lado es una construcción que ya usan otras marcas. Probar el símbolo junto a ellas antes de decidir y, si se parecen, cambiar la proporción (aro más grande que el disco, o más separación).
3. Sacar de la entrega la variante invertida: dentro del círculo se lee como un par de ojos.
4. Visto de la serie hecha: subirlo de 24 a 30 dp. Dentro del disco de 56 se pierde.
5. Pastillas de kilos y de repeticiones del mismo ancho, para que el más quede en el mismo lugar bajo el pulgar.
6. «Sí, borrar» presionado: que se oscurezca (agregar un token de rojo presionado) en vez de vaciarse. Vaciarlo contradice la regla «relleno es lo principal».
7. Confirmar el texto deshabilitado en gimnasio `#A3A39E` y anotarlo en `tokens.json` como cambio respecto del encargo.
8. Cifras: la coma de DM Mono abre demasiado «62,5». Ajustar ese par o usar la coma con ancho reducido.

## Visto

**Veredicto.** Bien ejecutada y amable, y conserva los tokens del PRD. Pero el logo no es propio: es el signo universal de «listo».

Fortalezas:
- Usa la paleta y las letras que ya están en el proyecto: es la más barata de construir.
- El visto se lee bien a 16 px con su versión ajustada.
- El borde interior `#2F7F68` en el primario claro resuelve el 3:1 de la menta.
- La zona de prueba es la más completa.

Arreglos:
1. Ícono: con la máscara de cuadrado redondeado se lee como casilla de app de tareas. Probar el visto más grande y descentrado, o saliendo del borde, hasta que deje de parecer una casilla.
2. Serie pendiente: quitar el visto tenue del aro vacío; hoy pendiente y hecha se diferencian casi solo por el color.
3. Secundario tonal presionado: hoy queda idéntico al primario en reposo. Usar un tono intermedio.
4. Chips de la zona de prueba en una sola fila con desplazamiento horizontal.
5. Peligro en gimnasio: dejar «Borrar rutina» con contorno y reservar el relleno `#FF8A80` para la confirmación.
6. Resolver los dos rojos presionados que quedaron fuera de la paleta: aprobarlos como tokens o quitarlos.
7. Lámina: mover el rótulo «7 · 12» para que no cruce la línea punteada.
8. Notas de «Peligro»: el texto dice que el suave lleva texto `#131A17` y la captura lo muestra rojo. Corregir el que esté mal.
