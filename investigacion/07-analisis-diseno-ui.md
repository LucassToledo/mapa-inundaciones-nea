# Análisis de diseño: Motion, GSAP, Magic UI y Aceternity UI

Fecha: 21/10/2026. Objetivo: que el mapa se vea profesional sin volverse pesado. Restricción dura: el sitio es estático, sin React ni Tailwind ni paso de compilación, y lo abren celulares con datos móviles durante una emergencia.

## Resumen de decisión

| Biblioteca | Qué es | Se usa | Por qué |
|---|---|---|---|
| **Motion** (ex Motion One) | Motor de animación JS (`animate`, `stagger`, `inView`, `spring`) | **Sí**, el bundle UMD de jsDelivr | Funciona en HTML plano, tiene versión mini de ~3 kb y la híbrida de ~22 kb, y la completa con animaciones de scroll. Exporta el global `Motion` (verificado en el navegador: `animate`, `stagger`, `inView`). |
| **GSAP** | Motor de animación más amplio (timeline, ScrollTrigger, SplitText, Flip…) | **No** | Es gratis desde que Webflow lo adquirió, y la licencia estándar permite uso comercial ([anuncio](https://webflow.com/blog/gsap-becomes-free), [licencia](https://gsap.com/community/standard-license/)). Pero pesa más y no aporta nada que Motion no cubra para este mapa. Si más adelante se necesita una línea de tiempo compleja o SplitText, la licencia no es obstáculo. |
| **Magic UI** | Componentes React + Tailwind + Motion | **Solo las ideas**, reescritas en CSS/JS puro | No se puede incluir sin React. Se copió el *comportamiento* de Number Ticker, Blur Fade, Border Beam, Shimmer Button, Animated Gradient Text y Ripple. |
| **Aceternity UI** | Componentes React + Tailwind + Motion | **Solo las ideas**, reescritas | Se copió el comportamiento de Spotlight (haz de luz que sigue al cursor), Floating Dock, Card Hover Effect (resplandor bajo el cursor) y Moving Border. |

Regla aplicada: ninguna animación es decoración pura. Cada una comunica estado (algo cambió, algo es grave, algo se está cargando) o ayuda a orientarse (de dónde viene un panel).

## Qué se tomó de cada una

**Motion** (<https://motion.dev/docs/animate>)
- Entrada escalonada de paneles, tarjetas y números del resumen (`animate` + `stagger`).
- Animación del contador del resumen de zona.
- `inView` para revelar las secciones del panel cuando aparecen.
- Se descarta la versión React y los gestos/arrastre: no hacen falta.

**Magic UI** (<https://magicui.design/docs/components>)
- *Number Ticker* → números del resumen (km² inundados, estaciones en alerta) que cuentan hacia el valor final.
- *Blur Fade* → aparición de las tarjetas con desenfoque que se aclara.
- *Border Beam* / *Shine Border* → un destello recorre el borde del aviso de emergencia y de la tarjeta de zona. Se usa con moderación.
- *Shimmer Button* → botón principal "Ver esta zona".
- *Animated Gradient Text* → solo el título.
- *Ripple* → pulso en las estaciones con nivel de evacuación, para distinguir "grave y vigente" de "normal" sin depender solo del color.
- Descartados: Meteors, Particles, Orbiting Circles, Globe y similares (decoración sin función, costo de CPU).

**Aceternity UI** (<https://ui.aceternity.com/components>)
- *Spotlight* / *Card Hover Effect* → resplandor que sigue al cursor en las tarjetas (en pantallas táctiles queda estático).
- *Floating Dock* → barra flotante de capas; en celular pasa a barra inferior para alcanzarla con el pulgar.
- *Animated Tooltip* → tooltips de los botones del dock.
- *Text Generate Effect* → descartado: retrasa la lectura de texto crítico.
- *Aurora Background*, *Glare Card*, *Hero Parallax* → descartados: pantalla completa de efectos no sirve a una herramienta de decisión.

**GSAP** (<https://gsap.com/docs/v3/>): ScrollTrigger y SplitText son potentes, pero el sitio es una aplicación de mapa de una sola pantalla, no una página que se desplaza. Sin uso real.

## Reglas de diseño que se derivan

1. **Mapa a pantalla completa**, con paneles de vidrio (desenfoque de fondo) encima. Es lo que hacen los visores profesionales y deja la información geográfica como protagonista.
2. **Jerarquía de color por gravedad**, con la paleta Okabe-Ito (apta para daltonismo) y el estado también codificado por forma o texto, nunca solo por color.
3. **Movimiento respetuoso**: todo se apaga con `prefers-reduced-motion`, y nada se anima sobre el mapa mientras el usuario lo arrastra.
4. **Liviano**: una sola librería externa de animación (~65 KB sin comprimir, ~22 KB comprimida) además de Leaflet. Fuente Inter con `font-display: swap` y alternativa del sistema.
5. **Aviso siempre visible**: ningún efecto puede tapar el aviso de que la información es automática y no oficial.
6. **Tutoriales**: recorrido guiado al primer ingreso (recordado con `localStorage`, con ruta de escape y teclado) y una ayuda "?" en cada sección.

## Verificaciones técnicas hechas

- El bundle `https://cdn.jsdelivr.net/npm/motion@11.18.2/dist/motion.js` responde 200 con CORS abierto y define `window.Motion`.
- Los tiles de Copernicus GFM (titiler/EODC) se pueden leer en un `canvas` desde otra origen (CORS ok): permite contar píxeles inundados en el navegador.
- Se pide el tile **sin** colormap: el canal alfa distingue **sin dato = 0** y **dato válido = 255**, y el canal R distingue **agua = 1** de **tierra seca = 0**. Con eso se calcula en el navegador el porcentaje de la zona cubierta por la pasada y los km² con agua. (Un colormap con alfa intermedia, por ejemplo 60, **no** funciona: titiler la ignora y todo da 0 km².)
- La API Georef (datos.gob.ar) admite consultas desde el navegador (CORS ok).

## Aporte del usuario: mapas 3D, DEM y simulación (21/10/2026)

El usuario pasó una lista de motores 3D, APIs de elevación y reglas. Decisión por ítem:

| Propuesta | Decisión | Motivo |
|---|---|---|
| MapLibre GL / Deck.gl / CesiumJS / Three.js | **No en el MVP.** Se mantiene Leaflet (~42 KB comprimido) | MapLibre pesa ~200 KB y Cesium varios MB, con WebGL obligatorio: mal negocio en celulares de gama baja y datos móviles en una emergencia. El dato que se muestra (extensión del agua, ríos, noticias) es 2D; el 3D no agrega decisión. Camino de salida: MapLibre si se pasa a teselas vectoriales propias. |
| Sentinel-1 / Copernicus | **Ya está** (GFM, derivado de Sentinel-1 SAR) | Es la capa satelital actual. |
| Terrain-RGB / AWS Terrain Tiles (DEM) | **Posible fase 2, solo como capa de relieve** | Sirve para mostrar cotas y qué zonas son bajas. **No** para "simular" hacia dónde corre el agua. |
| Simulación hidrológica / shaders de agua | **No** | Un modelo hecho con un DEM de 30 m y sin datos de drenaje, alcantarillas ni caudales daría polígonos que parecen reales y pueden estar muy equivocados. En una herramienta para Defensa Civil eso es un riesgo, no una mejora. Se muestra solo lo observado (satélite) y lo informado (prensa, INA). Una simulación debería hacerla el INA o un modelo validado. |
| Google Earth Engine | **No por ahora** | Requiere cuenta/proyecto y claves; GFM ya entrega lo mismo vía STAC. |
| Reproductor temporal (play/pausa/línea de tiempo) | **Sí** | Ya existe el selector de fecha; se agrega Play y transición de opacidad entre pasadas. No se interpola la forma del polígono: entre dos pasadas de satélite no hay dato, y morfear inventaría agua que nadie vio. |
| Optimización (clustering, MVT/GeoArrow, no cargar 500 MB) | **Sí, en espíritu** | Las escenas se piden por tile y solo de la fecha elegida; los puntos de prensa se agrupan. Los JSON suman ~200 KB. |
| Paleta de emergencia (azules con opacidad + contornos rojo/amarillo) | **Sí, con una salvedad** | El satélite entrega *extensión*, no *profundidad*; por eso el azul es de un solo tono (agua detectada) y la gravedad se comunica con los contornos y marcadores de ríos (amarillo = alerta, naranja = evacuación) y las alertas del SMN. No se usa opacidad para insinuar profundidad que no se mide. |

## Pendiente

- Medir el peso real de la página en 3G con las herramientas del navegador.
- Probar en dispositivos reales de gama baja.
