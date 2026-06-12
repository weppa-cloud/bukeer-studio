import { renderToStaticMarkup } from "react-dom/server";
import { EvoAccount } from "@/components/admin-next/evolucion/evo-account";
import { accountFixture } from "@/lib/admin-next/fixtures/account";
import type { AccountFixture } from "@/lib/admin-next/fixtures/account";

describe("EvoAccount", () => {
  it("renders the account profile, security, notifications and signature states", () => {
    const markup = renderToStaticMarkup(
      <EvoAccount fixture={accountFixture} />,
    );

    expect(markup).toContain('data-testid="admin-next-account-root"');
    expect(markup).toContain('data-testid="admin-next-account-profile"');
    expect(markup).toContain('data-testid="admin-next-account-security"');
    expect(markup).toContain('data-testid="admin-next-account-preferences"');
    expect(markup).toContain('data-testid="admin-next-account-notifications"');
    expect(markup).toContain('data-testid="admin-next-account-signature"');
    expect(markup).toContain("Carolina Ruiz");
    expect(markup).toContain("ColombiaTours.travel");
  });

  it("renders an empty state instead of a blank profile", () => {
    const fixture: AccountFixture = {
      ...accountFixture,
      profile: {
        ...accountFixture.profile,
        email: "",
      },
    };

    const markup = renderToStaticMarkup(<EvoAccount fixture={fixture} />);

    expect(markup).toContain('data-testid="admin-next-account-empty"');
    expect(markup).toContain('data-state-kind="empty"');
    expect(markup).toContain("Sin perfil visible");
  });
});
