/**
 * Unified Section Renderer
 *
 * This is the SINGLE render function for all sections.
 * It handles:
 * 1. Type validation (using VALID_SECTION_TYPES from registry)
 * 2. Content validation (using validateSectionComplete from schema)
 * 3. Content normalization (snake_case -> camelCase)
 * 4. Component rendering
 *
 * IMPORTANT: Both section-renderer.tsx and static-page.tsx
 * should delegate to this function.
 */

import { normalizeContent } from './normalize-content';
import { validateSectionComplete } from './schema';
import {
  getSectionComponent,
  isValidSectionType,
} from './section-registry';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface RenderSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface RenderSectionResult {
  element: React.ReactNode;
  error?: {
    type: 'unknown_type' | 'validation_failed' | 'validation_exception';
    message: string;
    details?: unknown;
  };
}

function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function reportSectionIssue(message: string): void {
  // In development we already render an inline diagnostic block in-canvas.
  // Avoid duplicating noise in Next.js issues overlay.
  if (process.env.NODE_ENV !== 'development') {
    console.warn(message);
  }
}

/**
 * Renders a section with validation and normalization.
 *
 * @param props - Section and website data
 * @returns React element or null
 */
export function renderSection({ section, website }: RenderSectionProps): React.ReactNode {
  const result = renderSectionWithResult({ section, website });
  return result.element;
}

/**
 * Renders a section and returns result with error details.
 * Useful for debugging and testing.
 *
 * @param props - Section and website data
 * @returns Object with element and optional error details
 */
export function renderSectionWithResult({
  section,
  website,
}: RenderSectionProps): RenderSectionResult {
  // 1. Verify section type is known (derived from sectionComponents, NOT manual list)
  if (!isValidSectionType(section.section_type)) {
    const error = {
      type: 'unknown_type' as const,
      message: `Unknown section type: ${section.section_type}`,
    };

    reportSectionIssue(`[renderSection] ${error.message}`);

    // Show placeholder in development
    if (process.env.NODE_ENV === 'development') {
      return {
        element: (
          <div className="section-padding bg-amber-50 border border-amber-300 rounded-lg mx-4 my-2">
            <div className="container text-center py-8">
              <p className="text-amber-700 font-medium">
                Tipo de sección desconocido: <code className="bg-amber-100 px-2 py-1 rounded">{section.section_type}</code>
              </p>
              <p className="text-amber-600 text-sm mt-2">
                Verifica que el tipo esté registrado en section-registry.ts
              </p>
            </div>
          </div>
        ),
        error,
      };
    }

    return { element: null, error };
  }

  // 2. Validate with schema (uses snake_case from DB)
  let validationResult: ReturnType<typeof validateSectionComplete>;
  try {
    validationResult = validateSectionComplete(section);
  } catch (err) {
    const error = {
      type: 'validation_exception' as const,
      message: `Validation threw for section ${section.id || section.section_type}`,
      details: err,
    };

    // Keep renderer resilient: surface inline error block without breaking editor.
    reportSectionIssue(
      `[renderSection] ${error.message}: ${err instanceof Error ? err.message : String(err)}`
    );

    if (process.env.NODE_ENV === 'development') {
      return {
        element: (
          <div className="section-padding bg-red-50 border border-red-300 rounded-lg mx-4 my-2">
            <div className="container py-8">
              <p className="text-red-700 font-medium mb-2">
                Error en sección: <code className="bg-red-100 px-2 py-1 rounded">{section.section_type}</code>
              </p>
              <details className="text-sm">
                <summary className="text-red-600 cursor-pointer hover:text-red-800">
                  Ver detalles del error
                </summary>
                <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-auto max-h-48">
                  {safeSerialize(err)}
                </pre>
              </details>
            </div>
          </div>
        ),
        error,
      };
    }

    return { element: null, error };
  }

  if (!validationResult.success) {
    const contentObj = section.content as Record<string, unknown> | null;
    const isEmptyContent = !contentObj || Object.keys(contentObj).length === 0;

    // If content is empty/minimal, render with component fallbacks instead of blocking.
    // This happens when websites are created via "Crear sin IA" — sections are seeded
    // with empty content. Components have their own fallbacks (e.g., hero uses
    // website.content.siteName). Let them render gracefully. (#483)
    if (!isEmptyContent) {
      const error = {
        type: 'validation_failed' as const,
        message: `Invalid section ${section.id || section.section_type}`,
        details: validationResult.error,
      };

      reportSectionIssue(
        `[renderSection] ${error.message}: ${safeSerialize(validationResult.error)}`
      );

      // Show error UI in development
      if (process.env.NODE_ENV === 'development') {
        return {
          element: (
            <div className="section-padding bg-red-50 border border-red-300 rounded-lg mx-4 my-2">
              <div className="container py-8">
                <p className="text-red-700 font-medium mb-2">
                  Error en sección: <code className="bg-red-100 px-2 py-1 rounded">{section.section_type}</code>
                </p>
                <details className="text-sm">
                  <summary className="text-red-600 cursor-pointer hover:text-red-800">
                    Ver detalles del error
                  </summary>
                  <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-auto max-h-48">
                    {safeSerialize(validationResult.error)}
                  </pre>
                </details>
              </div>
            </div>
          ),
          error,
        };
      }

      // Silent in production - skip invalid section
      return { element: null, error };
    }

    // Empty content — log warning and fall through to render with defaults
    reportSectionIssue(
      `[renderSection] Empty content for ${section.section_type} — rendering with component fallbacks`
    );
  }

  // 3. Normalize content for components (snake_case -> camelCase)
  const normalizedContent = normalizeContent(section.content as Record<string, unknown>);
  const normalizedConfig = normalizeContent(section.config as Record<string, unknown>);

  // 4. Get and render component
  const Component = getSectionComponent(section.section_type);

  if (!Component) {
    // This shouldn't happen since we validated the type, but handle it gracefully
    console.error(`[renderSection] Component not found for validated type: ${section.section_type}`);
    return { element: null };
  }

  // Create normalized section for component
  const normalizedSection: WebsiteSection = {
    ...section,
    content: normalizedContent,
    config: normalizedConfig,
  };

  return {
    element: (
      <section
        id={section.section_type}
        key={section.id || section.section_type}
        data-section-id={section.id || section.section_type}
        data-section-type={section.section_type}
      >
        <Component section={normalizedSection} website={website} />
      </section>
    ),
  };
}

/**
 * Renders multiple sections.
 * Filters out invalid sections silently in production.
 *
 * @param sections - Array of sections to render
 * @param website - Website data
 * @returns Array of React elements
 */
export function renderSections(
  sections: WebsiteSection[],
  website: WebsiteData
): React.ReactNode[] {
  return sections
    .filter((section) => section.is_enabled !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .map((section) => renderSection({ section, website }))
    .filter((element): element is React.ReactNode => element !== null);
}
