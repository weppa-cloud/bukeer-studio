import type { z } from 'zod';
import {
  SeoClustersListSchema,
  SeoClustersCreateSchema,
  SeoClustersAssignSchema,
} from '../schemas.js';
import { bukeerRequest } from '../client.js';

// ── list ─────────────────────────────────────────────────────────────────────
export const ListInputSchema = SeoClustersListSchema;
export async function listHandler(input: z.infer<typeof ListInputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/content-intelligence/clusters', {
    method: 'GET',
    query: input,
  });
}

// ── create ───────────────────────────────────────────────────────────────────
export const CreateInputSchema = SeoClustersCreateSchema;
export async function createHandler(input: z.infer<typeof CreateInputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/content-intelligence/clusters', {
    method: 'POST',
    body: { action: 'create', ...input },
  });
}

// ── assign (keyword | page) ──────────────────────────────────────────────────
export const AssignInputSchema = SeoClustersAssignSchema;
export async function assignHandler(input: z.infer<typeof AssignInputSchema>): Promise<unknown> {
  if (input.assignType === 'keyword') {
    return bukeerRequest('/api/seo/content-intelligence/clusters', {
      method: 'POST',
      body: {
        action: 'assign_keyword',
        websiteId: input.websiteId,
        clusterId: input.clusterId,
        keyword: input.keyword,
        intent: input.intent ?? 'informational',
      },
    });
  }
  return bukeerRequest('/api/seo/content-intelligence/clusters', {
    method: 'POST',
    body: {
      action: 'assign_page',
      websiteId: input.websiteId,
      clusterId: input.clusterId,
      pageType: input.pageType,
      pageId: input.pageId,
      role: input.role ?? 'spoke',
      targetKeyword: input.targetKeyword,
    },
  });
}
