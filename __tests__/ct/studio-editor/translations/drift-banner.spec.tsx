import { test, expect } from '@playwright/experimental-ct-react';
import { DriftBanner } from '@/components/admin/drift-banner';

test.describe('<DriftBanner>', () => {
  test('renders "Sin drift" when count is 0', async ({ mount }) => {
    const c = await mount(<DriftBanner count={0} active={false} onToggle={() => undefined} />);
    await expect(c).toContainText('Sin drift detectado');
    const button = c.getByRole('button', { name: /Filtrar drift/i });
    await expect(button).toBeDisabled();
  });

  test('pluralizes count > 1', async ({ mount }) => {
    const c = await mount(<DriftBanner count={3} active={false} onToggle={() => undefined} />);
    await expect(c).toContainText('3 posts con posible drift');
  });

  test('active state flips button label + variant', async ({ mount }) => {
    const c = await mount(<DriftBanner count={5} active onToggle={() => undefined} />);
    await expect(c.getByRole('button', { name: /Quitar filtro drift/i })).toBeVisible();
  });

  test('onToggle is invoked on click', async ({ mount }) => {
    let toggled = 0;
    const c = await mount(
      <DriftBanner count={2} active={false} onToggle={() => (toggled += 1)} />,
    );
    await c.getByRole('button', { name: /Filtrar drift/i }).click();
    expect(toggled).toBe(1);
  });

  test('visual — no drift', async ({ mount }) => {
    const c = await mount(<DriftBanner count={0} active={false} onToggle={() => undefined} />);
    await expect(c).toHaveScreenshot('drift-banner-empty.png');
  });

  test('visual — active filter', async ({ mount }) => {
    const c = await mount(<DriftBanner count={7} active onToggle={() => undefined} />);
    await expect(c).toHaveScreenshot('drift-banner-active.png');
  });
});
