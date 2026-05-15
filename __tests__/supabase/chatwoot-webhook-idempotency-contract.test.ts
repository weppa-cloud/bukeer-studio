import { readFileSync } from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Chatwoot webhook idempotency contract", () => {
  it("claims webhook_events through the atomic RPC instead of direct upsert", () => {
    const source = readSource("app/api/webhooks/chatwoot/route.ts");
    const insertWebhookEventSource = source.match(
      /async function insertWebhookEvent[\s\S]*?\n}\n\nasync function markWebhookEvent/,
    )?.[0];

    expect(insertWebhookEventSource).toBeDefined();
    expect(insertWebhookEventSource).toContain("claim_webhook_event");
    expect(insertWebhookEventSource).not.toContain(".upsert(");
    expect(insertWebhookEventSource).not.toContain('.from("webhook_events")');
  });
});
