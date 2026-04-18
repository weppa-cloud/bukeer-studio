import { renumberPositions, moveItem } from '@/components/admin/page-customization/renumber-positions';
import type { CustomSection } from '@bukeer/website-contract';

function makeText(id: string, position: number): CustomSection {
  return {
    id,
    position,
    type: 'text',
    content: { html: `<p>${id}</p>` },
  };
}

describe('renumberPositions', () => {
  it('keeps order but renumbers from 0', () => {
    const input = [makeText('a', 5), makeText('b', 10), makeText('c', 15)];
    const output = renumberPositions(input);
    expect(output.map((s) => [s.id, s.position])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ]);
  });

  it('resolves collisions by sorting by position first then renumbering', () => {
    const input = [makeText('a', 3), makeText('b', 3), makeText('c', 1)];
    const output = renumberPositions(input);
    expect(output[0].id).toBe('c');
    expect(output.map((s) => s.position)).toEqual([0, 1, 2]);
  });

  it('handles empty array', () => {
    expect(renumberPositions([])).toEqual([]);
  });

  it('does not mutate input', () => {
    const input = [makeText('a', 5)];
    renumberPositions(input);
    expect(input[0].position).toBe(5);
  });
});

describe('moveItem', () => {
  it('moves item forward', () => {
    expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
  });

  it('moves item backward', () => {
    expect(moveItem([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });

  it('returns same array if from === to', () => {
    const input = [1, 2, 3];
    expect(moveItem(input, 1, 1)).toEqual([1, 2, 3]);
  });

  it('returns same array if out of bounds', () => {
    const input = [1, 2, 3];
    expect(moveItem(input, -1, 2)).toEqual([1, 2, 3]);
    expect(moveItem(input, 0, 99)).toEqual([1, 2, 3]);
  });
});
