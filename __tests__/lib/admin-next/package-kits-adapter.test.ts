import {
  createPackageKitsAdapter,
  type AdminNextPackageKitsReadonlySupabaseClient,
} from "@/lib/admin-next/package-kits-adapter";

describe("admin-next package kits adapter", () => {
  it("feeds Package Kits from the fixture source by default", async () => {
    const adapter = createPackageKitsAdapter();

    await expect(adapter.getPackageKits()).resolves.toMatchObject({
      selected: {
        name: "San Andres familiar",
      },
      kits: expect.arrayContaining([
        expect.objectContaining({
          id: "kit-001",
          status: "active",
        }),
      ]),
    });
  });

  it("maps readonly package kit rows and versions into the F15 contract", async () => {
    const supabase = createReadonlySupabaseMock({
      package_kits: {
        data: [
          {
            id: "kit-live-1",
            name: "Paquete Caribe demo",
            slug: "paquete-caribe-demo",
            status: "active",
            category: "premium",
            destination: "Colombia",
            duration_days: 6,
            duration_nights: 5,
            description: "Kit generado desde itinerario real",
            program_highlights: [
              "Hotel boutique",
              { label: "Traslados incluidos" },
            ],
            program_inclusions: [{ name: "Alojamiento" }, "Asistencia"],
            pricing_tiers: [{ label: "Doble", price_per_person: 1600000 }],
            base_version_id: "version-live-2",
            source_itinerary_id: "1e3269c5-cb3b-407c-bf89-9ec53939e8e4",
            usage_count: 7,
            updated_at: "2026-06-11T00:00:00Z",
            created_at: "2026-06-01T00:00:00Z",
          },
          {
            id: "kit-draft-1",
            name: "Paquete borrador",
            slug: "paquete-borrador",
            status: "draft",
            category: null,
            destination: null,
            duration_days: null,
            duration_nights: null,
            description: null,
            program_highlights: [],
            program_inclusions: [],
            pricing_tiers: [],
            base_version_id: null,
            source_itinerary_id: null,
            usage_count: 0,
            updated_at: "2026-06-10T00:00:00Z",
            created_at: "2026-06-02T00:00:00Z",
          },
        ],
        error: null,
      },
      package_kit_versions: {
        data: [
          {
            id: "version-live-2",
            package_kit_id: "kit-live-1",
            version_label: "Base v2",
            version_number: 2,
            is_active: true,
            is_base_version: true,
            is_fx_locked: true,
            base_currency: "COP",
            passenger_count: 4,
            markup_percentage: 18.25,
            price_per_person: 1550000,
            pricing_pp_locked: 1600000,
            pricing_total_locked: 6400000,
            total_price: 6200000,
            updated_at: "2026-06-11T00:00:00Z",
          },
          {
            id: "version-draft-1",
            package_kit_id: "kit-draft-1",
            version_label: null,
            version_number: 1,
            is_active: false,
            is_base_version: false,
            is_fx_locked: false,
            base_currency: "COP",
            passenger_count: 2,
            markup_percentage: 0,
            price_per_person: 0,
            pricing_pp_locked: null,
            pricing_total_locked: null,
            total_price: 0,
            updated_at: "2026-06-10T00:00:00Z",
          },
        ],
        error: null,
      },
    });
    const adapter = createPackageKitsAdapter({
      mode: "readonly",
      supabase,
      accountId: "acct-1",
    });

    const fixture = await adapter.getPackageKits();

    expect(supabase.calls).toEqual([
      expect.objectContaining({
        table: "package_kits",
        filters: [["account_id", "acct-1"]],
        orders: [["updated_at", { ascending: false }]],
        limit: 80,
      }),
      expect.objectContaining({
        table: "package_kit_versions",
        filters: [
          ["account_id", "acct-1"],
          ["package_kit_id:in", ["kit-live-1", "kit-draft-1"]],
        ],
        orders: [["version_number", { ascending: false }]],
        limit: 160,
      }),
    ]);
    expect(fixture.kits).toEqual([
      expect.objectContaining({
        id: "kit-live-1",
        name: "Paquete Caribe demo",
        status: "active",
        destination: "Colombia",
        durationLabel: "6 dias / 5 noches",
        priceLabel: expect.stringMatching(/1\.600\.000 pp/),
        versionLabel: "Base v2",
        usageLabel: "7 usos",
        sourceLabel: "Desde 1e3269c5",
        tone: "success",
      }),
      expect.objectContaining({
        id: "kit-draft-1",
        status: "draft",
        destination: "Destino por definir",
        tone: "warning",
      }),
    ]);
    expect(fixture.selected).toEqual(
      expect.objectContaining({
        id: "kit-live-1",
        description: "Kit generado desde itinerario real",
        highlights: ["Hotel boutique", "Traslados incluidos"],
        inclusions: ["Alojamiento", "Asistencia"],
        pricing: expect.arrayContaining([
          expect.objectContaining({
            id: "per-person",
            value: expect.stringMatching(/1\.600\.000/),
          }),
          expect.objectContaining({
            id: "total",
            value: expect.stringMatching(/6\.400\.000/),
          }),
        ]),
        version: expect.objectContaining({
          id: "version-live-2",
          label: "Base v2",
          number: "v2",
          passengers: "4 pax",
          margin: "18,3%",
          locked: "FX bloqueado",
        }),
      }),
    );
    expect(fixture.signals).toEqual([
      expect.objectContaining({ id: "active", value: "1" }),
      expect.objectContaining({ id: "draft", value: "1" }),
      expect.objectContaining({ id: "versions", value: "2" }),
      expect.objectContaining({ id: "source", value: "1" }),
    ]);
  });

  it("throws when readonly package kit reads return an error", async () => {
    const adapter = createPackageKitsAdapter({
      mode: "readonly",
      supabase: createReadonlySupabaseMock({
        package_kits: {
          data: null,
          error: { message: "permission denied" },
        },
        package_kit_versions: {
          data: [],
          error: null,
        },
      }),
      accountId: "acct-1",
    });

    await expect(adapter.getPackageKits()).rejects.toThrow(
      "Package kits readonly adapter failed: permission denied",
    );
  });

  it("returns an empty renderable fixture when readonly has no package kits", async () => {
    const adapter = createPackageKitsAdapter({
      mode: "readonly",
      supabase: createReadonlySupabaseMock({
        package_kits: {
          data: [],
          error: null,
        },
        package_kit_versions: {
          data: [],
          error: null,
        },
      }),
      accountId: "acct-1",
    });

    await expect(adapter.getPackageKits()).resolves.toEqual(
      expect.objectContaining({
        kits: [],
        selected: expect.objectContaining({
          id: "kit-001",
          name: "San Andres familiar",
        }),
        signals: expect.arrayContaining([
          expect.objectContaining({ id: "active", value: "0" }),
          expect.objectContaining({ id: "draft", value: "0" }),
        ]),
      }),
    );
  });
});

function createReadonlySupabaseMock(rows: {
  package_kits: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  package_kit_versions: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
}): AdminNextPackageKitsReadonlySupabaseClient & {
  calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    orders: Array<[string, { ascending?: boolean } | undefined]>;
    limit: number | null;
  }>;
} {
  const calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    orders: Array<[string, { ascending?: boolean } | undefined]>;
    limit: number | null;
  }> = [];

  return {
    calls,
    from(table: "package_kits" | "package_kit_versions") {
      return {
        select(columns: string) {
          const call = {
            table,
            columns,
            filters: [] as Array<[string, unknown]>,
            orders: [] as Array<[string, { ascending?: boolean } | undefined]>,
            limit: null as number | null,
          };
          calls.push(call);
          const query = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return query;
            },
            in(column: string, values: readonly unknown[]) {
              call.filters.push([`${column}:in`, values]);
              return query;
            },
            order(column: string, options?: { ascending?: boolean }) {
              call.orders.push([column, options]);
              return query;
            },
            limit(count: number) {
              call.limit = count;
              return query;
            },
            then(
              resolve: (value: unknown) => unknown,
              reject?: (reason: unknown) => unknown,
            ) {
              return Promise.resolve(rows[table]).then(resolve, reject);
            },
          };

          return query;
        },
      };
    },
  } as unknown as AdminNextPackageKitsReadonlySupabaseClient & {
    calls: Array<{
      table: string;
      columns: string;
      filters: Array<[string, unknown]>;
      orders: Array<[string, { ascending?: boolean } | undefined]>;
      limit: number | null;
    }>;
  };
}
