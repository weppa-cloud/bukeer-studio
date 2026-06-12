import { renderToStaticMarkup } from "react-dom/server";
import { EvoPayments } from "@/components/admin-next/evolucion/evo-payments";
import { paymentsFixture } from "@/lib/admin-next/fixtures/payments";
import type { PaymentsFixture } from "@/lib/admin-next/fixtures/payments";

describe("EvoPayments", () => {
  it("renders the payments fixture inside the Evolucion contract", () => {
    const markup = renderToStaticMarkup(
      <EvoPayments
        fixture={paymentsFixture}
        searchParams={{ batch: "supplier", method: "bank_transfer" }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-payments-root"');
    expect(markup).toContain('data-active-method="bank_transfer"');
    expect(markup).toContain('data-active-batch="supplier"');
    expect(markup).toContain('data-testid="admin-next-payments-kpis"');
    expect(markup).toContain('data-testid="admin-next-payments-collect-batch"');
    expect(markup).toContain(
      'data-testid="admin-next-payments-supplier-batch"',
    );
    expect(markup).toContain('data-testid="admin-next-payments-ai-panel"');
    expect(markup).toContain("Tesoreria");
  });

  it("keeps payment actions disabled without the RBAC permission", () => {
    const markup = renderToStaticMarkup(
      <EvoPayments canManagePayments={false} fixture={paymentsFixture} />,
    );

    expect(markup).toContain('data-payments-manage="false"');
    expect(markup).toContain(
      'data-testid="admin-next-payments-create-link" disabled=""',
    );
    expect(markup).toContain(
      'data-testid="admin-next-payments-prepare-payment" disabled=""',
    );
    expect(markup).toContain("Solo lectura");
  });

  it("renders an empty state instead of a blank treasury surface", () => {
    const fixture: PaymentsFixture = {
      ...paymentsFixture,
      aiSignals: [],
      dueItems: [],
      kpis: [],
      movements: [],
    };

    const markup = renderToStaticMarkup(<EvoPayments fixture={fixture} />);

    expect(markup).toContain('data-testid="admin-next-payments-empty"');
    expect(markup).toContain('data-state-kind="empty"');
    expect(markup).toContain("Sin datos de tesoreria");
    expect(markup).not.toContain('data-testid="admin-next-payments-root"');
  });
});
