# Minuta del proyecto: mapa de inundaciones Chaco y NEA

Última actualización: 21 de octubre de 2026. Responsable: Lucas Toledo (@eltiolucas.ia).

## 1. Objetivo

Herramienta pública para vecinos, municipios y Defensa Civil. Muestra dónde hay agua hoy que no había en una fecha anterior, con la información más reciente disponible y enlaces públicos a fotos o videos con fecha. El alcance actual es el departamento San Fernando, Chaco (Resistencia, Barranqueras, Vilelas y la ribera del río). El interior no importa.

## 2. Cronología

| Etapa | Qué se hizo |
|---|---|
| 1. Investigación | Documentos 00 a 08 en `investigacion/`: contexto de El Niño 2026, plataformas existentes, fuentes abiertas, método de noticias a mapa, riesgos |
| 2. Primer producto | Sitio estático con Leaflet: prensa, ríos INA, alertas SMN, radar GFM, videos revisados, envíos moderados con SQLite. Diseño profesional con tutoriales por sección |
| 3. Documentos | Video explicativo de 1 minuto, repositorio abierto en GitHub, PDF formal de 9 páginas sin destinatario institucional |
| 4. Satelital real | Fotos Sentinel-2 por fecha con comparador, «mi dirección» con pronóstico (GloFAS y lluvia estacional de Open-Meteo) |
| 5. Replanteo | Tras la prueba en el barrio junto al puente General Belgrano (lado chaqueño), el radar no marcaba el agua. Se creó la capa **Agua nueva** (NDWI propio sobre Sentinel-2), arranque en comparación, alertas SMN apagadas, atribuciones abajo, recorrido en cada ingreso. Plan en `investigacion/10-plan-de-mejora.md` |
| 6. Alta resolución | Revisión de CONAE, IGN e INTA. Se integró **Foto HD** del IGN (0,4 m, archivo 2011 a 2021) y se acotó el mapa a San Fernando |
| 7. Usabilidad y precisión | Indicador de carga, aviso cerrable, «Ocultar satélite» reversible con el agua visible sobre el mapa de calles, dos columnas en PC, sin línea de tiempo del radar. Detección con MNDWI y la clasificación SCL de Sentinel-2, sin píxeles sueltos. Plan nuevo centrado en medir la precisión |

## 3. Decisiones tomadas

- La función central es comparar el agua de hoy contra una fecha anterior. El resto es contexto.
- El agua se calcula en el navegador, sin servidor propio de imágenes.
- Sin dato no significa sin agua. Nunca se inventa agua ni se interpola entre pasadas.
- Foto HD de archivo solo como botón aparte, apagado al inicio y con aviso de que no es de hoy.
- Prensa se publica sin revisión y con aviso. Videos y reportes de usuarios pasan por una persona.
- Capa de alertas SMN apagada al inicio. Atribuciones en el borde inferior.
- Documentación sin pedidos de alojamiento ni destinatario institucional: eso se trata aparte.
- No se usa ninguna herramienta de IA que genere imágenes sintéticas de inundaciones.

## 4. Resultado de la revisión de fuentes (21 de octubre)

| Fuente | Resolución | Estado |
|---|---|---|
| Sentinel-2 (Planetary Computer) | 10 m | Reciente. Base de «Agua nueva» |
| Sentinel-1 radar | 10 a 20 m | Viable como complemento ante nubes. Pendiente de integrar. Falla en zonas urbanas |
| IGN ortomosaicos (WMS) | 0,3 a 0,5 m | De archivo. Integrada como Foto HD. Sin CORS |
| CONAE SPOT 6/7 | 1,5 m | Con licencia. No integrada |
| CONAE activaciones de inundación 353, 359, 360, 361 | submétrica probable | Sin producto público. Hay que pedirlo |
| INTA geoservicios | cartografía | Humedales y cursos de agua, solo contexto |
| Esri, Google, Mapbox, Bing | submétrica | Descartadas: archivo, sin fecha comparable o términos restrictivos |

Conclusión: no existe una fuente gratuita y reciente de 1 m o menos sobre la zona. El mínimo pedido de 1 m por píxel solo se alcanza con archivo (IGN) o con una activación institucional.

## 5. Estado actual

- Sitio funcionando en local (`http://localhost:8765/`). Sin publicar.
- Último commit en `main`: `3e71be6`. Los cambios del 21 de octubre (etapa 7) están sin commitear.
- Foto HD verificada en el navegador: las teselas cargan y conviven con «Agua nueva».

## 6. Pendientes, por prioridad

1. **Medir «Agua nueva»**: 300 puntos de referencia a mano y un script `web/validar.py` con matriz de confusión. Meta: 85 % de precisión y 70 % de sensibilidad. Detalle en la fase 1 del plan.
2. **Pedir a CONAE** los productos de las activaciones 353, 359, 360 y 361 (u_inter@conae.gov.ar, atencion.usuario@conae.gov.ar).
3. **Consultar al IGN** si publicar su WMS en un sitio requiere autorización.
4. **Capa de evidencias públicas**: puntos con enlace a foto o video, siempre con fecha, fuente y estado (reportado, ubicado, coincide con el satélite).
5. **Sentinel-1** como segunda capa con otro color y etiqueta «radar».
6. Medir las peticiones a Planetary Computer con tráfico real. Si rechaza, pasar a un proxy con caché.
7. Identificar el error 403 de la consola.
8. Actualizar el PDF (todavía dice NDWI y 10 m).
9. Probar en celulares reales y con 3G.
10. Revisión jurídica del aviso legal.

## 7. Riesgos

- Falsos positivos y negativos sin medir.
- Dependencia de servicios de terceros sin garantía de disponibilidad ni términos revisados para tráfico alto.
- Una foto de archivo puede confundirse con el estado actual. Se mitiga con el aviso, pero hay que vigilarlo en cada cambio de interfaz.

## 8. Dónde mirar

- Agentes y código: `CLAUDE.md` en la raíz y `web/README.md`.
- Decisiones y fuentes: `investigacion/10-plan-de-mejora.md`.
- Documento para terceros: `docs/documento-mapa-inundaciones.pdf`.
