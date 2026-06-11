import { renderToStaticMarkup } from 'react-dom/server';
import { ProductsModule } from '@/components/admin-next/products-module';
import { productsFixture } from '@/lib/admin-next/fixtures/products';

describe('ProductsModule', () => {
  it('renders products panels with agent test ids and Evolucion preset metadata', () => {
    const markup = renderToStaticMarkup(
      <ProductsModule
        session={{
          status: 'authenticated',
          userId: 'user-1',
          email: 'agent@bukeer.test',
          accountId: 'account-1',
          role: 'admin',
          displayName: 'Agent One',
          permissions: ['admin_next.view'],
          flags: {
            adminNextPrototype: true,
          },
        }}
        fixture={productsFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-products-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-testid="admin-next-products-toolbar"');
    expect(markup).toContain('data-testid="admin-next-products-grid"');
    expect(markup).toContain('data-testid="admin-next-products-detail"');
    expect(markup).toContain('data-testid="admin-next-products-gallery"');
    expect(markup).toContain('data-testid="admin-next-products-rates"');
    expect(markup).toContain('data-testid="admin-next-products-ai-panel"');
    expect(markup).toContain('data-testid="admin-next-products-new"');
    expect(markup).toContain('data-testid="admin-next-products-edit"');
    expect(markup).toContain('data-testid="admin-next-products-new-rate"');
    expect(markup).toContain('data-testid="admin-next-products-manage-images"');
    expect(markup).toContain('Hotel Las Islas');
    expect(markup).toContain('Gestionar imagenes');
  });
});
