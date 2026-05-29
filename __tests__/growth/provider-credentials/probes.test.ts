import { probeProviderCredential } from "@/lib/growth/provider-credentials/probes";

const NOW = "2026-05-28T12:00:00.000Z";

describe("provider credential no-write probes", () => {
  it("returns WARN needs_refresh_no_write for expired GSC tokens without calling Google", async () => {
    const fetchImpl = jest.fn();

    const result = await probeProviderCredential({
      provider: "gsc",
      now: NOW,
      fetchImpl,
      integration: {
        provider: "gsc",
        access_token: "expired-access-token",
        refresh_token: "refresh-token",
        access_token_expires_at: "2026-05-10T10:15:16.769Z",
      },
    });

    expect(result).toMatchObject({
      provider: "gsc",
      status: "WARN",
      reason: "needs_refresh_no_write",
      legacy_token_present: true,
      secrets_redacted: true,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("expired-access-token");
    expect(JSON.stringify(result)).not.toContain("refresh-token");
  });

  it("checks DataForSEO user_data without exposing credentials", async () => {
    const fetchImpl = jest.fn(async () => ({
      status: 200,
      json: async () => ({ status_code: 20000, status_message: "Ok." }),
    }));

    const result = await probeProviderCredential({
      provider: "dataforseo",
      now: NOW,
      env: {
        DATAFORSEO_LOGIN: "login",
        DATAFORSEO_PASSWORD: "password",
      },
      fetchImpl,
    });

    expect(result).toMatchObject({
      provider: "dataforseo",
      status: "PASS",
      reason: "dataforseo_user_data_ok",
      http_status: 200,
      provider_status_code: 20000,
      secrets_redacted: true,
    });
    expect(JSON.stringify(result)).not.toContain("password");
  });

  it("uses a valid GA4 access token only for a read-only metadata probe", async () => {
    const fetchImpl = jest.fn(async () => ({
      status: 200,
      json: async () => ({ name: "properties/294486074/metadata" }),
    }));

    const result = await probeProviderCredential({
      provider: "ga4",
      now: NOW,
      fetchImpl,
      integration: {
        provider: "ga4",
        property_id: "294486074",
        access_token: "valid-access-token",
        access_token_expires_at: "2026-05-28T13:00:00.000Z",
        credential_ref: "vault://growth/account/website/ga4",
      },
    });

    expect(result.status).toBe("PASS");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://analyticsdata.googleapis.com/v1beta/properties/294486074/metadata",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer valid-access-token" }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("valid-access-token");
  });

  it("resolves credential_ref before probing and does not expose Vault material", async () => {
    const fetchImpl = jest.fn(async () => ({
      status: 200,
      json: async () => ({ name: "properties/294486074/metadata" }),
    }));
    const resolveSecret = jest.fn(async () => ({
      access_token: "vault-access-token",
      refresh_token: "vault-refresh-token",
      access_token_expires_at: "2026-05-28T13:00:00.000Z",
      property_id: "294486074",
    }));

    const result = await probeProviderCredential({
      provider: "ga4",
      now: NOW,
      fetchImpl,
      resolveSecret,
      integration: {
        provider: "ga4",
        credential_ref: "supabase_vault:seo_integrations/website/ga4",
      },
    });

    expect(result).toMatchObject({
      provider: "ga4",
      status: "PASS",
      reason: "ga4_read_only_probe_ok",
      credential_ref_present: true,
      secrets_redacted: true,
    });
    expect(resolveSecret).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://analyticsdata.googleapis.com/v1beta/properties/294486074/metadata",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer vault-access-token" }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("vault-access-token");
    expect(JSON.stringify(result)).not.toContain("vault-refresh-token");
  });
});
