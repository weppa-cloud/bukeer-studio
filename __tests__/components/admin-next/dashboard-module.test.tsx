import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardModule } from '@/components/admin-next/dashboard-module';
import { dashboardFixture } from '@/lib/admin-next/fixtures/dashboard';

describe('DashboardModule', () => {
  it('renders dashboard panels with agent test ids and Evolucion preset metadata', () => {
    const markup = renderToStaticMarkup(
      createElement(DashboardModule, {
        session: {
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
        },
        fixture: dashboardFixture,
        evolucionTheme: {
          presetSlug: 'evolucion',
          styles: {
            light: {
              '--bukeer-surface-rail': 'var(--surface-container-lowest)',
            } as React.CSSProperties,
            dark: {},
          },
        },
      }),
    );

    expect(markup).toContain('data-testid="admin-next-dashboard-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-testid="admin-next-dashboard-sales-chart"');
    expect(markup).toContain('data-testid="admin-next-dashboard-ai-panel"');
    expect(markup).toContain(
      'href="/admin/reports?report=receivables&amp;range=30d&amp;min=500000&amp;max=15000000"',
    );
    expect(markup).toContain('href="/admin/reports?report=sales-intelligence&amp;range=90d"');
    expect(markup).toContain('href="/admin/reports?report=sales&amp;range=30d"');
    expect(markup).toContain('Ventas del mes');
    expect(markup).toContain('Cuentas por cobrar proximas');
  });
});
