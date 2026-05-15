import type { GrowthProviderRunnerProfileManifest, ProviderRunnerInput, SourceRef } from './types';

export interface ProviderRunnerExecutorResult {
  rowCount: number;
  sourceRefs: SourceRef[];
}

export type ProviderRunnerExecutor = (
  input: ProviderRunnerInput,
  profile: GrowthProviderRunnerProfileManifest,
) => Promise<ProviderRunnerExecutorResult>;

export const defaultProviderRunnerExecutor: ProviderRunnerExecutor = async (input, profile) => {
  if (profile.profile_id !== 'gsc_daily_complete_web_v1') {
    throw new Error(`No beta executor is enabled for profile ${profile.profile_id}`);
  }

  return {
    rowCount: 0,
    sourceRefs: [
      { type: 'script', ref: 'scripts/seo/populate-growth-google-cache.ts' },
      { type: 'script', ref: 'scripts/seo/normalize-growth-gsc-cache.mjs' },
      { type: 'provider', ref: `${profile.provider}:${profile.profile_id}` },
      ...(input.ownerIssue ? [{ type: 'issue' as const, ref: input.ownerIssue }] : []),
    ],
  };
};
