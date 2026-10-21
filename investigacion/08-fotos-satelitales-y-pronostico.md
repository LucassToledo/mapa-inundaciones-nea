# 08. Fotos satelitales por fecha y pronóstico por dirección

Fecha de la revisión: 21/10/2026. Motivo: la versión anterior mostraba solo agua detectada por radar sobre un mapa de calles, sin fotos reales y sin una respuesta para una dirección concreta.

## 1. CONAE (Argentina.gob.ar, "Aplicaciones de la información satelital / Inundaciones")

Resultado: no se puede integrar en vivo.

- La página es contenido estático de 2016. Muestra dos imágenes: un compuesto MODIS de 2015 y un mapa CosmoSkyMed de Itatí del 7/12/2015.
- No ofrece WMS, WMTS, API, descarga de capas ni geoportal con inundaciones recientes.
- Vías posibles, todas por gestión: pedir mapas a CAEARTE (caearte@conae.gov.ar) y a la Carta Internacional sobre Espacio y Grandes Catástrofes, que CONAE activa para emergencias. Cuando existan mapas de una emergencia, se pueden citar y enlazar desde la herramienta. No se pueden consumir de forma automática.

## 2. Fotos satelitales reales y recientes

Fuente elegida: Sentinel-2 L2A (ESA, Copernicus) servido por Microsoft Planetary Computer.

| Dato | Valor |
|---|---|
| Resolución | 10 m en color real |
| Repetición | cada 2 a 5 días sobre el NEA |
| Latencia | 1 a 2 días |
| Acceso | STAC `POST https://planetarycomputer.microsoft.com/api/stac/v1/search`, sin clave, CORS abierto |
| Tiles de la foto | `/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?collection=sentinel-2-l2a&item={ID}&assets=visual&asset_bidx=visual|1,2,3` |
| Clasificación por píxel | banda SCL (20 m), recorte con `/item/bbox/…/{W}x{H}.png`; clase 6 = agua, 8/9/10 = nubes, 3 = sombra |

Alternativas revisadas:

- **Google Earth / Google Maps**: sin tiles gratuitos con fecha elegible. Google Earth Engine requiere cuenta y sus términos limitan el uso a no comercial con registro. Descartado.
- **NASA GIBS**: sirve VIIRS diario (375 m a 1 km) sin clave. Sirve como respaldo, pero no distingue una casa ni un barrio. HLS llega con unos 8 días de demora. No se usó como capa principal.
- **Sentinel Hub / Copernicus Browser**: requiere cuenta y cuota.
- **Planet, Maxar**: comerciales.

Limitaciones comprobadas:

- Nubes: en octubre de 2026 varias fotos del NEA tienen 70 a 100 % de nubes. La herramienta lo muestra por foto y no usa esas fotos para decir "no hay agua".
- La banda SCL puede marcar como agua una sombra de nube o un techo oscuro. Se avisa en pantalla.
- Cerca del borde entre dos recuadros MGRS hay dos escenas para una misma fecha; la herramienta pide las dos y arma el mosaico.

## 3. Pronóstico para los próximos meses

Fuente: Open-Meteo (gratis para uso no comercial, sin clave, CORS abierto).

- **Flood API** (modelo GloFAS v4): caudal diario del río de la celda más cercana, con pronóstico a 210 días (mediana y percentil 75 del conjunto de pronósticos) e historia desde 1984.
- **Seasonal API**: anomalía mensual de lluvia prevista.

Método: se promedia el caudal pronosticado por mes y se lo compara con la distribución de ese mismo mes del calendario entre 1984 y hoy. Así se evita decir "alto" solo porque es época de crecida. Niveles: percentil 90 o más "muy alto", 75 o más "alto", 25 o más "normal", menos de 25 "bajo". El escenario "si llueve más" usa el percentil 75 del pronóstico.

Límites:

- Es una grilla de unos 5 km. Si la dirección queda lejos de un río grande, el modelo toma otro cauce. Ejemplo: un punto de Resistencia cae a un riachuelo de unos 374 m³/s mientras el Paraná, a 10 km, lleva unos 25.000 m³/s. La herramienta muestra la distancia al río modelado y advierte cuando pasa de 10 km.
- No incorpora la altura del terreno de la casa ni las defensas. La respuesta es una alerta temprana regional y no sustituye al INA ni a Defensa Civil.
- Los términos de Open-Meteo piden licencia comercial para uso comercial. Para un organismo público conviene consultar con ellos antes de publicar con tráfico alto.

## 4. Herramienta de IA para simular inundaciones (MIT, nota de WizCase)

No se implementa.

- Es una GAN condicional combinada con un modelo físico de inundación. Genera imágenes satelitales sintéticas de inundaciones hipotéticas. Se probó en Houston con el huracán Harvey.
- Sin el modelo físico, la red dibujó agua en terrenos altos.
- No se indica código abierto ni licencia, ni se probó en el Chaco.
- Choca con la regla de este proyecto: no mostrar agua que ningún satélite observó. Una imagen sintética de una crecida futura se confunde con una foto real.

Referencias: https://ieeexplore.ieee.org/document/10758300 y https://climate-viz.github.io/.

## 5. Privacidad al usar una dirección

- La dirección se busca en Nominatim (OpenStreetMap) y las coordenadas se envían a Microsoft Planetary Computer y a Open-Meteo para pedir fotos y pronóstico. Esas terceras partes ven la IP y las coordenadas. Está dicho en el aviso legal de la herramienta.
- El enlace para compartir redondea a 2 decimales (unos 1,1 km), usa el nombre genérico "Mi dirección" y el parámetro `ap=1`. La dirección escrita no sale en la URL.

## 6. Pendientes

- Confirmar con el INA y con Open-Meteo el uso institucional.
- Medir el peso de las fotos en 3G y en celulares de gama baja.
- Validar la clasificación de agua con una inundación real observada (compararla con un mapa de la Carta Internacional).
- Pedir a CAEARTE los mapas de la emergencia en curso.
