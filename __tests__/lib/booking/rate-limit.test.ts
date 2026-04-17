import { extractClientIp } from '@/lib/booking/rate-limit';

describe('extractClientIp', () => {
  it('prefers cf-connecting-ip', () => {
    const headers = new Headers({
      'cf-connecting-ip': '1.2.3.4',
      'x-forwarded-for': '5.6.7.8',
      'x-real-ip': '9.9.9.9',
    });
    expect(extractClientIp(headers)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const headers = new Headers({
      'x-real-ip': '9.9.9.9',
      'x-forwarded-for': '5.6.7.8',
    });
    expect(extractClientIp(headers)).toBe('9.9.9.9');
  });

  it('extracts first ip from x-forwarded-for chain', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' });
    expect(extractClientIp(headers)).toBe('1.1.1.1');
  });

  it('returns "unknown" when no ip header present', () => {
    expect(extractClientIp(new Headers())).toBe('unknown');
  });
});
