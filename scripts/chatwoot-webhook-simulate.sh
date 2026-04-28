#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE' >&2
Usage:
  CHATWOOT_WEBHOOK_SECRET=... bash scripts/chatwoot-webhook-simulate.sh <qualified_lead|quote_sent> <conversation_id> <reference_code>

Optional:
  CHATWOOT_WEBHOOK_URL=http://localhost:3000/api/webhooks/chatwoot
  PORT=3001
USAGE
}

if [[ $# -ne 3 ]]; then
  usage
  exit 64
fi

if [[ -z "${CHATWOOT_WEBHOOK_SECRET:-}" ]]; then
  echo "CHATWOOT_WEBHOOK_SECRET is required" >&2
  exit 65
fi

event_kind="$1"
conversation_id="$2"
reference_code="$3"
url="${CHATWOOT_WEBHOOK_URL:-http://localhost:${PORT:-3000}/api/webhooks/chatwoot}"
timestamp="$(date +%s)"

case "$event_kind" in
  qualified_lead)
    label="qualified"
    stage="qualified_lead"
    content="Lead qualified #ref: ${reference_code}"
    ;;
  quote_sent)
    label="quote_sent"
    stage="quote_sent"
    content="Quote sent #ref: ${reference_code}"
    ;;
  *)
    usage
    exit 64
    ;;
esac

body="$(
  EVENT_KIND="$event_kind" \
  CONVERSATION_ID="$conversation_id" \
  REFERENCE_CODE="$reference_code" \
  TIMESTAMP="$timestamp" \
  LABEL="$label" \
  STAGE="$stage" \
  CONTENT="$content" \
  node -e '
const payload = {
  event: "message_created",
  id: `${process.env.EVENT_KIND}:${process.env.CONVERSATION_ID}:${process.env.REFERENCE_CODE}:${process.env.TIMESTAMP}`,
  timestamp: Number(process.env.TIMESTAMP),
  conversation: {
    id: process.env.CONVERSATION_ID,
    labels: [process.env.LABEL],
    custom_attributes: {
      reference_code: process.env.REFERENCE_CODE,
      lifecycle_stage: process.env.STAGE,
    },
  },
  message: {
    id: `sim-${process.env.TIMESTAMP}`,
    content: process.env.CONTENT,
  },
};
process.stdout.write(JSON.stringify(payload));
'
)"

signature="$(
  BODY="$body" \
  CHATWOOT_WEBHOOK_SECRET="$CHATWOOT_WEBHOOK_SECRET" \
  node -e '
const crypto = require("crypto");
process.stdout.write(
  crypto
    .createHmac("sha256", process.env.CHATWOOT_WEBHOOK_SECRET)
    .update(process.env.BODY)
    .digest("hex")
);
'
)"

curl -sS -X POST "$url" \
  -H "content-type: application/json" \
  -H "x-chatwoot-signature: sha256=${signature}" \
  -H "x-chatwoot-timestamp: ${timestamp}" \
  --data "$body"
