import { resolveBlogStatus } from '@/lib/seo/blog-status';

describe('resolveBlogStatus', () => {
  it('returns keeper for score >= 70 (never prune)', () => {
    expect(resolveBlogStatus(70)).toBe('keeper');
    expect(resolveBlogStatus(85)).toBe('keeper');
    expect(resolveBlogStatus(100)).toBe('keeper');
  });

  it('returns optimize for score between 40 and 69', () => {
    expect(resolveBlogStatus(40)).toBe('optimize');
    expect(resolveBlogStatus(55)).toBe('optimize');
    expect(resolveBlogStatus(69)).toBe('optimize');
  });

  it('returns prune for score below 40', () => {
    expect(resolveBlogStatus(0)).toBe('prune');
    expect(resolveBlogStatus(39)).toBe('prune');
  });
});
