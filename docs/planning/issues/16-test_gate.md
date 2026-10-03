## Context
Specification sections 9: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `test_gate`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/11
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/9

## Scope and implementation notes
- Leakage, determinism, parity and size tests all run in CI: test_leakage, test_determinism, test_parity and test_size.

## Acceptance criteria
- [ ] AC02: the same seed gives an identical dataset and tree hash.
- [ ] AC03: no farm appears in more than one split.
- [ ] AC04: Python and JS predictions match on all held-out rows, including threshold boundaries.
- [ ] AC05: tree.json is under 250 KB and the total app size is reported.
- [ ] All four tests pass in CI.

## Required evidence
- A link to a passing CI run that names the four tests.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
