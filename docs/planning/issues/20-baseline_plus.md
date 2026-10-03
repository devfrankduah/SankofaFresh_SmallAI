## Context
Implement specification sections 11, 14: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P1
- Planning estimate: 0.5–1 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `baseline_plus`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/15

## Scope and implementation notes
- Add age/exposure baseline tuned on validation only; retain the frozen mandatory comparator and same held-out histories/timing.

## Acceptance criteria
- [ ] Report comparable metrics without test-driven retuning or superiority claims unsupported by evidence.

## Required evidence
- Config and reproducible extended comparison.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
