#!/usr/bin/env node
/**
 * mcp-bukeer-studio — Local MCP server exposing Bukeer Studio SEO/AI endpoints
 * plus direct Supabase helpers. Communicates over stdio.
 */
import crypto from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ZodError, type ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { BukeerHttpError } from './client.js';
import { TruthFieldBlocked } from './safety.js';

// ── Tool modules ─────────────────────────────────────────────────────────────
import * as seoAudit from './tools/seo-audit.js';
import * as seoResearch from './tools/seo-research.js';
import * as seoClusters from './tools/seo-clusters.js';
import * as seoOptimize from './tools/seo-optimize.js';
import * as seoTranscreate from './tools/seo-transcreate.js';
import * as seoScore from './tools/seo-score.js';
import * as seoStriking from './tools/seo-striking-distance.js';
import * as seoHealth from './tools/seo-health.js';
import * as seoSync from './tools/seo-sync.js';
import * as seoIntegrations from './tools/seo-integrations-status.js';
import * as aiBlog from './tools/ai-generate-blog.js';
import * as websiteGet from './tools/websites-get.js';
import * as websitesList from './tools/websites-list-by-account.js';
import * as blogUpsert from './tools/blog-post-upsert.js';

// ── Tool registry ────────────────────────────────────────────────────────────

interface ToolDef<I extends ZodTypeAny = ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: I;
  handler: (input: unknown) => Promise<unknown>;
}

function def<I extends ZodTypeAny>(d: ToolDef<I>): ToolDef<I> {
  return d;
}

const TOOLS: Array<ToolDef> = [
  def({
    name: 'bukeer_seo_audit',
    description:
      "Audit a Bukeer website's SEO surface. op='run' re-executes the audit (POST); op='read' returns stored findings (GET). Hits /api/seo/content-intelligence/audit.",
    inputSchema: seoAudit.InputSchema,
    handler: seoAudit.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_research',
    description:
      'Keyword + SERP research for a given website, country, language, and seed list. POST /api/seo/content-intelligence/research.',
    inputSchema: seoResearch.InputSchema,
    handler: seoResearch.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_clusters_list',
    description: 'List SEO clusters for a website. GET /api/seo/content-intelligence/clusters.',
    inputSchema: seoClusters.ListInputSchema,
    handler: seoClusters.listHandler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_clusters_create',
    description:
      'Create a new SEO cluster. POST /api/seo/content-intelligence/clusters with action=create.',
    inputSchema: seoClusters.CreateInputSchema,
    handler: seoClusters.createHandler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_clusters_assign',
    description:
      "Assign a keyword or page to an existing cluster. assignType='keyword' requires `keyword`; assignType='page' requires `pageType` + `pageId`. POST /api/seo/content-intelligence/clusters/assign (via clusters action).",
    inputSchema: seoClusters.AssignInputSchema,
    handler: seoClusters.assignHandler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_optimize',
    description:
      "Optimize SEO for a single item (mode='suggest' returns recommendations, mode='apply' writes patches). POST /api/seo/content-intelligence/optimize.",
    inputSchema: seoOptimize.InputSchema,
    handler: seoOptimize.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_transcreate',
    description:
      "Locale transcreation pipeline. action='create_draft' | 'review' | 'apply'. POST /api/seo/content-intelligence/transcreate.",
    inputSchema: seoTranscreate.InputSchema,
    handler: seoTranscreate.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_score',
    description:
      'Compute 5D SEO score for a single item (hotel, activity, transfer, package, destination, blog, page). GET /api/seo/score.',
    inputSchema: seoScore.InputSchema,
    handler: seoScore.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_striking_distance',
    description:
      'Striking-distance keywords (position 8-20, volume ≥100). GET /api/seo/analytics/striking-distance.',
    inputSchema: seoStriking.InputSchema,
    handler: seoStriking.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_health',
    description: 'Health snapshot (GSC/GA4/DFS integrations + sync freshness). GET /api/seo/analytics/health.',
    inputSchema: seoHealth.InputSchema,
    handler: seoHealth.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_seo_sync',
    description:
      'Trigger SEO data sync (GSC + GA4, optional DataForSEO). POST /api/seo/sync.',
    inputSchema: seoSync.InputSchema,
    handler: seoSync.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_integrations_status',
    description:
      'Status of SEO integrations for a website (GSC, GA4, DataForSEO). GET /api/seo/integrations/status.',
    inputSchema: seoIntegrations.InputSchema,
    handler: seoIntegrations.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_generate_blog',
    description:
      'Generate a blog post via the AI editor (v1 simple / v2 answer-first + FAQ). POST /api/ai/editor/generate-blog.',
    inputSchema: aiBlog.InputSchema,
    handler: aiBlog.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_get_website',
    description:
      'Read a single `websites` row by subdomain or id. Uses Supabase service role directly (bypasses /api auth).',
    inputSchema: websiteGet.InputSchema,
    handler: websiteGet.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_list_websites_by_account',
    description: 'List all `websites` rows for a given account_id. Supabase service role.',
    inputSchema: websitesList.InputSchema,
    handler: websitesList.handler as (i: unknown) => Promise<unknown>,
  }),
  def({
    name: 'bukeer_blog_post_upsert',
    description:
      'Insert or update a `website_blog_posts` row. Guardrail: rejects any payload containing truth-table columns (SEO_TRUTH_FIELD_BLOCKED). Supabase service role.',
    inputSchema: blogUpsert.InputSchema,
    handler: blogUpsert.handler as (i: unknown) => Promise<unknown>,
  }),
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashArgs(args: unknown): string {
  try {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(args ?? {}))
      .digest('hex')
      .slice(0, 12);
  } catch {
    return 'unhashable';
  }
}

function emitLog(entry: Record<string, unknown>): void {
  // Structured line to stderr (MCP stdout is reserved for JSON-RPC).
  try {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } catch {
    // ignore logging errors
  }
}

function buildJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  // `$ref`-less output for MCP clients.
  return zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' }) as Record<
    string,
    unknown
  >;
}

function toMcpTool(tool: ToolDef): Tool {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: buildJsonSchema(tool.inputSchema) as Tool['inputSchema'],
  };
}

// ── Server bootstrap ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const server = new Server(
    { name: 'bukeer-studio', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(toMcpTool),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req): Promise<CallToolResult> => {
    const started = Date.now();
    const name = req.params.name;
    const args = req.params.arguments ?? {};
    const tool = TOOLS.find((t) => t.name === name);

    if (!tool) {
      emitLog({
        tool: name,
        args_hash: hashArgs(args),
        durationMs: Date.now() - started,
        success: false,
        error_code: 'UNKNOWN_TOOL',
      });
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      };
    }

    let parsed: unknown;
    try {
      parsed = tool.inputSchema.parse(args);
    } catch (err) {
      const zodErr = err instanceof ZodError ? err.flatten() : String(err);
      emitLog({
        tool: name,
        args_hash: hashArgs(args),
        durationMs: Date.now() - started,
        success: false,
        error_code: 'VALIDATION_ERROR',
      });
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ code: 'VALIDATION_ERROR', details: zodErr }, null, 2),
          },
        ],
      };
    }

    try {
      const result = await tool.handler(parsed);
      const websiteId =
        typeof parsed === 'object' && parsed && 'websiteId' in parsed
          ? String((parsed as Record<string, unknown>).websiteId)
          : undefined;
      emitLog({
        tool: name,
        args_hash: hashArgs(args),
        websiteId,
        durationMs: Date.now() - started,
        success: true,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      let code = 'INTERNAL_ERROR';
      let message = err instanceof Error ? err.message : String(err);
      let details: unknown;
      if (err instanceof BukeerHttpError) {
        code = err.code;
        details = err.details;
      } else if (err instanceof TruthFieldBlocked) {
        code = err.code;
        details = { offendingFields: err.offendingFields };
      }
      emitLog({
        tool: name,
        args_hash: hashArgs(args),
        durationMs: Date.now() - started,
        success: false,
        error_code: code,
      });
      return {
        isError: true,
        content: [
          { type: 'text', text: JSON.stringify({ code, message, details }, null, 2) },
        ],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  emitLog({
    event: 'server_started',
    tool_count: TOOLS.length,
    base_url: process.env.BUKEER_BASE_URL ?? 'http://localhost:3000',
  });
}

main().catch((err) => {
  emitLog({ event: 'fatal', message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
