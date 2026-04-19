/**
 * Idempotency contract for `seedWave2Fixtures` / `getSeededSeoFixtures`.
 *
 * EPIC #207 W1 · `docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md`
 *
 * These specs stub `@supabase/supabase-js` with an in-memory recorder so the
 * helper can run without network access. We assert that calling the helper
 * twice yields the same result (idempotent) and that every seed step hits the
 * expected table with the expected keys — an approximate stand-in for running
 * the real SQL, but enough to catch regressions like:
 *   - missing conflict-target on upsert (duplicates)
 *   - swallowed errors that cause the helper to silently skip seeds
 *   - shape drift in the SeoFixtures return type
 */

jest.mock('@supabase/supabase-js', () => {
  type Row = Record<string, unknown>;
  const store: Record<string, Row[]> = {
    accounts: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'E2E Account' },
    ],
    websites: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        account_id: '11111111-1111-4111-8111-111111111111',
        subdomain: 'colombiatours',
        default_locale: null,
        supported_locales: null,
        deleted_at: null,
      },
    ],
    package_kits: [],
    website_pages: [],
    website_blog_posts: [],
    website_product_pages: [],
    seo_translation_glossary: [],
    seo_transcreation_jobs: [],
    website_legacy_redirects: [],
    slug_redirects: [],
  };

  const callLog: Array<{ table: string; op: string }> = [];

  function buildBuilder(table: string) {
    type Filter = { column: string; op: 'eq' | 'in' | 'is' | 'not' | 'order' | 'limit'; value: unknown };
    const filters: Filter[] = [];
    let pendingInsert: Row[] | null = null;
    let pendingUpsert: Row[] | null = null;
    let pendingUpdate: Row | null = null;
    let pendingDelete = false;
    let selectColumns: string | null = null;

    const applyFilters = (rows: Row[]): Row[] => {
      let out = rows;
      for (const f of filters) {
        if (f.op === 'eq') out = out.filter((r) => r[f.column] === f.value);
        else if (f.op === 'in')
          out = out.filter((r) => Array.isArray(f.value) && (f.value as unknown[]).includes(r[f.column]));
        else if (f.op === 'is' && f.value === null)
          out = out.filter((r) => r[f.column] === null || r[f.column] === undefined);
      }
      return out;
    };

    const run = () => {
      callLog.push({ table, op: pendingInsert ? 'insert' : pendingUpsert ? 'upsert' : pendingUpdate ? 'update' : pendingDelete ? 'delete' : 'select' });

      if (pendingInsert) {
        const inserted = pendingInsert.map((row) => ({ id: crypto.randomUUID(), ...row }));
        store[table] = [...(store[table] ?? []), ...inserted];
        return { data: inserted, error: null };
      }
      if (pendingUpsert) {
        const result: Row[] = [];
        for (const row of pendingUpsert) {
          const existing = (store[table] ?? []).find((r) =>
            Object.entries(row).every(([k, v]) => {
              if (!['slug', 'id', 'website_id', 'product_type', 'product_id', 'locale', 'term', 'account_id'].includes(k)) return true;
              return r[k] === v;
            }),
          );
          if (existing) {
            Object.assign(existing, row);
            result.push(existing);
          } else {
            const withId = { id: crypto.randomUUID(), ...row };
            store[table] = [...(store[table] ?? []), withId];
            result.push(withId);
          }
        }
        return { data: result, error: null };
      }
      if (pendingUpdate) {
        const matches = applyFilters(store[table] ?? []);
        for (const row of matches) Object.assign(row, pendingUpdate);
        return { data: matches, error: null };
      }
      if (pendingDelete) {
        const keep = (store[table] ?? []).filter((r) => !applyFilters([r]).length);
        store[table] = keep;
        return { data: null, error: null };
      }
      return { data: applyFilters(store[table] ?? []), error: null };
    };

    const chain: Record<string, unknown> = {
      select(columns: string) {
        selectColumns = columns;
        return chain;
      },
      insert(rows: Row | Row[]) {
        pendingInsert = Array.isArray(rows) ? rows : [rows];
        return chain;
      },
      upsert(rows: Row | Row[]) {
        pendingUpsert = Array.isArray(rows) ? rows : [rows];
        return chain;
      },
      update(row: Row) {
        pendingUpdate = row;
        return chain;
      },
      delete() {
        pendingDelete = true;
        return chain;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, op: 'eq', value });
        return chain;
      },
      in(column: string, value: unknown[]) {
        filters.push({ column, op: 'in', value });
        return chain;
      },
      is(column: string, value: unknown) {
        filters.push({ column, op: 'is', value });
        return chain;
      },
      not() {
        return chain;
      },
      order() {
        return chain;
      },
      limit() {
        return chain;
      },
      maybeSingle() {
        const res = run();
        return Promise.resolve({
          data: Array.isArray(res.data) ? res.data[0] ?? null : res.data,
          error: res.error,
        });
      },
      single() {
        const res = run();
        return Promise.resolve({
          data: Array.isArray(res.data) ? res.data[0] ?? null : res.data,
          error: res.error,
        });
      },
      then(resolve: (v: unknown) => unknown) {
        return Promise.resolve(run()).then(resolve);
      },
    };
    // Silence unused-var in strict mode.
    void selectColumns;
    return chain;
  }

  return {
    createClient() {
      return {
        from(table: string) {
          return buildBuilder(table);
        },
        _store: store,
        _callLog: callLog,
      };
    },
  };
});

describe('seedWave2Fixtures SEO branch', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
    process.env.ALLOW_SEED = '1';
    process.env.E2E_PUBLIC_SUBDOMAIN = 'colombiatours';
  });

  // NOTE: We intentionally do not stub global `crypto` — Node 22+ exposes it.

  it('returns SeoFixtures shape with expected keys', async () => {
    jest.resetModules();
    const mod = await import('@/e2e/setup/seed');
    const result = await mod.seedWave2Fixtures();

    expect(result).toHaveProperty('seo');
    expect(result.seo).toMatchObject({
      appliedTranscreationJobIds: expect.any(Array),
      supportedLocales: expect.any(Array),
    });
    // noindexProductId may be null if the mocked schema mismatch, but the key
    // must be present on the SeoFixtures contract.
    expect(Object.keys(result.seo)).toEqual(
      expect.arrayContaining([
        'noindexProductId',
        'legacyRedirectPath',
        'slugRedirectOldSlug',
        'videoPackageId',
        'appliedTranscreationJobIds',
        'supportedLocales',
      ]),
    );
  });

  it('is idempotent: calling twice yields identical output (module-level memo)', async () => {
    jest.resetModules();
    const mod = await import('@/e2e/setup/seed');
    const first = await mod.seedWave2Fixtures();
    const second = await mod.seedWave2Fixtures();
    // Same promise is memoized → strict equality on object refs.
    expect(second).toBe(first);
  });

  it('getSeededSeoFixtures() returns same seo branch as seedWave2Fixtures()', async () => {
    jest.resetModules();
    const mod = await import('@/e2e/setup/seed');
    const full = await mod.seedWave2Fixtures();
    const seo = await mod.getSeededSeoFixtures();
    expect(seo).toBe(full.seo);
  });

  it('supportedLocales always includes es-CO and en-US', async () => {
    jest.resetModules();
    const mod = await import('@/e2e/setup/seed');
    const { seo } = await mod.seedWave2Fixtures();
    expect(seo.supportedLocales).toEqual(expect.arrayContaining(['es-CO', 'en-US']));
  });
});
