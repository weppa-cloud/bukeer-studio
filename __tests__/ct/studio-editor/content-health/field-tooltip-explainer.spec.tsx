import { test, expect } from '@playwright/experimental-ct-react';
import { FieldTooltipExplainer } from '@/components/admin/content-health/field-tooltip-explainer';

test.describe('<FieldTooltipExplainer>', () => {
  test('computed — muestra explicación derivado', async ({ mount }) => {
    const c = await mount(<FieldTooltipExplainer source="computed" fieldLabel="Precio Desde" formula="min(options[].prices)" />);
    await expect(c).toContainText('Precio Desde');
    await expect(c).toContainText(/no editable directo/i);
    await expect(c).toContainText('min(options[].prices)');
  });

  test('ai — muestra mensaje de lock', async ({ mount }) => {
    const c = await mount(<FieldTooltipExplainer source="ai" fieldLabel="Descripción" />);
    await expect(c).toContainText(/generado por ia/i);
  });

  test('role tooltip', async ({ mount }) => {
    const c = await mount(<FieldTooltipExplainer source="flutter" fieldLabel="Nombre" />);
    await expect(c).toHaveAttribute('role', 'tooltip');
  });

  test('visual — computed con fórmula', async ({ mount }) => {
    const c = await mount(<FieldTooltipExplainer source="computed" fieldLabel="Precio Desde" formula="min(options[].prices)" />);
    await expect(c).toHaveScreenshot('field-tooltip-computed.png');
  });
});
