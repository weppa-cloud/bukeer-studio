# Bukeer v0/shadcn Registry Source

This directory is a registry source for Bukeer Admin Next visual exploration. It is intentionally stored under `docs/design` and is not wired into production routes.

## Purpose

- Give v0 concrete Bukeer tokens, components and blocks.
- Reduce generic SaaS dashboard output.
- Preserve the Bukeer visual role system: purple structural identity, teal live/realtime state, orange human-in-the-loop state.
- Keep generated concepts separate from production implementation until design and engineering review.

## Contents

- `registry.json`: shadcn registry manifest.
- `tokens/bukeer-signature-tokens.css`: portable CSS token source.
- `components/bukeer-signature-components.tsx`: domain component vocabulary.
- `blocks/signature-planner-workbench.tsx`: primary workbench block.
- `blocks/signature-conversation-copilot.tsx`: public/private messaging and extraction block.
- `blocks/signature-trace-approval.tsx`: agent trace and approval block.
- `blocks/signature-itinerary-manifest.tsx`: travel manifest block for itinerary operations.

## Build

From `bukeer-studio`:

```bash
./node_modules/.bin/shadcn build docs/design/human-agent-v0/registry/registry.json --output docs/design/human-agent-v0/registry-dist
```

## v0 Usage

Use this registry after it is deployed or served from a reachable URL. The preferred flow is to open the relevant block in v0 with registry context, then request revisions using `V0_SIGNATURE_PROMPTING_GUIDE_2026-05-18.md` and evaluate with `VISUAL_QA_RUBRIC_2026-05-18.md`.
