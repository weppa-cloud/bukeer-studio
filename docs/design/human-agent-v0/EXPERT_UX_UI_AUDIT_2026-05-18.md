# Expert UX/UI Audit: v0 Human-Agent Screens

> Date: 2026-05-18
> Scope: v0 initial batch, Signature V2 batch, Bukeer registry pack and current Phase 0.25 artifacts.
> Role: senior product designer, UX strategist and interface systems designer.
> Decision: keep the direction, but do not implement yet. Move to Design Lock Code-First, registry-backed v0 retry and beta validation first.
> Revision: Figma can support review, but is no longer the canonical implementation gate.

## 1. Executive Verdict

The v0 work is directionally correct but not production-ready.

The initial batch proved the workflows. The Signature V2 batch finally began to create a recognizable Bukeer operating surface. The best outputs are:

1. `08_signature_planner_workbench_v2.png` as primary product direction.
2. `09_signature_conversation_copilot_v2.png` as messaging/extraction pattern.
3. `11_signature_trace_approval_v2.png` as governance/approval pattern.

The weakest current surface is:

1. `10_signature_itinerary_builder_v2.png`, because it is still too generic, too spacious and not enough like a travel operations document.

The biggest design risk is not usability. Most screens are usable. The biggest risk is **conventionality**: the product can still look like an AI-generated enterprise dashboard unless the team commits to a Bukeer-specific visual grammar, component vocabulary and travel operations model.

## 2. Research Basis

This audit uses these sources and patterns:

- OpenAI, practical agent design: agents need tools, guardrails, evals and human intervention when reliability is not yet proven. Source: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
- Anthropic, effective agents: successful agentic systems use simple composable patterns, clear tools and well documented workflows. Source: https://www.anthropic.com/engineering/building-effective-agents
- Google PAIR mental models: AI systems must communicate limits, failure modes and manual fallback; dead ends damage user trust. Source: https://pair.withgoogle.com/guidebook-v2/chapter/mental-models/
- Google PAIR feedback and control: AI products need editability, user control and explicit feedback mechanisms. Source: https://pair.withgoogle.com/guidebook-v2/chapters/feedback-controls/
- Material 3 / Google design research: expressive design must guide attention and support the core journey, not decorate the product. Source: https://design.google/library/expressive-material-design-google-research
- Material color roles and tokens: color must be role-based, tokenized and accessible. Source: https://developer.android.com/design/ui/wear/guides/styles/color/roles-tokens
- Figma design tokens: name tokens by role, not raw appearance; connect primitives to semantic tokens. Source: https://www.figma.com/resource-library/design-tokens/
- Linear design refresh: dense products should mute navigation, reduce visual competition and let the work surface lead. Source: https://linear.app/now/behind-the-latest-design-refresh
- v0 design systems: v0 needs registries, tokens and custom components to produce high-fidelity branded outputs. Source: https://v0.app/docs/design-systems
- AI-generated prototype study: GenAI UI prototypes can be functional but tend to reinforce conventional patterns and score weaker on originality. Source: https://arxiv.org/abs/2605.15124
- Agent experience heuristics: future interfaces must work for humans and agents through visibility, consistency, structured feedback and machine-readable patterns. Source: https://generativeaiandhci.github.io/papers/2025/genaichi2025_5.pdf

## 3. Audit Principles

The screen should pass these questions before implementation:

1. Can a travel planner understand the next action in under 10 seconds?
2. Can the user distinguish suggestion, draft, blocked, approval required and executed?
3. Can the user see why the AI made the suggestion without hidden chain-of-thought?
4. Can the user recover manually when AI is blocked or uncertain?
5. Does the screen feel like Bukeer from layout and behavior, not only logo and color?
6. Does the structure help future agents parse the workflow consistently?
7. Is the UI dense enough for daily agency operation without becoming an incident wall?

## 4. Screen Scores

Scale: 100 = implementation-ready after polish; 70-84 = strong but needs design work; 55-69 = useful exploration; below 55 = reject or rebuild.

| Screen | Score | Decision |
|---|---:|---|
| Initial Admin Shell | 61 | Exploration only |
| Initial Planner Workbench | 66 | Useful workflow reference, not visual direction |
| Initial Itinerary Builder | 58 | Rebuild around travel document model |
| Initial Manager Control Plane | 56 | Reframe; currently too much incident dashboard |
| Initial Trace & Approval | 72 | Keep governance logic, refine visual focus |
| Signature Planner Workbench V2 | 82 | Primary direction, revise before implementation |
| Signature Conversation Copilot V2 | 84 | Strong supporting pattern |
| Signature Itinerary Builder V2 | 68 | Secondary direction, revise heavily |
| Signature Trace Approval V2 | 81 | Strong governance pattern, add context |

## 5. Findings By Severity

### P0 - Must Fix Before Implementation

1. **Trace is still too shallow in Planner and Conversation.**
   - Evidence: Planner V2 shows trace affordances but not enough source/tool/permission detail.
   - Risk: users may trust AI suggestions without understanding data, confidence, permission or policy.
   - Fix: every AI suggestion needs a compact trace drawer with data used, source freshness, permission check, policy guardrail, risk and human decision.

2. **Approval semantics are not precise enough across screens.**
   - Evidence: states such as approval, pending, manager required, blocked and missing data are visually close.
   - Risk: a user can confuse "AI suggested" with "safe to send" or "approved".
   - Fix: create a strict approval state model: `suggested`, `drafted`, `blocked_missing_data`, `blocked_policy`, `approval_required`, `approved`, `executed`, `rejected`.

3. **Responsive behavior is unproven.**
   - Evidence: all accepted screens are desktop 1920x1080.
   - Risk: bottom command bars, right rails and dense panes can hide critical state on laptop/tablet.
   - Fix: require 1440, 1280, 834 and 390px responsive rules in the Design Lock Code-First before engineering.

4. **Do not expose hidden reasoning.**
   - Evidence: Trace screens use reasoning labels; this is directionally correct only if they are summaries.
   - Risk: product accidentally exposes hidden chain-of-thought or internal model traces.
   - Fix: label explicitly as "Reasoning summary", "Evidence", "Data used", "Tool result", "Policy result"; never show hidden chain-of-thought.

### P1 - High Priority Design Fixes

5. **Initial screens are too dark and too generic.**
   - Evidence: Admin Shell, initial Planner, Manager and Trace use a dark enterprise control-room style.
   - Risk: everyday travel planning feels like permanent incident response.
   - Fix: reserve dark mode for trace/governance focus; use mixed/light operational workbench for daily planning.

6. **Itinerary Builder still lacks product personality.**
   - Evidence: V2 is cleaner but reads as a generic timeline/document editor.
   - Risk: users will not feel Bukeer differentiation.
   - Fix: convert it into a travel manifest canvas with itinerary blocks, supplier evidence, margin state, passenger readiness and proposal readiness.

7. **Manager Control Plane over-indexes on alerts and metrics.**
   - Evidence: first row metric bands plus many incident cards compete for attention.
   - Risk: managers cannot distinguish daily operations from emergency states.
   - Fix: design queue-first management: approvals, SLA breaches, blocked AI, margin risk, then secondary metrics.

8. **Color roles are good in V2 but not yet systematic.**
   - Evidence: purple/teal/orange improved; some older screens use blue/green/red generic semantics.
   - Risk: color loses meaning quickly.
   - Fix: enforce Bukeer tokens in the design lock, registry and any optional Figma variables: purple = structure, teal = live, orange = HITL, red = blocked/destructive, yellow = warning.

### P2 - Polish And Readiness

9. **Typography is not distinctive enough yet.**
   - Evidence: many rows use similar small sizes and weights.
   - Fix: make Outfit visible for orientation and commands; Readex Pro for dense body; tabular numerals for prices, margins, SLA and confidence.

10. **Microinteractions are unspecified.**
   - Evidence: screenshots cannot prove live pulse, pending ring, row update flash or trace expansion.
   - Fix: specify motion states in the component contract and test with prototype.

11. **Agent-readable structure needs to be part of design.**
   - Evidence: current registry helps, but final design must preserve stable component names and states.
   - Fix: every major surface should map to component/data contracts: `TripRail`, `PlanningCanvas`, `TraceNode`, `ApprovalCommandBar`, `EntityExtractionPanel`, `MarginGuard`.

## 6. Screen-by-Screen Audit

### Initial Admin Shell

What works:

- Dense operations surface.
- AI context rail introduces permissions, read-only scope, approvals and tool invocations.
- Good proof that the admin can be agent-aware.

What fails:

- It looks like a generic dark SaaS dashboard.
- KPI cards dominate too early.
- Travel agency work is mostly in labels, not in structure.
- Many panels compete for attention.

Decision:

- Keep the AI context rail concept.
- Reject this as visual direction.
- Rebuild as an operational shell where navigation recedes and active travel work leads.

### Initial Planner Workbench

What works:

- Strong lead queue.
- Missing data and AI suggestions are explicit.
- Itinerary draft and suggested reply are in the same workflow.

What fails:

- Dark mode makes planning feel more technical than commercial/operational.
- Right rail has useful content but reads like generic AI assistant cards.
- It lacks a distinct Bukeer travel canvas.

Decision:

- Keep workflow sequencing.
- Replace visual model with Signature Planner V2.

### Initial Itinerary Builder

What works:

- Has itinerary rail, pricing/margin, flags, tabs, AI draft and missing data.
- Close to real operations.

What fails:

- Large empty center creates a weak work surface.
- UI language is standard form/editor.
- AI right rail feels like an add-on.

Decision:

- Keep data architecture.
- Rebuild around a travel manifest/document pattern.

### Initial Manager Control Plane

What works:

- Queue-first idea is correct.
- Shows agent rollout flags, audit timeline and team performance.

What fails:

- Too many urgent states at once.
- It feels like a security operations center, not a daily agency manager cockpit.
- Metrics and incidents have equal weight.

Decision:

- Keep queues and rollout controls.
- Redesign to separate daily management, exceptions and emergency review.

### Initial Trace & Approval

What works:

- Strong governance anatomy: timeline, invocation detail, approval decision, risk flags.
- Good separation of data, permissions, policy and impact.

What fails:

- Dense and technical.
- Duplicate command bars.
- Needs clearer relationship to the customer/trip context.

Decision:

- Keep as the basis for the trace pattern.
- Merge with Signature Trace V2 direction.

### Signature Planner Workbench V2

What works:

- Best Bukeer-specific layout: `TripRail`, planning canvas, `LiveFeedColumn`, `MarginGuard`, missing data, AI copilot and approval command bar.
- Feels like a travel planning operating surface, not just a dashboard.
- Color roles are meaningfully closer to the Bukeer system.

What still fails:

- Trace is not inspectable enough.
- Some metadata contrast is weak.
- Bottom command bar may obscure content on shorter viewports.
- The fixed right rail pattern may not survive laptop/tablet.

Decision:

- Primary direction.
- Move to Design Lock Code-First and beta review.

### Signature Conversation Copilot V2

What works:

- Strongest public/private messaging boundary.
- Entity extraction is useful and readable.
- Missing data and blocked itinerary draft communicate AI limits.
- Human review is visible and concrete.

What still fails:

- Dark UI may be too heavy for all-day conversation work.
- "Approve & Send" must be locked when required data or permissions block sending.
- Trace drill-down should be one click from every suggested reply.

Decision:

- Accept as supporting pattern.
- Use for CRM/conversation surfaces.

### Signature Itinerary Builder V2

What works:

- Cleaner than initial builder.
- Uses confirmed/pending/suggested states, supplier holds, margin target and approval action.
- Useful for transactional detail editing.

What still fails:

- Too much whitespace and too little Bukeer-specific structure.
- Supplier panel is hidden/collapsed, reducing operational value.
- AI and trace controls are less prominent than in Planner/Trace screens.

Decision:

- Do not use as primary direction.
- Rework as travel manifest canvas before implementation.

### Signature Trace Approval V2

What works:

- Best focused governance surface.
- Clear stages: context packet, reasoning summary, tool call, approval interruption, blocked override.
- Tool invocation detail includes rationale, data sources and risk.
- Bottom approval actions are concrete.

What still fails:

- Too sparse for some review contexts.
- Needs related trip/customer/entity summary.
- Needs keyboard/focus and responsive rules.

Decision:

- Accept as governance pattern.
- Integrate into Planner and Conversation as a drawer/side panel.

## 7. Design Direction To Adopt

The next Bukeer UI should be:

- Workbench-first, not dashboard-first.
- Travel-manifest-first, not form-first.
- Traceable-by-default, not AI-button-first.
- Queue-and-approval-aware, not metric-card-first.
- Branded through structure and behavior, not decoration.

The core visual grammar:

1. `TripRail` for active commercial opportunities.
2. `PlanningCanvas` for itinerary and quote assembly.
3. `LiveFeedColumn` for supplier, availability, price and agent events.
4. `EntityExtractionPanel` for conversations.
5. `TraceNode` and `ToolInvocationDetail` for agent review.
6. `ApprovalCommandBar` for sensitive human decisions.
7. `MarginGuard` for pricing and financial policy.

## 8. Next v0 Prompting Requirements

Every next v0 run must include:

- Use the Bukeer registry at `public/r/bukeer-admin-next/registry.json`.
- Start from one of the signature blocks, not blank prompt generation.
- Preserve component names and Bukeer token roles.
- Create 1440, 1280, 834 and 390px responsive states.
- Add trace drawers for every AI suggestion.
- Add disabled/blocked states for unsafe public send, payment, reservation and supplier hold actions.
- Avoid generic KPI-card-first dashboard layout.
- Avoid copying Linear, Notion, ChatGPT, Claude or Vercel directly.

## 9. Design Lock Code-First Requirements

The designer should produce implementable design decisions first. Optional Figma frames may support review, but the canonical output is tokens, component contracts and prototype-ready rules.

1. Token lock with primitive, semantic and component roles.
2. Component specs with all eight states: normal, loading, empty, error, no permission, AI suggestion, AI blocked, approval required.
3. Planner Workbench prototype readiness.
4. Conversation Copilot prototype readiness.
5. Trace Approval prototype readiness.
6. Itinerary Manifest prototype readiness.
7. Responsive rules for 1440, 1280, 834 and 390px.
8. Redline/handoff notes for Next when component contracts are insufficient.

## 10. Beta Validation Requirements

Before engineering builds `AdminShell`, run beta review on Planner Workbench.

Pass criteria:

- Average score >= 4.0/5.
- Users can identify missing data unaided.
- Users understand what AI proposes.
- Users understand what is blocked and why.
- Users understand what approval is required.
- No user believes AI already executed payment, reservation, supplier hold or public send.

## 11. Final Recommendation

Proceed, but with gates:

1. Use Signature Planner V2 as primary direction.
2. Use Conversation V2 and Trace V2 as supporting patterns.
3. Rebuild Itinerary Builder as a denser travel manifest.
4. Require Design Lock Code-First before Sprint 0.25C implementation.
5. Require registry-backed v0 retry before accepting new screens.
6. Require beta review before production build.

This is the right moment to be stricter. v0 has produced enough to see the product direction, but the next iteration must be designed, not generated.
