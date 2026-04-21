/**
 * editorial-v1 Inclusions & Exclusions.
 *
 * 2-column grid showing what is included (green checkmarks) and what is not
 * included (red X marks) in a package or experience.
 *
 * Column headers use `Icons.check` (green) and `Icons.close` (red). Each list
 * item renders the corresponding icon + text. An optional note paragraph
 * appears below both columns.
 *
 * Content contract:
 *   title?:     string
 *   included:   string[]
 *   excluded:   string[]
 *   note?:      string
 *
 * Server component. No state, no interactivity.
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { localizeEditorialText, getEditorialTextGetter } from '../i18n';
import { Icons } from '../primitives/icons';

export interface EditorialInclusionsExclusionsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface InclusionsExclusionsContent {
  title?: string;
  note?: string;
  included?: string[];
  excluded?: string[];
}

export function InclusionsExclusionsSection({
  section,
  website,
}: EditorialInclusionsExclusionsSectionProps): ReactElement | null {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as InclusionsExclusionsContent;

  const included: string[] = Array.isArray(content.included)
    ? content.included.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];

  const excluded: string[] = Array.isArray(content.excluded)
    ? content.excluded.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];

  if (included.length === 0 && excluded.length === 0) return null;

  const title = localizeEditorialText(website, content.title?.trim() || '');
  const note = localizeEditorialText(website, content.note?.trim() || '');

  // Column header labels — prefer authored i18n keys if registered, else hard-code Spanish defaults
  const includedLabel = editorialText('editorialInclusionsIncludedLabel' as Parameters<typeof editorialText>[0]) || 'Incluido';
  const excludedLabel = editorialText('editorialInclusionsExcludedLabel' as Parameters<typeof editorialText>[0]) || 'No incluido';

  return (
    <section
      className="ev-section ev-inclusions"
      data-screen-label="InclusionsExclusions"
    >
      <div className="ev-container">
        {title ? (
          <div className="ev-section-head">
            <h2 className="headline-md">{title}</h2>
          </div>
        ) : null}

        <div className="inclusions-grid">
          {/* Included column */}
          {included.length > 0 ? (
            <div className="inclusions-col inclusions-col--yes">
              <div className="inclusions-col-header">
                <span className="inclusions-col-icon inclusions-col-icon--yes" aria-hidden="true">
                  {Icons.check({ size: 18 })}
                </span>
                <span className="label">{includedLabel}</span>
              </div>
              <ul className="inclusions-list" role="list">
                {included.map((item, i) => (
                  <li key={`included-${i}`} className="inclusions-item">
                    <span className="inclusions-item-icon inclusions-item-icon--yes" aria-hidden="true">
                      {Icons.check({ size: 14 })}
                    </span>
                    <span className="body-md">{localizeEditorialText(website, item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Excluded column */}
          {excluded.length > 0 ? (
            <div className="inclusions-col inclusions-col--no">
              <div className="inclusions-col-header">
                <span className="inclusions-col-icon inclusions-col-icon--no" aria-hidden="true">
                  {Icons.close({ size: 18 })}
                </span>
                <span className="label">{excludedLabel}</span>
              </div>
              <ul className="inclusions-list" role="list">
                {excluded.map((item, i) => (
                  <li key={`excluded-${i}`} className="inclusions-item">
                    <span className="inclusions-item-icon inclusions-item-icon--no" aria-hidden="true">
                      {Icons.close({ size: 14 })}
                    </span>
                    <span className="body-md">{localizeEditorialText(website, item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {note ? (
          <p className="inclusions-note body-md">{note}</p>
        ) : null}
      </div>
    </section>
  );
}

export default InclusionsExclusionsSection;
