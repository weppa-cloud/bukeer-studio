import { renderToStaticMarkup } from 'react-dom/server';
import { ItinerariesModule } from '@/components/admin-next/itineraries-module';
import { itinerariesFixture } from '@/lib/admin-next/fixtures/itineraries';

const replace = jest.fn();
const mockSearchParams = new URLSearchParams();

function setMockSearchParams(value: string) {
  Array.from(mockSearchParams.keys()).forEach((key) => mockSearchParams.delete(key));
  new URLSearchParams(value).forEach((paramValue, key) => {
    mockSearchParams.set(key, paramValue);
  });
}

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/itineraries',
  useRouter: () => ({ replace }),
  useSearchParams: () => mockSearchParams,
}));

describe('ItinerariesModule', () => {
  beforeEach(() => {
    replace.mockClear();
    setMockSearchParams(
      'view=kanban&status=won&owner=daniel&selected=it-2651&tab=payments&method=bank_transfer',
    );
  });

  it('renders kanban/list state with Evolucion preset metadata and URL filters', () => {
    const markup = renderToStaticMarkup(
      <ItinerariesModule
        session={{
          status: 'authenticated',
          userId: 'user-1',
          email: 'planner@bukeer.test',
          accountId: 'account-1',
          role: 'admin',
          displayName: 'Planner One',
          permissions: ['admin_next.view', 'planner.view'],
          flags: {
            adminNextPrototype: true,
          },
        }}
        fixture={itinerariesFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-itineraries-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-active-view="kanban"');
    expect(markup).toContain('data-active-status="won"');
    expect(markup).toContain('data-active-owner="daniel"');
    expect(markup).toContain('data-selected-itinerary="it-2651"');
    expect(markup).toContain('data-active-tab="payments"');
    expect(markup).toContain('data-payment-method="bank_transfer"');
    expect(markup).toContain('data-mobile-screens="11"');
    expect(markup).toContain('data-visible-itineraries="1"');
    expect(markup).toContain('data-kanban-columns="5"');
    expect(markup).toContain('data-testid="admin-next-itinerary-detail"');
    expect(markup).toContain('data-testid="admin-next-itinerary-tab-services"');
    expect(markup).toContain('data-testid="admin-next-itinerary-tab-passengers"');
    expect(markup).toContain('data-testid="admin-next-itinerary-tab-suppliers"');
    expect(markup).toContain('data-testid="admin-next-itinerary-tab-payments"');
    expect(markup).toContain('data-testid="admin-next-itinerary-tab-preview"');
    expect(markup).toContain('data-testid="admin-next-itinerary-tab-panel-payments"');
    expect(markup).toContain('admin-next-itinerary-payment-locked-it-2651-pay-1');
    expect(markup).toContain('data-testid="admin-next-itinerary-payment-plan"');
    expect(markup).toContain('data-fee-included="false"');
    expect(markup).toContain('data-testid="admin-next-itinerary-payment-method-bank_transfer"');
    expect(markup).toContain('data-testid="admin-next-itinerary-regenerate-pending"');
    expect(markup).toContain('data-testid="admin-next-itinerary-installment-it-2651-installment-1"');
    expect(markup).toContain('data-locked="true"');
    expect(markup).toContain('data-testid="admin-next-itinerary-mobile-prototype"');
    expect(markup).toContain('data-mobile-screen-count="11"');
    expect(markup).toContain('data-testid="admin-next-itinerary-mobile-screen-profile"');
    expect(markup).toContain('data-testid="admin-next-itinerary-mobile-bottom-nav"');
    expect(markup).toContain('data-testid="admin-next-itineraries-kanban"');
    expect(markup).toContain('data-testid="admin-next-itineraries-kanban-won"');
    expect(markup).toContain('data-testid="admin-next-itineraries-ai-panel"');
    expect(markup).toContain('Itinerarios');
  });

  it('renders the 3-page public proposal preview from URL state', () => {
    setMockSearchParams(
      'view=list&status=all&owner=all&selected=it-2651&tab=preview&publicPage=checkout',
    );

    const markup = renderToStaticMarkup(
      <ItinerariesModule
        session={{
          status: 'authenticated',
          userId: 'user-1',
          email: 'planner@bukeer.test',
          accountId: 'account-1',
          role: 'admin',
          displayName: 'Planner One',
          permissions: ['admin_next.view', 'planner.view'],
          flags: {
            adminNextPrototype: true,
          },
        }}
        fixture={itinerariesFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-active-tab="preview"');
    expect(markup).toContain('data-public-page="checkout"');
    expect(markup).toContain('data-testid="admin-next-itinerary-public-proposal"');
    expect(markup).toContain('data-testid="admin-next-itinerary-public-page-cover"');
    expect(markup).toContain('data-testid="admin-next-itinerary-public-page-itinerary"');
    expect(markup).toContain('data-testid="admin-next-itinerary-public-page-checkout"');
    expect(markup).toContain('data-testid="admin-next-itinerary-public-page-panel-checkout"');
  });
});
