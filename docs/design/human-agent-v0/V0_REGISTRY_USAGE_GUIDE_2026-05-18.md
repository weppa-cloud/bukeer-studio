# v0 Registry Usage Guide

> Date: 2026-05-18
> Purpose: make the Bukeer signature registry usable for v0 and shadcn-backed AI workflows.

## Build Command

From `bukeer-studio`:

```bash
npm run design:bukeer-registry:build
```

This command:

1. Builds `docs/design/human-agent-v0/registry/registry.json`.
2. Writes generated registry JSON to `docs/design/human-agent-v0/registry-dist/`.
3. Copies the generated registry to `public/r/bukeer-admin-next/`.

## Public URL After Deploy

When `bukeer-studio` is deployed, the registry should be available at:

```txt
https://<studio-domain>/r/bukeer-admin-next/registry.json
```

Individual items should be available at:

```txt
https://<studio-domain>/r/bukeer-admin-next/signature-planner-workbench.json
https://<studio-domain>/r/bukeer-admin-next/signature-conversation-copilot.json
https://<studio-domain>/r/bukeer-admin-next/signature-trace-approval.json
https://<studio-domain>/r/bukeer-admin-next/signature-itinerary-manifest.json
```

## Local Verification

After running the build command:

```bash
jq empty docs/design/human-agent-v0/registry-dist/registry.json public/r/bukeer-admin-next/registry.json
```

Optional, once the Next dev server is running:

```bash
curl -I http://localhost:3000/r/bukeer-admin-next/registry.json
```

## v0 Flow

Use the registry item as the starting context, then ask v0 to revise with:

- `V0_SIGNATURE_PROMPTING_GUIDE_2026-05-18.md`
- `VISUAL_QA_RUBRIC_2026-05-18.md`
- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`

Preferred order:

1. Open `signature-planner-workbench`.
2. Ask v0 to improve the Planner Workbench using the Bukeer token roles and Visual QA rubric.
3. Open `signature-conversation-copilot`.
4. Ask v0 to align public/private messaging, extraction and human review gates.
5. Open `signature-trace-approval`.
6. Ask v0 to strengthen trace, guardrails, permissions and approval review.
7. Open `signature-itinerary-manifest`.
8. Ask v0 to rebuild the generic itinerary builder into a Bukeer travel manifest.

## Acceptance Gate

Do not accept a generated direction unless:

- It scores >= 40/45 for primary screens.
- It does not trigger any automatic rejection in `VISUAL_QA_RUBRIC_2026-05-18.md`.
- It preserves Bukeer role mapping: purple structural, teal live/realtime, orange human-in-the-loop.
- It includes visible human approval for sensitive actions.
- It does not expose hidden chain-of-thought; only summaries, evidence, data sources, traces and decisions.

## Notes

- The registry is still a design artifact, not production UI.
- Do not copy registry code directly into product components without engineering review.
- Do not place secrets or private v0 preview tokens in registry files.
