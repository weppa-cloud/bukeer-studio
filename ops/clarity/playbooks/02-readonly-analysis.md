# Clarity Read-only Analysis

**Objetivo**: usar Clarity como evidencia UX para mejorar landings sin depender de conjeturas ni afectar performance.

## Consultas recomendadas

Usar ventanas cortas y dimensiones accionables:

- `numOfDays=1`, `dimension1=URL`
- `numOfDays=1`, `dimension1=URL`, `dimension2=Device`
- `numOfDays=3`, `dimension1=URL`, `dimension2=Source`, `dimension3=Campaign`
- `numOfDays=1`, `dimension1=URL`, `dimension2=Browser`

Revisar metricas de friccion:

- rage clicks
- dead clicks
- excessive scroll
- quick backs
- scroll depth
- engagement time
- JavaScript errors
- error clicks

## Prompt base

```text
Usa el MCP clarity en modo solo lectura para ColombiaTours. Analiza los ultimos 1-3 dias con dimensiones URL, Device y Source/Campaign. Prioriza landings con rage clicks, dead clicks, scroll bajo, engagement bajo o errores JS. Entrega hallazgos con evidencia, severidad, hipotesis, recomendacion y fuente de validacion secundaria. No ejecutes escrituras.
```

## Formato de salida esperado

```text
Resumen:
- Ventana analizada:
- Dimensiones:
- Limites/cuota usados:

Hallazgos:
1. URL:
   Evidencia Clarity:
   Riesgo:
   Hipotesis:
   Validacion secundaria:
   Recomendacion:

Acciones propuestas:
- P0/P1/P2:
- Fuente secundaria requerida:
- No hacer todavia:
```

## Reglas de decision

- No cambiar una landing solo por una metrica aislada.
- P0 requiere friccion repetida + impacto probable en lead/WhatsApp/conversion.
- Si Clarity muestra friccion pero GA4/funnel no confirma impacto, crear experimento o backlog, no aplicar directo.
- Si hay errores JS recurrentes, abrir bug de producto antes de CRO.
- Guardar snapshots resumidos en la carpeta de iteracion; no guardar raw recordings.
