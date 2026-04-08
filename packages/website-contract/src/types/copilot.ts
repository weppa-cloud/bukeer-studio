/**
 * Website AI Copilot types — action plans, sessions, and audit trail.
 */

export const COPILOT_ACTION_TYPES = [
  'rewrite_text',
  'create_section',
  'remove_section',
  'reorder_sections',
  'update_seo',
  'suggest_images',
  'translate',
] as const;

export type CopilotActionType = (typeof COPILOT_ACTION_TYPES)[number];

export interface CopilotAction {
  id: string;
  type: CopilotActionType;
  targetSectionId?: string;
  targetSectionType?: string;
  description: string;
  preview: {
    before?: unknown;
    after: unknown;
  };
  confidence: 'high' | 'medium' | 'low';
  position?: {
    relativeTo?: string;
    placement?: 'before' | 'after';
  };
}

export interface CopilotPlan {
  reasoning: string;
  actions: CopilotAction[];
  promptTemplateUsed?: string;
}

export interface CopilotSession {
  id: string;
  websiteId: string;
  prompt: string;
  plan: CopilotPlan;
  status: 'pending' | 'applied' | 'partial' | 'rejected';
}
