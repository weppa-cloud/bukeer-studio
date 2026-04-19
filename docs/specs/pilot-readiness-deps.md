# Pilot Readiness — Dependency Gate

Source of truth for `tech-validator MODE:PLAN` Round 2 Dependency Gate tables in #213 + #214.

Last updated: 2026-04-19.

## Hard dependencies

| Consumer AC / child | Blocked by | Current status | Notes |
|---|---|---|---|
| #213 AC-C6 (`inLanguage`) | #208 (JSON-LD inLanguage threading) | Verify at Day-0 | R2 verification noted closed |
| #213 AC-C4, C5 | #209 (EN-URL segment) | Verify at Day-0 | R2 verification noted closed |
| #213 AC-X1 | #207 W5.1–W5.4 CI gate | Open | Primary mapping |
| #213 AC-X3 | #207 W5.7 | Open | |
| #214 W2 kickoff | W1 (#215) merged | Pending Stage 1 | |
| #214 W4 kickoff | W1 + W2 merged | Pending Stage 2 | |
| #214 W5 kickoff | W4 seed shipped | Pending Stage 4 start | `pilot-seed.ts` variant-factory |
| #214 W6 kickoff | W1 + W2 + W4 merged | Pending Stage 4 | |
| #214 W7-a | W1 merged | Pending Stage 1 | |
| #214 W7-b | W2 decision act/hotel | Pending Stage 2 | Variant B default |
| #214 W7-c | W2 + W3 + W4 + W5 + W6 merged | Pending Stage 5 | Screencasts post-UI freeze |
| #207 close | #214 closed + #213 signed-off | Pending | |

## Parallel gates

| Gate | Status | Blocks |
|---|---|---|
| W3 decision meeting (GO / DEFER) | **Pending** | Stage 2 W3 impl, W7 Flow 2 copy |
| ADR-024 finalized | Pending (skeleton shipped Stage 0) | W3 PR merge |
| ADR-025 finalized | Pending (skeleton shipped Stage 0) | W2 PR merge |
| #208 merge confirmation | **Verify Day-0** | W5 AC-W5-7 |
| #209 merge confirmation | **Verify Day-0** | W5 AC-W5-5/6 |

## Updates

This doc is maintained as EPIC #214 progresses. Each stage completion updates the current status column.
