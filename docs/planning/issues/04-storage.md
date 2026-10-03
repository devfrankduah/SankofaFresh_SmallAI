## Context
Implement specification sections 5–7, 9–10: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role B; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `storage`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/3

## Scope and implementation notes
- Implement app/storage.py tables for entities, run config, stored trajectories, observation mask and policy state with foreign keys.
- Enforce reading uniqueness, alert deduplication and one-active-run constraints. Persist step outputs, predictions, alerts and policy state in one transaction.
- Preserve past runs on new-run creation; load saved trajectory/clock/state rather than rebuilding RNG streams on restart.

## Acceptance criteria
- [ ] Duplicate IDs and invalid references fail without partial writes.
- [ ] Injected failure during a step rolls back all outputs and run position.
- [ ] Reopen database restores config, trajectories, step index, alerts and counters; batch metadata stays immutable.

## Required evidence
- SQLite constraints, rollback and reopen tests.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
