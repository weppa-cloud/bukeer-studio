"use client";

import { useState } from 'react';
import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
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

type ProductModal = 'import-csv' | 'new-product' | 'new-hotel' | 'new-rate' | 'edit-product' | 'gallery' | null;

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
  const [activeModal, setActiveModal] = useState<ProductModal>(null);

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
            <ProductsHeader
              onImportCsv={() => setActiveModal('import-csv')}
              onNewProduct={() => setActiveModal('new-product')}
            />
            <ProductsToolbar fixture={fixture} />
            <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.82fr)_minmax(360px,0.98fr)]">
              <ProductsGrid products={fixture.products} selectedId={fixture.selected.id} />
              <ProductDetail fixture={fixture} openModal={setActiveModal} />
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
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.type} · {product.location} · {product.code}
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
