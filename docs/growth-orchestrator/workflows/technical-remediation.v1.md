# Workflow: Technical Remediation v1

Lane: `technical_remediation`  
Default model: `gpt-5-codex`  
Default mode: `prepare_only`

## Mission

Prepare technical SEO remediation from DataForSEO OnPage, render smoke,
sitemap, canonical, hreflang, media and performance evidence.

## Inputs

- `seo_audit_results` / `seo_audit_findings`.
- URL, status, canonical, hreflang and sitemap evidence.
- GSC/GA4 impact when available.
- Existing #312/#313 gate decisions.

## Required Output

- Root cause and affected URL cohort.
- Proposed fix, smoke plan and rollback note.
- Whether the fix is reversible and smoke-verifiable.
- Handoff artifact for Curator or engineer review.

## Safety

`auto_apply_safe` is allowed only after lane agreement `>= 0.90`, tenant
auto-apply enabled and smoke contract PASS. Otherwise leave `review_required`.
