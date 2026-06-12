import type { AdminDataSourceMode } from "@bukeer/admin-contract";
import {
  settingsFixture,
  type SettingsFixture,
  type SettingsPermissionRow,
  type SettingsSignal,
  type SettingsUser,
} from "@/lib/admin-next/fixtures/settings";

type SupabaseRpcResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseReadQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

interface SupabaseSettingsFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabaseSettingsFilter<T>;
  in(column: string, values: readonly unknown[]): SupabaseSettingsFilter<T>;
  limit(count: number): SupabaseSettingsFilter<T>;
}

interface SupabaseSettingsBuilder {
  select<T = unknown>(columns: string): SupabaseSettingsFilter<T>;
}

export interface AdminNextSettingsReadonlySupabaseClient {
  from(table: "accounts" | "user_roles" | "contacts"): SupabaseSettingsBuilder;
}

export interface SettingsAdapter {
  readonly mode: AdminDataSourceMode;
  getSettings(): Promise<SettingsFixture>;
}

export interface SettingsAdapterOptions {
  readonly accountId?: string;
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextSettingsReadonlySupabaseClient;
}

type JsonValue = unknown;

type AccountSettingsRow = {
  id: string;
  name: string;
  website: string | null;
  default_language: string | null;
  primary_currency: string | null;
  reporting_currency: string | null;
  enabled_currencies: string[] | null;
  enabled_languages: string[] | null;
  number_id: string | null;
  mail: string | null;
  phone: string | null;
  status: string | null;
  payment_methods: JsonValue;
  settings: JsonValue;
};

type AccountUserRoleRow = {
  id: number | string | null;
  user_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  roles:
    | { role_name: string | null }
    | Array<{ role_name: string | null }>
    | null;
};

type AccountContactUserRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  updated_at: string | null;
};

const ACCOUNT_COLUMNS =
  "id,name,website,default_language,primary_currency,reporting_currency,enabled_currencies,enabled_languages,number_id,mail,phone,status,payment_methods,settings";
const USER_ROLE_COLUMNS = "id,user_id,is_active,created_at,updated_at,roles(role_name)";
const CONTACT_USER_COLUMNS = "id,user_id,name,last_name,email,phone,updated_at";
const ROLE_PERMISSION_TEMPLATE: Array<{
  permission: string;
  category: string;
  roles: Array<"admin" | "agent" | "accounting">;
}> = [
  {
    permission: "admin_next.view",
    category: "Admin Next",
    roles: ["admin", "agent", "accounting"],
  },
  {
    permission: "itineraries.manage",
    category: "Itinerarios",
    roles: ["admin", "agent"],
  },
  {
    permission: "contacts.manage",
    category: "Contactos",
    roles: ["admin", "agent"],
  },
  {
    permission: "products.manage",
    category: "Catalogo",
    roles: ["admin"],
  },
  {
    permission: "payments.manage",
    category: "Pagos",
    roles: ["admin", "accounting"],
  },
  {
    permission: "settings.manage",
    category: "Configuracion",
    roles: ["admin"],
  },
];

export function createSettingsAdapter(
  options: AdminDataSourceMode | SettingsAdapterOptions = "fixture",
): SettingsAdapter {
  const normalized = typeof options === "string" ? { mode: options } : options;
  const mode = normalized.mode ?? "fixture";

  if (mode === "readonly" && normalized.supabase && normalized.accountId) {
    return new ReadonlySettingsAdapter(normalized.supabase, normalized.accountId);
  }

  return new FixtureSettingsAdapter(mode);
}

class FixtureSettingsAdapter implements SettingsAdapter {
  constructor(readonly mode: AdminDataSourceMode) {}

  async getSettings(): Promise<SettingsFixture> {
    return settingsFixture;
  }
}

class ReadonlySettingsAdapter implements SettingsAdapter {
  readonly mode = "readonly" as const;

  constructor(
    private readonly supabase: AdminNextSettingsReadonlySupabaseClient,
    private readonly accountId: string,
  ) {}

  async getSettings(): Promise<SettingsFixture> {
    const [accountResult, rolesResult] = await Promise.all([
      this.supabase
        .from("accounts")
        .select<AccountSettingsRow[]>(ACCOUNT_COLUMNS)
        .eq("id", this.accountId)
        .limit(1),
      this.supabase
        .from("user_roles")
        .select<AccountUserRoleRow[]>(USER_ROLE_COLUMNS)
        .eq("account_id", this.accountId)
        .limit(100),
    ]);

    assertReadableResponse("accounts", accountResult.error);
    assertReadableResponse("user_roles", rolesResult.error);

    const account = accountResult.data?.[0];
    if (!account) return settingsFixture;

    const roles = rolesResult.data ?? [];
    const contactsResult = await this.readContacts(roles);
    assertReadableResponse("contacts", contactsResult.error);

    const users = buildUsers(roles, contactsResult.data ?? []);
    const permissionMatrix = buildPermissionMatrix(users);

    return {
      ...settingsFixture,
      agency: {
        name: account.name,
        website: firstNonEmpty(account.website, account.mail, "Sin dominio"),
        locale: formatLanguages(account),
        currency: formatCurrencies(account),
        status: firstNonEmpty(account.status, "Activo"),
        taxId: firstNonEmpty(account.number_id, "Sin NIT"),
        email: firstNonEmpty(account.mail, "Sin correo"),
        phone: firstNonEmpty(account.phone, "Sin telefono"),
      },
      billing: [
        {
          id: "tax-profile",
          label: "Perfil fiscal",
          value: firstNonEmpty(account.number_id, "Sin NIT configurado"),
          detail: "Dato leido desde public.accounts.number_id.",
        },
        {
          id: "payment-methods",
          label: "Metodos de pago",
          value: summarizeJsonArray(account.payment_methods, "Sin metodos"),
          detail: "Configuracion base de pagos compartida con Flutter.",
        },
      ],
      team: [
        {
          id: "active-users",
          label: "Usuarios activos",
          value: `${users.filter((user) => user.status === "Activo").length}/${users.length}`,
          detail: "Leido desde get_account_users_with_roles.",
        },
        {
          id: "roles-visible",
          label: "Roles visibles",
          value: summarizeRoles(users),
          detail: "Roles actuales de la cuenta para RBAC.",
        },
      ],
      integrations: [
        {
          id: "supabase",
          name: "Supabase",
          status: "Conectado",
          detail: "Cuenta, usuarios y permisos leidos del backend compartido.",
        },
        {
          id: "rbac",
          name: "RBAC",
          status: permissionMatrix.length > 0 ? "Visible" : "Sin matriz",
          detail: `${permissionMatrix.length} permisos derivados de roles activos admin/agent/accounting.`,
        },
      ],
      users,
      permissionMatrix,
      signals: buildSignals(users, permissionMatrix),
    };
  }

  private async readContacts(
    roles: readonly AccountUserRoleRow[],
  ): Promise<SupabaseRpcResponse<AccountContactUserRow[]>> {
    const userIds = uniqueStrings(roles.map((row) => row.user_id));
    if (userIds.length === 0) {
      return { data: [], error: null };
    }

    return this.supabase
      .from("contacts")
      .select<AccountContactUserRow[]>(CONTACT_USER_COLUMNS)
      .eq("account_id", this.accountId)
      .in("user_id", userIds)
      .limit(userIds.length);
  }
}

function buildUsers(
  rows: readonly AccountUserRoleRow[],
  contacts: readonly AccountContactUserRow[],
): SettingsUser[] {
  const contactsByUser = new Map(
    contacts
      .filter((contact) => contact.user_id)
      .map((contact) => [contact.user_id as string, contact]),
  );

  return rows.map((row, index) => {
    const contact = contactsByUser.get(row.user_id ?? "");
    return {
    id: firstNonEmpty(contact?.id, String(row.id ?? ""), row.user_id, `user-${index}`),
    userId: firstNonEmpty(row.user_id, String(row.id ?? ""), `user-${index}`),
    name:
      fullName(contact?.name ?? null, contact?.last_name ?? null) ||
      firstNonEmpty(contact?.email, "Usuario sin nombre"),
    email: firstNonEmpty(contact?.email, "Sin correo"),
    role: normalizeRole(extractRoleName(row.roles)),
    status: row.is_active === false ? "Inactivo" : "Activo",
    lastActivity: formatActivityDate(contact?.updated_at ?? row.updated_at ?? row.created_at),
  };
  });
}

function buildPermissionMatrix(users: readonly SettingsUser[]): SettingsPermissionRow[] {
  const activeRoles = new Set(
    users
      .filter((user) => user.status === "Activo")
      .map((user) => user.role),
  );

  return ROLE_PERMISSION_TEMPLATE.map((entry) => ({
    id: entry.permission.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    permission: entry.permission,
    category: entry.category,
    admin: activeRoles.has("admin") && entry.roles.includes("admin"),
    agent: activeRoles.has("agent") && entry.roles.includes("agent"),
    accounting: activeRoles.has("accounting") && entry.roles.includes("accounting"),
  }));
}

function buildSignals(
  users: readonly SettingsUser[],
  permissions: readonly SettingsPermissionRow[],
): SettingsSignal[] {
  const inactive = users.filter((user) => user.status !== "Activo").length;
  const adminGrants = permissions.filter((row) => row.admin).length;

  return [
    {
      id: "users",
      label: `${users.length} usuarios`,
      detail: `${inactive} usuarios inactivos visibles en la cuenta.`,
      tone: inactive > 0 ? "warning" : "success",
    },
    {
      id: "permissions",
      label: `${permissions.length} permisos`,
      detail: `${adminGrants} permisos concedidos a admin en la matriz actual.`,
      tone: permissions.length > 0 ? "primary" : "danger",
    },
    {
      id: "readonly",
      label: "Readonly",
      detail: "F14 todavia no escribe configuracion; prepara la superficie para UAT.",
      tone: "live",
    },
  ];
}

function formatLanguages(account: AccountSettingsRow): string {
  const languages = account.enabled_languages?.filter(Boolean) ?? [];
  return languages.length > 0
    ? languages.join(", ")
    : firstNonEmpty(account.default_language, "Sin idioma");
}

function formatCurrencies(account: AccountSettingsRow): string {
  const currencies = account.enabled_currencies?.filter(Boolean) ?? [];
  return currencies.length > 0
    ? currencies.join(", ")
    : firstNonEmpty(account.primary_currency, account.reporting_currency, "Sin moneda");
}

function summarizeJsonArray(value: JsonValue, fallback: string): string {
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} configurados` : fallback;
  if (value && typeof value === "object") return "Configurado";
  return fallback;
}

function summarizeRoles(users: readonly SettingsUser[]): string {
  const roles = Array.from(new Set(users.map((user) => user.role).filter(Boolean)));
  return roles.length > 0 ? roles.join(", ") : "Sin roles";
}

function normalizeRole(value: string | null): string {
  const role = value?.trim().toLowerCase();
  if (!role) return "sin rol";
  if (role.includes("admin")) return "admin";
  if (role.includes("account")) return "accounting";
  if (role.includes("agent") || role.includes("planner")) return "agent";
  return role;
}

function extractRoleName(
  value:
    | { role_name: string | null }
    | Array<{ role_name: string | null }>
    | null,
): string | null {
  if (Array.isArray(value)) return value[0]?.role_name ?? null;
  return value?.role_name ?? null;
}

function fullName(name: string | null, lastName: string | null): string {
  return [name, lastName].map((part) => part?.trim()).filter(Boolean).join(" ");
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return "";
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function formatActivityDate(value: string | null): string {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(value))
    .replace(".", "");
}

function assertReadableResponse(
  source: string,
  error: { message?: string } | null,
): void {
  if (error) {
    throw new Error(
      `Settings readonly adapter failed for ${source}: ${error.message ?? "unknown error"}`,
    );
  }
}
