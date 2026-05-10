# Clarity Recordings Behavior Analysis

**Objetivo**: analizar grabaciones de Clarity para convertir comportamiento real en metricas accionables de CRO, sin guardar recordings crudos ni datos sensibles.

## Herramienta MCP principal

El MCP oficial de Clarity expone:

- `query-analytics-dashboard`: metricas agregadas y filtros naturales.
- `list-session-recordings`: lista grabaciones filtradas por URL, device, browser, OS, pais, ciudad y patrones de comportamiento.

## Flujo recomendado

1. Encontrar friccion agregada:
   - URL + Device.
   - URL + Source/Campaign.
   - errores JS, dead clicks, rage clicks, scroll bajo, quickbacks.
2. Filtrar grabaciones:
   - Solo URLs o devices con senal.
   - Maximo 5-10 sesiones para diagnostico inicial.
   - 10-20 sesiones solo si el patron parece P0.
3. Extraer metricas:
   - `sessions_reviewed`
   - `sessions_with_cta_seen`
   - `sessions_with_cta_clicked`
   - `sessions_with_dead_clicks`
   - `sessions_with_rage_clicks`
   - `sessions_with_scroll_stop_before_cta`
   - `sessions_with_js_error`
   - `sessions_with_form_abandonment`
   - `sessions_with_quickback`
4. Cruzar con negocio:
   - GA4: landing, source, engagement, conversion.
   - `funnel_events`: WhatsApp/lead/request.
   - GSC: si el problema viene de una query/landing organica especifica.

## Prompt operativo

```text
Usa el MCP clarity para ColombiaTours. Primero consulta metricas agregadas de los ultimos 1-3 dias por URL y Device. Identifica URLs con friccion. Luego usa list-session-recordings para traer una muestra pequena de grabaciones relacionadas con rage clicks, dead clicks, errores JS, scroll bajo o quickback. No guardes recordings crudos.

Devuelve:
1. Tabla de metricas: sessions_reviewed, cta_seen, cta_clicked, dead_clicks, rage_clicks, scroll_stop_before_cta, js_error, form_abandonment, quickback.
2. Patrones observados.
3. URLs y devices afectados.
4. Severidad P0/P1/P2.
5. Hipotesis.
6. Recomendacion.
7. Validacion secundaria necesaria en GA4/funnel_events.
```

## Plantilla de salida

```text
Ventana:
Segmento:
Grabaciones revisadas:

Metricas:
| metrica | valor | evidencia |
|---------|-------|-----------|

Patrones:
1. ...

Acciones:
- P0:
- P1:
- P2:

No hacer:
- ...
```

## Guardrails

- No pegar links de recordings en issues publicos si pueden exponer datos sensibles.
- No guardar screenshots ni videos crudos en el repo.
- Si hay datos personales visibles, detener el analisis y revisar masking en Clarity.
- No aplicar cambios de landing sin senal secundaria en GA4, `funnel_events` o una muestra clara de sesiones.
