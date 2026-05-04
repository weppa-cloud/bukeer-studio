# Playbooks operacionales — Google Ads

Procedimientos paso a paso aplicables a CUALQUIER tenant/iteración.

| # | Playbook | Cuándo aplicar |
|---|---|---|
| `01-pre-launch-checklist.md` | Pre-launch checklist (Web UI prep) | Antes de cada import a Editor |
| `02-import-via-editor.md` | Import via Editor desktop | Durante el import (orden, paste, validación, push) |
| `03-post-launch-monitoring.md` | Monitoreo post-launch | Primeros 30 días |
| `05-emergency-pause.md` | Emergency pause | Si algo falla críticamente en producción |

> **Nota**: el Playbook `04-offline-conversion-import.md` (offline import manual semanal) **fue removido** de este bundle porque la PR #428 (F2 Google Ads dispatcher, EPIC #419) lo automatiza. Si la espera por F2 se prolonga >30 días, recrear desde git history (rama `feat/f2-google-ads-dispatcher`).
