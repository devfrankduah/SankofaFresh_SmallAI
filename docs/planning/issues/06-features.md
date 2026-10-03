## Context
Specification sections 5.2, 5.3: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `features`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/3

## Scope and implementation notes
- One encoding function in Python and one in JS that turn the spec 5.1 inputs and weather features into the nine-feature vector, in spec 5.2 order.
- Abstention rules 1 and 2 from spec 5.3: any "don't know" input, or any feature outside the training ranges stored in tree.json, returns not_sure with the reason.
- Both implementations run against the #2 fixtures.

## Acceptance criteria
- [ ] Python and JS produce identical vectors for every fixture.
- [ ] AC01 (inputs part): the missing-input and out-of-range fixtures return not_sure with reason_missing_input and reason_out_of_range.

## Required evidence
- Python and JS test output on the fixtures.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
