# CLAUDE.md

Guía para agentes que trabajen en este repositorio. Léela entera antes de tocar código. El estado y las decisiones del proyecto están en `docs/minuta.md`.

## Qué es

Mapa web público de inundaciones, con foco en el **departamento San Fernando (Chaco)**: Resistencia, Barranqueras, Vilelas y la ribera del río. Su función principal es una sola: **ver marcado en azul dónde hay agua hoy que no había en una fecha anterior**, con la fuente, la fecha y la resolución visibles. Todo lo demás (pronóstico, ríos, alertas, prensa, videos) es contexto.

Autor: Lucas Toledo, [@eltiolucas.ia](https://www.instagram.com/eltiolucas.ia/). Repositorio: https://github.com/LucassToledo/mapa-inundaciones-nea. Idioma de todo el producto y los documentos: español rioplatense.

## Estructura

| Ruta | Qué hay |
|---|---|
| `web/index.html`, `web/estilo.css`, `web/app.js` | La aplicación. Sitio estático con Leaflet 1.9.4 (CDN), sin build ni framework. Toda la lógica está en `app.js` |
| `web/data/*.json` | Datos que regenera `actualizar.py`: `estaciones` (INA), `gfm` (radar), `alertas` (SMN), `prensa`, `lugares` (123 localidades para buscar), `videos` (revisados a mano, vacío por diseño) |
| `web/actualizar.py` | Baja y normaliza las fuentes a `data/*.json`. Solo biblioteca estándar |
| `web/servidor.py` | Servidor opcional: sirve `web/`, recibe envíos de usuarios en SQLite (`envios.db`) y ofrece `/admin?token=` para moderar. Solo biblioteca estándar |
| `investigacion/00` a `10` | Investigación y decisiones, en orden. `10-plan-de-mejora.md` es el plan vigente y la tabla de fuentes por resolución |
| `docs/` | Documento PDF de 9 páginas y los scripts que lo generan (`capturas.py`, `pdf.py`) |
| `video/hacer_video.py` | Video explicativo corto |

## Cómo correrlo

```bash
cd web && python -X utf8 servidor.py          # http://localhost:8765 con /api/envios
cd web && python -m http.server 8765          # solo el mapa; el formulario falla
python -X utf8 web/actualizar.py --test       # chequeo propio, imprime "ok"
python -X utf8 web/servidor.py --test         # idem
```

Agregar `?test` a la URL corre un chequeo de la geometría del cálculo de agua. El puerto de desarrollo es 8765.

## Cómo funciona lo importante

- **Agua nueva** (`app.js`): el navegador pide a Microsoft Planetary Computer los mosaicos Sentinel-2 L2A de dos fechas, calcula NDWI por píxel en un canvas y clasifica: 0 sin dato, 1 tierra, 2 agua, 3 nube. «Agua nueva» = agua en «Después», tierra en «Antes» y salto de NDWI mayor a unos 0,1. Los umbrales **no están validados** contra un mapa real.
- **Foto HD**: botón apagado al inicio. Es un WMS 1.3.0 del IGN (`imagenes.ign.gob.ar/geoserver`) con ortomosaicos de **archivo** de 2011 a 2021, de unos 0,4 m por píxel. No tiene CORS: se muestra en `<img>`, no se puede leer en canvas. Se pide con `image/vnd.jpeg-png` (54 KB por tesela contra 622 KB en PNG).
- **Límites del mapa**: `CFG.bounds` (San Fernando) y `CFG.limites` (`maxBounds`) en `app.js`. No ampliarlos sin motivo: cada vista extra son más mosaicos pedidos a terceros.
- **Panes de Leaflet** por z-index: fotoA 240, fotoB 241, hd 243, agua 246. Respetar ese orden.
- **Limitador de peticiones**: máximo 3 simultáneas con 150 ms entre cada una. Planetary Computer rechaza con `ERR_HTTP2_SERVER_REFUSED_STREAM` si se lo satura.
- **Arranque**: siempre en modo comparación Antes/Después, recorrido guiado en cada ingreso, capa de alertas SMN apagada.

## Reglas que no se negocian

1. **No inventar agua.** Nunca interpolar entre pasadas ni usar imágenes sintéticas o de IA.
2. **Sin dato no es sin agua.** Las nubes se rayan en gris y el texto lo dice.
3. **Cada capa muestra fecha, sensor y resolución.** Una imagen de archivo jamás se presenta como actual: la Foto HD lleva aviso permanente.
4. **Aviso «Información automática y NO oficial. Ante una emergencia llamá al 911»** siempre visible.
5. **Prensa se publica sin revisión** (con aviso). **Videos y reportes de usuarios solo tras revisión humana.** Nada se aprueba solo.
6. **Cita del IGN obligatoria** en la Foto HD: «FUENTE: Instituto Geográfico Nacional de la República Argentina». No alterar la imagen.
7. **Resolución mínima pedida por el dueño: 1 m por píxel o mejor.** Mostrar algo de 10 m como imagen principal fue rechazado dos veces. Hoy no existe fuente gratuita y reciente de esa resolución; está documentado en `investigacion/10-plan-de-mejora.md`. No lo vuelvas a «resolver» con una capa que no cumpla.
8. **Atribuciones en el borde inferior**, nunca sobre el centro del mapa. Los paneles no deben tapar el mapa ni entre sí.
9. Crédito «Creado por @eltiolucas.ia» en el encabezado y en el aviso legal.

## Scraping y servicios de terceros

Mandar ráfagas hace que te bloqueen por bot. Siempre: peticiones **secuenciales**, pausas de 5 a 6 segundos entre sitios distintos, User-Agent identificable, nada en paralelo contra el mismo host. Servicios usados: Planetary Computer, EODC (GFM), Open-Meteo, INA, SMN, Google Noticias, datos.gob.ar, Nominatim, IGN. Ninguno garantiza disponibilidad.

## Estilo del código y de los textos

- Sin dependencias nuevas si alcanza con la biblioteca estándar o con lo nativo del navegador. No hay build.
- Seguir el estilo de `app.js`: comentarios breves en español, nombres cortos en español, funciones planas.
- Textos para personas: español, sin guiones largos, sin «No es X, es Y», sin adverbios de énfasis ni frases de relleno (skill `anti-texto-basura`).
- Cada cambio visible se prueba en el navegador antes de darlo por hecho. Revisar la consola.
- Commits con el trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Rama `main`.

## Problemas abiertos

- El azul de «Agua nueva» no está contrastado con un mapa real de la inundación (hay falsos positivos posibles por sombras, techos oscuros y campos arados).
- Un error 403 en la consola sin identificar (posiblemente teselas de OpenStreetMap o EODC).
- `ERR_HTTP2_SERVER_REFUSED_STREAM` de Planetary Computer con muchas teselas; el limitador lo reduce y falta medirlo con tráfico real.
- Falta confirmar con el IGN si publicar su WMS en un sitio requiere autorización.
- Leyenda, recorrido y PDF todavía mencionan solo «10 m» y no la Foto HD.
- Sin probar en celulares reales de gama baja ni en 3G.
- Aviso legal sin revisión jurídica.

## Qué falta para llegar a alta resolución actual

Ver `investigacion/10-plan-de-mejora.md`. Resumen: pedir a CONAE (u_inter@conae.gov.ar, atencion.usuario@conae.gov.ar) los productos de las activaciones de inundación vigentes (353, 359, 360, 361); licenciar SPOT 6/7 (1,5 m); sumar Sentinel-1 como complemento ante nubes (10 a 20 m); y enlazar fotos y videos públicos con fecha como evidencia.
