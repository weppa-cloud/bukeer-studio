import {
  AdminDataSourceModeSchema,
  type AdminDataSourceMode,
} from '@bukeer/admin-contract';

const TRUE_ENV_VALUES = new Set(['1', 'on', 'true', 'yes']);

type AdminNextBetaReadonlyInput = {
  accountId?: string | null;
  role?: string | null;
};

type AdminNextExternalHandoffInput = {
  accountId?: string | null;
  role?: string | null;
};

export type AdminNextBetaReadonlyGate = {
  enabled: boolean;
  accountAllowed: boolean;
  roleAllowed: boolean;
  betaReadonly: boolean;
};

export type AdminNextExternalHandoffGate = {
  enabled: boolean;
  accountAllowed: boolean;
  roleAllowed: boolean;
  externalHandoff: boolean;
};

export function isAdminNextPrototypeEnabled(): boolean {
  const raw = process.env.ADMIN_NEXT_PROTOTYPE_ENABLED;

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  return process.env.NODE_ENV !== 'production';
}

export function getAdminNextDataSourceMode(): AdminDataSourceMode {
  const parsed = AdminDataSourceModeSchema.safeParse(
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE,
  );

  if (parsed.success) return parsed.data;
  return 'fixture';
}

export function isAdminNextBetaReadonlyEnabled(): boolean {
  return TRUE_ENV_VALUES.has(
    (process.env.ADMIN_NEXT_BETA_READONLY_ENABLED ?? '').trim().toLowerCase(),
  );
}

export function isAdminNextExternalHandoffEnabled(): boolean {
  return TRUE_ENV_VALUES.has(
    (process.env.ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED ?? '')
      .trim()
      .toLowerCase(),
  );
}

export function getAdminNextBetaAccountAllowlist(): string[] {
  return parseEnvAllowlist(process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS);
}

export function getAdminNextBetaRoleAllowlist(): string[] {
  return parseEnvAllowlist(process.env.ADMIN_NEXT_BETA_ROLES, normalizeRole);
}

export function isAdminNextBetaAccountAllowed(
  accountId?: string | null,
): boolean {
  const normalizedAccountId = accountId?.trim();

  if (!normalizedAccountId) return false;

  return getAdminNextBetaAccountAllowlist().includes(normalizedAccountId);
}

export function isAdminNextBetaRoleAllowed(role?: string | null): boolean {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) return false;

  return getAdminNextBetaRoleAllowlist().includes(normalizedRole);
}

export function getAdminNextBetaReadonlyGate({
  accountId,
  role,
}: AdminNextBetaReadonlyInput): AdminNextBetaReadonlyGate {
  const enabled = isAdminNextBetaReadonlyEnabled();
  const accountAllowed = isAdminNextBetaAccountAllowed(accountId);
  const roleAllowed = isAdminNextBetaRoleAllowed(role);

  return {
    enabled,
    accountAllowed,
    roleAllowed,
    betaReadonly: enabled && accountAllowed && roleAllowed,
  };
}

export function getAdminNextExternalHandoffGate({
  accountId,
  role,
}: AdminNextExternalHandoffInput): AdminNextExternalHandoffGate {
  const enabled = isAdminNextExternalHandoffEnabled();
  const accountAllowed = isAdminNextBetaAccountAllowed(accountId);
  const roleAllowed = isAdminNextBetaRoleAllowed(role);

  return {
    enabled,
    accountAllowed,
    roleAllowed,
    externalHandoff: enabled && accountAllowed && roleAllowed,
  };
}

function parseEnvAllowlist(
  raw: string | undefined,
  normalize: (value: string) => string = (value) => value.trim(),
): string[] {
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map(normalize)
        .filter((value) => value.length > 0),
    ),
  );
}

function normalizeRole(role?: string | null): string {
  return role?.trim().toLowerCase() ?? '';
}
