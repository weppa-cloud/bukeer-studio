import { syncSeoData } from '@/lib/seo/backend-service';

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function enqueueDecisionGradeSync(websiteId: string): Promise<{
  queued: boolean;
  requestId: string;
}> {
  const requestId = crypto.randomUUID();

  // Best-effort enqueue: trigger sync in background to hydrate authoritative datasets.
  void syncSeoData(websiteId, requestId, {
    from: isoDateDaysAgo(30),
    to: isoDateDaysAgo(0),
    includeDataForSeo: true,
  }).catch((error) => {
    console.error('[seo.decision-grade.enqueue] sync failed', {
      websiteId,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return { queued: true, requestId };
}
