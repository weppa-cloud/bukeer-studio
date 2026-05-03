# Package 15 Días — Parity Report (editorial-v1)

**Estado:** operativo (audit endpoint implementado)  
**Fecha base:** 2026-04-22 (local `:3003`)  
**Paquete objetivo:** `/site/colombiatours/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as`

## Cómo generar el reporte

Endpoint interno:

`GET /api/internal/package-parity?subdomain=colombiatours&slug=paquete-vacaciones-familiares-por-colombia-15-d-as&token=<REVALIDATE_SECRET>`

Ejemplo local:

```bash
curl "http://localhost:3000/api/internal/package-parity?subdomain=colombiatours&slug=paquete-vacaciones-familiares-por-colombia-15-d-as&token=$REVALIDATE_SECRET"
```

## Tabla de paridad (base vs objetivo)

| Sección | Base (actual) | Objetivo (contrato) | Delta | Hallazgo principal |
|---|---:|---:|---:|---|
| Programa día a día (35) | 35.00 | 35.00 | 0.00 | Cobertura completa de ítems enriquecidos |
| Galería (25) | 15.17 | 25.00 | 9.83 | Cobertura parcial de media esperada |
| Hoteles seleccionados (15) | 15.00 | 15.00 | 0.00 | Hoteles vinculados por `id_product` renderizados |
| Vuelos / logística (10) | 10.00 | 10.00 | 0.00 | Paridad completa |
| SEO estructurado (10) | 10.00 | 10.00 | 0.00 | Product/Breadcrumb/FAQ/Organization presentes |
| UX crítica (5) | 5.00 | 5.00 | 0.00 | Guardas de contraste y CTA/video activas |
| **TOTAL** | **90.17** | **100.00** | **9.83** | Meta de publicación: `>=95` |

## Resultado baseline (JSON resumido)

- `baseline_score`: `90`
- `target_score`: `100`
- `delta`: `10`
- `pass_threshold_95`: `false`
- Gaps principales:
  - `Galería: cobertura incompleta o mezcla de assets promocionales.`

## Evidencia esperada en respuesta JSON

- `expected` (fuente DB por ítems/productos vinculados)
- `rendered` (payload efectivo del detalle editorial)
- `diff` (brechas por sección)
- `score.baseline_score`, `score.target_score`, `score.delta`, `score.sections[]`
