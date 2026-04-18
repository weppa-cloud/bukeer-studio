import { test, expect } from '@playwright/experimental-ct-react';
import { ContentHealthDashboard } from '@/components/admin/content-health/dashboard';
import type { ContentHealthList } from '@bukeer/website-contract';

const EMPTY: ContentHealthList = { items: [], total: 0, limit: 50, offset: 0 };

const FILLED: ContentHealthList = {
  items: [
    {
      product_id: '00000000-0000-0000-0000-000000000001',
      product_name: 'Tour Islas del Rosario',
      product_slug: 'tour-islas-rosario',
      product_type: 'activity',
      score: 45,
      ghosts_count: 6,
      ai_unlocked_count: 0,
      fallbacks_count: 2,
      last_computed_at: '2026-04-17T12:00:00Z',
    },
    {
      product_id: '00000000-0000-0000-0000-000000000002',
      product_name: 'Hotel Casa del Mar',
      product_slug: 'hotel-casa-del-mar',
      product_type: 'hotel',
      score: 85,
      ghosts_count: 1,
      ai_unlocked_count: 0,
      fallbacks_count: 0,
      last_computed_at: '2026-04-17T12:00:00Z',
    },
    {
      product_id: '00000000-0000-0000-0000-000000000003',
      product_name: 'Paquete Caribe 5 días',
      product_slug: 'paquete-caribe-5d',
      product_type: 'package',
      score: 72,
      ghosts_count: 3,
      ai_unlocked_count: 2,
      fallbacks_count: 1,
      last_computed_at: '2026-04-17T12:00:00Z',
    },
  ],
  total: 3,
  limit: 50,
  offset: 0,
};

test.describe('<ContentHealthDashboard>', () => {
  test('empty — mensaje sin productos', async ({ mount }) => {
    const c = await mount(
      <ContentHealthDashboard websiteId="w-1" initial={EMPTY} productBasePath="/dashboard/w-1/products" />,
    );
    await expect(c).toContainText(/no tiene productos/i);
  });

  test('filled — tabla con 3 filas', async ({ mount }) => {
    const c = await mount(
      <ContentHealthDashboard websiteId="w-1" initial={FILLED} productBasePath="/dashboard/w-1/products" />,
    );
    const rows = c.locator('tbody tr');
    await expect(rows).toHaveCount(3);
  });

  test('filled — link apunta a editor de contenido', async ({ mount }) => {
    const c = await mount(
      <ContentHealthDashboard websiteId="w-1" initial={FILLED} productBasePath="/dashboard/w-1/products" />,
    );
    await expect(c.getByRole('link', { name: /tour islas del rosario/i })).toHaveAttribute(
      'href',
      '/dashboard/w-1/products/tour-islas-rosario/content',
    );
  });

  test('visual — empty', async ({ mount }) => {
    const c = await mount(
      <ContentHealthDashboard websiteId="w-1" initial={EMPTY} productBasePath="/dashboard/w-1/products" />,
    );
    await expect(c).toHaveScreenshot('dashboard-empty.png');
  });

  test('visual — filled', async ({ mount }) => {
    const c = await mount(
      <ContentHealthDashboard websiteId="w-1" initial={FILLED} productBasePath="/dashboard/w-1/products" />,
    );
    await expect(c).toHaveScreenshot('dashboard-filled.png');
  });
});
