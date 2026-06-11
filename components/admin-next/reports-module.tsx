"use client";

import { useMemo } from 'react';
import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  BarChart3,
  Bot,
  CalendarDays,
  Download,
  Filter,
  Link2,
  Sparkles,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  ReportDefinition,
  ReportId,
  ReportInsight,
  ReportRow,
  ReportsFixture,
  ReportTone,
} from '@/lib/admin-next/fixtures/reports';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

const DEFAULT_REPORT: ReportId = 'sales';
const DEFAULT_RANGE = '30d';

export function ReportsModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: ReportsFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedSearchParams = searchParams ?? new URLSearchParams();
  const reportParam = resolvedSearchParams.get('report');
  const rangeParam = resolvedSearchParams.get('range') ?? DEFAULT_RANGE;
  const minParam = resolvedSearchParams.get('min') ?? '';
  const maxParam = resolvedSearchParams.get('max') ?? '';
  const selectedReport = useMemo(
    () => fixture.reports.find((report) => report.id === reportParam) ?? fixture.reports[0],
    [fixture.reports, reportParam],
  );

  const replaceQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(resolvedSearchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <AdminShell session={session} activeKey="reports">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-reports-root"
        data-theme-preset={evolucionTheme.presetSlug}
        data-active-report={selectedReport.id}
        data-active-range={rangeParam}
        data-price-min={minParam}
        data-price-max={maxParam}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <Header />
            <ReportTabs
              reports={fixture.reports}
              selectedReportId={selectedReport.id}
              onSelect={(reportId) => replaceQuery({ report: reportId })}
            />
            <Filters
              fixture={fixture}
              rangeParam={rangeParam}
              minParam={minParam}
              maxParam={maxParam}
              onRangeChange={(range) => replaceQuery({ range })}
              onPriceChange={(min, max) => replaceQuery({ min, max })}
            />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
              <ReportDetail report={selectedReport} fixture={fixture} />
              <InsightsPanel insights={fixture.insights} rows={fixture.tableRows} />
            </div>
          </div>
          <ReportsAiPanel signals={fixture.aiSignals} />
        </div>
      </section>
    </AdminShell>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {adminNextCopy.reports.eyebrow}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.reports.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.reports.subtitle}
        </p>
      </div>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
        data-testid="admin-next-reports-export"
        type="button"
      >
        <Download className="size-4" />
        {adminNextCopy.reports.exportAction}
      </button>
    </header>
  );
}

function ReportTabs({
  reports,
  selectedReportId,
  onSelect,
}: {
  reports: ReportDefinition[];
  selectedReportId: ReportId;
  onSelect: (reportId: ReportId) => void;
}) {
  return (
    <section
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      data-testid="admin-next-reports-tabs"
    >
      {reports.map((report) => {
        const isActive = report.id === selectedReportId;

        return (
          <button
            className={cn(
              'min-h-[150px] rounded-lg border p-4 text-left transition-colors',
              isActive ? 'border-primary/40 bg-primary/10' : 'bg-card hover:bg-muted/60',
            )}
            data-active={isActive}
            data-testid={`admin-next-report-tab-${report.id}`}
            key={report.id}
            type="button"
            onClick={() => onSelect(report.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{report.label}</div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {report.description}
                </p>
              </div>
              <span className={cn('rounded-md border px-2 py-1 text-xs font-medium', toneClass(report.tone))}>
                {report.delta}
              </span>
            </div>
            <div className="mt-4 text-2xl font-semibold tracking-normal">{report.value}</div>
          </button>
        );
      })}
    </section>
  );
}

function Filters({
  fixture,
  rangeParam,
  minParam,
  maxParam,
  onRangeChange,
  onPriceChange,
}: {
  fixture: ReportsFixture;
  rangeParam: string;
  minParam: string;
  maxParam: string;
  onRangeChange: (range: string) => void;
  onPriceChange: (min: string | null, max: string | null) => void;
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-reports-filters"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Filter className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">{adminNextCopy.reports.filtersTitle}</h2>
            <p className="text-xs text-muted-foreground">
              {adminNextCopy.reports.urlStateDescription}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {fixture.ranges.map((range) => (
            <button
              className={cn(
                'h-8 rounded-md border px-3 text-xs font-semibold',
                range.key === rangeParam
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'bg-background text-muted-foreground',
              )}
              data-testid={`admin-next-reports-range-${range.key}`}
              data-active={range.key === rangeParam}
              key={range.key}
              type="button"
              onClick={() => onRangeChange(range.key)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {fixture.priceRanges.map((priceRange) => {
          const isActive =
            (priceRange.min?.toString() ?? '') === minParam &&
            (priceRange.max?.toString() ?? '') === maxParam;

          return (
            <button
              className={cn(
                'h-8 rounded-md border px-3 text-xs font-semibold',
                isActive ? 'border-primary/40 bg-primary/10 text-primary' : 'bg-background text-muted-foreground',
              )}
              data-active={isActive}
              data-testid={`admin-next-reports-price-${priceRange.key}`}
              key={priceRange.key}
              type="button"
              onClick={() =>
                onPriceChange(
                  priceRange.min?.toString() ?? null,
                  priceRange.max?.toString() ?? null,
                )
              }
            >
              {priceRange.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ReportDetail({
  report,
  fixture,
}: {
  report: ReportDefinition;
  fixture: ReportsFixture;
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-reports-detail"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <BarChart3 className="size-4" />
            {report.label}
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">{report.value}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
        </div>
        <span
          className={cn('inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold', toneClass(report.tone))}
          data-testid="admin-next-reports-url-state"
        >
          <Link2 className="mr-1 size-3.5" />
          {adminNextCopy.reports.urlStateLabel}
        </span>
      </div>
      <div className="mt-6 grid min-h-[260px] grid-cols-6 items-end gap-3">
        {fixture.chart.map((point) => (
          <div className="flex min-h-[220px] flex-col justify-end gap-2" key={point.label}>
            <div className="flex flex-1 items-end justify-center gap-1.5 rounded-md bg-muted/50 px-2 py-2">
              <span
                className="w-4 rounded-t-md bg-primary"
                style={{ height: `${point.primaryPct}%` }}
              />
              <span
                className="w-4 rounded-t-md bg-[var(--bukeer-live)]"
                style={{ height: `${point.secondaryPct}%` }}
              />
            </div>
            <div className="text-center text-xs font-medium text-muted-foreground">
              {point.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InsightsPanel({
  insights,
  rows,
}: {
  insights: ReportInsight[];
  rows: ReportRow[];
}) {
  return (
    <div className="space-y-4">
      <section
        className="rounded-lg border bg-card p-4 text-card-foreground"
        data-testid="admin-next-reports-insights"
      >
        <h2 className="text-lg font-semibold tracking-normal">
          {adminNextCopy.reports.insightsTitle}
        </h2>
        <div className="mt-3 grid gap-3">
          {insights.map((insight) => (
            <InsightCard insight={insight} key={insight.id} />
          ))}
        </div>
      </section>
      <section
        className="rounded-lg border bg-card p-4 text-card-foreground"
        data-testid="admin-next-reports-table"
      >
        <h2 className="text-lg font-semibold tracking-normal">
          {adminNextCopy.reports.tableTitle}
        </h2>
        <div className="mt-3 divide-y">
          {rows.map((row) => (
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3 py-3" key={row.id}>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{row.label}</div>
                <div className="truncate text-xs text-muted-foreground">{row.owner}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{row.amount}</div>
                <div className={cn('text-xs font-medium', textToneClass(row.tone))}>
                  {row.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportsAiPanel({ signals }: { signals: ReportInsight[] }) {
  return (
    <aside
      className="rounded-lg border bg-card p-4 text-card-foreground xl:sticky xl:top-20 xl:h-[calc(100vh-7rem)]"
      data-testid="admin-next-reports-ai-panel"
    >
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {adminNextCopy.reports.aiPanelEyebrow}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <h2 className="text-lg font-semibold tracking-normal">
          {adminNextCopy.reports.aiPanelTitle}
        </h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {adminNextCopy.reports.aiPanelDescription}
      </p>
      <div className="mt-5 space-y-3">
        {signals.map((signal) => (
          <div className="rounded-lg border bg-muted/40 p-3" key={signal.id}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className={cn('size-4', textToneClass(signal.tone))} />
              {signal.label}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={cn('rounded-md border px-2 py-1 text-xs font-semibold', toneClass(signal.tone))}>
                {signal.value}
              </span>
              <CalendarDays className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-xs leading-5 text-muted-foreground">
              {signal.detail}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function InsightCard({ insight }: { insight: ReportInsight }) {
  return (
    <article className="rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{insight.label}</div>
        <span className={cn('rounded-md border px-2 py-1 text-xs font-semibold', toneClass(insight.tone))}>
          {insight.value}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{insight.detail}</p>
    </article>
  );
}

function toneClass(tone: ReportTone) {
  switch (tone) {
    case 'success':
      return 'border-[var(--bukeer-success)]/30 bg-[var(--bukeer-success)]/10 text-[var(--bukeer-success)]';
    case 'warning':
      return 'border-[var(--bukeer-human-loop)]/30 bg-[var(--bukeer-human-loop)]/10 text-[var(--bukeer-human-loop)]';
    case 'danger':
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    case 'live':
      return 'border-[var(--bukeer-live)]/30 bg-[var(--bukeer-live)]/10 text-[var(--bukeer-live)]';
    default:
      return 'border-primary/30 bg-primary/10 text-primary';
  }
}

function textToneClass(tone: ReportTone) {
  switch (tone) {
    case 'success':
      return 'text-[var(--bukeer-success)]';
    case 'warning':
      return 'text-[var(--bukeer-human-loop)]';
    case 'danger':
      return 'text-destructive';
    case 'live':
      return 'text-[var(--bukeer-live)]';
    default:
      return 'text-primary';
  }
}
