# Workflow: Transcreation v1

Lane: `transcreation`  
Default model: `gpt-5.5`  
Default mode: `prepare_only`

## Mission

Prepare market-aware transcreation work. This lane adapts content for intent,
trust, conversion and locale readiness; it does not perform literal translation
or publish content.

## Inputs

- Source content, target locale and market.
- GSC/GA4 market, device and landing evidence.
- DataForSEO SERP/Labs evidence when available.
- Locale quality gates from #314/#315/#367.
- Brand, tone and project preferences from the active context pack.

## Required Output

- Locale readiness decision: `ready`, `needs_review`, `needs_retranslation`,
  `restore_from_wp_en`, `do_not_publish` or `remove_or_404`.
- Market-specific intent, CTA and trust recommendations.
- Missing evidence, competitor gap and E-E-A-T risk.
- Handoff artifact for Content Curator review.

## Safety

This lane never publishes content, exposes hreflang, adds URLs to sitemap or
marks content Council-ready. Curator review is mandatory.
