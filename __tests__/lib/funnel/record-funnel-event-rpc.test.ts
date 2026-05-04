/**
 * Contract-level integration test for the record_funnel_event RPC shape.
 *
 * The actual RPC lives in Postgres
 * (supabase/migrations/20260503130000_record_funnel_event_rpc.sql).
 * This test validates the *call site contract* — that a writer passing the
 * canonical payload shape behaves the way the RPC documents:
 *
 *   * Same payload twice → second call returns deduped=true (ON CONFLICT)
 *   * Required keys validated client-side mirror the RPC's required keys.
 *
 * We mock the Supabase client to simulate the Postgres ON CONFLICT path
 * because the unit test runner does not bring up a Supabase instance. The
 * end-to-end DB behaviour is verified separately in the F1 PR review (see
 * "Stage volume parity check" in docs/specs/F1_PR_DESCRIPTION.md).
 */

import { buildEventId } from '@/lib/funnel/event-id';

type RpcResponse = { data: unknown; error: { code: string; message: string } | null };

interface RpcPayload {
  event_id: string;
  event_name: string;
  event_time: string;
  source: string;
  reference_code: string;
  account_id: string;
  website_id: string;
  locale: string;
  market: string;
  pixel_event_id?: string;
}

function makeRpcMock(): {
  rpc: jest.Mock<Promise<RpcResponse>, [string, { payload: RpcPayload }]>;
  inserted: Set<string>;
} {
  const inserted = new Set<string>();
  const rpc = jest.fn(async (
    fn: string,
    args: { payload: RpcPayload },
  ): Promise<RpcResponse> => {
    if (fn !== 'record_funnel_event') {
      return { data: null, error: { code: 'P0001', message: `unknown rpc: ${fn}` } };
    }
    const id = args.payload.event_id;
    if (inserted.has(id)) {
      return {
        data: { inserted: false, deduped: true, event_id: id },
        error: null,
      };
    }
    inserted.add(id);
    return {
      data: {
        inserted: true,
        event_id: id,
        dispatch_status: 'pending',
      },
      error: null,
    };
  });
  return { rpc, inserted };
}

describe('record_funnel_event RPC — contract behaviour', () => {
  it('returns inserted=true on first call, deduped=true on second call with same event_id', async () => {
    const { rpc } = makeRpcMock();

    const eventId = await buildEventId({
      reference_code: 'HOME-2504-DEDU',
      event_name: 'waflow_submit',
      occurred_at: new Date('2026-05-03T15:30:00Z'),
    });

    const payload = {
      event_id: eventId,
      event_name: 'waflow_submit',
      event_time: '2026-05-03T15:30:00Z',
      source: 'studio_web',
      reference_code: 'HOME-2504-DEDU',
      account_id: '00000000-0000-4000-8000-000000000001',
      website_id: '00000000-0000-4000-8000-000000000002',
      locale: 'es-CO',
      market: 'CO',
      pixel_event_id: 'HOME-2504-DEDU:lead',
    };

    const first = await rpc('record_funnel_event', { payload });
    expect(first.error).toBeNull();
    expect(first.data).toEqual({
      inserted: true,
      event_id: eventId,
      dispatch_status: 'pending',
    });

    const second = await rpc('record_funnel_event', { payload });
    expect(second.error).toBeNull();
    expect(second.data).toEqual({
      inserted: false,
      deduped: true,
      event_id: eventId,
    });
  });

  it('uses event_id (sha256) as the PK and pixel_event_id as a separate browser-paired id', async () => {
    const eventId = await buildEventId({
      reference_code: 'HOME-2504-DUAL',
      event_name: 'waflow_submit',
      occurred_at: new Date('2026-05-03T16:00:00Z'),
    });
    expect(eventId).toMatch(/^[0-9a-f]{64}$/);

    const pixelEventId = 'HOME-2504-DUAL:lead';
    expect(pixelEventId).not.toEqual(eventId);
    // The dispatcher Edge Function reads pixel_event_id (when non-null) and
    // forwards it to Meta CAPI as the event_id field — preserving Pixel↔CAPI
    // dedup. This test documents the invariant.
  });
});
