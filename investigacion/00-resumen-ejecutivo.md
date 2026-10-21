# Seguimiento de inundaciones por El Niño en Argentina: resumen ejecutivo

Investigación del 21/10/2026. No se construyó nada. Los documentos de esta carpeta:

| Archivo | Contenido |
|---|---|
| `01-contexto-el-nino-2026.md` | Qué está pasando ahora y qué se espera (zonas, fechas, cifras) |
| `02-plataformas-existentes.md` | Mapas y visores de inundación que ya existen, y herramientas para armar uno propio |
| `03-fuentes-datos-abiertos.md` | Catálogo de datos abiertos con endpoints, formato, licencia y **estado de verificación** |
| `04-de-noticias-a-mapa.md` | Cómo convertir noticias en eventos geolocalizados; antecedentes (Groundsource, HazMiner) |
| `05-enfoque-propuesto-y-riesgos.md` | Diseño sugerido, límites, riesgos y decisiones que le tocan al usuario |
| `06-fuentes-y-pendientes.md` | Links consultados y lo que quedó sin verificar |

## Conclusiones

1. **El contexto justifica la herramienta.** El Niño 2026-27 se describe como muy fuerte, posiblemente de récord. El SMN ubica el mayor riesgo en el Litoral y el noreste, y el período de riesgo podría extenderse hasta marzo o abril de 2027. Ya hay evacuados en Corrientes y Concordia (ver doc 01).

2. **No existe un mapa público que haga lo pedido.** Hay visores buenos pero separados: Google Flood Hub (pronóstico en ríos), GloFAS/GFM (satélite), el visor del INA (alturas de ríos), el mapa de alertas del SMN y GDACS (eventos globales). Ninguno cruza **noticias + niveles de río + extensión satelital** para Argentina. Ahí está el hueco.

3. **Casi todo el dato necesario es abierto y gratuito.** Probé en vivo cuatro fuentes y las cuatro respondieron, sin clave:
   - **INA**: el recuadro geográfico se ignora y devuelve el catálogo nacional (1.955 estaciones, 96 con cotas); filtradas localmente, la zona de trabajo (Chaco, Corrientes y alrededores) da 48 estaciones con lecturas. Ver `web/actualizar.py`.
   - **GFM (Copernicus)**: mapas de agua por Sentinel-1 con escenas del 20/10/2026 sobre el norte argentino.
   - **SMN**: feed de alertas en formato CAP, licencia CC BY 4.0, actualizado hoy.
   - **GDACS**: eventos de inundación en JSON.
   - **Georef** (datos.gob.ar): convierte nombres de lugar en coordenadas y polígonos.

4. **"El avance del agua según las noticias" no se obtiene solo de noticias.** Una nota dice "Itatí está anegada" o "evacuaron 400 personas en Concordia"; no dice hasta dónde llegó el agua. Para mostrar el avance real hay que combinar tres capas:
   - **Noticias**: dónde hay impacto (evacuados, rutas cortadas, barrios anegados) y cuándo.
   - **Niveles de río**: INA y Prefectura, contra las cotas de alerta y evacuación.
   - **Satélite**: la extensión real del agua (GFM, NASA).

5. **Hay antecedente directo para la parte de noticias.** Google publicó **Groundsource** (CC BY 4.0): 2,6 millones de eventos de inundación sacados de noticias con Gemini y geocodificados. Es un dataset histórico, no un mapa en vivo. Demuestra que el método funciona. Su precisión estimada ronda el 75 %, y la cobertura depende de cuánto cubran los medios locales.

6. **Costo estimado: casi nulo en datos.** El gasto principal sería el modelo de lenguaje que lee noticias y el hosting. Faltan por confirmar el volumen de noticias y la frecuencia de actualización.

## Decisiones que necesito del usuario antes de diseñar

Ver secciones 7 y 8 de `05-enfoque-propuesto-y-riesgos.md`.
- **Audiencia (resuelto, 21/10/2026)**: público general, municipios y Defensa Civil. Implica una vista pública simple y una operativa, aviso de que no es información oficial, y hablar con Defensa Civil e INA antes de diseñar.
- **Abierto: ¿quién opera y se responsabiliza del servicio?** (el usuario, una institución, un convenio).
- **¿Cuántas provincias al inicio?** Recomiendo empezar solo por el Litoral (Corrientes, Entre Ríos, Santa Fe, Chaco, Misiones, norte de Buenos Aires).
