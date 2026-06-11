# ADR-NF-013 — Stripe Payments and Treasury Contract

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 2 (#615)  
**Related:** [[ADR-NF-004]], [[ADR-NF-007]], [[ADR-NF-010]], [[ADR-018]], weppa-cloud/bukeer-studio#615

## Context

Fase 2 includes Pagos/tesoreria with customer collections, supplier payments,
payment-method toggles and Stripe replacing Wompi in the Evolucion design. The
epic explicitly blocks this module until the Stripe ambiguity is resolved:

1. fee parametrization per account;
2. test/live handling;
3. central versus per-account webhook ownership.

The existing Flutter backend remains the source of truth for paid installments,
itinerary confirmation and immutable paid quotas. Next must not create a second
financial truth source.

## Decision

Bukeer Next uses a versioned Stripe contract before rendering or mutating the
Pagos module.

1. **API surface:** Stripe API version `2026-02-25.clover`; on-session customer
   payments use Checkout Sessions first. Payment Element is only an embedded UI
   variant backed by Checkout Sessions, not raw card-only collection.
2. **Per-account fee policy:** each account has a parsed payment config with
   `mode`, secret references, webhook secret reference, checkout surface,
   capability and fee policy. Fee policy is `(percentageBps + fixedMinor)` in a
   single currency with payer `customer` or `agency`.
3. **Fee in total:** when payer is `customer` and payment method family is
   `card`, the calculated fee is added to `totalAmountMinor`. When the agency
   absorbs fees or the payment method is not card, the customer total remains
   the base installment amount.
4. **Mode isolation:** checkout creation fails closed if account id, Stripe mode
   or fee currency differ between the account config and checkout draft.
5. **Human approval:** customer payment links, supplier payment batches and any
   production financial write require a permitted user approval trace before a
   Checkout Session can be created.
6. **Webhook ownership:** v1 uses one central endpoint,
   `/api/webhooks/stripe`, with account context carried in metadata and parsed
   event payloads. Future direct-account credentials may forward into the same
   central contract; per-account public webhook routes are not allowed.
7. **Webhook idempotency:** Stripe events use the ADR-018 `webhook_events`
   contract with provider `stripe`, provider event id and allowed treasury event
   types only. Duplicate events return success without re-processing.
8. **No secrets in UI:** components receive only derived status and secret
   references. Secret values stay server-side.

## Contract

Executable source: `lib/admin-next/payments-stripe-contract.ts`.

Required fields:

- `accountId`;
- `mode`: `test | live`;
- `checkoutSurface`: `checkout_session | payment_element`;
- `capability`: `platform_checkout | connect_destination_charges`;
- `publishableKeyRef`, `secretKeyRef`, `webhookSecretRef`;
- `webhookOwnership`: `platform_central | account_direct_forwarded`;
- `feePolicy`: `percentageBps`, `fixedMinor`, `currency`, `payer`,
  `includeInCustomerTotal`.

Checkout metadata must include:

- `account_id`;
- `itinerary_id`;
- `installment_ids`;
- `approval_trace_id`;
- `approved_by_user_id`;
- `fee_amount_minor`;
- `fee_included_in_customer_total`.

## Consequences

- Pagos/tesoreria can now start without guessing Stripe fee behavior.
- Agents can verify the gate through unit tests before building UI.
- The module can show fee watches and test/live status without exposing
  credentials.
- Any future Connect expansion must pick one charge type per integration and
  keep the same central webhook/idempotency contract.

## Verification

- `__tests__/lib/admin-next/payments-stripe-contract.test.ts` covers API
  version, Checkout Sessions default, fee calculation, customer-vs-agency fee
  payer, mode/account/currency mismatch, metadata, webhook event allowlist and
  schema strictness.
- Pagos/tesoreria page tests must require server-side `payments.manage` before
  any future checkout or payment batch action.
- Playwright smokes for Pagos must prove that displayed customer totals match
  `calculateStripeCheckoutAmount()`.
