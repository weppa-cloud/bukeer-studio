"use client";

import { useState } from 'react';
import type {
  AdminDataSourceMode,
  AuthenticatedAdminSessionContext,
} from '@bukeer/admin-contract';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Camera,
  Check,
  ChevronRight,
  FileText,
  GripVertical,
  Hotel,
  Image,
  MapPin,
  MapPinned,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Table,
  Trash2,
  UploadCloud,
  Utensils,
  WalletCards,
  X,
} from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  ProductCatalogResolution,
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

const resolverActionClasses: Record<ProductCatalogResolution['action'], string> = {
  link: 'border-secondary/30 bg-secondary/10 text-secondary',
  create: 'border-primary/30 bg-primary/10 text-primary',
  rate_required: 'border-[hsl(var(--bukeer-warning))]/30 bg-[hsl(var(--bukeer-warning)/0.12)] text-[hsl(var(--bukeer-warning))]',
};

type ProductModal = 'import-csv' | 'new-product' | 'new-hotel' | 'new-rate' | 'edit-product' | 'gallery' | null;
type ProductFilters = {
  q: string;
  city: string;
  provider: string;
  tariff: string;
  price: string;
};

const emptyProductFilters: ProductFilters = {
  q: '',
  city: '',
  provider: '',
  tariff: '',
  price: '',
};

export function ProductsModule({
  session,
  fixture,
  dataSourceMode = 'fixture',
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: ProductsFixture;
  dataSourceMode?: AdminDataSourceMode;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  const [activeModal, setActiveModal] = useState<ProductModal>(null);
  const [filters, setFilters] = useState<ProductFilters>(() => readProductFiltersFromUrl());
  const filteredProducts = filterProducts(fixture.products, filters);
  const selectedProduct = buildSelectedProduct(fixture, filteredProducts);

  const updateFilters = (patch: Partial<ProductFilters>) => {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    writeProductFiltersToUrl(nextFilters);
  };

  const clearFilters = () => {
    setFilters(emptyProductFilters);
    writeProductFiltersToUrl(emptyProductFilters);
  };

  return (
    <AdminShell session={session} activeKey="products">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-products-root"
        data-source-mode={dataSourceMode}
        data-theme-preset={evolucionTheme.presetSlug}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <ProductsHeader
              onImportCsv={() => setActiveModal('import-csv')}
              onNewProduct={() => setActiveModal('new-product')}
            />
            <ProductsToolbar
              filters={filters}
              fixture={fixture}
              onClearFilters={clearFilters}
              onFilterChange={updateFilters}
              resultCount={filteredProducts.length}
            />
            <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.82fr)_minmax(360px,0.98fr)]">
              <ProductsGrid products={filteredProducts} selectedId={selectedProduct.id} />
              <ProductDetail fixture={{ ...fixture, selected: selectedProduct }} openModal={setActiveModal} />
            </div>
          </div>
          <ProductsAiPanel signals={fixture.signals} />
        </div>
        <ProductModalOverlay
          fixture={fixture}
          modal={activeModal}
          onClose={() => setActiveModal(null)}
          openModal={setActiveModal}
        />
      </section>
    </AdminShell>
  );
}

function readProductFiltersFromUrl(): ProductFilters {
  if (typeof window === 'undefined') return emptyProductFilters;
  const params = new URLSearchParams(window.location.search);

  return {
    q: params.get('q') ?? '',
    city: params.get('city') ?? '',
    provider: params.get('provider') ?? '',
    tariff: params.get('tariff') ?? '',
    price: params.get('price') ?? '',
  };
}

function writeProductFiltersToUrl(filters: ProductFilters) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  (Object.keys(filters) as Array<keyof ProductFilters>).forEach((key) => {
    const value = filters[key];
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState(null, '', nextUrl);
}

function filterProducts(products: ProductRecord[], filters: ProductFilters) {
  const priceRange = adminNextCopy.products.priceRangeOptions.find((option) => option.key === filters.price);
  const normalizedQuery = filters.q.trim().toLowerCase();

  return products.filter((product) => {
    const textMatch = normalizedQuery
      ? [product.name, product.type, product.location, product.provider].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        )
      : true;
    const cityMatch = filters.city
      ? filters.city === 'cartagena'
        ? product.location.toLowerCase().includes('cartagena') || product.location.toLowerCase().includes('baru')
        : product.location.toLowerCase().includes('san andres')
      : true;
    const providerMatch = filters.provider ? product.providerKey === filters.provider : true;
    const tariffMatch = filters.tariff ? product.rateState === filters.tariff : true;
    const minPrice = priceRange && 'min' in priceRange ? priceRange.min : 0;
    const maxPrice = priceRange && 'max' in priceRange ? priceRange.max : Number.MAX_SAFE_INTEGER;
    const priceMatch = priceRange ? !(product.priceAmount < minPrice || product.priceAmount > maxPrice) : true;

    return textMatch && cityMatch && providerMatch && tariffMatch && priceMatch;
  });
}

function buildSelectedProduct(fixture: ProductsFixture, products: ProductRecord[]): ProductsFixture['selected'] {
  const selected = products.find((product) => product.id === fixture.selected.id);
  if (selected) return fixture.selected;

  const fallback = products[0];
  if (!fallback) return fixture.selected;

  return {
    ...fixture.selected,
    ...fallback,
    code: fallback.id.toUpperCase(),
    description: fallback.features.join(' · '),
    galleryStatus: adminNextCopy.products.galleryStatusLabel(fallback.imageCount),
    masterCatalogStatus: fixture.selected.masterCatalogStatus,
    operationalDetails: fixture.selected.operationalDetails,
  };
}

function ProductsHeader({
  onImportCsv,
  onNewProduct,
}: {
  onImportCsv: () => void;
  onNewProduct: () => void;
}) {
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
          onClick={onImportCsv}
          type="button"
        >
          <UploadCloud className="size-4" />
          {adminNextCopy.products.importAction}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-products-new"
          onClick={onNewProduct}
          type="button"
        >
          <Plus className="size-4" />
          {adminNextCopy.products.primaryAction}
        </button>
      </div>
    </div>
  );
}

function ProductsToolbar({
  filters,
  fixture,
  onClearFilters,
  onFilterChange,
  resultCount,
}: {
  filters: ProductFilters;
  fixture: ProductsFixture;
  onClearFilters: () => void;
  onFilterChange: (patch: Partial<ProductFilters>) => void;
  resultCount: number;
}) {
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground" data-testid="admin-next-products-toolbar">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground lg:w-[360px]">
          <Search className="size-4" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            data-testid="admin-next-products-search-input"
            onChange={(event) => onFilterChange({ q: event.target.value })}
            placeholder={adminNextCopy.products.searchPlaceholder}
            type="search"
            value={filters.q}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex h-9 items-center rounded-md border bg-muted px-3 text-xs font-semibold text-muted-foreground"
            data-testid="admin-next-products-result-count"
          >
            {adminNextCopy.products.resultsLabel(resultCount)}
          </span>
          <button
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-semibold text-muted-foreground',
              filters.city && 'border-primary/40 bg-primary/10 text-primary',
            )}
            data-testid="admin-next-products-city-filter"
            onClick={() => onFilterChange({ city: filters.city ? '' : 'cartagena' })}
            type="button"
          >
            <MapPin className="size-4" />
            {filters.city
              ? adminNextCopy.products.cityFilterOptions.find((option) => option.key === filters.city)?.label
              : adminNextCopy.products.cityFilterLabel}
          </button>
          <button
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-semibold text-muted-foreground',
              filters.price && 'border-primary/40 bg-primary/10 text-primary',
            )}
            data-testid="admin-next-products-price-filter"
            onClick={() => onFilterChange({ price: filters.price ? '' : 'budget' })}
            type="button"
          >
            <SlidersHorizontal className="size-4" />
            {filters.price
              ? adminNextCopy.products.priceRangeOptions.find((option) => option.key === filters.price)?.label
              : adminNextCopy.products.priceFilterLabel}
          </button>
        </div>
      </div>
      <div
        className="mt-3 grid gap-3 rounded-lg border bg-background p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
        data-testid="admin-next-products-advanced-filters"
      >
        <FilterGroup
          activeKey={filters.city}
          icon={<MapPin className="size-3.5" />}
          label={adminNextCopy.products.cityFilterLabel}
          onSelect={(key) => onFilterChange({ city: filters.city === key ? '' : key })}
          options={adminNextCopy.products.cityFilterOptions}
          testIdPrefix="admin-next-products-city-option"
        />
        <FilterGroup
          activeKey={filters.provider}
          icon={<Building2 className="size-3.5" />}
          label={adminNextCopy.products.providerFilterLabel}
          onSelect={(key) => onFilterChange({ provider: filters.provider === key ? '' : key })}
          options={adminNextCopy.products.providerFilterOptions}
          testIdPrefix="admin-next-products-provider-option"
        />
        <FilterGroup
          activeKey={filters.tariff}
          icon={<WalletCards className="size-3.5" />}
          label={adminNextCopy.products.tariffFilterLabel}
          onSelect={(key) => onFilterChange({ tariff: filters.tariff === key ? '' : key })}
          options={adminNextCopy.products.tariffFilterOptions}
          testIdPrefix="admin-next-products-tariff-option"
        />
        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <SlidersHorizontal className="size-3.5" />
              {adminNextCopy.products.priceFilterLabel}
            </span>
            <span data-testid="admin-next-products-url-state-label">{adminNextCopy.products.urlStateLabel}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {adminNextCopy.products.priceRangeOptions.map((option) => (
              <button
                className={cn(
                  'inline-flex h-8 items-center rounded-md border bg-card px-3 text-xs font-semibold text-muted-foreground',
                  filters.price === option.key && 'border-primary/40 bg-primary/10 text-primary',
                )}
                data-testid={`admin-next-products-price-option-${option.key}`}
                key={option.key}
                onClick={() => onFilterChange({ price: filters.price === option.key ? '' : option.key })}
                type="button"
              >
                {option.label}
              </button>
            ))}
            {hasFilters && (
              <button
                className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-semibold text-muted-foreground"
                data-testid="admin-next-products-clear-filters"
                onClick={onClearFilters}
                type="button"
              >
                {adminNextCopy.products.clearFiltersAction}
              </button>
            )}
          </div>
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

function FilterGroup({
  activeKey,
  icon,
  label,
  options,
  testIdPrefix,
  onSelect,
}: {
  activeKey: string;
  icon: React.ReactNode;
  label: string;
  options: ReadonlyArray<{ key: string; label: string; count: number }>;
  testIdPrefix: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-semibold text-muted-foreground',
              activeKey === option.key && 'border-primary/40 bg-primary/10 text-primary',
            )}
            data-testid={`${testIdPrefix}-${option.key}`}
            key={option.key}
            onClick={() => onSelect(option.key)}
            type="button"
          >
            {option.label}
            <span className="rounded-md border bg-background px-1.5 py-0.5 text-[11px]">{option.count}</span>
          </button>
        ))}
      </div>
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
      data-rate-state={product.rateState}
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

function ProductDetail({
  fixture,
  openModal,
}: {
  fixture: ProductsFixture;
  openModal: (modal: ProductModal) => void;
}) {
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
              <span
                className="rounded-md border border-secondary/30 bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary"
                data-testid="admin-next-products-catalog-contract"
              >
                {adminNextCopy.products.catalogContractLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.type} · {product.location} · {product.code}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {adminNextCopy.products.catalogContractValue}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
              data-testid="admin-next-products-edit"
              onClick={() => openModal('edit-product')}
              type="button"
            >
              <Pencil className="size-4" />
              {adminNextCopy.products.editAction}
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
              data-testid="admin-next-products-new-rate"
              onClick={() => openModal('new-rate')}
              type="button"
            >
              <Plus className="size-4" />
              {adminNextCopy.products.newRateAction}
            </button>
          </div>
        </div>
      </div>
      <GalleryPanel onManageImages={() => openModal('gallery')} product={product} />
      <RatesPanel rates={fixture.rates} />
      <InfoPanels fixture={fixture} />
    </section>
  );
}

function GalleryPanel({
  product,
  onManageImages,
}: {
  product: ProductsFixture['selected'];
  onManageImages: () => void;
}) {
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
          onClick={onManageImages}
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

function ProductModalOverlay({
  fixture,
  modal,
  onClose,
  openModal,
}: {
  fixture: ProductsFixture;
  modal: ProductModal;
  onClose: () => void;
  openModal: (modal: ProductModal) => void;
}) {
  if (!modal) return null;

  const modalContent = {
    'import-csv': <ImportCsvModal fixture={fixture} onClose={onClose} />,
    'new-product': <NewProductModal onClose={onClose} openModal={openModal} />,
    'new-hotel': <NewHotelModal fixture={fixture} onClose={onClose} openModal={openModal} />,
    'new-rate': <NewRateModal fixture={fixture} onClose={onClose} />,
    'edit-product': <EditProductModal fixture={fixture} onClose={onClose} />,
    gallery: <GalleryManagerModal fixture={fixture} onClose={onClose} />,
  }[modal];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      {modalContent}
    </div>
  );
}

function ModalFrame({
  children,
  description,
  icon,
  testId,
  title,
  onClose,
}: {
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  testId: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <section
      className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xl"
      data-testid={testId}
    >
      <header className="flex items-start justify-between gap-4 border-b p-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <button
          aria-label={adminNextCopy.products.closeAction}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground"
          data-testid="admin-next-products-modal-close"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="max-h-[calc(92vh-82px)] overflow-y-auto p-4">{children}</div>
    </section>
  );
}

function ImportCsvModal({ fixture, onClose }: { fixture: ProductsFixture; onClose: () => void }) {
  const steps = [
    adminNextCopy.products.importCsvUploadStep,
    adminNextCopy.products.importCsvMapStep,
    adminNextCopy.products.importCsvReviewStep,
  ];
  const warningsCount = 2;
  const errorsCount = 0;

  return (
    <ModalFrame
      description={adminNextCopy.products.importCsvSubtitle}
      icon={<UploadCloud className="size-5" />}
      onClose={onClose}
      testId="admin-next-products-import-csv-modal"
      title={adminNextCopy.products.importCsvTitle}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <div
            className={cn(
              'rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground',
              index === 0 && 'border-primary/40 bg-primary/10 text-primary',
            )}
            data-testid={`admin-next-products-import-step-${index + 1}`}
            key={step}
          >
            {index + 1}. {step}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <section
          className="rounded-lg border border-dashed bg-background p-5"
          data-testid="admin-next-products-import-dropzone"
        >
          <div className="flex min-h-44 flex-col items-center justify-center text-center">
            <UploadCloud className="size-8 text-primary" />
            <h3 className="mt-3 text-base font-semibold">{adminNextCopy.products.importCsvDropTitle}</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {adminNextCopy.products.importCsvDropSubtitle}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold text-muted-foreground"
                data-testid="admin-next-products-import-template"
                type="button"
              >
                <Table className="size-4" />
                {adminNextCopy.products.importCsvTemplateAction}
              </button>
              <span
                className="inline-flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground"
                data-testid="admin-next-products-import-selected-file"
              >
                {adminNextCopy.products.importCsvSelectedFile}
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <ImportMetric label={adminNextCopy.products.importCsvRowsLabel} value={String(fixture.products.length)} />
            <ImportMetric label={adminNextCopy.products.importCsvWarningsLabel} value={String(warningsCount)} tone="warning" />
            <ImportMetric label={adminNextCopy.products.importCsvErrorsLabel} value={String(errorsCount)} tone="success" />
          </div>
        </section>
        <div className="space-y-4">
          <ModalSection icon={<Table className="size-4" />} title={adminNextCopy.products.importCsvMappingTitle}>
            <div className="space-y-2" data-testid="admin-next-products-import-mapping">
              {adminNextCopy.products.importCsvMappings.map((mapping) => (
                <div className="grid gap-2 rounded-md border bg-card p-2 text-sm sm:grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_40px]" key={mapping.source}>
                  <span className="truncate text-muted-foreground">{mapping.source}</span>
                  <ChevronRight className="size-4 self-center text-muted-foreground" />
                  <span className="truncate font-semibold">{mapping.target}</span>
                  <span className="rounded-md border border-secondary/30 bg-secondary/10 px-2 py-1 text-center text-[11px] font-semibold text-secondary">
                    {mapping.state}
                  </span>
                </div>
              ))}
            </div>
          </ModalSection>
          <ModalSection icon={<Search className="size-4" />} title={adminNextCopy.products.importCsvResolverTitle}>
            <p className="text-sm leading-6 text-muted-foreground">
              {adminNextCopy.products.importCsvResolverSubtitle}
            </p>
            <div className="mt-3 overflow-hidden rounded-md border" data-testid="admin-next-products-catalog-resolver">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px_116px] gap-2 border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>{adminNextCopy.products.importCsvResolverSourceLabel}</span>
                <span>{adminNextCopy.products.importCsvResolverMasterLabel}</span>
                <span>{adminNextCopy.products.importCsvResolverConfidenceLabel}</span>
                <span>{adminNextCopy.products.stateLabel}</span>
              </div>
              <div className="divide-y">
                {fixture.catalogResolutions.map((resolution) => (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px_116px] gap-2 px-3 py-2 text-xs"
                    data-testid={`admin-next-products-catalog-resolution-${resolution.id}`}
                    key={resolution.id}
                  >
                    <span className="truncate font-semibold">{resolution.sourceName}</span>
                    <span className="truncate text-muted-foreground">{resolution.masterName}</span>
                    <span className="font-semibold text-muted-foreground">{resolution.confidence}</span>
                    <span className={cn('rounded-md border px-2 py-1 text-center font-semibold', resolverActionClasses[resolution.action])}>
                      {adminNextCopy.products.resolverActionLabels[resolution.action]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ModalSection>
        </div>
      </div>
      <section className="mt-4 rounded-lg border bg-background p-4" data-testid="admin-next-products-import-preview">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{adminNextCopy.products.importCsvPreviewTitle}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {adminNextCopy.products.importCsvResultLabel(adminNextCopy.products.importCsvPreviewRows.length)}
            </span>
            <button
              className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-medium text-muted-foreground"
              data-testid="admin-next-products-modal-cancel"
              onClick={onClose}
              type="button"
            >
              {adminNextCopy.products.cancelAction}
            </button>
            <button
              className="inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
              data-testid="admin-next-products-import-confirm"
              onClick={onClose}
              type="button"
            >
              <Check className="size-3.5" />
              {adminNextCopy.products.importCsvConfirmAction}
            </button>
          </div>
        </div>
        <div className="mt-3 divide-y">
          {adminNextCopy.products.importCsvPreviewRows.map((row) => (
            <div
              className="grid gap-3 py-3 text-sm md:grid-cols-[minmax(0,1fr)_120px_140px_160px] md:items-center"
              data-testid={`admin-next-products-import-row-${row.name.toLowerCase().replaceAll(' ', '-')}`}
              key={row.name}
            >
              <span className="font-semibold">{row.name}</span>
              <span className="text-muted-foreground">{row.type}</span>
              <span className="text-muted-foreground">{row.city}</span>
              <span className="rounded-md border bg-card px-2 py-1 text-xs font-semibold text-muted-foreground">
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </ModalFrame>
  );
}

function NewProductModal({
  onClose,
  openModal,
}: {
  onClose: () => void;
  openModal: (modal: ProductModal) => void;
}) {
  const types = [
    { label: adminNextCopy.products.productTypeHotel, icon: Hotel, active: true },
    { label: adminNextCopy.products.productTypeActivity, icon: Sparkles, active: false },
    { label: adminNextCopy.products.productTypeTransfer, icon: MapPinned, active: false },
  ];

  return (
    <ModalFrame
      description={adminNextCopy.products.newProductSubtitle}
      icon={<Plus className="size-5" />}
      onClose={onClose}
      testId="admin-next-products-new-product-modal"
      title={adminNextCopy.products.newProductTitle}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {types.map((type) => {
          const Icon = type.icon;
          return (
            <button
              className={cn(
                'min-h-32 rounded-lg border bg-background p-4 text-left',
                type.active && 'border-primary/40 bg-primary/10 text-primary',
              )}
              data-testid={`admin-next-products-type-${type.label.toLowerCase()}`}
              key={type.label}
              type="button"
            >
              <Icon className="size-5" />
              <div className="mt-4 text-base font-semibold">{type.label}</div>
              {type.active && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold">
                  <Check className="size-3.5" />
                  {adminNextCopy.products.activeRateLabel}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-4 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
        {adminNextCopy.products.newProductHint}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
          data-testid="admin-next-products-modal-cancel"
          onClick={onClose}
          type="button"
        >
          {adminNextCopy.products.cancelAction}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-products-modal-continue"
          onClick={() => openModal('new-hotel')}
          type="button"
        >
          {adminNextCopy.products.continueAction}
          <ChevronRight className="size-4" />
        </button>
      </div>
    </ModalFrame>
  );
}

function NewHotelModal({
  fixture,
  onClose,
  openModal,
}: {
  fixture: ProductsFixture;
  onClose: () => void;
  openModal: (modal: ProductModal) => void;
}) {
  const product = fixture.selected;
  const steps = [
    adminNextCopy.products.stepInfo,
    adminNextCopy.products.stepLocation,
    adminNextCopy.products.stepDetails,
    adminNextCopy.products.stepProvider,
  ];

  return (
    <ModalFrame
      description={adminNextCopy.products.newHotelSubtitle}
      icon={<Hotel className="size-5" />}
      onClose={onClose}
      testId="admin-next-products-new-hotel-modal"
      title={adminNextCopy.products.newHotelTitle}
    >
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div
            className={cn(
              'rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground',
              index === 0 && 'border-primary/40 bg-primary/10 text-primary',
            )}
            key={step}
          >
            {index + 1}. {step}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ModalSection icon={<FileText className="size-4" />} title={adminNextCopy.products.sectionBasicInfo}>
          <ModalField label={adminNextCopy.products.productNameLabel} value={product.name} />
          <ModalField label={adminNextCopy.products.shortDescriptionLabel} value={product.type} />
          <ModalField label={adminNextCopy.products.longDescriptionLabel} value={product.description} multiline />
        </ModalSection>
        <ModalSection icon={<MapPinned className="size-4" />} title={adminNextCopy.products.sectionLocation}>
          <ModalField label={adminNextCopy.products.locationSearchLabel} value={product.location} />
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
            {adminNextCopy.products.selectedLocation}: {product.location}
          </div>
        </ModalSection>
        <ModalSection icon={<Utensils className="size-4" />} title={adminNextCopy.products.sectionServiceDetails}>
          <ModalField label={adminNextCopy.products.includesLabel} value={product.features.join(', ')} />
          <ModalField label={adminNextCopy.products.extraCostsLabel} value={fixture.rates[0]?.cost ?? product.fromPrice} />
          <ModalField label={adminNextCopy.products.recommendationsLabel} value={product.operationalDetails[2]?.value ?? product.status} />
        </ModalSection>
        <ModalSection icon={<Building2 className="size-4" />} title={adminNextCopy.products.sectionProviderStatus}>
          <ModalField label={adminNextCopy.products.providerTitle} value={product.provider} />
          <ModalField label={adminNextCopy.products.stateLabel} value={product.status} />
          <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            {adminNextCopy.products.mandatoryRateNote}
          </div>
        </ModalSection>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
          data-testid="admin-next-products-modal-back"
          onClick={() => openModal('new-product')}
          type="button"
        >
          <ArrowLeft className="size-4" />
          {adminNextCopy.products.backAction}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-products-modal-finish-hotel"
          onClick={() => openModal('new-rate')}
          type="button"
        >
          {adminNextCopy.products.finishHotelAction}
          <WalletCards className="size-4" />
        </button>
      </div>
    </ModalFrame>
  );
}

function NewRateModal({ fixture, onClose }: { fixture: ProductsFixture; onClose: () => void }) {
  const rate = fixture.rates[0];

  return (
    <ModalFrame
      description={adminNextCopy.products.newRateSubtitle}
      icon={<WalletCards className="size-5" />}
      onClose={onClose}
      testId="admin-next-products-new-rate-modal"
      title={adminNextCopy.products.newRateTitle}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 md:grid-cols-2">
          <ModalField label={adminNextCopy.products.rateNameLabel} value={rate?.name ?? fixture.selected.name} />
          <ModalField label={adminNextCopy.products.netCostLabel} value={rate?.cost ?? fixture.selected.fromPrice} />
          <ModalField label={adminNextCopy.products.currencyLabel} value="COP" />
          <ModalField label={adminNextCopy.products.priceCalculationLabel} value={adminNextCopy.products.fromMarginLabel} />
          <ModalField label={adminNextCopy.products.marginPercentLabel} value={rate?.margin ?? '20%'} />
          <ModalField label={adminNextCopy.products.roomTypeLabel} value={rate?.detail ?? fixture.selected.type} />
          <ModalField label={adminNextCopy.products.mealPlanLabel} value={fixture.selected.features[0] ?? fixture.selected.type} />
          <ModalField label={adminNextCopy.products.capacityLabel} value="2 pax" />
          <ModalField label={adminNextCopy.products.stateLabel} value={adminNextCopy.products.activeRateLabel} />
        </div>
        <aside className="rounded-lg border bg-muted p-4" data-testid="admin-next-products-rate-summary">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WalletCards className="size-4 text-primary" />
            {adminNextCopy.products.priceFormulaNote}
          </div>
          <div className="mt-4 space-y-3">
            <RateMetric label={adminNextCopy.products.costLabel} value={rate?.cost ?? fixture.selected.fromPrice} />
            <RateMetric label={adminNextCopy.products.gainLabel} value="$290.000" tone="success" />
            <RateMetric label={adminNextCopy.products.saleLabel} value={rate?.sale ?? fixture.selected.fromPrice} />
          </div>
        </aside>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
          data-testid="admin-next-products-modal-cancel"
          onClick={onClose}
          type="button"
        >
          {adminNextCopy.products.cancelAction}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-products-modal-save-rate"
          onClick={onClose}
          type="button"
        >
          <Check className="size-4" />
          {adminNextCopy.products.saveRateAction}
        </button>
      </div>
    </ModalFrame>
  );
}

function EditProductModal({ fixture, onClose }: { fixture: ProductsFixture; onClose: () => void }) {
  const product = fixture.selected;

  return (
    <ModalFrame
      description={adminNextCopy.products.editProductSubtitle}
      icon={<Pencil className="size-5" />}
      onClose={onClose}
      testId="admin-next-products-edit-modal"
      title={adminNextCopy.products.editProductTitle}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ModalSection icon={<Hotel className="size-4" />} title={adminNextCopy.products.catalogNameLockedLabel}>
          <ModalField label={adminNextCopy.products.productNameLabel} value={product.name} />
          <ModalField label={adminNextCopy.products.locationSearchLabel} value={product.location} />
          <ModalField label={adminNextCopy.products.shortDescriptionLabel} value={product.description} multiline />
        </ModalSection>
        <ModalSection icon={<Building2 className="size-4" />} title={adminNextCopy.products.sectionProviderStatus}>
          <ModalField label={adminNextCopy.products.providerTitle} value={product.provider} />
          <ModalField label={adminNextCopy.products.stateLabel} value={product.status} />
          <ModalField label={adminNextCopy.products.restoreMasterImagesAction} value={product.masterCatalogStatus} />
        </ModalSection>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/30 bg-background px-3 text-sm font-semibold text-destructive"
          data-testid="admin-next-products-modal-delete-product"
          type="button"
        >
          <Trash2 className="size-4" />
          {adminNextCopy.products.deleteProductAction}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-products-modal-save-product"
          onClick={onClose}
          type="button"
        >
          <Check className="size-4" />
          {adminNextCopy.products.saveChangesAction}
        </button>
      </div>
    </ModalFrame>
  );
}

function GalleryManagerModal({ fixture, onClose }: { fixture: ProductsFixture; onClose: () => void }) {
  const product = fixture.selected;
  const imageIndexes = Array.from({ length: product.imageCount }, (_, index) => index + 1);

  return (
    <ModalFrame
      description={adminNextCopy.products.galleryModalSubtitle}
      icon={<Camera className="size-5" />}
      onClose={onClose}
      testId="admin-next-products-gallery-modal"
      title={adminNextCopy.products.galleryModalTitle}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
        <span>{adminNextCopy.products.autosaveLabel}</span>
        <span>{adminNextCopy.products.dragReorderLabel}</span>
        <span>{product.galleryStatus}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {imageIndexes.map((index) => (
          <div
            className="min-h-36 rounded-lg border bg-background p-3"
            data-testid={`admin-next-products-gallery-tile-${index}`}
            key={index}
          >
            <div className="flex h-20 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Image className="size-6" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{adminNextCopy.products.imageSlotLabel(index)}</span>
              <GripVertical className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={cn('rounded-md border px-2 py-1 text-[11px] font-semibold', index === 1 ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                {index === 1 ? adminNextCopy.products.primaryImageLabel : product.type}
              </span>
              <button
                aria-label={adminNextCopy.products.deleteImageAction}
                className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground"
                data-testid={`admin-next-products-gallery-delete-${index}`}
                type="button"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        <button
          className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background p-3 text-sm font-semibold text-muted-foreground"
          data-testid="admin-next-products-gallery-add"
          type="button"
        >
          <UploadCloud className="size-6 text-primary" />
          {adminNextCopy.products.addImageAction}
        </button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold text-muted-foreground"
          data-testid="admin-next-products-gallery-restore"
          type="button"
        >
          <RotateCcw className="size-4" />
          {adminNextCopy.products.restoreMasterImagesAction}
        </button>
        <button
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-products-modal-save-product"
          onClick={onClose}
          type="button"
        >
          {adminNextCopy.products.saveChangesAction}
        </button>
      </div>
    </ModalFrame>
  );
}

function ModalSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ModalField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span
        className={cn(
          'mt-1 flex min-h-10 items-center rounded-md border bg-card px-3 py-2 text-sm',
          multiline && 'min-h-24 items-start leading-6',
        )}
      >
        {value}
      </span>
    </label>
  );
}

function ImportMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'warning';
}) {
  return (
    <div className="rounded-md border bg-card p-3 text-center">
      <div
        className={cn(
          'text-lg font-semibold',
          tone === 'success' && 'text-secondary',
          tone === 'warning' && 'text-[hsl(var(--bukeer-warning))]',
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
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
