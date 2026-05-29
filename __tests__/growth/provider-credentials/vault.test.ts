import {
  hydrateGoogleCredential,
  mergeRefreshedGoogleSecret,
  resolveGoogleProviderCredentialSecret,
} from "@/lib/growth/provider-credentials/vault";

const WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";

function supabaseRpcMock(data: unknown, error: { message?: string } | null = null) {
  return {
    rpc: jest.fn(async () => ({ data, error })),
  };
}

describe("provider credential Vault resolver", () => {
  it("resolves canonical Supabase Vault credential refs through service-role RPC", async () => {
    const supabase = supabaseRpcMock({
      access_token: "vault-access-token",
      refresh_token: "vault-refresh-token",
      access_token_expires_at: "2026-05-28T13:00:00.000Z",
      property_id: "294486074",
    });

    const secret = await resolveGoogleProviderCredentialSecret({
      supabase,
      websiteId: WEBSITE_ID,
      provider: "ga4",
      credentialRef: `supabase_vault:seo_integrations/${WEBSITE_ID}/ga4`,
    });

    expect(secret).toMatchObject({
      access_token: "vault-access-token",
      refresh_token: "vault-refresh-token",
      property_id: "294486074",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("get_seo_integration_credential_secret", {
      p_website_id: WEBSITE_ID,
      p_provider: "ga4",
      p_credential_ref: `supabase_vault:seo_integrations/${WEBSITE_ID}/ga4`,
    });
  });

  it("hydrates integrations from Vault instead of legacy token columns when credential_ref is present", async () => {
    const supabase = supabaseRpcMock({
      access_token: "vault-access-token",
      refresh_token: "vault-refresh-token",
      access_token_expires_at: "2026-05-28T13:00:00.000Z",
      property_id: "294486074",
    });

    const hydrated = await hydrateGoogleCredential({
      supabase,
      provider: "ga4",
      integration: {
        website_id: WEBSITE_ID,
        credential_ref: `supabase_vault:seo_integrations/${WEBSITE_ID}/ga4`,
        access_token: "legacy-access-token",
        refresh_token: "legacy-refresh-token",
        access_token_expires_at: "2026-05-10T10:00:00.000Z",
        property_id: "294486074",
      },
    });

    expect(hydrated.credentialSource).toBe("vault");
    expect(hydrated.integration.access_token).toBe("vault-access-token");
    expect(hydrated.integration.refresh_token).toBe("vault-refresh-token");
    expect(hydrated.integration.access_token).not.toBe("legacy-access-token");
  });

  it("keeps legacy fields only when credential_ref is absent", async () => {
    const supabase = supabaseRpcMock({});

    const hydrated = await hydrateGoogleCredential({
      supabase,
      provider: "gsc",
      integration: {
        website_id: WEBSITE_ID,
        access_token: "legacy-access-token",
        refresh_token: "legacy-refresh-token",
        access_token_expires_at: "2026-05-28T13:00:00.000Z",
        site_url: "sc-domain:colombiatours.travel",
      },
    });

    expect(hydrated.credentialSource).toBe("legacy");
    expect(hydrated.integration.access_token).toBe("legacy-access-token");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("merges refreshed tokens back into a Vault payload without dropping provider metadata", () => {
    const secret = mergeRefreshedGoogleSecret({
      provider: "ga4",
      integration: {
        website_id: WEBSITE_ID,
        property_id: "294486074",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      },
      secret: { provider: "ga4", property_id: "294486074" },
      accessToken: "new-access-token",
      refreshToken: "existing-refresh-token",
      expiresAt: "2026-05-28T14:00:00.000Z",
    });

    expect(secret).toMatchObject({
      provider: "ga4",
      access_token: "new-access-token",
      refresh_token: "existing-refresh-token",
      access_token_expires_at: "2026-05-28T14:00:00.000Z",
      property_id: "294486074",
    });
  });
});
