#!/usr/bin/env node
/**
 * mcp-dataforseo — local MCP server for DataForSEO (SERP + keywords) with
 * file-based cache and monthly budget cap.
 *
 * All logs go to stderr; stdout is reserved for the MCP stdio transport.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  runSerpAdvanced,
  serpAdvancedJsonSchema,
} from "./tools/serp-advanced.js";
import {
  runKeywordVolume,
  keywordVolumeJsonSchema,
} from "./tools/keyword-volume.js";
import {
  runKeywordSuggestions,
  keywordSuggestionsJsonSchema,
} from "./tools/keyword-suggestions.js";
import {
  runCompetitorsDomain,
  competitorsDomainJsonSchema,
} from "./tools/competitors-domain.js";
import {
  runBudgetStatus,
  budgetStatusJsonSchema,
} from "./tools/budget-status.js";
import { BudgetExceededError } from "./budget.js";

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: unknown) => Promise<unknown>;
}

const TOOLS: ToolDef[] = [
  {
    name: "dfs_serp_advanced",
    description:
      "Fetch Google organic SERP (advanced) for a keyword. Cached 30 days. ~$0.30/call. Returns top_n results with rank, url, title, description, domain.",
    inputSchema: serpAdvancedJsonSchema as unknown as Record<string, unknown>,
    handler: runSerpAdvanced,
  },
  {
    name: "dfs_keyword_volume",
    description:
      "Batch search volume + CPC + competition for up to 1000 keywords via Google Ads data. Cached 30 days. ~$0.05/call.",
    inputSchema: keywordVolumeJsonSchema as unknown as Record<string, unknown>,
    handler: runKeywordVolume,
  },
  {
    name: "dfs_keyword_suggestions",
    description:
      "Google Ads keyword suggestions for a target domain. Cached 14 days. ~$0.05/call.",
    inputSchema: keywordSuggestionsJsonSchema as unknown as Record<string, unknown>,
    handler: runKeywordSuggestions,
  },
  {
    name: "dfs_competitors_domain",
    description:
      "Organic competitors for a target domain with overlap metrics. Cached 30 days. ~$0.50/call.",
    inputSchema: competitorsDomainJsonSchema as unknown as Record<string, unknown>,
    handler: runCompetitorsDomain,
  },
  {
    name: "dfs_budget_status",
    description:
      "Report current monthly DataForSEO spend, cap, remaining, by-operation breakdown. No network call.",
    inputSchema: budgetStatusJsonSchema as unknown as Record<string, unknown>,
    handler: runBudgetStatus,
  },
];

function logLine(obj: Record<string, unknown>): void {
  try {
    process.stderr.write(`${JSON.stringify(obj)}\n`);
  } catch {
    // swallow
  }
}

async function main(): Promise<void> {
  const server = new Server(
    { name: "mcp-dataforseo", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
    }

    const startedAt = Date.now();
    try {
      const result = (await tool.handler(args ?? {})) as {
        _cached?: boolean;
        _cost_usd?: number;
      };
      const durationMs = Date.now() - startedAt;
      logLine({
        tool: name,
        cached: Boolean(result?._cached),
        cost: typeof result?._cost_usd === "number" ? result._cost_usd : 0,
        durationMs,
        success: true,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const isBudget = err instanceof BudgetExceededError;
      const message = err instanceof Error ? err.message : String(err);
      logLine({
        tool: name,
        cached: false,
        cost: 0,
        durationMs,
        success: false,
        error: message,
        code: isBudget ? "DFS_BUDGET_EXCEEDED" : undefined,
      });
      const detail = isBudget
        ? { code: "DFS_BUDGET_EXCEEDED", spent: err.spent, cap: err.cap }
        : undefined;
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { error: message, ...(detail ? { detail } : {}) },
              null,
              2,
            ),
          },
        ],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logLine({ event: "server_started", tools: TOOLS.map((t) => t.name) });
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(
    `${JSON.stringify({ event: "fatal", error: msg })}\n`,
  );
  process.exit(1);
});
