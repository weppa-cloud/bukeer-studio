import { z } from 'zod';

export const ProductTypeSchema = z.enum(['package_kit', 'activity', 'hotel']);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const EditHistorySourceSchema = z.enum([
  'flutter',
  'studio',
  'api',
  'trigger_default',
  'ai',
  'system',
]);
export type EditHistorySource = z.infer<typeof EditHistorySourceSchema>;

export const EditHistoryOperationSchema = z.enum(['INSERT', 'UPDATE', 'DELETE']);
export type EditHistoryOperation = z.infer<typeof EditHistoryOperationSchema>;

export const EditHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_type: ProductTypeSchema,
  field: z.string(),
  source: EditHistorySourceSchema,
  operation: EditHistoryOperationSchema,
  previous_value: z.unknown().nullable(),
  new_value: z.unknown().nullable(),
  change_summary: z.string().nullable(),
  changed_by: z.string().uuid().nullable(),
  ai_model: z.string().nullable(),
  ai_cost_event_id: z.string().uuid().nullable(),
  legal_hold: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
});
export type EditHistoryEntry = z.infer<typeof EditHistoryEntrySchema>;

export const RollbackRequestSchema = z.object({
  history_id: z.string().uuid(),
  history_created_at: z.string().datetime({ offset: true }),
});
export type RollbackRequest = z.infer<typeof RollbackRequestSchema>;

export const EditHistoryListQuerySchema = z.object({
  product_id: z.string().uuid(),
  product_type: ProductTypeSchema,
  field: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  before: z.string().datetime({ offset: true }).optional(),
});
export type EditHistoryListQuery = z.infer<typeof EditHistoryListQuerySchema>;
