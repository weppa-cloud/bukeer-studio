# Prompt 14: Registry Trace Approval V3

Use the Bukeer registry and revise Trace Approval V2.

Registry:

- `public/r/bukeer-admin-next/registry.json`
- Start from `signature-trace-approval`.

Reference docs:

- `EXPERT_UX_UI_AUDIT_2026-05-18.md`
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `VISUAL_QA_RUBRIC_2026-05-18.md`

## Goal

Create a focused governance screen for reviewing an AI tool invocation before execution.

## Must Improve

1. Add related trip/customer context without cluttering the trace.
2. Preserve strong trace timeline.
3. Make tool invocation detail clearer.
4. Make permission, policy, guardrail and risk checks visually distinct.
5. Add keyboard/focus states and responsive drawer behavior.
6. Ensure no hidden chain-of-thought is displayed.

## Required Layout

- Header with trace id, agent id, session id and state.
- Left/center trace timeline.
- Right tool invocation detail.
- Customer/trip context summary.
- Risk assessment.
- Permission result.
- Policy result.
- Data sources and freshness.
- Bottom `ApprovalCommandBar`.

## Required Actions

- Approve.
- Approve with edits.
- Reject.
- Escalate.
- Copy audit link.

## Required Copy

Use:

- "Reasoning summary"
- "Evidence"
- "Data used"
- "Tool result"
- "Permission result"
- "Policy result"

Avoid:

- "Chain-of-thought"
- "Model thoughts"
- "Internal reasoning"

## Output

Generate React + Tailwind + shadcn/Radix. Include responsive notes.
