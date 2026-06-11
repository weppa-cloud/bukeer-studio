import { renderToStaticMarkup } from 'react-dom/server';
import { ReportsModule } from '@/components/admin-next/reports-module';
import { reportsFixture } from '@/lib/admin-next/fixtures/reports';

const replace = jest.fn();
const mockSearchParams = new URLSearchParams(
  'report=receivables&range=30d&min=500000&max=15000000',
);

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/reports',
  useRouter: () => ({ replace }),
  useSearchParams: () => mockSearchParams,
}));

describe('ReportsModule', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('renders seven report surfaces with Evolucion preset metadata and URL state', () => {
    const markup = renderToStaticMarkup(
      <ReportsModule
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
        fixture={reportsFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-reports-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-active-report="receivables"');
    expect(markup).toContain('data-active-range="30d"');
    expect(markup).toContain('data-price-min="500000"');
    expect(markup).toContain('data-price-max="15000000"');
    expect(markup.match(/data-testid="admin-next-report-tab-/g)).toHaveLength(7);
    expect(markup).toContain('data-testid="admin-next-reports-filters"');
    expect(markup).toContain('data-testid="admin-next-reports-detail"');
    expect(markup).toContain('data-testid="admin-next-reports-ai-panel"');
    expect(markup).toContain('Cuentas por cobrar');
  });
});
