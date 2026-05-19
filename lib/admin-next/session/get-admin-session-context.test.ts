import { getAdminNextSessionFlags } from './get-admin-session-context';

const ADMIN_NEXT_ENV_KEYS = [
  'ADMIN_NEXT_PROTOTYPE_ENABLED',
  'ADMIN_NEXT_BETA_READONLY_ENABLED',
  'ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED',
  'ADMIN_NEXT_BETA_ACCOUNT_IDS',
  'ADMIN_NEXT_BETA_ROLES',
] as const;

const mutableEnv = process.env as Record<string, string | undefined>;
const originalEnv = Object.fromEntries(
  ADMIN_NEXT_ENV_KEYS.map((key) => [key, mutableEnv[key]]),
);
const originalNodeEnv = mutableEnv.NODE_ENV;

function restoreEnv() {
  for (const key of ADMIN_NEXT_ENV_KEYS) {
    const value = originalEnv[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  if (originalNodeEnv === undefined) {
    delete mutableEnv.NODE_ENV;
  } else {
    mutableEnv.NODE_ENV = originalNodeEnv;
  }
}

describe('admin-next session flags', () => {
  afterEach(restoreEnv);

  it('exposes closed beta-readonly state for anonymous or incomplete context', () => {
    process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = 'true';
    process.env.ADMIN_NEXT_BETA_READONLY_ENABLED = 'true';
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = 'account-1';
    process.env.ADMIN_NEXT_BETA_ROLES = 'admin';

    expect(getAdminNextSessionFlags()).toEqual({
      adminNextPrototype: true,
      adminNextBetaReadonlyEnabled: true,
      adminNextBetaAccountAllowed: false,
      adminNextBetaRoleAllowed: false,
      adminNextBetaReadonly: false,
      adminNextExternalHandoff: false,
    });
  });

  it('exposes beta-readonly state only when prototype and allowlists match', () => {
    process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = 'true';
    process.env.ADMIN_NEXT_BETA_READONLY_ENABLED = 'true';
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = 'account-1';
    process.env.ADMIN_NEXT_BETA_ROLES = 'admin,owner';

    expect(
      getAdminNextSessionFlags({
        accountId: 'account-1',
        role: 'owner',
      }),
    ).toEqual({
      adminNextPrototype: true,
      adminNextBetaReadonlyEnabled: true,
      adminNextBetaAccountAllowed: true,
      adminNextBetaRoleAllowed: true,
      adminNextBetaReadonly: true,
      adminNextExternalHandoff: false,
    });
  });

  it('keeps beta-readonly unavailable when the prototype route is disabled', () => {
    process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = 'false';
    process.env.ADMIN_NEXT_BETA_READONLY_ENABLED = 'true';
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = 'account-1';
    process.env.ADMIN_NEXT_BETA_ROLES = 'admin';

    expect(
      getAdminNextSessionFlags({
        accountId: 'account-1',
        role: 'admin',
      }),
    ).toEqual({
      adminNextPrototype: false,
      adminNextBetaReadonlyEnabled: true,
      adminNextBetaAccountAllowed: true,
      adminNextBetaRoleAllowed: true,
      adminNextBetaReadonly: false,
      adminNextExternalHandoff: false,
    });
  });

  it('exposes external handoff only when prototype and beta allowlists match', () => {
    process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = 'true';
    process.env.ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED = 'true';
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = 'account-1';
    process.env.ADMIN_NEXT_BETA_ROLES = 'admin,owner';

    expect(
      getAdminNextSessionFlags({
        accountId: 'account-1',
        role: 'admin',
      }).adminNextExternalHandoff,
    ).toBe(true);
    expect(
      getAdminNextSessionFlags({
        accountId: 'account-2',
        role: 'admin',
      }).adminNextExternalHandoff,
    ).toBe(false);
    expect(
      getAdminNextSessionFlags({
        accountId: 'account-1',
        role: 'agent',
      }).adminNextExternalHandoff,
    ).toBe(false);
  });

  it('keeps external handoff unavailable when the prototype route is disabled', () => {
    process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = 'false';
    process.env.ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED = 'true';
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = 'account-1';
    process.env.ADMIN_NEXT_BETA_ROLES = 'admin';

    expect(
      getAdminNextSessionFlags({
        accountId: 'account-1',
        role: 'admin',
      }).adminNextExternalHandoff,
    ).toBe(false);
  });
});
