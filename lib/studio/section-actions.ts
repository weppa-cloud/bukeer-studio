/**
 * Section Actions — Immutable mutations on EditorSection[] (no PuckData dependency).
 *
 * Refactored from lib/puck/plugins/copilot-actions.ts.
 * Operates on a flat array of EditorSection instead of PuckData.
 */

import { getSectionDefaultProps } from './section-fields';

// ============================================================================
// Types
// ============================================================================

export interface EditorSection {
  id: string;
  sectionType: string;
  variant: string | null;
  displayOrder: number;
  isEnabled: boolean;
  config: Record<string, unknown>;
  content: Record<string, unknown>;
}

export type ActionType =
  | 'rewrite_text'
  | 'create_section'
  | 'remove_section'
  | 'reorder_sections'
  | 'update_seo'
  | 'suggest_images'
  | 'translate'
  | 'update_theme'
  | 'toggle_visibility'
  | 'duplicate_section';

export interface SectionAction {
  id: string;
  type: ActionType;
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

export interface ActionResult {
  actionId: string;
  result: 'applied' | 'skipped' | 'failed';
  error?: string;
}

// ============================================================================
// Reorder helpers
// ============================================================================

function reindex(sections: EditorSection[]): EditorSection[] {
  return sections.map((s, i) => ({ ...s, displayOrder: i }));
}

// ============================================================================
// Individual Actions
// ============================================================================

export function moveSection(
  sections: EditorSection[],
  sectionId: string,
  direction: 'up' | 'down'
): EditorSection[] {
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) return sections;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= sections.length) return sections;

  const copy = [...sections];
  [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
  return reindex(copy);
}

export function duplicateSection(
  sections: EditorSection[],
  sectionId: string
): EditorSection[] {
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) return sections;

  const original = sections[idx];
  const duplicate: EditorSection = {
    ...original,
    id: crypto.randomUUID(),
    displayOrder: idx + 1,
    content: { ...original.content },
    config: { ...original.config },
  };

  const copy = [...sections];
  copy.splice(idx + 1, 0, duplicate);
  return reindex(copy);
}

export function removeSection(
  sections: EditorSection[],
  sectionId: string
): EditorSection[] {
  return reindex(sections.filter((s) => s.id !== sectionId));
}

export function toggleSectionVisibility(
  sections: EditorSection[],
  sectionId: string
): EditorSection[] {
  return sections.map((s) =>
    s.id === sectionId ? { ...s, isEnabled: !s.isEnabled } : s
  );
}

export function updateSectionContent(
  sections: EditorSection[],
  sectionId: string,
  contentPatch: Record<string, unknown>
): EditorSection[] {
  return sections.map((s) =>
    s.id === sectionId
      ? { ...s, content: { ...s.content, ...contentPatch } }
      : s
  );
}

export function addSection(
  sections: EditorSection[],
  sectionType: string,
  position?: { relativeTo?: string; placement?: 'before' | 'after' }
): EditorSection[] {
  const defaults = getSectionDefaultProps(sectionType);
  const newSection: EditorSection = {
    id: crypto.randomUUID(),
    sectionType,
    variant: (defaults.variant as string) ?? null,
    displayOrder: sections.length,
    isEnabled: true,
    config: {},
    content: { ...defaults },
  };

  const copy = [...sections];

  if (position?.relativeTo) {
    const refIdx = copy.findIndex((s) => s.id === position.relativeTo);
    if (refIdx !== -1) {
      const insertAt = position.placement === 'before' ? refIdx : refIdx + 1;
      copy.splice(insertAt, 0, newSection);
      return reindex(copy);
    }
  }

  copy.push(newSection);
  return reindex(copy);
}

// ============================================================================
// AI Copilot Action Applier (batch)
// ============================================================================

export function applyAction(
  sections: EditorSection[],
  action: SectionAction
): EditorSection[] {
  switch (action.type) {
    case 'rewrite_text':
    case 'suggest_images':
    case 'translate':
    case 'update_seo':
      if (!action.targetSectionId) {
        throw new Error(`${action.type} requires targetSectionId`);
      }
      return updateSectionContent(sections, action.targetSectionId, action.preview.after);

    case 'create_section':
      return addSection(
        sections,
        action.targetSectionType || 'text_image',
        action.position
      );

    case 'remove_section':
      if (!action.targetSectionId) {
        throw new Error('remove_section requires targetSectionId');
      }
      return removeSection(sections, action.targetSectionId);

    case 'reorder_sections': {
      const newOrder = action.preview.after as { order?: string[] };
      if (!newOrder.order || !Array.isArray(newOrder.order)) return sections;

      const sectionMap = new Map(sections.map((s) => [s.id, s]));
      const reordered: EditorSection[] = [];
      for (const id of newOrder.order) {
        const s = sectionMap.get(id);
        if (s) {
          reordered.push(s);
          sectionMap.delete(id);
        }
      }
      for (const s of sectionMap.values()) {
        reordered.push(s);
      }
      return reindex(reordered);
    }

    case 'toggle_visibility':
      if (!action.targetSectionId) {
        throw new Error('toggle_visibility requires targetSectionId');
      }
      return toggleSectionVisibility(sections, action.targetSectionId);

    case 'duplicate_section':
      if (!action.targetSectionId) {
        throw new Error('duplicate_section requires targetSectionId');
      }
      return duplicateSection(sections, action.targetSectionId);

    case 'update_theme':
      // Theme updates are handled externally
      return sections;

    default:
      console.warn(`[SectionActions] Unknown action type: ${action.type}`);
      return sections;
  }
}

export function applyAllActions(
  sections: EditorSection[],
  actions: SectionAction[]
): { sections: EditorSection[]; results: ActionResult[] } {
  let current = sections;
  const results: ActionResult[] = [];

  for (const action of actions) {
    try {
      current = applyAction(current, action);
      results.push({ actionId: action.id, result: 'applied' });
    } catch (err) {
      results.push({
        actionId: action.id,
        result: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return { sections: current, results };
}
