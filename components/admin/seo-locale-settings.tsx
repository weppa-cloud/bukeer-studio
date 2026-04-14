'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  StudioBadge,
  StudioButton,
  StudioSelect,
} from '@/components/studio/ui/primitives';

// ─── Constants ────────────────────────────────────────────────────────────────

const AVAILABLE_LOCALES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'es-CO', label: 'es-CO — Español (Colombia)' },
  { value: 'es-MX', label: 'es-MX — Español (México)' },
  { value: 'es-ES', label: 'es-ES — Español (España)' },
  { value: 'es-AR', label: 'es-AR — Español (Argentina)' },
  { value: 'es-PE', label: 'es-PE — Español (Perú)' },
  { value: 'es-CL', label: 'es-CL — Español (Chile)' },
  { value: 'en-US', label: 'en-US — English (United States)' },
  { value: 'en-GB', label: 'en-GB — English (United Kingdom)' },
  { value: 'pt-BR', label: 'pt-BR — Português (Brasil)' },
];

const CONTENT_TYPES: ReadonlyArray<string> = ['Hoteles', 'Actividades', 'Paquetes'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHreflangPreview(
  locales: string[],
  primaryLocale: string,
  domain: string,
  slug: string
): string {
  const lines: string[] = [];

  for (const locale of locales) {
    const hreflang = locale.toLowerCase();
    // Primary locale uses the root path; others get a locale prefix
    const href =
      locale === primaryLocale
        ? `https://${domain}/${slug}`
        : `https://${domain}/${locale.toLowerCase()}/${slug}`;
    lines.push(`<link rel="alternate" hreflang="${hreflang}" href="${href}" />`);
  }

  // x-default always points to the primary locale URL
  lines.push(`<link rel="alternate" hreflang="x-default" href="https://${domain}/${slug}" />`);

  return lines.join('\n');
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SeoLocaleSettingsProps {
  websiteId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SeoLocaleSettings({ websiteId: _websiteId }: SeoLocaleSettingsProps) {
  // A) Locales activos
  const [activeLocales, setActiveLocales] = useState<string[]>(['es-CO']);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState('');
  const [removeWarning, setRemoveWarning] = useState(false);

  // B) Locale principal
  const [primaryLocale, setPrimaryLocale] = useState('es-CO');

  // C) Hreflang preview
  const [hreflangPreview, setHreflangPreview] = useState('');

  function handleAddLocale() {
    if (!selectedToAdd) return;
    if (activeLocales.includes(selectedToAdd)) {
      setShowAddForm(false);
      setSelectedToAdd('');
      return;
    }
    setActiveLocales((prev) => [...prev, selectedToAdd]);
    setSelectedToAdd('');
    setShowAddForm(false);
    setHreflangPreview('');
  }

  function handleRemoveLocale(locale: string) {
    if (activeLocales.length <= 1) {
      setRemoveWarning(true);
      setTimeout(() => setRemoveWarning(false), 3000);
      return;
    }
    const updated = activeLocales.filter((l) => l !== locale);
    setActiveLocales(updated);
    // If the removed locale was the primary, reset to first remaining
    if (primaryLocale === locale) {
      setPrimaryLocale(updated[0]);
    }
    setHreflangPreview('');
  }

  function handleGeneratePreview() {
    const preview = buildHreflangPreview(
      activeLocales,
      primaryLocale,
      'su-dominio.com',
      '[slug]'
    );
    setHreflangPreview(preview);
  }

  const availableToAdd = AVAILABLE_LOCALES.filter(
    (opt) => !activeLocales.includes(opt.value)
  );

  const primaryLocaleOptions = activeLocales.map((loc) => ({
    value: loc,
    label: loc,
  }));

  return (
    <div className="space-y-4">
      {/* ── A) Locales configurados ─────────────────────────────────────────── */}
      <div className="studio-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">
          Locales configurados
        </h3>

        <div className="flex flex-wrap gap-2">
          {activeLocales.map((locale) => (
            <span
              key={locale}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--studio-border)] bg-[var(--studio-bg)] text-sm text-[var(--studio-text)]"
            >
              {locale}
              <button
                type="button"
                onClick={() => handleRemoveLocale(locale)}
                className="text-[var(--studio-text-muted)] hover:text-[var(--studio-danger)] leading-none"
                aria-label={`Eliminar locale ${locale}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {removeWarning && (
          <p className="text-xs text-[var(--studio-danger)]">
            Se requiere al menos un locale activo. No es posible eliminarlo.
          </p>
        )}

        {!showAddForm ? (
          <StudioButton
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            disabled={availableToAdd.length === 0}
          >
            Añadir locale
          </StudioButton>
        ) : (
          <div className="flex items-center gap-2">
            <StudioSelect
              value={selectedToAdd}
              onChange={(e) => setSelectedToAdd(e.target.value)}
              options={[
                { value: '', label: 'Seleccionar locale...' },
                ...availableToAdd,
              ]}
            />
            <StudioButton
              size="sm"
              onClick={handleAddLocale}
              disabled={!selectedToAdd}
            >
              Añadir
            </StudioButton>
            <StudioButton
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setSelectedToAdd('');
              }}
            >
              Cancelar
            </StudioButton>
          </div>
        )}
      </div>

      {/* ── B) Locale principal ──────────────────────────────────────────────── */}
      <div className="studio-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">
          Locale principal
        </h3>
        <p className="text-xs text-[var(--studio-text-muted)]">
          El locale principal se usa para el hreflang x-default
        </p>
        <div className="max-w-xs">
          <label className="block text-xs text-[var(--studio-text-muted)] mb-1">
            Locale principal del sitio
          </label>
          <StudioSelect
            value={primaryLocale}
            onChange={(e) => {
              setPrimaryLocale(e.target.value);
              setHreflangPreview('');
            }}
            options={primaryLocaleOptions}
          />
        </div>
      </div>

      {/* ── C) Hreflang Preview ──────────────────────────────────────────────── */}
      <div className="studio-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">
            Hreflang Preview
          </h3>
          <StudioBadge tone={activeLocales.length >= 2 ? 'success' : 'neutral'}>
            {activeLocales.length >= 2
              ? 'Hreflang activo'
              : '1 locale — hreflang no necesario'}
          </StudioBadge>
        </div>

        <StudioButton size="sm" variant="outline" onClick={handleGeneratePreview}>
          Generar preview hreflang
        </StudioButton>

        {hreflangPreview && (
          <textarea
            readOnly
            value={hreflangPreview}
            rows={6}
            className={cn(
              'w-full rounded border border-[var(--studio-border)]',
              'bg-slate-950 text-slate-100 font-mono text-xs p-3',
              'resize-none outline-none'
            )}
          />
        )}
      </div>

      {/* ── D) Traducción de contenido ───────────────────────────────────────── */}
      <div className="studio-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">
          Traducción de contenido
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--studio-border)]">
                <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Tipo</th>
                <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">es-CO</th>
                {activeLocales
                  .filter((l) => l !== 'es-CO')
                  .map((locale) => (
                    <th key={locale} className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">
                      {locale}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {CONTENT_TYPES.map((type) => (
                <tr key={type} className="border-b border-[var(--studio-border)]/50">
                  <td className="py-2 pr-4 text-[var(--studio-text)]">{type}</td>
                  <td className="py-2 pr-4">
                    <StudioBadge tone="neutral">N/A</StudioBadge>
                  </td>
                  {activeLocales
                    .filter((l) => l !== 'es-CO')
                    .map((locale) => (
                      <td key={locale} className="py-2 pr-4">
                        <StudioBadge tone="neutral">N/A</StudioBadge>
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[var(--studio-text-muted)]">
          Las traducciones se configuran en cada ítem de contenido
        </p>

        <StudioButton
          size="sm"
          variant="outline"
          disabled
          title="Próximamente"
        >
          Ver guía de traducción →
        </StudioButton>
      </div>
    </div>
  );
}
