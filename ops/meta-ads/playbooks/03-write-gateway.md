# Playbook 03 - Write Gateway

**Cuando**: solo despues de un plan aprobado y un token con permisos de escritura (`ads_management`).

## Estado por defecto

Las escrituras estan bloqueadas:

```bash
META_ADS_CLI_WRITES_ENABLED=false
META_ADS_CLI_ALLOW_ACTIVE=false
META_ADS_CLI_DESTRUCTIVE_WRITES_ENABLED=false
```

## Gateway MCP

La unica tool de escritura es:

```text
meta_ads_cli_write_operation
```

Entrada ejemplo para dry-run:

```json
{
  "args": [
    "ads",
    "campaign",
    "create",
    "--name",
    "Draft test",
    "--objective",
    "outcome_leads"
  ],
  "reason": "Prepare paused draft for human review.",
  "confirm": false
}
```

## Reglas

- `META_ADS_CLI_WRITES_ENABLED=true` y `confirm=true` son obligatorios para ejecutar.
- Creates sin `--status` agregan `--status paused`.
- `--status active` requiere `META_ADS_CLI_ALLOW_ACTIVE=true`.
- `delete`, `disconnect` o `--force` requieren `META_ADS_CLI_DESTRUCTIVE_WRITES_ENABLED=true`.

## Secuencia segura

1. Ejecutar read-only analysis.
2. Redactar payload propuesto.
3. Ejecutar `meta_ads_cli_write_operation` con `confirm=false`.
4. Revisar dry-run y razon.
5. Habilitar flags solo durante la ventana aprobada.
6. Ejecutar con `confirm=true`.
7. Volver flags a `false`.
8. Registrar resultado y rollback plan.

No activar campanas desde agente salvo aprobacion humana explicita.
