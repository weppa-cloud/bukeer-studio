import { test, expect } from '@playwright/experimental-ct-react';
import { HighlightsEditor } from '@/components/admin/marketing/highlights-editor';

test.describe('<HighlightsEditor>', () => {
  test('readOnly — shows solo lectura alert', async ({ mount }) => {
    const c = await mount(
      <HighlightsEditor productId="p-1" value={['uno', 'dos']} readOnly />,
    );
    await expect(c).toContainText(/solo lectura/i);
    await expect(c.getByRole('textbox')).toHaveCount(0);
    await expect(c).toContainText('uno');
    await expect(c).toContainText('dos');
  });

  test('aiGenerated — shows IA badge', async ({ mount }) => {
    const c = await mount(
      <HighlightsEditor productId="p-1" value={['uno']} aiGenerated />,
    );
    await expect(c.getByLabel(/generados por ia/i)).toBeVisible();
  });

  test('add item — respects max 12', async ({ mount }) => {
    const filled = Array.from({ length: 12 }, (_, i) => `h${i}`);
    const c = await mount(<HighlightsEditor productId="p-1" value={filled} />);
    await expect(c.getByRole('button', { name: /agregar highlight/i })).toBeDisabled();
  });

  test('save button calls onSave with trimmed + cleaned array', async ({ mount }) => {
    let captured: string[] | undefined;
    const c = await mount(
      <HighlightsEditor
        productId="p-1"
        value={[]}
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    await c.getByRole('button', { name: /agregar highlight/i }).click();
    await c.getByLabel('Highlight 1').fill('  primero  ');
    await c.getByRole('button', { name: /agregar highlight/i }).click();
    await c.getByLabel('Highlight 2').fill('segundo');
    await c.getByRole('button', { name: 'Guardar' }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured).toEqual(['primero', 'segundo']);
  });

  test('has data-testid for Playwright smoke', async ({ mount }) => {
    const c = await mount(<HighlightsEditor productId="p-1" value={['x']} />);
    await expect(c).toHaveAttribute('data-testid', 'marketing-editor-highlights');
  });

  test('visual — empty state', async ({ mount }) => {
    const c = await mount(<HighlightsEditor productId="p-1" value={[]} />);
    await expect(c).toHaveScreenshot('highlights-editor-empty.png');
  });

  test('visual — filled with AI badge', async ({ mount }) => {
    const c = await mount(
      <HighlightsEditor
        productId="p-1"
        value={['Destinos únicos', 'Guía bilingüe', 'Naturaleza increíble']}
        aiGenerated
      />,
    );
    await expect(c).toHaveScreenshot('highlights-editor-filled-ai.png');
  });

  test('visual — readOnly', async ({ mount }) => {
    const c = await mount(
      <HighlightsEditor productId="p-1" value={['Uno', 'Dos']} readOnly />,
    );
    await expect(c).toHaveScreenshot('highlights-editor-readonly.png');
  });
});
