export function isAdminNextPrototypeEnabled(): boolean {
  const raw = process.env.ADMIN_NEXT_PROTOTYPE_ENABLED;

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  return process.env.NODE_ENV !== 'production';
}
