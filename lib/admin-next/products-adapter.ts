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

type SupabaseReadQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

interface SupabaseReadFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabaseReadFilter<T>;
  limit(count: number): SupabaseReadFilter<T>;
}

interface SupabaseReadBuilder {
  select<T = unknown>(columns: string): SupabaseReadFilter<T>;
}

export interface AdminNextProductsReadonlySupabaseClient {
  from(table: 'account_hotels' | 'account_activities'): SupabaseReadBuilder;
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
  hotel_name?: string | null;
  hotel_city?: string | null;
  hotel_country?: string | null;
  hotel_description?: string | null;
  custom_description?: string | null;
  hotel_photos?: JsonValue;
  hotel_star_rating?: NumericValue;
  min_price?: NumericValue;
  provider_name?: string | null;
  provider_email?: string | null;
  rates_count?: NumericValue;
  master_hotels?: ReadonlyMasterHotelRow | ReadonlyMasterHotelRow[] | null;
  contacts?: ReadonlyProviderContactRow | ReadonlyProviderContactRow[] | null;
  account_rates?: ReadonlyAccountRateRow[] | null;
}

interface ReadonlyActivityRow {
  id: string;
  custom_name: string | null;
  activity_name?: string | null;
  activity_city?: string | null;
  custom_description?: string | null;
  master_photos?: JsonValue;
  min_price?: NumericValue;
  provider_name?: string | null;
  provider_email?: string | null;
  options_count?: NumericValue;
  master_activities?:
    | ReadonlyMasterActivityRow
    | ReadonlyMasterActivityRow[]
    | null;
  contacts?: ReadonlyProviderContactRow | ReadonlyProviderContactRow[] | null;
  activity_options?: ReadonlyActivityOptionRow[] | null;
}

interface ReadonlyMasterHotelRow {
  id?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  photos?: JsonValue;
  star_rating?: NumericValue;
  user_rating?: NumericValue;
  reviews_count?: NumericValue;
}

interface ReadonlyMasterActivityRow {
  id?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  description_short?: string | null;
  photos?: JsonValue;
  duration_minutes?: NumericValue;
  experience_type?: string | null;
}

interface ReadonlyProviderContactRow {
  id?: string | null;
  name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

interface ReadonlyAccountRateRow {
  id?: string | null;
  display_name?: string | null;
  room_type_code?: string | null;
  meal_plan?: string | null;
  price?: NumericValue;
  unit_cost?: NumericValue;
  profit_amount?: NumericValue;
  profit_pct?: NumericValue;
  currency?: string | null;
  is_active?: boolean | null;
}

interface ReadonlyActivityOptionRow {
  id?: string | null;
  name?: string | null;
  pricing_per?: string | null;
  is_active?: boolean | null;
  activity_prices?: ReadonlyActivityPriceRow[] | null;
}

interface ReadonlyActivityPriceRow {
  id?: string | null;
  unit_type_code?: string | null;
  season?: string | null;
  price?: NumericValue;
  unit_cost?: NumericValue;
  profit_amount?: NumericValue;
  profit_pct?: NumericValue;
  currency?: string | null;
  is_active?: boolean | null;
}

interface RateSummary {
  activePricedCount: number;
  minPrice: number | null;
}

const READONLY_PRODUCT_LIMIT = 25;
const READONLY_DETAIL_RATE_LIMIT = 6;
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
      readAccountHotels(this.supabase, this.accountId),
      readAccountActivities(this.supabase, this.accountId),
    ]);

    assertReadableResponse('account_hotels', hotelsResponse.error);
    assertReadableResponse('account_activities', activitiesResponse.error);

    return buildReadonlyProductsFixture(
      hotelsResponse.data ?? [],
      activitiesResponse.data ?? [],
    );
  }
}

function readAccountHotels(
  supabase: AdminNextProductsReadonlySupabaseClient,
  accountId: string,
): SupabaseReadQuery<ReadonlyHotelRow[]> {
  return supabase
    .from('account_hotels')
    .select<
      ReadonlyHotelRow[]
    >(['id', 'custom_name', 'custom_description', 'is_active', 'provider_contact_id', 'master_hotels(id, name, city, country, description, photos, star_rating, user_rating, reviews_count)', 'contacts!account_hotels_provider_contact_id_fkey(id, name, last_name, email)', 'account_rates(id, display_name, room_type_code, meal_plan, unit_cost, price, profit_amount, profit_pct, currency, is_active)'].join(', '))
    .eq('account_id', accountId)
    .eq('is_active', true)
    .limit(READONLY_PRODUCT_LIMIT);
}

function readAccountActivities(
  supabase: AdminNextProductsReadonlySupabaseClient,
  accountId: string,
): SupabaseReadQuery<ReadonlyActivityRow[]> {
  return supabase
    .from('account_activities')
    .select<
      ReadonlyActivityRow[]
    >(['id', 'custom_name', 'custom_description', 'is_active', 'provider_contact_id', 'master_activities(id, name, city, country, description, description_short, photos, duration_minutes, experience_type)', 'contacts!account_activities_provider_contact_id_fkey(id, name, last_name, email)', 'activity_options(id, name, pricing_per, is_active, activity_prices(id, unit_type_code, season, unit_cost, price, profit_amount, profit_pct, currency, is_active))'].join(', '))
    .eq('account_id', accountId)
    .eq('is_active', true)
    .limit(READONLY_PRODUCT_LIMIT);
}

function buildReadonlyProductsFixture(
  hotels: readonly ReadonlyHotelRow[],
  activities: readonly ReadonlyActivityRow[],
): ProductsFixture {
  const hotelProducts = hotels.map(mapHotelRowToProduct);
  const activityProducts = activities.map(mapActivityRowToProduct);
  const products = [...hotelProducts, ...activityProducts];
  const selectedSource = findDefaultSelectedSource(hotels, activities);
  const selectedProduct =
    products.find((product) => product.id === selectedSource?.id) ??
    products[0] ??
    productsFixture.selected;
  const selected = buildSelectedProduct(
    selectedProduct,
    selectedSource?.type === 'hotel' ? selectedSource.row : undefined,
    selectedSource?.type === 'activity' ? selectedSource.row : undefined,
  );
  const rates = buildSelectedRates(
    selectedSource?.type === 'hotel' ? selectedSource.row : undefined,
    selectedSource?.type === 'activity' ? selectedSource.row : undefined,
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
    rates,
  };
}

function findDefaultSelectedSource(
  hotels: readonly ReadonlyHotelRow[],
  activities: readonly ReadonlyActivityRow[],
):
  | { type: 'hotel'; id: string; row: ReadonlyHotelRow }
  | { type: 'activity'; id: string; row: ReadonlyActivityRow }
  | null {
  const pricedHotel = hotels.find(
    (hotel) => summarizeRates(hotel.account_rates ?? []).activePricedCount > 0,
  );
  if (pricedHotel) {
    return { type: 'hotel', id: pricedHotel.id, row: pricedHotel };
  }

  const pricedActivity = activities.find(
    (activity) =>
      summarizeActivityOptions(activity.activity_options ?? [])
        .activePricedCount > 0,
  );
  if (pricedActivity) {
    return { type: 'activity', id: pricedActivity.id, row: pricedActivity };
  }

  if (hotels[0]) return { type: 'hotel', id: hotels[0].id, row: hotels[0] };
  if (activities[0]) {
    return { type: 'activity', id: activities[0].id, row: activities[0] };
  }

  return null;
}

function mapHotelRowToProduct(row: ReadonlyHotelRow): ProductRecord {
  const master = firstRelation(row.master_hotels);
  const providerContact = firstRelation(row.contacts);
  const rateSummary = summarizeRates(row.account_rates ?? []);
  const name = firstNonEmpty(
    row.custom_name,
    row.hotel_name,
    master?.name,
    productsFixture.products[0].name,
  );
  const provider = firstNonEmpty(
    row.provider_name,
    fullContactName(providerContact),
    providerContact?.email,
    name,
  );
  const priceAmount = rateSummary.minPrice ?? readNumber(row.min_price) ?? 0;
  const rateCount =
    rateSummary.activePricedCount > 0
      ? rateSummary.activePricedCount
      : readNumber(row.rates_count) ?? 0;
  const rating =
    readNumber(row.hotel_star_rating) ??
    readNumber(master?.user_rating) ??
    readNumber(master?.star_rating);
  const reviewCount = readNumber(master?.reviews_count) ?? 0;

  return {
    id: row.id,
    name,
    type:
      productsFixture.categories.find((category) => category.key === 'hotels')
        ?.label ?? productsFixture.products[0].type,
    location: joinLocation(
      row.hotel_city ?? master?.city,
      row.hotel_country ?? master?.country,
    ),
    provider,
    providerKey: slugForEntity(provider, row.id),
    status:
      rateCount > 0
        ? productsFixture.products[0].status
        : productsFixture.products[2].status,
    rating:
      rating == null ? productsFixture.products[0].rating : rating.toFixed(1),
    reviews: reviewCount,
    fromPrice: formatCopPrice(priceAmount),
    priceAmount,
    priceUnit: productsFixture.products[0].priceUnit,
    rateState: rateCount > 0 ? 'active' : 'review',
    features: productsFixture.products[0].features.slice(0, 3),
    imageCount: countMedia(row.hotel_photos ?? master?.photos),
    tone: rateCount > 0 ? 'primary' : 'warning',
  };
}

function mapActivityRowToProduct(row: ReadonlyActivityRow): ProductRecord {
  const master = firstRelation(row.master_activities);
  const providerContact = firstRelation(row.contacts);
  const rateSummary = summarizeActivityOptions(row.activity_options ?? []);
  const name = firstNonEmpty(
    row.custom_name,
    row.activity_name,
    master?.name,
    productsFixture.products[1].name,
  );
  const provider = firstNonEmpty(
    row.provider_name,
    fullContactName(providerContact),
    providerContact?.email,
    name,
  );
  const priceAmount = rateSummary.minPrice ?? readNumber(row.min_price) ?? 0;
  const optionCount =
    rateSummary.activePricedCount > 0
      ? rateSummary.activePricedCount
      : readNumber(row.options_count) ?? 0;

  return {
    id: row.id,
    name,
    type:
      productsFixture.categories.find(
        (category) => category.key === 'activities',
      )?.label ?? productsFixture.products[1].type,
    location: joinLocation(row.activity_city ?? master?.city, master?.country),
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
    imageCount: countMedia(row.master_photos ?? master?.photos),
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
    firstRelation(hotel?.master_hotels)?.description,
    activity?.custom_description,
    firstRelation(activity?.master_activities)?.description_short,
    firstRelation(activity?.master_activities)?.description,
    productsFixture.selected.description,
  );
  const sourceEmail = firstNonEmpty(
    hotel?.provider_email,
    firstRelation(hotel?.contacts)?.email,
    activity?.provider_email,
    firstRelation(activity?.contacts)?.email,
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

function buildSelectedRates(
  hotel?: ReadonlyHotelRow,
  activity?: ReadonlyActivityRow,
): ProductsFixture['rates'] {
  if (hotel) return mapHotelRates(hotel.account_rates ?? []);
  if (activity) return mapActivityRates(activity.activity_options ?? []);

  return productsFixture.rates;
}

function mapHotelRates(
  rates: readonly ReadonlyAccountRateRow[],
): ProductsFixture['rates'] {
  return rates
    .filter((rate) => isActivePricedRow(rate))
    .sort(comparePriceAsc)
    .slice(0, READONLY_DETAIL_RATE_LIMIT)
    .map((rate, index) => ({
      id: firstNonEmpty(rate.id, `hotel-rate-${index + 1}`),
      name: firstNonEmpty(
        rate.display_name,
        rate.room_type_code,
        rate.meal_plan,
        `Tarifa ${index + 1}`,
      ),
      detail: firstNonEmpty(rate.meal_plan, 'Por noche'),
      cost: formatCopPrice(readNumber(rate.unit_cost) ?? 0),
      margin: formatMargin(rate),
      sale: formatCopPrice(readNumber(rate.price) ?? 0),
    }));
}

function mapActivityRates(
  options: readonly ReadonlyActivityOptionRow[],
): ProductsFixture['rates'] {
  return options
    .filter((option) => option.is_active !== false)
    .flatMap((option) =>
      (option.activity_prices ?? []).map((price) => ({ option, price })),
    )
    .filter(({ price }) => isActivePricedRow(price))
    .sort((left, right) => comparePriceAsc(left.price, right.price))
    .slice(0, READONLY_DETAIL_RATE_LIMIT)
    .map(({ option, price }, index) => ({
      id: firstNonEmpty(price.id, option.id, `activity-rate-${index + 1}`),
      name: firstNonEmpty(
        option.name,
        price.unit_type_code,
        price.season,
        `Tarifa ${index + 1}`,
      ),
      detail: firstNonEmpty(option.pricing_per, price.season, 'Por persona'),
      cost: formatCopPrice(readNumber(price.unit_cost) ?? 0),
      margin: formatMargin(price),
      sale: formatCopPrice(readNumber(price.price) ?? 0),
    }));
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

function summarizeRates(
  rates: readonly ReadonlyAccountRateRow[],
): RateSummary {
  return summarizePricedRows(rates);
}

function summarizeActivityOptions(
  options: readonly ReadonlyActivityOptionRow[],
): RateSummary {
  const prices = options
    .filter((option) => option.is_active !== false)
    .flatMap((option) => option.activity_prices ?? []);

  return summarizePricedRows(prices);
}

function summarizePricedRows(
  rows: readonly (ReadonlyAccountRateRow | ReadonlyActivityPriceRow)[],
): RateSummary {
  const prices = rows
    .filter((row) => row.is_active !== false)
    .map((row) => readNumber(row.price))
    .filter((price): price is number => price != null && price > 0);

  return {
    activePricedCount: prices.length,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
  };
}

function isActivePricedRow(
  row: ReadonlyAccountRateRow | ReadonlyActivityPriceRow,
): boolean {
  const price = readNumber(row.price);

  return row.is_active !== false && price != null && price > 0;
}

function comparePriceAsc(
  left: ReadonlyAccountRateRow | ReadonlyActivityPriceRow,
  right: ReadonlyAccountRateRow | ReadonlyActivityPriceRow,
): number {
  return (readNumber(left.price) ?? 0) - (readNumber(right.price) ?? 0);
}

function formatMargin(
  row: ReadonlyAccountRateRow | ReadonlyActivityPriceRow,
): string {
  const profitPct = readNumber(row.profit_pct);
  if (profitPct != null) return `${Math.round(profitPct)}%`;

  const price = readNumber(row.price);
  const profitAmount = readNumber(row.profit_amount);
  if (price && profitAmount != null) {
    return `${Math.round((profitAmount / price) * 100)}%`;
  }

  return productsFixture.rates[0]?.margin ?? '0%';
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function fullContactName(
  contact: ReadonlyProviderContactRow | null,
): string | null {
  if (!contact) return null;

  const name = [contact.name, contact.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim();

  return name || null;
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
