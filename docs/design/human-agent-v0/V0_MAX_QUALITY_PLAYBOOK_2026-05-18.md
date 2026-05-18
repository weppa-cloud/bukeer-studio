# v0 Max Quality Playbook: Bukeer Human-Agent GUI

> Date: 2026-05-18
> Purpose: define how to get the highest-quality, least-generic UI outputs from v0 for Bukeer Admin Next.

## Executive Summary

The best way to use v0 for Bukeer is **not** one big prompt.

The best way is:

1. Build a Bukeer registry with tokens, components and blocks.
2. Start chats from registry items or files, not blank generation.
3. Use Projects so multiple chats share one app and context.
4. Iterate screen-by-screen with small, strict prompts.
5. Use Design Mode for localized visual refinements.
6. Score every output with Visual QA before accepting it.
7. Treat v0 output as concept/code draft, not architecture or production truth.

## What The v0 Docs Tell Us

### 1. Registries Are The Main Quality Lever

v0 docs describe registries as a way to pass components, blocks and design tokens to AI models. This is exactly what Bukeer needs.

Implication for Bukeer:

- Do not ask v0 to "make a modern travel dashboard" from scratch.
- Give v0 `TripRail`, `PlanningCanvas`, `TraceNode`, `ApprovalCommandBar`, `MarginGuard`, token roles and example blocks.
- Use the Bukeer registry as the starting point.

Current artifact:

- `public/r/bukeer-admin-next/registry.json`

### 2. shadcn/Tailwind Is The Right Target

v0 uses shadcn/ui as its default component system and supports Tailwind config, globals.css, CSS variables and custom components.

Implication for Bukeer:

- Keep output in React + Tailwind + shadcn/Radix.
- Encode Bukeer personality as tokens and components, not prose only.
- Avoid arbitrary CSS one-offs that will be hard to systematize.

### 3. Projects Should Hold Shared Context

v0 Projects are one app shared by many chats. Multiple chats can contribute to the same project and share deployment/files.

Implication for Bukeer:

- Create one v0 Project for `Bukeer Admin Next Human-Agent GUI`.
- Put Planner, Conversation, Trace and Manifest in the same project.
- Avoid isolated one-off chats that drift visually.

### 4. Use `chats.init()` For Existing Code/Registry, Not Only `chats.create()`

v0 API docs distinguish:

- `chats.init()`: starts from existing files, repo, zip or registry. Fast and files-first.
- `chats.create()`: starts from natural language and spends generation on initial code.

Implication for Bukeer:

- Prefer `chats.init({ type: "registry" })` or `type: "files"` once the registry is public.
- Use `chats.create()` only for exploratory prompts or when API limits block init.
- Lock config/token files when initializing from files.

### 5. Design Mode Is For Fine Visual Refinement

v0 Design Mode lets you select UI elements, make Tailwind-aware edits and give localized natural-language instructions.

Implication for Bukeer:

- Use generation for structure.
- Use Design Mode for precise polish:
  - tighten spacing
  - adjust hierarchy
  - make public/private boundaries clearer
  - improve contrast
  - refine command bars
  - make trace drawers more prominent

### 6. Screenshots Are Useful As Visual References

v0 supports screenshot-based workflows. Screenshots are best used with a focused brief, not alone.

Implication for Bukeer:

- Feed v0 the V2 screenshots plus a short critique.
- Ask it to preserve what works and fix named issues.
- Do not rely on screenshots without registry tokens; that causes generic imitation.

## Why Our First V3 Runs Were Unstable

We embedded too much context inline:

- full expert audit
- full Visual QA rubric
- full token docs
- full registry component JSON
- full block JSON
- full prompt

v0 accepted the chats, but some runs had unstable API state:

- no `latestVersion`
- `pending` with screenshot URL but no files
- transient `completed` that reverted to `pending`

Conclusion:

- Do not use giant prompts as a substitute for Projects/registry/files.
- Keep prompts compact.
- Move durable context into registry, Project files and design-system instructions.

## Recommended v0 Workflow For Bukeer

### Step 1: Publish Registry

Make this URL publicly reachable:

```txt
https://<studio-domain>/r/bukeer-admin-next/registry.json
```

Required registry items:

- `bukeer-signature-theme`
- `bukeer-signature-components`
- `signature-planner-workbench`
- `signature-conversation-copilot`
- `signature-trace-approval`
- `signature-itinerary-manifest`

### Step 2: Create One v0 Project

Project name:

```txt
Bukeer Admin Next Human-Agent GUI
```

Project context:

- Bukeer is a B2B travel agency operating system.
- Human controls sensitive actions.
- AI suggests, drafts, blocks and requests approval.
- No hidden chain-of-thought.
- Use Bukeer color roles.

### Step 3: Initialize From Registry

Preferred API approach:

```ts
const chat = await v0.chats.init({
  type: "registry",
  registry: {
    url: "https://<studio-domain>/r/bukeer-admin-next/signature-planner-workbench.json"
  },
  lockAllFiles: false,
  name: "Planner Workbench V3"
})
```

Then send a compact revision message.

### Step 4: Use One Prompt Per Screen

Do not ask for all screens at once.

Run separately:

1. Planner Workbench V3.
2. Conversation Copilot V3.
3. Trace Approval V3.
4. Itinerary Manifest V3.

### Step 5: Use Compact Prompt Structure

Every prompt should include only:

1. Starting block name.
2. One goal.
3. Required components.
4. Required states.
5. Three to five must-fix points.
6. Hard rejection rules.

Avoid:

- long research dumps
- full specs
- full audit
- multiple screens
- architecture requests

### Step 6: Iterate With Design Mode

After the first generation:

- Select the weak region.
- Use Design Mode with short instructions.
- Apply changes and review diff/version.

Good Design Mode instructions:

- "Make the trace drawer feel more inspectable and less like a generic side card."
- "Clarify that this reply is not public yet and requires human approval."
- "Make missing passenger data visually block proposal send without using a modal."
- "Reduce generic dashboard feel by strengthening TripRail and PlanningCanvas structure."

### Step 7: Evaluate Before Accepting

Accept only when:

- API status is stable `completed`.
- Files > 0.
- Screenshot is nonblank and > 10KB.
- Visual QA score >= 40/45 for primary screens.
- No automatic rejection condition.
- State model is clear.

## Prompt Template

```md
Start from registry item: <item-name>.

Goal:
<one sentence>

Preserve:
- <component 1>
- <component 2>
- <component 3>

Improve:
1. <specific issue>
2. <specific issue>
3. <specific issue>

Required states:
- suggested
- drafted
- blocked_missing_data
- blocked_policy
- approval_required
- approved
- executing
- executed
- rejected
- expired

Bukeer roles:
- purple = structure/location
- teal = live/realtime
- orange = human-in-the-loop
- red = blocked/destructive
- yellow = stale/warning
- green = approved/executed

Hard rejections:
- no generic SaaS dashboard
- no KPI-card-first layout
- no hidden chain-of-thought
- no unsafe enabled actions
- no landing page

Output:
React + Tailwind + shadcn/Radix, desktop-first, responsive notes.
```

## Bukeer-Specific Quality Rules

### What v0 Must See

v0 must see:

- Bukeer tokens.
- Bukeer component names.
- Bukeer travel scenarios.
- Bukeer state model.
- Examples of approved screens.

### What v0 Must Not Decide

v0 must not decide:

- architecture
- backend contracts
- permissions model
- Supabase/RLS logic
- real action execution
- production data model

### What Makes Output Unique

Uniqueness should come from:

- `TripRail` instead of generic sidebar.
- `PlanningCanvas` instead of card grid.
- `LiveFeedColumn` instead of generic activity feed.
- `ItineraryManifest` instead of timeline editor.
- `TraceNode` and `ToolInvocationDetail` instead of generic AI panel.
- `ApprovalCommandBar` instead of modal-only approval.
- Bukeer color roles used consistently.

## Next Session Recommendation

Do not launch more giant prompts.

Next session should:

1. Serve or deploy registry publicly.
2. Create a v0 Project.
3. Initialize Planner V3 from `signature-planner-workbench.json`.
4. Send one compact revision prompt.
5. Wait for stable completed output.
6. Use Design Mode for local refinements.
7. Capture screenshot.
8. Score with Visual QA.

If public registry is not available, use `chats.init({ type: "files" })` with only:

- `signature-components.tsx`
- one block file
- token CSS
- small README/instructions

This should produce more stable and higher-quality results than inline giant prompts.

## References

- v0 Design Systems: https://v0.app/docs/design-systems
- v0 Projects: https://v0.app/docs/projects
- v0 API Overview: https://v0.app/docs/api/platform/overview
- v0 Start from Existing Code: https://v0.app/docs/api/platform/guides/start-from-existing-code
- v0 Design Mode: https://v0.app/docs/design-mode
- v0 Screenshot workflow: https://vercel.com/docs/v0/workflows/screenshot
