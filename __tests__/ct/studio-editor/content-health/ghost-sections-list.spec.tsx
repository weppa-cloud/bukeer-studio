import { test, expect } from '@playwright/experimental-ct-react';
import { GhostSectionsList } from '@/components/admin/content-health/ghost-sections-list';
import type { GhostSection } from '@bukeer/website-contract';

const GHOSTS: GhostSection[] = [
  {
    section: 'highlights',
    label: 'Highlights',
    reason: 'empty',
    cta: { label: 'Agregar highlights', anchor: '#editor-highlights' },
  },
  {
    section: 'video',
    label: 'Video',
    reason: 'empty',
    cta: { label: 'Agregar URL del video', anchor: '#editor-video' },
  },
  {
    section: 'gallery',
    label: 'Galería',
    reason: 'threshold_not_met',
    cta: null,
  },
];

test.describe('<GhostSectionsList>', () => {
  test('empty — mensaje de éxito', async ({ mount }) => {
    const c = await mount(<GhostSectionsList ghosts={[]} productEditorBasePath="/dashboard/w/products/x/content" />);
    await expect(c).toContainText(/todas las secciones tienen contenido/i);
  });

  test('filled — lista + CTAs', async ({ mount }) => {
    const c = await mount(
      <GhostSectionsList ghosts={GHOSTS} productEditorBasePath="/dashboard/w/products/x/content" />,
    );
    await expect(c.getByRole('listitem')).toHaveCount(3);
    await expect(c.getByRole('link', { name: /agregar highlights/i })).toHaveAttribute(
      'href',
      '/dashboard/w/products/x/content#editor-highlights',
    );
  });

  test('ghost sin cta — no muestra link', async ({ mount }) => {
    const c = await mount(
      <GhostSectionsList ghosts={[GHOSTS[2]]} productEditorBasePath="/dashboard/w/products/x/content" />,
    );
    await expect(c.getByRole('link')).toHaveCount(0);
  });

  test('visual — empty', async ({ mount }) => {
    const c = await mount(<GhostSectionsList ghosts={[]} productEditorBasePath="/dashboard/w/products/x/content" />);
    await expect(c).toHaveScreenshot('ghost-sections-list-empty.png');
  });

  test('visual — filled', async ({ mount }) => {
    const c = await mount(
      <GhostSectionsList ghosts={GHOSTS} productEditorBasePath="/dashboard/w/products/x/content" />,
    );
    await expect(c).toHaveScreenshot('ghost-sections-list-filled.png');
  });
});
