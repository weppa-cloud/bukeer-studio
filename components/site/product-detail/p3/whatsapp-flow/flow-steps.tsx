'use client';

import type { PricingTier } from '@/components/site/product-detail/p3/pricing-tiers';
import type { PublicUiMessages } from '@/lib/site/public-ui-messages';
import type { WhatsAppFlowResponse, WhatsAppFlowVariant } from './types';

type WhatsAppFlowCopy = PublicUiMessages['whatsappFlow'];

interface StepOneProps {
  copy: WhatsAppFlowCopy;
  variant: WhatsAppFlowVariant;
  tier?: PricingTier | null;
  travelDate: string;
  adults: number;
  childrenCount: number;
  notes: string;
  onChange: (field: 'travelDate' | 'adults' | 'childrenCount' | 'notes', value: string) => void;
  onNext: () => void;
}

interface StepTwoProps {
  copy: WhatsAppFlowCopy;
  name: string;
  email: string;
  phone: string;
  loading: boolean;
  error: string | null;
  onChange: (field: 'name' | 'email' | 'phone', value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

interface StepSuccessProps {
  copy: WhatsAppFlowCopy;
  response: WhatsAppFlowResponse;
  onClose: () => void;
}

export function WhatsAppFlowStepOne(props: StepOneProps) {
  const variantCopy = props.copy.variants[props.variant];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{variantCopy.title}</p>
        <p className="text-sm text-muted-foreground">{variantCopy.subtitle}</p>
      </div>

      {props.tier ? (
        <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          {props.copy.selectedTierPrefix} <span className="font-semibold text-foreground">{props.tier.label}</span>
        </div>
      ) : null}

      <label className="grid gap-1 text-sm">
        {props.copy.travelDateLabel}
        <input
          type="date"
          value={props.travelDate}
          onChange={(event) => props.onChange('travelDate', event.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          {props.copy.adultsLabel}
          <input
            type="number"
            min={1}
            value={props.adults}
            onChange={(event) => props.onChange('adults', event.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2"
          />
        </label>

        <label className="grid gap-1 text-sm">
          {props.copy.childrenLabel}
          <input
            type="number"
            min={0}
            value={props.childrenCount}
            onChange={(event) => props.onChange('childrenCount', event.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        {props.copy.notesLabel}
        <textarea
          value={props.notes}
          onChange={(event) => props.onChange('notes', event.target.value)}
          rows={3}
          className="rounded-lg border border-input bg-background px-3 py-2"
          placeholder={props.copy.notesPlaceholder}
        />
      </label>

      <button
        type="button"
        onClick={props.onNext}
        className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        {props.copy.continueButton}
      </button>
    </div>
  );
}

export function WhatsAppFlowStepTwo(props: StepTwoProps) {
  return (
    <div className="space-y-4">
      <label className="grid gap-1 text-sm">
        {props.copy.nameLabel}
        <input
          type="text"
          value={props.name}
          onChange={(event) => props.onChange('name', event.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2"
          required
        />
      </label>

      <label className="grid gap-1 text-sm">
        {props.copy.emailOptionalLabel}
        <input
          type="email"
          value={props.email}
          onChange={(event) => props.onChange('email', event.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>

      <label className="grid gap-1 text-sm">
        {props.copy.phoneLabel}
        <input
          type="tel"
          value={props.phone}
          onChange={(event) => props.onChange('phone', event.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2"
          required
        />
      </label>

      {props.error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{props.error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={props.onBack}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          {props.copy.backButton}
        </button>
        <button
          type="button"
          disabled={props.loading}
          onClick={props.onSubmit}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--brand-whatsapp)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {props.loading ? props.copy.submittingButton : props.copy.submitButton}
        </button>
      </div>
    </div>
  );
}

export function WhatsAppFlowSuccess(props: StepSuccessProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-whatsapp)]/15 text-[var(--brand-whatsapp)]">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <p className="text-base font-semibold text-foreground">{props.copy.successTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {props.copy.referenceLabel} <span className="font-semibold text-foreground">{props.response.referenceCode}</span>
        </p>
      </div>

      <a
        href={props.response.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--brand-whatsapp)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
      >
        {props.copy.openWhatsappButton}
      </a>

      <button
        type="button"
        onClick={props.onClose}
        className="inline-flex w-full items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
      >
        {props.copy.closeButton}
      </button>
    </div>
  );
}
