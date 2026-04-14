import { z } from 'zod';

// ─── Score 5D ────────────────────────────────────────────────────────────────

const GradeSchema = z.enum(['A', 'B', 'C', 'D', 'F']);

const Score5DDimensionSchema = z.object({
  score: z.number().min(0).max(100),
  grade: GradeSchema,
  details: z.array(z.string()),
});

/** Score across 5 SEO dimensions (d1-d5). */
export const Score5DResultSchema = z.object({
  d1: Score5DDimensionSchema,
  d2: Score5DDimensionSchema,
  d3: Score5DDimensionSchema,
  d4: Score5DDimensionSchema,
  d5: Score5DDimensionSchema,
});
export type Score5DResult = z.infer<typeof Score5DResultSchema>;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface IntegrationStatusDTO {
  websiteId: string;
  gsc: {
    connected: boolean;
    configurationComplete?: boolean;
    tokenExpiry?: string | null;
    siteUrl?: string | null;
    lastError?: string | null;
  };
  ga4: {
    connected: boolean;
    configurationComplete?: boolean;
    tokenExpiry?: string | null;
    propertyId?: string | null;
    lastError?: string | null;
  };
  dataforseo: {
    connected: boolean;
    enabled: boolean;
  };
}

export interface AnalyticsOverviewDTO {
  websiteId: string;
  from: string;
  to: string;
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
  avgBounceRate: number | null;
  avgSessionDuration: number | null;
  trend: {
    sessions: number;
    users: number;
    pageviews: number;
    conversions: number;
  };
  topPages: Array<{
    pagePath: string;
    sessions: number;
    users: number;
    pageviews: number;
    conversions: number;
  }>;
  integrationStatus: IntegrationStatusDTO;
}

export interface KeywordRowDTO {
  id: string;
  keyword: string;
  locale: string;
  targetUrl?: string | null;
  latestPosition: number | null;
  latestSearchVolume: number | null;
  latestSnapshotDate: string | null;
  snapshots: Array<{
    snapshotDate: string;
    position: number | null;
    searchVolume: number | null;
  }>;
}

export interface CompetitorRowDTO {
  id: string;
  domain: string;
  snapshotDate: string;
  avgPosition: number | null;
  trafficShare: number | null;
  source: string;
}

export interface HealthAuditDTO {
  id: string;
  pageUrl: string;
  pageType: string;
  auditDate: string;
  performanceScore: number | null;
  lcpMs: number | null;
  clsScore: number | null;
  issueCountCritical: number;
  issueCountWarning: number;
  issueCountInfo: number;
}

export interface KeywordResearchDTO {
  mode: 'gsc+ai' | 'ai-only';
  keyword: string;
  searchConsoleData: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
  } | null;
  relatedQueries: Array<{
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  recommendation: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    contentBrief: string[];
    reasoning: string;
  };
  message?: string;
}
