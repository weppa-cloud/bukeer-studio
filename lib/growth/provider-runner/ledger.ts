import type { ProviderCacheRow, ProviderRunLedgerRow, ProviderRunnerStore } from './types';

export interface MemoryProviderRunnerStore extends ProviderRunnerStore {
  runs: ProviderRunLedgerRow[];
  cacheRows: ProviderCacheRow[];
  writes: ProviderRunLedgerRow[];
}

export function createMemoryProviderRunnerStore(seed: {
  runs?: ProviderRunLedgerRow[];
  cacheRows?: ProviderCacheRow[];
} = {}): MemoryProviderRunnerStore {
  const store: MemoryProviderRunnerStore = {
    runs: [...(seed.runs ?? [])],
    cacheRows: [...(seed.cacheRows ?? [])],
    writes: [],
    async findLatestRun(input) {
      return latest(
        store.runs.filter(
          (row) =>
            row.account_id === input.accountId &&
            row.website_id === input.websiteId &&
            row.provider === input.provider &&
            row.profile_id === input.profileId,
        ),
        (row) => row.completed_at ?? row.updated_at ?? row.created_at ?? row.started_at,
      );
    },
    async findLatestCache(input) {
      return latest(
        store.cacheRows.filter(
          (row) =>
            row.account_id === input.accountId &&
            row.website_id === input.websiteId &&
            row.provider === input.provider &&
            row.cache_target === input.cacheTarget &&
            (!row.profile_id || row.profile_id === input.profileId),
        ),
        (row) => row.updated_at ?? row.created_at,
      );
    },
    async findRecentFailures(input) {
      const sinceMs = Date.parse(input.since);
      return store.runs.filter((row) => {
        const rowTime = Date.parse(row.completed_at ?? row.updated_at ?? row.created_at ?? row.started_at ?? '');
        return (
          row.account_id === input.accountId &&
          row.website_id === input.websiteId &&
          row.provider === input.provider &&
          row.profile_id === input.profileId &&
          Number.isFinite(rowTime) &&
          rowTime >= sinceMs &&
          ['failed', 'blocked_provider_error', 'quota_exhausted'].includes(row.run_status)
        );
      });
    },
    async writeLedger(row) {
      const persisted = {
        ...row,
        id: row.id ?? `memory-run-${store.runs.length + 1}`,
        created_at: row.created_at ?? row.started_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? row.completed_at ?? row.started_at ?? new Date().toISOString(),
      };
      store.runs.push(persisted);
      store.writes.push(persisted);
      return persisted;
    },
  };
  return store;
}

function latest<T>(rows: T[], getDate: (row: T) => string | null | undefined): T | null {
  return [...rows].sort((a, b) => Date.parse(getDate(b) ?? '') - Date.parse(getDate(a) ?? ''))[0] ?? null;
}
