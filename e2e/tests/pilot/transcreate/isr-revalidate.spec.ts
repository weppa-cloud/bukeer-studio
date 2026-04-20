import { test, expect } from '@playwright/test';
import {
  cleanupTranscreateRun,
  createAdminClient,
  executeTranscreate,
  PILOT_W5_TAG,
  seedDecisionGradeCandidate,
  triggerRevalidate,
  uniqueTargetLocale,
  type DecisionGradeSeedResult,
} from '../../../setup/transcreate-helpers';
import { getPilotSeed, pilotSubdomain } from '../helpers';

/**
 * EPIC #214 · W5 #219 — ISR revalidation post-apply (AC-W5-3 hook).
 *
 * Post-apply, invoking `/api/revalidate` with `{ type, slug }` MUST return
 * 200 and the fan-out paths list. We verify this for pkg + act (blog has no
 * typed revalidate handler — revalidate is content-path based only).
 *
 * Skips cleanly when `E2E_REVALIDATE_SECRET` / `REVALIDATE_SECRET` is not
 * available in the environment (local dev).
 */
test.describe(`${PILOT_W5_TAG} Pilot W5 · ISR revalidate post-apply`, () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.setTimeout(180_000);

  const admin = createAdminClient();

  for (const contentType of ['pkg', 'act'] as const) {
    test(`${contentType} — post-apply revalidate returns paths array`, async ({
      page,
      request,
    }) => {
      const seed = await getPilotSeed('translation-ready');
      const source =
        contentType === 'pkg' ? seed.packages[0] : seed.activities[0];
      test.skip(!source, `translation-ready seed missing ${contentType}`);

      const targetLocale = uniqueTargetLocale(contentType);
      const targetKeyword = `w5-isr-${contentType}-${Date.now().toString().slice(-6)}`;
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
          sourceContentId: source!.id,
          targetLocale,
          targetKeyword,
          sourceKeyword: source!.slug,
        });
        jobId = result.jobId;
        expect(result.status).toBe('applied');

        const subdomain = pilotSubdomain();
        const revalidate = await triggerRevalidate({
          request,
          subdomain,
          type: contentType === 'pkg' ? 'package' : 'activity',
          slug: source!.slug,
        });
        test.skip(revalidate.skipped, revalidate.reason ?? 'revalidate helper skipped');
        expect(revalidate.status, 'revalidate endpoint responded').toBeGreaterThanOrEqual(200);
        expect(revalidate.status).toBeLessThan(500);

        const productPath =
          contentType === 'pkg'
            ? `/site/${subdomain}/paquetes/${source!.slug}`
            : `/site/${subdomain}/actividades/${source!.slug}`;
        expect(revalidate.paths, 'product path in revalidate fan-out').toEqual(
          expect.arrayContaining([productPath]),
        );
      } finally {
        await cleanupTranscreateRun({
          admin,
          websiteId: seed.websiteId,
          contentType,
          sourceEntityId: source!.id,
          targetLocale,
          jobId: jobId ?? undefined,
          seed: dgSeed ?? undefined,
        });
      }
    });
  }
});
