#!/usr/bin/env node

const REQUIRED_VALUES = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    reject: new Set(["", "https://example.supabase.co"]),
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    reject: new Set(["", "ci-anon-key"]),
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    reject: new Set(["", "ci-service-role-key"]),
  },
  {
    key: "E2E_DEMO_EMAIL",
    expected: "demo@demo.bukeer.com",
  },
  {
    key: "E2E_DEMO_PASSWORD",
    reject: new Set([""]),
  },
  {
    key: "E2E_DEMO_ACCOUNT_ID",
    reject: new Set([""]),
  },
];

const REQUIRED_TRUE_FLAGS = [
  "ADMIN_NEXT_PROTOTYPE_ENABLED",
  "ADMIN_NEXT_BETA_READONLY_ENABLED",
  "ADMIN_NEXT_WRITES_ITINERARIES_ENABLED",
  "ADMIN_NEXT_E2E_WRITE_ITINERARIES",
  "ADMIN_NEXT_E2E_WRITE_ITINERARY_ITEMS",
  "ADMIN_NEXT_E2E_WRITE_PASSENGERS",
  "ADMIN_NEXT_E2E_WRITE_PAYMENTS",
  "ADMIN_NEXT_E2E_WRITE_SUPPLIERS",
];

const TRUE_VALUES = new Set(["1", "on", "true", "yes"]);

function isPresent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function addError(errors, message) {
  errors.push(`::error::${message}`);
}

const errors = [];

for (const rule of REQUIRED_VALUES) {
  const value = process.env[rule.key]?.trim() ?? "";

  if (rule.expected && value !== rule.expected) {
    addError(
      errors,
      `${rule.key} must be ${rule.expected} for Evolucion parity CI; received ${value || "<empty>"}.`,
    );
    continue;
  }

  if (rule.reject?.has(value)) {
    addError(errors, `${rule.key} is missing or uses a CI placeholder value.`);
  }
}

if (process.env.ADMIN_NEXT_DATA_SOURCE_MODE !== "readonly") {
  addError(
    errors,
    "ADMIN_NEXT_DATA_SOURCE_MODE must be readonly so F1-F17 run against Supabase, not fixtures.",
  );
}

for (const key of REQUIRED_TRUE_FLAGS) {
  const value = process.env[key]?.trim().toLowerCase() ?? "";
  if (!TRUE_VALUES.has(value)) {
    addError(errors, `${key} must be true for full Evolucion parity coverage.`);
  }
}

const demoAccountId = process.env.E2E_DEMO_ACCOUNT_ID?.trim() ?? "";
const accountAllowlist = (process.env.ADMIN_NEXT_BETA_ACCOUNT_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (demoAccountId && !accountAllowlist.includes(demoAccountId)) {
  addError(
    errors,
    "ADMIN_NEXT_BETA_ACCOUNT_IDS must include E2E_DEMO_ACCOUNT_ID so the demo user can enter Admin Next.",
  );
}

const roleAllowlist = (process.env.ADMIN_NEXT_BETA_ROLES ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

for (const role of ["admin", "agent", "accounting"]) {
  if (!roleAllowlist.includes(role)) {
    addError(
      errors,
      `ADMIN_NEXT_BETA_ROLES must include ${role} for RBAC parity coverage.`,
    );
  }
}

if (isPresent(process.env.CI) && process.env.E2E_SKIP_RPC_PREFLIGHT === "1") {
  addError(
    errors,
    "E2E_SKIP_RPC_PREFLIGHT must not be set in CI; backend contract drift must fail the suite.",
  );
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Evolucion CI env guard: ok");
