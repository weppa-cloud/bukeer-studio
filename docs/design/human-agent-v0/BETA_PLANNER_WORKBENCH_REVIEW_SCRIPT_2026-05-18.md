# Beta Partner Review Script: Planner Workbench

> Date: 2026-05-18
> Phase: 0.25
> Audience: beta partner agency owners, managers and senior travel planners.

## Objective

Validate whether the new Bukeer Planner Workbench feels useful, trustworthy and agency-specific before implementation starts.

This review is about workflow clarity and human-agent trust, not visual polish alone.

## Prototype To Use

Primary:

- `screenshots/08_signature_planner_workbench_v2.png`

Supporting:

- `screenshots/09_signature_conversation_copilot_v2.png`
- `screenshots/11_signature_trace_approval_v2.png`

## Session Format

Recommended length: 45 minutes.

1. Context: 5 minutes.
2. Silent screen review: 5 minutes.
3. Scenario walkthrough: 15 minutes.
4. Task questions: 15 minutes.
5. Wrap-up and scoring: 5 minutes.

## Scenario

You are managing a high-intent family trip to Cartagena. The customer wants hotel, transfers and activities. Bukeer has enough information to start planning, but some data is missing. The AI suggests supplier and itinerary changes, but sensitive steps require human review.

## Tasks

Ask the participant to explain:

1. What is the current trip status?
2. What data is missing?
3. What is the AI suggesting?
4. What is blocked and why?
5. What needs human approval?
6. Is margin healthy or risky?
7. What action would you take next?
8. Would you trust this screen during a real sales conversation?

## Signals To Capture

Positive signals:

- User can identify missing data without help.
- User understands AI proposal and risk.
- User knows what approval is required.
- User can find margin and supplier risk quickly.
- User says the screen resembles real travel-agency work.

Negative signals:

- User thinks the AI already executed a sensitive action.
- User cannot distinguish suggestion, draft, approval and blocked states.
- User misses missing-data blockers.
- User reads the screen as a generic dashboard.
- User needs external explanation to understand trace or approval.

## Scoring

Use 1-5 scale:

| Question | Score |
|---|---:|
| I understand what the AI is proposing. |  |
| I understand what still needs human approval. |  |
| I can find missing data and blockers quickly. |  |
| I can understand margin/supplier risk. |  |
| This feels built for travel agencies. |  |
| I would use this during real daily operation. |  |

Target:

- Average >= 4.0 to proceed.
- Any score <= 2 requires design revision.
- Any confusion around public send, payment, reservation or approval blocks implementation.

## Questions For Open Feedback

1. What feels immediately useful?
2. What feels confusing or risky?
3. What looks too generic?
4. What would your agents need on this screen every day?
5. What action would you never want AI to perform without approval?

## Decision After Review

- Proceed: strong comprehension and trust.
- Revise: visual direction works but a workflow/state is unclear.
- Reject: users cannot understand AI control, approval or travel-specific operation.
