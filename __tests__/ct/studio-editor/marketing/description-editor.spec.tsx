import { test, expect } from '@playwright/experimental-ct-react';
import { DescriptionEditor } from '@/components/admin/marketing/description-editor';

test.describe('<DescriptionEditor>', () => {
  test('readOnly — shows solo lectura alert', async ({ mount }) => {
    const c = await mount(
      <DescriptionEditor
        productId="p-1"
        value="Paquete con experiencias locales auténticas y naturaleza diversa."
        readOnly
      />,
    );
    await expect(c).toContainText(/solo lectura/i);
    await expect(c.getByRole('textbox')).toHaveCount(0);
  });

  test('aiGenerated — shows IA badge', async ({ mount }) => {
    const c = await mount(
      <DescriptionEditor productId="p-1" value={'x'.repeat(100)} aiGenerated />,
    );
    await expect(c.getByLabel(/generada por ia/i)).toBeVisible();
  });

  test('below recommended length — shows warning', async ({ mount }) => {
    const c = await mount(<DescriptionEditor productId="p-1" value={null} />);
    await c.getByLabel(/contenido/i).fill('short');
    await expect(c).toContainText(/bajo el recomendado/i);
  });

  test('save button calls onSave with trimmed value', async ({ mount }) => {
    let captured: string | null | undefined;
    const c = await mount(
      <DescriptionEditor
        productId="p-1"
        value={null}
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    await c.getByLabel(/contenido/i).fill('  hola mundo  ');
    await c.getByRole('button', { name: /guardar/i }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured).toBe('hola mundo');
  });

  test('has data-testid for Playwright smoke', async ({ mount }) => {
    const c = await mount(<DescriptionEditor productId="p-1" value="x" />);
    await expect(c).toHaveAttribute('data-testid', 'marketing-editor-description');
  });

  test('visual — empty state', async ({ mount }) => {
    const c = await mount(<DescriptionEditor productId="p-1" value={null} />);
    await expect(c).toHaveScreenshot('description-editor-empty.png');
  });

  test('visual — filled with AI badge', async ({ mount }) => {
    const c = await mount(
      <DescriptionEditor
        productId="p-1"
        value={'Paquete multidestino con experiencias únicas y naturaleza.'.repeat(3)}
        aiGenerated
      />,
    );
    await expect(c).toHaveScreenshot('description-editor-filled-ai.png');
  });

  test('visual — readOnly', async ({ mount }) => {
    const c = await mount(
      <DescriptionEditor
        productId="p-1"
        value="Paquete Colombia 15 días — destinos, itinerario y experiencias únicas."
        readOnly
      />,
    );
    await expect(c).toHaveScreenshot('description-editor-readonly.png');
  });
});
