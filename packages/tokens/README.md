# @gymtrack/tokens

Colores, fuentes y radios del diseño de GymTrack en un solo lugar.

- `index.js`: el objeto para usar desde código (por ejemplo, el color de la barra de estado).
- `tailwind.preset.js`: el mismo objeto como preset de Tailwind. La app lo carga en `tailwind.config.js`; una web lo cargaría igual.

Tres colores: `primary` (menta, acción), `accent` (violeta, celebración y descanso) e `ink` (tinta, texto). Los neutros `bg`, `surface`, `line` y `field` son fondos y bordes.

Fuentes: Manrope para texto e IBM Plex Mono para cifras. Las clases llevan el peso en el nombre: `font-sans-bold`, `font-mono-semibold`. No uses `font-bold` con estas fuentes: en React Native no combina el peso con la familia.
