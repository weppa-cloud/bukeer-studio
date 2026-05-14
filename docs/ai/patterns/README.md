# AI development patterns

Pattern docs are reviewed institutional knowledge for Bukeer Studio agents and humans. They are not raw task logs and they do not replace GitHub issues, PRs, specs, or ADRs as source of truth.

## When to create a pattern

Create or update a pattern when a completed run reveals reusable, cross-profile knowledge: a validated preflight sequence, session-pool pitfall, retry DAG invariant, feature-branch setup pattern, QA failure mode, or implementation pattern with evidence.

## Required content

Each pattern should include:

- source evidence: GitHub issue/PR, commit, Kanban task IDs, docs, or test reports;
- ADR refs and relevant specs;
- the reusable rule or workflow;
- examples that summarize evidence without raw logs;
- redaction status.

## Routing boundaries

- Use skill patches for narrow validated tool/profile operational fixes.
- Use profile-private facts only for stable facts useful to a specific profile.
- Use ADRs for decision-level boundaries.
- Use GitHub issues for owned follow-up work.
- Use prompt update proposals for profile behavior changes; do not silently apply them.
- Reject one-off noise and transient failures.
