## Context
Implement specification sections 11, 14: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role C; named assignee not yet confirmed.
- Priority: P2
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `economics`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/18

## Scope and implementation notes
- Only after P0 release work: show explicit saleable quantity, achieved price and intervention costs with net proceeds/comparator arithmetic.
- Label all inputs assumptions; do not derive kilograms saved from model accuracy.

## Acceptance criteria
- [ ] Specification illustrative $35 versus $40 scenario yields hypothetical $5 benefit with assumptions displayed.
- [ ] Never presented as measured farmer benefit.

## Required evidence
- Arithmetic checks and labeled screenshot.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
