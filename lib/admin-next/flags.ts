import {
  AdminDataSourceModeSchema,
  type AdminDataSourceMode,
} from '@bukeer/admin-contract';

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
