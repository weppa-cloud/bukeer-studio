'use client';

import { useCallback } from 'react';
import { StudioInput, StudioSelect, StudioTextarea } from '@/components/studio/ui/primitives';
import { getSectionFieldConfig } from '@/lib/studio/section-fields';
import type { FieldDefinition } from '@/lib/studio/section-fields';

interface SectionFormProps {
  sectionType: string;
  content: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export function SectionForm({ sectionType, content, onChange }: SectionFormProps) {
  const fieldConfig = getSectionFieldConfig(sectionType);

  if (!fieldConfig) {
    return (
      <div className="p-4 text-sm text-[var(--studio-text-muted)]">
        No editable fields for section type: <code>{sectionType}</code>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="px-4 py-3 bg-[var(--studio-panel)] border-b border-[var(--studio-border)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--studio-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">{fieldConfig.label}</h3>
        </div>
        <p className="text-[11px] text-[var(--studio-text-muted)] mt-0.5 ml-4">
          Changes update the preview in real time
        </p>
      </div>
      <div className="px-4 py-4 space-y-4">
        {fieldConfig.fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            value={content[field.name]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Field Renderer
// ============================================================================

interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (field: string, value: unknown) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const handleChange = useCallback(
    (newValue: unknown) => {
      onChange(field.name, newValue);
    },
    [field.name, onChange]
  );

  const stringValue = typeof value === 'string' ? value : '';

  switch (field.type) {
    case 'text':
    case 'url':
      return (
        <div className="space-y-1.5">
          <label htmlFor={field.name} className="text-xs font-semibold text-[var(--studio-text-muted)]">
            {field.label}
          </label>
          <StudioInput
            id={field.name}
            type={field.type === 'url' ? 'url' : 'text'}
            value={stringValue}
            placeholder={field.placeholder}
            onChange={(e) => handleChange(e.target.value)}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1.5">
          <label htmlFor={field.name} className="text-xs font-semibold text-[var(--studio-text-muted)]">
            {field.label}
          </label>
          <StudioTextarea
            id={field.name}
            value={stringValue}
            placeholder={field.placeholder}
            rows={3}
            onChange={(e) => handleChange(e.target.value)}
          />
        </div>
      );

    case 'image':
      return (
        <div className="space-y-1.5">
          <label htmlFor={field.name} className="text-xs font-semibold text-[var(--studio-text-muted)]">
            {field.label}
          </label>
          <StudioInput
            id={field.name}
            type="url"
            value={stringValue}
            placeholder="https://example.com/image.jpg"
            onChange={(e) => handleChange(e.target.value)}
          />
          {stringValue && (
            <div className="mt-1 rounded-md overflow-hidden border border-[var(--studio-border)] bg-[var(--studio-panel)]">
              <img
                src={stringValue}
                alt={field.label}
                className="w-full h-24 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--studio-text-muted)]">{field.label}</label>
          <StudioSelect
            value={stringValue}
            onChange={(e) => handleChange(e.target.value)}
            options={(field.options || []).map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>
      );

    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--studio-text-muted)]">{field.label}</label>
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => handleChange(!value)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors ${
              value
                ? 'bg-[var(--studio-primary)] border-[var(--studio-primary)]'
                : 'bg-[var(--studio-panel)] border-[var(--studio-border)]'
            }`}
          >
            <span
              className={`pointer-events-none block h-4 w-4 rounded-full bg-[var(--studio-bg-elevated)] shadow ring-0 transition-transform ${
                value ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      );

    default:
      return null;
  }
}
