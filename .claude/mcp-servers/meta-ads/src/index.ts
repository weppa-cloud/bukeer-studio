#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';

import { InMemoryApprovalStore } from './approval.js';
import { CompositeAuditLogger } from './audit.js';
import { loadConfig, sanitizeSecrets } from './config.js';
import { HttpMetaApiClient } from './meta-client.js';
import { TOOLS, toMcpTool } from './tools.js';
import type { ToolContext } from './types.js';

function log(event: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify(sanitizeSecrets(event))}\n`);
}

function mcpResult(result: unknown, isError = false): CallToolResult {
  return {
    isError,
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  } as CallToolResult;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const context: ToolContext = {
    config,
    meta: new HttpMetaApiClient(config),
    audit: new CompositeAuditLogger(config),
    approvals: new InMemoryApprovalStore(),
  };

  const server = new Server(
    { name: 'mcp-meta-ads', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(toMcpTool) as never,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req): Promise<CallToolResult> => {
    const tool = TOOLS.find((candidate) => candidate.name === req.params.name);
    if (!tool) return mcpResult({ ok: false, error: `Unknown tool: ${req.params.name}` }, true);

    try {
      const input = tool.inputSchema.parse(req.params.arguments ?? {});
      const output = await tool.handler(input, context);
      return mcpResult(output, !output.ok);
    } catch (error) {
      const output =
        error instanceof ZodError
          ? { ok: false, error: 'Invalid input', issues: error.issues }
          : { ok: false, error: error instanceof Error ? error.message : String(error) };
      await context.audit.log({
        tool: tool.name,
        input: req.params.arguments ?? {},
        outcome: 'error',
        errorCategory: error instanceof ZodError ? 'VALIDATION_ERROR' : 'UNHANDLED_ERROR',
      });
      return mcpResult(output, true);
    }
  });

  await server.connect(new StdioServerTransport());
  log({ event: 'server_started', tools: TOOLS.map((tool) => tool.name), mode: config.mode });
}

main().catch((error) => {
  log({ event: 'fatal', error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
