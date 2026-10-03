## Context
Implement specification sections 11, 14: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
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

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
