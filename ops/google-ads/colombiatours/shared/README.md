# ColombiaTours — datos compartidos entre iteraciones

| Archivo | Propósito | Mantenimiento |
|---|---|---|
| `customer_match_export.sql` | Query Supabase para extraer contactos email/phone para Customer Match | Re-correr cada iteración |
| `geo_criterion_ids.md` | IDs Google Ads de geos (países + ciudades clave) | Estable |
| `landing_pages_inventory.md` | Páginas custom + package_kits del sitio que pueden ser landings | Refrescar al agregar paquetes |
| `negative_keywords_master.csv` | Lista canónica account-level shared | Update mensual con search_term_view |

## Workflow recomendado por iteración

1. Refrescar `customer_match_export.sql` (correr query, exportar CSV con timestamp)
2. Verificar `landing_pages_inventory.md` esté actualizado
3. Copiar `negative_keywords_master.csv` → `<iter>/04_negative_keywords.csv` y agregar específicos si aplica
4. Continuar diseño en folder de la iteración
