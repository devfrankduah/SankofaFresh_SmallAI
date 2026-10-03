## Context
Specification sections 5.4, 6: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `train_export`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/9

## Scope and implementation notes
- `model/train.py`: DecisionTreeClassifier(max_depth=4, class_weight="balanced") on the training farms.
- Tune the abstain cut on validation only; test farms are never used for tuning.
- Export `web/tree.json` per spec 5.4 with feature ranges, model_version and the sha256 of the canonical nodes array.

## Acceptance criteria
- [ ] AC05 (tree part): tree.json is under 250 KB.
- [ ] tree.json follows spec 5.4 and its sha256 matches the canonical nodes array.
- [ ] Retraining on the same data gives the same tree hash.

## Required evidence
- Training command and log, tree.json size and hash, and the chosen abstain cut with the validation numbers behind it.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
