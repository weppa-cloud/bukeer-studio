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

const tools = [
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
    name: "meta_ads_cli_list_campaigns",
    description: "List campaigns in the configured Meta ad account. Read-only.",
    inputSchema: limitSchema,
    handler: (args) => {
      const limit = clampLimit(args?.limit, 10, 100);
      return runMeta(["ads", "campaign", "list", "--limit", String(limit)]);
    },
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
      annotations: {
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
