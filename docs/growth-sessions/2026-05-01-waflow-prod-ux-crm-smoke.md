# 2026-05-01 WAFlow Production UX + CRM Smoke

## Scope

Production smoke for ColombiaTours WAFlow from the public site using the Codex in-app browser plus WhatsApp Desktop.

Reference tested: `HOME-0105-AZBG`

## WAFlow Result

- Public URL: `https://colombiatours.travel/?utm_source=codex&utm_medium=qa&utm_campaign=epic310_waflow_ux&utm_content=browser_plugin`
- WAFlow submit: PASS.
- `waflow_leads`: 1 row created.
- `funnel_events`: 2 rows created:
  - `waflow_submit`
  - `whatsapp_cta_click`
- `meta_conversion_events`: Lead row recorded as `skipped` because Meta CAPI env/config is missing.

## WhatsApp / Chatwoot Result

- WAFlow generated `wa.me/573206129003`.
- WhatsApp Desktop first reported the linked business account as no longer active and redirected to the new account via "Message the new account".
- WhatsApp Desktop sent the message to `ColombiaTours.Travel Reservas`.
- WhatsApp Desktop fragmented the pasted multiline message into several sends; the final `#ref` fragment was still delivered and processed.
- Chatwoot webhook processed the final reference fragment:
  - `webhook_events.id`: `675f3998-2b0c-4646-ba7f-74726701c5a9`
  - `event_type`: `message_created`
  - `conversation_id`: `34883`
  - `content`: `#ref: HOME-0105-AZBG`
  - `status`: `processed`
- Meta conversion `ConversationContinued` was recorded as `skipped` because Meta CAPI env/config is missing.

## CRM Gap Found

The same Chatwoot conversation already had request `SOL-1002` linked to prior reference `PAQUET-3004-9NGK`.

Expected contract:

`reference_code` wins before `chatwoot_conversation_id`, so the same WhatsApp thread can contain multiple WAFlow requests.

Observed behavior before fix:

- The webhook detected the conversation/ref mismatch.
- It did not call the reference-first RPC.
- `waflow_leads.chatwoot_conversation_id` remained `null`.
- No new/current request was linked to `HOME-0105-AZBG`.

Fix applied in Studio:

- `app/api/webhooks/chatwoot/route.ts` now logs conversation/reference mismatch and continues into the reference-first RPC instead of returning `null`.

## UX Gap Found

The confirmation drawer is too tall on shorter/mobile viewports:

- The title/header consumes too much vertical space.
- The message preview is long and can appear clipped.
- The user may not realize the confirmation screen scrolls.

Fix applied:

- `components/site/themes/editorial-v1/editorial-v1.css` now makes the success state start at the top, caps the message preview height, enables preview scrolling, and compacts the success/header spacing for short viewports.

## Follow-up

- Deploy Studio fix.
- Re-run WAFlow with a fresh reference in the same Chatwoot conversation.
- Confirm:
  - `waflow_leads.chatwoot_conversation_id` is populated.
  - CRM request is found/created by `custom_fields.growth_reference_code`.
  - Chatwoot custom attributes show the latest Growth reference when API env is configured.
  - Meta CAPI changes from `skipped` to sent once `META_PIXEL_ID` and `META_ACCESS_TOKEN` are configured.
