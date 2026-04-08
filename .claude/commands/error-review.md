---
description: "Review errors from Edge Functions and ErrorService with time-based analysis"
argument-hint: "<time-period: 24h | 7d | 30d | 90d>"
allowed-tools: Bash(*), mcp__supabase__execute_sql, mcp__supabase__get_logs, Read(*), Grep(*)
---

# Error Review - Análisis de Errores del Sistema

Analiza errores registrados en `error_logs` (Edge Functions + ErrorService de Flutter) para el periodo de tiempo especificado.

## Instrucciones

### 0. Parsear periodo de tiempo

Interpretar `$ARGUMENTS` como periodo de tiempo:

| Argumento | Intervalo SQL |
|-----------|--------------|
| `24h` (default si vacío) | `NOW() - INTERVAL '24 hours'` |
| `12h` | `NOW() - INTERVAL '12 hours'` |
| `7d` | `NOW() - INTERVAL '7 days'` |
| `30d` | `NOW() - INTERVAL '30 days'` |
| `90d` | `NOW() - INTERVAL '90 days'` |

Si `$ARGUMENTS` está vacío o no reconocido, usar **24h** por defecto y notificar al usuario.

---

### 1. Resumen general de errores

```sql
mcp__supabase__execute_sql:

SELECT
  COUNT(*) AS total_errors,
  COUNT(DISTINCT error_fingerprint) AS unique_errors,
  COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
  COUNT(*) FILTER (WHERE severity = 'high' OR severity = 'error') AS high,
  COUNT(*) FILTER (WHERE severity = 'medium' OR severity = 'warning') AS medium,
  COUNT(*) FILTER (WHERE severity = 'low' OR severity = 'info') AS low,
  COUNT(*) FILTER (WHERE status = 'new') AS unresolved,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
  COUNT(DISTINCT user_id) AS affected_users,
  COUNT(DISTINCT account_id) AS affected_accounts
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '<PERIODO>';
```

---

### 2. Top errores por frecuencia (agrupados por fingerprint)

```sql
mcp__supabase__execute_sql:

SELECT
  error_fingerprint,
  error_message,
  error_type,
  severity,
  component,
  action,
  COUNT(*) AS occurrences,
  COUNT(DISTINCT user_id) AS affected_users,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen,
  status
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '<PERIODO>'
  AND error_fingerprint IS NOT NULL
GROUP BY error_fingerprint, error_message, error_type, severity, component, action, status
ORDER BY occurrences DESC
LIMIT 15;
```

---

### 3. Errores de Edge Functions y API (backend)

```sql
mcp__supabase__execute_sql:

SELECT
  COALESCE(context->>'functionName', component, 'unknown') AS edge_function,
  LEFT(error_message, 150) AS error_message,
  severity,
  COUNT(*) AS occurrences,
  COUNT(DISTINCT user_id) AS affected_users,
  MAX(created_at) AS last_occurrence
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '<PERIODO>'
  AND (
    context->>'functionName' IS NOT NULL
    OR component LIKE '%edge%'
    OR component LIKE '%function%'
    OR error_type IN ('api', 'network')
  )
GROUP BY edge_function, error_message, severity
ORDER BY occurrences DESC
LIMIT 20;
```

---

### 4. Errores del ErrorService Flutter (frontend)

```sql
mcp__supabase__execute_sql:

SELECT
  error_type,
  component,
  action,
  route,
  error_message,
  severity,
  COUNT(*) AS occurrences,
  COUNT(DISTINCT user_id) AS affected_users,
  MAX(created_at) AS last_occurrence
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '<PERIODO>'
  AND (
    context->>'functionName' IS NULL
    AND (component NOT LIKE '%edge%' OR component IS NULL)
  )
  AND error_type IS NOT NULL
GROUP BY error_type, component, action, route, error_message, severity
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'error' THEN 3
    WHEN 'medium' THEN 4
    WHEN 'warning' THEN 5
    ELSE 6
  END,
  occurrences DESC
LIMIT 20;
```

---

### 5. Tendencia temporal (distribución de errores en el periodo)

```sql
mcp__supabase__execute_sql:

-- Para periodos <= 24h: agrupar por hora
-- Para periodos <= 7d: agrupar por día
-- Para periodos > 7d: agrupar por semana

SELECT
  date_trunc('<GRANULARITY>', created_at) AS time_bucket,
  COUNT(*) AS total_errors,
  COUNT(*) FILTER (WHERE severity IN ('critical', 'high', 'error')) AS severe_errors,
  COUNT(DISTINCT error_fingerprint) AS unique_errors
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '<PERIODO>'
GROUP BY time_bucket
ORDER BY time_bucket DESC;
```

Granularidad:
- `24h`, `12h` → `'hour'`
- `7d` → `'day'`
- `30d`, `90d` → `'week'`

---

### 6. Errores por código HTTP (API failures)

```sql
mcp__supabase__execute_sql:

SELECT
  context->>'statusCode' AS status_code,
  CASE
    WHEN (context->>'statusCode')::int BETWEEN 400 AND 499 THEN 'Client Error'
    WHEN (context->>'statusCode')::int BETWEEN 500 AND 599 THEN 'Server Error'
    ELSE 'Other'
  END AS error_category,
  COUNT(*) AS occurrences,
  array_agg(DISTINCT COALESCE(context->>'functionName', component)) AS sources
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '<PERIODO>'
  AND context->>'statusCode' IS NOT NULL
GROUP BY status_code
ORDER BY occurrences DESC
LIMIT 10;
```

---

### 7. Errores recientes sin resolver (más críticos primero)

```sql
mcp__supabase__execute_sql:

SELECT
  id,
  created_at,
  severity,
  error_type,
  LEFT(error_message, 200) AS error_message,
  component,
  action,
  route,
  COALESCE(context->>'functionName', '') AS edge_function,
  user_email
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '<PERIODO>'
  AND status IN ('new', 'investigating')
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'error' THEN 3
    WHEN 'medium' THEN 4
    ELSE 5
  END,
  created_at DESC
LIMIT 10;
```

---

### 8. Complementar con logs de Supabase (últimos errores en runtime)

```
mcp__supabase__get_logs: Revisar logs recientes del proyecto para detectar errores de Edge Functions que pudieron no haberse persistido en error_logs.
```

Buscar en los logs patrones como:
- `ERROR` level entries
- `500` status codes
- Function invocation failures
- Timeout errors

---

### 9. Generar reporte

Presentar al usuario un reporte estructurado con el siguiente formato:

```markdown
# Error Review Report - Últimas <PERIODO>

## Resumen Ejecutivo
- **Total errores**: X (Y únicos)
- **Críticos/Altos**: X | **Medios**: X | **Bajos**: X
- **Sin resolver**: X | **Resueltos**: X
- **Usuarios afectados**: X | **Cuentas afectadas**: X

## Errores Críticos (Acción Inmediata)
[Lista de errores críticos/altos con contexto y frecuencia]

## Edge Functions (Backend)
| Función | Error | Código HTTP | Ocurrencias | Última vez |
|---------|-------|-------------|-------------|------------|
[Tabla con errores de Edge Functions]

**Funciones más problemáticas**: [ranking]

## ErrorService Flutter (Frontend)
| Tipo | Componente | Ruta | Ocurrencias | Severidad |
|------|-----------|------|-------------|-----------|
[Tabla con errores de frontend]

**Componentes más afectados**: [ranking]

## Tendencia
[Descripción de si los errores van en aumento, disminuyendo, o estables]
[Indicar picos o patrones temporales]

## Errores HTTP
[Distribución por código de estado]
- 4xx (cliente): X ocurrencias
- 5xx (servidor): X ocurrencias

## Recomendaciones
1. [Acción prioritaria 1 - basada en errores críticos]
2. [Acción prioritaria 2 - basada en frecuencia]
3. [Acción prioritaria 3 - basada en tendencia]

## Errores Sin Resolver (Top 10)
[Lista detallada con ID para seguimiento]
```

---

## Notas

- Los errores provienen de dos fuentes: **Edge Functions** (backend, via `error-logger.ts`) y **ErrorService** (Flutter frontend, via `error_service.dart`)
- Ambos persisten en la misma tabla `error_logs` de Supabase
- El campo `context->>'functionName'` identifica errores de Edge Functions
- El campo `error_fingerprint` agrupa errores duplicados
- Severidades posibles: `critical`, `high`, `error`, `medium`, `warning`, `low`, `info`
- Estados: `new`, `investigating`, `resolved`, `wont_fix`, `duplicate`
- Si no hay datos para el periodo, informar al usuario y sugerir ampliar el rango
