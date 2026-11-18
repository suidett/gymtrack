# @gymtrack/tokens

La marca «Más» de GymTrack en un solo lugar: los dos temas, las fuentes, el radio, las medidas y los tiempos. Los valores salen de `docs/marca/v2/mas/tokens.json` y los nombres de color de `docs/pantallas/sistema.css`.

- `index.js`: el objeto para usar desde código (`temas.gimnasio.fondo`, `fonts.mono.bold`, `medidas.paso`). En la app, para el tema activo, usa `useTema().c` de `src/lib/tema.tsx`.
- `tailwind.preset.js`: las clases de NativeWind. Los colores apuntan a variables CSS (`--fondo`, `--texto-2`...) que la raíz de la app llena con el tema elegido, así la misma clase sirve en modo gimnasio y en clara.

## Temas

Modo gimnasio (oscuro) es el principal; clara es la secundaria. Mismo nombre de color en los dos:

| Clase | Uso |
| --- | --- |
| `bg-fondo`, `bg-sup`, `bg-sup-alta` | fondo de pantalla, tarjeta, presionado o deshabilitado |
| `text-texto`, `text-texto-2` | texto y texto secundario |
| `bg-accion`, `text-accion-texto`, `bg-accion-pres` | botón primario (ámbar en gimnasio, grafito en clara) |
| `text-acento-texto` | acento como texto (nunca el ámbar sobre claro) |
| `bg-fila-hecha`, `bg-hecho-fondo`, `border-hecho-borde` | serie o fila hecha |
| `border-borde`, `border-campo-borde`, `border-campo-edicion` | bordes de controles y campos |
| `bg-peligro`, `text-peligro-sobre`, `text-peligro` | peligro |
| `bg-desh-fondo`, `text-desh-texto` | deshabilitado |

Los nombres de la versión 0.1 (`bg-primary`, `text-ink-muted`, `bg-surface`, `border-line`) siguen existiendo y apuntan a los nuevos, para que el código viejo se vea con la marca nueva. No los uses en pantallas nuevas.

## Fuentes

Archivo para la interfaz (500 texto, 600 botón, 700 títulos y etiquetas) y JetBrains Mono 700 para las cifras. Las clases llevan el peso: `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`, `font-mono-bold`. No uses `font-bold`: en React Native no combina el peso con la familia.

## Radio

Un solo radio de 8 dp para todo control: `rounded-control`. La hoja inferior usa `rounded-t-hoja` (12) y la perilla del interruptor `rounded-perilla` (6).
