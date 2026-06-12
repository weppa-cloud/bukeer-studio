import type { StripeAccountPaymentConfig } from '@/lib/admin-next/payments-stripe-contract';

export type PaymentMethodFamily = 'card' | 'bank_transfer';
export type PaymentBatchId = 'collect' | 'supplier';
export type PaymentTone = 'primary' | 'success' | 'warning' | 'danger' | 'live';

export type PaymentKpi = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: PaymentTone;
};

export type PaymentDueItem = {
  id: string;
  itinerary: string;
  customer: string;
  dueDate: string;
  amount: string;
  status: string;
  tone: PaymentTone;
};

export type PaymentMovement = {
  id: string;
  label: string;
  owner: string;
  amount: string;
  method: string;
  status: string;
  tone: PaymentTone;
};

export type PaymentCollectBatch = {
  id: PaymentBatchId;
  itineraryId: string;
  customer: string;
  invoiceIds: string[];
  baseAmountMinor: number;
  currency: 'COP';
  approvalTraceId: string;
  approvedByUserId: string;
};

export type PaymentSupplierBatch = {
  id: PaymentBatchId;
  supplier: string;
  reservationIds: string[];
  reference: string;
  amount: string;
  status: string;
};

export type PaymentsFixture = {
  accountPaymentConfig: StripeAccountPaymentConfig;
  methods: Array<{
    key: PaymentMethodFamily;
    label: string;
    detail: string;
  }>;
  batches: Array<{
    key: PaymentBatchId;
    label: string;
  }>;
  kpis: PaymentKpi[];
  dueItems: PaymentDueItem[];
  movements: PaymentMovement[];
  collectBatch: PaymentCollectBatch;
  supplierBatch: PaymentSupplierBatch;
  aiSignals: PaymentKpi[];
};

export const paymentsFixture: PaymentsFixture = {
  accountPaymentConfig: {
    accountId: 'bukeer-demo-agency',
    mode: 'test',
    checkoutSurface: 'checkout_session',
    capability: 'platform_checkout',
    publishableKeyRef: 'STRIPE_PUBLISHABLE_KEY_REF',
    secretKeyRef: 'STRIPE_SECRET_KEY_REF',
    webhookSecretRef: 'STRIPE_WEBHOOK_SECRET_REF',
    webhookOwnership: 'platform_central',
    feePolicy: {
      percentageBps: 290,
      fixedMinor: 3000,
      currency: 'COP',
      payer: 'customer',
      includeInCustomerTotal: true,
    },
  },
  methods: [
    {
      key: 'card',
      label: 'Tarjeta',
      detail: 'Fee incluido cuando el cliente paga con tarjeta.',
    },
    {
      key: 'bank_transfer',
      label: 'Transferencia',
      detail: 'Sin fee al cliente; conciliacion por referencia.',
    },
  ],
  batches: [
    { key: 'collect', label: 'Cobro' },
    { key: 'supplier', label: 'Pago' },
  ],
  kpis: [
    {
      id: 'receivable',
      label: 'CxC abierta',
      value: '$38.6M',
      detail: '7 vencimientos bloquean confirmacion.',
      tone: 'warning',
    },
    {
      id: 'payable',
      label: 'CxP aprobable',
      value: '$24.1M',
      detail: '5 proveedores con reservas consolidadas.',
      tone: 'primary',
    },
    {
      id: 'stripe',
      label: 'Stripe test',
      value: '2026-02-25',
      detail: 'Checkout Sessions + webhook central.',
      tone: 'live',
    },
    {
      id: 'margin',
      label: 'Caja neta',
      value: '$14.5M',
      detail: 'Despues de obligaciones proximas.',
      tone: 'success',
    },
  ],
  dueItems: [
    {
      id: 'due-2647-1',
      itinerary: 'San Andres familiar',
      customer: 'Laura Perez',
      dueDate: '2026-06-14',
      amount: '$1.000.000',
      status: 'Listo para link',
      tone: 'warning',
    },
    {
      id: 'due-2651-1',
      itinerary: 'Corporativo Cartagena',
      customer: 'Andes Legal',
      dueDate: '2026-06-18',
      amount: '$4.800.000',
      status: 'Requiere aprobacion',
      tone: 'danger',
    },
    {
      id: 'due-2654-2',
      itinerary: 'Luna de miel Baru',
      customer: 'Camila Mora',
      dueDate: '2026-06-21',
      amount: '$2.200.000',
      status: 'Programado',
      tone: 'success',
    },
  ],
  movements: [
    {
      id: 'mov-873',
      label: 'Abono San Andres familiar',
      owner: 'Carolina',
      amount: '$1.500.000',
      method: 'Transferencia',
      status: 'Conciliado',
      tone: 'success',
    },
    {
      id: 'mov-874',
      label: 'Pago proveedor transporte',
      owner: 'Tesoreria',
      amount: '$820.000',
      method: 'Referencia CxP',
      status: 'Pendiente aprobacion',
      tone: 'warning',
    },
    {
      id: 'mov-875',
      label: 'Intento tarjeta Cartagena',
      owner: 'Daniel',
      amount: '$1.000.000',
      method: 'Tarjeta',
      status: 'Fee incluido',
      tone: 'live',
    },
  ],
  collectBatch: {
    id: 'collect',
    itineraryId: 'it-2647',
    customer: 'Laura Perez',
    invoiceIds: ['inv-2647-01', 'inv-2647-02', 'inv-2647-03'],
    baseAmountMinor: 1_000_000,
    currency: 'COP',
    approvalTraceId: 'trace-payments-2647',
    approvedByUserId: 'treasury-admin',
  },
  supplierBatch: {
    id: 'supplier',
    supplier: 'Hotel Las Islas',
    reservationIds: ['res-8891', 'res-8892', 'res-8893'],
    reference: 'PAY-HLI-202606-01',
    amount: '$7.420.000',
    status: 'Aprobacion requerida',
  },
  aiSignals: [
    {
      id: 'approval',
      label: 'Human-in-loop',
      value: 'Activo',
      detail: 'Cobro y pago quedan preparados; no ejecutan backend.',
      tone: 'primary',
    },
    {
      id: 'fee',
      label: 'Fee tarjeta',
      value: '$32.000',
      detail: '2.9% + $3.000 cuando payer=customer.',
      tone: 'warning',
    },
    {
      id: 'webhook',
      label: 'Webhook',
      value: 'Central',
      detail: 'Eventos Stripe entran por webhook_events.',
      tone: 'live',
    },
  ],
};
