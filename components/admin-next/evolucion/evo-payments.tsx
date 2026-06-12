import type {
  PaymentBatchId,
  PaymentDueItem,
  PaymentKpi,
  PaymentMethodFamily,
  PaymentMovement,
  PaymentTone,
  PaymentsFixture,
} from "@/lib/admin-next/fixtures/payments";
import {
  buildStripeCheckoutMetadata,
  calculateStripeCheckoutAmount,
  DEFAULT_STRIPE_PAYMENT_CONTRACT,
} from "@/lib/admin-next/payments-stripe-contract";
import { EvoDataState } from "./evo-data-state";
import { EvoIcon, type EvoIconName } from "./icons";

const DEFAULT_METHOD: PaymentMethodFamily = "card";
const DEFAULT_BATCH: PaymentBatchId = "collect";

const KPI_ICON: Record<string, EvoIconName> = {
  margin: "trend",
  payable: "wallet",
  receivable: "card",
  stripe: "spark",
};

const TONE_CHIP: Record<PaymentTone, string> = {
  danger: "chip red",
  live: "chip teal",
  primary: "chip purple",
  success: "chip green",
  warning: "chip orange",
};

export function EvoPayments({
  fixture,
  searchParams = {},
  canManagePayments = true,
}: {
  fixture: PaymentsFixture;
  searchParams?: {
    batch?: string;
    method?: string;
  };
  canManagePayments?: boolean;
}) {
  const selectedMethod = fixture.methods.some(
    (method) => method.key === searchParams.method,
  )
    ? (searchParams.method as PaymentMethodFamily)
    : DEFAULT_METHOD;
  const selectedBatch = fixture.batches.some(
    (batch) => batch.key === searchParams.batch,
  )
    ? (searchParams.batch as PaymentBatchId)
    : DEFAULT_BATCH;

  const draft = {
    accountId: fixture.accountPaymentConfig.accountId,
    approvedByUserId: fixture.collectBatch.approvedByUserId,
    approvalTraceId: fixture.collectBatch.approvalTraceId,
    baseAmountMinor: fixture.collectBatch.baseAmountMinor,
    currency: fixture.collectBatch.currency,
    installmentIds: fixture.collectBatch.invoiceIds,
    itineraryId: fixture.collectBatch.itineraryId,
    mode: fixture.accountPaymentConfig.mode,
    paymentMethodFamily: selectedMethod,
  };
  const checkoutAmount = calculateStripeCheckoutAmount({
    config: fixture.accountPaymentConfig,
    draft,
  });
  const metadata = buildStripeCheckoutMetadata({
    amount: checkoutAmount,
    draft,
  });
  const hasPaymentsData =
    fixture.kpis.length > 0 ||
    fixture.dueItems.length > 0 ||
    fixture.movements.length > 0;

  if (!hasPaymentsData) {
    return (
      <>
        <PaymentsHeader
          canManagePayments={canManagePayments}
          mode={fixture.accountPaymentConfig.mode}
        />
        <EvoDataState
          kind="empty"
          title="Sin datos de tesoreria"
          description="No hay cobros, cuotas ni movimientos visibles para esta cuenta. Cuando Supabase sincronice pagos, este flujo se mantiene operativo."
          testId="admin-next-payments-empty"
        />
      </>
    );
  }

  return (
    <>
      <PaymentsHeader
        canManagePayments={canManagePayments}
        mode={fixture.accountPaymentConfig.mode}
      />

      <section
        data-active-batch={selectedBatch}
        data-active-method={selectedMethod}
        data-base-amount-minor={checkoutAmount.baseAmountMinor}
        data-fee-amount-minor={checkoutAmount.feeAmountMinor}
        data-fee-included-in-customer-total={
          checkoutAmount.feeIncludedInCustomerTotal
        }
        data-payments-manage={canManagePayments}
        data-stripe-mode={fixture.accountPaymentConfig.mode}
        data-testid="admin-next-payments-root"
        data-total-amount-minor={checkoutAmount.totalAmountMinor}
      >
        <PaymentControls
          batches={fixture.batches}
          methods={fixture.methods}
          selectedBatch={selectedBatch}
          selectedMethod={selectedMethod}
        />

        <section className="kpis" data-testid="admin-next-payments-kpis">
          {fixture.kpis.map((kpi) => (
            <PaymentKpiCard key={kpi.id} kpi={kpi} />
          ))}
        </section>

        <div className="iti-grid">
          <section className="iti-col">
            <CollectPanel
              amount={checkoutAmount}
              canManagePayments={canManagePayments}
              fixture={fixture}
              metadata={metadata}
              selectedMethod={selectedMethod}
            />
            <SupplierPanel
              canManagePayments={canManagePayments}
              fixture={fixture}
            />
            <DueList items={fixture.dueItems} />
            <MovementList movements={fixture.movements} />
          </section>

          <AiPanel
            canManagePayments={canManagePayments}
            fixture={fixture}
            selectedMethod={selectedMethod}
          />
        </div>
      </section>
    </>
  );
}

function PaymentsHeader({
  canManagePayments,
  mode,
}: {
  canManagePayments: boolean;
  mode: string;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>Pagos</h1>
        <div className="sub">
          Tesoreria · cobros cliente, pagos proveedor y Stripe {mode}
        </div>
      </div>
      <div className="actions">
        <span className="btn outline" data-testid="admin-next-payments-mode">
          <EvoIcon name="card" size={15} /> Stripe {mode}
        </span>
        <span
          className={canManagePayments ? "btn primary" : "btn outline"}
          data-testid="admin-next-payments-permission"
        >
          <EvoIcon name={canManagePayments ? "check" : "sliders"} size={15} />{" "}
          {canManagePayments ? "Permiso activo" : "Solo lectura"}
        </span>
      </div>
    </div>
  );
}

function PaymentControls({
  batches,
  methods,
  selectedBatch,
  selectedMethod,
}: {
  batches: PaymentsFixture["batches"];
  methods: PaymentsFixture["methods"];
  selectedBatch: PaymentBatchId;
  selectedMethod: PaymentMethodFamily;
}) {
  return (
    <div className="filterbar" data-testid="admin-next-payments-controls">
      {methods.map((method) => (
        <a
          className={`fchip${method.key === selectedMethod ? " on" : ""}`}
          data-active={method.key === selectedMethod}
          data-testid={`admin-next-payments-method-${method.key}`}
          href={`/admin/payments?method=${method.key}&batch=${selectedBatch}`}
          key={method.key}
          title={method.detail}
        >
          <EvoIcon name={method.key === "card" ? "card" : "wallet"} size={12} />{" "}
          {method.label}
        </a>
      ))}
      {batches.map((batch) => (
        <a
          className={`fchip${batch.key === selectedBatch ? " on" : ""}`}
          data-active={batch.key === selectedBatch}
          data-testid={`admin-next-payments-batch-${batch.key}`}
          href={`/admin/payments?method=${selectedMethod}&batch=${batch.key}`}
          key={batch.key}
        >
          {batch.label}
        </a>
      ))}
    </div>
  );
}

function PaymentKpiCard({ kpi }: { kpi: PaymentKpi }) {
  return (
    <article
      className="card kpi"
      data-testid={`admin-next-payment-kpi-${kpi.id}`}
    >
      <div className="lbl">
        <EvoIcon name={KPI_ICON[kpi.id] ?? "trend"} size={15} />
        <span>{kpi.label}</span>
      </div>
      <div className="val">{kpi.value}</div>
      <div className="meta">
        <span className={chipForTone(kpi.tone)}>{kpi.tone}</span>
        <span>{kpi.detail}</span>
      </div>
    </article>
  );
}

function CollectPanel({
  amount,
  canManagePayments,
  fixture,
  metadata,
  selectedMethod,
}: {
  amount: ReturnType<typeof calculateStripeCheckoutAmount>;
  canManagePayments: boolean;
  fixture: PaymentsFixture;
  metadata: ReturnType<typeof buildStripeCheckoutMetadata>;
  selectedMethod: PaymentMethodFamily;
}) {
  return (
    <section className="card" data-testid="admin-next-payments-collect-batch">
      <div className="card-head">
        <h3>Cobro cliente</h3>
        <span className="chip purple">
          {fixture.collectBatch.invoiceIds.length} cuotas
        </span>
      </div>
      <div className="grp-head">
        <div className="svc-ico">
          <EvoIcon name="card" size={15} />
        </div>
        <div className="t">
          <b>{fixture.collectBatch.customer}</b>
          <span>
            {metadata.installment_ids} ·{" "}
            {DEFAULT_STRIPE_PAYMENT_CONTRACT.checkoutSurface}
          </span>
        </div>
        <div className="amt2">
          <div className="v">
            {formatCurrency(amount.totalAmountMinor, amount.currency)}
          </div>
          <div className="k">Total link</div>
        </div>
      </div>
      <div className="bal-grid">
        <Metric
          label="Base"
          value={formatCurrency(amount.baseAmountMinor, amount.currency)}
        />
        <Metric
          label="Fee"
          value={formatCurrency(amount.feeAmountMinor, amount.currency)}
        />
        <Metric
          label="Metodo"
          value={selectedMethod === "card" ? "Tarjeta" : "Transferencia"}
        />
      </div>
      <div className="actions">
        <button
          className="btn primary"
          data-testid="admin-next-payments-create-link"
          disabled={!canManagePayments}
          type="button"
        >
          <EvoIcon name="share" size={15} /> Crear link
        </button>
      </div>
    </section>
  );
}

function SupplierPanel({
  canManagePayments,
  fixture,
}: {
  canManagePayments: boolean;
  fixture: PaymentsFixture;
}) {
  return (
    <section className="card" data-testid="admin-next-payments-supplier-batch">
      <div className="card-head">
        <h3>Pago proveedor</h3>
        <span className="chip orange">{fixture.supplierBatch.status}</span>
      </div>
      <div className="grp-head">
        <div className="svc-ico">
          <EvoIcon name="wallet" size={15} />
        </div>
        <div className="t">
          <b>{fixture.supplierBatch.supplier}</b>
          <span>{fixture.supplierBatch.reference}</span>
        </div>
        <div className="amt2">
          <div className="v">{fixture.supplierBatch.amount}</div>
          <div className="k">
            {fixture.supplierBatch.reservationIds.length} reservas
          </div>
        </div>
      </div>
      <button
        className="btn outline"
        data-testid="admin-next-payments-prepare-payment"
        disabled={!canManagePayments}
        type="button"
      >
        <EvoIcon name="file" size={15} /> Preparar pago
      </button>
    </section>
  );
}

function DueList({ items }: { items: PaymentDueItem[] }) {
  return (
    <section className="card" data-testid="admin-next-payments-due-list">
      <div className="card-head">
        <h3>Cuotas por vencer</h3>
        <span className="chip">{items.length}</span>
      </div>
      {items.length > 0 ? (
        items.map((item) => (
          <PaymentRow
            amount={item.amount}
            icon="clock"
            id={`admin-next-payment-due-${item.id}`}
            key={item.id}
            meta={`${item.customer} · ${item.dueDate}`}
            status={item.status}
            title={item.itinerary}
            tone={item.tone}
          />
        ))
      ) : (
        <div className="empty-card" data-testid="admin-next-payments-due-empty">
          Sin cuotas pendientes.
        </div>
      )}
    </section>
  );
}

function MovementList({ movements }: { movements: PaymentMovement[] }) {
  return (
    <section className="card" data-testid="admin-next-payments-movements">
      <div className="card-head">
        <h3>Movimientos recientes</h3>
        <span className="chip">{movements.length}</span>
      </div>
      {movements.length > 0 ? (
        movements.map((movement) => (
          <PaymentRow
            amount={movement.amount}
            icon={movement.method === "Tarjeta" ? "card" : "wallet"}
            id={`admin-next-payment-movement-${movement.id}`}
            key={movement.id}
            meta={`${movement.owner} · ${movement.method}`}
            status={movement.status}
            title={movement.label}
            tone={movement.tone}
          />
        ))
      ) : (
        <div
          className="empty-card"
          data-testid="admin-next-payments-movements-empty"
        >
          Sin movimientos recientes.
        </div>
      )}
    </section>
  );
}

function PaymentRow({
  amount,
  icon,
  id,
  meta,
  status,
  title,
  tone,
}: {
  amount: string;
  icon: EvoIconName;
  id: string;
  meta: string;
  status: string;
  title: string;
  tone: PaymentTone;
}) {
  return (
    <article className="trow" data-testid={id}>
      <div className="svc-ico">
        <EvoIcon name={icon} size={15} />
      </div>
      <div className="grow">
        <b>{title}</b>
        <span>{meta}</span>
      </div>
      <span className={chipForTone(tone)}>{status}</span>
      <div className="amt">{amount}</div>
    </article>
  );
}

function AiPanel({
  canManagePayments,
  fixture,
  selectedMethod,
}: {
  canManagePayments: boolean;
  fixture: PaymentsFixture;
  selectedMethod: PaymentMethodFamily;
}) {
  return (
    <section className="card" data-testid="admin-next-payments-ai-panel">
      <div className="card-head">
        <h3>Gates de pago</h3>
        <span className={canManagePayments ? "chip green" : "chip orange"}>
          {canManagePayments ? "RBAC OK" : "Readonly"}
        </span>
      </div>
      {fixture.aiSignals.map((signal) => (
        <PaymentRow
          amount={signal.value}
          icon="spark"
          id={`admin-next-payment-signal-${signal.id}`}
          key={signal.id}
          meta={signal.detail}
          status={signal.label}
          title={signal.label}
          tone={signal.tone}
        />
      ))}
      <div className="trow" data-testid="admin-next-payments-contract">
        <div className="svc-ico">
          <EvoIcon name="sliders" size={15} />
        </div>
        <div className="grow">
          <b>Contrato Stripe</b>
          <span>
            {fixture.accountPaymentConfig.capability} · {selectedMethod}
          </span>
        </div>
        <span className="chip purple">
          {fixture.accountPaymentConfig.webhookOwnership}
        </span>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}

function chipForTone(tone: PaymentTone): string {
  return TONE_CHIP[tone] ?? "chip";
}

function formatCurrency(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountMinor);
}
