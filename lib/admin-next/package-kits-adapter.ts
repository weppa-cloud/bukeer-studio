import type { AdminDataSourceMode } from "@bukeer/admin-contract";
import {
  packageKitsFixture,
  type PackageKitsFixture,
  type PackageKitSignal,
  type PackageKitStatus,
  type PackageKitSummary,
  type PackageKitTone,
} from "@/lib/admin-next/fixtures/package-kits";

type SupabaseRpcResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseReadQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

interface SupabasePackageKitsFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabasePackageKitsFilter<T>;
  in(column: string, values: readonly unknown[]): SupabasePackageKitsFilter<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabasePackageKitsFilter<T>;
  limit(count: number): SupabasePackageKitsFilter<T>;
}

interface SupabasePackageKitsBuilder {
  select<T = unknown>(columns: string): SupabasePackageKitsFilter<T>;
}

export interface AdminNextPackageKitsReadonlySupabaseClient {
  from(
    table: "package_kits" | "package_kit_versions",
  ): SupabasePackageKitsBuilder;
}

export interface PackageKitsAdapter {
  readonly mode: AdminDataSourceMode;
  getPackageKits(): Promise<PackageKitsFixture>;
}

export interface PackageKitsAdapterOptions {
  readonly accountId?: string;
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextPackageKitsReadonlySupabaseClient;
}

type NumericValue = number | string | null | undefined;
type JsonValue = unknown;

type PackageKitRow = {
  id: string;
  name: string | null;
  slug: string | null;
  status: string | null;
  category: string | null;
  destination: string | null;
  duration_days: NumericValue;
  duration_nights: NumericValue;
  description: string | null;
  program_highlights: JsonValue;
  program_inclusions: JsonValue;
  pricing_tiers: JsonValue;
  base_version_id: string | null;
  source_itinerary_id: string | null;
  usage_count: NumericValue;
  updated_at: string | null;
  created_at: string | null;
};

type PackageKitVersionRow = {
  id: string;
  package_kit_id: string;
  version_label: string | null;
  version_number: NumericValue;
  is_active: boolean | null;
  is_base_version: boolean | null;
  is_fx_locked: boolean | null;
  base_currency: string | null;
  passenger_count: NumericValue;
  markup_percentage: NumericValue;
  price_per_person: NumericValue;
  pricing_pp_locked: NumericValue;
  pricing_total_locked: NumericValue;
  total_price: NumericValue;
  updated_at: string | null;
};

const PACKAGE_KIT_COLUMNS = [
  "id",
  "name",
  "slug",
  "status",
  "category",
  "destination",
  "duration_days",
  "duration_nights",
  "description",
  "program_highlights",
  "program_inclusions",
  "pricing_tiers",
  "base_version_id",
  "source_itinerary_id",
  "usage_count",
  "updated_at",
  "created_at",
].join(",");
const VERSION_COLUMNS = [
  "id",
  "package_kit_id",
  "version_label",
  "version_number",
  "is_active",
  "is_base_version",
  "is_fx_locked",
  "base_currency",
  "passenger_count",
  "markup_percentage",
  "price_per_person",
  "pricing_pp_locked",
  "pricing_total_locked",
  "total_price",
  "updated_at",
].join(",");
const READONLY_PACKAGE_KIT_LIMIT = 80;
const READONLY_VERSION_LIMIT = 160;

export function createPackageKitsAdapter(
  options: AdminDataSourceMode | PackageKitsAdapterOptions = "fixture",
): PackageKitsAdapter {
  const normalized = typeof options === "string" ? { mode: options } : options;
  const mode = normalized.mode ?? "fixture";

  if (mode === "readonly" && normalized.supabase && normalized.accountId) {
    return new ReadonlyPackageKitsAdapter(
      normalized.supabase,
      normalized.accountId,
    );
  }

  return new FixturePackageKitsAdapter(mode);
}

class FixturePackageKitsAdapter implements PackageKitsAdapter {
  constructor(readonly mode: AdminDataSourceMode) {}

  async getPackageKits(): Promise<PackageKitsFixture> {
    return packageKitsFixture;
  }
}

class ReadonlyPackageKitsAdapter implements PackageKitsAdapter {
  readonly mode = "readonly" as const;

  constructor(
    private readonly supabase: AdminNextPackageKitsReadonlySupabaseClient,
    private readonly accountId: string,
  ) {}

  async getPackageKits(): Promise<PackageKitsFixture> {
    const { data, error } = await this.supabase
      .from("package_kits")
      .select<PackageKitRow[]>(PACKAGE_KIT_COLUMNS)
      .eq("account_id", this.accountId)
      .order("updated_at", { ascending: false })
      .limit(READONLY_PACKAGE_KIT_LIMIT);

    if (error) {
      throw new Error(
        `Package kits readonly adapter failed: ${error.message ?? "unknown error"}`,
      );
    }

    const rows = data ?? [];
    if (rows.length === 0) return buildReadonlyFixture(rows, new Map());

    const versions = await this.readVersions(rows);
    return buildReadonlyFixture(rows, versions);
  }

  private async readVersions(
    rows: readonly PackageKitRow[],
  ): Promise<ReadonlyMap<string, PackageKitVersionRow[]>> {
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return new Map();

    const { data, error } = await this.supabase
      .from("package_kit_versions")
      .select<PackageKitVersionRow[]>(VERSION_COLUMNS)
      .eq("account_id", this.accountId)
      .in("package_kit_id", ids)
      .order("version_number", { ascending: false })
      .limit(READONLY_VERSION_LIMIT);

    if (error) {
      throw new Error(
        `Package kit versions readonly adapter failed: ${error.message ?? "unknown error"}`,
      );
    }

    const grouped = new Map<string, PackageKitVersionRow[]>();
    for (const version of data ?? []) {
      const existing = grouped.get(version.package_kit_id) ?? [];
      existing.push(version);
      grouped.set(version.package_kit_id, existing);
    }
    return grouped;
  }
}

function buildReadonlyFixture(
  rows: readonly PackageKitRow[],
  versionsByKit: ReadonlyMap<string, PackageKitVersionRow[]>,
): PackageKitsFixture {
  if (rows.length === 0) {
    return {
      ...packageKitsFixture,
      kits: [],
      signals: buildSignals(rows, versionsByKit),
    };
  }

  const kits = rows.map((row) =>
    mapKitSummary(row, selectedVersion(row, versionsByKit.get(row.id) ?? [])),
  );
  const selectedRow =
    rows.find((row) => normalizeStatus(row.status) === "active") ?? rows[0];
  const selectedVersionRow = selectedVersion(
    selectedRow,
    versionsByKit.get(selectedRow.id) ?? [],
  );
  const selectedSummary = mapKitSummary(selectedRow, selectedVersionRow);

  return {
    kits,
    selected: {
      ...selectedSummary,
      description:
        selectedRow.description?.trim() ||
        "Package kit sincronizado desde el backend compartido.",
      highlights: readStringList(selectedRow.program_highlights).slice(0, 5),
      inclusions: readStringList(selectedRow.program_inclusions).slice(0, 5),
      pricing: buildPricing(selectedRow, selectedVersionRow),
      version: {
        id:
          selectedVersionRow?.id ??
          selectedRow.base_version_id ??
          selectedRow.id,
        label: versionLabel(selectedVersionRow),
        number: selectedVersionRow
          ? `v${numberValue(selectedVersionRow.version_number) || 1}`
          : "Sin version",
        passengers:
          selectedVersionRow &&
          numberValue(selectedVersionRow.passenger_count) > 0
            ? `${numberValue(selectedVersionRow.passenger_count)} pax`
            : "Pax por definir",
        margin:
          selectedVersionRow &&
          numberValue(selectedVersionRow.markup_percentage) > 0
            ? `${formatDecimal(numberValue(selectedVersionRow.markup_percentage))}%`
            : "Margen por revisar",
        locked: selectedVersionRow?.is_fx_locked
          ? "FX bloqueado"
          : "FX abierto",
      },
    },
    signals: buildSignals(rows, versionsByKit),
  };
}

function mapKitSummary(
  row: PackageKitRow,
  version: PackageKitVersionRow | null,
): PackageKitSummary {
  const status = normalizeStatus(row.status);
  return {
    id: row.id,
    name: row.name?.trim() || "Package kit sin nombre",
    slug: row.slug?.trim() || row.id,
    status,
    category: row.category?.trim() || "standard",
    destination: row.destination?.trim() || "Destino por definir",
    durationLabel: durationLabel(row),
    priceLabel: priceLabel(row, version),
    versionLabel: versionLabel(version),
    usageLabel: `${numberValue(row.usage_count)} usos`,
    sourceLabel: row.source_itinerary_id
      ? `Desde ${shortId(row.source_itinerary_id)}`
      : "Creado manualmente",
    updatedLabel: dateLabel(row.updated_at || row.created_at),
    tone: toneForStatus(status),
  };
}

function selectedVersion(
  row: PackageKitRow,
  versions: readonly PackageKitVersionRow[],
): PackageKitVersionRow | null {
  return (
    versions.find((version) => version.id === row.base_version_id) ??
    versions.find((version) => version.is_active) ??
    versions[0] ??
    null
  );
}

function buildPricing(
  row: PackageKitRow,
  version: PackageKitVersionRow | null,
): PackageKitsFixture["selected"]["pricing"] {
  const currency = version?.base_currency || "COP";
  const perPerson =
    numberValue(version?.pricing_pp_locked) ||
    numberValue(version?.price_per_person);
  const total =
    numberValue(version?.pricing_total_locked) ||
    numberValue(version?.total_price);
  const tiers = readPricingTiers(row.pricing_tiers);

  return [
    {
      id: "per-person",
      label: "Precio por persona",
      value: perPerson > 0 ? formatMoney(perPerson, currency) : "Pendiente",
      detail: "Moneda base del kit",
    },
    {
      id: "total",
      label: "Total version",
      value: total > 0 ? formatMoney(total, currency) : "Pendiente",
      detail: version ? versionLabel(version) : "Sin snapshot activo",
    },
    {
      id: "tiers",
      label: "Tiers",
      value: String(tiers.length),
      detail: tiers.length > 0 ? tiers.slice(0, 2).join(" · ") : "Sin tiers",
    },
  ];
}

function buildSignals(
  rows: readonly PackageKitRow[],
  versionsByKit: ReadonlyMap<string, PackageKitVersionRow[]>,
): PackageKitSignal[] {
  const active = rows.filter(
    (row) => normalizeStatus(row.status) === "active",
  ).length;
  const draft = rows.filter(
    (row) => normalizeStatus(row.status) === "draft",
  ).length;
  const versionCount = Array.from(versionsByKit.values()).reduce(
    (count, versions) => count + versions.length,
    0,
  );
  const sourced = rows.filter((row) => Boolean(row.source_itinerary_id)).length;

  return [
    {
      id: "active",
      label: "Activos",
      value: String(active),
      detail: "Listos para aplicar a itinerario",
      tone: active > 0 ? "success" : "warning",
    },
    {
      id: "draft",
      label: "Borradores",
      value: String(draft),
      detail: "Requieren revision antes de publicar",
      tone: draft > 0 ? "warning" : "success",
    },
    {
      id: "versions",
      label: "Versiones",
      value: String(versionCount),
      detail: "Snapshots de precio/version disponibles",
      tone: versionCount > 0 ? "primary" : "warning",
    },
    {
      id: "source",
      label: "Desde itinerario",
      value: String(sourced),
      detail: "Kits generados desde flujos Flutter/Next",
      tone: sourced > 0 ? "live" : "primary",
    },
  ];
}

function normalizeStatus(value: string | null): PackageKitStatus {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "archived") return "archived";
  return "draft";
}

function toneForStatus(status: PackageKitStatus): PackageKitTone {
  if (status === "active") return "success";
  if (status === "archived") return "primary";
  return "warning";
}

function durationLabel(row: PackageKitRow): string {
  const days = numberValue(row.duration_days);
  const nights = numberValue(row.duration_nights);
  if (days > 0 || nights > 0) return `${days || 1} dias / ${nights} noches`;
  return "Duracion por definir";
}

function priceLabel(
  row: PackageKitRow,
  version: PackageKitVersionRow | null,
): string {
  const currency = version?.base_currency || "COP";
  const price =
    numberValue(version?.pricing_pp_locked) ||
    numberValue(version?.price_per_person) ||
    firstTierPrice(row.pricing_tiers);
  return price > 0 ? `${formatMoney(price, currency)} pp` : "Precio pendiente";
}

function versionLabel(version: PackageKitVersionRow | null): string {
  if (!version) return "Sin version";
  return (
    version.version_label?.trim() ||
    `${version.is_base_version ? "Base" : "Version"} v${numberValue(version.version_number) || 1}`
  );
}

function readStringList(value: JsonValue): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return String(
            record.label ?? record.name ?? record.title ?? "",
          ).trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  return [];
}

function readPricingTiers(value: JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      return String(record.label ?? record.name ?? record.tier ?? "").trim();
    })
    .filter(Boolean);
}

function firstTierPrice(value: JsonValue): number {
  if (!Array.isArray(value)) return 0;
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const price =
      numberValue(readNumericRecordValue(record.price_per_person)) ||
      numberValue(readNumericRecordValue(record.price));
    if (price > 0) return price;
  }
  return 0;
}

function readNumericRecordValue(value: unknown): NumericValue {
  if (typeof value === "number" || typeof value === "string" || value == null) {
    return value;
  }
  return undefined;
}

function numberValue(value: NumericValue): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 1,
  }).format(value);
}

function dateLabel(value: string | null): string {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function shortId(value: string): string {
  return value.length > 8 ? value.slice(0, 8) : value;
}
