import { NextRequest, NextResponse } from "next/server";
import { sanitizeInternalRedirect } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const DEFAULT_DEMO_EMAIL = "demo@demo.bukeer.com";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const code = String(payload.code ?? "").trim();
  const redirectTo = sanitizeInternalRedirect(
    payload.redirectTo,
    "/admin/dashboard",
  );
  const expectedCode =
    process.env.DEMO_ACCESS_CODE ||
    (process.env.NODE_ENV !== "production" ? "demo-e2e" : "");
  const email = process.env.E2E_DEMO_EMAIL || DEFAULT_DEMO_EMAIL;
  const password = process.env.E2E_DEMO_PASSWORD;

  if (!expectedCode || code !== expectedCode) {
    return NextResponse.json(
      { error: "Demo code is invalid or expired." },
      { status: 401 },
    );
  }

  if (!password) {
    return NextResponse.json(
      { error: "Demo account is not configured on this environment." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ redirectTo });
}
