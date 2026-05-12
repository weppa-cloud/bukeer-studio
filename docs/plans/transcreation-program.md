# Transcreation Program — Plan Maestro

**Epic:** #511
**Repo:** `weppa-cloud/bukeer-studio`
**Inicio:** 2026-05-12
**Target:** Full-site transcreación DE/FR/PT/EN para ColombiaTours

---

## Fase 0 — Fundamentos

### 0.1 DataForSEO Keyword Research (3-4 días)

Por cada locale (ES, DE, FR, PT-BR, EN-US), ejecutar DataForSEO para los clusters clave:

```yaml
clusters:
  - colombia-travel: paquetes colombia, viaje colombia, tours colombia
  - cartagena: viaje cartagena, cartagena hotel, que hacer en cartagena
  - medellin: medellin turismo, comuna 13, guatape
  - eje-cafetero: salento, valle del cocora, cafe colombia
  - santa-marta: tayrona, ciudad perdida, playas colombia
  - san-andres: san andres colombia, islas colombia
  - actividades: city tour, trekking colombia, buceo colombia
  - blogs-generic: cuanto cuesta viajar a, requisitos visa, mejor epoca
```

**Output esperado:** Para cada cluster x locale → volume, cpc, difficulty, serp type, top 10 urls.

**Propósito:** Determinar qué contenido tiene demanda real en cada mercado y priorizar.

### 0.2 Brand Voice + Glossary (2-3 días)

- Documento de voz por locale (basado en análisis previo)
- Glossary oficial: términos ColombiaTours + traducciones
- Tone samples por locale
- Referencias de blogs reales en cada mercado

### 0.3 Reescritura Top 50 Blogs ES (2-3 semanas)

Los 50 blogs con más tráfico GSC se reescriben con:
- Keyword basada en DataForSEO real
- Tono ColombiaTours (auténtico, local, cálido)
- Estructura storytelling
- CTAs reales de viaje
- SEO metadata optimizada

**Criterio de éxito:** Cada blog reescrito tiene keyword evidence + voz consistente + meta tags optimizados.

---

## Fase 1 — Skills por Locale

4 skills autocontenidos: DE, FR, PT-BR, EN-US

Cada skill contiene:
- Tono y voz (pronombres, estilo de oración, nivel de emoción)
- Keywords core por cluster
- Glossary específico del locale
- Referencias de blogs nativos
- Sample de párrafo de ejemplo

---

## Fase 2 — Transcreación (después de F0)

### Batch 1 — Top 20 blogs + landing pages (2-3 semanas)

Los 20 blogs con mejor keyword evidence + las páginas de destino principales.

Proceso por pieza:
1. DataForSEO keyword research en locale target
2. Mapeo keyword ES → keyword target
3. Transcreación con tono del locale
4. Glossary enforcement
5. Auto-review (brand terms, SEO compliance)
6. Aplicar a producción
7. Verificar (14 checks)
8. Sitemap + hreflang exposure

### Batch 2 — 30 blogs restantes (2 semanas)

Mismo proceso, batches de 10 por corrida.

### Batch 3 — Activities TOP 100 (1-2 semanas)

Activities con más tráfico GSC. Solo metadata SEO + descripción corta.

### Batch 4 — Resto (activities + blogs long tail)

Automatizado con rate limits.

---

## KPIs de Éxito

| Métrica | Target | Cuándo |
|---------|--------|--------|
| Blogs ES reescritos | 50 | Fin F0 |
| Páginas publicadas por locale | 20+ | Fin Batch 1 |
| Verificación post-publish | 100% pass | Cada batch |
| GSC impressions locales | Creciente | 30 días post |
| CTR por locale | >2% | 30 días post |

---

## Riesgos

- DataForSEO billing: cada crawl cuesta ~$3.75-0.12. Presupuestar ~$50-100 por ronda de research
- Rate limits de transcreación: 10/día/locale según infra existente
- Sin human review: la calidad depende del glossary + tone brief
- GitHub Actions billing bloqueado: no se puede deployar a Cloudflare → cambios solo visibles tras deploy manual