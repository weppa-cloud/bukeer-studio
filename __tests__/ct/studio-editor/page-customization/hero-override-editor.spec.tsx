import { test, expect } from '@playwright/experimental-ct-react';
import { HeroOverrideEditor, type HeroOverrideValue } from '@/components/admin/page-customization/hero-override-editor';

const EMPTY: HeroOverrideValue = { title: null, subtitle: null, backgroundImage: null };
const FILLED: HeroOverrideValue = {
  title: 'Tour Personalizado',
  subtitle: 'Sólo para esta landing',
  backgroundImage: 'https://picsum.photos/seed/hero/1200/400',
};

test.describe('<HeroOverrideEditor>', () => {
  test('empty — toggle desactivado, form oculto', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor productId="p-1" value={EMPTY} />);
    await expect(c.getByRole('button', { name: /personalizar hero/i })).toHaveAttribute('aria-pressed', 'false');
    await expect(c.getByLabel('Título', { exact: true })).toBeHidden();
  });

  test('filled — toggle activo, campos con valores', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor productId="p-1" value={FILLED} />);
    await expect(c.getByRole('button', { name: /personalizar hero/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByLabel('Título', { exact: true })).toHaveValue('Tour Personalizado');
    await expect(c.getByLabel('Subtítulo')).toHaveValue('Sólo para esta landing');
  });

  test('readOnly — muestra banner', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor productId="p-1" value={FILLED} readOnly />);
    await expect(c.getByRole('alert')).toContainText(/solo lectura/i);
  });

  // NOTE: error state exercised via E2E integration test (Phase 0.5 dashboard).
  // Playwright CT serializes function props via RPC — throwing in onSave closes
  // the worker. Component-level coverage: readOnly + empty + filled + visual.

  test('visual — empty', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor productId="p-1" value={EMPTY} />);
    await expect(c).toHaveScreenshot('hero-override-editor-empty.png');
  });

  test('visual — filled', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor productId="p-1" value={FILLED} />);
    await expect(c).toHaveScreenshot('hero-override-editor-filled.png');
  });

  test('visual — readOnly', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor productId="p-1" value={FILLED} readOnly />);
    await expect(c).toHaveScreenshot('hero-override-editor-readonly.png');
  });
});
