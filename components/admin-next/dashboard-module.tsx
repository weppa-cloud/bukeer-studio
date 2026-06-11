"use client";

import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CreditCard,
  PlaneTakeoff,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  DashboardActivity,
  DashboardFixture,
  DashboardKpi,
  DashboardReceivable,
  DashboardSeller,
  DashboardSignal,
} from '@/lib/admin-next/fixtures/dashboard';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

const kpiIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'monthly-sales': TrendingUp,
  receivables: Wallet,
  payables: CreditCard,
  'active-itineraries': PlaneTakeoff,
};

export function DashboardModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: DashboardFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  return (
    <AdminShell session={session} activeKey="dashboard">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-dashboard-root"
        data-theme-preset={evolucionTheme.presetSlug}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <DashboardHeader />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {fixture.kpis.map((kpi) => (
                <KpiCard key={kpi.id} kpi={kpi} />
              ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
              <div className="space-y-4">
                <SalesChart chart={fixture.chart} />
                <ReceivablesPanel receivables={fixture.receivables} />
              </div>
              <div className="space-y-4">
                <SellersPanel sellers={fixture.sellers} />
                <ActivityPanel activity={fixture.activity} />
              </div>
            </div>
          </div>
          <DashboardAiPanel signals={fixture.signals} />
        </div>
      </section>
    </AdminShell>
  );
}

function DashboardHeader() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.dashboard.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.dashboard.subtitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
          data-testid="admin-next-dashboard-date-range"
          type="button"
        >
          <CalendarDays className="size-4" />
          {adminNextCopy.dashboard.dateRange}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-dashboard-new-itinerary"
          type="button"
        >
          <Plus className="size-4" />
          {adminNextCopy.dashboard.primaryAction}
        </button>
      </div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const Icon = kpiIcons[kpi.id] ?? Activity;

  return (
    <article
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid={`admin-next-dashboard-kpi-${kpi.id}`}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {kpi.label}
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-normal">{kpi.value}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <ToneBadge tone={kpi.tone}>{kpi.badge}</ToneBadge>
        <span>{kpi.detail}</span>
      </div>
    </article>
  );
}

function SalesChart({
  chart,
}: {
  chart: DashboardFixture['chart'];
}) {
  return (
    <section
      className="flex min-h-[320px] flex-col rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-dashboard-sales-chart"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-normal">
          {adminNextCopy.dashboard.salesVsCostTitle}
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <LegendDot label={adminNextCopy.dashboard.salesLegend} tone="primary" />
          <LegendDot label={adminNextCopy.dashboard.costLegend} tone="live" />
          <a
            className="inline-flex items-center gap-1 font-semibold text-primary"
            data-testid="admin-next-dashboard-sales-report"
            href="/admin/reports?report=sales&range=30d"
          >
            <BarChart3 className="size-3.5" />
            {adminNextCopy.dashboard.viewReportAction}
          </a>
        </div>
      </div>
      <div className="mt-6 grid flex-1 grid-cols-6 items-end gap-3">
        {chart.map((month) => (
          <div
            className="flex min-h-[220px] flex-col justify-end gap-2"
            data-testid={`admin-next-dashboard-chart-${month.month.toLowerCase()}`}
            key={month.month}
          >
            <div className="flex flex-1 items-end justify-center gap-1.5 rounded-md bg-muted/50 px-2 py-2">
              <span
                className="w-4 rounded-t-md bg-primary"
                style={{ height: `${month.salesPct}%` }}
              />
              <span
                className="w-4 rounded-t-md bg-[var(--bukeer-live)]"
                style={{ height: `${month.costPct}%` }}
              />
            </div>
            <div className="text-center text-xs font-medium text-muted-foreground">
              {month.month}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReceivablesPanel({ receivables }: { receivables: DashboardReceivable[] }) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-dashboard-receivables"
    >
      <PanelHeader
        title={adminNextCopy.dashboard.receivablesTitle}
        testId="admin-next-dashboard-receivables-report"
        href="/admin/reports?report=receivables&range=30d&min=500000&max=15000000"
      />
      <div className="mt-3 divide-y">
        {receivables.map((item) => (
          <div className="flex items-center gap-3 py-3" key={item.id}>
            <Avatar label={initialsFor(item.customer)} tone={item.tone} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{item.customer}</div>
              <div className="truncate text-xs text-muted-foreground">{item.itinerary}</div>
            </div>
            <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
            <div className="w-24 text-right">
              <div className="text-sm font-semibold">{item.amount}</div>
              <div className="text-xs text-muted-foreground">{item.due}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SellersPanel({ sellers }: { sellers: DashboardSeller[] }) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-dashboard-sellers"
    >
      <PanelHeader
        title={adminNextCopy.dashboard.sellersTitle}
        testId="admin-next-dashboard-sellers-report"
        href="/admin/reports?report=sales-intelligence&range=90d"
      />
      <div className="mt-3 divide-y">
        {sellers.map((seller) => (
          <div className="flex items-center gap-3 py-3" key={seller.id}>
            <div className="w-5 text-center text-sm font-semibold text-muted-foreground">
              {seller.rank}
            </div>
            <Avatar label={seller.initials} tone={seller.tone} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{seller.name}</div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${seller.progress}%` }}
                />
              </div>
            </div>
            <div className="w-28 text-right">
              <div className="text-sm font-semibold">{seller.total}</div>
              <div className="text-xs text-muted-foreground">
                {adminNextCopy.dashboard.targetProgress(seller.progress)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({ activity }: { activity: DashboardActivity[] }) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-dashboard-activity"
    >
      <h2 className="text-lg font-semibold tracking-normal">
        {adminNextCopy.dashboard.activityTitle}
      </h2>
      <div className="mt-3 divide-y">
        {activity.map((item) => (
          <div className="flex items-center gap-3 py-3" key={item.id}>
            <Avatar icon={<Activity className="size-4" />} tone={item.tone} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{item.label}</div>
              <div className="truncate text-xs text-muted-foreground">{item.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardAiPanel({ signals }: { signals: DashboardSignal[] }) {
  return (
    <aside
      className="rounded-lg border bg-card p-4 text-card-foreground xl:sticky xl:top-20 xl:h-[calc(100vh-7rem)]"
      data-testid="admin-next-dashboard-ai-panel"
    >
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {adminNextCopy.dashboard.aiPanelEyebrow}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <h2 className="text-lg font-semibold tracking-normal">
          {adminNextCopy.dashboard.aiPanelTitle}
        </h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {adminNextCopy.dashboard.aiPanelDescription}
      </p>
      <div className="mt-5 space-y-3">
        {signals.map((signal) => (
          <div className="rounded-lg border bg-muted/40 p-3" key={signal.id}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className={cn('size-2 rounded-full', signalDotClass(signal.tone))} />
              {signal.label}
            </div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              {signal.detail}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function PanelHeader({ title, testId, href }: { title: string; testId: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
      <a
        className="text-sm font-semibold text-primary"
        data-testid={testId}
        href={href}
      >
        {adminNextCopy.dashboard.viewReportAction}
      </a>
    </div>
  );
}

function LegendDot({ label, tone }: { label: string; tone: 'primary' | 'live' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'size-2 rounded-full',
          tone === 'primary' ? 'bg-primary' : 'bg-[var(--bukeer-live)]',
        )}
      />
      {label}
    </span>
  );
}

function ToneBadge({
  tone,
  children,
}: {
  tone: DashboardKpi['tone'] | DashboardReceivable['tone'];
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full border px-2 text-xs font-semibold',
        toneBadgeClass(tone),
      )}
    >
      {children}
    </span>
  );
}

function Avatar({
  label,
  icon,
  tone,
}: {
  label?: string;
  icon?: React.ReactNode;
  tone: DashboardReceivable['tone'] | DashboardSeller['tone'] | DashboardActivity['tone'];
}) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        avatarToneClass(tone),
      )}
    >
      {icon ?? label}
    </div>
  );
}

function initialsFor(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

function toneBadgeClass(tone: DashboardKpi['tone'] | DashboardReceivable['tone']) {
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
      return 'border-border bg-muted text-muted-foreground';
  }
}

function avatarToneClass(
  tone: DashboardReceivable['tone'] | DashboardSeller['tone'] | DashboardActivity['tone'],
) {
  switch (tone) {
    case 'success':
      return 'bg-[var(--bukeer-success)]/10 text-[var(--bukeer-success)]';
    case 'warning':
      return 'bg-[var(--bukeer-human-loop)]/10 text-[var(--bukeer-human-loop)]';
    case 'danger':
      return 'bg-destructive/10 text-destructive';
    case 'live':
      return 'bg-[var(--bukeer-live)]/10 text-[var(--bukeer-live)]';
    case 'primary':
      return 'bg-primary/10 text-primary';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function signalDotClass(tone: DashboardSignal['tone']) {
  switch (tone) {
    case 'danger':
      return 'bg-destructive';
    case 'warning':
      return 'bg-[var(--bukeer-human-loop)]';
    case 'success':
      return 'bg-[var(--bukeer-success)]';
  }
}
