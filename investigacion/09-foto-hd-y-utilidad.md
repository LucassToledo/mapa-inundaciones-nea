# 09. Foto de alta definición, paneles y utilidad real

> **Actualización del 21 de octubre de 2026:** la capa Foto HD (Esri) se quitó del sitio. Era imagen de archivo, no se podía comparar con el agua de hoy y se veía mal. El rumbo corregido está en [10-plan-de-mejora.md](10-plan-de-mejora.md). Este documento queda como registro de lo que se probó.

Pedido: las fotos satelitales eran demasiado borrosas para decidir una evacuación, los paneles laterales tapaban el mapa y había que pensar en utilidad para el público y el gobierno.

## Por qué se veía borroso

Sentinel-2 tiene 10 metros por píxel. Una casa ocupa uno o dos píxeles. Pasado el zoom 14 el navegador solo estira la imagen. No es un error de la web: es el límite del sensor. Ninguna fuente abierta y gratuita publica fotos recientes de menos de 10 metros para el NEA.

## Qué se agregó

| Necesidad | Solución | Límite |
|---|---|---|
| Ver calles y casas | Capa **Foto HD** con Esri World Imagery (30 a 50 cm por píxel, sin clave, CORS abierto) | Es de archivo. En esta prueba las fechas iban de enero de 2017 a febrero de 2026 según el lugar. No muestra el agua de hoy |
| Saber qué tan vieja es | Ficha con rango de fechas y mejor resolución, consultada a la capa 4 del servicio | Esri no informa cuál toma se dibuja en cada punto |
| Agua actual sobre el terreno | El radar de agua (Copernicus GFM) se dibuja encima de la HD | Resolución de decenas de metros y sin datos bajo vegetación o en zonas urbanas |
| Mapa limpio | Flechas para achicar cada panel y botón **Mapa** que esconde todo menos el aviso legal | Ninguno |

## Qué registros ayudan

Para el sitio web, gratuitos:

1. **ArcGIS Location Platform** (developers.arcgis.com): clave de API gratuita con cupo mensual. Va en `CFG.esriKey`. Deja la Foto HD dentro de los términos de Esri y evita depender de un acceso anónimo.
2. **MapTiler o Stadia Maps** (opcional): mapa base con clave, para no cargar los servidores públicos de OpenStreetMap con mucho tráfico.
3. **Mapbox** (opcional): su capa satelital tiene una calidad parecida a la de Esri y un cupo gratuito. No mejora la fecha.

Para el gobierno, el camino que sí da fotos recientes de alta resolución:

1. **Carta Internacional "Espacio y Grandes Catástrofes"**: la CONAE y la autoridad nacional pueden activarla en una emergencia. Entrega imágenes de resolución submétrica de varias agencias, con prioridad.
2. **Catálogo SAOCOM de la CONAE**: registro gratuito, radar de banda L que ve el agua incluso bajo nubes. Son archivos que se procesan aparte, no se muestran en el navegador.
3. **Copernicus EMS (Rapid Mapping)**: solo se activa por pedido de una autoridad nacional. No había una activación para Chaco ni Corrientes en 2026.
4. **Proveedores comerciales** (Planet, Maxar, Airbus): imagen diaria o submétrica con contrato. Requiere presupuesto.

## Utilidad para el público y para el gobierno

Público general:
- Comparar la Foto HD con la foto reciente para ver qué cambió. Falta construir.
- Marcar la ruta más corta a un punto alto o a un centro de evacuación. Requiere que la Defensa Civil provea los puntos.
- Mostrar en el mapa los reportes aprobados. Hoy se guardan y se revisan, pero no se publican.
- Aviso por zona cuando el pronóstico supera un umbral. Requiere un canal de envío.

Gobierno y Defensa Civil:
- Vista operativa: reportes sin revisar, estaciones sobre alerta y zonas con agua en una sola pantalla.
- Capa de escuelas, hospitales y rutas sobre la Foto HD, cargada por el municipio.
- Relieve (DEM) para saber hacia dónde escurre el agua. No hay uno de buena resolución gratuito para la región: el MDE-Ar del IGN es de 30 m y sirve para una primera idea.
- Exportar un informe de una zona (foto, agua, ríos, pronóstico, fecha de cada dato) para adjuntarlo a un pedido de ayuda.

## Pendientes sin verificar

Términos de Esri para un organismo público; comportamiento de Esri a escala (cupo y bloqueos); falsos positivos de la clasificación SCL; validación contra una inundación real; destino del formulario; revisión legal del aviso.
