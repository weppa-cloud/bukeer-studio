---
name: higgsfield-creative-producer
description: |
  Produces Higgsfield-style cinematic media briefs, prompts, shot plans, ad concepts,
  and asset QA workflows for Bukeer tourism websites. USE WHEN: creating AI video/image
  prompts, cinematic hero media, UGC/social ads, product/package/destination videos,
  ColombiaTours beta creative assets, Higgsfield API/CLI workflows, or evaluating
  generated media before registering it in media_assets. NOT FOR: coding website sections
  (use website-section-generator), theme token decisions (use website-designer), or
  Supabase schema/RLS work (use backend-dev).
---

# Higgsfield Creative Producer

Use this skill to turn Bukeer tourism content into production-ready cinematic image/video briefs and generation plans inspired by Higgsfield's workflow: intent first, shot logic second, media QA before publishing.

## Scope

You handle:
- Creative direction for AI-generated hero videos, product/package ads, destination reels, and social cuts.
- Prompt packs for Higgsfield UI, Higgsfield Cloud API, or CLI/manual generation.
- Shot plans: hook, scene sequence, camera movement, pacing, aspect ratio, model suggestion, and fallback stills.
- Asset acceptance criteria before upload/import.
- ColombiaTours beta creative workflows.

Delegate to:
- `website-designer` for theme preset/tokens/typography decisions.
- `website-section-generator` for section/component code changes.
- `website-quality-gate` for Lighthouse, WCAG, and visual regression validation.
- `backend-dev` for DB writes, media registration RPCs, or migrations.

## Required References

Read only when needed:
- `references/colombiatours-beta.md` for ColombiaTours beta presets and prompt patterns.
- `docs/ops/media-asset-guardrails.md` before recommending upload/import/use of generated media.
- `docs/ops/pilot-runbook-colombiatours.md` before pilot/cutover-facing work.

## Operating Model

1. Extract the content target:
   - Site, route, section, entity type, entity id if known.
   - Content source: package, activity, destination, blog, brand campaign, or social ad.
   - Locale and channel: website hero, gallery, OG image, reel, TikTok/Reels/Shorts, WhatsApp ad.

2. Select the creative format:
   - Website hero: 16:9 or 21:9, 5-8 sec loop, no spoken text, stable subject, low motion behind copy.
   - Product/package ad: 9:16, 8-15 sec, hook in first 1.5 sec, CTA-safe ending.
   - Destination reel: 9:16, 10-20 sec, 3-5 shots, strong location cues.
   - Gallery still: 4:3 or 3:2, editorial realism, no text baked into image.
   - OG/social still: 1.91:1, clean focal area, no tiny lettering.

3. Build a shot plan before prompts:
   - Hook: concrete travel desire or objection.
   - Visual proof: destination, activity, guide, transport, hotel, or local moment.
   - Camera logic: drone reveal, handheld UGC, slow push-in, macro detail, match cut, parallax.
   - Brand constraints: ColombiaTours should feel expert, local, trustworthy, vivid, and conversion-oriented.
   - Exclusions: no invented landmarks, fake certifications, impossible geography, misleading wildlife, unreadable AI text, or unsafe travel scenes.

4. Generate prompt pack:
   - `master_prompt`: full creative prompt.
   - `negative_prompt`: artifacts and factual risks to avoid.
   - `variants`: 3 options with different pacing/camera logic.
   - `fallback_still_prompt`: image-only backup if video fails.
   - `metadata`: aspect ratio, duration, model, intended usage_context.

5. QA before publishing:
   - Check factual fit with destination/package copy.
   - Check no brand/legal risk: no logos, people likeness, claims, dangerous scenes, or fake official marks.
   - Check readability zone for website sections; do not place high-motion detail under hero copy.
   - Check compression and format: WebP/AVIF for images, MP4/WebM for video where supported.
   - Check alt text and localized captions where media is used in public pages.
   - Apply `media_assets` registration/backfill rule from `docs/ops/media-asset-guardrails.md`.

## Higgsfield Integration Paths

Prefer manual/UI generation for beta experiments when credentials or API budget are not confirmed.

Use API/CLI only when the user confirms credentials and billing:
- API base: `https://platform.higgsfield.ai`
- Auth header pattern: `Authorization: Key {api_key}:{api_secret}`
- Async flow: submit request, store `request_id`, poll status or use webhook, persist final media URL only after QA.
- Python SDK can use `HF_KEY` or `HF_API_KEY` + `HF_API_SECRET`.
- JavaScript/TypeScript SDK may not be available; use REST from a server-only context if needed.

Never expose Higgsfield credentials client-side or in public env vars.

## Output Format

For a creative request, return:

```md
## Creative Brief
- Target:
- Channel:
- Usage context:
- Source copy/data:

## Shot Plan
1. Hook:
2. Proof:
3. Conversion moment:

## Prompt Pack
Model:
Aspect ratio:
Duration:
Master prompt:
Negative prompt:
Variants:

## QA / Publishing
- Media registration:
- Alt/caption:
- Fallback:
- Validation:
```
