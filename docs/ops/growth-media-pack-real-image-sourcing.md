# Growth MediaPack real-image sourcing lane

Status: v1 contract implemented in `@bukeer/website-contract`
Owner lane: `growth-media-agent`
Applies to: ColombiaTours SMART SEO / SEO360 pages, blogs, products, and target-market transcreation

## Why this exists

Content workers must not invent destination proof images or count generic/unsafe images toward traffic readiness. If SEO360 benchmarking says a San Andrés page needs 25 images, the content worker requests a governed MediaPack from the media lane. The MediaPack can contain 25 target slots, but each slot is explicitly `filled`, `missing`, or `needs_human_asset`.

This keeps the Growth OS measurement language honest:

- `technical_published`: a URL can exist and render.
- `traffic_ready`: the URL has enough approved evidence, including approved MediaPack coverage, to receive SEO traffic.
- `hold_scale`: the URL must not be scaled because evidence is incomplete, unsafe, or legally blocked.

## Request contract

A content/transcreation worker sends the media lane the SEO360 ContextPacket plus media requirements:

- keyword and target market;
- canonical URL / destination entities;
- section plan;
- target image count from the benchmark;
- required visual intents per section;
- any known first-party asset refs or operator/customer-approved asset leads.

The request owner remains the content worker, but image sourcing and publishability decisions are owned by `growth-media-agent`.

## Source hierarchy

Use sources in this order:

1. First-party ColombiaTours / Supabase `media_assets` library and existing CMS assets.
2. Internal operator photos, WhatsApp assets, or customer-approved assets when permission is explicit.
3. Licensed external sources with commercial-use proof, such as Unsplash/Pexels or vendor libraries, only when first-party coverage is insufficient.
4. Google Places, Google Images, SerpAPI, Tripadvisor/reviews, and similar sources only as discovery/provenance candidates or non-published visual briefs. They are not publishable unless permission/license is explicit.
5. AI generation is prohibited for deceptive destination/travel proof photos. AI is allowed only for non-deceptive editing, crop, color, format, or clean illustrative imagery that passes disclosure and destination-truth gates.

Important legal boundary: editing or AI-transforming a copyrighted Google/Tripadvisor/Places image does not remove the licensing requirement. Reference-only pixels must not become the production base.

## MediaPack slot fields

Each slot records:

- `slot_index`
- `section_key`
- `visual_intent`
- `status`: `filled`, `missing`, `needs_human_asset`
- `image_url`
- `source_url` / `source_ref`
- `license_status`
- `provenance_type`
- `destination_match`
- `section_match`
- `alt`
- `caption`
- `dimensions`
- `hash`
- `duplicate_check`
- `visual_quality_score`
- `reference_only_visual_brief`
- `publishable_base_required`
- `generated_or_edited_final`
- `reality_preservation_pass`

The Zod schema lives at `packages/website-contract/src/schemas/growth-media-pack.ts` and is exported from `@bukeer/website-contract` as `GrowthMediaPackSchema` plus `evaluateGrowthMediaPackReadiness()`.

## Readiness rules

The evaluator returns `traffic_ready` only when:

- filled approved slots meet `target_image_count`, or a human-approved exception explicitly lowers the required count;
- each filled slot has an approved/permissioned/commercial license or human legal exception;
- discovery-only provenance is not counted as publishable;
- destination and section match both pass;
- duplicate check is `unique`;
- visual quality score is at least 70;
- AI-assisted final images use a publishable base and pass reality preservation.

The evaluator returns `hold_scale` when slots are missing, need human assets, rely on reference-only discovery sources, or require a publishable base.

## Google/review reference-only flow (Option B)

Allowed:

1. Temporarily download or inspect a Google Places / Reviews / Tripadvisor image as a non-published factual reference.
2. Extract factual observations into `reference_only_visual_brief`, such as shoreline layout, water color, visible skyline, or landmark relationships.
3. Require a separate publishable base: first-party, licensed, permissioned, or clean AI illustrative material.
4. Generate/edit the final asset from the publishable base, not from reference-only pixels.
5. Validate destination truth against the visual brief and set `reality_preservation_pass` only when no landmarks/features were hallucinated or moved.
6. Label the result as AI-assisted when applicable via `generated_or_edited_final.disclosure_label`.

Rejected:

- direct publishing of Google/Tripadvisor/Places pixels without license proof;
- AI derivatives where the base image has only `reference_only` license status;
- edits that add impossible landmarks, wrong beaches, wrong city skylines, fake wildlife, fake rooms, or other reality-changing details;
- inflated image counts from unlicensed, generic, duplicate, or wrong-destination images.

## Publisher rule

Publishers only publish images from an approved MediaPack. If a content item has raw image URLs outside the MediaPack, those URLs do not count toward `traffic_ready` and should be treated as legacy/unverified until registered or backfilled through `media_assets` and a MediaPack.

## QA fixtures covered

`__tests__/schema/growth-media-pack.test.ts` covers:

- PASS fixture with 25 valid slots;
- HOLD fixture with 4 valid slots and 21 missing slots;
- HOLD/reject fixture with Google candidates but no license proof;
- reference-image-to-AI-brief flow with `publishable_base_required`;
- rejection of reality-changing or reference-pixel-based AI-assisted derivatives.
