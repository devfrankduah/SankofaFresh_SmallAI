## Context
Specification sections 5: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `contracts`

## Dependencies
- None. Either teammate can start.

## Scope and implementation notes
- Freeze spec 5.1 to 5.5 as `docs/contracts_v2.md`: app inputs, feature order and encoding, abstention rules, the tree.json schema and the message keys.
- Add JSON fixtures: three demo batches (clearly safe, rewetted in dry weeks, missing input), one out-of-range input, a two-node sample tree.json, and an English message file with every key.

## Acceptance criteria
- [ ] Feature order and encodings are identical in the contract, the fixtures and spec 5.2.
- [ ] Every message key from spec 5.5 is present in the English message file.
- [ ] The sample tree.json follows spec 5.4, including feature_ranges, classes, abstain_cut and sha256.
- [ ] The missing-input and out-of-range fixtures record not_sure as the expected result, with the reason key from spec 5.3.

## Required evidence
- `docs/contracts_v2.md` and the fixture files in the PR, with a check that feature names and message keys match spec 5.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
