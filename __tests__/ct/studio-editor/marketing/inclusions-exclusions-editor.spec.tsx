import { test, expect } from '@playwright/experimental-ct-react';
import { InclusionsExclusionsEditor } from '@/components/admin/marketing/inclusions-exclusions-editor';

test.describe('<InclusionsExclusionsEditor>', () => {
  test('readOnly — both sides show solo lectura', async ({ mount }) => {
    const c = await mount(
      <InclusionsExclusionsEditor
        productId="p-1"
        inclusions={['hotel']}
        exclusions={['vuelos']}
        inclusionsReadOnly
        exclusionsReadOnly
      />,
    );
    await expect(c.getByText(/solo lectura/i)).toHaveCount(2);
    await expect(c).toContainText('hotel');
    await expect(c).toContainText('vuelos');
  });

  test('editable — add + save inclusions', async ({ mount }) => {
    let capturedInc: string[] | undefined;
    const c = await mount(
      <InclusionsExclusionsEditor
        productId="p-1"
        inclusions={[]}
        exclusions={[]}
        onSaveInclusions={async (v) => {
          capturedInc = v;
        }}
      />,
    );
    const incSection = c.getByTestId('marketing-editor-inclusions');
    await incSection.getByRole('button', { name: '+ Agregar' }).click();
    await incSection.getByLabel('Qué incluye 1').fill('Desayuno');
    await incSection.getByRole('button', { name: 'Guardar' }).click();
    await expect(incSection.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(capturedInc).toEqual(['Desayuno']);
  });

  test('max 20 respected', async ({ mount }) => {
    const filled = Array.from({ length: 20 }, (_, i) => `inc${i}`);
    const c = await mount(
      <InclusionsExclusionsEditor productId="p-1" inclusions={filled} exclusions={[]} />,
    );
    const incSection = c.getByTestId('marketing-editor-inclusions');
    await expect(incSection.getByRole('button', { name: '+ Agregar' })).toBeDisabled();
  });

  test('has data-testid for Playwright smoke', async ({ mount }) => {
    const c = await mount(
      <InclusionsExclusionsEditor productId="p-1" inclusions={[]} exclusions={[]} />,
    );
    await expect(c).toHaveAttribute('data-testid', 'marketing-editor-inclusions-exclusions');
  });

  test('mixed readOnly — inclusions ro, exclusions editable', async ({ mount }) => {
    const c = await mount(
      <InclusionsExclusionsEditor
        productId="p-1"
        inclusions={['hotel']}
        exclusions={[]}
        inclusionsReadOnly
        onSaveExclusions={async () => {}}
      />,
    );
    const incSection = c.getByTestId('marketing-editor-inclusions');
    const excSection = c.getByTestId('marketing-editor-exclusions');
    await expect(incSection.getByText(/solo lectura/i)).toBeVisible();
    await expect(excSection.getByRole('button', { name: '+ Agregar' })).toBeVisible();
  });

  test('visual — empty editable', async ({ mount }) => {
    const c = await mount(
      <InclusionsExclusionsEditor
        productId="p-1"
        inclusions={[]}
        exclusions={[]}
        onSaveInclusions={async () => {}}
        onSaveExclusions={async () => {}}
      />,
    );
    await expect(c).toHaveScreenshot('inclusions-exclusions-empty.png');
  });

  test('visual — filled editable', async ({ mount }) => {
    const c = await mount(
      <InclusionsExclusionsEditor
        productId="p-1"
        inclusions={['Hotel 4*', 'Desayuno', 'Transporte']}
        exclusions={['Vuelos', 'Propinas']}
        onSaveInclusions={async () => {}}
        onSaveExclusions={async () => {}}
      />,
    );
    await expect(c).toHaveScreenshot('inclusions-exclusions-filled.png');
  });

  test('visual — readOnly', async ({ mount }) => {
    const c = await mount(
      <InclusionsExclusionsEditor
        productId="p-1"
        inclusions={['Hotel', 'Desayuno']}
        exclusions={['Vuelos']}
        inclusionsReadOnly
        exclusionsReadOnly
      />,
    );
    await expect(c).toHaveScreenshot('inclusions-exclusions-readonly.png');
  });
});
