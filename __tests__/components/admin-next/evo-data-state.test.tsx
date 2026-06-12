import { renderToStaticMarkup } from "react-dom/server";
import { EvoContacts } from "@/components/admin-next/evolucion/evo-contacts";
import { EvoConversations } from "@/components/admin-next/evolucion/evo-conversations";
import { EvoAgenda } from "@/components/admin-next/evolucion/evo-agenda";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoItineraries } from "@/components/admin-next/evolucion/evo-itineraries";
import { EvoPackageKits } from "@/components/admin-next/evolucion/evo-package-kits";
import { EvoProducts } from "@/components/admin-next/evolucion/evo-products";
import { EvoSettings } from "@/components/admin-next/evolucion/evo-settings";
import type { AgendaFixture } from "@/lib/admin-next/fixtures/agenda";
import type { ContactsFixture } from "@/lib/admin-next/fixtures/contacts";
import type { ConversationsFixture } from "@/lib/admin-next/fixtures/conversations";
import type { ItinerariesFixture } from "@/lib/admin-next/fixtures/itineraries";
import type { PackageKitsFixture } from "@/lib/admin-next/fixtures/package-kits";
import type { ProductsFixture } from "@/lib/admin-next/fixtures/products";
import type { SettingsFixture } from "@/lib/admin-next/fixtures/settings";

describe("Evolucion data states", () => {
  it("renders actionable error states without custom styling tokens", () => {
    const markup = renderToStaticMarkup(
      <EvoDataState
        kind="permission"
        title="Permiso denegado"
        description="Tu rol no tiene acceso."
        actionHref="/admin/settings"
        actionLabel="Reintentar"
        testId="admin-next-state"
      />,
    );

    expect(markup).toContain('data-state-kind="permission"');
    expect(markup).toContain('data-testid="admin-next-state"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('href="/admin/settings"');
    expect(markup).toContain("Permiso denegado");
  });

  it("renders an agenda empty state when no days are visible", () => {
    const fixture: AgendaFixture = {
      rangeLabel: "10 jun - 10 jul",
      days: [],
      signals: [],
    };

    const markup = renderToStaticMarkup(<EvoAgenda fixture={fixture} />);

    expect(markup).toContain('data-testid="admin-next-agenda-empty"');
    expect(markup).toContain("Sin servicios programados");
  });

  it("renders settings empty states for users and RBAC matrix", () => {
    const fixture: SettingsFixture = {
      agency: {
        name: "Bukeer Demo",
        website: "demo.bukeer.com",
        locale: "es",
        currency: "COP",
      },
      businessRules: [],
      billing: [],
      team: [],
      integrations: [],
      permissionMatrix: [],
      signals: [],
      users: [],
    };

    const markup = renderToStaticMarkup(<EvoSettings fixture={fixture} />);

    expect(markup).toContain('data-testid="admin-next-settings-users-empty"');
    expect(markup).toContain(
      'data-testid="admin-next-settings-permissions-empty"',
    );
    expect(markup).toContain("Sin usuarios visibles");
    expect(markup).toContain("Sin matriz RBAC");
  });

  it("renders empty states for list modules without blank panels", () => {
    const contactsFixture = {
      contacts: [],
      selected: {},
      timeline: [],
      signals: [],
    } as unknown as ContactsFixture;
    const productsFixture = {
      categories: [],
      products: [],
    } as unknown as ProductsFixture;
    const conversationsFixture = {
      conversations: [],
      selected: {},
      signals: [],
      templates: [],
    } as unknown as ConversationsFixture;
    const itinerariesFixture = {
      statuses: [{ id: "draft", label: "Borrador" }],
      itineraries: [],
    } as unknown as ItinerariesFixture;
    const packageKitsFixture = {
      kits: [],
      selected: {},
      signals: [],
    } as unknown as PackageKitsFixture;

    const markup = [
      renderToStaticMarkup(
        <EvoContacts fixture={contactsFixture} subtitle="0 contactos" />,
      ),
      renderToStaticMarkup(
        <EvoProducts fixture={productsFixture} subtitle="0 productos" />,
      ),
      renderToStaticMarkup(
        <EvoConversations
          fixture={conversationsFixture}
          subtitle="CRM · 0 abiertas, 0 en espera"
        />,
      ),
      renderToStaticMarkup(
        <EvoItineraries
          createDefaults={{ startDate: "2026-06-12", endDate: "2026-06-17" }}
          filters={{ q: "", status: "all" }}
          fixture={itinerariesFixture}
          showCreateModal={false}
          subtitle="0 activos · 0 por confirmar"
          view="list"
          writesEnabled={false}
        />,
      ),
      renderToStaticMarkup(
        <EvoPackageKits fixture={packageKitsFixture} subtitle="0 paquetes" />,
      ),
    ].join("\n");

    expect(markup).toContain('data-testid="admin-next-contacts-empty"');
    expect(markup).toContain('data-testid="admin-next-products-empty"');
    expect(markup).toContain('data-testid="admin-next-conversations-empty"');
    expect(markup).toContain('data-testid="admin-next-itineraries-empty"');
    expect(markup).toContain('data-testid="admin-next-package-kits-empty"');
    expect(markup).toContain(
      'data-testid="admin-next-package-kits-selected-empty"',
    );
  });
});
