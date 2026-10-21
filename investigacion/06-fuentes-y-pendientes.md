# Fuentes consultadas y pendientes de verificación

Fecha: 21/10/2026.

## 1. Endpoints probados en vivo (respondieron)

| Fuente | URL | Resultado |
|---|---|---|
| INA – servicios | `https://alerta.ina.gob.ar/pub/datos/capabilities` | Lista de servicios |
| INA – estaciones | `https://alerta.ina.gob.ar/pub/datos/estaciones?format=json&norte=-24&sur=-35&este=-53&oeste=-62` | Catálogo **nacional** (1.955 estaciones, 96 con cotas): los parámetros de recuadro se ignoran, hay que filtrar localmente. Los parámetros van con `&` justo después del endpoint, no con `?` |
| INA – series | `.../pub/datos/series`, `.../pub/datos/seriesProno` | Responden |
| INA – asistente | `https://alerta.ina.gob.ar/pub/gui/apibase` | Existe |
| GFM STAC | `POST https://stac.eodc.eu/api/v1/search` (colección `GFM`) | Escenas del 20/10/2026 |
| SMN CAP | `https://ssl.smn.gob.ar/CAP/AR.php` | RSS con ~145 ítems |
| GDACS | `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&fromDate=...&toDate=...` | GeoJSON global |
| Georef | `https://apis.datos.gob.ar/georef/api/localidades?nombre=Concordia&provincia=Entre%20Rios&max=3` | Centroide de 2 resultados |

## 2. Pendientes de verificación (en orden de prioridad)

1. ~~**INA `datos`**~~ **Resuelto (21/10/2026)**: el formato correcto es `.../pub/datos/datos&siteCode=19&varId=2&timeStart=AAAA-MM-DD&timeEnd=AAAA-MM-DD&format=json` (con `&`, no `?`). Algunas estaciones no tienen datos de altura (varId 2); se omiten.
2. **GDELT**: probar con una consulta por vez (límite de 1 cada 5 s) y medir qué tan bien cubre medios del Litoral en español y qué tan correcta es la geolocalización. Fue bloqueado con HTTP 429 durante esta sesión.
3. **RSS de medios locales**: armar la lista (Corrientes, Chaco, Entre Ríos, Santa Fe, Misiones), probar que cada feed funcione y revisar términos de uso.
4. **GDACS con filtro de país**: `country=ARG` no devolvió JSON válido. Probar otra sintaxis o filtrar localmente por recuadro.
5. **SMN CAP completo**: abrir uno o dos XML individuales y confirmar que traen zona (geocódigos o polígono), severidad y vigencia. También ver el boletín oficial de El Niño del SMN.
6. **Boletín de octubre de NOAA CPC** (debería ser del 8/10): no lo encontré; las cifras de septiembre vienen de un resumen de búsqueda.
7. **Google Flood Hub API**: pedir acceso a la lista de espera si se avanza.
8. **ReliefWeb**: requiere un nombre de aplicación aprobado (403 con uno sin registrar). Solo si hace falta.
9. **Licencia y condiciones del INA**: no figuran en la API; consultar al organismo. También confirmar si CARU publica algo programable.
10. **Prefectura Naval**: datos en PDF/web; verificar si hace falta más allá de lo que ya está en INA.
11. **CONAE/SAOCOM**: consultar productos abiertos de inundación.
12. **NASA LANCE, Copernicus Data Space, IMERG, CHIRPS, SMAP**: confirmar acceso y cuotas vigentes en la fuente oficial (hoy solo por búsqueda o conocimiento previo).
13. **Cifras de Concordia**: el número de evacuados difiere entre medios y fechas; confirmar con Defensa Civil o el municipio.
14. **Precisión de Groundsource (~75 %)**: es el dato de lo que leí; verificar en el artículo original antes de citarlo.

## 3. Fuentes por tema (consultadas mediante búsqueda y lectura de páginas)

Las URLs exactas de los artículos de prensa y de las páginas leídas no quedaron guardadas en esta carpeta durante la investigación; lo que sigue es la lista de fuentes por nombre. Si hace falta un enlace puntual, buscar de nuevo por título.

**Contexto El Niño**
- NOAA Climate Prediction Center, discusión de El Niño/La Niña (septiembre 2026).
- Organización Meteorológica Mundial (vía El Cronista).
- Servicio Meteorológico Nacional (vía Infobae, 4/9 y 18/10; La Nación).
- Diario Jornada (11/10) para Concordia y Colón.

**Plataformas y datos**
- Google Flood Hub y Flood Forecasting API; paper y datos de Groundsource (Zenodo).
- Copernicus GloFAS/GFM y catálogo STAC de EODC.
- NASA LANCE, Worldview, GPM IMERG.
- GDACS, Dartmouth Flood Observatory.
- INA – Sistema de Alerta Hidrológico; Prefectura Naval – alturas; SMN – alertas CAP.
- datos.gob.ar – API Georef.
- GDELT Project (DOC 2.0 / GEO 2.0).
- HazMiner (Zenodo).
- Documentación de MapLibre, Leaflet, deck.gl, Kepler.gl, ArcGIS Dashboards, Felt, Ushahidi.

## 4. Cómo leer el nivel de confianza de cada documento

- Todo lo marcado ✅ se probó en vivo el 21/10/2026.
- Lo marcado 🔎 viene de resultados de búsqueda o de páginas leídas, no de una llamada propia.
- Lo marcado ⚠️ es conocimiento previo o no se logró comprobar.
- Las cifras de la situación (doc 01) vienen de medios y pueden haber cambiado.
