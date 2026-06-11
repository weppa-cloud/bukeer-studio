import type { AdminDataSourceMode } from '@bukeer/admin-contract';
import {
  productsFixture,
  type ProductCategory,
  type ProductRecord,
  type ProductsFixture,
} from '@/lib/admin-next/fixtures/products';

type SupabaseRpcResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseRpcQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

export interface AdminNextProductsReadonlySupabaseClient {
  rpc(
    fn: 'list_account_hotels',
    args: {
      p_account_id: string;
      p_active_only?: boolean;
      p_search?: string;
    },
  ): SupabaseRpcQuery<ReadonlyHotelRow[]>;
  rpc(
    fn: 'list_account_activities',
    args: {
      p_account_id: string;
      p_active_only?: boolean;
      p_limit?: number;
      p_offset?: number;
      p_search?: string;
    },
  ): SupabaseRpcQuery<ReadonlyActivityRow[]>;
}

export interface ProductsAdapter {
  readonly mode: AdminDataSourceMode;
  getProducts(): Promise<ProductsFixture>;
}

export interface ProductsAdapterOptions {
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextProductsReadonlySupabaseClient;
  readonly accountId?: string;
}

type NumericValue = number | string | null | undefined;
type JsonValue = unknown;

interface ReadonlyHotelRow {
  id: string;
  custom_name: string | null;
  hotel_name: string | null;
  hotel_city: string | null;
  hotel_country: string | null;
  hotel_description?: string | null;
  custom_description?: string | null;
  hotel_photos?: JsonValue;
  hotel_star_rating: NumericValue;
  min_price?: NumericValue;
  provider_name: string | null;
  provider_email?: string | null;
  rates_count: NumericValue;
}

interface ReadonlyActivityRow {
  id: string;
  custom_name: string | null;
  activity_name: string | null;
  activity_city: string | null;
  custom_description?: string | null;
  master_photos?: JsonValue;
  min_price?: NumericValue;
  provider_name: string | null;
  provider_email?: string | null;
  options_count: NumericValue;
}

const READONLY_ACTIVITY_LIMIT = 25;
const DEFAULT_CURRENCY = '$';
const CATEGORY_KEYS = {
  all: 'all',
  hotels: 'hotels',
  activities: 'activities',
  transfers: 'transfers',
  flights: 'flights',
} as const;

export function createProductsAdapter(
  options: AdminDataSourceMode | ProductsAdapterOptions = 'fixture',
): ProductsAdapter {
  const normalized = typeof options === 'string' ? { mode: options } : options;
  const mode = normalized.mode ?? 'fixture';

  if (mode === 'readonly' && normalized.supabase && normalized.accountId) {
    return new ReadonlyProductsAdapter(
      normalized.supabase,
      normalized.accountId,
    );
  }

  return new FixtureProductsAdapter(mode);
}

class FixtureProductsAdapter implements ProductsAdapter {
  constructor(readonly mode: AdminDataSourceMode) {}

  async getProducts(): Promise<ProductsFixture> {
    return productsFixture;
  }
}

class ReadonlyProductsAdapter implements ProductsAdapter {
  readonly mode = 'readonly' as const;

  constructor(
    private readonly supabase: AdminNextProductsReadonlySupabaseClient,
    private readonly accountId: string,
  ) {}

  async getProducts(): Promise<ProductsFixture> {
    const [hotelsResponse, activitiesResponse] = await Promise.all([
      this.supabase.rpc('list_account_hotels', {
        p_account_id: this.accountId,
        p_active_only: true,
        p_search: '',
      }),
      this.supabase.rpc('list_account_activities', {
        p_account_id: this.accountId,
        p_active_only: true,
        p_limit: READONLY_ACTIVITY_LIMIT,
        p_offset: 0,
        p_search: '',
      }),
    ]);

    assertReadableResponse('list_account_hotels', hotelsResponse.error);
    assertReadableResponse('list_account_activities', activitiesResponse.error);

    return buildReadonlyProductsFixture(
      hotelsResponse.data ?? [],
      activitiesResponse.data ?? [],
    );
  }
}

function buildReadonlyProductsFixture(
  hotels: readonly ReadonlyHotelRow[],
  activities: readonly ReadonlyActivityRow[],
): ProductsFixture {
  const hotelProducts = hotels.map(mapHotelRowToProduct);
  const activityProducts = activities.map(mapActivityRowToProduct);
  const products = [...hotelProducts, ...activityProducts];
  const selected = buildSelectedProduct(
    products[0] ?? productsFixture.selected,
    hotels[0],
    activities[0],
  );

  return {
    ...productsFixture,
    categories: buildCategories({
      all: products.length,
      hotels: hotelProducts.length,
      activities: activityProducts.length,
    }),
    products,
    selected,
  };
}

function mapHotelRowToProduct(row: ReadonlyHotelRow): ProductRecord {
  const name = firstNonEmpty(
    row.custom_name,
    row.hotel_name,
    productsFixture.products[0].name,
  );
  const provider = firstNonEmpty(row.provider_name, name);
  const priceAmount = readNumber(row.min_price) ?? 0;
  const rateCount = readNumber(row.rates_count) ?? 0;
  const rating = readNumber(row.hotel_star_rating);

  return {
    id: row.id,
    name,
    type:
      productsFixture.categories.find((category) => category.key === 'hotels')
        ?.label ?? productsFixture.products[0].type,
    location: joinLocation(row.hotel_city, row.hotel_country),
    provider,
    providerKey: slugForEntity(provider, row.id),
    status:
      rateCount > 0
        ? productsFixture.products[0].status
        : productsFixture.products[2].status,
    rating:
      rating == null ? productsFixture.products[0].rating : rating.toFixed(1),
    reviews: 0,
    fromPrice: formatCopPrice(priceAmount),
    priceAmount,
    priceUnit: productsFixture.products[0].priceUnit,
    rateState: rateCount > 0 ? 'active' : 'review',
    features: productsFixture.products[0].features.slice(0, 3),
    imageCount: countMedia(row.hotel_photos),
    tone: rateCount > 0 ? 'primary' : 'warning',
  };
}

function mapActivityRowToProduct(row: ReadonlyActivityRow): ProductRecord {
  const name = firstNonEmpty(
    row.custom_name,
    row.activity_name,
    productsFixture.products[1].name,
  );
  const provider = firstNonEmpty(row.provider_name, name);
  const priceAmount = readNumber(row.min_price) ?? 0;
  const optionCount = readNumber(row.options_count) ?? 0;

  return {
    id: row.id,
    name,
    type:
      productsFixture.categories.find(
        (category) => category.key === 'activities',
      )?.label ?? productsFixture.products[1].type,
    location: firstNonEmpty(
      row.activity_city,
      productsFixture.products[1].location,
    ),
    provider,
    providerKey: slugForEntity(provider, row.id),
    status:
      optionCount > 0
        ? productsFixture.products[1].status
        : productsFixture.products[2].status,
    rating: productsFixture.products[1].rating,
    reviews: 0,
    fromPrice: formatCopPrice(priceAmount),
    priceAmount,
    priceUnit: productsFixture.products[1].priceUnit,
    rateState: optionCount > 0 ? 'active' : 'review',
    features: productsFixture.products[1].features.slice(0, 3),
    imageCount: countMedia(row.master_photos),
    tone: optionCount > 0 ? 'live' : 'warning',
  };
}

function buildSelectedProduct(
  product: ProductRecord,
  hotel?: ReadonlyHotelRow,
  activity?: ReadonlyActivityRow,
): ProductsFixture['selected'] {
  const sourceDescription = firstNonEmpty(
    hotel?.custom_description,
    hotel?.hotel_description,
    activity?.custom_description,
    productsFixture.selected.description,
  );
  const sourceEmail = firstNonEmpty(
    hotel?.provider_email,
    activity?.provider_email,
    productsFixture.selected.providerEmail,
  );

  return {
    ...productsFixture.selected,
    ...product,
    code: product.id.toUpperCase(),
    description: sourceDescription,
    providerEmail: sourceEmail,
    providerNit: productsFixture.selected.providerNit,
    providerPhone: productsFixture.selected.providerPhone,
  };
}

function buildCategories(counts: {
  all: number;
  hotels: number;
  activities: number;
}): ProductCategory[] {
  return productsFixture.categories.map((category) => {
    if (category.key === CATEGORY_KEYS.all) {
      return { ...category, count: counts.all };
    }
    if (category.key === CATEGORY_KEYS.hotels) {
      return { ...category, count: counts.hotels };
    }
    if (category.key === CATEGORY_KEYS.activities) {
      return { ...category, count: counts.activities };
    }

    return { ...category, count: 0 };
  });
}

function assertReadableResponse(
  source: string,
  error: { message?: string } | null,
): void {
  if (!error) return;

  throw new Error(
    `${source} readonly query failed: ${error.message ?? 'unknown error'}`,
  );
}

function formatCopPrice(amount: number): string {
  if (amount <= 0) return `${DEFAULT_CURRENCY}0`;

  return `${DEFAULT_CURRENCY}${Math.round(amount).toLocaleString('es-CO')}`;
}

function joinLocation(
  city: string | null | undefined,
  country: string | null | undefined,
): string {
  const parts = [city, country]
    .map((part) => firstNonEmpty(part))
    .filter((part): part is string => Boolean(part));

  return parts.length > 0
    ? parts.join(', ')
    : productsFixture.selected.location;
}

function countMedia(value: JsonValue): number {
  if (Array.isArray(value)) return value.length;

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['images', 'photos', 'gallery']) {
      const candidate = record[key];
      if (Array.isArray(candidate)) return candidate.length;
    }
  }

  return 0;
}

function readNumber(value: NumericValue): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replaceAll(',', '');
    if (normalized.length === 0) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }

  return '';
}

function slugForEntity(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}
