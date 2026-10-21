# 10. Plan de mejora: marcar bien dónde hay agua

Fecha: 21 de octubre de 2026. Reemplaza la versión anterior de este documento.

## La necesidad, en una línea

Abrir el mapa, con o sin foto satelital de fondo, y ver marcadas correctamente las zonas con agua de la inundación. Todo lo demás es contexto.

Hoy el sitio cumple la primera mitad (se ve el agua con o sin satélite) y **no puede demostrar la segunda**: nadie midió todavía cuánto del azul es agua de verdad. Este plan ordena el trabajo para llegar a esa prueba y después mejorar el resultado con números, no a ojo.

## Qué se cambió el 21 de octubre

| Problema | Cambio |
|---|---|
| Sin aviso de carga | Indicador «Cargando mapa…» y «Calculando el agua…» abajo al centro (arriba en el celular). Se apaga cuando terminan todas las capas |
| Interfaz grande, aviso fijo | El aviso superior se cierra con ×. El texto completo queda en el enlace «Aviso» del encabezado. En el celular, el panel Antes/Después es más corto |
| «Ocultar fotos» sin vuelta atrás | Ahora es un interruptor: «Ocultar satélite» y «Ver satélite» |
| Sin satélite no se veía el agua | El agua se calcula aparte y se ve entera sobre el mapa de calles |
| Manchas imprecisas | Índice MNDWI (verde contra infrarrojo de onda corta, 20 m) en lugar de NDWI. Se usa la clasificación de la escena de Sentinel-2 (SCL) para descartar nubes, sombras de nube y píxeles sin dato. Se descartan píxeles de agua sueltos (menos de 3 vecinos con agua). Salto mínimo entre fechas: 0,15 |
| Paneles desordenados en PC | Columna izquierda (búsqueda, fechas, capas) y columna derecha (información). En el centro, solo el mapa, el zoom y el indicador de carga |
| «La pasada» del radar | Eliminada. El radar muestra siempre la pasada más reciente, con su fecha en la etiqueta |
| Recorrido en cada ingreso | Sale la primera vez. El botón «?» lo repite |

Por qué MNDWI: en las ciudades, el NDWI confunde techos oscuros y asfalto con agua. MNDWI usa la banda B11 (infrarrojo de onda corta), donde el agua es casi negra y el cemento no, y separa mejor agua y ciudad. El precio es que B11 mide 20 m por píxel, así que el borde de cada mancha es más grueso. Ante la duda se priorizó acertar dónde hay agua antes que dibujar un borde fino.

## Fase 1. Medir (antes de tocar más umbrales)

Sin esta fase, cualquier mejora es una opinión.

1. **Muestra de referencia.** Sobre la escena Sentinel-2 del 19 de octubre, marcar a mano 300 puntos en San Fernando: 100 con agua nueva, 100 con agua permanente (río, lagunas) y 100 de tierra seca. Incluir a propósito casos difíciles: techos oscuros, asfalto, campos arados, sombras de árboles, esteros con vegetación. Las fuentes de verdad son fotos y videos con fecha y lugar (prensa, redes, envíos aprobados) y, si llega, el producto de CONAE.
2. **Script de validación.** `web/validar.py` lee los puntos (CSV con latitud, longitud y clase), pide a Planetary Computer el valor de los índices en cada punto con la misma expresión que usa el sitio y aplica la misma regla de `clase()`. Imprime una matriz de confusión. Solo biblioteca estándar: se piden puntos, no imágenes.
3. **Meta para dar el azul por confiable:** al menos 85 % de los píxeles marcados como agua nueva son agua (precisión) y al menos 70 % del agua nueva real queda marcada (sensibilidad). Hasta alcanzarla, el sitio sigue diciendo que el cálculo no está validado.
4. **Referencia gratuita para el agua permanente.** JRC Global Surface Water (30 m, en Planetary Computer como `jrc-gsw`) dice dónde hubo agua casi siempre desde 1984. Sirve para medir sin trabajo manual si el río y las lagunas quedan bien clasificados como «agua que ya estaba».

## Fase 2. Mejorar el clasificador, en orden de impacto esperado

Cada paso se mide con el script de la fase 1 y se mantiene solo si mejora los números.

1. **«Antes» como mediana de varias fechas secas**, en lugar de una sola foto. Una fecha suelta con nubes o bruma deja huecos que se rayan en gris o generan falsos «agua nueva». La API de mosaicos de Planetary Computer ya admite pedir la mediana de un rango de fechas; se cambia la búsqueda de `mosaico()`.
2. **Máscara de agua permanente (JRC).** Lo que el JRC marca como agua más del 80 % del tiempo es siempre «ya estaba», aunque la fecha «Antes» esté nublada.
3. **Umbral adaptativo por escena** (método de Otsu sobre el histograma de MNDWI de la vista) en lugar de 0,2 fijo. El agua turbia del Paraná y el agua de lluvia sobre pasto tienen valores distintos y un único número no sirve para las dos.
4. **Sentinel-1 ante nubes.** El radar atraviesa las nubes y en la temporada de lluvias es la única fuente segura. Planetary Computer publica `sentinel-1-rtc` (10 m). Regla de partida: VV por debajo de −18 dB en «Después» y por encima de −15 dB en «Antes». Va como capa propia, con otro tono de azul y la etiqueta «radar», y completa solo las zonas que el óptico deja rayadas. Hay que verificar si el acceso pide registro. Limitación conocida: en zonas urbanas el radar rebota en las paredes y no ve el agua entre casas.
5. **Agua bajo vegetación** (esteros, bañados, monte inundado): Sentinel-2 no la ve y Sentinel-1 la ve mal. Solo el radar de banda L (SAOCOM, de CONAE) la resuelve. Queda para la fase 4.

## Fase 3. Que el resultado llegue rápido y no dependa del navegador

Hoy cada visitante pide decenas de teselas a Planetary Computer y calcula el agua en su navegador. Con tráfico real eso va a fallar (`ERR_HTTP2_SERVER_REFUSED_STREAM`) y en un celular de gama baja tarda.

1. **Medir** peticiones, tiempo y megas por vista en una conexión 3G simulada.
2. **Precalcular una vez por día** la capa de agua de San Fernando en el servidor y servirla como teselas PNG fijas. El navegador solo las muestra. Esto rompe la regla de «solo biblioteca estándar» de `actualizar.py` (hace falta leer imágenes), así que es una decisión del dueño: o se acepta una dependencia (por ejemplo `numpy` y `pillow`) en un script aparte, o se sigue calculando en el navegador con un proxy con caché.
3. Mientras tanto, el cálculo en el navegador queda como está, con el limitador de 3 peticiones simultáneas.

## Fase 4. Más detalle, por la vía institucional y las evidencias

La resolución mínima pedida es 1 m por píxel. No existe una fuente gratuita y reciente de esa resolución sobre la zona (ver tablas abajo). Los caminos reales son:

1. **CONAE.** Pedir los productos de las activaciones de inundación vigentes (353, 359, 360 y 361) a u_inter@conae.gov.ar y atencion.usuario@conae.gov.ar. Si llegan, son la mejor referencia para la fase 1 y pueden mostrarse como capa propia con su fecha. Pedir también acceso a SAOCOM para el agua bajo vegetación.
2. **Evidencias con fecha.** Capa de puntos que enlazan a fotos y videos públicos, con fecha de publicación, fuente y estado («Reportado», «Ubicado», «Coincide con el satélite»). Ya existe el formulario y la cola de moderación. Falta la vista pública de lo aprobado.
3. **Vuelos de dron** subidos a OpenAerialMap con fecha. Un vuelo sobre un barrio da 5 a 10 cm por píxel.
4. **Imagen comercial** (SPOT 6/7 de 1,5 m, Planet, Airbus) solo con presupuesto y para una escena puntual.

## Fuentes por resolución

| Fuente | Resolución | Fecha | Gratis | Uso |
|---|---|---|---|---|
| Sentinel-2 (Planetary Computer) | 10 m (B03, B08), 20 m (B11, SCL) | hasta el 19/10/2026 | sí, sin clave | Base de «Agua nueva» |
| Sentinel-1 RTC (Planetary Computer) | 10 m | hasta el 20/10/2026 | verificar | Fase 2, ante nubes |
| JRC Global Surface Water | 30 m | 1984 a 2021 | sí | Fase 1 y 2, agua permanente |
| IGN, ortomosaicos WMS | 0,3 a 0,5 m | archivo 2011 a 2021 | sí, con cita | «Foto HD», solo para ubicar calles. Consultar si requiere autorización |
| CONAE, SPOT 6/7 | 1,5 m | a pedido | con licencia | Fase 4 |
| CONAE, SAOCOM (banda L) | 10 m aprox. | a pedido | por convenio | Fase 4, agua bajo vegetación |
| Carta Internacional y Copernicus EMS | submétrica | por activación | sí | Fase 4. CONAE puede pedirla |
| OpenAerialMap | variable | quien suba | sí | Fase 4, drones |
| Satellogic EarthView | 1 m | 2022 | sí, CC BY | Solo línea de base de terreno |
| Esri, Google, Mapbox, Bing | submétrica | archivo sin fecha comparable | términos restrictivos | Descartadas |
| Planet NICFI | 4,7 m | terminó en 2025 | no | No disponible |

## Reglas que no cambian

- No se inventa agua ni se interpola entre fechas. Sin dato no significa sin agua.
- Cada capa muestra su fecha, su sensor y su resolución. Una foto de archivo nunca se presenta como actual.
- El aviso «Información automática y NO oficial» se ve al entrar. Se puede cerrar, y queda accesible desde el encabezado.
- Una evidencia pública enlaza a su fuente. No se copian fotos ni videos ajenos.

## Riesgos abiertos

- Precisión del azul sin medir (fase 1).
- Dependencia de servicios de terceros sin garantía ni términos revisados para tráfico alto.
- Peso y tiempo de carga en celulares y 3G sin medir (fase 3).
- Aviso legal sin revisión jurídica.
