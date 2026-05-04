# Playbook 01 — Pre-launch checklist

**Cuándo**: ANTES de pegar cualquier CSV a Google Ads Editor.
**Owner**: humano operador con acceso a Web UI.

## Setup en Google Ads Web UI

### 1. Conversion actions (4 acciones limpias)

`Tools & Settings > Measurement > Conversions > +`

| # | Nombre | Type | Category | Primary | Value | Counting | Click window |
|---|---|---|---|:---:|---|---|---|
| 1 | `waflow_lead_submit` | Webpage | Submit Lead Form | ✅ | $10 USD (proxy) | One per click | 90 days |
| 2 | `whatsapp_cta_click` | Webpage | Contact | ❌ | $5 USD | One per click | 30 days |
| 3 | `phone_cta_click` | Webpage | Phone Call Lead | ❌ | $5 USD | One per click | 30 days |
| 4 | `crm_booking_confirmed` | API/Offline | Submit Lead Form | ✅ | Real (desde dispatcher F2) | One per click | 90 days |

> **F1+F2 deployed**: la conversion #4 recibe uploads automáticos vía dispatcher. Sin F2, queda en "No recent activity" hasta primer trigger manual (no recomendado).

### 2. Desactivar conversion actions duplicadas

5 conversion actions SUBMIT_LEAD_FORM coexisting → solo 1 primary, resto Secondary observation.

### 3. Pausar campañas legacy

- `Mexico Viajar a colombia dirigirlos al home` (id `20047406299`)
- `Mexico Viajar a colombia Prueba 44` (id `21009761945`)

### 4. Customer Match audience

```bash
# 1. Ejecutar shared/customer_match_export.sql en Supabase
# 2. Exportar resultado a CSV: customer_match_<YYYY-MM-DD>.csv
# 3. Web UI: Tools & Settings > Audience manager > Your data > New > Customer list
#    - Tipo: Email + Phone
#    - Subir CSV
#    - Aceptar Customer Match terms
#    - Nombre: ColombiaTours_Past_Customers_<YYYY-MM>
#    - Membership duration: 540 días
# 4. Esperar 24-48h a que Google haga match
```

### 5. Negative keyword list compartida

`Tools & Settings > Shared library > Negative keyword lists > +`

Crear lista vacía: `Negatives_<Tenant>_Shared` y asociar a las campañas (post import).

### 6. Verificar billing

`Tools & Settings > Billing > Settings`: pago activo, límite mensual ≥ budget × 1.2

## Checklist final pre-Editor

- [ ] 4 conversion actions creadas + `Verify` pasa para 1-3
- [ ] Duplicadas movidas a Secondary
- [ ] Campañas legacy pausadas
- [ ] Customer Match subida (status "Building" o "Ready")
- [ ] Negative kw list creada (vacía OK)
- [ ] Billing OK
- [ ] Auto-tagging ON
- [ ] Cuenta sincronizada en Editor desktop

## Troubleshooting

| Issue | Causa | Solución |
|---|---|---|
| Conversion `Verify` falla | Tag no instalado | Tag Assistant en `/destinos/cartagena` — deben aparecer 2 tags |
| Customer Match "Too few users" | Email/phone mal normalizado | Re-correr query con E.164 phone, lowercase email |
| Auto-tagging OFF | Cuenta heredada | Settings > Account settings > Auto-tagging → Yes |
