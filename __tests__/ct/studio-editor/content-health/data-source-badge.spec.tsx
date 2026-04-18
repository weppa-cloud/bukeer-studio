import { test, expect } from '@playwright/experimental-ct-react';
import { DataSourceBadge } from '@/components/admin/content-health/data-source-badge';

test.describe('<DataSourceBadge>', () => {
  test('flutter — label visible', async ({ mount }) => {
    const c = await mount(<DataSourceBadge source="flutter" />);
    await expect(c).toHaveAttribute('data-source', 'flutter');
    await expect(c).toContainText('Flutter');
  });

  test('ai — label IA', async ({ mount }) => {
    const c = await mount(<DataSourceBadge source="ai" />);
    await expect(c).toContainText('IA');
  });

  test('compact — hides label', async ({ mount }) => {
    const c = await mount(<DataSourceBadge source="studio" compact />);
    await expect(c).not.toContainText('Studio');
  });

  test('aria label correcto', async ({ mount }) => {
    const c = await mount(<DataSourceBadge source="google" />);
    await expect(c).toHaveAttribute('aria-label', 'Fuente: Google');
  });

  test('visual — all sources', async ({ mount }) => {
    const c = await mount(
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 12 }}>
        <DataSourceBadge source="flutter" />
        <DataSourceBadge source="studio" />
        <DataSourceBadge source="ai" />
        <DataSourceBadge source="aggregation" />
        <DataSourceBadge source="computed" />
        <DataSourceBadge source="google" />
        <DataSourceBadge source="hardcoded" />
      </div>,
    );
    await expect(c).toHaveScreenshot('data-source-badge-all.png');
  });
});
