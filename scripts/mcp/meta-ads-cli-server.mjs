#!/usr/bin/env node
/**
 * Local MCP server for Codex Desktop that wraps the official Meta Ads CLI.
 * All tools are read-only. stdout is reserved for MCP JSON-RPC frames.
 */

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const cli = path.join(repoRoot, "scripts/meta-ads-cli.sh");

const emptySchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
};

const limitSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "Maximum rows to return.",
    },
  },
};

const idSchema = (property, description) => ({
  type: "object",
  additionalProperties: false,
  required: [property],
  properties: {
    [property]: { type: "string", minLength: 1, description },
  },
});

const optionalAccountIdSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    accountId: {
      type: "string",
      description: "Optional ad account ID. Defaults to META_AD_ACCOUNT_ID/AD_ACCOUNT_ID.",
    },
  },
};

const catalogChildListSchema = {
  type: "object",
  additionalProperties: false,
  required: ["catalogId"],
  properties: {
    catalogId: { type: "string", minLength: 1, description: "Product catalog ID." },
    limit: { type: "integer", minimum: 1, maximum: 100 },
  },
};

const adsetListSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    campaignId: { type: "string", description: "Optional campaign ID." },
    limit: { type: "integer", minimum: 1, maximum: 100 },
  },
};

const adListSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    adsetId: { type: "string", description: "Optional ad set ID." },
    limit: { type: "integer", minimum: 1, maximum: 100 },
  },
};

const insightsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    datePreset: {
      type: "string",
      enum: [
        "today",
        "yesterday",
        "last_3d",
        "last_7d",
        "last_14d",
        "last_30d",
        "last_90d",
        "this_month",
        "last_month",
      ],
      default: "last_30d",
    },
    since: { type: "string", description: "Start date YYYY-MM-DD." },
    until: { type: "string", description: "End date YYYY-MM-DD." },
    timeIncrement: {
      type: "string",
      enum: ["daily", "weekly", "monthly", "all_days"],
      default: "all_days",
    },
    fields: {
      type: "string",
      description: "Comma-separated Meta insight fields.",
      default: "spend,impressions,clicks,ctr,cpc,reach",
    },
    campaignId: { type: "string" },
    adsetId: { type: "string" },
    adId: { type: "string" },
    breakdowns: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "age",
          "gender",
          "country",
          "publisher_platform",
          "device_platform",
          "platform_position",
          "impression_device",
        ],
      },
    },
    sort: { type: "string", description: 'Sort order, e.g. "spend_descending".' },
    limit: { type: "integer", minimum: 1, maximum: 500 },
  },
};

const writeOperationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["args", "reason"],
  properties: {
    args: {
      type: "array",
      minItems: 3,
      items: { type: "string" },
      description: "Exact CLI argv after `meta`, e.g. ['ads','campaign','create','--name','Draft','--objective','outcome_leads'].",
    },
    reason: {
      type: "string",
      minLength: 10,
      description: "Operational reason for audit/review.",
    },
    confirm: {
      type: "boolean",
      default: false,
      description: "Must be true for execution after env flags are enabled.",
    },
  },
};

const writeSubcommands = new Set([
  "create",
  "update",
  "connect",
  "disconnect",
  "assign-user",
  "delete",
]);

const tools = [
  {
    name: "meta_ads_cli_surface_reference",
    description: "Describe the local read-only MCP surface and how it maps to Meta's official Ads AI Connectors capability groups.",
    inputSchema: emptySchema,
    handler: () => ({
      ok: true,
      data: {
        source: "Local MCP wrapper around the official Meta Ads CLI.",
        remoteOfficialEndpoint: "https://mcp.facebook.com/ads",
        localMode: "read-only",
        officialCapabilityGroups: [
          "campaign management",
          "accounts/pages/assets",
          "product catalog",
          "dataset quality",
          "insights and benchmarks",
        ],
        exposedReadOnlyTools: tools
          .map((tool) => tool.name)
          .filter((name) => name !== "meta_ads_cli_surface_reference" && name !== "meta_ads_cli_write_operation"),
        writeTool: {
          name: "meta_ads_cli_write_operation",
          default: "blocked",
          requiredFlags: ["META_ADS_CLI_WRITES_ENABLED=true", "confirm=true"],
          activeStatusRequires: "META_ADS_CLI_ALLOW_ACTIVE=true",
          destructiveRequires: "META_ADS_CLI_DESTRUCTIVE_WRITES_ENABLED=true",
        },
        intentionallyBlockedByDefault: [
          "create/update/connect/disconnect/delete operations",
          "ACTIVE status changes",
          "forced deletes",
          "financial/billing operations",
        ],
      },
    }),
  },
  {
    name: "meta_ads_cli_auth_status",
    description: "Check whether the official Meta Ads CLI sees an access token. Does not call Meta Ads data endpoints.",
    inputSchema: emptySchema,
    handler: () => runMeta(["auth", "status"], { json: false }),
  },
  {
    name: "meta_ads_cli_list_ad_accounts",
    description: "List Meta ad accounts available to the configured token. Read-only.",
    inputSchema: limitSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 25, 100);
      return runMeta(["ads", "adaccount", "list", "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_ad_account",
    description: "Get details for the configured or specified Meta ad account. Read-only equivalent of account/entity lookup.",
    inputSchema: optionalAccountIdSchema,
    handler: (args) => {
      const command = ["ads", "adaccount", "get"];
      if (args?.accountId) command.push(String(args.accountId));
      return runMeta(command);
    },
  },
  {
    name: "meta_ads_cli_current_ad_account",
    description: "Show the currently configured Meta ad account from the official CLI environment. Read-only.",
    inputSchema: emptySchema,
    handler: () => runMeta(["ads", "adaccount", "current"], { json: false }),
  },
  {
    name: "meta_ads_cli_list_pages",
    description: "List Facebook Pages available to the configured token. Read-only assets/pages capability.",
    inputSchema: limitSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 25, 100);
      return runMeta(["ads", "page", "list", "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_page",
    description: "Get details for a Facebook Page by page ID. Read-only assets/pages capability.",
    inputSchema: idSchema("pageId", "Facebook Page ID."),
    handler: (args) => runMeta(["ads", "page", "get", String(args.pageId)]),
  },
  {
    name: "meta_ads_cli_list_campaigns",
    description: "List campaigns in the configured Meta ad account. Read-only.",
    inputSchema: limitSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 10, 100);
      return runMeta(["ads", "campaign", "list", "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_campaign",
    description: "Get details for a specific campaign by ID. Read-only campaign-management lookup.",
    inputSchema: idSchema("campaignId", "Meta campaign ID."),
    handler: (args) => runMeta(["ads", "campaign", "get", String(args.campaignId)]),
  },
  {
    name: "meta_ads_cli_list_adsets",
    description: "List ad sets in the configured Meta ad account or campaign. Read-only.",
    inputSchema: adsetListSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 10, 100);
      const command = ["ads", "adset", "list"];
      if (args?.campaignId) command.push(String(args.campaignId));
      command.push("--limit", String(limit));
      return runMeta(command);
    },
  },
  {
    name: "meta_ads_cli_get_adset",
    description: "Get details for a specific ad set by ID. Read-only campaign-management lookup.",
    inputSchema: idSchema("adsetId", "Meta ad set ID."),
    handler: (args) => runMeta(["ads", "adset", "get", String(args.adsetId)]),
  },
  {
    name: "meta_ads_cli_list_ads",
    description: "List ads in the configured Meta ad account or ad set. Read-only.",
    inputSchema: adListSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 10, 100);
      const command = ["ads", "ad", "list"];
      if (args?.adsetId) command.push(String(args.adsetId));
      command.push("--limit", String(limit));
      return runMeta(command);
    },
  },
  {
    name: "meta_ads_cli_get_ad",
    description: "Get details for a specific ad by ID. Read-only campaign-management lookup.",
    inputSchema: idSchema("adId", "Meta ad ID."),
    handler: (args) => runMeta(["ads", "ad", "get", String(args.adId)]),
  },
  {
    name: "meta_ads_cli_list_creatives",
    description: "List ad creatives in the configured ad account. Read-only creative asset lookup.",
    inputSchema: limitSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 10, 100);
      return runMeta(["ads", "creative", "list", "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_creative",
    description: "Get details for a specific ad creative by ID. Read-only creative asset lookup.",
    inputSchema: idSchema("creativeId", "Meta ad creative ID."),
    handler: (args) => runMeta(["ads", "creative", "get", String(args.creativeId)]),
  },
  {
    name: "meta_ads_cli_get_insights",
    description: "Query Meta Ads performance insights through the official CLI. Read-only.",
    inputSchema: insightsSchema,
    handler: (args) => {
      const command = ["ads", "insights", "get"];
      if (args?.since) command.push("--since", String(args.since));
      if (args?.until) command.push("--until", String(args.until));
      if (!args?.since && !args?.until) command.push("--date-preset", String(args?.datePreset ?? "last_30d"));
      command.push("--time-increment", String(args?.timeIncrement ?? "all_days"));
      command.push("--fields", String(args?.fields ?? "spend,impressions,clicks,ctr,cpc,reach"));
      if (args?.campaignId) command.push("--campaign-id", String(args.campaignId));
      if (args?.adsetId) command.push("--adset-id", String(args.adsetId));
      if (args?.adId) command.push("--ad-id", String(args.adId));
      for (const breakdown of args?.breakdowns ?? []) command.push("--breakdown", String(breakdown));
      if (args?.sort) command.push("--sort", String(args.sort));
      command.push("--limit", String(clampLimit(args?.limit, 50, 500)));
      return runMeta(command);
    },
  },
  {
    name: "meta_ads_cli_list_datasets",
    description: "List datasets / ads pixels available to the configured account or business. Read-only signal diagnostics.",
    inputSchema: limitSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 25, 100);
      return runMeta(["ads", "dataset", "list", "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_dataset",
    description: "Get details for a dataset / ads pixel by ID. Read-only signal diagnostics.",
    inputSchema: idSchema("datasetId", "Dataset / pixel ID."),
    handler: (args) => runMeta(["ads", "dataset", "get", String(args.datasetId)]),
  },
  {
    name: "meta_ads_cli_list_catalogs",
    description: "List product catalogs for the configured business/account. Read-only product catalog capability.",
    inputSchema: limitSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 25, 100);
      return runMeta(["ads", "catalog", "list", "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_catalog",
    description: "Get details for a product catalog by ID. Read-only product catalog capability.",
    inputSchema: idSchema("catalogId", "Product catalog ID."),
    handler: (args) => runMeta(["ads", "catalog", "get", String(args.catalogId)]),
  },
  {
    name: "meta_ads_cli_list_product_feeds",
    description: "List product feeds inside a product catalog. Read-only product catalog capability.",
    inputSchema: catalogChildListSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 25, 100);
      return runMeta(["ads", "product-feed", "list", "--catalog-id", String(args.catalogId), "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_product_feed",
    description: "Get details for a product feed by ID. Read-only product catalog capability.",
    inputSchema: idSchema("productFeedId", "Product feed ID."),
    handler: (args) => runMeta(["ads", "product-feed", "get", String(args.productFeedId)]),
  },
  {
    name: "meta_ads_cli_list_product_items",
    description: "List product items inside a product catalog. Read-only product catalog capability.",
    inputSchema: catalogChildListSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 25, 100);
      return runMeta(["ads", "product-item", "list", "--catalog-id", String(args.catalogId), "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_product_item",
    description: "Get details for a product item by ID. Read-only product catalog capability.",
    inputSchema: idSchema("productItemId", "Product item ID."),
    handler: (args) => runMeta(["ads", "product-item", "get", String(args.productItemId)]),
  },
  {
    name: "meta_ads_cli_list_product_sets",
    description: "List product sets inside a product catalog. Read-only product catalog capability.",
    inputSchema: catalogChildListSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 25, 100);
      return runMeta(["ads", "product-set", "list", "--catalog-id", String(args.catalogId), "--limit", String(limit)]);
    },
  },
  {
    name: "meta_ads_cli_get_product_set",
    description: "Get details for a product set by ID. Read-only product catalog capability.",
    inputSchema: idSchema("productSetId", "Product set ID."),
    handler: (args) => runMeta(["ads", "product-set", "get", String(args.productSetId)]),
  },
  {
    name: "meta_ads_cli_write_operation",
    description: "Run an allowed official Meta Ads CLI write operation only when guarded env flags and confirm=true are set. Otherwise returns a dry-run preview.",
    inputSchema: writeOperationSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: (args) => runWriteOperation(args),
  },
];

function clampLimit(value, fallback, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), 1), max);
}

async function runMeta(args, options = { json: true }) {
  const commandArgs = options.json ? ["--output", "json", ...args] : args;
  try {
    const { stdout, stderr } = await execFileAsync(cli, commandArgs, {
      cwd: repoRoot,
      timeout: 60_000,
      maxBuffer: 1024 * 1024 * 8,
      env: process.env,
    });
    if (stderr.trim()) log({ event: "meta_cli_stderr", stderr: redact(stderr.trim()) });
    return parseOutput(stdout, options.json);
  } catch (error) {
    const stdout = typeof error.stdout === "string" ? error.stdout : "";
    const stderr = typeof error.stderr === "string" ? error.stderr : "";
    return {
      ok: false,
      error: redact(error.message ?? String(error)),
      stdout: redact(stdout.trim()),
      stderr: redact(stderr.trim()),
    };
  }
}

async function runWriteOperation(input) {
  const args = Array.isArray(input?.args) ? input.args.map(String) : [];
  const validation = validateWriteArgs(args);
  if (!validation.ok) {
    return { ok: false, blocked: validation.blocked, dryRun: true, args };
  }

  const writesEnabled = process.env.META_ADS_CLI_WRITES_ENABLED === "true";
  const confirm = input?.confirm === true;
  const preview = {
    ok: true,
    dryRun: true,
    args: validation.args,
    reason: String(input?.reason ?? ""),
    requiredForExecution: ["META_ADS_CLI_WRITES_ENABLED=true", "confirm=true"],
  };

  if (!writesEnabled || !confirm) {
    return {
      ...preview,
      ok: false,
      blocked: {
        code: "META_ADS_CLI_WRITE_DISABLED",
        message: "Write operation was not executed. Enable META_ADS_CLI_WRITES_ENABLED=true and pass confirm=true.",
      },
    };
  }

  return runMeta(validation.args);
}

function validateWriteArgs(inputArgs) {
  const args = inputArgs.filter((arg) => arg.length > 0);
  if (args[0] !== "ads") {
    return blocked("META_ADS_CLI_SCOPE_BLOCKED", "Write operations must start with `ads`.", args);
  }
  const resource = args[1];
  const subcommand = args[2];
  if (!resource || !subcommand || !writeSubcommands.has(subcommand)) {
    return blocked("META_ADS_CLI_WRITE_NOT_ALLOWED", "Only create/update/connect/disconnect/assign-user/delete Meta Ads operations are allowed.", args);
  }
  if (args.includes("--force") || subcommand === "delete" || subcommand === "disconnect") {
    if (process.env.META_ADS_CLI_DESTRUCTIVE_WRITES_ENABLED !== "true") {
      return blocked("META_ADS_CLI_DESTRUCTIVE_BLOCKED", "Destructive writes require META_ADS_CLI_DESTRUCTIVE_WRITES_ENABLED=true.", args);
    }
  }
  if (hasActiveStatus(args) && process.env.META_ADS_CLI_ALLOW_ACTIVE !== "true") {
    return blocked("META_ADS_CLI_ACTIVE_BLOCKED", "ACTIVE status writes require META_ADS_CLI_ALLOW_ACTIVE=true. Keep AI-created entities PAUSED by default.", args);
  }
  if (subcommand === "create" && !hasStatusFlag(args)) {
    args.push("--status", "paused");
  }
  return { ok: true, args };
}

function blocked(code, message, args) {
  return { ok: false, blocked: { code, message }, args };
}

function hasStatusFlag(args) {
  return args.some((arg) => arg === "--status");
}

function hasActiveStatus(args) {
  return args.some((arg, index) => arg === "--status" && String(args[index + 1] ?? "").toLowerCase() === "active");
}

function parseOutput(stdout, expectJson) {
  const text = redact(stdout.trim());
  if (!expectJson) return { ok: true, output: text };
  if (!text) return { ok: true, data: null };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: true, output: text };
  }
}

function redact(value) {
  return String(value)
    .replace(/Authenticated \(token: [^)]+\)/g, "Authenticated (token: [REDACTED])")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g, "Bearer [REDACTED]")
    .replace(/\b(EAA|EAAG|EAAB)[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_META_TOKEN]")
    .replace(/(access_token=)[A-Za-z0-9._~+/=-]+/g, "$1[REDACTED]");
}

function log(payload) {
  process.stderr.write(`${JSON.stringify(payload)}\n`);
}

async function main() {
  const server = new Server(
    { name: "meta-ads-cli", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations ?? {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((candidate) => candidate.name === request.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      };
    }

    const result = await tool.handler(request.params.arguments ?? {});
    return {
      isError: result?.ok === false,
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  await server.connect(new StdioServerTransport());
  log({ event: "server_started", server: "meta-ads-cli", tools: tools.map((tool) => tool.name) });
}

main().catch((error) => {
  log({ event: "fatal", error: redact(error instanceof Error ? error.message : String(error)) });
  process.exit(1);
});
