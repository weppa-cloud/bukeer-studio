---
name: SEO Content Intelligence Work Item
about: Issue hijo vertical delegable a agentes
title: "[SEO-CI] <ID> - <Flow Name>"
labels: ["seo", "content-intelligence", "work-item"]
assignees: []
---

## Goal

<!-- Resultado de negocio/técnico de este issue -->

## In scope / Out of scope

### In scope

1. 
2. 

### Out of scope

1. 
2. 

## UI contract

1. 
2. 

## API contract

1. Endpoint(s):
2. Request schema:
3. Response schema:
4. Error contract:

## Data model changes

1. Tables:
2. Columns/status enums:
3. Migration notes:

## Rules/guardrails

1. 
2. 

## Acceptance criteria

1. 
2. 
3. 

## Test scenarios

1. Happy path:
2. Edge case:
3. Failure mode:

## Rollback/fallback

1. 
2. 

## Agent handoff

### Suggested assignment prompt

```text
Implement issue <ID> exactly as specified.
Use the following contract sections as non-negotiable: UI contract, API contract, Data model changes, Rules/guardrails, Acceptance criteria, Test scenarios.
Do not expand scope.
Return:
1) files changed
2) migrations executed
3) tests executed and results
4) residual risks
```

### Definition of done checklist

- [ ] UI contract implemented
- [ ] API contract implemented
- [ ] Data model changes migrated
- [ ] Acceptance criteria validated
- [ ] Test scenarios executed
- [ ] Docs updated

