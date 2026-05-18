# v0 Design System Registry Plan

> Date: 2026-05-18
> Purpose: reduce generic v0 output by giving v0 actual Bukeer design-system context, not only prose prompts.

## Why

v0's official docs support custom design systems through Tailwind config, `globals.css`, shadcn components and registries. The current prompt-only approach improved strategy, but the visual output can still drift into generic shadcn/SaaS patterns.

## Current Status

Status: **source registry created and build validated**.

Source:

- `registry/registry.json`
- `registry/tokens/bukeer-signature-tokens.css`
- `registry/components/bukeer-signature-components.tsx`
- `registry/blocks/signature-planner-workbench.tsx`
- `registry/blocks/signature-conversation-copilot.tsx`
- `registry/blocks/signature-trace-approval.tsx`

Built output:

- `registry-dist/registry.json`
- `registry-dist/bukeer-signature-theme.json`
- `registry-dist/bukeer-signature-tokens-css.json`
- `registry-dist/bukeer-signature-components.json`
- `registry-dist/signature-planner-workbench.json`
- `registry-dist/signature-conversation-copilot.json`
- `registry-dist/signature-trace-approval.json`
- `registry-dist/signature-itinerary-manifest.json`

Public static output:

- `public/r/bukeer-admin-next/registry.json`
- `public/r/bukeer-admin-next/signature-planner-workbench.json`
- `public/r/bukeer-admin-next/signature-conversation-copilot.json`
- `public/r/bukeer-admin-next/signature-trace-approval.json`
- `public/r/bukeer-admin-next/signature-itinerary-manifest.json`

Validation command:

```bash
npm run design:bukeer-registry:build
```

Result: build completed successfully.

Usage details:

- `V0_REGISTRY_USAGE_GUIDE_2026-05-18.md`

## Plan

### Step 1: Token Source

Use:

- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `bukeer_flutter/DESIGN.md`
- `bukeer-studio/app/globals.css`

### Step 2: Registry Scope

Create a Bukeer v0/shadcn registry with these items:

- `bukeer-signature-theme`
- `bukeer-signature-tokens-css`
- `bukeer-signature-components`
- `signature-planner-workbench`
- `signature-conversation-copilot`
- `signature-trace-approval`

### Step 3: Demo Blocks

Create or extend registry demos:

- `signature-planner-workbench`
- `signature-conversation-copilot`
- `signature-agent-trace-approval`
- `signature-itinerary-manifest`

### Step 4: v0 Usage

Use the registry or design system when creating chats. If using API, attach the design system when a `designSystemId` exists. If using the v0 UI manually, start from the registry "Open in v0" flow.

### Step 5: Acceptance Gate

Every generated screen must pass:

- `VISUAL_QA_RUBRIC_2026-05-18.md`
- no automatic rejection condition
- score >= 34 / 45
- no blank/tiny screenshot

## Notes

- Prompt-only generation remains useful for exploration.
- Registry-backed generation should become the preferred flow before any implementation spike.
- Do not copy generated code directly into production without design/engineering review.
- This registry is intentionally under `docs/design` until the team decides where production-ready Bukeer Admin Next components live.
