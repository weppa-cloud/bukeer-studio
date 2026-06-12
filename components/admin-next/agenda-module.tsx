"use client";

import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  Bed,
  CalendarDays,
  Car,
  ChevronDown,
  List,
  Plane,
  Search,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  AgendaDay,
  AgendaFixture,
  AgendaService,
  AgendaSignal,
  AgendaTone,
} from '@/lib/admin-next/fixtures/agenda';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

const toneClasses: Record<AgendaTone, string> = {
  primary: 'border-primary/30 bg-primary/10 text-primary',
  live: 'border-[var(--bukeer-live)]/30 bg-[var(--bukeer-live-soft)] text-[var(--bukeer-live)]',
  warning:
    'border-[var(--bukeer-warning)]/30 bg-[var(--bukeer-warning-soft)] text-[var(--bukeer-warning)]',
  success:
    'border-[var(--bukeer-success)]/30 bg-[var(--bukeer-success-soft)] text-[var(--bukeer-success)]',
};

const serviceIcons = {
  flight: Plane,
  hotel: Bed,
  transport: Car,
  activity: Ticket,
} satisfies Record<AgendaService['type'], React.ComponentType<{ className?: string }>>;

export function AgendaModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: AgendaFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  return (
    <AdminShell session={session} activeKey="agenda">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-agenda-root"
        data-theme-preset={evolucionTheme.presetSlug}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <AgendaHeader rangeLabel={fixture.rangeLabel} />
            <AgendaToolbar />
            <div className="space-y-3" data-testid="admin-next-agenda-list">
              {fixture.days.map((day) => (
                <AgendaDayGroup day={day} key={day.id} />
              ))}
            </div>
          </div>
          <AgendaAiPanel signals={fixture.signals} />
        </div>
      </section>
    </AdminShell>
  );
}

function AgendaHeader({ rangeLabel }: { rangeLabel: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.agenda.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.agenda.subtitle}
        </p>
      </div>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
        data-testid="admin-next-agenda-date-range"
        type="button"
      >
        <CalendarDays className="size-4" />
        {rangeLabel}
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}

function AgendaToolbar() {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground lg:flex-row lg:items-center lg:justify-between"
      data-testid="admin-next-agenda-toolbar"
    >
      <div className="flex flex-wrap items-center gap-2">
        {adminNextCopy.agenda.filters.map((filter, index) => (
          <button
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold',
              index === 0
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'bg-background text-muted-foreground',
            )}
            data-testid={`admin-next-agenda-filter-${filter.key}`}
            key={filter.key}
            type="button"
          >
            {index === 0 ? <List className="size-3.5" /> : null}
            {filter.label}
          </button>
        ))}
      </div>
      <div className="flex h-10 min-w-0 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground lg:w-[320px]">
        <Search className="size-4" />
        <span className="truncate">{adminNextCopy.agenda.searchPlaceholder}</span>
      </div>
    </div>
  );
}

function AgendaDayGroup({ day }: { day: AgendaDay }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card text-card-foreground" data-testid={`admin-next-agenda-day-${day.id}`}>
      <div className="flex items-center gap-3 p-4">
        <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <span className="text-base font-semibold leading-none">{day.day}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em]">{day.month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{day.title}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{day.meta}</p>
        </div>
        <ChevronDown className="size-4 text-muted-foreground" />
      </div>
      {day.services.length > 0 ? (
        <div className="divide-y">
          {day.services.map((service) => (
            <AgendaServiceRow key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="border-t p-4 text-sm text-muted-foreground" data-testid={`admin-next-agenda-day-${day.id}-collapsed`}>
          {adminNextCopy.agenda.collapsedDayLabel}
        </div>
      )}
    </section>
  );
}

function AgendaServiceRow({ service }: { service: AgendaService }) {
  const Icon = serviceIcons[service.type];

  return (
    <article
      className="grid gap-3 p-4 lg:grid-cols-[40px_minmax(200px,1fr)_64px_minmax(220px,1fr)_96px] lg:items-center"
      data-testid={`admin-next-agenda-service-${service.id}`}
    >
      <div className={cn('flex size-10 items-center justify-center rounded-md border', toneClasses[service.tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold">{service.title}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {adminNextCopy.agenda.serviceSubline(service.supplier, service.customer)}
        </p>
      </div>
      <div className="text-sm font-semibold text-primary">
        {adminNextCopy.agenda.itineraryLabel(service.itineraryId)}
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge value={service.customerPayment} />
        <StatusBadge value={service.supplierPayment} />
        <StatusBadge value={service.notification} />
      </div>
      <div className="rounded-md border bg-background px-3 py-2 text-right">
        <div className="text-xs text-muted-foreground">{adminNextCopy.agenda.amountLabel}</div>
        <div className="mt-1 text-sm font-semibold">{service.amount}</div>
      </div>
    </article>
  );
}

function AgendaAiPanel({ signals }: { signals: AgendaSignal[] }) {
  return (
    <aside
      className="rounded-lg border bg-card p-4 text-card-foreground xl:sticky xl:top-20 xl:h-[calc(100vh-7rem)]"
      data-testid="admin-next-agenda-ai-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {adminNextCopy.agenda.aiPanelEyebrow}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">
            {adminNextCopy.agenda.aiPanelTitle}
          </h2>
        </div>
        <Sparkles className="size-5 text-primary" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {adminNextCopy.agenda.aiPanelDescription}
      </p>
      <div className="mt-5 space-y-3">
        {signals.map((signal) => (
          <div className="rounded-lg border bg-background p-3" key={signal.id}>
            <span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-semibold', toneClasses[signal.tone])}>
              {signal.label}
            </span>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{signal.detail}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = value.includes('pagado') || value.includes('Notificado') ? 'success' : value.includes('pendiente') ? 'warning' : 'primary';

  return (
    <span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-semibold', toneClasses[tone])}>
      {value}
    </span>
  );
}
