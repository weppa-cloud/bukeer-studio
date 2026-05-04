# Google Ads Operations

Operación continua de campañas Google Ads para tenants de Bukeer. Estructura escalable para gestionar diseños, iteraciones, playbooks y datos compartidos sin polucionar `docs/`.

## Estructura

```
ops/google-ads/
├── README.md                    ← entry point
├── templates/                   ← CSVs vacíos con headers oficiales — copiar para iteración nueva
├── playbooks/                   ← procedimientos operacionales (pre/post launch, monitoring, emergency)
├── colombiatours/               ← tenant
│   ├── README.md                ← estado actual de la cuenta + iteraciones
│   ├── shared/                  ← negatives master, queries Customer Match, IDs geo, landings inventory
│   ├── 2026-05-launch/          ← iteración fechada (status: draft|approved|live|archived)
│   └── (futuras iteraciones)
└── archive/                     ← iteraciones cerradas (read-only, evidencia histórica)
```

## Convenciones

### Iteraciones por tenant

Cada cambio mayor (launch inicial, escalamiento mensual, temporada estacional, pivot) se versiona en folder fechado:

```
ops/google-ads/<tenant>/<YYYY-MM>-<slug-descriptivo>/
```

### Status

`_STATUS.md` en cada iteración:
- `draft` — diseño en construcción
- `approved` — humano aprobó, listo import
- `live` — campañas corriendo
- `archived` — cerrado/reemplazado → mover a `archive/`

### Crear iteración nueva

```bash
ITER="2026-XX-<descripcion>"
TENANT="colombiatours"
mkdir -p ops/google-ads/$TENANT/$ITER
cp ops/google-ads/templates/*.csv ops/google-ads/$TENANT/$ITER/
echo "draft" > ops/google-ads/$TENANT/$ITER/_STATUS.md
```

## Tenants

| Tenant | Customer ID | MCC | Status |
|---|---|---|---|
| **ColombiaTours** | `1261189646` | `2511163613` jasismo | 🟡 `2026-05-launch/` draft |
| Weppa Cloud | `5709882521` | `2511163613` | ⚪ Inactivo |

## Relación con código F1/F2/F3 (EPIC #419)

Las ramas en draft de los PRs #426/#428/#427 implementan el **funnel events SOT + Google Ads dispatcher**. Esto cambia el approach operacional:

- ✅ **Antes (manual)**: cada lunes exportar CSV de Supabase → Google Ads UI manual upload
- ✅ **Después (automático)**: cuando F1+F2 mergen a `dev`, el dispatcher Edge Function envía cada `funnel_events` → Google Ads automáticamente con latencia <5min
- ⚠️ Pero F2 tiene la API call **STUB** (TODO[F2-followup]) hasta que se valide el dev token de Google Ads

Por eso este bundle **no tiene** Playbook 04 (offline import manual) — F2 lo automatiza. Si la espera por F2 se prolonga, recrear Playbook 04 desde git history.

## Convenciones de commits

```
ops(google-ads): launch ColombiaTours mes 1
ops(google-ads): escalar MX a $700/mes — iteración 2026-06
ops(google-ads): archivar iteración 2026-05 tras pivot
docs(google-ads): playbook X actualizado
```
