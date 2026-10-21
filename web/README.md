# Mapa de inundaciones – Chaco y NEA (MVP)

Sitio estático: `index.html` + `estilo.css` + `app.js` + `data/*.json`. Librerías externas: Leaflet 1.9.4 (cdnjs) y Motion 11.18.2 (jsDelivr, opcional: sin ella se ve igual, sin animaciones). Fuente Inter con alternativa del sistema.
`actualizar.py` (solo biblioteca estándar) regenera los JSON. `servidor.py` (solo biblioteca estándar + SQLite) es **opcional**: recibe los envíos de usuarios y ofrece un panel para revisarlos.

Repositorio abierto: https://github.com/LucassToledo/mapa-inundaciones-nea

Creado por [@eltiolucas.ia](https://www.instagram.com/eltiolucas.ia/) (el crédito está en el encabezado y en el aviso legal de `index.html`).

## Qué hace

- **Tu dirección** (buscador de direcciones y localidades, GPS o punto en el mapa) + radio de 5/10/25 km. El mapa se centra y el panel responde primero "¿hay agua en tu punto?" con la última foto clara, y debajo:
  - **Fotos Sentinel-2 por fecha** (Microsoft Planetary Computer, color real de 10 m, últimos 75 días). Se elige una foto "antes" y otra "después" y se comparan con una barra deslizable sobre el mapa. Cada foto se clasifica con la banda SCL en un cuadrado de 300 m alrededor del punto: agua, agua a menos de 150 m, sin agua, nubes o sin dato.
  - **Pronóstico por mes** (Open-Meteo: caudal GloFAS y lluvia estacional): nivel del río de los próximos meses comparado con el mismo mes desde 1984, y el escenario "si llueve más". Es regional: muestra a cuántos km está el río modelado y no considera la altura del terreno.
  - Agua detectada por radar (Copernicus GFM), ríos cercanos, alertas del SMN y notas de prensa, como antes.
  - El enlace (`#z=lat,lon,radio&n=nombre`) abre la misma zona. Las direcciones y el GPS se redondean a 2 decimales (~1 km), llevan `&ap=1` y se llaman "Mi dirección" o "Mi ubicación" en el enlace.
- **Foto HD** (botón del dock): mosaicos de Esri World Imagery (sin clave, con atribución), 30 a 50 cm por píxel en la mayoría de la zona. Es imagen de **archivo** de meses o años atrás: sirve para ver calles, casas y terreno, no el agua de hoy. La ficha `#hdinfo` muestra el rango de fechas y la mejor resolución de la vista (consulta a la capa 4 del servicio). El agua de radar se dibuja encima de la HD. Zoom nativo hasta 17 (en zonas rurales Esri devuelve un cartel de "sin datos" desde el 18).
- **Menos paneles**: cada panel tiene una flecha (`#min-top`, `#min-panel`) que lo achica a su barra; el botón **Mapa** (`#solo`) esconde todo menos el aviso legal y el dock, y **Mostrar paneles** lo devuelve.
- **Cálculo del agua**: se piden los tiles crudos de Copernicus GFM y se cuentan los píxeles en el navegador (alfa 255 = dato válido, canal R = 1 es agua). Tarda unos 15–25 s con 10–25 km y reintenta hasta 8 pasadas hacia atrás, quedándose con las 2 que cubren ≥ 10 % de la zona.
- **Reproductor**: recorre las pasadas con fundido de opacidad. No interpola formas entre pasadas (inventaría agua).
- **Tutoriales**: recorrido guiado al primer ingreso (se recuerda en `localStorage`) y ayuda “¿Cómo se lee esto?” en cada pestaña.
- Búsqueda: primero `data/lugares.json` (123 localidades y departamentos), luego Georef (datos.gob.ar) y, al apretar Enter o tocar "Buscar como dirección", Nominatim (OSM).
- **Terceros desde el navegador del usuario**: las coordenadas (y la IP) llegan a Microsoft Planetary Computer y a Open-Meteo al abrir una zona, y el texto buscado a datos.gob.ar y OSM. Está dicho en el aviso legal. Open-Meteo es gratis solo para uso no comercial: consultar antes de un uso institucional con mucho tráfico.
- **CONAE**: su página de inundaciones es estática (2015) y no ofrece servicio de mapas, por eso no se integra. Detalle en `investigacion/08-fotos-satelitales-y-pronostico.md`.

## Probar en local

```bash
python -X utf8 servidor.py          # sirve web/ en http://localhost:8765 y habilita /api/envios
python -X utf8 servidor.py --test   # chequeo propio, imprime "ok"
```

Para un uso institucional con la Foto HD, crear una clave gratuita en ArcGIS Location Platform y ponerla en `CFG.esriKey` (`app.js`): los mosaicos se piden con `?token=` y quedan dentro de los términos de Esri.

`python -m http.server 8765` también sirve para ver el mapa, pero el formulario devolverá error (no hay API). Agregar `?test` a la URL corre un chequeo de la geometría del cálculo de agua.

## Subirlo al subdominio del ICCTI

- **Solo hosting de archivos**: copiar `index.html`, `estilo.css`, `app.js` y `data/`. Todo funciona menos la cola de envíos: en `app.js`, constante `CFG`, completar `formEndpoint` (Formspree, Getform, Apps Script…, recibe POST JSON) o `email` (abre el correo del usuario con el reporte). Sin ninguno, el formulario avisa que “el envío todavía no está habilitado”. **Hay que completar uno antes de publicar.**
- **Si el ICCTI permite Python**: correr `servidor.py` detrás de su proxy (HTTPS lo pone el proxy) con `ADMIN_TOKEN=<clave larga>`. Los envíos quedan en `envios.db` (SQLite) como *pendientes*; se revisan en `/admin?token=<clave>`. Aprobar un envío con enlace de YouTube lo agrega a `data/videos.json`; el resto solo se marca aprobado (no hay vista pública de reportes todavía). Límite de 5 envíos por IP por hora (en memoria), campo trampa anti-bots, `envios.db` y `*.py` no se sirven.
- Siempre HTTPS (el GPS del navegador lo exige).

## Actualización automática de datos

```bash
python -X utf8 actualizar.py                    # todo
python -X utf8 actualizar.py prensa estaciones  # solo algunas: estaciones gfm alertas prensa
python -X utf8 actualizar.py --test             # chequeo propio, imprime "ok"
```

Si una fuente falla se conserva su archivo anterior (el mapa muestra la hora de cada capa y marca **DATO VIEJO** pasadas 12 h). Frecuencia sugerida: prensa, ríos y alertas cada 30–60 min; satélite cada 6 h.

- Con cron/SSH: `*/30 * * * * cd /ruta/web && python3 actualizar.py`
- Solo hosting de archivos: correrlo en GitHub Actions (cron) y subir `data/` por FTP/rsync, o servir el repo con Pages.

## Videos

`data/videos.json` arrancó vacío a propósito: no se cargaron videos inventados ni sin comprobar. Se completa **después de revisar** (a mano o aprobando desde `/admin`):

```json
{"videos":[{
  "titulo": "Barrio X anegado",
  "fecha": "2026-10-20",            // fecha de PUBLICACIÓN del video
  "fuente": "YouTube",
  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "yt": "XXXXXXXXXXX",              // opcional: habilita "Reproducir aquí" (no carga nada hasta el clic)
  "lugar": "Barranqueras",          // opcional
  "lat": -27.48, "lon": -58.93,     // opcional: lo pone en el mapa
  "nota": "Publicado por X; lugar coincide con ..."  // opcional
}]}
```

Si se aprueba desde `/admin`, la fecha guardada es la del hecho que informó el usuario: confirmarla contra la fecha de publicación antes de dejarla. Buscar siempre el mismo video en fechas anteriores (circulan clips reciclados).

## Límites conocidos

- Zona de datos: caja −29,1 a −23,9 lat y −62,9 a −57,2 lon (`S,N,O,E` en `actualizar.py`). El mapa permite ver toda Argentina, pero no hay datos fuera de esa caja.
- Prensa: titulares de Google News y RSS locales, ubicados por palabras clave, publicados sin revisión por decisión de diseño, con aviso visible.
- Satélite: Copernicus GFM vía EODC (titiler), servicio de terceros sin garantía. “Sin color” = sin agua detectada **o** sin pasada. No ve bien agua bajo vegetación densa ni en zonas urbanas. Resistencia da 0,0 km² con 100 % de cobertura en la pasada 13/10; es plausible pero no está confirmado con otra fuente.
- Certificados: INA, SMN y chacodiapordia fallan la verificación TLS en Python (certificado vencido). `get()` reintenta sin verificar; son datos públicos de solo lectura, conviene avisarles.
- Fotos: Sentinel-2 pasa cada 2 a 5 días y en octubre de 2026 muchas escenas del NEA tienen más de 70 % de nubes. "Sin agua" se dice solo con una foto clara. La clasificación SCL puede confundir sombras o techos oscuros con agua. Planetary Computer es un servicio de terceros sin garantía.
- Pronóstico: grilla de ~5 km que se ajusta al río más cercano, que puede ser otro cauce (un punto de Resistencia cae a un arroyo y no al Paraná). No incluye relieve ni defensas. No prueba que el agua llegue o no a una casa.
- Foto HD: imagen de archivo comercial (Maxar y otros vía Esri), de fechas distintas según el punto. Esri no dice cuál de varias tomas se dibuja, así que la ficha da el rango de la zona, no la fecha de cada píxel. Los términos de Esri para un organismo público no se consultaron.
- Terceros: con muchas zonas abiertas seguidas, Planetary Computer, EODC y OSM rechazan peticiones (`ERR_HTTP2_SERVER_REFUSED_STREAM` en la consola). El mapa sigue andando sin esas capas.
- Mapa base: tiles públicos de OpenStreetMap, no aptos para mucho tráfico. Usar un proveedor con clave (MapTiler, Stadia) o tiles propios.
- Leaflet y Motion vienen de CDN; para funcionar sin ellas copiar los archivos junto a `index.html`.
- No hay aún: comparación de la Foto HD contra la foto reciente, rutas y puntos de reunión, DEM/relieve, vista operativa para Defensa Civil, pronóstico del INA, vista pública de reportes aprobados, revisión legal del aviso. Peso en 3G y pruebas en celulares reales sin medir.
- Licencias: SMN CC BY 4.0 (atribuido). El INA no declara licencia: consultar antes de un uso institucional amplio.
