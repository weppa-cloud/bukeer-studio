#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

type ThresholdReport = {
  threshold: number;
  passed: boolean;
};

type LocaleCoverage = {
  locale: string;
  validated: number;
  threshold: number;
  passed: boolean;
};

type TableAttribution = {
  table: string;
  rows: number;
  attributedRows: number;
  pct: number;
  passed: boolean;
};

type KpiReport = {
  issue: {
    number: number;
    title: string;
    scope: string;
  };
  generatedAt: string;
  filters: {
    websiteId: string | null;
  };
  thresholds: {
    auditCoveragePct: number;
    researchCandidatesValidatedPerLocale: number;
    sourceAttributionCompletenessPct: number;
  };
  metrics: {
    auditCoverage: ThresholdReport & {
      totalSnapshots: number;
      validatedSnapshots: number;
      latestSnapshotsByLocale: Array<{
        locale: string;
        totalSnapshots: number;
        validatedSnapshots: number;
        pct: number;
        passed: boolean;
      }>;
    };
    researchCandidates: ThresholdReport & {
      totalValidated: number;
      byLocale: LocaleCoverage[];
      localesBelowThreshold: string[];
    };
    sourceAttributionCompleteness: ThresholdReport & {
      totalRows: number;
      attributedRows: number;
      byTable: TableAttribution[];
    };
  };
  passed: boolean;
};

const ISSUE_NUMBER = 122;
const ISSUE_TITLE = 'EPIC 86 closure KPI report';
const THRESHOLDS = {
  auditCoveragePct: 0.95,
  researchCandidatesValidatedPerLocale: 500,
  sourceAttributionCompletenessPct: 1,
} as const;

const TABLES = {
  auditSnapshots: 'seo_render_snapshots',
  researchCandidates: 'seo_keyword_candidates',
  auditFindings: 'seo_audit_findings',
  researchRuns: 'seo_keyword_research_runs',
  pageMetrics: 'seo_page_metrics_daily',
  clusterMetrics: 'seo_cluster_metrics_daily',
} as const;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createSupabase() {
  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toTimestamp(value: unknown): number {
  if (typeof value !== 'string' || value.length === 0) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function hasAttribution(row: Row): boolean {
  return Boolean(toStringValue(row.source)) && Boolean(toStringValue(row.fetched_at)) && Boolean(toStringValue(row.confidence));
}

function buildAuditCoverage(rows: Row[]): KpiReport['metrics']['auditCoverage'] {
  const latestByKey = new Map<string, Row>();

  for (const row of rows) {
    const websiteId = toStringValue(row.website_id);
    const locale = toStringValue(row.locale);
    const pageType = toStringValue(row.page_type);
    const pageId = toStringValue(row.page_id) || toStringValue(row.public_url);
    const key = `${websiteId}|${locale}|${pageType}|${pageId}`;
    const current = latestByKey.get(key);

    if (!current) {
      latestByKey.set(key, row);
      continue;
    }

    if (toTimestamp(row.captured_at) >= toTimestamp(current.captured_at)) {
      latestByKey.set(key, row);
    }
  }

  const latestSnapshots = Array.from(latestByKey.values());
  const byLocaleMap = new Map<string, { totalSnapshots: number; validatedSnapshots: number }>();

  for (const row of latestSnapshots) {
    const locale = toStringValue(row.locale) || 'unknown';
    const bucket = byLocaleMap.get(locale) ?? { totalSnapshots: 0, validatedSnapshots: 0 };
    bucket.totalSnapshots += 1;
    if (toStringValue(row.confidence) === 'live' && row.decision_grade_ready === true) {
      bucket.validatedSnapshots += 1;
    }
    byLocaleMap.set(locale, bucket);
  }

  const latestSnapshotsByLocale = Array.from(byLocaleMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([locale, bucket]) => {
      const pct = bucket.totalSnapshots === 0 ? 0 : bucket.validatedSnapshots / bucket.totalSnapshots;
      return {
        locale,
        totalSnapshots: bucket.totalSnapshots,
        validatedSnapshots: bucket.validatedSnapshots,
        pct: Number(pct.toFixed(4)),
        passed: pct >= THRESHOLDS.auditCoveragePct,
      };
    });

  const totalSnapshots = latestSnapshots.length;
  const validatedSnapshots = latestSnapshots.filter(
    (row) => toStringValue(row.confidence) === 'live' && row.decision_grade_ready === true,
  ).length;
  const pct = totalSnapshots === 0 ? 0 : validatedSnapshots / totalSnapshots;

  return {
    threshold: THRESHOLDS.auditCoveragePct,
    passed: pct >= THRESHOLDS.auditCoveragePct,
    totalSnapshots,
    validatedSnapshots,
    latestSnapshotsByLocale,
  };
}

function buildResearchCandidates(rows: Row[]): KpiReport['metrics']['researchCandidates'] {
  const byLocaleMap = new Map<string, Set<string>>();

  for (const row of rows) {
    if (toStringValue(row.confidence) !== 'live' || row.decision_grade_ready !== true) {
      continue;
    }

    const locale = toStringValue(row.locale) || 'unknown';
    const keyword = toStringValue(row.keyword).trim().toLowerCase();
    if (!keyword) continue;

    const bucket = byLocaleMap.get(locale) ?? new Set<string>();
    bucket.add(keyword);
    byLocaleMap.set(locale, bucket);
  }

  const byLocale = Array.from(byLocaleMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([locale, keywords]) => {
      const validated = keywords.size;
      return {
        locale,
        validated,
        threshold: THRESHOLDS.researchCandidatesValidatedPerLocale,
        passed: validated >= THRESHOLDS.researchCandidatesValidatedPerLocale,
      };
    });

  const localesBelowThreshold = byLocale.filter((bucket) => !bucket.passed).map((bucket) => bucket.locale);
  const totalValidated = byLocale.reduce((sum, bucket) => sum + bucket.validated, 0);

  return {
    threshold: THRESHOLDS.researchCandidatesValidatedPerLocale,
    passed: byLocale.length > 0 && localesBelowThreshold.length === 0,
    totalValidated,
    byLocale,
    localesBelowThreshold,
  };
}

function buildSourceAttributionCompleteness(tableRows: Array<{ table: string; rows: Row[] }>): KpiReport['metrics']['sourceAttributionCompleteness'] {
  const byTable = tableRows
    .map(({ table, rows }) => {
      const attributedRows = rows.filter(hasAttribution).length;
      const pct = rows.length === 0 ? 0 : attributedRows / rows.length;
      return {
        table,
        rows: rows.length,
        attributedRows,
        pct: Number(pct.toFixed(4)),
        passed: rows.length === 0 || pct === 1,
      };
    })
    .sort((a, b) => a.table.localeCompare(b.table));

  const totalRows = byTable.reduce((sum, item) => sum + item.rows, 0);
  const attributedRows = byTable.reduce((sum, item) => sum + item.attributedRows, 0);
  const pct = totalRows === 0 ? 0 : attributedRows / totalRows;

  return {
    threshold: THRESHOLDS.sourceAttributionCompletenessPct,
    passed: pct === THRESHOLDS.sourceAttributionCompletenessPct,
    totalRows,
    attributedRows,
    byTable,
  };
}

async function main() {
  const supabase = createSupabase();
  const websiteId = process.env.EPIC86_KPI_WEBSITE_ID?.trim() || null;

  const tableRequests = [
    {
      key: 'auditSnapshots',
      table: TABLES.auditSnapshots,
      columns: 'website_id,locale,page_type,page_id,public_url,source,fetched_at,confidence,decision_grade_ready,captured_at',
      orderBy: 'id',
    },
    {
      key: 'researchCandidates',
      table: TABLES.researchCandidates,
      columns: 'website_id,locale,keyword,source,fetched_at,confidence,decision_grade_ready',
      orderBy: 'id',
    },
    {
      key: 'auditFindings',
      table: TABLES.auditFindings,
      columns: 'website_id,locale,source,fetched_at,confidence',
      orderBy: 'id',
    },
    {
      key: 'researchRuns',
      table: TABLES.researchRuns,
      columns: 'website_id,locale,source,fetched_at,confidence',
      orderBy: 'id',
    },
    {
      key: 'pageMetrics',
      table: TABLES.pageMetrics,
      columns: 'website_id,locale,source,fetched_at,confidence',
      orderBy: 'id',
    },
    {
      key: 'clusterMetrics',
      table: TABLES.clusterMetrics,
      columns: 'website_id,locale,source,fetched_at,confidence',
      orderBy: 'id',
    },
  ] as const;

  const tableRows = await Promise.all(
    tableRequests.map(async (request) => {
      let query = supabase.from(request.table).select(request.columns);
      if (websiteId) {
        query = query.eq('website_id', websiteId);
      }

      const rows: Row[] = [];
      let offset = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await query
          .order(request.orderBy, { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) {
          throw new Error(`Failed to read ${request.table}: ${error.message}`);
        }

        const batch = (data ?? []) as Row[];
        rows.push(...batch);
        if (batch.length < pageSize) {
          break;
        }

        offset += pageSize;
      }

      return { table: request.table, rows };
    }),
  );

  const auditCoverage = buildAuditCoverage(tableRows.find((entry) => entry.table === TABLES.auditSnapshots)?.rows ?? []);
  const researchCandidates = buildResearchCandidates(
    tableRows.find((entry) => entry.table === TABLES.researchCandidates)?.rows ?? [],
  );
  const sourceAttributionCompleteness = buildSourceAttributionCompleteness(tableRows);

  const report: KpiReport = {
    issue: {
      number: ISSUE_NUMBER,
      title: ISSUE_TITLE,
      scope: websiteId ? `website:${websiteId}` : 'database-wide',
    },
    generatedAt: new Date().toISOString(),
    filters: {
      websiteId,
    },
    thresholds: THRESHOLDS,
    metrics: {
      auditCoverage,
      researchCandidates,
      sourceAttributionCompleteness,
    },
    passed:
      auditCoverage.passed &&
      researchCandidates.passed &&
      sourceAttributionCompleteness.passed,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.log(
    JSON.stringify(
      {
        issue: {
          number: ISSUE_NUMBER,
          title: ISSUE_TITLE,
          scope: 'unavailable',
        },
        generatedAt: new Date().toISOString(),
        filters: {
          websiteId: process.env.EPIC86_KPI_WEBSITE_ID?.trim() || null,
        },
        thresholds: THRESHOLDS,
        metrics: null,
        passed: false,
        error: {
          code: 'KPI_REPORT_ERROR',
          message,
        },
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
