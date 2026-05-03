import type {
  FunnelStage,
  GrowthInventoryRow,
} from '@bukeer/website-contract';
import { StudioBadge } from '@/components/studio/ui/primitives';
import { cn } from '@/lib/utils';

/**
 * Growth Funnel Board — AARRR view (SPEC #337)
 *
 * Server component. Aggregates `GrowthInventoryRow[]` into the six funnel
 * stages and renders metric cards for each stage. Multi-tenant scoped: the
 * caller is responsible for passing rows for a single (account_id, website_id).
 */

interface GrowthFunnelBoardProps {
  rows: GrowthInventoryRow[];
  className?: string;
}

interface StageMetric {
  label: string;
  value: number;
  format: 'number' | 'percent' | 'currency';
  hint?: string;
}

interface StageDef {
  stage: FunnelStage;
  title: string;
  subtitle: string;
  aarrr: string;
}

const STAGE_DEFS: readonly StageDef[] = [
  {
    stage: 'acquisition',
    title: 'Adquisición',
    subtitle: 'Tráfico orgánico y pago',
    aarrr: 'Acquisition',
  },
  {
    stage: 'activation',
    title: 'Activación',
    subtitle: 'WAFlow + WhatsApp',
    aarrr: 'Activation',
  },
  {
    stage: 'qualified_lead',
    title: 'Lead calificado',
    subtitle: 'Contactos viables',
    aarrr: 'Activation',
  },
  {
    stage: 'quote_sent',
    title: 'Cotización',
    subtitle: 'Cotizaciones enviadas',
    aarrr: 'Revenue',
  },
  {
    stage: 'booking',
    title: 'Booking',
    subtitle: 'Reservas confirmadas',
    aarrr: 'Revenue',
  },
  {
    stage: 'review_referral',
    title: 'Reviews & referidos',
    subtitle: 'Retención + Referral',
    aarrr: 'Retention/Referral',
  },
] as const;

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString('es-CO');
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString('es-CO')}`;
}

function formatMetric(value: number, format: StageMetric['format']): string {
  if (format === 'percent') return formatPercent(value);
  if (format === 'currency') return formatCurrency(value);
  return formatNumber(value);
}

function aggregateStage(
  rows: GrowthInventoryRow[],
  stage: FunnelStage
): StageMetric[] {
  const stageRows = rows.filter((row) => row.funnel_stage === stage);

  const sum = (key: keyof GrowthInventoryRow): number =>
    stageRows.reduce((acc, row) => {
      const value = row[key];
      return typeof value === 'number' ? acc + value : acc;
    }, 0);

  const clicks = sum('gsc_clicks_28d');
  const impressions = sum('gsc_impressions_28d');
  const sessions = sum('ga4_sessions_28d');
  const waflowOpens = sum('waflow_opens');
  const waflowSubmits = sum('waflow_submits');
  const whatsappClicks = sum('whatsapp_clicks');
  const qualifiedLeads = sum('qualified_leads');
  const quotesSent = sum('quotes_sent');
  const bookings = sum('bookings_confirmed');
  const bookingValue = sum('booking_value');

  switch (stage) {
    case 'acquisition':
      return [
        { label: 'Clicks 28D', value: clicks, format: 'number' },
        { label: 'Impresiones 28D', value: impressions, format: 'number' },
        { label: 'Sesiones GA4', value: sessions, format: 'number' },
        {
          label: 'CTR promedio',
          value: impressions > 0 ? clicks / impressions : 0,
          format: 'percent',
        },
      ];
    case 'activation':
      return [
        { label: 'WAFlow opens', value: waflowOpens, format: 'number' },
        { label: 'WAFlow submits', value: waflowSubmits, format: 'number' },
        {
          label: 'WhatsApp CTAs',
          value: whatsappClicks,
          format: 'number',
        },
        {
          label: 'Tasa submit',
          value: waflowOpens > 0 ? waflowSubmits / waflowOpens : 0,
          format: 'percent',
        },
      ];
    case 'qualified_lead':
      return [
        { label: 'Leads calificados', value: qualifiedLeads, format: 'number' },
        {
          label: 'Submits → calificados',
          value: waflowSubmits > 0 ? qualifiedLeads / waflowSubmits : 0,
          format: 'percent',
        },
        { label: 'Filas activas', value: stageRows.length, format: 'number' },
      ];
    case 'quote_sent':
      return [
        { label: 'Cotizaciones', value: quotesSent, format: 'number' },
        {
          label: 'Calificados → cotización',
          value: qualifiedLeads > 0 ? quotesSent / qualifiedLeads : 0,
          format: 'percent',
        },
        { label: 'Filas activas', value: stageRows.length, format: 'number' },
      ];
    case 'booking':
      return [
        { label: 'Reservas', value: bookings, format: 'number' },
        { label: 'Valor reservas', value: bookingValue, format: 'currency' },
        {
          label: 'Cotización → booking',
          value: quotesSent > 0 ? bookings / quotesSent : 0,
          format: 'percent',
        },
      ];
    case 'review_referral':
      return [
        { label: 'Filas activas', value: stageRows.length, format: 'number' },
        {
          label: 'Bookings con review',
          value: 0,
          format: 'number',
          hint: 'Pendiente — feed reviews/referidos',
        },
      ];
    default:
      return [];
  }
}

function StageCard({
  def,
  metrics,
  rowCount,
}: {
  def: StageDef;
  metrics: StageMetric[];
  rowCount: number;
}) {
  return (
    <article
      className={cn(
        'studio-card flex flex-col gap-3 p-4',
        'border border-[var(--studio-border)]',
        'dark:border-[var(--studio-border)]'
      )}
      data-stage={def.stage}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">
            {def.title}
          </h3>
          <p className="text-xs text-[var(--studio-text-muted)]">
            {def.subtitle}
          </p>
        </div>
        <StudioBadge tone="info">{def.aarrr}</StudioBadge>
      </header>

      <dl className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border border-[var(--studio-border)]/60 bg-[var(--studio-surface)]/40 px-2 py-1.5"
          >
            <dt className="text-[10px] uppercase tracking-wide text-[var(--studio-text-muted)]">
              {metric.label}
            </dt>
            <dd className="text-base font-semibold text-[var(--studio-text)]">
              {formatMetric(metric.value, metric.format)}
            </dd>
            {metric.hint ? (
              <p className="text-[10px] text-[var(--studio-text-muted)] mt-0.5">
                {metric.hint}
              </p>
            ) : null}
          </div>
        ))}
      </dl>

      <footer className="text-[10px] text-[var(--studio-text-muted)]">
        {rowCount} {rowCount === 1 ? 'fila' : 'filas'} en inventario
      </footer>
    </article>
  );
}

export function GrowthFunnelBoard({ rows, className }: GrowthFunnelBoardProps) {
  return (
    <section
      className={cn('grid gap-3', 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', className)}
      aria-label="Funnel AARRR"
    >
      {STAGE_DEFS.map((def) => {
        const metrics = aggregateStage(rows, def.stage);
        const rowCount = rows.filter((row) => row.funnel_stage === def.stage).length;
        return (
          <StageCard
            key={def.stage}
            def={def}
            metrics={metrics}
            rowCount={rowCount}
          />
        );
      })}
    </section>
  );
}
