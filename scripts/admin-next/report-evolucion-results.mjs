#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_INPUTS = [
  "playwright-report/evolucion/results.json",
  "playwright-report/evolucion-f3-guarded/results.json",
];

const FLOW_LABELS = {
  F1: "Sesion, shell y navegacion",
  F2: "Itinerario detalle readonly",
  F3: "Itinerario cabecera y ciclo de vida",
  F4: "Items de itinerario",
  F5: "Pasajeros de itinerario",
  F6: "Pagos de itinerario",
  F7: "Proveedores de itinerario",
  F8: "Preview y vista publica",
  F9: "Contactos detalle",
  F10: "Productos/catalogo V2 detalle",
  F11: "CRM/conversaciones",
  F12: "Agenda",
  F13: "Reportes",
  F14: "Usuarios/configuracion/RBAC",
  F15: "Package kits",
  F16: "Pagos publicos",
  F17: "Auth completo",
};

const requestedFlows = (process.env.EVOLUCION_EXPECTED_FLOWS ?? "")
  .split(",")
  .map((flow) => flow.trim().toUpperCase())
  .filter(Boolean);
const expectedFlows = requestedFlows.length ? requestedFlows : Object.keys(FLOW_LABELS);
const inputs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_INPUTS;
const outputDir =
  process.env.EVOLUCION_PARITY_REPORT_DIR || "reports/evolucion-parity";
const generatedAt = new Date().toISOString();

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

function resultErrorText(test) {
  const errors = (test.results ?? [])
    .flatMap((result) => result.errors ?? [])
    .map((error) => error.message || error.value || "")
    .filter(Boolean);

  return errors[0] ?? "";
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

function flowFromSpecFile(file) {
  const match = /evolucion-f(\d+)/.exec(file ?? "");
  if (!match) return null;
  return `F${Number(match[1])}`;
}

function emptyFlow(flow) {
  return {
    flow,
    label: FLOW_LABELS[flow],
    status: "missing",
    expected: 0,
    skipped: 0,
    unexpected: 0,
    unknown: 0,
    total: 0,
    files: new Set(),
    tests: [],
  };
}

const missingInputs = [];
const flows = new Map(expectedFlows.map((flow) => [flow, emptyFlow(flow)]));

for (const input of inputs) {
  let payload;
  try {
    payload = JSON.parse(readFileSync(input, "utf8"));
  } catch (error) {
    missingInputs.push({
      path: input,
      error: error instanceof Error ? error.message : String(error),
    });
    continue;
  }

  const specs = (payload.suites ?? [])
    .flatMap((suite) => collectSpecs(suite))
    .filter((spec) => /evolucion-f\d+.*\.spec\.ts$/.test(spec.file ?? ""));

  for (const spec of specs) {
    const flow = flowFromSpecFile(spec.file);
    if (!flow || !flows.has(flow)) continue;

    const summary = flows.get(flow);
    summary.files.add((spec.file ?? "").split("/").pop() || spec.file);

    for (const test of spec.tests ?? []) {
      const status = testResultStatus(test);
      summary.total += 1;
      if (status === "expected") summary.expected += 1;
      else if (status === "skipped") summary.skipped += 1;
      else if (status === "unexpected") summary.unexpected += 1;
      else summary.unknown += 1;

      summary.tests.push({
        title: testTitle(spec, test),
        status,
        file: (spec.file ?? "").split("/").pop() || spec.file,
        error: resultErrorText(test),
      });
    }
  }
}

for (const summary of flows.values()) {
  if (summary.unexpected > 0 || summary.unknown > 0) {
    summary.status = "fail";
  } else if (summary.expected > 0 && summary.skipped === 0) {
    summary.status = "pass";
  } else if (summary.expected > 0 && summary.skipped > 0) {
    summary.status = "pass-with-approved-skip";
  } else if (summary.total > 0 && summary.skipped === summary.total) {
    summary.status = "skipped";
  }
}

const flowRows = expectedFlows.map((flow) => {
  const summary = flows.get(flow);
  return {
    flow,
    label: summary.label,
    status: summary.status,
    expected: summary.expected,
    skipped: summary.skipped,
    unexpected: summary.unexpected,
    unknown: summary.unknown,
    total: summary.total,
    files: Array.from(summary.files).sort(),
    tests: summary.tests,
  };
});

const totals = flowRows.reduce(
  (acc, flow) => {
    acc.flows += 1;
    acc[flow.status] = (acc[flow.status] ?? 0) + 1;
    acc.tests += flow.total;
    acc.expected += flow.expected;
    acc.skipped += flow.skipped;
    acc.unexpected += flow.unexpected;
    acc.unknown += flow.unknown;
    return acc;
  },
  {
    flows: 0,
    tests: 0,
    expected: 0,
    skipped: 0,
    unexpected: 0,
    unknown: 0,
  },
);

const report = {
  generatedAt,
  demoEmail: process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com",
  sourceFiles: inputs,
  missingInputs,
  totals,
  flows: flowRows,
};

function markdownTable() {
  const reportTitle =
    expectedFlows.length === Object.keys(FLOW_LABELS).length
      ? "Bukeer Evolucion F1-F17 Parity Report"
      : `Bukeer Evolucion ${expectedFlows.join("-")} Core Parity Report`;
  const lines = [
    `# ${reportTitle}`,
    "",
    `Generated: ${generatedAt}`,
    `Demo user: ${report.demoEmail}`,
    "",
    "## Summary",
    "",
    `- Flows: ${totals.flows}`,
    `- Tests: ${totals.tests}`,
    `- Passing tests: ${totals.expected}`,
    `- Skipped tests: ${totals.skipped}`,
    `- Unexpected tests: ${totals.unexpected}`,
    `- Missing input files: ${missingInputs.length}`,
    "",
    "## Flow Matrix",
    "",
    "| Flow | Label | Status | Passing | Skipped | Unexpected | Files |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
  ];

  for (const flow of flowRows) {
    lines.push(
      `| ${flow.flow} | ${flow.label} | ${flow.status} | ${flow.expected}/${flow.total} | ${flow.skipped} | ${flow.unexpected + flow.unknown} | ${flow.files.join("<br>")} |`,
    );
  }

  if (missingInputs.length) {
    lines.push("", "## Missing Inputs", "");
    for (const input of missingInputs) {
      lines.push(`- ${input.path}: ${input.error}`);
    }
  }

  const failingTests = flowRows.flatMap((flow) =>
    flow.tests
      .filter((test) => test.status !== "expected")
      .map((test) => ({ flow: flow.flow, ...test })),
  );

  if (failingTests.length) {
    lines.push("", "## Non-Passing Tests", "");
    for (const test of failingTests) {
      const suffix = test.error ? ` - ${test.error.split("\n")[0]}` : "";
      lines.push(
        `- ${test.flow} ${test.file} :: ${test.title} [${test.status}]${suffix}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  join(outputDir, "evolucion-parity-report.json"),
  JSON.stringify(report, null, 2),
);
writeFileSync(join(outputDir, "evolucion-parity-report.md"), markdownTable());

console.log(
  `Evolucion parity report written to ${outputDir} (${totals.tests} tests, ${missingInputs.length} missing inputs).`,
);
