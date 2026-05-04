import {
  buildEventId,
  isValidEventId,
  isValidPixelEventId,
  mintPixelEventId,
} from '@/lib/funnel/event-id';

describe('lib/funnel/event-id', () => {
  describe('buildEventId (re-exported sha256 PK builder)', () => {
    it('is deterministic for the same input', async () => {
      const input = {
        reference_code: 'HOME-2504-ABCD',
        event_name: 'waflow_submit' as const,
        occurred_at: new Date('2026-05-03T12:00:00Z'),
      };
      const a = await buildEventId(input);
      const b = await buildEventId(input);
      expect(a).toBe(b);
      expect(isValidEventId(a)).toBe(true);
    });

    it('changes when reference_code changes', async () => {
      const a = await buildEventId({
        reference_code: 'HOME-2504-ABCD',
        event_name: 'waflow_submit',
        occurred_at: new Date('2026-05-03T12:00:00Z'),
      });
      const b = await buildEventId({
        reference_code: 'HOME-2504-WXYZ',
        event_name: 'waflow_submit',
        occurred_at: new Date('2026-05-03T12:00:00Z'),
      });
      expect(a).not.toBe(b);
    });

    it('changes when event_name changes (but stays valid sha256)', async () => {
      const base = {
        reference_code: 'HOME-2504-ABCD',
        occurred_at: new Date('2026-05-03T12:00:00Z'),
      };
      const a = await buildEventId({ ...base, event_name: 'waflow_submit' });
      const b = await buildEventId({ ...base, event_name: 'qualified_lead' });
      expect(a).not.toBe(b);
      expect(isValidEventId(a)).toBe(true);
      expect(isValidEventId(b)).toBe(true);
    });

    it('truncates occurred_at to seconds (sub-second jitter does not change the id)', async () => {
      const a = await buildEventId({
        reference_code: 'HOME-2504-ABCD',
        event_name: 'waflow_submit',
        occurred_at: new Date('2026-05-03T12:00:00.123Z'),
      });
      const b = await buildEventId({
        reference_code: 'HOME-2504-ABCD',
        event_name: 'waflow_submit',
        occurred_at: new Date('2026-05-03T12:00:00.999Z'),
      });
      expect(a).toBe(b);
    });
  });

  describe('mintPixelEventId', () => {
    it('returns a UUIDv4-formatted string', () => {
      const id = mintPixelEventId();
      expect(isValidPixelEventId(id)).toBe(true);
    });

    it('returns distinct values across calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i += 1) ids.add(mintPixelEventId());
      expect(ids.size).toBe(50);
    });
  });

  describe('isValidPixelEventId', () => {
    it('accepts canonical UUIDv4 lowercase + uppercase', () => {
      expect(isValidPixelEventId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidPixelEventId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('rejects non-UUID strings', () => {
      expect(isValidPixelEventId('HOME-2504-ABCD:lead')).toBe(false);
      expect(isValidPixelEventId('not-a-uuid')).toBe(false);
      expect(isValidPixelEventId('')).toBe(false);
    });
  });
});
