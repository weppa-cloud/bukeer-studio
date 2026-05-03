## Summary

<!-- What changed and why? -->

## Validation

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run tech-validator:code`
- [ ] Other:

## Media / Images Impact

- [ ] No toca imágenes/media
- [ ] Usa assets existentes registrados en `media_assets`
- [ ] Sube/importa/genera nuevas imágenes y registra en `media_assets`
- [ ] Mantiene campo legacy por compatibilidad
- [ ] Define `account_id`, `website_id` si aplica, `entity_type`, `entity_id`, `usage_context`
- [ ] Incluye validación de broken/external/missing-alt/non-WebP

If this PR touches image/media fields, uploads, imports, generated media, galleries,
hero images, OG images, avatars or page content images, reference `ADR-028` and
document the `media_assets` registration or backfill path.

## Rollout / Risk

<!-- Feature flag, migration/backfill, rollback, public-render impact. -->
