#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const resultsPath =
  process.argv[2] ||
  process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ||
  "playwright-report/evolucion/results.json";
const outputDir =
  process.env.EVOLUCION_WRITE_PARITY_REPORT_DIR ||
  "reports/evolucion-write-parity";
const generatedAt = new Date().toISOString();

const REQUIREMENTS = [
  {
    id: "F3-itinerary-header-lifecycle",
    flow: "F3",
    label: "Itinerary header create/edit/status/confirmation date",
    file: "e2e/tests/evolucion-f3-itinerary-create-modal.spec.ts",
    title:
      "crea y edita cabecera real con paridad Flutter y limpia la fila E2E",
    dbSurface: ["itineraries", "itinerary_status_history"],
    parityContract: [
      "function_create_itinerary",
      "function_update_itinerary_status_with_history",
      "function_update_itinerary_confirmation_date",
    ],
    sourceChecks: [
      {
        file: "e2e/tests/evolucion-f3-itinerary-create-modal.spec.ts",
        tokens: ["fetchCreatedItinerary", "fetchStatusHistory"],
      },
      {
        file: "lib/admin-next/itinerary-write-adapter.ts",
        tokens: [
          "function_create_itinerary",
          "function_update_itinerary_status_with_history",
          "function_update_itinerary_confirmation_date",
        ],
      },
    ],
  },
  {
    id: "F4-item-reservation",
    flow: "F4",
    label: "Itinerary item reservation status",
    file: "e2e/tests/evolucion-f4-itinerary-items-readonly.spec.ts",
    title: "confirma reserva de item real y restaura el estado demo",
    dbSurface: ["itinerary_items.reservation_status"],
    parityContract: ["function_update_itinerary_items_status"],
    sourceChecks: [
      {
        file: "e2e/tests/evolucion-f4-itinerary-items-readonly.spec.ts",
        tokens: [
          "readReservationStatus",
          "resetReservationStatus",
          "reservation_status",
        ],
      },
      {
        file: "lib/admin-next/itinerary-write-adapter.ts",
        tokens: ["function_update_itinerary_items_status"],
      },
    ],
  },
  {
    id: "F4-item-delete",
    flow: "F4",
    label: "Itinerary item delete",
    file: "e2e/tests/evolucion-f4-itinerary-items-readonly.spec.ts",
    title: "elimina item temporal real desde la UI y deja la BD limpia",
    dbSurface: ["itinerary_items"],
    parityContract: ["delete from itinerary_items"],
    sourceChecks: [
      {
        file: "e2e/tests/evolucion-f4-itinerary-items-readonly.spec.ts",
        tokens: [
          "createTemporaryItineraryItem",
          "readItineraryItemExists",
          "deleteTemporaryItineraryItem",
          "itinerary_items",
        ],
      },
      {
        file: "lib/admin-next/itinerary-write-adapter.ts",
        tokens: ["deleteItineraryItemWithFlutterParity", "itinerary_items"],
      },
    ],
  },
  {
    id: "F5-passenger-crud",
    flow: "F5",
    label: "Passenger create/edit/delete",
    file: "e2e/tests/evolucion-f5-itinerary-passengers.spec.ts",
    title: "crea, edita y elimina un pasajero temporal real desde la UI",
    dbSurface: ["passenger"],
    parityContract: ["passenger insert/update/delete"],
    sourceChecks: [
      {
        file: "e2e/tests/evolucion-f5-itinerary-passengers.spec.ts",
        tokens: [
          "readPassengerByName",
          "deleteE2EPassengers",
          "passenger",
          "number_id",
        ],
      },
      {
        file: "lib/admin-next/itinerary-write-adapter.ts",
        tokens: [
          "upsertPassengerWithFlutterParity",
          "deletePassengerWithFlutterParity",
        ],
      },
    ],
  },
  {
    id: "F6-payment-crud",
    flow: "F6",
    label: "Payment create/edit/delete",
    file: "e2e/tests/evolucion-f6-itinerary-payments.spec.ts",
    title: "crea, edita y elimina un pago temporal real desde la UI",
    dbSurface: ["transactions"],
    parityContract: ["transactions insert/update/delete"],
    sourceChecks: [
      {
        file: "e2e/tests/evolucion-f6-itinerary-payments.spec.ts",
        tokens: [
          "readActiveTransactionByReference",
          "deleteE2ETransactions",
          "transactions",
          "total_paid",
        ],
      },
      {
        file: "lib/admin-next/itinerary-write-adapter.ts",
        tokens: [
          "upsertTransactionWithFlutterParity",
          "deleteTransactionWithFlutterParity",
        ],
      },
    ],
  },
  {
    id: "F7-supplier-reservation",
    flow: "F7",
    label: "Supplier grouped reservation confirm",
    file: "e2e/tests/evolucion-f7-itinerary-suppliers.spec.ts",
    title:
      "agrupa proveedores reales y confirma una reserva desde la pestaña Proveedores",
    dbSurface: ["itinerary_items.reservation_status", "contacts"],
    parityContract: ["function_update_itinerary_items_status"],
    sourceChecks: [
      {
        file: "e2e/tests/evolucion-f7-itinerary-suppliers.spec.ts",
        tokens: [
          "findConfirmableSupplierItem",
          "readReservationStatus",
          "setReservationStatus",
          "reservation_status",
        ],
      },
      {
        file: "lib/admin-next/itinerary-write-adapter.ts",
        tokens: ["function_update_itinerary_items_status"],
      },
    ],
  },
];

function collectSpecs(suite, specs = []) {
  for (const spec of suite.specs ?? []) specs.push(spec);
  for (const childSuite of suite.suites ?? []) collectSpecs(childSuite, specs);
  return specs;
}

function testResultStatus(test) {
  if (typeof test.status === "string") return test.status;

  const statuses = (test.results ?? [])
    .map((result) => result.status)
    .filter(Boolean);

  if (statuses.includes("failed") || statuses.includes("timedOut")) {
    return "unexpected";
  }

  if (statuses.length > 0 && statuses.every((status) => status === "skipped")) {
    return "skipped";
  }

  if (statuses.length > 0 && statuses.every((status) => status === "passed")) {
    return "expected";
  }

  return statuses[0] ?? "unknown";
}

function testTitle(spec, test) {
  if (typeof test.title === "string" && test.title.length > 0) {
    return test.title;
  }

  if (typeof spec.title === "string" && spec.title.length > 0) {
    return spec.title;
  }

  const titlePath = Array.isArray(test.titlePath) ? test.titlePath : [];
  return titlePath.filter(Boolean).at(-1) ?? "<untitled>";
}

function resultErrorText(test) {
  const errors = (test.results ?? [])
    .flatMap((result) => result.errors ?? [])
    .map((error) => error.message || error.value || "")
    .filter(Boolean);

  return errors[0] ?? "";
}

function collectResultTests(payload) {
  const tests = [];
  const specs = (payload.suites ?? []).flatMap((suite) => collectSpecs(suite));

  for (const spec of specs) {
    const fileName = basename(spec.file ?? "");
    for (const test of spec.tests ?? []) {
      tests.push({
        fileName,
        title: testTitle(spec, test),
        status: testResultStatus(test),
        error: resultErrorText(test),
      });
    }
  }

  return tests;
}

function sourceTokenStatus(requirement) {
  const checks = requirement.sourceChecks ?? [
    { file: requirement.file, tokens: requirement.sourceTokens ?? [] },
  ];
  const missing = [];

  for (const check of checks) {
    if (!existsSync(check.file)) {
      missing.push(`${check.file}: source file`);
      continue;
    }

    const source = readFileSync(check.file, "utf8");
    for (const token of check.tokens) {
      if (!source.includes(token)) {
        missing.push(`${check.file}: ${token}`);
      }
    }
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}

function findTest(resultTests, requirement) {
  const fileName = basename(requirement.file);
  return resultTests.find(
    (test) => test.fileName === fileName && test.title === requirement.title,
  );
}

const payload = JSON.parse(readFileSync(resultsPath, "utf8"));
const resultTests = collectResultTests(payload);
const rows = [];
const errors = [];

for (const requirement of REQUIREMENTS) {
  const resultTest = findTest(resultTests, requirement);
  const sourceStatus = sourceTokenStatus(requirement);
  const status = resultTest?.status ?? "missing";
  const ok = status === "expected" && sourceStatus.ok;

  if (!resultTest) {
    errors.push(
      `${requirement.id}: missing Playwright test "${requirement.title}" in ${resultsPath}.`,
    );
  } else if (status !== "expected") {
    errors.push(
      `${requirement.id}: expected passing write-parity test, got status=${status}.`,
    );
  }

  if (!sourceStatus.ok) {
    errors.push(
      `${requirement.id}: source parity contract tokens missing: ${sourceStatus.missing.join(", ")}.`,
    );
  }

  rows.push({
    ...requirement,
    status,
    ok,
    error: resultTest?.error ?? "",
    missingSourceTokens: sourceStatus.missing,
  });
}

const totals = rows.reduce(
  (acc, row) => {
    acc.requirements += 1;
    if (row.ok) acc.passed += 1;
    else acc.failed += 1;
    return acc;
  },
  { requirements: 0, passed: 0, failed: 0 },
);

const report = {
  generatedAt,
  demoEmail: process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com",
  sourceResults: resultsPath,
  totals,
  requirements: rows.map((row) => ({
    id: row.id,
    flow: row.flow,
    label: row.label,
    status: row.status,
    ok: row.ok,
    dbSurface: row.dbSurface,
    parityContract: row.parityContract,
    file: row.file,
    title: row.title,
    missingSourceTokens: row.missingSourceTokens,
    error: row.error,
  })),
};

function markdownReport() {
  const lines = [
    "# Bukeer Evolucion Write Parity Report",
    "",
    `Generated: ${generatedAt}`,
    `Demo user: ${report.demoEmail}`,
    `Source results: ${resultsPath}`,
    "",
    "## Summary",
    "",
    `- Requirements: ${totals.requirements}`,
    `- Passed: ${totals.passed}`,
    `- Failed: ${totals.failed}`,
    "",
    "## Write Matrix",
    "",
    "| Flow | Requirement | Status | DB surface | Parity contract | Evidence |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of rows) {
    const evidence = row.ok
      ? "UI action + Supabase service-role DB assertion passed"
      : [
          row.error ? row.error.split("\n")[0] : "",
          row.missingSourceTokens.length
            ? `missing source tokens: ${row.missingSourceTokens.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("; ") || "missing or non-passing evidence";

    lines.push(
      `| ${row.flow} | ${row.label} | ${row.ok ? "pass" : row.status} | ${row.dbSurface.join("<br>")} | ${row.parityContract.join("<br>")} | ${evidence} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  join(outputDir, "evolucion-write-parity-report.json"),
  JSON.stringify(report, null, 2),
);
writeFileSync(
  join(outputDir, "evolucion-write-parity-report.md"),
  markdownReport(),
);

if (errors.length) {
  console.error(errors.map((message) => `::error::${message}`).join("\n"));
  process.exit(1);
}

console.log(
  `Evolucion write parity guard: ok (${totals.passed}/${totals.requirements} requirements).`,
);
