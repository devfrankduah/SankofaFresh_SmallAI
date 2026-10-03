## Context
Implement specification sections 3–7, 10: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role B; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `batch_api`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/4

## Scope and implementation notes
- Implement app/main.py batch registration/list/details, health, public state, action creation and idempotent acknowledgment routes using frozen contracts.
- Expose recent observed history, original assessment timestamps, alerts/actions and data status; escape text at rendering boundary.
- Record inspected/removed_from_storage/sale_planned/other actions with notes; actions do not change history or calculate avoided losses.

## Acceptance criteria
- [ ] AC01 valid and invalid registration cases pass; unknown IDs and malformed input use agreed errors.
- [ ] Ack changes acknowledged_at only and repeated acknowledgment preserves it; it neither clears risk nor emits an alert.
- [ ] Public responses exclude latent trajectories and never present an old score as fresh.

## Required evidence
- API contract tests and action/ack idempotency tests.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
