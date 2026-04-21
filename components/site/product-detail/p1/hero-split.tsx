'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

interface HeroSplitChip {
  id: string;
  label: string;
  icon?: 'clock' | 'pin' | 'rating' | 'group' | 'check';
}

export interface HeroSplitProps {
  productTypeLabel: string;
  productType: string;
  displayName: string;
  displayLocation?: string | null;
  backgroundImage?: string | null;
  hotelStars?: number;
  chips?: HeroSplitChip[];
  priceLabel?: string | null;
  whatsappUrl?: string | null;
  onWhatsAppClick?: () => void;
  videoAction?: React.ReactNode;
  basePath: string;
  defaultSearchQuery?: string;
}

function ChipIcon({ icon }: { icon?: HeroSplitChip['icon'] }) {
  if (icon === 'clock') {
    return (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (icon === 'pin') {
    return (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      </svg>
    );
  }

  if (icon === 'check') {
    return (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  return null;
}

export function HeroSplit({
  productTypeLabel,
  productType,
  displayName,
  displayLocation,
  backgroundImage,
  hotelStars = 0,
  chips = [],
  priceLabel,
  whatsappUrl,
  onWhatsAppClick,
  videoAction,
  basePath,
  defaultSearchQuery,
}: HeroSplitProps) {
  const detailUi = getPublicUiMessages('es-CO').productDetail;
  const isActivity = productType === 'activity';
  const searchableLabel = useMemo(() => {
    const cleaned = (defaultSearchQuery ?? displayName).trim();
    return cleaned.length > 0 ? cleaned : displayName;
  }, [defaultSearchQuery, displayName]);

  return (
    <section
      data-testid="detail-hero"
      className={`relative ${isActivity ? 'detail-hero-activity' : ''}`}
      style={{ minHeight: 560 }}
    >
      {backgroundImage ? (
        <Image
          src={backgroundImage}
          alt={`${productTypeLabel} ${displayName}${displayLocation ? ` en ${displayLocation}` : ''}`}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="hidden object-cover sm:block"
        />
      ) : null}

      <div className={`absolute inset-0 hidden sm:block ${isActivity ? 'bg-gradient-to-t from-black/70 via-black/35 to-black/10' : 'bg-gradient-to-t from-background via-background/45 to-background/10'}`} />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-12 pt-6 sm:pt-24 lg:flex-row lg:items-end lg:justify-between">
        {backgroundImage ? (
          <div className="sm:hidden">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/40 bg-muted">
              <Image
                src={backgroundImage}
                alt={`${productTypeLabel} ${displayName}${displayLocation ? ` en ${displayLocation}` : ''}`}
                fill
                priority
                fetchPriority="high"
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </div>
        ) : null}

        <div className="max-w-3xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-primary/90">{productTypeLabel}</p>

          {productType === 'hotel' && hotelStars > 0 ? (
            <div className="mb-3 flex items-center gap-1" aria-label={`${hotelStars} estrellas`}>
              {Array.from({ length: hotelStars }).map((_, i) => (
                <svg key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          ) : null}

          {chips.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {chips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs font-mono text-foreground backdrop-blur-sm"
                >
                  <ChipIcon icon={chip.icon} />
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}

          <h1 className={`text-balance font-bold ${isActivity ? 'display-lg text-white' : 'text-4xl md:text-5xl'}`}>{displayName}</h1>

          {displayLocation && productType !== 'activity' ? (
            <p className="mt-2 flex items-center gap-2 text-lg text-foreground/90">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {displayLocation}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {priceLabel ? (
              <span className="inline-flex items-center rounded-full bg-background/70 px-4 py-2 text-sm font-semibold backdrop-blur">
                {detailUi.fromLabel} {priceLabel}
              </span>
            ) : null}

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onWhatsAppClick}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-whatsapp)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {detailUi.whatsappLabel}
              </a>
            ) : null}

            {videoAction}
          </div>

          <div id="detail-sticky-sentinel" className="pointer-events-none mt-6 h-1 w-full" aria-hidden="true" />
        </div>

        {productType !== 'activity' && productType !== 'transfer' ? <aside className="w-full rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm backdrop-blur lg:max-w-sm" aria-label={detailUi.searchPanelAria}>
          <h2 className="text-sm font-semibold text-foreground">{detailUi.searchTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{detailUi.searchSubtitle}</p>

          <form action={`${basePath}/buscar`} method="get" className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              {detailUi.searchQueryLabel}
              <input
                type="text"
                name="q"
                defaultValue={searchableLabel}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs text-muted-foreground">
                {detailUi.checkInLabel}
                <input type="date" name="checkIn" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                {detailUi.checkOutLabel}
                <input type="date" name="checkOut" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs text-muted-foreground">
                {detailUi.adultsLabel}
                <input type="number" min={1} name="adults" defaultValue={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                {detailUi.childrenLabel}
                <input type="number" min={0} name="children" defaultValue={0} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                {detailUi.searchButton}
              </button>
              <Link href={`${basePath}/buscar`} className="text-xs text-primary hover:underline">
                {detailUi.viewAllLabel}
              </Link>
            </div>
          </form>
        </aside> : null}
      </div>
    </section>
  );
}
