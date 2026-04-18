import { test, expect } from '@playwright/experimental-ct-react';
import { RecommendationsEditor } from '@/components/admin/marketing/recommendations-editor';

test.describe('<RecommendationsEditor>', () => {
  test('readOnly — shows solo lectura alert', async ({ mount }) => {
    const c = await mount(
      <RecommendationsEditor productId="p-1" value="Lleva bloqueador" readOnly />,
    );
    await expect(c).toContainText(/solo lectura/i);
    await expect(c).toContainText('Lleva bloqueador');
    await expect(c.getByRole('textbox')).toHaveCount(0);
  });

  test('save calls onSave with trimmed value', async ({ mount }) => {
    let captured: string | null | undefined;
    const c = await mount(
      <RecommendationsEditor
        productId="p-1"
        value={null}
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    await c.getByLabel(/contenido/i).fill('  Lleva cámara  ');
    await c.getByRole('button', { name: /guardar/i }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured).toBe('Lleva cámara');
  });

  test('empty save → null', async ({ mount }) => {
    let captured: string | null | undefined = 'sentinel';
    const c = await mount(
      <RecommendationsEditor
        productId="p-1"
        value="texto"
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    await c.getByLabel(/contenido/i).fill('');
    await c.getByRole('button', { name: /guardar/i }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured).toBeNull();
  });

  test('save button disabled when unchanged', async ({ mount }) => {
    const c = await mount(
      <RecommendationsEditor productId="p-1" value="texto" onSave={async () => {}} />,
    );
    await expect(c.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  test('has data-testid for Playwright smoke', async ({ mount }) => {
    const c = await mount(<RecommendationsEditor productId="p-1" value="x" />);
    await expect(c).toHaveAttribute('data-testid', 'marketing-editor-recommendations');
  });

  test('visual — empty state', async ({ mount }) => {
    const c = await mount(<RecommendationsEditor productId="p-1" value={null} />);
    await expect(c).toHaveScreenshot('recommendations-editor-empty.png');
  });

  test('visual — filled', async ({ mount }) => {
    const c = await mount(
      <RecommendationsEditor
        productId="p-1"
        value="Lleva ropa cómoda, bloqueador solar y cámara."
      />,
    );
    await expect(c).toHaveScreenshot('recommendations-editor-filled.png');
  });

  test('visual — readOnly', async ({ mount }) => {
    const c = await mount(
      <RecommendationsEditor productId="p-1" value="Lleva cámara y bloqueador." readOnly />,
    );
    await expect(c).toHaveScreenshot('recommendations-editor-readonly.png');
  });
});
