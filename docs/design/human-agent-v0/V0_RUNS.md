# v0 Runs: Human-Agent UX Foundation

> Created: 2026-05-18 11:35:28 -05
> Last checked: 2026-05-18
> API check: authenticated with `V0_API_KEY`.
> Generation mode: private chats, `responseMode: async`, model `v0-pro`.

These chats were created from the prompt pack in this directory. v0 returned chat URLs successfully. The initial seven concepts completed and screenshots were captured locally. Signature V2 refinement runs are tracked separately below.

Do not commit API keys or private demo tokens. Use the v0 chat URLs below for review.

| Prompt | Chat ID | v0 URL | Last status |
|---|---|---|---|
| `01_human_agent_design_system.md` | `tfKEZdxRaqi` | https://v0.app/chat/tfKEZdxRaqi | `completed` |
| `02_admin_shell.md` | `kRd6RkcWgdr` | https://v0.app/chat/kRd6RkcWgdr | `completed` |
| `03_planner_workbench.md` | `czPjoozM1Gk` | https://v0.app/chat/czPjoozM1Gk | `completed` |
| `04_conversation_copilot.md` | `qTljckl8uxm` | https://v0.app/chat/qTljckl8uxm | `completed` |
| `05_itinerary_builder.md` | `gddtsGmexUH` | https://v0.app/chat/gddtsGmexUH | `completed` |
| `06_manager_control_plane.md` | `bLaePFYJ2Pg` | https://v0.app/chat/bLaePFYJ2Pg | `completed` |
| `07_agent_trace_approval_ui.md` | `mwzpEmylBso` | https://v0.app/chat/mwzpEmylBso | `completed` |

## Captured Screenshots

- `screenshots/01_human_agent_design_system.png`
- `screenshots/02_admin_shell.png`
- `screenshots/03_planner_workbench.png`
- `screenshots/04_conversation_copilot.png`
- `screenshots/05_itinerary_builder.png`
- `screenshots/06_manager_control_plane.png`
- `screenshots/07_agent_trace_approval_ui.png`

## Signature Refinement Runs

| Purpose | Chat ID | v0 URL | Last status | Notes |
|---|---|---|---|---|
| Visual critique and v0 prompting strategy | `rimAC5dEqU7` | https://v0.app/chat/rimAC5dEqU7 | `completed` | Written critique used to create `SIGNATURE_VISUAL_DIRECTION_2026-05-18.md` and `V0_SIGNATURE_PROMPTING_GUIDE_2026-05-18.md`. |
| Signature Planner Workbench V2 | `cc7noss4csd` | https://v0.app/chat/cc7noss4csd | `completed` | 14 files generated. Nonblank 1920x1080 screenshot captured. Accepted with revisions in `EVALUATION_SIGNATURE_V2_2026-05-18.md`. |
| Signature Conversation Copilot V2 | `tDB0KPFD5pe` | https://v0.app/chat/tDB0KPFD5pe | `completed` | 12 files generated. Nonblank 1920x1080 screenshot captured. Strong candidate for public/private messaging and extraction states. |
| Signature Itinerary Builder V2 | `msNhKamCHS8` | https://v0.app/chat/msNhKamCHS8 | `completed` | 13 files generated. Nonblank 1920x1080 screenshot captured. Useful transactional alternative, but needs stronger signature identity. |
| Signature Trace Approval V2 | `t7eb8nfKLBs` | https://v0.app/chat/t7eb8nfKLBs | `completed` | 8 files generated. Nonblank 1920x1080 screenshot captured. Strong candidate for trace and approval pattern. |

## Signature Captured Screenshots

- `screenshots/08_signature_planner_workbench_v2.png`
- `screenshots/09_signature_conversation_copilot_v2.png`
- `screenshots/10_signature_itinerary_builder_v2.png`
- `screenshots/11_signature_trace_approval_v2.png`

## Registry-Backed V3 Runs

These runs were created after Sprint 0.25B approval. Because the registry is not deployed publicly yet, the prompt embedded the relevant registry item JSON, shared components JSON, Bukeer tokens, state model, Visual QA rubric and expert audit context inline.

| Purpose | Chat ID | v0 URL | Last status | Notes |
|---|---|---|---|---|
| Planner Workbench V3 registry-backed | `qdIlZqX58GT` | https://v0.app/chat/qdIlZqX58GT | `no latestVersion` | Created from `12_registry_planner_workbench_v3.md` with full registry context embedded inline. Likely too heavy for stable generation. |
| Conversation Copilot V3 registry-backed | `eoh0T7Vbfba` | https://v0.app/chat/eoh0T7Vbfba | `pending` | Created from `13_registry_conversation_copilot_v3.md` with full registry context embedded inline. |
| Trace Approval V3 registry-backed | `gAwDcueMAXq` | https://v0.app/chat/gAwDcueMAXq | `pending` | Created from `14_registry_trace_approval_v3.md` with full registry context embedded inline. |
| Itinerary Manifest V3 | `b72JAQgps0k` | https://v0.app/chat/b72JAQgps0k | `no latestVersion` | Created from `15_itinerary_manifest_v3.md`; full prompt likely too heavy. |

### V3 Compact Retry Runs

The first V3 inline runs were too heavy for stable API status: Planner and Itinerary had no `latestVersion`, while Conversation and Trace stayed pending with transient states. Compact retries embed the target registry item and state model excerpt only.

| Purpose | Chat ID | v0 URL | Last status | Notes |
|---|---|---|---|---|
| Planner Workbench V3 compact registry retry | `rvro9K7Hs8u` | https://v0.app/chat/rvro9K7Hs8u | `pending` | Compact retry from `12_registry_planner_workbench_v3.md`; has screenshot URL but no files yet. |
| Conversation Copilot V3 compact registry retry | `upsPIZkiUmq` | https://v0.app/chat/upsPIZkiUmq | `pending` | Compact retry from `13_registry_conversation_copilot_v3.md`; has screenshot URL but no files yet. |
| Trace Approval V3 compact registry retry | `vbyZTfZKD47` | https://v0.app/chat/vbyZTfZKD47 | `pending` | Compact retry from `14_registry_trace_approval_v3.md`; has screenshot URL but no files yet. |
| Itinerary Manifest V3 compact registry retry | `icVVtmyn2V6` | https://v0.app/chat/icVVtmyn2V6 | `pending` | Compact retry from `15_itinerary_manifest_v3.md` using `signature-itinerary-manifest`; API briefly showed completed with 4 files, then reverted to pending. Do not evaluate yet. |

V3 acceptance rule: do not evaluate any V3 output until the API returns stable `completed`, nonzero files and a nonblank screenshot larger than 10 KB.

## Evaluation Checklist

- Human can understand what the AI proposes.
- Approval-required actions are obvious.
- Trace/source/confidence/risk are visible.
- Layout is dense enough for a real agency.
- No marketing/landing-page composition.
- No dangerous automation without human control.
- States are present: normal, loading, empty, error, no permission, AI suggestion, AI blocked, approval required.
- Planner Workbench can become the primary visual direction or show why it should not.
