import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, "..", ".auth", "user.json");

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64").toString("utf8");
}

function jwtExpSeconds(token: string): number | null {
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

function maybeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractAccessTokenFromCookie(value: string): string | null {
  const raw = decodeURIComponent(value);
  const candidates: unknown[] = [maybeJson(raw)];

  if (raw.startsWith("base64-")) {
    try {
      candidates.push(
        maybeJson(Buffer.from(raw.slice(7), "base64").toString("utf8")),
      );
    } catch {
      // Ignore malformed cache and force re-auth below.
    }
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate) && typeof candidate[0] === "string") {
      return candidate[0];
    }
    if (typeof candidate === "object") {
      const record = candidate as Record<string, unknown>;
      if (typeof record.access_token === "string") return record.access_token;
      if (typeof record.currentSession === "object" && record.currentSession) {
        const session = record.currentSession as Record<string, unknown>;
        if (typeof session.access_token === "string")
          return session.access_token;
      }
    }
  }
  return null;
}

function authStateStillUsable(): boolean {
  if (!fs.existsSync(authFile)) return false;
  const stored = JSON.parse(fs.readFileSync(authFile, "utf-8")) as {
    cookies?: Array<{ name: string; value?: string; expires?: number }>;
  };
  const cookies = stored.cookies || [];
  const authCookie = cookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"),
  );
  if (!authCookie?.value || !authCookie.expires) return false;

  const now = Date.now() / 1000;
  if (authCookie.expires <= now + 3600) return false;

  const accessToken = extractAccessTokenFromCookie(authCookie.value);
  const exp = accessToken ? jwtExpSeconds(accessToken) : null;
  if (!exp || exp <= now + 3600) return false;

  console.log("Auth JWT valid until", new Date(exp * 1000).toISOString());
  return true;
}

async function writeProgrammaticAuthState(opts: {
  email: string;
  password: string;
  baseURL: string;
}): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: opts.email,
    password: opts.password,
  });

  if (error || !data.session) {
    throw new Error(
      `Programmatic E2E auth failed: ${error?.message ?? "missing session"}`,
    );
  }

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const origin = new URL(opts.baseURL);
  const session = data.session;
  const cookieValue = `base64-${Buffer.from(JSON.stringify(session)).toString(
    "base64",
  )}`;

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(
    authFile,
    JSON.stringify(
      {
        cookies: [
          {
            name: `sb-${projectRef}-auth-token`,
            value: cookieValue,
            domain: origin.hostname,
            path: "/",
            expires: session.expires_at ?? Date.now() / 1000 + 3600,
            httpOnly: false,
            secure: origin.protocol === "https:",
            sameSite: "Lax",
          },
        ],
        origins: [
          {
            origin: origin.origin,
            localStorage: [
              {
                name: "studio-ui-mode",
                value: "light",
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
  );
  console.log("Programmatic E2E auth state written for", opts.email);
  return true;
}

setup("authenticate", async ({ page, baseURL }) => {
  // If stored auth is still valid (cookie + embedded JWT), reuse it.
  if (authStateStillUsable()) {
    return;
  }

  const email = process.env.E2E_USER_EMAIL || "consultoria@weppa.co";
  const password = process.env.E2E_USER_PASSWORD || "Ingeniero1!";
  const resolvedBaseURL = baseURL ?? "http://localhost:3000";

  if (
    await writeProgrammaticAuthState({
      email,
      password,
      baseURL: resolvedBaseURL,
    })
  ) {
    return;
  }

  await page.goto("/login");

  // Wait for Suspense boundary (useSearchParams) to hydrate before interacting
  await page.waitForSelector('input[id="email"]', { timeout: 60000 });

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("/dashboard**", { timeout: 30000 });
  await expect(page.getByText("My Websites")).toBeVisible();

  await page.context().storageState({ path: authFile });
});
