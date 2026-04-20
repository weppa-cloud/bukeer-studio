import { test, expect } from '@playwright/test';
import {
  bulkTranslationAction,
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
 * EPIC #214 · W5 #219 — `/api/seo/translations/bulk` review + apply.
 *
 * Covers the bulk path across two content types in one batch (pkg + act).
 * Each job enters `draft`, then bulk-review transitions both to `reviewed`,
 * then bulk-apply transitions both to `applied`. This double-transition
 * exercise is the W5 surrogate for per-row Republish (see #219 Path A).
 *
 * Blog excluded from bulk batch to keep the scenario focused on the dual
 * content-type transition; blog bulk is covered by the lifecycle spec
 * (same underlying `applyTranscreateJob` path).
 */
test.describe(`${PILOT_W5_TAG} Pilot W5 · bulk review + apply`, () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.setTimeout(180_000);

  const admin = createAdminClient();

  test('pkg + act — bulk review then bulk apply processes both rows', async ({
    page,
  }) => {
    const seed = await getPilotSeed('translation-ready');
    const pkg = seed.packages[0];
    const act = seed.activities[0];
    test.skip(!pkg || !act, 'translation-ready seed missing pkg or act');

    type Run = {
      contentType: PilotContentType;
      sourceId: string;
      sourceSlug: string;
      targetLocale: string;
      dgSeed: DecisionGradeSeedResult | null;
      jobId: string | null;
    };

    const runs: Run[] = [
      {
        contentType: 'pkg',
        sourceId: pkg!.id,
        sourceSlug: pkg!.slug,
        targetLocale: uniqueTargetLocale('pkg'),
        dgSeed: null,
        jobId: null,
      },
      {
        contentType: 'act',
        sourceId: act!.id,
        sourceSlug: act!.slug,
        targetLocale: uniqueTargetLocale('act'),
        dgSeed: null,
        jobId: null,
      },
    ];

    try {
      // Seed + create_draft only — stop before review so bulk endpoint runs the
      // review + apply transitions.
      for (const run of runs) {
        const targetKeyword = `w5-bulk-${run.contentType}-${Date.now().toString().slice(-6)}`;
        run.dgSeed = await seedDecisionGradeCandidate({
          admin,
          websiteId: seed.websiteId,
          contentType: run.contentType,
          targetLocale: run.targetLocale,
          targetKeyword,
        });
        const result = await executeTranscreate({
          page,
          websiteId: seed.websiteId,
          contentType: run.contentType,
          sourceContentId: run.sourceId,
          targetLocale: run.targetLocale,
          targetKeyword,
          sourceKeyword: run.sourceSlug,
          stopAfter: 'draft',
        });
        expect(result.status).toBe('draft');
        run.jobId = result.jobId;
      }

      const jobIds = runs.map((r) => r.jobId!).filter(Boolean);
      expect(jobIds.length).toBe(2);

      // Bulk review.
      const review = await bulkTranslationAction({
        page,
        websiteId: seed.websiteId,
        jobIds,
        action: 'review',
      });
      expect(review.ok, `bulk review status=${review.status}`).toBeTruthy();
      const reviewBody = review.body as {
        data?: { processed?: number; failed?: number; rows?: Array<{ jobId: string; success: boolean; status: string | null }> };
      } | null;
      expect(reviewBody?.data?.processed).toBe(2);
      expect(reviewBody?.data?.failed).toBe(0);

      for (const run of runs) {
        const j = await readTranscreateJob(admin, run.jobId!);
        expect(j?.status).toBe('reviewed');
      }

      // Bulk apply.
      const apply = await bulkTranslationAction({
        page,
        websiteId: seed.websiteId,
        jobIds,
        action: 'apply',
      });
      expect(apply.ok, `bulk apply status=${apply.status}`).toBeTruthy();
      const applyBody = apply.body as {
        data?: { processed?: number; failed?: number };
      } | null;
      expect(applyBody?.data?.processed).toBe(2);
      expect(applyBody?.data?.failed).toBe(0);

      for (const run of runs) {
        const j = await readTranscreateJob(admin, run.jobId!);
        expect(j?.status).toBe('applied');
      }
    } finally {
      for (const run of runs) {
        await cleanupTranscreateRun({
          admin,
          websiteId: seed.websiteId,
          contentType: run.contentType,
          sourceEntityId: run.sourceId,
          targetLocale: run.targetLocale,
          jobId: run.jobId ?? undefined,
          seed: run.dgSeed ?? undefined,
        });
      }
    }
  });
});
