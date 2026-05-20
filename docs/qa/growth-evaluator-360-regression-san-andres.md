# Growth Evaluator 360 Regression — San Andrés

This checklist is tracked so the evaluator rubric regression is visible in review.

Required blog/article evaluator fields:

- target keyword, locale and market
- SERP/DataForSEO top-5 or top-10 competitor evidence when available
- our-vs-competitor metrics: word count, image count, inline image count, featured/OG image, alt coverage, H2 count, paragraph count, internal link count, table/FAQ/TOC
- semantic density and entity coverage when source evidence exists
- `visual_quality_status: PASS | WARN | FAIL`
- `competitive_benchmark_status: PASS | WARN | FAIL`
- separate `technical_live`, `canary_live`, `visual_ready`, `seo_360_ready`, `traffic_ready`

San Andrés negative regression:

- `target_keyword = San Andrés Colombia`
- `locale = es-CO`, `market = CO`
- article has headings and paragraphs but `inline_image_count = 0`
- no featured/OG image
- no DataForSEO/SERP top-5/top-10 competitor benchmark

Expected evaluator result:

- `visual_quality_status = FAIL`
- `competitive_benchmark_status = WARN`
- `visual_ready = FAIL`
- `traffic_ready = HOLD`
- missing evidence includes `fail_visual_quality` and `hold_competitive_evidence`
- decision must not be promote/Q100/publish-quality/traffic-ready

Verification:

```bash
node scripts/growth/check-evaluator-360-regression.mjs
```
