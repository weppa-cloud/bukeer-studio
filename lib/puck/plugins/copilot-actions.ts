/**
 * @deprecated Use lib/studio/section-actions.ts instead.
 * This file is kept for the legacy Puck editor (app/editor/[websiteId]/page.tsx).
 * Will be removed when Flutter SSO redirect replaces the iframe editor.
 *
 * Copilot Actions — Convert AI response actions to Puck Data mutations.
 *
 * Each action from the copilot API (rewrite_text, create_section, etc.)
 * is converted to a new PuckData object that can be dispatched via
 * dispatch({ type: "setData", data: newData }).
 */

import type { PuckData, PuckComponentData } from '../adapters';
import { sectionTypeToComponentName } from '../adapters';

// ============================================================================
// Types
// ============================================================================

export interface CopilotAction {
  id: string;
  type: 'rewrite_text' | 'create_section' | 'remove_section' | 'reorder_sections' | 'update_seo' | 'suggest_images' | 'translate' | 'update_theme';
  targetSectionId?: string;
  targetSectionType?: string;
  description: string;
  preview: {
    before?: Record<string, unknown>;
    after: Record<string, unknown>;
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
}

export interface ActionResult {
  actionId: string;
  result: 'applied' | 'skipped' | 'failed';
  error?: string;
}

// ============================================================================
// Action Appliers
// ============================================================================

/**
 * Apply a single copilot action to current Puck data.
 * Returns new PuckData (immutable — does not modify input).
 */
export function applyAction(
  currentData: PuckData,
  action: CopilotAction
): PuckData {
  switch (action.type) {
    case 'rewrite_text':
      return applyRewriteText(currentData, action);
    case 'create_section':
      return applyCreateSection(currentData, action);
    case 'remove_section':
      return applyRemoveSection(currentData, action);
    case 'reorder_sections':
      return applyReorderSections(currentData, action);
    case 'update_seo':
      return applyUpdateSeo(currentData, action);
    case 'suggest_images':
      return applySuggestImages(currentData, action);
    case 'translate':
      return applyTranslate(currentData, action);
    case 'update_theme':
      // Theme updates are handled externally (not in Puck data)
      // Return data unchanged — the copilot panel applies theme via API
      return currentData;
    default:
      console.warn(`[Copilot] Unknown action type: ${action.type}`);
      return currentData;
  }
}

/**
 * Apply all actions in sequence, collecting results.
 */
export function applyAllActions(
  currentData: PuckData,
  actions: CopilotAction[]
): { data: PuckData; results: ActionResult[] } {
  let data = currentData;
  const results: ActionResult[] = [];

  for (const action of actions) {
    try {
      data = applyAction(data, action);
      results.push({ actionId: action.id, result: 'applied' });
    } catch (err) {
      results.push({
        actionId: action.id,
        result: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return { data, results };
}

// ============================================================================
// Individual Action Implementations
// ============================================================================

function applyRewriteText(
  data: PuckData,
  action: CopilotAction
): PuckData {
  if (!action.targetSectionId) {
    throw new Error('rewrite_text requires targetSectionId');
  }

  const content = data.content.map((item) => {
    if (item.props.id === action.targetSectionId) {
      return {
        ...item,
        props: {
          ...item.props,
          ...(action.preview.after as Record<string, unknown>),
          id: item.props.id, // Preserve ID
        },
      };
    }
    return item;
  });

  return { ...data, content };
}

function applyCreateSection(
  data: PuckData,
  action: CopilotAction
): PuckData {
  const sectionType = action.targetSectionType || 'text_image';
  const componentName = sectionTypeToComponentName(sectionType);

  const newComponent: PuckComponentData = {
    type: componentName,
    props: {
      id: crypto.randomUUID(),
      variant: 'default',
      ...(action.preview.after as Record<string, unknown>),
    },
  };

  let content = [...data.content];

  // Insert at position if specified
  if (action.position?.relativeTo) {
    const refIndex = content.findIndex(
      (item) => item.props.id === action.position!.relativeTo
    );
    if (refIndex !== -1) {
      const insertAt = action.position.placement === 'before' ? refIndex : refIndex + 1;
      content.splice(insertAt, 0, newComponent);
    } else {
      content.push(newComponent);
    }
  } else {
    content.push(newComponent);
  }

  return { ...data, content };
}

function applyRemoveSection(
  data: PuckData,
  action: CopilotAction
): PuckData {
  if (!action.targetSectionId) {
    throw new Error('remove_section requires targetSectionId');
  }

  const content = data.content.filter(
    (item) => item.props.id !== action.targetSectionId
  );

  return { ...data, content };
}

function applyReorderSections(
  data: PuckData,
  action: CopilotAction
): PuckData {
  const newOrder = action.preview.after as { order?: string[] };
  if (!newOrder.order || !Array.isArray(newOrder.order)) {
    return data;
  }

  const contentMap = new Map(
    data.content.map((item) => [item.props.id, item])
  );

  const content: PuckComponentData[] = [];
  for (const id of newOrder.order) {
    const item = contentMap.get(id);
    if (item) {
      content.push(item);
      contentMap.delete(id);
    }
  }
  // Append any items not in the new order
  for (const item of contentMap.values()) {
    content.push(item);
  }

  return { ...data, content };
}

/**
 * update_seo — Update SEO-related props on a target section.
 * Applies preview.after fields (e.g., seo_title, seo_description, meta_keywords).
 */
function applyUpdateSeo(
  data: PuckData,
  action: CopilotAction
): PuckData {
  if (!action.targetSectionId) {
    throw new Error('update_seo requires targetSectionId');
  }

  const content = data.content.map((item) => {
    if (item.props.id === action.targetSectionId) {
      return {
        ...item,
        props: {
          ...item.props,
          ...(action.preview.after as Record<string, unknown>),
          id: item.props.id,
        },
      };
    }
    return item;
  });

  return { ...data, content };
}

/**
 * suggest_images — Update image URLs/alt text on a target section.
 * Applies preview.after fields (e.g., image, imageUrl, images, alt).
 */
function applySuggestImages(
  data: PuckData,
  action: CopilotAction
): PuckData {
  if (!action.targetSectionId) {
    throw new Error('suggest_images requires targetSectionId');
  }

  const content = data.content.map((item) => {
    if (item.props.id === action.targetSectionId) {
      return {
        ...item,
        props: {
          ...item.props,
          ...(action.preview.after as Record<string, unknown>),
          id: item.props.id,
        },
      };
    }
    return item;
  });

  return { ...data, content };
}

/**
 * translate — Replace text content of a section with translated version.
 * Applies preview.after which contains the full translated props.
 */
function applyTranslate(
  data: PuckData,
  action: CopilotAction
): PuckData {
  if (!action.targetSectionId) {
    throw new Error('translate requires targetSectionId');
  }

  const content = data.content.map((item) => {
    if (item.props.id === action.targetSectionId) {
      return {
        ...item,
        props: {
          ...item.props,
          ...(action.preview.after as Record<string, unknown>),
          id: item.props.id,
        },
      };
    }
    return item;
  });

  return { ...data, content };
}
