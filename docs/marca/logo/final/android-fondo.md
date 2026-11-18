# Ícono adaptativo de Android: capa de fondo

- Color de fondo: **#131A17** (tinta), plano, sin imagen.
- Primer plano: `android-foreground.svg` (lienzo de 108 dp, fondo transparente).
- Monocroma (íconos temáticos): `android-monochrome.svg`. Android usa solo la silueta; el blanco es convención.

En Expo esto corresponde a `android.adaptiveIcon.backgroundColor: "#131A17"`, con el primer plano y la monocroma exportados a PNG de 1024 × 1024 o convertidos a VectorDrawable. No se ha tocado `app.json` ni `apps/mobile/assets`: eso va después, con aprobación.
