'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  AlertTriangle,
  Bot,
  CreditCard,
  Landmark,
  Link2,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  PaymentBatchId,
  PaymentDueItem,
  PaymentKpi,
  PaymentMethodFamily,
  PaymentMovement,
  PaymentTone,
  PaymentsFixture,
} from '@/lib/admin-next/fixtures/payments';
import {
  buildStripeCheckoutMetadata,
  calculateStripeCheckoutAmount,
  DEFAULT_STRIPE_PAYMENT_CONTRACT,
} from '@/lib/admin-next/payments-stripe-contract';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

const DEFAULT_METHOD: PaymentMethodFamily = 'card';
const DEFAULT_BATCH: PaymentBatchId = 'collect';

export function PaymentsModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: PaymentsFixture;
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
  const requestedMethod = resolvedSearchParams.get('method') as PaymentMethodFamily | null;
  const requestedBatch = resolvedSearchParams.get('batch') as PaymentBatchId | null;
  const selectedMethod = fixture.methods.some((method) => method.key === requestedMethod)
    ? (requestedMethod ?? DEFAULT_METHOD)
    : DEFAULT_METHOD;
  const selectedBatch = fixture.batches.some((batch) => batch.key === requestedBatch)
    ? (requestedBatch ?? DEFAULT_BATCH)
    : DEFAULT_BATCH;
  const canManagePayments = session.permissions.includes(
    DEFAULT_STRIPE_PAYMENT_CONTRACT.serverPermission,
  );
  const draft = useMemo(
    () => ({
      accountId: fixture.accountPaymentConfig.accountId,
      itineraryId: fixture.collectBatch.itineraryId,
      installmentIds: fixture.collectBatch.invoiceIds,
      baseAmountMinor: fixture.collectBatch.baseAmountMinor,
      currency: fixture.collectBatch.currency,
      mode: fixture.accountPaymentConfig.mode,
      paymentMethodFamily: selectedMethod,
      approvedByUserId: fixture.collectBatch.approvedByUserId,
      approvalTraceId: fixture.collectBatch.approvalTraceId,
    }),
    [fixture.accountPaymentConfig, fixture.collectBatch, selectedMethod],
  );
  const checkoutAmount = useMemo(
    () =>
      calculateStripeCheckoutAmount({
        config: fixture.accountPaymentConfig,
        draft,
      }),
    [draft, fixture.accountPaymentConfig],
  );
  const metadata = useMemo(
    () => buildStripeCheckoutMetadata({ draft, amount: checkoutAmount }),
    [draft, checkoutAmount],
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
    <AdminShell session={session} activeKey="payments">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-payments-root"
        data-theme-preset={evolucionTheme.presetSlug}
        data-active-method={selectedMethod}
        data-active-batch={selectedBatch}
        data-stripe-mode={fixture.accountPaymentConfig.mode}
        data-base-amount-minor={checkoutAmount.baseAmountMinor}
        data-fee-amount-minor={checkoutAmount.feeAmountMinor}
        data-total-amount-minor={checkoutAmount.totalAmountMinor}
        data-fee-included-in-customer-total={checkoutAmount.feeIncludedInCustomerTotal}
        data-payments-manage={canManagePayments}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <Header />
            <Controls
              fixture={fixture}
              selectedMethod={selectedMethod}
              selectedBatch={selectedBatch}
              onMethodChange={(method) => replaceQuery({ method })}
              onBatchChange={(batch) => replaceQuery({ batch })}
            />
            <KpiGrid kpis={fixture.kpis} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
              <BatchPanel
                fixture={fixture}
                amount={checkoutAmount}
                canManagePayments={canManagePayments}
                metadata={metadata}
                selectedMethod={selectedMethod}
              />
              <SupplierPanel fixture={fixture} canManagePayments={canManagePayments} />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <DueList items={fixture.dueItems} />
              <MovementList movements={fixture.movements} />
            </div>
          </div>
          <PaymentsAiPanel
            fixture={fixture}
            canManagePayments={canManagePayments}
            selectedMethod={selectedMethod}
          />
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
          {adminNextCopy.payments.eyebrow}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.payments.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{adminNextCopy.payments.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill
          icon={<ShieldCheck className="size-3.5" />}
          label={adminNextCopy.payments.approvalRequiredLabel}
        />
        <Pill
          icon={<CreditCard className="size-3.5" />}
          label={adminNextCopy.payments.checkoutSurfaceLabel}
        />
      </div>
    </header>
  );
}

function Controls({
  fixture,
  selectedMethod,
  selectedBatch,
  onMethodChange,
  onBatchChange,
}: {
  fixture: PaymentsFixture;
  selectedMethod: PaymentMethodFamily;
  selectedBatch: PaymentBatchId;
  onMethodChange: (method: PaymentMethodFamily) => void;
  onBatchChange: (batch: PaymentBatchId) => void;
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-payments-controls"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <WalletCards className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">{adminNextCopy.payments.methodLabel}</h2>
            <p className="text-xs text-muted-foreground">
              {adminNextCopy.payments.urlStateDescription}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {fixture.methods.map((method) => (
            <button
              className={cn(
                'h-8 rounded-md border px-3 text-xs font-semibold',
                method.key === selectedMethod
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'bg-background text-muted-foreground',
              )}
              data-active={method.key === selectedMethod}
              data-testid={`admin-next-payments-method-${method.key}`}
              key={method.key}
              type="button"
              onClick={() => onMethodChange(method.key)}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {fixture.batches.map((batch) => (
          <button
            className={cn(
              'h-8 rounded-md border px-3 text-xs font-semibold',
              batch.key === selectedBatch
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'bg-background text-muted-foreground',
            )}
            data-active={batch.key === selectedBatch}
            data-testid={`admin-next-payments-batch-${batch.key}`}
            key={batch.key}
            type="button"
            onClick={() => onBatchChange(batch.key)}
          >
            {batch.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function KpiGrid({ kpis }: { kpis: PaymentKpi[] }) {
  return (
    <section
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      data-testid="admin-next-payments-kpis"
    >
      {kpis.map((kpi) => (
        <article className="rounded-lg border bg-card p-4 text-card-foreground" key={kpi.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{kpi.label}</div>
            <span
              className={cn('rounded-md border px-2 py-1 text-xs font-medium', toneClass(kpi.tone))}
            >
              {kpi.value}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{kpi.detail}</p>
        </article>
      ))}
    </section>
  );
}

function BatchPanel({
  fixture,
  amount,
  canManagePayments,
  metadata,
  selectedMethod,
}: {
  fixture: PaymentsFixture;
  amount: ReturnType<typeof calculateStripeCheckoutAmount>;
  canManagePayments: boolean;
  metadata: ReturnType<typeof buildStripeCheckoutMetadata>;
  selectedMethod: PaymentMethodFamily;
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-payments-collect-batch"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {adminNextCopy.payments.collectBatchLabel}
          </div>
          <h2 className="mt-1 text-lg font-semibold">{adminNextCopy.payments.collectTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{fixture.collectBatch.customer}</p>
        </div>
        <Link2 className="size-5 text-primary" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric
          label={adminNextCopy.payments.baseLabel}
          value={formatCurrency(amount.baseAmountMinor, amount.currency)}
        />
        <Metric
          label={adminNextCopy.payments.feeLabel}
          value={formatCurrency(amount.feeAmountMinor, amount.currency)}
        />
        <Metric
          label={adminNextCopy.payments.totalLabel}
          value={formatCurrency(amount.totalAmountMinor, amount.currency)}
        />
      </div>
      <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3">
          <span>
            {adminNextCopy.payments.invoicesLabel(fixture.collectBatch.invoiceIds.length)}
          </span>
          <span className="font-medium text-foreground">{metadata.installment_ids}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3">
          <span>{adminNextCopy.payments.methodLabels[selectedMethod]}</span>
          <span className="font-medium text-foreground">
            {amount.feeIncludedInCustomerTotal
              ? adminNextCopy.payments.feeIncludedLabel
              : adminNextCopy.payments.feeNotIncludedLabel}
          </span>
        </div>
      </div>
      <button
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-55"
        data-testid="admin-next-payments-create-link"
        disabled={!canManagePayments}
        type="button"
      >
        <CreditCard className="size-4" />
        {canManagePayments
          ? adminNextCopy.payments.createLinkAction
          : adminNextCopy.payments.readOnlyAction}
      </button>
    </section>
  );
}

function SupplierPanel({
  fixture,
  canManagePayments,
}: {
  fixture: PaymentsFixture;
  canManagePayments: boolean;
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-payments-supplier-batch"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {adminNextCopy.payments.supplierBatchLabel}
          </div>
          <h2 className="mt-1 text-lg font-semibold">{adminNextCopy.payments.supplierTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{fixture.supplierBatch.supplier}</p>
        </div>
        <Landmark className="size-5 text-primary" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Metric label={adminNextCopy.payments.totalLabel} value={fixture.supplierBatch.amount} />
        <Metric
          label={adminNextCopy.payments.reservationsLabel(
            fixture.supplierBatch.reservationIds.length,
          )}
          value={fixture.supplierBatch.status}
        />
      </div>
      <div className="mt-4 rounded-md border bg-background p-3 text-xs">
        <div className="text-muted-foreground">{adminNextCopy.payments.supplierReferenceLabel}</div>
        <div className="mt-1 font-semibold text-foreground">{fixture.supplierBatch.reference}</div>
      </div>
      <button
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-55"
        data-testid="admin-next-payments-prepare-payment"
        disabled={!canManagePayments}
        type="button"
      >
        <ReceiptText className="size-4" />
        {canManagePayments
          ? adminNextCopy.payments.preparePaymentAction
          : adminNextCopy.payments.readOnlyAction}
      </button>
    </section>
  );
}

function DueList({ items }: { items: PaymentDueItem[] }) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-payments-due-list"
    >
      <h2 className="text-sm font-semibold">{adminNextCopy.payments.dueTitle}</h2>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <article className="rounded-md border bg-background p-3" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{item.itinerary}</div>
                <p className="text-xs text-muted-foreground">{item.customer}</p>
              </div>
              <span
                className={cn(
                  'rounded-md border px-2 py-1 text-xs font-medium',
                  toneClass(item.tone),
                )}
              >
                {item.amount}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{item.dueDate}</span>
              <span>{item.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MovementList({ movements }: { movements: PaymentMovement[] }) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-payments-movements"
    >
      <h2 className="text-sm font-semibold">{adminNextCopy.payments.movementsTitle}</h2>
      <div className="mt-3 space-y-2">
        {movements.map((movement) => (
          <article className="rounded-md border bg-background p-3" key={movement.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{movement.label}</div>
                <p className="text-xs text-muted-foreground">{movement.owner}</p>
              </div>
              <span
                className={cn(
                  'rounded-md border px-2 py-1 text-xs font-medium',
                  toneClass(movement.tone),
                )}
              >
                {movement.amount}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{movement.method}</span>
              <span>{movement.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PaymentsAiPanel({
  fixture,
  canManagePayments,
  selectedMethod,
}: {
  fixture: PaymentsFixture;
  canManagePayments: boolean;
  selectedMethod: PaymentMethodFamily;
}) {
  return (
    <aside
      className="rounded-lg border bg-card p-4 text-card-foreground xl:sticky xl:top-20 xl:self-start"
      data-testid="admin-next-payments-ai-panel"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        <Bot className="size-4" />
        {adminNextCopy.payments.aiPanelEyebrow}
      </div>
      <h2 className="mt-2 text-lg font-semibold">{adminNextCopy.payments.aiPanelTitle}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {adminNextCopy.payments.aiPanelDescription}
      </p>
      <div className="mt-4 space-y-2">
        {fixture.aiSignals.map((signal) => (
          <article className="rounded-md border bg-background p-3" key={signal.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{signal.label}</div>
              <span
                className={cn(
                  'rounded-md border px-2 py-1 text-xs font-medium',
                  toneClass(signal.tone),
                )}
              >
                {signal.value}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{signal.detail}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 rounded-md border bg-background p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <AlertTriangle className="size-4 text-primary" />
          {adminNextCopy.payments.permissionLabel}
        </div>
        <div className="mt-2">
          {canManagePayments ? fixture.accountPaymentConfig.accountId : selectedMethod}
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-md border bg-muted px-3 text-xs font-semibold text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function formatCurrency(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor);
}

function toneClass(tone: PaymentTone) {
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
