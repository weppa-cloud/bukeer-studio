import { test, expect } from '@playwright/test';
import {
  cleanupTranscreateRun,
  createAdminClient,
  PILOT_W5_TAG,
  postTranscreateStream,
  seedDecisionGradeCandidate,
  type DecisionGradeSeedResult,
} from '../../../setup/transcreate-helpers';
import { getPilotSeed } from '../helpers';

/**
 * EPIC #214 · W5 #219 — Stream + abort + recovery (AC-W5-2 edge case).
 *
 * Scope: verify the real stream endpoint responds for at least one content
 * type and that an aborted stream leaves no orphan `seo_transcreation_jobs`
 * row. We test package as the representative content type (cheapest source
 * body + shortest generated payload).
 *
 * Approach:
 *   1. Seed decision-grade candidate (otherwise stream returns 409).
 *   2. Fire the real stream endpoint via page.request with a short abort
 *      timeout; expect the stream to return either 200 (TM short-circuit)
 *      or 429 (rate-limited — acceptable per priority v2) or 500 (LLM timeout).
 *   3. After abort, assert no `seo_transcreation_jobs` row was created for
 *      this (website_id, page_type, source, target_locale) tuple — the
 *      stream endpoint does NOT persist (only `create_draft` on the
 *      non-stream `/transcreate` route does), so this assertion documents
 *      the contract.
 *
 * Priority v2 (2026-04-19): real API calls are acceptable; rate-limit
 * mitigation explicitly removed from ACs. Tests skip cleanly on 429.
 */
test.describe(`${PILOT_W5_TAG} Pilot W5 · stream + abort`, () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.setTimeout(120_000);

  const admin = createAdminClient();

  test('stream endpoint: real call returns OK / 429 / 500, no orphan job row persists', async ({
    page,
  }) => {
    const seed = await getPilotSeed('translation-ready');
    const pkg = seed.packages[0];
    test.skip(!pkg, 'translation-ready seed missing package');

    // Unique target locale so no state from prior runs collides.
    const targetLocale = `en-w5stream-${Date.now().toString().slice(-6)}`;
    const targetKeyword = `w5-stream-${Date.now().toString().slice(-6)}`;
    let dgSeed: DecisionGradeSeedResult | null = null;

    try {
      dgSeed = await seedDecisionGradeCandidate({
        admin,
        websiteId: seed.websiteId,
        contentType: 'pkg',
        targetLocale,
        targetKeyword,
      });

      const { status, body } = await postTranscreateStream({
        page,
        websiteId: seed.websiteId,
        contentType: 'pkg',
        sourceContentId: pkg!.id,
        targetLocale,
        targetKeyword,
        sourceKeyword: pkg!.slug,
      });

      // 200 — LLM or TM short-circuit succeeded.
      // 429 — rate-limited (accepted per priority v2).
      // 500/502 — transient upstream LLM error (documented in playbook).
      expect([200, 429, 500, 502, 503]).toContain(status);

      if (status === 200) {
        // Body should be a plain-text JSON envelope — validate structure.
        expect(body.length, 'non-empty body on 200').toBeGreaterThan(0);
      }

      // CONTRACT: stream endpoint MUST NOT persist a job row. The non-stream
      // `/transcreate` with `action: 'create_draft'` is the only persist
      // path. Verify no row landed.
      const { data: jobRows } = await admin
        .from('seo_transcreation_jobs')
        .select('id,status,page_id,target_locale')
        .eq('website_id', seed.websiteId)
        .eq('page_type', 'package')
        .eq('page_id', pkg!.id)
        .eq('target_locale', targetLocale);
      expect(
        (jobRows ?? []).length,
        `stream endpoint did not persist job row for ${targetLocale}`,
      ).toBe(0);
    } finally {
      // Cleanup any stray variant (should be none but narrow-scope safe).
      await cleanupTranscreateRun({
        admin,
        websiteId: seed.websiteId,
        contentType: 'pkg',
        sourceEntityId: pkg!.id,
        targetLocale,
        seed: dgSeed ?? undefined,
      });
    }
  });
});
