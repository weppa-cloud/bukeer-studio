import { test, expect } from '@playwright/experimental-ct-react';
import { ContentHealthScore } from '@/components/admin/content-health/score';

test.describe('<ContentHealthScore>', () => {
  test('green — score 90', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={90} />);
    await expect(c).toHaveAttribute('data-color', 'green');
    await expect(c).toContainText('90');
  });

  test('yellow — score 65', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={65} />);
    await expect(c).toHaveAttribute('data-color', 'yellow');
  });

  test('red — score 30', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={30} />);
    await expect(c).toHaveAttribute('data-color', 'red');
  });

  test('inline variant — renders compact', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={72} variant="inline" ghostsCount={3} />);
    await expect(c).toContainText('72/100');
    await expect(c).toContainText('3 vacías');
  });

  test('aria label', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={50} />);
    await expect(c).toHaveAttribute('aria-label', 'Puntaje de contenido: 50 sobre 100');
  });

  test('visual — circular green', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={95} ghostsCount={0} />);
    await expect(c).toHaveScreenshot('score-green.png');
  });

  test('visual — circular yellow', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={65} ghostsCount={2} />);
    await expect(c).toHaveScreenshot('score-yellow.png');
  });

  test('visual — circular red', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={25} ghostsCount={8} />);
    await expect(c).toHaveScreenshot('score-red.png');
  });

  test('visual — inline', async ({ mount }) => {
    const c = await mount(<ContentHealthScore score={72} variant="inline" ghostsCount={3} />);
    await expect(c).toHaveScreenshot('score-inline.png');
  });
});
