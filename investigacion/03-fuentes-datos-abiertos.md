# Fuentes de datos abiertos

Leyenda: ✅ probado en vivo el 21/10/2026 · 🔎 confirmado por búsqueda pero no probado · ⚠️ pendiente o con problemas.

## 1. Niveles de río y pronóstico hidrológico (Argentina)

### INA – Sistema de Alerta Hidrológico ✅
- **Base**: `https://alerta.ina.gob.ar/pub/datos/` (sin parámetros devuelve la lista de servicios). Asistente: `https://alerta.ina.gob.ar/pub/gui/apibase`.
- **Método**: HTTP GET con parámetros en la URL. Formatos: JSON, CSV, XML, GeoJSON (vectoriales); GTiff y PNG (raster).
- **Endpoints** (todos bajo `/pub/datos/`): `estaciones`, `redes`, `cuencas`, `variables`, `series`, `seriesProno`, `datos`, `datosDia`, `datosProno`, `seriesAreal`, `datosAreal`, `modelos`. También `/pub/plot/obs`, `/pub/plot/prono`, `/pub/productosweb/productos`, `/pub/rastextract/rast` y `/pub/rastextract/timeseries`.
- **Probado** (corregido el 21/10/2026): `estaciones` **ignora** el recuadro y devuelve el catálogo **nacional**: **1.955 estaciones**, **96 con `nivel_de_alerta` y `nivel_de_evacuacion`** cargados. Cada estación trae nombre, río, coordenadas, red y tipo. Redes principales: RHN-SAT (960), INTA (398), Red Hidrológica Nacional (265), escalas de Prefectura (89), Salto Grande (64), mareógrafos (36), ACUMAR (26), EMAs de Entre Ríos (26).
- `series` y `seriesProno` responden (hay series de altura y pronósticos semanales, p. ej. Puerto Iguazú).
- ✅ **Resuelto**: `datos` se consulta con `&` y no con `?`: `datos&siteCode=19&varId=2&timeStart=AAAA-MM-DD&timeEnd=AAAA-MM-DD&format=json`. La respuesta es `{requestHeader, responseHeader, data:[…]}`. El recuadro de `estaciones` se ignora: filtrar localmente.
- **Licencia y límites de uso**: no figuran en la página. Hay que consultarlo con el INA.

### Prefectura Naval – alturas hidrométricas 🔎
- Página: `contenidosweb.prefecturanaval.gob.ar/alturas/`. Hay partes diarios en PDF (Paraná, Diamante, San Martín, Rosario, Villa Constitución, San Nicolás, Ramallo, San Pedro) y un histórico 2009-2024 descargable.
- Muchas de sus escalas ya están dentro de la API del INA (red "escalas Prefectura Nacional", 89 estaciones), así que **probablemente no haga falta tocar los PDF**.

### Otras 🔎
- **CARU / Salto Grande**: cotas del río Uruguay (Colón, Concepción del Uruguay, Concordia). Las de Salto Grande ya están en la API del INA (64 estaciones). Falta confirmar si CARU publica algo programable.
- **Base de Datos Hidrológica Integrada (BDHI)**: reúne estaciones de la Secretaría de Infraestructura y Política Hídrica; hay un paquete de R (`hydroToolkit`) que la lee.

## 2. Satélite: extensión del agua

### GFM – Global Flood Monitoring (Copernicus) ✅
- **Catálogo STAC**: `https://stac.eodc.eu/api/v1`, colección `GFM`. **Sin autenticación** en las pruebas.
- **Probado**: consulta POST a `/search` con recuadro de Corrientes/Chaco/Santa Fe y fecha 1-21/10/2026 devolvió escenas del **20/10/2026** con la capa `observed_flood_extent` (tipo `ENSEMBLE_FLOOD`), más un servicio de teselas (`titiler`) listo para mostrar en un mapa.
- **Detalles**: Sentinel-1 radar, tres algoritmos combinados, listo unas ~8 h después de la pasada, archivo desde 2015, unas diez capas (extensión, aguas permanentes, población y uso del suelo afectado, banderas de calidad). También hay WMS-T.
- **Límites**: el radar subestima el agua bajo vegetación densa y en zonas urbanas; el Paraná tiene mucho humedal e islas. La revisita de Sentinel-1 es de varios días.
- Ejemplo de consulta:
```
POST https://stac.eodc.eu/api/v1/search
{"collections":["GFM"],"bbox":[-62,-35,-56,-27],"datetime":"2026-10-01T00:00:00Z/2026-10-21T00:00:00Z","limit":3}
```

### NASA LANCE – producto de inundación MODIS y VIIRS 🔎
- Diario, ~250 m, compuestos de 1, 2 y 3 días. VIIRS salió en abril de 2025 en versión Beta. Descarga HDF/GeoTIFF con registro gratuito en Earthdata. **Óptico: las nubes lo tapan**, y en tormentas es justo cuando más nubes hay.

### Copernicus Data Space (Sentinel-1/2) 🔎
- Acceso gratuito con registro. Las cuotas gratuitas figuran como "uso individual"; el uso a gran escala cae bajo términos comerciales. No pude confirmar las cuotas actuales en la fuente oficial.

### CONAE / SAOCOM ⚠️
- Satélites argentinos con radar en banda L, útiles para inundaciones y humedad de suelo. Las búsquedas no dieron nada sobre productos abiertos de 2026. Vale consultar directamente a CONAE.

## 3. Alertas y eventos

### SMN – alertas CAP ✅
- **Feed**: `https://ssl.smn.gob.ar/CAP/AR.php` (RSS 2.0 que enlaza a XML en formato CAP). Licencia declarada **CC BY 4.0**. Tenía ~145 ítems el 21/10/2026 al mediodía.
- El RSS no trae geometría ni severidad; hay que abrir cada XML CAP para obtener zona, severidad y vigencia. Los títulos son genéricos ("Tormentas", "Lluvias").
- Hay además un dataset histórico de alertas de 365 días en datos.gob.ar, pero figura sin actualizar desde 2019.

### GDACS ✅
- `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&fromDate=...&toDate=...` devuelve GeoJSON. Probado a nivel global. El filtro por país `ARG` no devolvió JSON válido; filtrar por zona del lado propio.
- Contenido con derechos de la UE, se puede difundir citando la fuente. En enero 2026 había una alerta verde en Argentina (46 desplazados).

### ReliefWeb ⚠️
- El API respondió **403 Forbidden** con un nombre de aplicación sin registrar. Requiere registrar la aplicación; no lo usaría salvo que haga falta.

### Google Flood Hub API 🔎
- `floodforecasting.googleapis.com`: calibres virtuales, estado de inundación y polígonos de inundación, datos CC BY 4.0. **Acceso por lista de espera** con formulario. Valioso si se aprueba.

## 4. Lluvia y humedad (indicadores adelantados)

- **IMERG (NASA GPM)** 🔎: lluvia satelital casi en tiempo real, versión "Early" con ~4 h de atraso y "Late" con ~14 h; NASA publica además un servicio de imágenes de acumulado diario (latencia ~3 h) en `maps.disasters.nasa.gov`. En Earth Engine: `NASA/GPM_L3/IMERG_V07`.
- **CHIRPS, SMAP (humedad de suelo)** ⚠️: no verificados en esta sesión.
- **Estaciones**: la API del INA incluye las redes INTA y EMAs de Entre Ríos (lluvia), útiles como control.

## 5. Geocodificación

### API Georef (datos.gob.ar) ✅
- `https://apis.datos.gob.ar/georef/api/` — gratuita y libre. Normaliza provincias, departamentos, municipios y localidades; también direcciones. Fuente: IGN, BAHRA, INDEC.
- **Probado**: `localidades?nombre=Concordia&provincia=Entre Rios` devolvió 2 resultados con `centroide.lat` y `centroide.lon`.
- Descargas en JSON, GeoJSON y shapefile de provincias, departamentos y municipios (útil para dibujar polígonos administrativos).
- Para parajes, barrios o calles sueltas mencionadas en notas hará falta además otro geocodificador (ver doc 04).

## 6. Noticias

| Fuente | Qué ofrece | Notas | Verif. |
|---|---|---|---|
| **GDELT DOC 2.0 / GEO 2.0** | Búsqueda de texto completo en ~65 idiomas, ventana móvil de 3 meses; mapa de ubicaciones mencionadas cada 15 min. Gratis, sin clave | **Límite: una consulta cada 5 segundos.** Me bloqueó dos veces (HTTP 429 y aviso de límite) mientras probaba, así que no pude comprobar la calidad de los resultados en español. Filtra por país del medio (`sourcecountry:AR`) | ⚠️ |
| **RSS de medios argentinos** | Titulares y resúmenes de diarios locales (El Litoral, El Día, Corrientes Hoy, etc.) | La opción más controlable y gratuita; cubre medios locales que GDELT puede perder. Hay que armar la lista de feeds | ⚠️ |
| **NewsAPI** | 100 consultas/día en plan gratis, con ~24 h de demora | **El plan gratis no sirve para producción** | 🔎 |
| **World News API** | 18 fuentes argentinas desde 2022 | De pago, límites por confirmar | 🔎 |
| **GNews** | Gratis solo no comercial; de pago desde ~EUR 49,99/mes | Según una comparativa de terceros | 🔎 |
| **Media Cloud** | No apareció en las búsquedas | Sin evaluar | ⚠️ |

**Derechos de autor**: conviene guardar de cada nota solo los datos extraídos (lugar, fecha, hecho), el título y el enlace, no el texto completo ni mostrarlo en la herramienta.

## 7. Datasets históricos útiles para validar

- **Groundsource** (Google, CC BY 4.0): 2.646.302 registros, 2000 a presente, 150+ países, extraídos de noticias. Descarga en Zenodo (DOI 10.5281/zenodo.18647054) y en Earth Engine (`projects/sat-io/open-datasets/groundsource_2026`). Campos: `uuid`, `area_km2`, `start_date`, `end_date`, `geometry`. Detalle en doc 04.
- **HazMiner** (Zenodo): inundaciones, aludes y crecidas repentinas extraídas con LLM, pensado para el Sur Global.
- **Archivo de Dartmouth Flood Observatory** (CC BY 3.0).
