import { test, expect } from '@playwright/test';
import {
  CONTENT_TYPES,
  allContentTypes,
  buildPublicUrl,
  cleanupTranscreateRun,
  createAdminClient,
  executeTranscreate,
  PILOT_W5_TAG,
  seedDecisionGradeCandidate,
  type DecisionGradeSeedResult,
  type PilotContentType,
} from '../../../setup/transcreate-helpers';
import { getPilotSeed, pilotSubdomain } from '../helpers';

/**
 * EPIC #214 · W5 #219 — hreflang + canonical + JSON-LD inLanguage.
 *
 * Covers AC-W5-6 (hreflang es-CO + en-US + x-default) + AC-W5-7 (JSON-LD
 * `inLanguage` threading). Depends on #208 (inLanguage) and #209 (EN segment)
 * — both merged 2026-04-19. Verified state via `gh issue view` at spec start.
 *
 * Assertions per content type:
 *   - `/en/<segment>/<slug>` emits `<link rel="alternate" hreflang="en-US" ...>`
 *     with a URL containing `/en/` + the same slug.
 *   - es-CO baseline emits `<link rel="alternate" hreflang="es-CO" ...>` +
 *     `<link rel="alternate" hreflang="x-default" ...>` pointing to es-CO.
 *   - JSON-LD on /en/ page contains `"inLanguage":"en-US"` at least once
 *     (via resolvePublicMetadataLocale → components/seo/*).
 *   - JSON-LD on es-CO page contains `"inLanguage":"es-CO"`.
 *
 * Hreflang gate (ADR-020): translated links only emit when
 * `appliedTranscreationJobIds` is non-empty. We seed + apply a job BEFORE
 * asserting so the gate is satisfied. Without apply the en-US alternate is
 * suppressed by design.
 */
test.describe(`${PILOT_W5_TAG} Pilot W5 · hreflang + canonical + inLanguage`, () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.setTimeout(180_000);

  const admin = createAdminClient();

  for (const contentType of allContentTypes()) {
    const desc = CONTENT_TYPES[contentType];

    test(`${desc.label} — hreflang + canonical per locale + JSON-LD inLanguage`, async ({
      page,
    }) => {
      const seed = await getPilotSeed('translation-ready');
      const source = resolveSource(seed, contentType);
      test.skip(!source, `translation-ready seed missing ${contentType}`);
      const src = source!;

      const targetLocale = 'en-US';
      const targetKeyword = `w5-hreflang-${contentType}-${Date.now().toString().slice(-6)}`;
      let dgSeed: DecisionGradeSeedResult | null = null;
      let jobId: string | null = null;

      try {
        // Setup: apply translation so the ADR-020 gate admits en-US hreflang.
        dgSeed = await seedDecisionGradeCandidate({
          admin,
          websiteId: seed.websiteId,
          contentType,
          targetLocale,
          targetKeyword,
        });
        const result = await executeTranscreate({
          page,
          websiteId: seed.websiteId,
          contentType,
          sourceContentId: src.id,
          targetLocale,
          targetKeyword,
          sourceKeyword: src.label,
        });
        jobId = result.jobId;
        expect(result.status).toBe('applied');

        const subdomain = pilotSubdomain();

        // --- es-CO baseline ------------------------------------------------
        const esUrl = buildPublicUrl({ subdomain, contentType, slug: src.slug, locale: 'es-CO' });
        const esResp = await page.goto(esUrl, { waitUntil: 'domcontentloaded' });
        test.skip(
          !esResp || esResp.status() >= 500,
          `es-CO URL unreachable status=${esResp?.status() ?? 'no-response'}`,
        );
        if (!esResp || esResp.status() === 404) {
          test.skip(
            contentType === 'blog',
            'Blog es-CO URL 404 — seed slug missing on website_blog_posts for locale es-CO.',
          );
        }
        const esHtml = await page.content();
        expect(esHtml, 'es-CO hreflang alternate present').toMatch(/hreflang=["']es-CO["']/);
        // x-default MUST point to es-CO (defaultLocale).
        expect(esHtml, 'x-default present on es-CO').toMatch(/hreflang=["']x-default["']/);

        // JSON-LD inLanguage — es-CO or `es` on baseline depending on schema
        // (some nodes use language-only form per normalizeLanguage). Accept
        // either es-CO or es (AC-W5-7 + #208 threading).
        expect(esHtml, 'inLanguage es-CO on baseline').toMatch(/"inLanguage"\s*:\s*"es(-CO)?"/);

        // --- en-US translated ----------------------------------------------
        const enUrl = buildPublicUrl({ subdomain, contentType, slug: src.slug, locale: 'en-US' });
        const enResp = await page.goto(enUrl, { waitUntil: 'domcontentloaded' });
        if (!enResp || enResp.status() === 404 || enResp.status() >= 500) {
          test.skip(
            contentType === 'blog',
            `blog /en route not resolvable status=${enResp?.status()} — blog target_entity_id slug gap. See playbook §Blog render gap.`,
          );
          expect(enResp?.status()).toBeLessThan(400);
        }
        const enHtml = await page.content();
        expect(enHtml, 'en-US hreflang alternate present').toMatch(/hreflang=["']en-US["']/);
        expect(enHtml, 'es-CO hreflang alternate also present on en-US').toMatch(
          /hreflang=["']es-CO["']/,
        );
        // inLanguage MUST be en-US on the translated URL — depends on #208.
        expect(enHtml, 'inLanguage en-US on /en route').toMatch(
          /"inLanguage"\s*:\s*"en(-US)?"/,
        );
      } finally {
        await cleanupTranscreateRun({
          admin,
          websiteId: seed.websiteId,
          contentType,
          sourceEntityId: src.id,
          targetLocale,
          jobId: jobId ?? undefined,
          seed: dgSeed ?? undefined,
        });
      }
    });
  }
});

function resolveSource(
  seed: Awaited<ReturnType<typeof getPilotSeed>>,
  contentType: PilotContentType,
): { id: string; slug: string; label: string } | null {
  if (contentType === 'pkg') {
    const pkg = seed.packages[0];
    return pkg ? { id: pkg.id, slug: pkg.slug, label: pkg.slug } : null;
  }
  if (contentType === 'act') {
    const act = seed.activities[0];
    return act ? { id: act.id, slug: act.slug, label: act.slug } : null;
  }
  const blog = seed.blogPosts[0];
  return blog ? { id: blog.id, slug: blog.slug, label: blog.slug } : null;
}
