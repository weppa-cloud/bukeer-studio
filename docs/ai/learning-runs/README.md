# Learning runs

Learning runs are reviewed summaries of what a completed Bukeer Studio development DAG learned. They close the T0→T6 loop without turning raw Kanban trace or profile-private memories into global knowledge.

## Memory layers

1. Profile-private Holographic memory/facts — compact durable facts useful to one profile, such as a developer preflight pitfall. Keep private by default. Do not store task progress, raw logs, credentials, raw env values, tokens, cookies, or one-off TODOs.
2. Kanban operational trace — immutable task bodies, comments, parent/child edges, retries, PASS/FAIL/WARN handoffs, and structured metadata for the current DAG. Treat it as audit evidence, not as a curated knowledge base. T6 summarizes and links evidence instead of copying full logs.
3. GitHub/repo institutional knowledge — GitHub issues/PRs, commits, ADRs, specs, docs/ai/patterns, and learning-run docs. Use this layer for reviewed cross-profile knowledge. GitHub remains the implementation source of truth.

## T6 learning-curator contract

T6 runs after T5 and reads final branch/commit/PR/deploy outcome, all gate evidence, QA evidence, blocked/retry history, and follow-up state. It must return PASS/FAIL/WARN with evidence and metadata containing learning_run_path, patterns_created, skill_patches_proposed, facts_proposed, follow_up_issues, rejected_candidates, and redaction_checked.

## Redaction rules

Before writing a learning run, replace secrets with `[REDACTED]`, summarize logs, avoid raw PII, link task IDs/commits/PRs instead of copying sensitive payloads, and reject candidates whose value depends on secret values.

## Required index/frontmatter fields

Use docs/ai/learning-runs/index.schema.json for machine validation of learning-run index entries or frontmatter objects. Core fields include id, title, date, pipeline_id, github_issue, task_ids, branch, commits, pr_url, adr_refs, spec_refs, outcome, learning_candidates, applied_learning, follow_up_issues, and redaction_checked.

## Backfill policy

If a run predates T6 but produced reusable lessons, create a redacted manual learning-run document or a GitHub/Kanban follow-up containing enough context to backfill later.
