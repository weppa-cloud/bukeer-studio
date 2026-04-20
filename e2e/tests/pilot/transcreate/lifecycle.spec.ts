import { test, expect, type TestInfo } from '@playwright/test';
import {
  CONTENT_TYPES,
  allContentTypes,
  assertLocalizedVariantsApplied,
  cleanupTranscreateRun,
  createAdminClient,
  executeTranscreate,
  PILOT_W5_TAG,
  readTranscreateJob,
  seedDecisionGradeCandidate,
  uniqueTargetLocale,
  type DecisionGradeSeedResult,
  type PilotContentType,
} from '../../../setup/transcreate-helpers';
import { getPilotSeed } from '../helpers';

/**
 * EPIC #214 · W5 #219 — Transcreate lifecycle (parameterized).
 *
 * Covers AC-W5-9 (pkg), AC-W5-10 (act), AC-W5-11 (blog), AC-W5-4 (state
 * transitions persist), AC-W5-13 (chromium + firefox stability).
 *
 * Flow per content type:
 *   1. Resolve source entity from `seedPilot('translation-ready')`.
 *   2. Seed decision-grade keyword candidate (AC-W5-1).
 *   3. create_draft → review → apply via /api/seo/content-intelligence/transcreate.
 *   4. Assert `seo_transcreation_jobs.status = 'applied'` (DB read).
 *   5. Assert overlay (`website_product_pages` for pkg/act; `website_blog_posts`
 *      for blog) holds the localized `meta_title`/`meta_desc` payload.
 *
 * NOT exercised here (covered by sibling specs):
 *   - Stream endpoint (→ `stream-abort.spec.ts`).
 *   - Public URL render + hreflang + canonical + JSON-LD (→ `public-render.spec.ts`).
 *   - Bulk review (→ `bulk-review.spec.ts`).
 *   - Drift / ISR (→ `drift.spec.ts` + `isr-revalidate.spec.ts`).
 */
test.describe(`${PILOT_W5_TAG} Pilot W5 · transcreate lifecycle`, () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.setTimeout(180_000);

  const admin = createAdminClient();

  for (const contentType of allContentTypes()) {
    const desc = CONTENT_TYPES[contentType];

    test(`${desc.label} (${contentType}) — draft → reviewed → applied`, async ({
      page,
    }, testInfo: TestInfo) => {
      const seed = await getPilotSeed('translation-ready');
      const sourceEntity = resolveSourceEntity(seed, contentType);
      test.skip(
        !sourceEntity,
        `translation-ready seed missing ${contentType} fixture — warnings: ${seed.warnings.join(' | ')}`,
      );
      const source = sourceEntity!;

      const targetLocale = uniqueTargetLocale(contentType);
      const targetKeyword = `w5-${contentType}-${Date.now().toString().slice(-6)}`;
      let dgSeed: DecisionGradeSeedResult | null = null;
      let jobId: string | null = null;

      try {
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
          sourceContentId: source.id,
          targetLocale,
          targetKeyword,
          sourceKeyword: source.label,
        });
        jobId = result.jobId;

        expect(result.status).toBe('applied');

        // Attach the payload to the trace for forensic inspection.
        await testInfo.attach(`lifecycle-${contentType}-payload.json`, {
          body: Buffer.from(JSON.stringify(result.payloadV2, null, 2)),
          contentType: 'application/json',
        });

        // 1. Job row committed as `applied`.
        const job = await readTranscreateJob(admin, result.jobId);
        expect(job?.status, `job row for ${contentType}`).toBe('applied');
        expect(job?.target_locale).toBe(targetLocale);
        expect(job?.page_type).toBe(desc.pageType);

        // 2. Overlay / target row holds the localized payload.
        const applied = await assertLocalizedVariantsApplied({
          admin,
          websiteId: seed.websiteId,
          contentType,
          sourceEntityId: source.id,
          targetLocale,
          expected: {
            metaTitle: String(result.payloadV2.meta_title),
            metaDesc: String(result.payloadV2.meta_desc),
          },
        });
        expect(applied.ok, `overlay applied for ${contentType}: ${applied.reason ?? ''}`).toBe(true);
      } finally {
        await cleanupTranscreateRun({
          admin,
          websiteId: seed.websiteId,
          contentType,
          sourceEntityId: source.id,
          targetLocale,
          jobId: jobId ?? undefined,
          seed: dgSeed ?? undefined,
        });
      }
    });
  }
});

// --- Source entity resolution ---------------------------------------------

interface SourceEntity {
  id: string;
  slug: string;
  label: string;
}

function resolveSourceEntity(
  seed: Awaited<ReturnType<typeof getPilotSeed>>,
  contentType: PilotContentType,
): SourceEntity | null {
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
