'use client';

import type { CSSProperties } from 'react';
import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  Bot,
  CalendarDays,
  Columns3,
  CreditCard,
  Eye,
  List,
  LockKeyhole,
  PlaneTakeoff,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  ItinerariesFixture,
  ItineraryDetailItem,
  ItineraryDetailTab,
  ItineraryPaymentMethod,
  ItineraryPaymentPlan,
  ItineraryStatus,
  ItinerarySummary,
  ItineraryTone,
  ItineraryViewMode,
} from '@/lib/admin-next/fixtures/itineraries';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

const DEFAULT_VIEW: ItineraryViewMode = 'list';
const DEFAULT_STATUS = 'all';
const DEFAULT_OWNER = 'all';
const DEFAULT_DETAIL_TAB: ItineraryDetailTab = 'services';
const DEFAULT_PAYMENT_METHOD: ItineraryPaymentMethod = 'card';
const DETAIL_TABS: ItineraryDetailTab[] = [
  'services',
  'passengers',
  'suppliers',
  'payments',
  'preview',
];

export function ItinerariesModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: ItinerariesFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: CSSProperties;
      dark: CSSProperties;
    };
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedSearchParams = searchParams ?? new URLSearchParams();
  const viewParam = resolvedSearchParams.get('view') as ItineraryViewMode | null;
  const selectedView = viewParam === 'kanban' || viewParam === 'list' ? viewParam : DEFAULT_VIEW;
  const statusParam = resolvedSearchParams.get('status') ?? DEFAULT_STATUS;
  const selectedStatus = isStatusKey(fixture, statusParam) ? statusParam : DEFAULT_STATUS;
  const ownerParam = resolvedSearchParams.get('owner') ?? DEFAULT_OWNER;
  const selectedOwner = fixture.owners.some((owner) => owner.key === ownerParam)
    ? ownerParam
    : DEFAULT_OWNER;
  const visibleItineraries = fixture.itineraries.filter((itinerary) => {
    const matchesStatus = selectedStatus === DEFAULT_STATUS || itinerary.status === selectedStatus;
    const matchesOwner =
      selectedOwner === DEFAULT_OWNER ||
      itinerary.owner.toLowerCase() === selectedOwner.toLowerCase();

    return matchesStatus && matchesOwner;
  });
  const selectedId = resolvedSearchParams.get('selected');
  const selectedItinerary =
    fixture.itineraries.find((itinerary) => itinerary.id === selectedId) ??
    visibleItineraries[0] ??
    fixture.itineraries[0];
  const selectedDetail = selectedItinerary ? fixture.details[selectedItinerary.id] : null;
  const selectedPaymentPlan = selectedItinerary
    ? fixture.paymentPlans[selectedItinerary.id]
    : null;
  const tabParam = resolvedSearchParams.get('tab');
  const activeDetailTab = isDetailTab(tabParam) ? tabParam : DEFAULT_DETAIL_TAB;
  const methodParam = resolvedSearchParams.get('method');
  const selectedPaymentMethod = isPaymentMethod(methodParam)
    ? methodParam
    : DEFAULT_PAYMENT_METHOD;

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
    <AdminShell session={session} activeKey="itineraries">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-itineraries-root"
        data-theme-preset={evolucionTheme.presetSlug}
        data-active-view={selectedView}
        data-active-status={selectedStatus}
        data-active-owner={selectedOwner}
        data-selected-itinerary={selectedItinerary?.id ?? ''}
        data-active-tab={activeDetailTab}
        data-payment-method={selectedPaymentMethod}
        data-visible-itineraries={visibleItineraries.length}
        data-kanban-columns={fixture.statuses.length}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <Header />
            <Controls
              fixture={fixture}
              selectedOwner={selectedOwner}
              selectedStatus={selectedStatus}
              selectedView={selectedView}
              onViewChange={(view) => replaceQuery({ view })}
              onStatusChange={(status) => replaceQuery({ status })}
              onOwnerChange={(owner) => replaceQuery({ owner })}
            />
            {selectedItinerary && selectedDetail ? (
              <ItineraryDetailPanel
                activeTab={activeDetailTab}
                detailItems={selectedDetail[activeDetailTab]}
                itinerary={selectedItinerary}
                paymentMethod={selectedPaymentMethod}
                paymentPlan={selectedPaymentPlan}
                onPaymentMethodChange={(method) => replaceQuery({ method })}
                onTabChange={(tab) => replaceQuery({ selected: selectedItinerary.id, tab })}
              />
            ) : null}
            {selectedView === 'kanban' ? (
              <KanbanBoard fixture={fixture} itineraries={visibleItineraries} />
            ) : (
              <ItineraryList itineraries={visibleItineraries} />
            )}
          </div>
          <ItinerariesAiPanel fixture={fixture} />
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
          {adminNextCopy.itineraries.eyebrow}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.itineraries.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.itineraries.subtitle}
        </p>
      </div>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
        data-testid="admin-next-itineraries-new"
        type="button"
      >
        <Plus className="size-4" />
        {adminNextCopy.itineraries.newAction}
      </button>
    </header>
  );
}

function Controls({
  fixture,
  selectedOwner,
  selectedStatus,
  selectedView,
  onViewChange,
  onStatusChange,
  onOwnerChange,
}: {
  fixture: ItinerariesFixture;
  selectedOwner: string;
  selectedStatus: string;
  selectedView: ItineraryViewMode;
  onViewChange: (view: ItineraryViewMode) => void;
  onStatusChange: (status: string) => void;
  onOwnerChange: (owner: string) => void;
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-itineraries-controls"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Search className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">{adminNextCopy.itineraries.filtersTitle}</h2>
            <p className="text-xs text-muted-foreground">
              {adminNextCopy.itineraries.urlStateDescription}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={viewButtonClass(selectedView === 'list')}
            data-active={selectedView === 'list'}
            data-testid="admin-next-itineraries-view-list"
            type="button"
            onClick={() => onViewChange('list')}
          >
            <List className="size-4" />
            {adminNextCopy.itineraries.listAction}
          </button>
          <button
            className={viewButtonClass(selectedView === 'kanban')}
            data-active={selectedView === 'kanban'}
            data-testid="admin-next-itineraries-view-kanban"
            type="button"
            onClick={() => onViewChange('kanban')}
          >
            <Columns3 className="size-4" />
            {adminNextCopy.itineraries.kanbanAction}
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={filterButtonClass(selectedStatus === DEFAULT_STATUS)}
          data-active={selectedStatus === DEFAULT_STATUS}
          data-testid="admin-next-itineraries-status-all"
          type="button"
          onClick={() => onStatusChange(DEFAULT_STATUS)}
        >
          {adminNextCopy.itineraries.allStatusesLabel}
        </button>
        {fixture.statuses.map((status) => (
          <button
            className={filterButtonClass(selectedStatus === status.id)}
            data-active={selectedStatus === status.id}
            data-testid={`admin-next-itineraries-status-${status.id}`}
            key={status.id}
            type="button"
            onClick={() => onStatusChange(status.id)}
          >
            {status.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {fixture.owners.map((owner) => (
          <button
            className={filterButtonClass(selectedOwner === owner.key)}
            data-active={selectedOwner === owner.key}
            data-testid={`admin-next-itineraries-owner-${owner.key}`}
            key={owner.key}
            type="button"
            onClick={() => onOwnerChange(owner.key)}
          >
            {owner.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function ItineraryDetailPanel({
  activeTab,
  detailItems,
  itinerary,
  paymentMethod,
  paymentPlan,
  onPaymentMethodChange,
  onTabChange,
}: {
  activeTab: ItineraryDetailTab;
  detailItems: ItineraryDetailItem[];
  itinerary: ItinerarySummary;
  paymentMethod: ItineraryPaymentMethod;
  paymentPlan: ItineraryPaymentPlan | null;
  onPaymentMethodChange: (method: ItineraryPaymentMethod) => void;
  onTabChange: (tab: ItineraryDetailTab) => void;
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-active-tab={activeTab}
      data-itinerary-id={itinerary.id}
      data-testid="admin-next-itinerary-detail"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {adminNextCopy.itineraries.detailSelectedLabel}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">
            {adminNextCopy.itineraries.detailTitle} · {itinerary.code}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {itinerary.title} · {adminNextCopy.itineraries.detailSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToneBadge tone={statusTone(itinerary.status)}>
            {adminNextCopy.itineraries.statusLabels[itinerary.status]}
          </ToneBadge>
          <ToneBadge tone={itinerary.marginTone}>
            {adminNextCopy.itineraries.marginLabel} {itinerary.margin}
          </ToneBadge>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {DETAIL_TABS.map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className={filterButtonClass(activeTab === tab)}
            data-active={activeTab === tab}
            data-testid={`admin-next-itinerary-tab-${tab}`}
            key={tab}
            role="tab"
            type="button"
            onClick={() => onTabChange(tab)}
          >
            {adminNextCopy.itineraries.detailTabLabels[tab]}
          </button>
        ))}
      </div>
      <div
        className="mt-4 grid gap-3 md:grid-cols-2"
        data-testid={`admin-next-itinerary-tab-panel-${activeTab}`}
        role="tabpanel"
      >
        {detailItems.map((item) => (
          <article className="rounded-lg border bg-background p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{item.label}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              </div>
              <ToneBadge tone={item.tone}>{item.value}</ToneBadge>
            </div>
            {item.locked ? (
              <div
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                data-testid={`admin-next-itinerary-payment-locked-${item.id}`}
              >
                <LockKeyhole className="size-3.5" />
                {adminNextCopy.itineraries.lockedPaymentLabel}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {activeTab === 'payments' && paymentPlan ? (
        <PaymentPlanPanel
          paymentMethod={paymentMethod}
          paymentPlan={paymentPlan}
          onPaymentMethodChange={onPaymentMethodChange}
        />
      ) : null}
    </section>
  );
}

function PaymentPlanPanel({
  paymentMethod,
  paymentPlan,
  onPaymentMethodChange,
}: {
  paymentMethod: ItineraryPaymentMethod;
  paymentPlan: ItineraryPaymentPlan;
  onPaymentMethodChange: (method: ItineraryPaymentMethod) => void;
}) {
  const selectedMethod =
    paymentPlan.methods.find((method) => method.id === paymentMethod) ??
    paymentPlan.methods[0];

  return (
    <section
      className="mt-4 rounded-lg border bg-background p-4"
      data-fee-included={selectedMethod.feeIncluded}
      data-payment-method={selectedMethod.id}
      data-testid="admin-next-itinerary-payment-plan"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="size-4 text-primary" />
            {adminNextCopy.itineraries.paymentMethodTitle}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {adminNextCopy.itineraries.paymentMethodSubtitle}
          </p>
        </div>
        <button
          className="inline-flex h-8 items-center rounded-md border bg-card px-3 text-xs font-semibold text-primary"
          data-testid="admin-next-itinerary-regenerate-pending"
          type="button"
        >
          {adminNextCopy.itineraries.regeneratePendingAction}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {paymentPlan.methods.map((method) => (
          <button
            className={filterButtonClass(selectedMethod.id === method.id)}
            data-active={selectedMethod.id === method.id}
            data-testid={`admin-next-itinerary-payment-method-${method.id}`}
            key={method.id}
            type="button"
            onClick={() => onPaymentMethodChange(method.id)}
          >
            {method.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MetricCard
          label={adminNextCopy.itineraries.paymentFeeLabel}
          tone={selectedMethod.tone}
          value={selectedMethod.fee}
        />
        <MetricCard
          label={adminNextCopy.itineraries.paymentTotalLabel}
          tone="primary"
          value={selectedMethod.total}
        />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {adminNextCopy.itineraries.installmentsTitle}
      </h3>
      <div className="mt-3 grid gap-2">
        {paymentPlan.installments.map((installment) => (
          <article
            className="grid gap-2 rounded-md border bg-card p-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
            data-locked={installment.locked}
            data-status={installment.status}
            data-testid={`admin-next-itinerary-installment-${installment.id}`}
            key={installment.id}
          >
            <div>
              <div className="text-sm font-semibold">{installment.label}</div>
              <div className="text-xs text-muted-foreground">{installment.dueDate}</div>
            </div>
            <div className="text-sm font-semibold">{installment.amount}</div>
            <ToneBadge tone={installment.tone}>
              {adminNextCopy.itineraries.installmentStatusLabels[installment.status]}
            </ToneBadge>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: ItineraryTone;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1">
        <ToneBadge tone={tone}>{value}</ToneBadge>
      </div>
    </div>
  );
}

function ItineraryList({ itineraries }: { itineraries: ItinerarySummary[] }) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-itineraries-list"
    >
      <h2 className="text-lg font-semibold tracking-normal">{adminNextCopy.itineraries.listTitle}</h2>
      <div className="mt-4 space-y-3">
        {itineraries.map((itinerary) => (
          <ItineraryRow itinerary={itinerary} key={itinerary.id} />
        ))}
      </div>
    </section>
  );
}

function ItineraryRow({ itinerary }: { itinerary: ItinerarySummary }) {
  return (
    <article
      className="grid gap-3 rounded-lg border bg-background p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)_auto]"
      data-testid={`admin-next-itinerary-row-${itinerary.id}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge tone={statusTone(itinerary.status)}>
            {adminNextCopy.itineraries.statusLabels[itinerary.status]}
          </ToneBadge>
          <span className="text-xs font-semibold text-muted-foreground">{itinerary.code}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold">{itinerary.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {itinerary.customer} · {itinerary.destination}
        </p>
      </div>
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <Metric icon={<CalendarDays className="size-3.5" />} label={adminNextCopy.itineraries.dayLabel(itinerary.days)} />
        <Metric icon={<Users className="size-3.5" />} label={adminNextCopy.itineraries.paxLabel(itinerary.pax)} />
        <Metric icon={<PlaneTakeoff className="size-3.5" />} label={adminNextCopy.itineraries.servicesLabel(itinerary.services)} />
        <Metric icon={<CreditCard className="size-3.5" />} label={adminNextCopy.itineraries.paymentsLabel(itinerary.paidInstallments, itinerary.totalInstallments)} />
      </div>
      <div className="flex flex-col gap-2 lg:items-end">
        <div className="text-sm font-semibold">{itinerary.value}</div>
        <ToneBadge tone={itinerary.marginTone}>
          {adminNextCopy.itineraries.marginLabel} {itinerary.margin}
        </ToneBadge>
        <a
          className="inline-flex h-8 items-center gap-2 rounded-md border bg-card px-3 text-xs font-semibold text-primary"
          data-testid={`admin-next-itinerary-open-${itinerary.id}`}
          href={itinerary.href}
        >
          <Eye className="size-3.5" />
          {adminNextCopy.itineraries.openDetailAction}
        </a>
      </div>
    </article>
  );
}

function KanbanBoard({
  fixture,
  itineraries,
}: {
  fixture: ItinerariesFixture;
  itineraries: ItinerarySummary[];
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-itineraries-kanban"
    >
      <h2 className="text-lg font-semibold tracking-normal">
        {adminNextCopy.itineraries.kanbanTitle}
      </h2>
      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {fixture.statuses.map((column) => {
          const items = itineraries.filter((itinerary) => itinerary.status === column.id);

          return (
            <div
              className="min-h-[240px] rounded-lg border bg-background p-3"
              data-testid={`admin-next-itineraries-kanban-${column.id}`}
              key={column.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{column.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {column.description}
                  </p>
                </div>
                <span className="rounded-md border bg-card px-2 py-1 text-xs font-semibold">
                  {items.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {items.map((itinerary) => (
                  <KanbanCard itinerary={itinerary} key={itinerary.id} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function KanbanCard({ itinerary }: { itinerary: ItinerarySummary }) {
  return (
    <article
      className="rounded-md border bg-card p-3"
      data-testid={`admin-next-itinerary-card-${itinerary.id}`}
    >
      <div className="text-xs font-semibold text-muted-foreground">{itinerary.code}</div>
      <h4 className="mt-1 text-sm font-semibold">{itinerary.title}</h4>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{itinerary.customer}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ToneBadge tone={itinerary.marginTone}>
          {adminNextCopy.itineraries.marginLabel} {itinerary.margin}
        </ToneBadge>
        <ToneBadge tone="live">{itinerary.value}</ToneBadge>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{itinerary.risk}</p>
    </article>
  );
}

function ItinerariesAiPanel({ fixture }: { fixture: ItinerariesFixture }) {
  return (
    <aside
      className="rounded-lg border bg-card p-4 text-card-foreground xl:sticky xl:top-20 xl:self-start"
      data-testid="admin-next-itineraries-ai-panel"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        <Bot className="size-4" />
        {adminNextCopy.itineraries.aiPanelEyebrow}
      </div>
      <h2 className="mt-2 text-lg font-semibold">{adminNextCopy.itineraries.aiPanelTitle}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {adminNextCopy.itineraries.aiPanelDescription}
      </p>
      <div className="mt-4 space-y-2">
        {fixture.signals.map((signal) => (
          <article className="rounded-md border bg-background p-3" key={signal.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{signal.label}</div>
              <ToneBadge tone={signal.tone}>{signal.value}</ToneBadge>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{signal.detail}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}

function Metric({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      {label}
    </div>
  );
}

function ToneBadge({ tone, children }: { tone: ItineraryTone; children: React.ReactNode }) {
  return (
    <span className={cn('rounded-md border px-2 py-1 text-xs font-semibold', toneClass(tone))}>
      {children}
    </span>
  );
}

function filterButtonClass(active: boolean) {
  return cn(
    'h-8 rounded-md border px-3 text-xs font-semibold',
    active ? 'border-primary/40 bg-primary/10 text-primary' : 'bg-background text-muted-foreground',
  );
}

function viewButtonClass(active: boolean) {
  return cn(
    'inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold',
    active ? 'border-primary/40 bg-primary/10 text-primary' : 'bg-background text-muted-foreground',
  );
}

function isStatusKey(fixture: ItinerariesFixture, value: string): value is ItineraryStatus | 'all' {
  return value === DEFAULT_STATUS || fixture.statuses.some((status) => status.id === value);
}

function isDetailTab(value: string | null): value is ItineraryDetailTab {
  return DETAIL_TABS.some((tab) => tab === value);
}

function isPaymentMethod(value: string | null): value is ItineraryPaymentMethod {
  return value === 'card' || value === 'bank_transfer' || value === 'cash';
}

function statusTone(status: ItineraryStatus): ItineraryTone {
  switch (status) {
    case 'draft':
      return 'warning';
    case 'quoted':
      return 'primary';
    case 'won':
      return 'success';
    case 'operating':
      return 'live';
    case 'closed':
      return 'primary';
  }
}

function toneClass(tone: ItineraryTone) {
  switch (tone) {
    case 'success':
      return 'border-[hsl(var(--bukeer-success)/0.32)] bg-[hsl(var(--bukeer-success)/0.12)] text-[hsl(var(--bukeer-success))]';
    case 'warning':
      return 'border-[hsl(var(--bukeer-warning)/0.32)] bg-[hsl(var(--bukeer-warning)/0.12)] text-[hsl(var(--bukeer-warning))]';
    case 'danger':
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    case 'live':
      return 'border-[hsl(var(--bukeer-live)/0.32)] bg-[hsl(var(--bukeer-live)/0.12)] text-[hsl(var(--bukeer-live))]';
    case 'primary':
    default:
      return 'border-primary/30 bg-primary/10 text-primary';
  }
}
