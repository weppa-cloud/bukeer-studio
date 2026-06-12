import {
  getAdminNextBetaAccountAllowlist,
  getAdminNextExternalHandoffGate,
  getAdminNextBetaReadonlyGate,
  getAdminNextItineraryWritesGate,
  getAdminNextBetaRoleAllowlist,
  isAdminNextBetaAccountAllowed,
  isAdminNextExternalHandoffEnabled,
  isAdminNextItineraryWritesEnabled,
  isAdminNextBetaReadonlyEnabled,
  isAdminNextBetaRoleAllowed,
  isAdminNextPrototypeEnabled,
} from "./flags";

const ADMIN_NEXT_ENV_KEYS = [
  "ADMIN_NEXT_PROTOTYPE_ENABLED",
  "ADMIN_NEXT_BETA_READONLY_ENABLED",
  "ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED",
  "ADMIN_NEXT_WRITES_ITINERARIES_ENABLED",
  "ADMIN_NEXT_BETA_ACCOUNT_IDS",
  "ADMIN_NEXT_BETA_ROLES",
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

describe("admin-next feature flags", () => {
  afterEach(restoreEnv);

  it("keeps prototype enabled by default outside production", () => {
    delete process.env.ADMIN_NEXT_PROTOTYPE_ENABLED;
    mutableEnv.NODE_ENV = "development";

    expect(isAdminNextPrototypeEnabled()).toBe(true);
  });

  it("keeps prototype closed in production without explicit enablement", () => {
    delete process.env.ADMIN_NEXT_PROTOTYPE_ENABLED;
    mutableEnv.NODE_ENV = "production";

    expect(isAdminNextPrototypeEnabled()).toBe(false);
  });

  it("honors explicit prototype production enablement", () => {
    process.env.ADMIN_NEXT_PROTOTYPE_ENABLED = "true";
    mutableEnv.NODE_ENV = "production";

    expect(isAdminNextPrototypeEnabled()).toBe(true);
  });

  it("defaults beta-readonly access closed", () => {
    delete process.env.ADMIN_NEXT_BETA_READONLY_ENABLED;
    delete process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS;
    delete process.env.ADMIN_NEXT_BETA_ROLES;

    expect(isAdminNextBetaReadonlyEnabled()).toBe(false);
    expect(isAdminNextExternalHandoffEnabled()).toBe(false);
    expect(isAdminNextItineraryWritesEnabled()).toBe(false);
    expect(isAdminNextBetaAccountAllowed("account-1")).toBe(false);
    expect(isAdminNextBetaRoleAllowed("admin")).toBe(false);
    expect(
      getAdminNextBetaReadonlyGate({
        accountId: "account-1",
        role: "admin",
      }),
    ).toEqual({
      enabled: false,
      accountAllowed: false,
      roleAllowed: false,
      betaReadonly: false,
    });
    expect(
      getAdminNextExternalHandoffGate({
        accountId: "account-1",
        role: "admin",
      }),
    ).toEqual({
      enabled: false,
      accountAllowed: false,
      roleAllowed: false,
      externalHandoff: false,
    });
    expect(
      getAdminNextItineraryWritesGate({
        accountId: "account-1",
        role: "admin",
      }),
    ).toEqual({
      enabled: false,
      accountAllowed: false,
      roleAllowed: false,
      itineraryWrites: false,
    });
  });

  it("parses beta account and role allowlists safely", () => {
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS =
      " account-1,account-2\naccount-1  ";
    process.env.ADMIN_NEXT_BETA_ROLES = "Admin, owner,ADMIN";

    expect(getAdminNextBetaAccountAllowlist()).toEqual([
      "account-1",
      "account-2",
    ]);
    expect(getAdminNextBetaRoleAllowlist()).toEqual(["admin", "owner"]);
    expect(isAdminNextBetaAccountAllowed(" account-2 ")).toBe(true);
    expect(isAdminNextBetaRoleAllowed("OWNER")).toBe(true);
    expect(isAdminNextBetaAccountAllowed("account-3")).toBe(false);
    expect(isAdminNextBetaRoleAllowed("agent")).toBe(false);
  });

  it("requires explicit beta enablement plus matching account and role", () => {
    process.env.ADMIN_NEXT_BETA_READONLY_ENABLED = "yes";
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = "account-1,account-2";
    process.env.ADMIN_NEXT_BETA_ROLES = "admin,owner";

    expect(
      getAdminNextBetaReadonlyGate({
        accountId: "account-1",
        role: "admin",
      }),
    ).toMatchObject({
      enabled: true,
      accountAllowed: true,
      roleAllowed: true,
      betaReadonly: true,
    });

    expect(
      getAdminNextBetaReadonlyGate({
        accountId: "account-3",
        role: "admin",
      }).betaReadonly,
    ).toBe(false);
    expect(
      getAdminNextBetaReadonlyGate({
        accountId: "account-1",
        role: "agent",
      }).betaReadonly,
    ).toBe(false);
  });

  it("requires explicit external handoff enablement plus matching beta account and role", () => {
    process.env.ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED = "1";
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = "account-1,account-2";
    process.env.ADMIN_NEXT_BETA_ROLES = "admin,owner";

    expect(
      getAdminNextExternalHandoffGate({
        accountId: "account-2",
        role: "owner",
      }),
    ).toMatchObject({
      enabled: true,
      accountAllowed: true,
      roleAllowed: true,
      externalHandoff: true,
    });

    expect(
      getAdminNextExternalHandoffGate({
        accountId: "account-3",
        role: "owner",
      }).externalHandoff,
    ).toBe(false);
    expect(
      getAdminNextExternalHandoffGate({
        accountId: "account-2",
        role: "agent",
      }).externalHandoff,
    ).toBe(false);
  });

  it("requires explicit itinerary writes enablement plus matching beta account and role", () => {
    process.env.ADMIN_NEXT_WRITES_ITINERARIES_ENABLED = "true";
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = "account-1,account-2";
    process.env.ADMIN_NEXT_BETA_ROLES = "admin,owner";

    expect(
      getAdminNextItineraryWritesGate({
        accountId: "account-1",
        role: "admin",
      }),
    ).toMatchObject({
      enabled: true,
      accountAllowed: true,
      roleAllowed: true,
      itineraryWrites: true,
    });

    expect(
      getAdminNextItineraryWritesGate({
        accountId: "account-3",
        role: "admin",
      }).itineraryWrites,
    ).toBe(false);
    expect(
      getAdminNextItineraryWritesGate({
        accountId: "account-1",
        role: "agent",
      }).itineraryWrites,
    ).toBe(false);
  });

  it("treats malformed beta env values as closed", () => {
    process.env.ADMIN_NEXT_BETA_READONLY_ENABLED = "definitely";
    process.env.ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED = "definitely";
    process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS = ", ,";
    process.env.ADMIN_NEXT_BETA_ROLES = "  ";

    expect(isAdminNextBetaReadonlyEnabled()).toBe(false);
    expect(isAdminNextExternalHandoffEnabled()).toBe(false);
    expect(getAdminNextBetaAccountAllowlist()).toEqual([]);
    expect(getAdminNextBetaRoleAllowlist()).toEqual([]);
  });
});
