# 10. Plan de mejora: ver dónde hay agua hoy frente a una fecha anterior

Fecha: 21 de octubre de 2026.

## Por qué se replantea

Tras las pruebas con el barrio junto al puente General Belgrano, del lado chaqueño, quedó claro que el sitio hacía muchas cosas y fallaba en la principal. El radar de Copernicus (GFM) no marcaba esa zona, la foto de archivo de alta definición era vieja y no se podía comparar, y los paneles y las atribuciones tapaban el mapa. La función central pasa a ser una sola:

> Abrir el mapa y ver, marcado en azul, dónde hay agua hoy que no había en una fecha anterior, con la información más reciente disponible y con enlaces públicos a fotos o videos, cada uno con su fecha.

Todo lo demás (pronóstico, ríos, alertas, prensa) es contexto y queda detrás de esa función.

## Qué se hizo ya

| Cambio | Resultado |
|---|---|
| Capa **Agua nueva** calculada en el navegador con Sentinel-2 (NDWI de la fecha «Después» menos la de «Antes») | Marca en azul fuerte el agua nueva en el barrio chaqueño del puente Belgrano entre el 2 y el 19 de octubre. El radar no lo hacía |
| Arranque siempre en modo comparación, con la divisoria a la izquierda para que domine la fecha reciente | Se ve el cambio al abrir, sin tocar nada |
| Capa de alertas del SMN apagada al inicio | Menos ruido sobre la imagen |
| Atribuciones en el borde inferior | No tapan el mapa |
| Recorrido guiado en cada ingreso | Entendible siempre |
| Foto HD de archivo (IGN, 2011 a 2021) como botón aparte, apagado al inicio | Da detalle de calle y casa (unos 0,4 m por píxel) para ubicar el barrio, con aviso permanente de que no es el agua de hoy |
| Foco en el departamento San Fernando (Resistencia, Barranqueras, Vilelas y la ribera) | Menos mosaicos por vista y menos peticiones a servicios de terceros |
| Leyenda con el significado de cada color y el límite de 10 m | El usuario sabe qué mira |

## Qué resolución es posible hoy, sin vueltas

Se pidió 50 cm o 1 m por píxel. Se investigó y **no existe una fuente gratuita de esa resolución, reciente, sobre el Chaco y Corrientes**.

| Fuente | Resolución | Fecha | Gratis | Veredicto |
|---|---|---|---|---|
| Sentinel-2 (Planetary Computer) | 10 m | hasta el 19/10/2026 | sí, sin clave | Es lo mejor reciente. Ya integrado |
| Sentinel-1 radar (Copernicus Data Space, Earth Search) | 10 a 20 m | hasta el 20/10/2026 | sí, con registro gratuito | Ve el agua a través de nubes. Falta integrarlo para zonas abiertas |
| Esri World Imagery | 30 a 50 cm | archivo, de 2017 a 2026 según el punto | uso limitado | Descartada: no es de hoy y no se compara |
| Satellogic EarthView | 1 m | julio a diciembre de 2022 | sí, CC BY | Podría servir de línea de base de terreno, no de agua de hoy |
| Vantor (antes Maxar) Open Data | 30 a 50 cm | solo activaciones por desastre | sí, CC BY-NC | No hay activación en Argentina |
| Planet NICFI | 4,7 m | terminó en enero de 2025 | no | No disponible |
| Planet Education and Research | cerca de 3 m | con 30 días de demora | solo universidades | Requiere vínculo universitario |
| Carta Internacional y Copernicus EMS | submétrica | por activación | sí | No hubo activación en octubre. CONAE la puede solicitar |
| OpenAerialMap | variable | quien suba | sí | Hay una imagen de 2023 en Chaco. Útil si alguien sube vuelos de dron |
| Google, Mapbox, Bing, MapTiler | submétrica | sin fecha o de archivo | pago o términos restrictivos | Descartadas |

### Revisión del 21 de octubre: CONAE, IGN e INTA

| Fuente | Qué hay | Resolución | Veredicto |
|---|---|---|---|
| IGN, servicio WMS de ortomosaicos (`imagenes.ign.gob.ar`) | Resistencia 2011, Barranqueras 2014, Corrientes-Resistencia 2016 y un vuelo de dron en Fontana 2021 | 0,3 a 0,5 m | **Integrada como «Foto HD»**, solo de archivo. Sin CORS: se muestra, no se calcula sobre ella. Pendiente confirmar con el IGN si la publicación en un sitio requiere autorización; la cita obligatoria ya figura |
| CONAE, catálogo y visor | SPOT 6/7 (1,5 m), COSMO-SkyMed y SAOCOM, con licencia o registro. El WMS abierto solo tiene fracción de inundación gruesa y los puntos de emergencias | 1,5 m en lo comercial | No hay producto público de las activaciones de inundación vigentes (n.º 353, 359, 360 y 361). Hay que pedirlo: u_inter@conae.gov.ar y atencion.usuario@conae.gov.ar |
| INTA, geoservicios | 114 capas: inventario de humedales, cursos de agua, suelos | Cartografía de contexto | Sirve para marcar bajos y humedales que se inundan, no para decir qué está inundado hoy. El nodo regional Chaco-Formosa no tiene capas |
| Sentinel-1 radar | Retrodispersión: el agua refleja poco y se ve oscura. Atraviesa nubes | 10 a 20 m | Viable y complementa a NDWI donde hay nubes. **No** llega a 1 m, y en zonas urbanas el rebote doble tapa el agua |

NDWI sobre Sentinel-2 es el método ya usado y es válido. Sentinel-1 es un buen complemento, pero ninguno de los dos cumple el mínimo de 1 m por píxel.

La conclusión se dice en el sitio y en los documentos: la mejor imagen gratuita y reciente es de 10 m. Se ve el barrio como mancha, no la casa. Para acercarse a 1 m hay dos caminos reales: una activación de la Carta Internacional pedida por CONAE y la Defensa Civil, y fotos o videos de dron y celular subidos por personas, con fecha y ubicación.

## Plan por fases

### Fase 1. Que el azul sea confiable (próximos días)

1. **Validar contra una inundación real.** Tomar un mapa de agua de referencia (producto de CONAE, de la Carta Internacional o delineado a mano sobre fotos de dron de esta inundación) y medir cuántos píxeles azules coinciden. Sin esta medición, el azul es una hipótesis.
2. **Calibrar umbrales.** NDWI de agua (hoy 0,05), salto mínimo entre fechas (hoy cerca de 0,1) y filtro de nubes. Probar con sombras, techos oscuros y campos arados para bajar los falsos positivos.
3. **Filtro de ruido.** Descartar manchas menores a unos 3 píxeles y exigir que el agua nueva sea contigua a agua o bajos conocidos.
4. **Aviso de calidad por escena.** Mostrar el porcentaje de nubes de cada fecha y avisar cuando la comparación cubre menos de la mitad de la zona.
5. **Peso y límites del servicio.** Medir las peticiones por vista y el peso en 3G. Si Planetary Computer rechaza peticiones con tráfico real, pasar a un proxy propio con caché o a Earth Search.

### Fase 2. Radar para ver a través de las nubes (1 a 2 semanas)

1. Registrarse en Copernicus Data Space Ecosystem (gratuito) y usar Sentinel Hub: cuota de 10 000 unidades de proceso al mes y 300 peticiones por minuto, suficiente para un piloto.
2. Calcular el cambio entre dos pasadas de Sentinel-1 (retrodispersión baja en VV y VH) y mostrarlo como segunda capa, con otro color y la etiqueta «radar».
3. Donde hay nubes y la capa óptica queda rayada, el radar completa el dato. El texto del sitio dice cuál de las dos fuentes marca cada zona.
4. Mantener la regla: nunca decir «sin agua» donde no hay dato.

### Fase 3. Evidencias públicas con fecha (2 a 4 semanas)

Es lo que más se acerca a la resolución pedida y a la confianza del público.

1. **Capa «Evidencias»**: puntos en el mapa con enlace a una foto o video público (YouTube, X, Instagram, Facebook, Mapillary, Wikimedia Commons, Flickr con licencia abierta), siempre con **fecha de publicación**, fuente, lugar y estado de revisión. El sitio no copia el archivo, enlaza.
2. **Estados**: «Reportado» (enviado por una persona), «Ubicado» (un moderador confirmó el lugar) y «Coincide con el satélite» (el punto cae dentro de una mancha azul del mismo período). Esto cruza dos fuentes independientes sin afirmar más de lo que se sabe.
3. **Formulario de enlace**: fecha, lugar (pin en el mapa) y enlace. Ya existe el formulario y la cola de moderación; falta la vista pública de lo aprobado.
4. **Búsqueda del mismo clip en fechas anteriores** antes de publicar, porque circulan videos reciclados.
5. **Dron**: invitar a subir vuelos a OpenAerialMap con fecha. Un solo vuelo de 5 a 10 cm por píxel sobre un barrio da más información que cualquier satélite gratuito.

### Fase 4. Alta definición real, por la vía institucional

1. CONAE (contacto de la Carta Internacional: u_inter@conae.gov.ar) puede solicitar la activación. Si se activa, los mapas y las imágenes se publican en el mismo visor, con su fecha.
2. Catálogo de CONAE (SAOCOM, radar de banda L) por registro o convenio: el radar de banda L ve el agua bajo vegetación mejor que Sentinel-1.
3. Imágenes comerciales (Planet, Airbus, Maxar) solo con presupuesto. Se compraría una escena puntual, no una suscripción.

## Registros útiles, en orden

| Registro | Costo | Para qué | Cuándo |
|---|---|---|---|
| Copernicus Data Space Ecosystem | gratis | Sentinel-1 y Sentinel-2 por API, Sentinel Hub | Fase 2 |
| OpenAerialMap | gratis | subir y consultar imágenes de dron con fecha | Fase 3 |
| Mapillary | gratis, token de API | fotos a nivel de calle con fecha y ubicación | Fase 3, si hay cobertura en la zona (no verificada) |
| CONAE: pedido de activación de la Carta y acceso al catálogo | gratis, por trámite | imágenes submétricas y SAOCOM | Fase 4 |
| Planet Education and Research | gratis, solo universidades | 3 m con 30 días de demora | solo si hay una universidad aliada |

## Reglas que no cambian

- Nada de agua inventada. Sin dato no significa sin agua.
- Cada capa muestra su fecha, su sensor y su resolución.
- Información automática y no oficial, con el aviso permanente.
- Una evidencia pública enlaza a su fuente. No se copian fotos ni videos ajenos.

## Riesgos abiertos

- Falsos positivos y falsos negativos sin medir. Fase 1, punto 1.
- Dependencia de servicios de terceros sin garantía (Planetary Computer, EODC, Open-Meteo, OpenStreetMap).
- Términos de uso de esos servicios con tráfico alto, sin consultar.
- Aviso legal sin revisión jurídica.
- Peso en conexiones lentas, sin medir.
