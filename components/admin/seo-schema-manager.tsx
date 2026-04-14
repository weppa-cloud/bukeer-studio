'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  StudioCard,
  StudioBadge,
  StudioButton,
} from '@/components/studio/ui/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoSchemaManagerProps {
  websiteId: string;
}

interface SchemaRow {
  tipo: string;
  schema: string;
  campos: string;
  estado: string;
  snippet: string;
}

interface GlobalSchemaToggle {
  key: string;
  label: string;
  description: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SCHEMA_ROWS: SchemaRow[] = [
  {
    tipo: 'Hotel',
    schema: 'LodgingBusiness',
    campos: 'name, address, starRating, image, priceRange',
    estado: '✅ Implementado',
    snippet: `{
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "name": "Hotel Ejemplo",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Calle 123",
    "addressLocality": "Bogotá",
    "addressCountry": "CO"
  },
  "starRating": {
    "@type": "Rating",
    "ratingValue": "4"
  },
  "image": "https://ejemplo.com/hotel.jpg",
  "priceRange": "$$$"
}`,
  },
  {
    tipo: 'Actividad',
    schema: 'TouristAttraction',
    campos: 'name, description, offers, geo',
    estado: '✅ Implementado',
    snippet: `{
  "@context": "https://schema.org",
  "@type": "TouristAttraction",
  "name": "Tour por el Amazonas",
  "description": "Experiencia inmersiva en la selva amazónica.",
  "offers": {
    "@type": "Offer",
    "price": "150",
    "priceCurrency": "USD"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-3.4653",
    "longitude": "-62.2159"
  }
}`,
  },
  {
    tipo: 'Paquete',
    schema: 'TouristTrip',
    campos: 'name, description, offers, itinerary',
    estado: '✅ Implementado',
    snippet: `{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": "Paquete Colombia 7 días",
  "description": "Recorre los mejores destinos de Colombia.",
  "offers": {
    "@type": "Offer",
    "price": "1200",
    "priceCurrency": "USD"
  },
  "itinerary": {
    "@type": "ItemList",
    "name": "Itinerario"
  }
}`,
  },
  {
    tipo: 'Destino',
    schema: 'TouristDestination',
    campos: 'name, description, geo, containsPlace',
    estado: '✅ Implementado',
    snippet: `{
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  "name": "Cartagena",
  "description": "Ciudad histórica en la Costa Caribe de Colombia.",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "10.3910",
    "longitude": "-75.4794"
  },
  "containsPlace": [
    { "@type": "TouristAttraction", "name": "Ciudad Amurallada" }
  ]
}`,
  },
  {
    tipo: 'Blog',
    schema: 'Article',
    campos: 'headline, author, datePublished, image',
    estado: '✅ Implementado',
    snippet: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Los mejores destinos de Colombia",
  "author": {
    "@type": "Person",
    "name": "Equipo Bukeer"
  },
  "datePublished": "2026-01-15",
  "image": "https://ejemplo.com/blog-cover.jpg"
}`,
  },
  {
    tipo: 'Página',
    schema: 'WebPage',
    campos: 'name, description, url',
    estado: '✅ Implementado',
    snippet: `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Paquetes de viaje a Colombia",
  "description": "Explora nuestros paquetes turísticos.",
  "url": "https://ejemplo.com/paquetes"
}`,
  },
  {
    tipo: 'Sitio web',
    schema: 'TravelAgency',
    campos: 'name, url, contactPoint, sameAs',
    estado: '✅ Implementado',
    snippet: `{
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  "name": "Agencia de Viajes Ejemplo",
  "url": "https://ejemplo.com",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+57-300-000-0000",
    "contactType": "customer service"
  },
  "sameAs": [
    "https://www.facebook.com/agencia",
    "https://www.instagram.com/agencia"
  ]
}`,
  },
];

const GLOBAL_SCHEMA_TOGGLES: GlobalSchemaToggle[] = [
  {
    key: 'faq_schema',
    label: 'FAQPage schema',
    description: 'Añadir schema FAQ a páginas con sección FAQ',
  },
  {
    key: 'breadcrumb_schema',
    label: 'BreadcrumbList schema',
    description: 'Schema de migas de pan en todas las páginas',
  },
  {
    key: 'organization_schema',
    label: 'Organization schema',
    description: 'Schema de organización en el sitio',
  },
  {
    key: 'sitelinks_searchbox',
    label: 'SiteLinksSearchBox',
    description: 'Habilitar búsqueda en resultados de Google',
  },
];

// ─── Section A: Schema Reference Table ───────────────────────────────────────

function SchemaReferenceTable() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  function toggleRow(tipo: string) {
    setExpandedRow((prev) => (prev === tipo ? null : tipo));
  }

  return (
    <StudioCard className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">
        Referencia de Schema.org por tipo de contenido
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2 pr-4 text-xs font-medium text-[var(--studio-text-muted)] whitespace-nowrap">
                Tipo de Contenido
              </th>
              <th className="py-2 pr-4 text-xs font-medium text-[var(--studio-text-muted)] whitespace-nowrap">
                Schema Requerido
              </th>
              <th className="py-2 pr-4 text-xs font-medium text-[var(--studio-text-muted)]">
                Campos Clave
              </th>
              <th className="py-2 pr-4 text-xs font-medium text-[var(--studio-text-muted)]">
                Estado
              </th>
              <th className="py-2 text-xs font-medium text-[var(--studio-text-muted)]" />
            </tr>
          </thead>
          <tbody>
            {SCHEMA_ROWS.map((row) => (
              <>
                <tr
                  key={row.tipo}
                  className="border-b border-[var(--studio-border)]/50 cursor-pointer hover:bg-[var(--studio-card)] transition-colors"
                  onClick={() => toggleRow(row.tipo)}
                >
                  <td className="py-2 pr-4 font-medium text-[var(--studio-text)] whitespace-nowrap">
                    {row.tipo}
                  </td>
                  <td className="py-2 pr-4">
                    <code className="text-xs bg-[var(--studio-bg)] px-1.5 py-0.5 rounded font-mono text-[var(--studio-accent)]">
                      {row.schema}
                    </code>
                  </td>
                  <td className="py-2 pr-4 text-xs text-[var(--studio-text-muted)] max-w-[240px]">
                    {row.campos}
                  </td>
                  <td className="py-2 pr-4 text-xs text-[var(--studio-text)]">
                    {row.estado}
                  </td>
                  <td className="py-2 text-xs text-[var(--studio-text-muted)]">
                    <span
                      className="inline-block transition-transform duration-200"
                      style={{
                        transform: expandedRow === row.tipo ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▶
                    </span>
                  </td>
                </tr>
                {expandedRow === row.tipo && (
                  <tr key={`${row.tipo}-snippet`} className="border-b border-[var(--studio-border)]/30">
                    <td colSpan={5} className="pb-3 pt-1 px-0">
                      <textarea
                        readOnly
                        value={row.snippet}
                        rows={10}
                        className={cn(
                          'w-full font-mono text-xs rounded p-3',
                          'bg-[#0d1117] text-[#e6edf3]',
                          'border border-[var(--studio-border)]',
                          'resize-none focus:outline-none'
                        )}
                        aria-label={`JSON-LD ejemplo para ${row.tipo}`}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </StudioCard>
  );
}

// ─── Section B: Global Schema Health ─────────────────────────────────────────

function GlobalSchemaHealth({ websiteId }: { websiteId: string }) {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GLOBAL_SCHEMA_TOGGLES.map((t) => [t.key, false]))
  );

  async function handleToggle(key: string, value: boolean) {
    setToggles((prev) => ({ ...prev, [key]: value }));

    try {
      await fetch('/api/seo/schema/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, key, enabled: value }),
      });
    } catch (err) {
      console.error('[SeoSchemaManager] Failed to save schema setting:', err);
    }
  }

  return (
    <StudioCard className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">
        Schema global del sitio
      </h3>

      <div className="space-y-3">
        {GLOBAL_SCHEMA_TOGGLES.map((toggle) => (
          <div key={toggle.key} className="flex items-center justify-between gap-4 studio-panel p-3">
            <div>
              <p className="text-sm font-medium text-[var(--studio-text)]">{toggle.label}</p>
              <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">{toggle.description}</p>
            </div>

            <button
              role="switch"
              aria-checked={toggles[toggle.key]}
              onClick={() => handleToggle(toggle.key, !toggles[toggle.key])}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2',
                'focus-visible:ring-[var(--studio-accent)] focus-visible:ring-offset-2',
                toggles[toggle.key]
                  ? 'bg-[var(--studio-accent)]'
                  : 'bg-[var(--studio-border)]'
              )}
              aria-label={toggle.label}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm',
                  'transform transition duration-200 ease-in-out',
                  toggles[toggle.key] ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </StudioCard>
  );
}

// ─── Section C: Validate JSON-LD ─────────────────────────────────────────────

type ValidationResult =
  | { status: 'idle' }
  | { status: 'valid' }
  | { status: 'invalid'; message: string };

function validateJsonLd(raw: string): ValidationResult {
  if (!raw.trim()) {
    return { status: 'invalid', message: 'El campo está vacío' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'invalid', message: 'JSON inválido — verifica la sintaxis' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 'invalid', message: 'Debe ser un objeto JSON' };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj['@context'] !== 'https://schema.org') {
    return {
      status: 'invalid',
      message: '@context debe ser "https://schema.org"',
    };
  }

  if (!obj['@type'] || typeof obj['@type'] !== 'string') {
    return {
      status: 'invalid',
      message: '@type es requerido y debe ser una cadena de texto',
    };
  }

  return { status: 'valid' };
}

function JsonLdValidator() {
  const [rawInput, setRawInput] = useState('');
  const [result, setResult] = useState<ValidationResult>({ status: 'idle' });

  function handleValidate() {
    setResult(validateJsonLd(rawInput));
  }

  return (
    <StudioCard className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">
        Validar JSON-LD
      </h3>

      <div className="space-y-2">
        <label
          htmlFor="jsonld-validator-input"
          className="block text-xs text-[var(--studio-text-muted)]"
        >
          Pegar JSON-LD para validar
        </label>
        <textarea
          id="jsonld-validator-input"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          rows={8}
          placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "TravelAgency",\n  ...\n}`}
          className={cn(
            'w-full font-mono text-xs rounded p-3',
            'bg-[#0d1117] text-[#e6edf3] placeholder-[#6e7681]',
            'border border-[var(--studio-border)]',
            'resize-y focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]'
          )}
          spellCheck={false}
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <StudioButton size="sm" onClick={handleValidate}>
          Validar
        </StudioButton>

        <a
          href="https://search.google.com/test/rich-results"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium',
            'text-[var(--studio-accent)] hover:underline'
          )}
        >
          Abrir Rich Results Test →
        </a>

        {result.status === 'valid' && (
          <StudioBadge tone="success">✅ Estructura válida</StudioBadge>
        )}
        {result.status === 'invalid' && (
          <StudioBadge tone="danger">❌ Error: {result.message}</StudioBadge>
        )}
      </div>
    </StudioCard>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SeoSchemaManager({ websiteId }: SeoSchemaManagerProps) {
  return (
    <div className="space-y-4">
      {/* A) Schema Reference Table */}
      <SchemaReferenceTable />

      {/* B) Global Schema Health */}
      <GlobalSchemaHealth websiteId={websiteId} />

      {/* C) Validate JSON-LD */}
      <JsonLdValidator />
    </div>
  );
}
