import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(payload.password ?? "");
  const inviteCode = String(payload.inviteCode ?? "").trim();
  const expectedInviteCode = process.env.BUKEER_AUTH_INVITE_CODE;

  if (!expectedInviteCode || inviteCode !== expectedInviteCode) {
    return NextResponse.json(
      { error: "Invitation code required." },
      { status: 403 },
    );
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Enter a valid email." },
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = new URL(
    "/auth/callback?redirect=/admin/dashboard",
    request.url,
  );
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo.toString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    message: "Check your email to verify your account before signing in.",
  });
}
