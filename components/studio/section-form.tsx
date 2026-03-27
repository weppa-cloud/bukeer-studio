'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
      <div className="p-4 text-sm text-muted-foreground">
        No editable fields for section type: <code>{sectionType}</code>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-4 pt-4">
        <h3 className="text-sm font-semibold">{fieldConfig.label}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Edit the section content below. Changes are reflected in real time.
        </p>
      </div>
      <Separator />
      <div className="px-4 pb-4 space-y-4">
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
          <Label htmlFor={field.name} className="text-xs">
            {field.label}
          </Label>
          <Input
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
          <Label htmlFor={field.name} className="text-xs">
            {field.label}
          </Label>
          <Textarea
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
          <Label htmlFor={field.name} className="text-xs">
            {field.label}
          </Label>
          <Input
            id={field.name}
            type="url"
            value={stringValue}
            placeholder="https://example.com/image.jpg"
            onChange={(e) => handleChange(e.target.value)}
          />
          {stringValue && (
            <div className="mt-1 rounded-md overflow-hidden border bg-muted">
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
          <Label className="text-xs">{field.label}</Label>
          <Select value={stringValue} onValueChange={handleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{field.label}</Label>
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => handleChange(!value)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              value ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
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
