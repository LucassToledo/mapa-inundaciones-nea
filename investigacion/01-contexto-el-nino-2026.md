# Contexto: El Niño 2026-27 y la situación en Argentina

Fecha de la investigación: 21/10/2026. Los datos vienen de medios que citan al SMN, la OMM y la NOAA. No pude leer el boletín del SMN ni el de octubre de la NOAA directamente; conviene verificarlos antes de citar cifras.

## Estado del fenómeno

- **NOAA (CPC), boletín de septiembre**: aviso de El Niño vigente. Según el resumen de búsqueda, daba más de 90 % de chance de evento muy fuerte en el otoño-invierno boreal 2026-27 y 75 % de chance de que fuera histórico para octubre-diciembre (Niño 3.4 en +1,8 °C, Niño 1+2 en +3,4 °C). **No encontré el boletín del 8/10**, que debería existir.
- **OMM**: según El Cronista, el índice podría llegar a unos 3,7 °C, por encima del récord de 2,6 °C de 2015-16. Casi seguro dura hasta febrero de 2027. Después, mayor probabilidad de La Niña (posible sequía).
- **SMN**: Infobae (4/9) cita 100 % de probabilidad de mantener la fase El Niño en sep-nov, con intensidad fuerte o muy fuerte. El director del SMN, Pedro Di Nezio, comparó la fuerza del evento con 1997 y dijo que el mayor riesgo de tormentas e inundaciones podría llegar a marzo-abril de 2027.
- **Pico**: las fuentes no coinciden. Algunas dicen octubre; otras, diciembre o fines de año. Usar "fin de 2026 a inicios de 2027" hasta confirmar.

## Dónde se espera el impacto

- Mayor riesgo: franja del norte de Buenos Aires a Misiones, Corrientes, Santa Fe y este de Córdoba (Cronista, citando al SMN).
- Pronóstico trimestral oct-dic del SMN: más lluvia que lo normal en Litoral, Córdoba, sectores de Cuyo, La Pampa, oeste bonaerense y noreste patagónico. La Nación habla de 30 a 70 % de probabilidad de lluvia sobre lo normal en buena parte del país.
- Menos lluvia hacia Cuyo y parte de Patagonia en verano (Infobae 18/10).
- **Mecanismo importante para el diseño**: el agua que sube el Paraná viene en buena parte de lluvias en Brasil (Paraná, Santa Catarina, Río Grande do Sul). Las crecidas pueden seguir **aunque deje de llover en Argentina**. Un mapa útil debe mirar aguas arriba.

## Situación observada (oct 2026)

| Lugar | Dato | Fuente / fecha |
|---|---|---|
| Corrientes (Paraná) | 6,91 m, a 9 cm del umbral de evacuación (7 m); 646 evacuados y autoevacuados; Itatí, la más afectada (110 personas, 43 familias) | Infobae 18/10 |
| Goya | Puerto en alerta con 5,28 m (umbral 5,20 m) | Infobae 18/10 |
| Chaco | Se prevén 7,50 m; alerta roja fuera del sistema de defensas (Puerto Antequeras, Barranqueras, Puerto Vilelas, barrio San Pedro Pescador) | Infobae 18/10 |
| Concordia (río Uruguay) | Cronista: unos 400 evacuados y el intendente decía que podría llegar a 12,50 m. Jornada (11/10): 6 familias evacuadas en forma preventiva | El Cronista; Diario Jornada |
| Colón (río Uruguay) | 7,27 m, por encima de la alerta de 7,10 m; CARU proyectaba 7,70 m (evacuación: 7,90 m) | Diario Jornada 11/10 |
| Misiones | Se normalizó la ruta nacional 12; puente Piray Guazú habilitado | Infobae 18/10 |
| Cuyo / Patagonia norte | Nevadas de 15 a 30 cm en cordillera; 20 a 40 mm en sur de Mendoza y oeste de La Pampa | SMN vía Infobae |

**Discrepancias a tener presentes**: las cifras de Concordia difieren entre medios y fechas (6 familias el 11/10 vs. unos 400 personas después). Es un buen ejemplo de por qué el mapa debe guardar fecha y fuente de cada dato y no mezclar cifras de momentos distintos.

## Qué implica para la herramienta

- El horizonte es largo (hasta abril de 2027): vale la pena automatizar.
- El Litoral concentra el riesgo y tiene la mejor cobertura de estaciones (INA, Prefectura, CARU/Salto Grande).
- Las cotas oficiales de alerta y evacuación (ej. 7,00 m en Corrientes) son el lenguaje de decisión que usan las autoridades. La herramienta debe mostrarlas.
