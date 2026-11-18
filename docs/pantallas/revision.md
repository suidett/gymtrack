# Revisión de las 19 maquetas

Martes 17 de noviembre de 2026. Revisé las 17 pantallas nuevas junto a Hoy y Registro, en modo gimnasio y en clara, con las capturas de cada estado y el HTML de cada archivo. Todavía no se aplicó ningún arreglo: esta es la lista para los dos diseñadores que siguen.

## Lo que está bien

- Las 17 pantallas usan los tokens de `sistema.css`. No hay sombras, degradados ni ámbar como texto sobre claro.
- La acción principal va abajo en todas, con 56 dp, y el más y menos es el mismo de Registro.
- Cada pantalla tiene sus estados del PRD, con vacíos, cargando y sin conexión, y se puede tocar lo importante.
- Los enlaces entre maquetas apuntan a archivos y estados que existen. Los que llevan a un lugar equivocado están en la lista de abajo.
- Los gráficos son coherentes: barras ámbar con borde, línea en ámbar oscuro en clara, grilla gris.

## Lo que se arregla

**1. Datos que no calzan entre pantallas.** Es lo más visible al navegar.

- **Volumen.** Hoy y Ficha dicen 41,3 t en noviembre, con semanas de unas 20 t. Progreso muestra semanas de 26 t y Motivos una sesión de 3,6 t. Valen Hoy y Ficha. Progreso y Motivos se ajustan.
- **Hoy, día de descanso.** Suma 4,8 t por Pierna A, pero Registro y Completada dan 13,5 t. Debe decir 54,8 t y 5 récords. Es un cambio en `hoy.html`, que era intocable: necesita tu permiso.
- **Historia de Martina.** Hay cuatro fechas de inicio distintas (13 de julio, 4 de agosto, 21 de septiembre, 30 de octubre). Queda una sola:
  - Cuenta desde el 1 de septiembre.
  - «Básica 3 días» propia hasta el 4 de octubre.
  - Vinculada con Camila el 5 de octubre.
  - «Adaptación» hasta el 1 de noviembre.
  - «Fuerza 4 días» desde el 2 de noviembre.
  - 34 sesiones en total, 28 años, 164 cm.
- **Clientes de Camila.** Rutinas dice que Joaquín y Florencia no tienen rutina. Clientes, Ficha y Alertas dicen Sebastián y Florencia. Valen estos últimos. También se alinean los nombres de las rutinas y los días por semana de cada cliente.
- **Empuje B.** Tiene ejercicios distintos en Detalle de rutina y en Ajustar cargas. Vale Ajustar cargas.
- **Récords de noviembre.** Progreso y Ficha los fechan distinto. Quedan sentadilla y prensa el 10 de noviembre y press de banca el 16.
- **Progreso.** Muestra la sesión de hoy como hecha aunque Hoy dice que falta. Por defecto queda antes de la sesión, y desde Completada llega con la sesión hecha.

**2. Mismas cosas dibujadas distinto.**

- Etiquetas con cuatro alturas y dos radios.
- Casillas de 20, 24 y 32 dp. La de Alertas se marca en blanco y las demás en ámbar.
- Seis cajas del código con tres estilos.
- Dos teclados distintos.
- Cabeceras de las pantallas con pestañas a distinta altura.
- Fechas escritas de tres formas.
- Batería en 64, 74 y 82 %.
- El formulario de dolor cambia de orden y de rótulos entre Completada y Detalle de ejercicio.

**3. Mismo concepto con nombres distintos.**

- «Sin avance», «Estancamiento» y «Estancado». Queda «Sin avance».
- «Por revisar» vale 3 en Clientes y 6 en Alertas. Queda 6 en las dos, con «3 nuevas».
- «Press banca» y «Press de banca». Queda «Press de banca».
- «Full body» y «Cuerpo completo». Queda «Cuerpo completo».
- «Alumna» y «Cliente». En la app queda «cliente», como en Ingreso.

**4. Enlaces que llevan al lugar equivocado.**

- «Ver rutina» en la Ficha abre la rutina como si fueras Martina, con «Empezar Pierna A».
- Las alertas y las filas de otros clientes abren la ficha de Martina con otro nombre en la cabeza.
- «Usar en una rutina» pierde el rol de entrenadora.
- «Próxima sesión» de Completada abre Pierna A en vez de Empuje B.

**5. Lo que pide el PRD y falta.**

- Hoja para tomar o subir foto en Progreso.
- Alertas abiertas dentro de la Ficha.
- Una entrada real hacia Motivos.
- El índice sigue con 17 pantallas como «Pendiente» y sin enlace.

**6. Textos.**

- «Al tiro», «CSV» y «vs.» se cambian por palabras simples.
- Hoy dice «código de 6 letras», pero el código lleva números.
- Queda el signo «~» en los minutos, que viene de Hoy.

La lista completa, archivo por archivo, va en la entrega de esta revisión.

## Piezas que pasan a `sistema.css` y `maqueta.js`

- Botón deshabilitado.
- Barra superior con sus íconos.
- Campo de texto con su mensaje de error.
- Etiqueta, casilla, avatar y cajas del código.
- Esqueleto de carga, banda de aviso y aviso de sin conexión.
- Cuadro de cifra y clases de gráfico.
- Opción grande y hoja alta.
- Teclado dibujado.
- Insignia en las pestañas.
- Aviso flotante que no tape el botón.
- Borde del ámbar en la barra de avance en clara.
- Parámetros `bajar` y `seccion`, y repintado que conserve foco y desplazamiento.

## Lo que queda abierto para ti

1. **Selector de rol en Ingreso.** El rol vive en la cuenta. ¿El selector se queda solo como texto o se quita?
2. **Consejos para el cliente con entrenador.** La tabla de permisos del PRD dice que solo registra motivos. La pantalla 20 dice que ve consejos. Hoy se muestran a los dos.
3. **Encuesta.** ¿«Terminar» va en la pantalla de revisión, junto al consentimiento, o en la pregunta 10 como dice el PRD?
4. **Entrada a Motivos.** Propongo un estado nuevo en Hoy, «Con aviso de baja». Necesita tocar `hoy.html`.
5. **Adherencia.** Clientes usa la semana y Ficha y Perfil usan 4 semanas. Los rótulos lo dicen, pero conviene una sola definición.
6. **Asignar una rutina.** ¿Crea una copia por cliente o es una sola compartida? Está dibujado como copia.
7. **Biblioteca de ejercicios.** ¿Viene sembrada? ¿Las referencias son archivos propios o enlaces?
8. **Foco de los campos en clara.** `sistema.css` usa grafito y las notas de marca piden ámbar oscuro.
9. **Fichas de otros clientes.** Solo Martina y Sebastián tienen ficha. Las demás filas muestran un aviso.
