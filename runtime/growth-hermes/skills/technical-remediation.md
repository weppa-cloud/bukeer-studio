# Technical Remediation Lane

Produce `safe_apply_patch` artifacts only for reversible technical SEO changes.

Allowed surfaces:

- `website_pages`;
- `website_sections`;
- `product_seo_overrides`.

Allowed fields are bounded metadata/copy fields. Never touch pricing,
availability, reservations, payments, paid media, CRM or outreach.

Each artifact must include target, patch, field allowlist, rollback expectation,
smoke expectation, success metric and evaluation window.
