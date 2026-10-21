# Plataformas para visualizar inundaciones con mapas interactivos

Leyenda de verificación: ✅ probado en esta sesión · 🔎 confirmado por búsqueda · ⚠️ conocimiento previo, sin verificar hoy.

## A. Visores que ya existen (para mirar o integrar, no para construir)

| Plataforma | Qué muestra | Cobertura Argentina | Acceso | Verif. |
|---|---|---|---|---|
| **Google Flood Hub** | Pronóstico de crecida en ríos hasta 7 días, con mapas de inundación en algunas zonas | Sí, desde junio de 2023 (60 países nuevos, entre ellos Argentina) | Web pública. API (`floodforecasting.googleapis.com`) con lista de espera, datos CC BY 4.0 | 🔎 |
| **GloFAS** (Copernicus) | Pronóstico de caudal global, diario, hasta 30 días | Sí, resolución global (grande para cuencas chicas) | globalfloods.eu con registro; datos crudos por el Climate Data Store | 🔎 |
| **GFM** (Global Flood Monitoring, dentro de GloFAS) | Extensión de agua detectada con Sentinel-1 (radar, atraviesa nubes), unas 8 h después de la pasada | Sí, global desde 2015 | **API STAC pública sin clave** | ✅ |
| **Copernicus EMS Rapid Mapping** | Mapas a pedido de un país tras un desastre (extensión y daños) | Solo si Argentina activa el servicio. No encontré activación 2026 para Argentina | mapping.emergency.copernicus.eu | 🔎 |
| **GDACS** (ONU/UE) | Alertas globales de inundación (verde/naranja/rojo) con desplazados y muertos | Sí, pero eventos grandes; en Argentina 2026 solo vi alertas verdes | API JSON/GeoJSON, RSS | ✅ |
| **NASA LANCE / Worldview** | Producto diario de inundación MODIS y VIIRS a 250 m, compuestos de 1 a 3 días | Sí. Es óptico: **no ve a través de nubes** | Descarga con registro gratuito (Earthdata Login) | 🔎 |
| **Dartmouth Flood Observatory** | Archivo histórico de inundaciones, mapas libres (CC BY 3.0) | Sí, eventos pasados | Descarga en hoja de cálculo y SIG | 🔎 |
| **INA – catálogo y visualizador** | Mapa con precipitación, humedad de suelo, nivel hidrométrico y caudal en tiempo real; pronósticos del Sistema de Alerta (Paraná, Paraguay, Uruguay, Iguazú) | Sí, la referencia local | Web y API REST abierta | ✅ |
| **SMN – mapa de alertas** | Alertas por semáforo sobre mapa | Sí | Web y feed CAP | ✅ |
| **IDESF Santa Fe – situación hídrica** | Geoportal provincial con alturas y partes | Solo Santa Fe | Web | 🔎 |
| **Mapa de riesgo hídrico de Buenos Aires** | Mapa 3D con capa "Riesgo Hídrico" y búsqueda por dirección | Solo provincia de Buenos Aires | Web | 🔎 |

**Lo que ninguno hace**: mostrar en un mismo mapa los *impactos reportados por la prensa* junto con los niveles de río y la extensión satelital, con línea de tiempo, para Argentina. Ese es el espacio libre.

**Antecedente de mapa colaborativo**: se hizo un mapa con Ushahidi (software libre) para las inundaciones de Buenos Aires y La Plata (probablemente abril de 2013; el artículo no da el año). Mostró centros de evacuados y calles anegadas con moderación. Sirve de referencia para la idea de moderar reportes.

## B. Para armar uno propio: bloques de construcción

| Opción | Tipo | Para qué sirve | Notas | Verif. |
|---|---|---|---|---|
| **MapLibre GL JS** | Librería de mapas, código abierto | Mapa interactivo a medida con capas vectoriales y raster | Fork comunitario de Mapbox GL. Hay que programar el panel | 🔎 |
| **Leaflet** | Librería de mapas, código abierto | Mapas simples, liviano (~30 KB) | Más simple, menos potente con muchos datos | 🔎 |
| **deck.gl / Kepler.gl** | Visualización de muchos datos | Exploración de miles de eventos; Kepler no arma dashboards ni colabora | Kepler sirve para explorar, no para producto final | 🔎 |
| **ArcGIS Dashboards / Online** | Plataforma comercial | Paneles para instituciones que ya usan Esri | Propietario, por suscripción | 🔎 |
| **Felt** | Plataforma alojada | Mapas compartibles rápido, sin armar infraestructura de teselas | Propietario. Útil para un prototipo | 🔎 |
| **Google Earth Engine** | Análisis satelital en la nube | Procesar IMERG, Sentinel y publicar apps | Gratis para uso no comercial; tiene condiciones | ⚠️ |
| **QGIS** | Escritorio, código abierto | Análisis y revisión manual de capas | No es un panel público | ⚠️ |
| **Ushahidi** | Reportes colaborativos | Recibir y moderar reportes ciudadanos | Hay que moderar | 🔎 |
| **Streamlit / Observable** | Paneles en Python/JS | Prototipo rápido de paneles de datos | Limitado para mapas muy interactivos | ⚠️ |

Las comparaciones de Felt y Atlas que aparecieron en la búsqueda son de proveedores con interés comercial; las usé solo para la descripción básica.

## C. Lectura para este proyecto

- **Mapa base y capas**: MapLibre es la opción más equilibrada (gratis, controlable, soporta capas raster de satélite, puntos y polígonos, con línea de tiempo). Leaflet alcanza si se quiere algo más simple.
- **Prototipo rápido sin programar mucho**: Felt o Kepler.gl para validar con usuarios qué capas importan antes de invertir.
- **Si el usuario ya trabaja con Esri**, ArcGIS Dashboards evita construir, pero implica licencia.
- **No usar Flood Hub como fuente única**: Google mismo advierte que es informativo y que las condiciones reales pueden variar.
