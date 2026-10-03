## Context
Implement specification sections 10–11, 14: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P2
- Planning estimate: 2–3 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `interventions`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/18

## Scope and implementation notes
- Only after P0 release work: define reviewed explicit intervention-effect assumptions and counterfactual branches using identical underlying random disturbances.
- Keep action logging behavior intact unless branch behavior is explicitly selected.

## Acceptance criteria
- [ ] Comparator/intervention differ only by declared intervention assumptions.
- [ ] Results remain hypothetical; no claims of field effectiveness.

## Required evidence
- Paired-run reproducibility checks and documented assumptions.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
