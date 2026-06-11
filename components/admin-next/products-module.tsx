"use client";

import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  BedDouble,
  Building2,
  Camera,
  ChevronRight,
  Image,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  WalletCards,
} from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  ProductRate,
  ProductRecord,
  ProductSignal,
  ProductsFixture,
} from '@/lib/admin-next/fixtures/products';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

const toneClasses: Record<ProductRecord['tone'], string> = {
  primary: 'border-primary/30 bg-primary/10 text-primary',
  live: 'border-secondary/30 bg-secondary/10 text-secondary',
  warning: 'border-[hsl(var(--bukeer-warning))]/30 bg-[hsl(var(--bukeer-warning)/0.12)] text-[hsl(var(--bukeer-warning))]',
};

export function ProductsModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: ProductsFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  return (
    <AdminShell session={session} activeKey="products">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-products-root"
        data-theme-preset={evolucionTheme.presetSlug}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <ProductsHeader />
            <ProductsToolbar fixture={fixture} />
            <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.82fr)_minmax(420px,0.98fr)]">
              <ProductsGrid products={fixture.products} selectedId={fixture.selected.id} />
              <ProductDetail fixture={fixture} />
            </div>
          </div>
          <ProductsAiPanel signals={fixture.signals} />
        </div>
      </section>
    </AdminShell>
  );
}

function ProductsHeader() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.products.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.products.subtitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
          data-testid="admin-next-products-import"
          type="button"
        >
          <Camera className="size-4" />
          {adminNextCopy.products.importAction}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-products-new"
          type="button"
        >
          <Plus className="size-4" />
          {adminNextCopy.products.primaryAction}
        </button>
      </div>
    </div>
  );
}

function ProductsToolbar({ fixture }: { fixture: ProductsFixture }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground" data-testid="admin-next-products-toolbar">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex h-10 min-w-0 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground lg:w-[360px]">
          <Search className="size-4" />
          <span className="truncate">{adminNextCopy.products.searchPlaceholder}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-semibold text-muted-foreground"
            data-testid="admin-next-products-city-filter"
            type="button"
          >
            <MapPin className="size-4" />
            {adminNextCopy.products.cityFilterLabel}
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-semibold text-muted-foreground"
            data-testid="admin-next-products-price-filter"
            type="button"
          >
            <SlidersHorizontal className="size-4" />
            {adminNextCopy.products.priceFilterLabel}
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-1 overflow-x-auto border-b">
        {fixture.categories.map((category, index) => (
          <button
            className={cn(
              'mb-[-1px] inline-flex h-10 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold',
              index === 0
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground',
            )}
            data-testid={`admin-next-products-tab-${category.key}`}
            key={category.key}
            type="button"
          >
            {category.label}
            <span className="rounded-md border bg-background px-1.5 py-0.5 text-xs">
              {category.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductsGrid({
  products,
  selectedId,
}: {
  products: ProductRecord[];
  selectedId: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1" data-testid="admin-next-products-grid">
      {products.map((product) => (
        <ProductCard isSelected={product.id === selectedId} key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  isSelected,
}: {
  product: ProductRecord;
  isSelected: boolean;
}) {
  return (
    <article
      className={cn(
        'overflow-hidden rounded-lg border bg-card text-card-foreground',
        isSelected && 'border-primary/40 bg-primary/5',
      )}
      data-testid={`admin-next-product-card-${product.id}`}
    >
      <div className="relative flex h-28 items-center justify-center bg-muted text-muted-foreground">
        <Image className="size-8" />
        <span className={cn('absolute left-3 top-3 rounded-md border px-2 py-1 text-xs font-semibold', toneClasses[product.tone])}>
          {product.status}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border bg-background text-primary">
            <BedDouble className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{product.name}</h2>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {product.location}
            </p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {product.features.map((feature) => (
            <span className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground" key={feature}>
              {feature}
            </span>
          ))}
        </div>
        <div className="flex items-end gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">{adminNextCopy.products.fromLabel}</span>
          <span className="text-base font-semibold">{product.fromPrice}</span>
          <span className="text-xs text-muted-foreground">/ {product.priceUnit}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Star className="size-3.5 fill-current text-[hsl(var(--bukeer-warning))]" />
            {product.rating}
          </span>
        </div>
      </div>
    </article>
  );
}

function ProductDetail({ fixture }: { fixture: ProductsFixture }) {
  const product = fixture.selected;

  return (
    <section className="space-y-4" data-testid="admin-next-products-detail">
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-normal">{product.name}</h2>
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {product.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.type} · {product.location} · {product.code}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
              data-testid="admin-next-products-edit"
              type="button"
            >
              <Pencil className="size-4" />
              {adminNextCopy.products.editAction}
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
              data-testid="admin-next-products-new-rate"
              type="button"
            >
              <Plus className="size-4" />
              {adminNextCopy.products.newRateAction}
            </button>
          </div>
        </div>
      </div>
      <GalleryPanel product={product} />
      <RatesPanel rates={fixture.rates} />
      <InfoPanels fixture={fixture} />
    </section>
  );
}

function GalleryPanel({ product }: { product: ProductsFixture['selected'] }) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-products-gallery">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-normal">{adminNextCopy.products.galleryTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{product.masterCatalogStatus}</p>
        </div>
        <button
          className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-xs font-semibold text-muted-foreground"
          data-testid="admin-next-products-manage-images"
          type="button"
        >
          <Camera className="size-3.5" />
          {adminNextCopy.products.manageImagesAction(product.imageCount)}
        </button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-[1.4fr_repeat(2,0.55fr)]">
        <div className="relative flex min-h-48 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Image className="size-10" />
          <span className="absolute left-3 top-3 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {adminNextCopy.products.mainImageLabel}
          </span>
        </div>
        {[1, 2, 3, 4].map((index) => (
          <div className="flex min-h-24 items-center justify-center rounded-lg border bg-background text-muted-foreground" key={index}>
            <Image className="size-5" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Tag className="size-3.5 text-primary" />
        <span>{product.galleryStatus}</span>
        <span>·</span>
        <span>{adminNextCopy.products.restoreMasterImagesAction}</span>
      </div>
    </section>
  );
}

function RatesPanel({ rates }: { rates: ProductRate[] }) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-products-rates">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-normal">{adminNextCopy.products.ratesTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{adminNextCopy.products.ratesSubtitle}</p>
        </div>
        <span className="rounded-md border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground">
          {adminNextCopy.products.activeRatesLabel(rates.length)}
        </span>
      </div>
      <div className="mt-3 divide-y">
        {rates.map((rate) => (
          <div className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_96px_84px_96px_24px] md:items-center" key={rate.id}>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{rate.name}</div>
              <div className="truncate text-xs text-muted-foreground">{rate.detail}</div>
            </div>
            <RateMetric label={adminNextCopy.products.costLabel} value={rate.cost} />
            <RateMetric label={adminNextCopy.products.marginLabel} value={rate.margin} tone="success" />
            <RateMetric label={adminNextCopy.products.saleLabel} value={rate.sale} />
            <button
              className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground"
              data-testid={`admin-next-products-rate-menu-${rate.id}`}
              type="button"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoPanels({ fixture }: { fixture: ProductsFixture }) {
  const product = fixture.selected;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-products-provider">
        <h3 className="text-base font-semibold tracking-normal">{adminNextCopy.products.providerTitle}</h3>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border bg-background text-primary">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{product.provider}</div>
            <div className="truncate text-xs text-muted-foreground">{product.providerNit}</div>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <div>{product.providerEmail}</div>
          <div>{product.providerPhone}</div>
        </div>
      </section>
      <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-products-operations">
        <h3 className="text-base font-semibold tracking-normal">{adminNextCopy.products.operationsTitle}</h3>
        <div className="mt-3 divide-y">
          {product.operationalDetails.map((detail) => (
            <div className="flex items-center justify-between gap-3 py-2 text-sm" key={detail.label}>
              <span className="text-muted-foreground">{detail.label}</span>
              <span className="text-right font-semibold">{detail.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductsAiPanel({ signals }: { signals: ProductSignal[] }) {
  return (
    <aside
      className="rounded-lg border bg-card p-4 text-card-foreground xl:sticky xl:top-20 xl:self-start"
      data-testid="admin-next-products-ai-panel"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        <Sparkles className="size-4" />
        {adminNextCopy.products.aiPanelEyebrow}
      </div>
      <h2 className="mt-3 text-lg font-semibold tracking-normal">{adminNextCopy.products.aiPanelTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {adminNextCopy.products.aiPanelDescription}
      </p>
      <div className="mt-4 space-y-3">
        {signals.map((signal) => (
          <div className="rounded-md border bg-background p-3" key={signal.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{signal.label}</span>
              <span className="text-xs font-semibold text-primary">{signal.value}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{signal.detail}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function RateMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success';
}) {
  return (
    <div className="min-w-0 rounded-md border bg-background px-2 py-1.5 text-center">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-1 truncate text-xs font-semibold',
          tone === 'success' && 'text-secondary',
        )}
      >
        {value}
      </div>
    </div>
  );
}
