import { renderToStaticMarkup } from 'react-dom/server';
import { ItinerariesModule } from '@/components/admin-next/itineraries-module';
import { itinerariesFixture } from '@/lib/admin-next/fixtures/itineraries';

const replace = jest.fn();
const mockSearchParams = new URLSearchParams('view=kanban&status=won&owner=daniel');

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/itineraries',
  useRouter: () => ({ replace }),
  useSearchParams: () => mockSearchParams,
}));

describe('ItinerariesModule', () => {
  beforeEach(() => {
    replace.mockClear();
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
    expect(markup).toContain('data-visible-itineraries="1"');
    expect(markup).toContain('data-kanban-columns="5"');
    expect(markup).toContain('data-testid="admin-next-itineraries-kanban"');
    expect(markup).toContain('data-testid="admin-next-itineraries-kanban-won"');
    expect(markup).toContain('data-testid="admin-next-itineraries-ai-panel"');
    expect(markup).toContain('Itinerarios');
  });
});
