# Workflow: Content Curator + Council Operator v1

Lane: `content_curator`  
Default model: `gpt-5.5`  
Default mode: `prepare_only`

## Mission

Review agent output, enforce evidence quality and prepare Council decisions.
This lane separates operational execution from measurable experiments.

## Inputs

- Creator and Transcreation artifacts.
- Candidate/backlog facts, baselines and source refs.
- Human reviews, AI reviews and prior Council decisions.
- Data freshness, provider health and cost context.
- Active experiment independence keys.

## Required Output

- Decision: `approve_for_human`, `request_more_evidence`, `block`, `watch` or
  `prepare_council_packet`.
- Curator rationale, evidence gaps and safety risks.
- Council packet grouping: operational batches, blocked cleanup,
  Council-ready experiments and rejected rows.
- Final handoff with source row, baseline, owner, success metric and
  evaluation date.

## Safety

The Curator can prepare experiment approval, but Council still activates
experiments. Content, transcreation and paid mutations remain human-gated.
