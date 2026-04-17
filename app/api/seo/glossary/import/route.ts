import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 100 * 1024; // 100 KB
const MAX_ROWS = 500;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ImportQuerySchema = z.object({
  websiteId: z.string().uuid(),
});

const LocaleSchema = z.string().min(2).max(16);

const CsvRowSchema = z.object({
  term: z.string().min(1).max(500),
  locale: LocaleSchema,
  translation: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  // Forward-compat flags (accepted + validated, not persisted until migration)
  is_brand: z.string().optional(),
  is_destination_name: z.string().optional(),
  case_sensitive: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function logCall(entry: {
  route: string;
  method: string;
  websiteId?: string;
  durationMs: number;
  success: boolean;
  code?: string;
}) {
  try {
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  } catch {
    // ignore stderr failures
  }
}

function mapSeoError(error: unknown): Response {
  if (error instanceof SeoApiError) {
    return withNoStoreHeaders(apiError(error.code, error.message, error.status, error.details));
  }
  return withNoStoreHeaders(
    apiError(
      'INTERNAL_ERROR',
      'Unable to process glossary import',
      500,
      error instanceof Error ? error.message : String(error),
    ),
  );
}

/**
 * CSV injection guard — strips leading `=`, `@`, `+`, `-` characters per OWASP
 * https://owasp.org/www-community/attacks/CSV_Injection
 */
function stripCsvInjection(value: string): string {
  // Trim first so we detect a leading dangerous char after whitespace
  let trimmed = value.trim();
  while (trimmed.length > 0 && /^[=@+\-\t\r]/.test(trimmed)) {
    trimmed = trimmed.slice(1).trimStart();
  }
  return trimmed;
}

/**
 * Minimal RFC 4180 CSV parser (subset) supporting:
 * - quoted fields with `"..."`
 * - escaped quotes `""`
 * - commas and newlines inside quoted fields
 * - CR, LF, CRLF line endings
 *
 * Returns { header: string[], rows: string[][] } or throws on malformed input.
 */
function parseCsv(input: string): { header: string[]; rows: string[][] } {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    record.push(field);
    field = '';
  };

  const pushRecord = () => {
    pushField();
    // Skip empty lines (all fields empty strings)
    if (record.length > 1 || (record.length === 1 && record[0] !== '')) {
      records.push(record);
    }
    record = [];
  };

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      pushField();
      i++;
      continue;
    }

    if (ch === '\r') {
      // Handle CRLF / CR
      pushRecord();
      if (input[i + 1] === '\n') i += 2;
      else i++;
      continue;
    }

    if (ch === '\n') {
      pushRecord();
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Final record
  if (field !== '' || record.length > 0) {
    pushRecord();
  }

  if (records.length === 0) {
    return { header: [], rows: [] };
  }

  const header = (records[0] ?? []).map((h) => h.trim().toLowerCase());
  const rows = records.slice(1);
  return { header, rows };
}

// ---------------------------------------------------------------------------
// POST — multipart CSV upload
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  const queryParsed = ImportQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
  });

  if (!queryParsed.success) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'VALIDATION_ERROR',
    });
    return withNoStoreHeaders(apiValidationError(queryParsed.error));
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'GLOSSARY_CSV_INVALID',
    });
    return withNoStoreHeaders(
      apiError('GLOSSARY_CSV_INVALID', 'Request must be multipart/form-data with a "file" field', 400),
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'GLOSSARY_CSV_INVALID',
    });
    return withNoStoreHeaders(
      apiError(
        'GLOSSARY_CSV_INVALID',
        'Unable to parse multipart form data',
        400,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }

  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File)) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'GLOSSARY_CSV_INVALID',
    });
    return withNoStoreHeaders(apiError('GLOSSARY_CSV_INVALID', 'Missing "file" field', 400));
  }

  if (fileEntry.size > MAX_FILE_BYTES) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'GLOSSARY_CSV_INVALID',
    });
    return withNoStoreHeaders(
      apiError('GLOSSARY_CSV_INVALID', 'CSV file exceeds 100KB limit', 400, {
        bytes: fileEntry.size,
        limit: MAX_FILE_BYTES,
      }),
    );
  }

  let csvText: string;
  try {
    csvText = await fileEntry.text();
  } catch (error) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'GLOSSARY_CSV_INVALID',
    });
    return withNoStoreHeaders(
      apiError(
        'GLOSSARY_CSV_INVALID',
        'Unable to read CSV file',
        400,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }

  let parsed: { header: string[]; rows: string[][] };
  try {
    parsed = parseCsv(csvText);
  } catch (error) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'GLOSSARY_CSV_INVALID',
    });
    return withNoStoreHeaders(
      apiError(
        'GLOSSARY_CSV_INVALID',
        'Malformed CSV',
        400,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }

  const { header, rows } = parsed;

  const required = ['term', 'locale'];
  const missingColumns = required.filter((col) => !header.includes(col));
  if (missingColumns.length > 0) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'GLOSSARY_CSV_INVALID',
    });
    return withNoStoreHeaders(
      apiError('GLOSSARY_CSV_INVALID', 'CSV missing required columns', 400, { missing: missingColumns }),
    );
  }

  if (rows.length > MAX_ROWS) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'GLOSSARY_CSV_INVALID',
    });
    return withNoStoreHeaders(
      apiError('GLOSSARY_CSV_INVALID', 'CSV exceeds 500 row limit', 400, {
        rows: rows.length,
        limit: MAX_ROWS,
      }),
    );
  }

  // --- Auth now that shape checks passed ---
  try {
    const access = await requireWebsiteAccess(queryParsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    const columnIndex = new Map<string, number>();
    header.forEach((h, idx) => columnIndex.set(h, idx));

    const skipped: Array<{ row: number; reason: string }> = [];
    const payload: Array<{
      website_id: string;
      locale: string;
      term: string;
      translation: string;
      notes: string | null;
      source: string;
      fetched_at: string;
      created_by: string | null;
      updated_at: string;
    }> = [];

    // Deduplicate within same upload against (locale|term) to avoid ON CONFLICT
    // affecting same row twice in a single upsert batch
    const seen = new Set<string>();
    const timestamp = new Date().toISOString();

    for (let r = 0; r < rows.length; r++) {
      const raw = rows[r] ?? [];
      // CSV row number in the source file (1-indexed, +1 for the header line)
      const sourceRow = r + 2;

      const rawRecord: Record<string, string | undefined> = {};
      for (const [name, idx] of columnIndex.entries()) {
        const cell = raw[idx];
        if (cell === undefined) {
          rawRecord[name] = undefined;
          continue;
        }
        rawRecord[name] = stripCsvInjection(cell);
      }

      // Skip fully empty lines
      const allEmpty = Object.values(rawRecord).every((v) => v === undefined || v === '');
      if (allEmpty) continue;

      const validation = CsvRowSchema.safeParse(rawRecord);
      if (!validation.success) {
        skipped.push({
          row: sourceRow,
          reason: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
        continue;
      }

      const term = validation.data.term.trim();
      const locale = validation.data.locale.trim();
      const key = `${locale.toLowerCase()}|${term.toLowerCase()}`;
      if (seen.has(key)) {
        skipped.push({ row: sourceRow, reason: 'duplicate term+locale within upload' });
        continue;
      }
      seen.add(key);

      // Translation is NOT NULL in DB. When missing (no-translate / brand term)
      // default to the term itself so brand/destination names round-trip safely.
      const translation =
        validation.data.translation && validation.data.translation.trim().length > 0
          ? validation.data.translation.trim()
          : term;

      payload.push({
        website_id: queryParsed.data.websiteId,
        locale,
        term,
        translation,
        notes: validation.data.notes && validation.data.notes.length > 0 ? validation.data.notes : null,
        source: 'csv-import',
        fetched_at: timestamp,
        created_by: access.userId ?? null,
        updated_at: timestamp,
      });
    }

    if (payload.length === 0) {
      logCall({
        route: '/api/seo/glossary/import',
        method: 'POST',
        websiteId: queryParsed.data.websiteId,
        durationMs: Date.now() - startedAt,
        success: true,
      });
      return withNoStoreHeaders(apiSuccess({ inserted: 0, updated: 0, skipped }));
    }

    // To distinguish inserted vs updated, fetch existing keys first
    const localeTermPairs = payload.map((p) => ({ locale: p.locale, term: p.term }));
    const locales = Array.from(new Set(localeTermPairs.map((p) => p.locale)));
    const terms = Array.from(new Set(localeTermPairs.map((p) => p.term)));

    const { data: existing, error: existingError } = await admin
      .from('seo_translation_glossary')
      .select('locale, term')
      .eq('website_id', queryParsed.data.websiteId)
      .in('locale', locales)
      .in('term', terms);

    if (existingError) {
      logCall({
        route: '/api/seo/glossary/import',
        method: 'POST',
        websiteId: queryParsed.data.websiteId,
        durationMs: Date.now() - startedAt,
        success: false,
        code: 'INTERNAL_ERROR',
      });
      return withNoStoreHeaders(
        apiError('INTERNAL_ERROR', 'Unable to inspect existing glossary entries', 500, existingError.message),
      );
    }

    const existingSet = new Set(
      (existing ?? []).map((r) => `${String(r.locale).toLowerCase()}|${String(r.term).toLowerCase()}`),
    );

    const { error: upsertError } = await admin
      .from('seo_translation_glossary')
      .upsert(payload, { onConflict: 'website_id,locale,term' });

    if (upsertError) {
      logCall({
        route: '/api/seo/glossary/import',
        method: 'POST',
        websiteId: queryParsed.data.websiteId,
        durationMs: Date.now() - startedAt,
        success: false,
        code: 'INTERNAL_ERROR',
      });
      return withNoStoreHeaders(
        apiError('INTERNAL_ERROR', 'Unable to upsert glossary rows', 500, upsertError.message),
      );
    }

    let inserted = 0;
    let updated = 0;
    for (const row of payload) {
      const key = `${row.locale.toLowerCase()}|${row.term.toLowerCase()}`;
      if (existingSet.has(key)) updated++;
      else inserted++;
    }

    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    return withNoStoreHeaders(apiSuccess({ inserted, updated, skipped }));
  } catch (error) {
    logCall({
      route: '/api/seo/glossary/import',
      method: 'POST',
      websiteId: queryParsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: error instanceof SeoApiError ? error.code : 'INTERNAL_ERROR',
    });
    return mapSeoError(error);
  }
}
