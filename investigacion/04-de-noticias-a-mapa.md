# De noticias a eventos en el mapa

Leyenda: ✅ probado hoy · 🔎 confirmado por búsqueda · ⚠️ conocimiento previo o sin verificar.

## 1. El problema

Una nota dice "evacuaron 400 personas en Concordia" o "la ruta 12 está cortada en Itatí". Eso es un **evento puntual con lugar, fecha y tipo de impacto**. No dice hasta dónde llegó el agua. Por eso las noticias alimentan una capa de *impactos reportados*, no la de extensión del agua (esa viene del satélite, ver doc 03).

## 2. Pipeline típico (de la fuente al punto en el mapa)

1. **Recolectar** notas: GDELT y/o RSS de medios locales (doc 03, sección 6).
2. **Filtrar** las que hablan de inundación, crecida, anegamiento, evacuados, rutas cortadas. Un filtro por palabras clave alcanza para empezar y reduce costo.
3. **Extraer** con un modelo de lenguaje: qué pasó, **dónde** (lugar mencionado), **cuándo** (fecha del hecho, no de la nota), cifras (evacuados, afectados, altura del río) y tipo de impacto.
4. **Geocodificar** el lugar: primero con Georef para provincias, departamentos y localidades ✅; para barrios, parajes, calles o rutas hace falta otro geocodificador o referencias propias (por ejemplo, tramos de ruta). Asignar un nivel de precisión: localidad, departamento o provincia.
5. **Deduplicar**: muchos medios cuentan el mismo hecho. Agrupar por lugar + fecha + tipo.
6. **Guardar con procedencia**: enlace, medio, fecha de publicación, fecha del hecho, texto citado mínimo, confianza.
7. **Mostrar** como puntos o círculos con línea de tiempo, siempre junto a los niveles de río y la capa satelital.

## 3. Antecedentes

### Groundsource (Google) 🔎
- Dataset abierto (CC BY 4.0) de **2.646.302 eventos de inundación** (2000 al presente, más de 150 países) extraídos de noticias con Gemini y geocodificados a polígonos. Campos: `uuid`, `area_km2`, `start_date`, `end_date`, `geometry`. Descarga en Zenodo (DOI 10.5281/zenodo.18647054) y Earth Engine.
- Precisión estimada ronda el 75 % según lo que leí. Es un **archivo histórico**, no un servicio en vivo, y la cobertura depende de cuánto cubran los medios locales.
- Utilidad para este proyecto: (a) demuestra que el método funciona; (b) sirve para **validar** y para ver cuántos eventos históricos ya existen en el Litoral; (c) las áreas son polígonos grandes, no calles.

### HazMiner (Zenodo) 🔎
- Dataset de inundaciones, aludes y crecidas repentinas extraído de noticias con modelos de lenguaje, pensado para el Sur Global. Sirve como segunda referencia metodológica. No lo evalué en detalle.

### Ushahidi (2013, Buenos Aires y La Plata) 🔎
- Precedente de mapa colaborativo con moderación. Muestra que en Argentina la idea ya tuvo uso real, pero depende de voluntarios que verifiquen cada reporte.

## 4. GDELT: qué prometen y qué no pude comprobar

- Promete mapa de ubicaciones mencionadas cada 15 minutos, 65 idiomas, ventana móvil de 3 meses, sin clave 🔎.
- **No pude probar el contenido**: el servicio me devolvió HTTP 429 y avisos de límite (una consulta cada 5 segundos) aun esperando entre pruebas. Hasta no ver resultados reales en español sobre inundaciones en el Litoral, **no sé cuántos medios locales cubre**. Es la primera verificación pendiente (doc 06).
- Riesgo conocido de GDELT: la geolocalización automática asigna a menudo el lugar de la agencia o el de la provincia, no el del hecho. Hay que validar con una muestra.

## 5. Medios locales por RSS ⚠️

- Los diarios del Litoral (Corrientes, Chaco, Entre Ríos, Santa Fe, Misiones) son quienes primero informan evacuaciones y barrios anegados. Casi todos tienen RSS, pero no los verifiqué uno por uno. Armar y probar la lista es trabajo previo a cualquier desarrollo.
- Respetar los términos de cada sitio y no republicar el texto completo.

## 6. Qué extraer y cómo expresar la certeza

| Campo | Ejemplo | Nota |
|---|---|---|
| Lugar | "Itatí, Corrientes" | Con nivel de precisión (localidad, departamento) |
| Fecha del hecho | 17/10/2026 | Distinta de la fecha de publicación |
| Tipo | evacuación, ruta cortada, barrio anegado, altura de río | Lista cerrada |
| Cifra | 110 personas | Con unidad y qué cuenta |
| Fuente | medio + enlace | Siempre |
| Confianza | alta / media / baja | Sube si hay varios medios o si coincide con la cota del río |

La **corroboración cruzada** es la ventaja principal de la herramienta: un evento de prensa en Corrientes pesa más si el INA muestra el río sobre la cota de alerta y GFM ve agua en esa zona.

## 7. Límites a tener presentes

- **Cobertura desigual**: lo que no sale en la prensa no aparece. Zonas rurales y de poca población quedan subrepresentadas.
- **Retraso**: la nota llega horas o días después del hecho.
- **Lugares ambiguos**: "barrio San Pedro Pescador" o "Puerto Vilelas" pueden no estar en ningún nomenclador. Hay homónimos entre provincias.
- **Cifras contradictorias** entre medios (ejemplo real de Concordia en doc 01). Conservar todas, con fecha y fuente, y no promediar.
- **Errores del modelo de lenguaje**: puede inventar o confundir fechas. Hace falta una muestra revisada a mano para medir precisión antes de confiar en el resultado.
- **Derechos de autor**: guardar solo datos extraídos, título y enlace.
- **Costo del modelo**: depende del volumen de notas. No lo calculé porque no sé cuántas notas por día habría; con el filtro previo debería ser bajo.
