## Context
Implement specification sections 3, 5–10: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role B; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `integration`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/5
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/6
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/7
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/8
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/11
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/13

## Scope and implementation notes
- Wire validate -> persist -> past features -> eligibility -> local inference -> policy -> atomic persistence -> public snapshot.
- Connect reading ingestion and simulator to the same validator; reject duplicate/non-monotonic observations and enforce single clock/worker.
- Implement export with config/provenance/history and explicit completed-run evaluation export gate for hidden outcomes.
- Exercise full registration/warm-up/replay/alert/ack/action flow with three batches.

## Acceptance criteria
- [ ] End-to-end run shows actual model-driven outcomes rather than scripted scenario alerts.
- [ ] Invalid/stale readings yield null fresh scores and preserve unresolved warnings.
- [ ] Concurrent polling cannot advance clock; failed steps leave no partial outputs.
- [ ] Active-run exports/public state cannot reveal hidden future outcomes; completed evaluation export is explicit.

## Required evidence
- API end-to-end tests, exported sample run and workflow recording.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
