'use client';

import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

export interface SummarySidebarFact {
  label: string;
  value: string;
}

export interface SummarySidebarProps {
  priceLabel?: string | null;
  facts: SummarySidebarFact[];
  whatsappUrl?: string | null;
  phoneHref?: string | null;
  onWhatsAppClick?: () => void;
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
}

export function SummarySidebar({
  priceLabel,
  facts,
  whatsappUrl,
  phoneHref,
  onWhatsAppClick,
  analyticsContext,
}: SummarySidebarProps) {
  const detailUi = getPublicUiMessages('es-CO').productDetail;

  return (
    <aside className="space-y-5 rounded-2xl border border-border bg-card p-6">
      {priceLabel ? (
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{detailUi.fromLabel}</span>
          <p className="mt-1 text-3xl font-bold text-primary">{priceLabel}</p>
        </div>
      ) : null}

      {facts.length > 0 ? (
        <dl className="space-y-3">
          {facts.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</dt>
              <dd className="text-right text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="space-y-3">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onWhatsAppClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-whatsapp)] px-4 py-3 text-sm font-medium text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {detailUi.sidebarWhatsappLabel}
          </a>
        ) : null}

        {phoneHref ? (
          <a
            href={phoneHref}
            onClick={() => trackEvent('phone_cta_click', { ...(analyticsContext ?? {}), location_context: 'sidebar' })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            {detailUi.sidebarCallLabel}
          </a>
        ) : null}
      </div>
    </aside>
  );
}
