// ─────────────────────────────────────────────────────────────────────────────
// Bajar un archivo de la API, en la web · Zona: Alumno (Perfil, exportar mis datos)
//
// Qué hace: baja el ZIP con fetch y lo entrega con un enlace de descarga, sin abrir otra pestaña.
// Antes se abría la URL con Linking.openURL después de esperar a la API, y el navegador lo
// bloqueaba como ventana emergente (sobre todo Safari en el iPhone): la app decía «Listo» y no
// bajaba nada. Si fetch falla (por ejemplo, sin CORS), la página navega a la URL: el servidor
// responde con content-disposition attachment, así que el navegador descarga sin salir de la app.
// Tócalo cuando: cambie cómo se entrega el archivo en la web.
// No lo toques para: el teléfono (descargarArchivo.ts) ni cómo se pide la URL (./api, exportarDatos).
// Depende de: las API del navegador (fetch, Blob, URL.createObjectURL).
// ─────────────────────────────────────────────────────────────────────────────

/** Baja el archivo y lo guarda con `nombre`; en el iPhone, Safari muestra «Descargar». */
export async function descargarArchivo(url: string, nombre: string): Promise<void> {
  let blob: Blob;
  try {
    const r = await fetch(url, { credentials: 'omit' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    blob = await r.blob();
  } catch {
    window.location.assign(url);
    return;
  }
  const enlace = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = enlace;
  a.download = nombre;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari necesita el enlace vivo un rato después del clic.
  setTimeout(() => URL.revokeObjectURL(enlace), 60_000);
}
