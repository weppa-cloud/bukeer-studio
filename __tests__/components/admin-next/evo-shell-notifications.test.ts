import {
  buildInitialNotifications,
  formatMarketPreview,
  normalizeMarketPreferences,
} from "@/components/admin-next/evolucion/evo-shell";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/admin/dashboard"),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

describe("EvoShell notifications contract", () => {
  it("exposes unread operational notifications plus RBAC scope for agent", () => {
    const notifications = buildInitialNotifications("agent");

    expect(notifications).toHaveLength(3);
    expect(notifications.filter((item) => item.unread)).toHaveLength(2);
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rbac-scope",
          title: "RBAC · Agente",
          description:
            "Itinerarios, contactos y agenda habilitados para operacion diaria.",
          unread: false,
        }),
      ]),
    );
  });

  it("uses the accounting RBAC scope when the backend session role is accounting", () => {
    expect(buildInitialNotifications("accounting")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rbac-scope",
          title: "RBAC · Contabilidad",
          description: "Pagos y reportes habilitados para revision financiera.",
        }),
      ]),
    );
  });

  it("localizes notification copy for English shell sessions", () => {
    expect(buildInitialNotifications("agent", "en")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rbac-scope",
          title: "RBAC · Agent",
          description:
            "Itineraries, contacts and agenda enabled for daily operations.",
        }),
      ]),
    );
  });

  it("normalizes and formats market preferences for the shell switcher", () => {
    expect(
      normalizeMarketPreferences({
        currency: "USD",
        language: "en",
      }),
    ).toEqual({ currency: "USD", language: "en" });
    expect(normalizeMarketPreferences({})).toEqual({
      currency: "COP",
      language: "es",
    });
    expect(formatMarketPreview({ currency: "USD", language: "en" })).toBe(
      "$3,100",
    );
    expect(formatMarketPreview({ currency: "COP", language: "es" })).toContain(
      "12.400.000",
    );
  });
});
