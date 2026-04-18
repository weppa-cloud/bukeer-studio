import type { CustomSection } from '@bukeer/website-contract';

export function renumberPositions(sections: CustomSection[]): CustomSection[] {
  return sections
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((section, index) => ({ ...section, position: index }));
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
