import { z } from 'zod';

export const STRIPE_API_VERSION = '2026-02-25.clover';

export const StripeModeSchema = z.enum(['test', 'live']);
export type StripeMode = z.infer<typeof StripeModeSchema>;

export const StripeFeePayerSchema = z.enum(['customer', 'agency']);
export type StripeFeePayer = z.infer<typeof StripeFeePayerSchema>;

export const StripeCheckoutSurfaceSchema = z.enum([
  'checkout_session',
  'payment_element',
]);
export type StripeCheckoutSurface = z.infer<typeof StripeCheckoutSurfaceSchema>;

export const StripeWebhookOwnershipSchema = z.enum([
  'platform_central',
  'account_direct_forwarded',
]);
export type StripeWebhookOwnership = z.infer<typeof StripeWebhookOwnershipSchema>;

export const StripeAccountCapabilitySchema = z.enum([
  'platform_checkout',
  'connect_destination_charges',
]);
export type StripeAccountCapability = z.infer<typeof StripeAccountCapabilitySchema>;

export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);

export const StripeFeePolicySchema = z.object({
  percentageBps: z.number().int().min(0).max(10_000),
  fixedMinor: z.number().int().min(0),
  currency: CurrencyCodeSchema,
  payer: StripeFeePayerSchema,
  includeInCustomerTotal: z.boolean(),
});
export type StripeFeePolicy = z.infer<typeof StripeFeePolicySchema>;

export const StripeAccountPaymentConfigSchema = z.object({
  accountId: z.string().min(1),
  mode: StripeModeSchema,
  checkoutSurface: StripeCheckoutSurfaceSchema,
  capability: StripeAccountCapabilitySchema,
  publishableKeyRef: z.string().min(1),
  secretKeyRef: z.string().min(1),
  webhookSecretRef: z.string().min(1),
  webhookOwnership: StripeWebhookOwnershipSchema,
  feePolicy: StripeFeePolicySchema,
});
export type StripeAccountPaymentConfig = z.infer<
  typeof StripeAccountPaymentConfigSchema
>;

export const TreasuryCheckoutDraftSchema = z.object({
  accountId: z.string().min(1),
  itineraryId: z.string().min(1),
  installmentIds: z.array(z.string().min(1)).min(1),
  baseAmountMinor: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  mode: StripeModeSchema,
  paymentMethodFamily: z.enum(['card', 'bank_transfer']),
  approvedByUserId: z.string().min(1),
  approvalTraceId: z.string().min(1),
});
export type TreasuryCheckoutDraft = z.infer<typeof TreasuryCheckoutDraftSchema>;

export const TreasuryCheckoutAmountSchema = z.object({
  baseAmountMinor: z.number().int().nonnegative(),
  feeAmountMinor: z.number().int().nonnegative(),
  totalAmountMinor: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
  feeIncludedInCustomerTotal: z.boolean(),
  feePayer: StripeFeePayerSchema,
});
export type TreasuryCheckoutAmount = z.infer<typeof TreasuryCheckoutAmountSchema>;

export const StripeWebhookEventContractSchema = z.object({
  provider: z.literal('stripe'),
  eventId: z.string().min(1),
  eventType: z.enum([
    'checkout.session.completed',
    'checkout.session.expired',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.refunded',
  ]),
  accountId: z.string().min(1),
  mode: StripeModeSchema,
  receivedAtIso: z.string().datetime(),
});
export type StripeWebhookEventContract = z.infer<
  typeof StripeWebhookEventContractSchema
>;

export const DEFAULT_STRIPE_PAYMENT_CONTRACT = {
  apiVersion: STRIPE_API_VERSION,
  checkoutSurface: 'checkout_session',
  webhookEndpoint: '/api/webhooks/stripe',
  webhookOwnership: 'platform_central',
  idempotencyTable: 'webhook_events',
  requiresHumanApproval: true,
  serverPermission: 'payments.manage',
} as const;

export function parseStripeAccountPaymentConfig(
  value: unknown,
): StripeAccountPaymentConfig {
  return StripeAccountPaymentConfigSchema.parse(value);
}

export function parseTreasuryCheckoutDraft(value: unknown): TreasuryCheckoutDraft {
  return TreasuryCheckoutDraftSchema.parse(value);
}

export function calculateStripeCheckoutAmount({
  config,
  draft,
}: {
  config: StripeAccountPaymentConfig;
  draft: TreasuryCheckoutDraft;
}): TreasuryCheckoutAmount {
  if (config.accountId !== draft.accountId) {
    throw new Error('STRIPE_ACCOUNT_MISMATCH');
  }

  if (config.mode !== draft.mode) {
    throw new Error('STRIPE_MODE_MISMATCH');
  }

  if (config.feePolicy.currency !== draft.currency) {
    throw new Error('STRIPE_FEE_CURRENCY_MISMATCH');
  }

  const appliesToCustomerCard =
    draft.paymentMethodFamily === 'card' &&
    config.feePolicy.payer === 'customer' &&
    config.feePolicy.includeInCustomerTotal;

  const feeAmountMinor = appliesToCustomerCard
    ? calculateFeeMinor(draft.baseAmountMinor, config.feePolicy)
    : 0;

  return TreasuryCheckoutAmountSchema.parse({
    baseAmountMinor: draft.baseAmountMinor,
    feeAmountMinor,
    totalAmountMinor: draft.baseAmountMinor + feeAmountMinor,
    currency: draft.currency,
    feeIncludedInCustomerTotal: appliesToCustomerCard,
    feePayer: config.feePolicy.payer,
  });
}

export function buildStripeCheckoutMetadata({
  draft,
  amount,
}: {
  draft: TreasuryCheckoutDraft;
  amount: TreasuryCheckoutAmount;
}) {
  return {
    account_id: draft.accountId,
    itinerary_id: draft.itineraryId,
    installment_ids: draft.installmentIds.join(','),
    approval_trace_id: draft.approvalTraceId,
    approved_by_user_id: draft.approvedByUserId,
    fee_amount_minor: amount.feeAmountMinor.toString(),
    fee_included_in_customer_total: amount.feeIncludedInCustomerTotal
      ? 'true'
      : 'false',
  } as const;
}

function calculateFeeMinor(
  baseAmountMinor: number,
  feePolicy: StripeFeePolicy,
): number {
  const percentageFee = Math.ceil(
    (baseAmountMinor * feePolicy.percentageBps) / 10_000,
  );

  return percentageFee + feePolicy.fixedMinor;
}
