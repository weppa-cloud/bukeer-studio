// F11 — CRM/conversaciones: lectura real desde requests, conversation_messages y chatwoot_events.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type ConversationTarget = {
  customerName: string;
  messageText: string;
  destinationOrSource: string;
  conversationId: number;
};

type TargetRequestRow = {
  id: string;
  short_id: string | null;
  chatwoot_conversation_id: number | null;
  traveler_name: string | null;
  traveler_email: string | null;
  lead_source: string | null;
  destinations: string[] | null;
};

type TargetMessageRow = {
  conversation_id: number | null;
  content: string | null;
  chatwoot_created_at: string | null;
  created_at: string | null;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loginAsDemo(page: Page, nextPath: string) {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`, GOTO_READY);
  await page.waitForSelector('[data-testid="login-email"]', {
    timeout: 60_000,
  });
  await expect(page.getByTestId("login-submit")).toHaveAttribute(
    "data-hydrated",
    "true",
    { timeout: 60_000 },
  );
  await page.getByTestId("login-email").fill(DEMO_EMAIL);
  await page.getByTestId("login-password").fill(DEMO_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(`**${nextPath}**`, { timeout: 60_000 });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

async function findConversationTarget(): Promise<ConversationTarget | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  const { data: demoContacts, error: demoError } = await supabase
    .from("contacts")
    .select("account_id")
    .eq("email", DEMO_EMAIL)
    .is("deleted_at", null)
    .limit(1);

  if (demoError) throw demoError;
  const accountId = demoContacts?.[0]?.account_id as string | undefined;
  if (!accountId) return null;

  const { data: messages, error: messagesError } = await supabase
    .from("conversation_messages")
    .select("conversation_id,content,chatwoot_created_at,created_at")
    .eq("account_id", accountId)
    .order("chatwoot_created_at", { ascending: false })
    .limit(120);

  if (messagesError) throw messagesError;
  const candidateMessages = ((messages ?? []) as TargetMessageRow[]).filter(
    (message) =>
      typeof message.content === "string" && message.content.trim().length > 0,
  );
  const conversationIds = Array.from(
    new Set(
      candidateMessages
        .map((message) => message.conversation_id as number | null)
        .filter((value): value is number => typeof value === "number"),
    ),
  );
  if (conversationIds.length === 0) return null;

  const { data: requests, error: requestError } = await supabase
    .from("requests")
    .select(
      "id,short_id,chatwoot_conversation_id,traveler_name,traveler_email,lead_source,destinations,conversation_summary,last_message_at,updated_at,created_at",
    )
    .eq("account_id", accountId)
    .in("chatwoot_conversation_id", conversationIds)
    .limit(25);

  if (requestError) throw requestError;
  const candidateRequests = ((requests ?? []) as TargetRequestRow[]).filter(
    (request) => typeof request.chatwoot_conversation_id === "number",
  );
  if (candidateRequests.length === 0) return null;

  const orderedRequests = dedupeByConversation(
    candidateRequests
      .slice()
      .sort(
        (left, right) =>
          latestVisibleMessageTimestamp(right, candidateMessages) -
          latestVisibleMessageTimestamp(left, candidateMessages),
      ),
  );
  const request = orderedRequests[0];
  if (!request || typeof request.chatwoot_conversation_id !== "number") {
    return null;
  }
  const message = candidateMessages
    .filter((row) => row.conversation_id === request.chatwoot_conversation_id)
    .sort((left, right) => messageTimestamp(right) - messageTimestamp(left))[0];
  if (!message?.content) return null;

  return {
    customerName:
      request.traveler_name ||
      request.traveler_email ||
      `Solicitud ${request.short_id || request.id}`,
    messageText: message.content.trim(),
    destinationOrSource:
      request.destinations?.filter(Boolean).join(", ") ||
      request.lead_source ||
      "CRM Bukeer",
    conversationId: request.chatwoot_conversation_id,
  };
}

function dedupeByConversation(
  requests: readonly TargetRequestRow[],
): TargetRequestRow[] {
  const seen = new Set<number>();
  const deduped: TargetRequestRow[] = [];
  for (const request of requests) {
    const conversationId = request.chatwoot_conversation_id;
    if (typeof conversationId !== "number" || seen.has(conversationId)) {
      continue;
    }
    seen.add(conversationId);
    deduped.push(request);
  }
  return deduped;
}

function latestVisibleMessageTimestamp(
  request: TargetRequestRow,
  messages: readonly TargetMessageRow[],
): number {
  const conversationId = request.chatwoot_conversation_id;
  if (typeof conversationId !== "number") return 0;
  const timestamps = messages
    .filter((message) => message.conversation_id === conversationId)
    .map(messageTimestamp);
  return timestamps.length > 0 ? Math.max(...timestamps) : 0;
}

function messageTimestamp(message: TargetMessageRow): number {
  const value = message.chatwoot_created_at || message.created_at;
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

test.describe("Evolucion F11 — CRM/conversaciones reales (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F11",
  );

  test("muestra conversación CRM real con hilo, panel y mirror realtime", async ({
    page,
  }) => {
    const target = await findConversationTarget();
    test.skip(!target, "No hay requests demo con mensajes Chatwoot para F11");
    if (!target) return;

    await loginAsDemo(page, "/admin/conversations");

    await expect(
      page.getByTestId("admin-next-conversations-layout"),
    ).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByTestId(`admin-next-conversation-${target.conversationId}`),
    ).toContainText(target.customerName);
    await expect(
      page.getByTestId("admin-next-conversations-thread"),
    ).toContainText(target.customerName);
    await expect(
      page.getByTestId("admin-next-conversations-thread"),
    ).toContainText(target.messageText);
    await expect(
      page.getByTestId("admin-next-conversations-crm-panel"),
    ).toContainText(target.destinationOrSource);
    await expect(
      page.getByTestId("admin-next-conversations-realtime-status"),
    ).toContainText(/Mirror/);
  });
});
