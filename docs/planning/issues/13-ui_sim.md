## Context
Implement specification sections 4, 7, 10–11, 15: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role C; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `ui_sim`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/12

## Scope and implementation notes
- Build operator-selected farmer view with exact initial message templates, batch ID/icon/status/time and no login.
- Add scenario/seed/create/start/pause/resume/step/speed controls separated from farmer view; show simulated values and warm-up explicitly.
- Render evidence from versioned evaluation export: model version/hash/mode, baseline, run/event counts, coverage, lead time, misses, false episodes and benchmark; absent metrics say Not evaluated.

## Acceptance criteria
- [ ] Unavailable view asks to check readings and retains unresolved warning context; acknowledgment is not a safety claim.
- [ ] Controls do not mutate clock through GET or client timers; prior run results remain accessible.
- [ ] No fabricated zero metrics, real-world probabilities or farm benefit claims; all assets local.

## Required evidence
- UI fixtures for evaluated/unevaluated/disconnected states and control walkthrough.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
