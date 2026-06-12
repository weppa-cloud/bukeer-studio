import { renderToStaticMarkup } from 'react-dom/server';
import { PaymentsModule } from '@/components/admin-next/payments-module';
import { paymentsFixture } from '@/lib/admin-next/fixtures/payments';

const replace = jest.fn();
const mockSearchParams = new URLSearchParams('method=card&batch=collect');

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/payments',
  useRouter: () => ({ replace }),
  useSearchParams: () => mockSearchParams,
}));

describe('PaymentsModule', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('renders treasury surfaces with Evolucion metadata and Stripe fee state', () => {
    const markup = renderToStaticMarkup(
      <PaymentsModule
        session={{
          status: 'authenticated',
          userId: 'user-1',
          email: 'treasury@bukeer.test',
          accountId: 'account-1',
          role: 'accounting',
          displayName: 'Treasury One',
          permissions: ['admin_next.view', 'payments.manage'],
          flags: {
            adminNextPrototype: true,
          },
        }}
        fixture={paymentsFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-payments-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-active-method="card"');
    expect(markup).toContain('data-active-batch="collect"');
    expect(markup).toContain('data-stripe-mode="test"');
    expect(markup).toContain('data-base-amount-minor="1000000"');
    expect(markup).toContain('data-fee-amount-minor="32000"');
    expect(markup).toContain('data-total-amount-minor="1032000"');
    expect(markup).toContain('data-fee-included-in-customer-total="true"');
    expect(markup).toContain('data-payments-manage="true"');
    expect(markup).toContain('data-testid="admin-next-payments-kpis"');
    expect(markup).toContain('data-testid="admin-next-payments-collect-batch"');
    expect(markup).toContain('data-testid="admin-next-payments-supplier-batch"');
    expect(markup).toContain('data-testid="admin-next-payments-ai-panel"');
    expect(markup).toContain('Pagos');
  });
});
