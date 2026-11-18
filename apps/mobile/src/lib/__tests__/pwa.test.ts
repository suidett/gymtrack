// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de la app web instalable · Zona: Configuración
//
// Qué hace: revisa sin navegador lo que el iPhone necesita para instalar GymTrack desde Safari
// y lo que Firebase Hosting necesita para servirla, para que nadie lo rompa sin darse cuenta.
// WEB-005: manifest con nombre, colores de la marca, standalone, vertical e íconos que existen
// con su tamaño real; index.html con las etiquetas de Apple, viewport-fit=cover y el manifest.
// WEB-006: firebase.json con dos sitios (maquetas como estaba y app con reescritura a index.html)
// y .firebaserc con cada target en su sitio. WEB-009: el service worker de los avisos publicado
// en la raíz y sin caché.
// Tócalo cuando: cambie el nombre, los colores, los íconos o cómo se publica la versión web.
// No lo toques para: cómo se ve una pantalla en web (src/features).
// Depende de: public/, app.json, firebase.json y .firebaserc del repo.
// ─────────────────────────────────────────────────────────────────────────────
// Corre en Node (vitest), no en el teléfono: por eso trae los tipos de Node solo para este archivo.
/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MOVIL = resolve(__dirname, '../../..');
const RAIZ = resolve(MOVIL, '../..');
const leerJson = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf8'));
const GRAFITO = '#0F1113';

/** Ancho y alto de un PNG, leídos del encabezado IHDR. */
function tamanoPng(ruta: string): { ancho: number; alto: number } {
  const b = readFileSync(ruta);
  expect(b.subarray(1, 4).toString('ascii'), `${ruta} no es PNG`).toBe('PNG');
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

describe('WEB-005 la app web se puede instalar en el iPhone', () => {
  const manifest = leerJson(resolve(MOVIL, 'public/manifest.json'));
  const html = readFileSync(resolve(MOVIL, 'public/index.html'), 'utf8');
  const app = leerJson(resolve(MOVIL, 'app.json')).expo;

  it('el manifest trae nombre, colores de la marca, standalone y vertical', () => {
    expect(manifest.name).toBe('GymTrack');
    expect(manifest.short_name).toBe('GymTrack');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.start_url).toBe('/');
    expect(manifest.background_color.toUpperCase()).toBe(GRAFITO);
    expect(manifest.theme_color.toUpperCase()).toBe(GRAFITO);
    expect(manifest.lang).toBe('es-CL');
  });

  it('cada ícono del manifest existe y mide lo que dice; hay de 192, de 512 y el de Apple de 180', () => {
    const tamanos = new Set<string>();
    for (const icono of manifest.icons as { src: string; sizes: string }[]) {
      const ruta = resolve(MOVIL, 'public', `.${icono.src}`);
      expect(existsSync(ruta), icono.src).toBe(true);
      const { ancho, alto } = tamanoPng(ruta);
      expect(`${ancho}x${alto}`, icono.src).toBe(icono.sizes);
      tamanos.add(icono.sizes);
    }
    expect([...tamanos]).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(tamanoPng(resolve(MOVIL, 'public/apple-touch-icon.png'))).toEqual({ ancho: 180, alto: 180 });
  });

  it('index.html enlaza el manifest y trae las etiquetas de Apple y viewport-fit=cover', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="GymTrack" />');
    expect(html).toMatch(/<meta name="apple-mobile-web-app-status-bar-style" content="(default|black|black-translucent)" \/>/);
    expect(html).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />');
    expect(html).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*" \/>/);
    // Expo cambia solo la primera aparición de cada marca: tiene que ser la del <html> y la del <title>.
    expect(html.indexOf('%LANG_ISO_CODE%')).toBe(html.indexOf('<html lang="%LANG_ISO_CODE%">') + '<html lang="'.length);
    expect(html.indexOf('%WEB_TITLE%')).toBe(html.indexOf('<title>%WEB_TITLE%</title>') + '<title>'.length);
  });

  it('app.json arma la versión web como una sola página, en español y con el tema grafito', () => {
    expect(app.web.output).toBe('single');
    expect(app.web.name).toBe('GymTrack');
    expect(app.web.lang).toBe('es-CL');
    expect(app.web.themeColor.toUpperCase()).toBe(GRAFITO);
  });
});

describe('WEB-006 Firebase Hosting publica las maquetas y la app en sitios separados', () => {
  const firebase = leerJson(resolve(RAIZ, 'firebase.json'));
  const rc = leerJson(resolve(RAIZ, '.firebaserc'));
  const sitio = (target: string) => (firebase.hosting as { target: string }[]).find((h) => h.target === target) as any;

  it('maquetas sigue publicando docs/pantallas sin los .md', () => {
    expect(sitio('maquetas').public).toBe('docs/pantallas');
    expect(sitio('maquetas').ignore).toContain('**/*.md');
    expect(sitio('maquetas').rewrites).toBeUndefined();
  });

  it('app publica lo que deja export:web y reescribe toda ruta a index.html (Expo Router)', () => {
    const appWeb = sitio('app');
    const exportWeb = leerJson(resolve(MOVIL, 'package.json')).scripts['export:web'] as string;
    const carpeta = /--output-dir (\S+)/.exec(exportWeb)?.[1];
    expect(appWeb.public).toBe(`apps/mobile/${carpeta}`);
    expect(appWeb.rewrites).toEqual([{ source: '**', destination: '/index.html' }]);
    const encabezados = (appWeb.headers as { source: string }[]).map((h) => h.source);
    expect(encabezados).toEqual(expect.arrayContaining(['/manifest.json', '/sw-avisos.js']));
  });

  it('WEB-009 el service worker de los avisos está en public/ (va a la raíz del sitio) y se sirve sin caché', () => {
    const sw = readFileSync(resolve(MOVIL, 'public/sw-avisos.js'), 'utf8');
    expect(sw).toContain("addEventListener('push'");
    expect(sw).toContain("addEventListener('notificationclick'");
    const regla = (sitio('app').headers as { source: string; headers: { key: string; value: string }[] }[]).find((h) => h.source === '/sw-avisos.js');
    expect(regla?.headers).toEqual(expect.arrayContaining([
      { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      { key: 'Service-Worker-Allowed', value: '/' },
    ]));
  });

  it('cada target apunta a su sitio del proyecto gymtrack-5dd46', () => {
    expect(rc.projects.default).toBe('gymtrack-5dd46');
    expect(rc.targets['gymtrack-5dd46'].hosting).toEqual({ maquetas: ['gymtrack-5dd46'], app: ['gymtrack-app-5dd46'] });
  });
});
