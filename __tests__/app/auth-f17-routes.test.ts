import { NextRequest } from "next/server";
import { POST as demoCodePost } from "@/app/api/auth/demo-code/route";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

jest.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockCreateSupabaseServerClient =
  createSupabaseServerClient as jest.MockedFunction<
    typeof createSupabaseServerClient
  >;

const originalEnv = process.env;

function jsonRequest(url: string, payload: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("F17 auth API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects invalid demo codes without touching Supabase auth", async () => {
    process.env.DEMO_ACCESS_CODE = "owner-code";
    process.env.E2E_DEMO_PASSWORD = "secret";

    const response = await demoCodePost(
      jsonRequest("https://studio.bukeer.com/api/auth/demo-code", {
        code: "wrong",
        redirectTo: "https://evil.example/phish",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/invalid/i);
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("signs in the configured demo account and sanitizes redirect targets", async () => {
    process.env.DEMO_ACCESS_CODE = "owner-code";
    process.env.E2E_DEMO_EMAIL = "demo@demo.bukeer.com";
    process.env.E2E_DEMO_PASSWORD = "secret";
    const signInWithPassword = jest.fn().mockResolvedValue({ error: null });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: { signInWithPassword },
    } as never);

    const response = await demoCodePost(
      jsonRequest("https://studio.bukeer.com/api/auth/demo-code", {
        code: "owner-code",
        redirectTo: "https://evil.example/phish",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.redirectTo).toBe("/admin/dashboard");
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "demo@demo.bukeer.com",
      password: "secret",
    });
  });

  it("rejects registration when the invite code is missing or wrong", async () => {
    process.env.BUKEER_AUTH_INVITE_CODE = "invite-123";

    const response = await registerPost(
      jsonRequest("https://studio.bukeer.com/api/auth/register", {
        email: "new@agency.test",
        password: "password123",
        inviteCode: "wrong",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/invitation/i);
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("creates invite-gated signups with an email verification redirect", async () => {
    process.env.BUKEER_AUTH_INVITE_CODE = "invite-123";
    const signUp = jest.fn().mockResolvedValue({ error: null });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: { signUp },
    } as never);

    const response = await registerPost(
      jsonRequest("https://studio.bukeer.com/api/auth/register", {
        email: "NEW@AGENCY.TEST",
        password: "password123",
        inviteCode: "invite-123",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toMatch(/verify/i);
    expect(signUp).toHaveBeenCalledWith({
      email: "new@agency.test",
      password: "password123",
      options: {
        emailRedirectTo:
          "https://studio.bukeer.com/auth/callback?redirect=/admin/dashboard",
      },
    });
  });
});
