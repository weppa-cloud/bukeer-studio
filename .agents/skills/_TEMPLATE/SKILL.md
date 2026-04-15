---
name: "{skill-name}"
description: |
  {One-line description of what this skill does.}
  USE WHEN: {trigger conditions — file patterns, user intent, context signals}
  NOT FOR: {explicit exclusions with delegation targets}

  Examples:
  <example>
  Context: {when this skill should activate}
  user: "{sample user request}"
  assistant: "{what the skill does}"
  <commentary>{why this is the right skill}</commentary>
  </example>
  <example>
  Context: {when this skill should activate — different scenario}
  user: "{sample user request}"
  assistant: "{what the skill does}"
  <commentary>{why this is the right skill}</commentary>
  </example>
  <example>
  Context: {when this skill should NOT activate}
  user: "{sample user request}"
  assistant: "{delegation to correct skill}"
  <commentary>{why this is NOT this skill's job}</commentary>
  </example>
---

# {Skill Name}

## You Handle
- {responsibility 1}
- {responsibility 2}
- {responsibility 3}

## Delegate To
- `{other-skill-1}` — {what to delegate and when}
- `{other-skill-2}` — {what to delegate and when}

## Critical Rules
1. {Non-negotiable constraint}
2. {Non-negotiable constraint}

## Reference Files
- `{relative-path-to-reference.md}` — {what it contains}

## Tech Stack
- {relevant technology 1}
- {relevant technology 2}

## MCP Tools (if applicable)
- `{mcp-tool-name}` — {when to use}
