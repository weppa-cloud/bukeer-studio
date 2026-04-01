import type { NavigationItem } from '@bukeer/website-contract';

/**
 * Build a 1-level tree from flat navigation items.
 * Items with parent_slug are nested under their parent as children.
 */
export function buildNavTree(items: NavigationItem[]): NavigationItem[] {
  const bySlug = new Map<string, NavigationItem & { children: NavigationItem[] }>();

  // Initialize all items with empty children
  for (const item of items) {
    bySlug.set(item.slug, { ...item, children: [] });
  }

  const roots: NavigationItem[] = [];

  for (const item of items) {
    const node = bySlug.get(item.slug)!;
    if (item.parent_slug && bySlug.has(item.parent_slug)) {
      bySlug.get(item.parent_slug)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Default navigation fallback when no pages are configured.
 * Generates links from enabled website sections.
 */
export function getDefaultNavigation(
  sections: Array<{ section_type: string; is_enabled: boolean }> | undefined,
  basePath: string,
): NavigationItem[] {
  const nav: NavigationItem[] = [
    { slug: '', label: 'Inicio', page_type: 'custom', href: `${basePath}/`, target: '_self' },
  ];

  const sectionMap: Array<{ type: string; label: string; anchor: string }> = [
    { type: 'destinations', label: 'Destinos', anchor: 'destinations' },
    { type: 'packages', label: 'Paquetes', anchor: 'packages' },
    { type: 'activities', label: 'Experiencias', anchor: 'activities' },
  ];

  for (const s of sectionMap) {
    if (sections?.some((sec) => sec.section_type === s.type && sec.is_enabled)) {
      nav.push({
        slug: s.anchor,
        label: s.label,
        page_type: 'anchor',
        href: `${basePath}/#${s.anchor}`,
        target: '_self',
      });
    }
  }

  // Blog is always available
  nav.push({ slug: 'blog', label: 'Blog', page_type: 'custom', href: `${basePath}/blog`, target: '_self' });

  if (sections?.some((sec) => sec.section_type === 'contact' && sec.is_enabled)) {
    nav.push({ slug: 'contact', label: 'Contacto', page_type: 'anchor', href: `${basePath}/#contact`, target: '_self' });
  }

  return nav;
}

/**
 * Resolve href for a navigation item relative to basePath.
 */
export function resolveNavHref(item: NavigationItem, basePath: string): string {
  if (item.href) return item.href;
  if (item.page_type === 'anchor') return `${basePath}/#${item.slug}`;
  if (item.page_type === 'external') return item.slug;
  return `${basePath}/${item.slug}`;
}
