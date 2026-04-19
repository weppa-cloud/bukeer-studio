/**
 * W2 #216 AC-W2-5 — integration test for `resolveStudioEditorV2Flag` against
 * a mocked Supabase client. Verifies wiring between the RPC call, the Zod
 * parse of the returned payload, the 3-scope resolution (website > account >
 * default), and defensive fallback when the RPC fails or the payload is
 * malformed.
 *
 * A live-DB integration test is available under the pilot seed fixtures in
 * W4; this spec stays at the unit-integration layer so CI runs offline.
 */

import {
  resolveStudioEditorV2Flag,
  isStudioFieldEnabled,
} from '@/lib/features/studio-editor-v2';
import type { SupabaseClient } from '@supabase/supabase-js';

type RpcPayload = unknown;
type RpcError = { message: string } | null;

function mockSupabaseWithRpc(result: { data: RpcPayload; error: RpcError }): SupabaseClient {
  return {
    rpc: jest.fn(async () => result),
  } as unknown as SupabaseClient;
}

describe('resolveStudioEditorV2Flag', () => {
  const ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
  const WEBSITE_ID = '00000000-0000-0000-0000-000000000002';

  it('returns website-scope resolution when the RPC reports website override', async () => {
    const supabase = mockSupabaseWithRpc({
      data: {
        enabled: true,
        fields: ['description'],
        scope: 'website',
      },
      error: null,
    });

    const resolution = await resolveStudioEditorV2Flag(supabase, ACCOUNT_ID, WEBSITE_ID);
    expect(resolution.enabled).toBe(true);
    expect(resolution.fields).toEqual(['description']);
    expect(resolution.scope).toBe('website');
  });

  it('returns account-scope resolution when website row is absent', async () => {
    const supabase = mockSupabaseWithRpc({
      data: {
        enabled: true,
        fields: [],
        scope: 'account',
      },
      error: null,
    });

    const resolution = await resolveStudioEditorV2Flag(supabase, ACCOUNT_ID, WEBSITE_ID);
    expect(resolution.scope).toBe('account');
    expect(isStudioFieldEnabled(resolution, 'description')).toBe(true);
    // Activities editors hit the same gate — verify a representative activity-targeted field.
    expect(isStudioFieldEnabled(resolution, 'program_gallery')).toBe(true);
  });

  it('returns default resolution when no flag row exists at all', async () => {
    const supabase = mockSupabaseWithRpc({
      data: {
        enabled: false,
        fields: [],
        scope: 'default',
      },
      error: null,
    });

    const resolution = await resolveStudioEditorV2Flag(supabase, ACCOUNT_ID, null);
    expect(resolution.enabled).toBe(false);
    expect(resolution.scope).toBe('default');
    expect(isStudioFieldEnabled(resolution, 'description')).toBe(false);
  });

  it('falls back to safe default when the RPC errors (DB unreachable, permission denied)', async () => {
    const supabase = mockSupabaseWithRpc({
      data: null,
      error: { message: 'permission denied for function resolve_studio_editor_v2' },
    });

    const resolution = await resolveStudioEditorV2Flag(supabase, ACCOUNT_ID, WEBSITE_ID);
    expect(resolution).toEqual({ enabled: false, fields: [], scope: 'default' });
  });

  it('falls back to safe default when the RPC payload is malformed', async () => {
    const supabase = mockSupabaseWithRpc({
      data: { enabled: 'yes', fields: 'description' }, // wrong shapes → Zod parse fails
      error: null,
    });

    const resolution = await resolveStudioEditorV2Flag(supabase, ACCOUNT_ID, WEBSITE_ID);
    expect(resolution).toEqual({ enabled: false, fields: [], scope: 'default' });
  });

  it('per-field whitelist flips Studio ownership for activities + packages alike', async () => {
    const supabase = mockSupabaseWithRpc({
      data: {
        enabled: false,
        fields: ['program_highlights', 'program_gallery'],
        scope: 'website',
      },
      error: null,
    });

    const resolution = await resolveStudioEditorV2Flag(supabase, ACCOUNT_ID, WEBSITE_ID);
    // Studio-owned (regardless of product type):
    expect(isStudioFieldEnabled(resolution, 'program_highlights')).toBe(true);
    expect(isStudioFieldEnabled(resolution, 'program_gallery')).toBe(true);
    // Flutter-owned (not in whitelist):
    expect(isStudioFieldEnabled(resolution, 'description')).toBe(false);
    expect(isStudioFieldEnabled(resolution, 'program_notes')).toBe(false);
  });
});
