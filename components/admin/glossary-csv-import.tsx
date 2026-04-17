'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StudioButton, StudioBadge } from '@/components/studio/ui/primitives';

interface GlossaryCsvImportProps {
  websiteId: string;
  onClose: (didImport: boolean) => void;
}

interface PreviewRow {
  raw: Record<string, string>;
  sanitized: Record<string, string>;
  stripped: Array<{ field: string; removed: string }>;
}

interface ImportSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors?: Array<{ row: number; message: string }>;
}

// CSV injection chars per OWASP: leading = + - @, plus control chars \t \r.
const INJECTION_LEAD_RE = /^[=+\-@\t\r]+/;

/** Minimal CSV parser — handles quoted cells with embedded commas/quotes/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      pushField();
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      continue;
    }
    if (ch === '\r') {
      // swallow — handled by \n
      continue;
    }
    field += ch;
  }
  // flush tail
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function sanitizeCell(cell: string): { clean: string; removed: string } {
  const match = cell.match(INJECTION_LEAD_RE);
  if (!match) return { clean: cell, removed: '' };
  return { clean: cell.slice(match[0].length), removed: match[0] };
}

export function GlossaryCsvImport({ websiteId, onClose }: GlossaryCsvImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: PreviewRow[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        onClose(summary !== null);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, submitting, summary]);

  const handleFile = useCallback(async (chosen: File | null) => {
    setFile(chosen);
    setPreview(null);
    setParseError(null);
    setSummary(null);
    setSubmitError(null);
    if (!chosen) return;

    try {
      const text = await chosen.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setParseError('El archivo está vacío.');
        return;
      }
      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1, 6); // preview first 5

      const previewRows: PreviewRow[] = dataRows.map((cells) => {
        const raw: Record<string, string> = {};
        const sanitized: Record<string, string> = {};
        const stripped: PreviewRow['stripped'] = [];
        headers.forEach((header, idx) => {
          const original = cells[idx] ?? '';
          raw[header] = original;
          const { clean, removed } = sanitizeCell(original);
          sanitized[header] = clean;
          if (removed) {
            stripped.push({ field: header, removed });
          }
        });
        return { raw, sanitized, stripped };
      });

      setPreview({ headers, rows: previewRows });
    } catch {
      setParseError('No se pudo leer el archivo CSV.');
    }
  }, []);

  const totalStripped = useMemo(
    () => (preview?.rows ?? []).reduce((sum, row) => sum + row.stripped.length, 0),
    [preview],
  );

  const handleSubmit = useCallback(async () => {
    if (!file) return;
    setSubmitting(true);
    setSubmitError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('websiteId', websiteId);
      formData.append('file', file);

      const response = await fetch('/api/seo/glossary/import', {
        method: 'POST',
        body: formData,
      });

      if (response.status === 404) {
        setSubmitError('Endpoint de importación pendiente — el backend aún no lo expone.');
        return;
      }

      const json = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            data?: ImportSummary;
            error?: { message?: string };
          }
        | null;

      if (!response.ok || !json?.success) {
        setSubmitError(json?.error?.message ?? 'No se pudo importar el CSV.');
        return;
      }

      setSummary({
        inserted: json.data?.inserted ?? 0,
        updated: json.data?.updated ?? 0,
        skipped: json.data?.skipped ?? 0,
        errors: json.data?.errors,
      });
    } catch {
      setSubmitError('Error de red al importar.');
    } finally {
      setSubmitting(false);
    }
  }, [file, websiteId]);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => (submitting ? null : onClose(summary !== null))}
      />
      <motion.div
        key="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="glossary-csv-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 studio-card p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <h3 id="glossary-csv-title" className="text-lg font-semibold text-[var(--studio-text)]">
          Importar glosario desde CSV
        </h3>
        <p className="text-xs text-[var(--studio-text-muted)] mt-1">
          Columnas esperadas: <code>term, locale, translation, is_brand, is_destination_name, case_sensitive, notes</code>.
          Se limpian los caracteres iniciales <code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>, tabulaciones y retornos de carro para evitar CSV injection.
        </p>

        <div className="mt-4">
          <label
            htmlFor="glossary-csv-file"
            className="block text-xs font-medium text-[var(--studio-text)] mb-1"
          >
            Archivo CSV
          </label>
          <input
            id="glossary-csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            className="text-sm text-[var(--studio-text)]"
          />
        </div>

        {parseError ? (
          <div
            role="alert"
            aria-live="polite"
            className="mt-3 border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-2 text-xs rounded-md"
          >
            {parseError}
          </div>
        ) : null}

        {preview ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-[var(--studio-text)]">
                Vista previa (primeras {preview.rows.length} filas)
              </p>
              {totalStripped > 0 ? (
                <StudioBadge tone="warning">
                  Guardia anti-inyección: {totalStripped} caracter(es) limpiados
                </StudioBadge>
              ) : (
                <StudioBadge tone="success">Sin caracteres peligrosos</StudioBadge>
              )}
            </div>
            <div className="overflow-x-auto border border-[var(--studio-border)] rounded-md">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--studio-border)]">
                    {preview.headers.map((header) => (
                      <th
                        key={header}
                        className="text-left py-2 px-2 text-[var(--studio-text-muted)]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[var(--studio-border)] last:border-b-0"
                    >
                      {preview.headers.map((header) => {
                        const stripped = row.stripped.find((entry) => entry.field === header);
                        return (
                          <td
                            key={header}
                            className="py-1.5 px-2 text-[var(--studio-text)] align-top"
                          >
                            {row.sanitized[header] || (
                              <span className="text-[var(--studio-text-muted)]">—</span>
                            )}
                            {stripped ? (
                              <span className="block text-[10px] text-[var(--studio-warning)]">
                                eliminado: <code>{JSON.stringify(stripped.removed)}</code>
                              </span>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {summary ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 border border-[var(--studio-border)] rounded-md p-3 text-xs space-y-1"
          >
            <p className="font-medium text-[var(--studio-text)]">Resultado de la importación</p>
            <div className="flex gap-2 flex-wrap">
              <StudioBadge tone="success">Insertados: {summary.inserted}</StudioBadge>
              <StudioBadge tone="info">Actualizados: {summary.updated}</StudioBadge>
              <StudioBadge tone="warning">Omitidos: {summary.skipped}</StudioBadge>
            </div>
            {summary.errors && summary.errors.length > 0 ? (
              <ul className="list-disc pl-4 text-[var(--studio-text-muted)]">
                {summary.errors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>
                    Fila {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {submitError ? (
          <div
            role="alert"
            aria-live="polite"
            className="mt-3 border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-2 text-xs rounded-md"
          >
            {submitError}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 mt-5">
          <StudioButton
            type="button"
            variant="outline"
            onClick={() => onClose(summary !== null)}
            disabled={submitting}
          >
            {summary ? 'Cerrar' : 'Cancelar'}
          </StudioButton>
          <StudioButton
            type="button"
            onClick={handleSubmit}
            disabled={!file || submitting || parseError !== null}
          >
            {submitting ? 'Importando…' : 'Importar'}
          </StudioButton>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
