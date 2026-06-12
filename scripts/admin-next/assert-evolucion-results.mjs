#!/usr/bin/env node

import { readFileSync } from "node:fs";

const resultsPath =
  process.argv[2] ||
  process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ||
  "playwright-report/evolucion/results.json";

const expectedFlows = new Set(
  (process.env.EVOLUCION_EXPECTED_FLOWS ?? "")
    .split(",")
    .map((flow) => flow.trim().toUpperCase())
    .filter(Boolean),
);

if (expectedFlows.size === 0) {
  for (let index = 1; index <= 17; index += 1) {
    expectedFlows.add(`F${index}`);
  }
}

const allowedSkippedTests = new Set(
  (process.env.EVOLUCION_ALLOWED_SKIPS ?? "")
    .split("\n")
    .flatMap((line) => line.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean),
);

function collectSpecs(suite, specs = []) {
  for (const spec of suite.specs ?? []) {
    specs.push(spec);
  }

  for (const childSuite of suite.suites ?? []) {
    collectSpecs(childSuite, specs);
  }

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

function skipKey(spec, test) {
  const fileName = (spec.file ?? "").split("/").pop();
  return `${fileName}::${testTitle(spec, test)}`;
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

const payload = JSON.parse(readFileSync(resultsPath, "utf8"));
const specs = (payload.suites ?? [])
  .flatMap((suite) => collectSpecs(suite))
  .filter((spec) => /evolucion-f\d+.*\.spec\.ts$/.test(spec.file ?? ""));

const errors = [];
const flows = new Map();
let testCount = 0;

for (const spec of specs) {
  const flowMatch = /evolucion-f(\d+)/.exec(spec.file ?? "");
  const flow = flowMatch ? `F${Number(flowMatch[1])}` : null;
  if (flow && !flows.has(flow)) {
    flows.set(flow, { expected: 0, skipped: 0, total: 0 });
  }

  for (const test of spec.tests ?? []) {
    testCount += 1;
    const status = testResultStatus(test);
    if (flow) {
      const summary = flows.get(flow);
      summary.total += 1;
      if (status === "expected") summary.expected += 1;
      if (status === "skipped") summary.skipped += 1;
    }

    if (status === "skipped") {
      const key = skipKey(spec, test);
      if (!allowedSkippedTests.has(key)) {
        errors.push(
          `${spec.file} :: ${testTitle(spec, test)} was skipped without an explicit allowlist entry. Demo-data or secret gaps must fail the Evolucion parity gate.`,
        );
      }
      continue;
    }

    if (status !== "expected") {
      errors.push(
        `${spec.file} :: ${testTitle(spec, test)} ended with status=${status}; full F1-F17 CI parity cannot accept flaky/unexpected tests.`,
      );
    }
  }
}

if (testCount === 0) {
  errors.push(`No Evolucion tests were found in ${resultsPath}.`);
}

for (const flow of expectedFlows) {
  const summary = flows.get(flow);
  if (!summary) {
    errors.push(`Missing Evolucion ${flow} coverage in ${resultsPath}.`);
    continue;
  }

  if (summary.expected === 0) {
    errors.push(
      `Evolucion ${flow} has no expected/passing tests in ${resultsPath} (${summary.skipped}/${summary.total} skipped).`,
    );
  }
}

if (errors.length) {
  console.error(errors.map((message) => `::error::${message}`).join("\n"));
  process.exit(1);
}

console.log(
  `Evolucion results guard: ok (${testCount} tests across ${flows.size} flows).`,
);
