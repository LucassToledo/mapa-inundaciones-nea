# Enfoque propuesto, riesgos y decisiones

Esto es una propuesta de diseño, no un plan de obra. No se construyó nada.

## 1. Idea central: tres capas, cada una con su función

| Capa | Pregunta que responde | Fuente | Frecuencia | Debilidad |
|---|---|---|---|---|
| **A. Niveles de río** | ¿Qué tan alto está el río respecto de las cotas de alerta y evacuación? ¿Qué se pronostica? | INA (API), Prefectura, CARU | Horas | Es un punto en el río, no dice qué zona se inunda |
| **B. Extensión del agua** | ¿Hasta dónde llega el agua realmente? | GFM (Sentinel-1), NASA LANCE | Días (Sentinel-1) / diaria (óptico, con nubes) | Subestima agua bajo vegetación y en zonas urbanas; revisita de días |
| **C. Impactos en noticias** | ¿Dónde hay gente afectada, rutas cortadas, evacuados? | Medios locales, GDELT | Horas a días | Cobertura desigual, lugares aproximados |

Más contexto: alertas del SMN (CAP) y lluvia satelital (IMERG) como adelanto, y el Paraná aguas arriba (Brasil) porque la crecida llega aunque no llueva en Argentina.

**Por qué las tres**: cada una cubre el punto ciego de las otras. La capa A avisa antes, la B muestra el hecho consumado y la C traduce a consecuencias para la gente. Cuando coinciden las tres en un lugar, la confianza es alta.

## 2. Qué vería quien decide

- Mapa del Litoral con: estaciones coloreadas por estado (normal, alerta, evacuación), polígonos de agua detectada con su fecha, puntos de impacto de noticias, alertas del SMN.
- **Línea de tiempo** para ver el avance día a día. Es la forma concreta de "ver el avance del agua".
- Al hacer clic en cualquier dato: de dónde sale, de qué fecha es y qué tan confiable es.
- Un tablero lateral con las estaciones que están por cruzar la cota de alerta según el pronóstico del INA.
- Una nota visible: **no es información oficial**; las decisiones de evacuación las toma Defensa Civil.

## 3. Orden sugerido si se decidiera construir (fases)

1. **Validar las fuentes pendientes** (doc 06): resolver `datos` del INA, probar GDELT con calma, armar lista de RSS.
2. **Fase 1 – niveles + alertas**: estaciones del INA contra sus cotas, más alertas SMN. Es lo más simple, de más valor y con datos ya comprobados.
3. **Fase 2 – satélite**: capa GFM con línea de tiempo. Tiene API pública probada.
4. **Fase 3 – noticias**: extracción, geocodificación y deduplicación, con muestra revisada a mano para medir precisión.
5. **Fase 4 – cruces y confianza**: unir las tres capas y mostrar corroboración.

La parte de noticias es la más incierta y la que más trabajo tiene; por eso va al final, aunque es lo que el usuario pidió. Si el usuario quiere noticias primero, se puede, pero con mapa pobre al comienzo.

## 4. Riesgos

| Riesgo | Por qué importa | Mitigación |
|---|---|---|
| **Falsa seguridad**: el mapa no muestra agua donde sí hay | Un radar no ve bajo vegetación; la prensa no cubre todo | Mostrar siempre "sin datos" distinto de "sin agua"; no dar por seco lo no detectado |
| **Falsas alarmas**: un error del modelo de lenguaje pone un evento donde no hay | Pérdida de confianza | Confianza por evento, revisión de muestra, mostrar fuente |
| **Responsabilidad**: tomar decisiones de evacuación o logística en base a una herramienta no oficial | Daño real | Aviso claro de que complementa, no reemplaza, a Defensa Civil, INA y SMN |
| **Lugares mal ubicados** | El punto cae en otra localidad | Mostrar nivel de precisión y dibujar círculo de incertidumbre, no un pin exacto |
| **Dependencia de fuentes sin garantía** (STAC de EODC, INA sin licencia declarada) | Pueden cambiar o limitar | Guardar copia de lo ya consultado; pedir al INA licencia y condiciones |
| **Derechos de autor** de las notas | Reproducir texto completo | Guardar datos extraídos, título y enlace |
| **Límites de GDELT / Flood Hub** | Bloqueos o espera | Plan B con RSS propio; solicitar acceso a Flood Hub API |
| **Datos desactualizados mostrados como actuales** | Engaña | Estampa de fecha en cada dato y alerta de "dato viejo" |
| **Período largo (hasta abril 2027)** | Mantenimiento | Automatizar y mantener simple |

## 5. Costo estimado (orden de magnitud, sin cotizar)

- Datos: **cero** (todo abierto, sin clave en lo probado).
- Modelo de lenguaje: depende del volumen de notas (desconocido). Con filtro previo debería ser bajo.
- Alojamiento: un mapa con capas puede servirse desde hosting estático más un proceso periódico. No lo dimensioné.
- Mayor costo real: **tiempo de desarrollo y revisión de calidad**, sobre todo en la parte de noticias.

## 6. Alternativas a construir de cero

- **Solo mirar**: usar Flood Hub + visor INA + GFM + SMN en pestañas. Costo cero, sin cruces.
- **Prototipo rápido** con Felt o Kepler.gl para ver con usuarios qué capas importan antes de comprometerse (doc 02).
- **Pedir a quien ya tiene**: preguntar a INA, CONAE o Defensa Civil si hay tableros internos o planes de uno. Puede evitar duplicar.

## 7. Audiencia definida: público general, municipios y Defensa Civil

Respuesta del usuario (21/10/2026): la herramienta es para el **público, los municipios y Defensa Civil**. Eso cambia el diseño así:

| Aspecto | Consecuencia |
|---|---|
| **Dos vistas con la misma base de datos** | Vista pública: simple, en lenguaje claro, pensada para celular. Vista operativa (municipio y Defensa Civil): más detalle, filtros, confianza por dato, estaciones por cruzar la cota, exportación. |
| **Responsabilidad** | Al ser público, un error puede llevar a alguien a no evacuar o a evacuar mal. La herramienta no emite órdenes ni "recomendaciones de evacuar": muestra datos con fecha y fuente, y remite a la autoridad local. Hace falta aviso legal visible y, de ser posible, revisión de un abogado. |
| **Relación con Defensa Civil** | Lo ideal es que la use o valide Defensa Civil, y no que compita con sus avisos oficiales. Conviene hablar con ellos y con el INA **antes** de diseñar: pueden aportar datos que no son abiertos (partes de evacuados, centros de evacuación) y decir qué no quieren que se publique. |
| **Qué se publica en la vista pública** | Niveles de río contra cotas oficiales, alertas del SMN, agua detectada por satélite y eventos de prensa con confianza alta. Los eventos de baja confianza, solo en la vista operativa. |
| **Datos sensibles** | No mostrar domicilios ni datos personales de evacuados, aunque la prensa los publique. Ubicación a nivel de localidad o barrio. |
| **Aviso de lo que falta** | "Sin datos" distinto de "sin agua". Más importante todavía con público general, que lee un mapa sin agua como zona segura. |
| **Carga y disponibilidad** | En una crecida grande hay mucho tráfico justo cuando más se necesita. Conviene servir el mapa como archivos estáticos (barato, aguanta picos) y actualizar los datos con un proceso aparte. |
| **Accesibilidad y lenguaje** | Lenguaje simple, colores que no dependan solo del rojo y verde, funcionar con conexión lenta. En el Litoral hay zonas con mala señal. |
| **Corrección de errores** | Un canal para que municipios corrijan o marquen un evento como falso. Con público, mover moderación al municipio tiene sentido. |
| **Reportes ciudadanos** | Tentador (Ushahidi 2013 es el antecedente), pero exige moderación y puede difundir rumores. Dejarlo fuera del primer alcance. |
| **Derechos y licencias** | Uso público requiere confirmar las condiciones del INA (hoy sin licencia declarada), atribución CC BY del SMN y de Google, y no reproducir texto de notas. |

**Cambios en las fases del punto 3**: agregar al comienzo una **fase 0 de acuerdo con Defensa Civil, municipios del Litoral e INA** (qué mostrar, quién valida, qué se deriva a ellos). La fase de noticias se mantiene al final y, dado el uso público, con revisión humana antes de publicar cada evento.

## 8. Decisiones que le tocan al usuario

1. ~~**¿Quién decide con esto?**~~ **Resuelto**: público, municipios y Defensa Civil (ver punto 7). Queda abierto **quién opera y se responsabiliza** del servicio (el usuario, una institución, un convenio con Defensa Civil).
2. **¿Qué zona al inicio?** Recomiendo el Litoral (Corrientes, Entre Ríos, Santa Fe, Chaco, Misiones, norte de Buenos Aires) y ampliar después.
3. **¿Uso público o interno?** Público exige más cuidado con avisos, derechos y moderación.
4. **¿Qué pesa más: avisar antes (niveles y pronóstico) o ver lo ocurrido (satélite y noticias)?** Define la fase 1.
5. **¿Hay presupuesto para modelo de lenguaje y hosting, y un revisor humano para la muestra de calidad?**
6. **¿Pedir acceso a Flood Hub API y consultar al INA por licencia y condiciones de uso?**
7. **¿Seguir con la construcción o hacer antes un prototipo con herramientas existentes?**
