'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PricingTier } from '@/components/site/product-detail/p3/pricing-tiers';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';
import { WhatsAppFlowFab } from './flow-fab';
import { WhatsAppFlowStepOne, WhatsAppFlowStepTwo, WhatsAppFlowSuccess } from './flow-steps';
import type { WhatsAppFlowRequest, WhatsAppFlowResponse, WhatsAppFlowVariant } from './types';

export interface WhatsAppFlowDrawerProps {
  enabled: boolean;
  subdomain: string;
  productId: string;
  productType: string;
  productName: string;
  selectedTier?: PricingTier | null;
  variant?: WhatsAppFlowVariant;
  locale?: string | null;
}

export function WhatsAppFlowDrawer({
  enabled,
  subdomain,
  productId,
  productType,
  productName,
  selectedTier,
  variant = 'A',
  locale = 'es-CO',
}: WhatsAppFlowDrawerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [travelDate, setTravelDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<WhatsAppFlowResponse | null>(null);

  const canOpenFab = enabled;
  const flowCopy = useMemo(() => getPublicUiMessages(locale).whatsappFlow, [locale]);

  const requestPayload = useMemo<WhatsAppFlowRequest>(
    () => ({
      subdomain,
      productId,
      productType,
      productName,
      variant,
      selectedTierId: selectedTier?.id ?? null,
      selectedTierLabel: selectedTier?.label ?? null,
      selectedTierAmount: selectedTier?.amount ?? null,
      selectedTierCurrency: selectedTier?.currency ?? null,
      travelDate: travelDate || null,
      adults,
              childrenCount: children,
      notes: notes || null,
      customerName: name,
      customerEmail: email || null,
      customerPhone: phone,
    }),
    [adults, children, email, name, notes, phone, productId, productName, productType, selectedTier, subdomain, travelDate, variant]
  );

  if (!canOpenFab) {
    return null;
  }

  const reset = () => {
    setStep(1);
    setError(null);
    setResponse(null);
    setLoading(false);
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError(flowCopy.requiredContactError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetch('/api/whatsapp-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const payload = await result.json();
      if (!result.ok || payload?.success !== true) {
        setError(payload?.error?.message ?? flowCopy.submitError);
        setLoading(false);
        return;
      }

      setResponse(payload.data as WhatsAppFlowResponse);
      setStep(3);
      setLoading(false);
    } catch {
      setError(flowCopy.submitError);
      setLoading(false);
    }
  };

  return (
    <>
      <WhatsAppFlowFab onClick={() => setOpen(true)} label={flowCopy.fabLabel} />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) reset();
        }}
      >
        <DialogContent className="max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{flowCopy.dialogTitle}</DialogTitle>
            <DialogDescription>{flowCopy.dialogDescription}</DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <WhatsAppFlowStepOne
              copy={flowCopy}
              variant={variant}
              tier={selectedTier}
              travelDate={travelDate}
              adults={adults}
              childrenCount={children}
              notes={notes}
              onChange={(field, value) => {
                if (field === 'travelDate') setTravelDate(value);
                if (field === 'adults') setAdults(Math.max(1, Number(value) || 1));
                if (field === 'childrenCount') setChildren(Math.max(0, Number(value) || 0));
                if (field === 'notes') setNotes(value);
              }}
              onNext={() => setStep(2)}
            />
          ) : null}

          {step === 2 ? (
            <WhatsAppFlowStepTwo
              copy={flowCopy}
              name={name}
              email={email}
              phone={phone}
              loading={loading}
              error={error}
              onChange={(field, value) => {
                if (field === 'name') setName(value);
                if (field === 'email') setEmail(value);
                if (field === 'phone') setPhone(value);
              }}
              onBack={() => setStep(1)}
              onSubmit={submit}
            />
          ) : null}

          {step === 3 && response ? (
            <WhatsAppFlowSuccess
              copy={flowCopy}
              response={response}
              onClose={() => {
                setOpen(false);
                reset();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
