import { isAdminNextPrototypeEnabled } from '@/lib/admin-next/flags';
import { hasAdminPermission, permissionsForRole } from '@/lib/admin-next/session/get-admin-session-context';
import type { AdminSessionContext } from '@bukeer/admin-contract';

describe('admin-next session helpers', () => {
  const originalEnv = process.env.ADMIN_NEXT_PROTOTYPE_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ADMIN_NEXT_PROTOTYPE_ENABLED;
    } else {
      process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = originalEnv;
    }
  });

  it('honors an explicit prototype flag off value', () => {
    process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = 'false';

    expect(isAdminNextPrototypeEnabled()).toBe(false);
  });

  it('honors an explicit prototype flag on value', () => {
    process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = 'true';

    expect(isAdminNextPrototypeEnabled()).toBe(true);
  });

  it('maps agent role to read and suggest permissions only', () => {
    expect(permissionsForRole('agent')).toEqual(
      expect.arrayContaining(['admin_next.view', 'planner.view', 'planner.suggest', 'trace.view']),
    );
    expect(permissionsForRole('agent')).not.toContain('planner.approve');
  });

  it('checks permissions only for authenticated contexts', () => {
    const authCtx: AdminSessionContext = {
      status: 'authenticated',
      userId: 'user-1',
      email: 'planner@example.com',
      accountId: 'account-1',
      role: 'agent',
      displayName: 'Planner One',
      permissions: ['admin_next.view', 'planner.view'],
      flags: { adminNextPrototype: true },
    };

    const anonCtx: AdminSessionContext = {
      status: 'unauthenticated',
      flags: { adminNextPrototype: true },
    };

    expect(hasAdminPermission(authCtx, 'planner.view')).toBe(true);
    expect(hasAdminPermission(anonCtx, 'planner.view')).toBe(false);
  });
});
