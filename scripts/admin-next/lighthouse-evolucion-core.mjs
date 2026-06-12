#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const demoEmail = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const demoPassword = process.env.E2E_DEMO_PASSWORD || "";
const demoAccountId = process.env.E2E_DEMO_ACCOUNT_ID || "";
const externalBaseUrl = process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_OUTPUT_DIR ||
  "reports/evolucion-lighthouse-core";
const serverMode = process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_SERVER_MODE || "prod";
const distDir = process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_DIST_DIR || ".next-prod";
const minPerformanceScore = Number(
  process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_MIN_PERFORMANCE ?? "0.9",
);
const minAccessibilityScore = Number(
  process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_MIN_ACCESSIBILITY ?? "1",
);
const routeTimeoutMs = Number(
  process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_ROUTE_TIMEOUT_MS ?? "120000",
);
const retryCount = Number(
  process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_RETRIES ?? "1",
);
const routeFilter = new Set(
  (process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_ROUTE_FILTER || "")
    .split(",")
    .map((route) => route.trim())
    .filter(Boolean),
);
const generatedAt = new Date().toISOString();

const staticRoutes = [
  ["itineraries-list", "/admin/itineraries"],
  ["contacts-list", "/admin/contacts"],
  ["crm-conversations", "/admin/conversations"],
];

let sessionName = null;
let port = null;
let server = null;
let chrome = null;
let playwrightBrowser = null;

async function main() {
  if (!demoPassword) {
    throw new Error("E2E_DEMO_PASSWORD is required for authenticated Lighthouse.");
  }
  if (!demoAccountId) {
    throw new Error("E2E_DEMO_ACCOUNT_ID is required for authenticated Lighthouse.");
  }

  mkdirSync(outputDir, { recursive: true });

  const baseUrl = externalBaseUrl || (await startLocalServer());
  await waitForHttp(new URL("/api/health", baseUrl).toString());

  const chromeUserDataDir = path.join(outputDir, ".chrome-profile");
  mkdirSync(chromeUserDataDir, { recursive: true });
  chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
    userDataDir: chromeUserDataDir,
  });

  playwrightBrowser = await chromium.connectOverCDP(
    `http://127.0.0.1:${chrome.port}`,
  );
  const context = playwrightBrowser.contexts()[0];
  const page = await context.newPage();

  try {
    await loginAsDemo(page, baseUrl);
    const cookieHeader = await getCookieHeader(context, baseUrl);
    const dynamicRoutes = await discoverDynamicRoutes(page, baseUrl);
    const routes = [...staticRoutes, ...dynamicRoutes].filter(
      ([moduleName]) => routeFilter.size === 0 || routeFilter.has(moduleName),
    );
    const checks = [];
    await warmAuthenticatedRoutes(page, baseUrl, routes);

    for (const [moduleName, route] of routes) {
      const targetUrl = new URL(route, baseUrl).toString();
      await waitForHttp(targetUrl);
      checks.push(
        await runLighthouse({ moduleName, targetUrl, cookieHeader }),
      );
    }

    const failed = checks.filter((check) => check.status !== "pass");
    const result = {
      status: failed.length === 0 ? "pass" : "fail",
      scope: "admin-next-evolucion-core-lighthouse",
      generatedAt,
      demoEmail,
      baseUrl,
      serverMode,
      minPerformanceScore,
      minAccessibilityScore,
      routeTimeoutMs,
      retryCount,
      routeFilter: [...routeFilter],
      checks,
    };

    writeReports(result);
    console.log(JSON.stringify(result, null, 2));

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await page.close().catch(() => {});
  }
}

async function loginAsDemo(page, baseUrl) {
  const loginUrl = new URL("/login", baseUrl);
  loginUrl.searchParams.set("next", "/admin/itineraries");
  await page.goto(loginUrl.toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForSelector('[data-testid="login-email"]', {
    timeout: 60_000,
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="login-submit"]')
        ?.getAttribute("data-hydrated") === "true",
    null,
    { timeout: 60_000 },
  );
  await page.getByTestId("login-email").fill(demoEmail);
  await page.getByTestId("login-password").fill(demoPassword);
  await Promise.all([
    page.waitForURL("**/admin/itineraries**", { timeout: 60_000 }),
    page.getByTestId("login-submit").click(),
  ]);
  await page.getByTestId("admin-next-evo-shell").waitFor({ timeout: 60_000 });
}

async function discoverDynamicRoutes(page, baseUrl) {
  const routes = [];

  await page.goto(new URL("/admin/itineraries", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByTestId("admin-next-itineraries-list").waitFor({
    timeout: 60_000,
  });
  const itineraryHref = await page
    .locator('[data-testid^="admin-next-itinerary-"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (itineraryHref) {
    routes.push(["itinerary-detail", itineraryHref]);
  }

  await page.goto(new URL("/admin/contacts", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByTestId("admin-next-contacts-grid").waitFor({
    timeout: 60_000,
  });
  const contactHref = await page
    .locator('[data-testid^="admin-next-contact-"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (contactHref) {
    routes.push(["contact-detail", contactHref]);
  }

  return routes;
}

async function warmAuthenticatedRoutes(page, baseUrl, routes) {
  for (const [, route] of routes) {
    await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByTestId("admin-next-evo-shell").waitFor({
      timeout: 60_000,
    });
  }
}

async function getCookieHeader(context, baseUrl) {
  const cookies = await context.cookies(baseUrl);
  const authCookieCount = cookies.filter(
    (cookie) =>
      cookie.name === "sb-auth-token" ||
      (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")),
  ).length;

  if (authCookieCount === 0) {
    throw new Error("Demo login completed but no Supabase auth cookies were found.");
  }

  return cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function runLighthouse({ moduleName, targetUrl, cookieHeader }) {
  const attempts = [];

  for (let attempt = 1; attempt <= retryCount + 1; attempt += 1) {
    const attemptResult = await runLighthouseAttempt({
      moduleName,
      targetUrl,
      cookieHeader,
      attempt,
    });
    attempts.push(attemptResult);

    if (attemptResult.status === "pass") {
      return {
        ...attemptResult,
        attempts,
      };
    }
  }

  const bestAttempt = [...attempts]
    .sort((a, b) => {
      const performanceDelta = (b.performance ?? 0) - (a.performance ?? 0);
      if (performanceDelta !== 0) return performanceDelta;
      return (b.accessibility ?? 0) - (a.accessibility ?? 0);
    })
    .at(0);

  return {
    ...bestAttempt,
    attempts,
  };
}

async function runLighthouseAttempt({
  moduleName,
  targetUrl,
  cookieHeader,
  attempt,
}) {
  const outputPath = path.join(outputDir, `${moduleName}-lighthouse.json`);

  try {
    const runnerResult = await lighthouse(targetUrl, {
      port: chrome.port,
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance", "accessibility"],
      disableStorageReset: true,
      extraHeaders: {
        Cookie: cookieHeader,
      },
      formFactor: "desktop",
      screenEmulation: {
        disabled: true,
      },
      throttlingMethod: "provided",
      maxWaitForLoad: routeTimeoutMs,
    });

    if (!runnerResult) {
      throw new Error("Lighthouse returned no result.");
    }

    const reportJson = Array.isArray(runnerResult.report)
      ? runnerResult.report[0]
      : runnerResult.report;
    writeFileSync(outputPath, reportJson);

    return scoreLighthouseReport({
      moduleName,
      targetUrl,
      outputPath,
      report: runnerResult.lhr,
      attempt,
    });
  } catch (error) {
    const detail = String(error.stderr || error.message || error).trim();

    return {
      status: "fail",
      module: moduleName,
      url: targetUrl,
      attempt,
      performance: null,
      accessibility: null,
      report: existsSync(outputPath) ? outputPath : null,
      failures: ["lighthouse-error"],
      error: detail.slice(0, 1000),
    };
  }
}

function scoreLighthouseReport({
  moduleName,
  targetUrl,
  outputPath,
  report,
  attempt,
}) {
  const performance = report.categories.performance?.score ?? null;
  const accessibility = report.categories.accessibility?.score ?? null;
  const failures = [];

  if (performance === null || performance < minPerformanceScore) {
    failures.push(`performance:${performance}`);
  }
  if (accessibility === null || accessibility < minAccessibilityScore) {
    failures.push(`accessibility:${accessibility}`);
  }

  return {
    status: failures.length === 0 ? "pass" : "fail",
    module: moduleName,
    url: targetUrl,
    attempt,
    performance,
    accessibility,
    report: outputPath,
    failures,
  };
}

async function startLocalServer() {
  const session = acquireSession();
  sessionName = session.SESSION_NAME;
  port = session.PORT;

  const baseUrl = `http://localhost:${port}`;
  const env = {
    ...process.env,
    ADMIN_NEXT_PROTOTYPE_ENABLED: "true",
    ADMIN_NEXT_DATA_SOURCE_MODE: "readonly",
    ADMIN_NEXT_BETA_READONLY_ENABLED: "true",
    ADMIN_NEXT_BETA_ACCOUNT_IDS: demoAccountId,
    ADMIN_NEXT_BETA_ROLES: "admin,agent,accounting",
    ADMIN_NEXT_WRITES_ITINERARIES_ENABLED: "true",
    NEXT_PUBLIC_MAIN_DOMAIN: process.env.NEXT_PUBLIC_MAIN_DOMAIN || "bukeer.com",
    NEXT_PUBLIC_URL: baseUrl,
    PORT: port,
    NEXT_DIST_DIR: distDir,
    LHCI_BLOCK_STREAMING_METADATA: "1",
  };

  if (serverMode === "prod") {
    const buildIdPath = path.join(process.cwd(), distDir, "BUILD_ID");
    if (
      process.env.ADMIN_NEXT_CORE_LIGHTHOUSE_FORCE_BUILD === "1" ||
      !existsSync(buildIdPath)
    ) {
      execFileSync("npm", ["run", "build"], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
      });
    }

    server = spawn("npm", ["run", "start", "--", "--port", port], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } else if (serverMode === "dev") {
    server = spawn("npm", ["run", "dev:session"], {
      cwd: process.cwd(),
      env: {
        ...env,
        NEXT_DEV_TURBO: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } else {
    throw new Error(
      `Unsupported ADMIN_NEXT_CORE_LIGHTHOUSE_SERVER_MODE=${serverMode}.`,
    );
  }

  server.stdout.on("data", (chunk) => {
    process.stdout.write(`[next-lh-core:${sessionName}] ${chunk}`);
  });
  server.stderr.on("data", (chunk) => {
    process.stderr.write(`[next-lh-core:${sessionName}] ${chunk}`);
  });

  return baseUrl;
}

function acquireSession() {
  const output = execFileSync("bash", ["scripts/session-acquire.sh"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const session = {};

  for (const line of output.split("\n")) {
    const match = line.match(/^export\s+([A-Z_]+)=(.+)$/);
    if (match) {
      session[match[1]] = match[2].trim();
    }
  }

  if (!session.SESSION_NAME || !session.PORT) {
    throw new Error(`Could not acquire a local session slot:\n${output}`);
  }

  return session;
}

async function waitForHttp(url) {
  const deadline = Date.now() + 120_000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message}`);
}

function writeReports(result) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    path.join(outputDir, "evolucion-core-lighthouse-report.json"),
    JSON.stringify(result, null, 2),
  );
  writeFileSync(
    path.join(outputDir, "evolucion-core-lighthouse-report.md"),
    markdownReport(result),
  );
}

function markdownReport(result) {
  const lines = [
    "# Bukeer Evolucion Core Lighthouse Report",
    "",
    `Generated: ${result.generatedAt}`,
    `Demo user: ${result.demoEmail}`,
    `Base URL: ${result.baseUrl}`,
    `Server mode: ${result.serverMode}`,
    "",
    "## Summary",
    "",
    `- Status: ${result.status}`,
    `- Min performance: ${result.minPerformanceScore}`,
    `- Min accessibility: ${result.minAccessibilityScore}`,
    "",
    "| Route | Status | Performance | Accessibility | Failures |",
    "| --- | --- | ---: | ---: | --- |",
  ];

  for (const check of result.checks) {
    lines.push(
      `| ${check.module} | ${check.status} | ${score(check.performance)} | ${score(check.accessibility)} | ${check.failures.join("<br>")} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function score(value) {
  if (typeof value !== "number") return "n/a";
  return Math.round(value * 100).toString();
}

async function cleanup() {
  if (playwrightBrowser) {
    await playwrightBrowser.close().catch(() => {});
  }
  if (chrome) {
    await chrome.kill().catch(() => {});
  }
  if (server && !server.killed) {
    server.kill("SIGTERM");
  }
  if (sessionName) {
    try {
      execFileSync("bash", ["scripts/session-release.sh", sessionName], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    } catch (error) {
      process.stderr.write(
        `Could not release session ${sessionName}: ${error.message}\n`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
