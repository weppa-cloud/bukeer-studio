import {
  DEFAULT_STRIPE_PAYMENT_CONTRACT,
  STRIPE_API_VERSION,
  StripeAccountPaymentConfigSchema,
  StripeWebhookEventContractSchema,
  buildStripeCheckoutMetadata,
  calculateStripeCheckoutAmount,
  parseStripeAccountPaymentConfig,
  parseTreasuryCheckoutDraft,
} from '@/lib/admin-next/payments-stripe-contract';

const accountConfig = {
  accountId: 'acct-bukeer-demo',
  mode: 'test',
  checkoutSurface: 'checkout_session',
  capability: 'platform_checkout',
  publishableKeyRef: 'stripe/test/publishable/acct-bukeer-demo',
  secretKeyRef: 'stripe/test/secret/acct-bukeer-demo',
  webhookSecretRef: 'stripe/test/webhook/acct-bukeer-demo',
  webhookOwnership: 'platform_central',
  feePolicy: {
    percentageBps: 290,
    fixedMinor: 3000,
    currency: 'COP',
    payer: 'customer',
    includeInCustomerTotal: true,
  },
} as const;

const checkoutDraft = {
  accountId: 'acct-bukeer-demo',
  itineraryId: 'IT-2647',
  installmentIds: ['quota-1', 'quota-2'],
  baseAmountMinor: 1_000_000,
  currency: 'COP',
  mode: 'test',
  paymentMethodFamily: 'card',
  approvedByUserId: 'user-1',
  approvalTraceId: 'trace-pay-1',
} as const;

describe('Admin Next Stripe payments contract', () => {
  it('pins Stripe to the current API version and Checkout Sessions', () => {
    expect(STRIPE_API_VERSION).toBe('2026-02-25.clover');
    expect(DEFAULT_STRIPE_PAYMENT_CONTRACT).toMatchObject({
      checkoutSurface: 'checkout_session',
      webhookEndpoint: '/api/webhooks/stripe',
      webhookOwnership: 'platform_central',
      idempotencyTable: 'webhook_events',
      requiresHumanApproval: true,
      serverPermission: 'payments.manage',
    });
  });

  it('parses per-account test/live Stripe configuration with fee policy', () => {
    expect(parseStripeAccountPaymentConfig(accountConfig)).toMatchObject({
      accountId: 'acct-bukeer-demo',
      mode: 'test',
      feePolicy: {
        percentageBps: 290,
        fixedMinor: 3000,
        payer: 'customer',
      },
    });
  });

  it('calculates card fee into the customer total when policy requires it', () => {
    const amount = calculateStripeCheckoutAmount({
      config: parseStripeAccountPaymentConfig(accountConfig),
      draft: parseTreasuryCheckoutDraft(checkoutDraft),
    });

    expect(amount).toEqual({
      baseAmountMinor: 1_000_000,
      feeAmountMinor: 32_000,
      totalAmountMinor: 1_032_000,
      currency: 'COP',
      feeIncludedInCustomerTotal: true,
      feePayer: 'customer',
    });
  });

  it('does not add customer fee when the agency absorbs Stripe cost', () => {
    const amount = calculateStripeCheckoutAmount({
      config: parseStripeAccountPaymentConfig({
        ...accountConfig,
        feePolicy: {
          ...accountConfig.feePolicy,
          payer: 'agency',
          includeInCustomerTotal: false,
        },
      }),
      draft: parseTreasuryCheckoutDraft(checkoutDraft),
    });

    expect(amount).toMatchObject({
      feeAmountMinor: 0,
      totalAmountMinor: 1_000_000,
      feeIncludedInCustomerTotal: false,
      feePayer: 'agency',
    });
  });

  it('rejects mode, account and currency drift before checkout creation', () => {
    expect(() =>
      calculateStripeCheckoutAmount({
        config: parseStripeAccountPaymentConfig(accountConfig),
        draft: parseTreasuryCheckoutDraft({
          ...checkoutDraft,
          mode: 'live',
        }),
      }),
    ).toThrow('STRIPE_MODE_MISMATCH');

    expect(() =>
      calculateStripeCheckoutAmount({
        config: parseStripeAccountPaymentConfig(accountConfig),
        draft: parseTreasuryCheckoutDraft({
          ...checkoutDraft,
          accountId: 'acct-other',
        }),
      }),
    ).toThrow('STRIPE_ACCOUNT_MISMATCH');

    expect(() =>
      calculateStripeCheckoutAmount({
        config: parseStripeAccountPaymentConfig(accountConfig),
        draft: parseTreasuryCheckoutDraft({
          ...checkoutDraft,
          currency: 'USD',
        }),
      }),
    ).toThrow('STRIPE_FEE_CURRENCY_MISMATCH');
  });

  it('builds auditable checkout metadata without exposing secrets', () => {
    const draft = parseTreasuryCheckoutDraft(checkoutDraft);
    const amount = calculateStripeCheckoutAmount({
      config: parseStripeAccountPaymentConfig(accountConfig),
      draft,
    });

    expect(buildStripeCheckoutMetadata({ draft, amount })).toEqual({
      account_id: 'acct-bukeer-demo',
      itinerary_id: 'IT-2647',
      installment_ids: 'quota-1,quota-2',
      approval_trace_id: 'trace-pay-1',
      approved_by_user_id: 'user-1',
      fee_amount_minor: '32000',
      fee_included_in_customer_total: 'true',
    });
  });

  it('accepts only the Stripe webhook event types used by treasury', () => {
    expect(
      StripeWebhookEventContractSchema.parse({
        provider: 'stripe',
        eventId: 'evt_123',
        eventType: 'checkout.session.completed',
        accountId: 'acct-bukeer-demo',
        mode: 'test',
        receivedAtIso: '2026-06-11T14:45:00.000Z',
      }),
    ).toMatchObject({
      provider: 'stripe',
      eventType: 'checkout.session.completed',
    });

    expect(() =>
      StripeWebhookEventContractSchema.parse({
        provider: 'stripe',
        eventId: 'evt_123',
        eventType: 'customer.deleted',
        accountId: 'acct-bukeer-demo',
        mode: 'test',
        receivedAtIso: '2026-06-11T14:45:00.000Z',
      }),
    ).toThrow();
  });

  it('keeps configuration schemas strict enough for agent gates', () => {
    expect(() =>
      StripeAccountPaymentConfigSchema.parse({
        ...accountConfig,
        feePolicy: {
          ...accountConfig.feePolicy,
          percentageBps: 10001,
        },
      }),
    ).toThrow();
  });
});
