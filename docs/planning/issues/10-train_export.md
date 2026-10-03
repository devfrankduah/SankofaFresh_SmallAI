## Context
Implement specification sections 8, 10–11, 13: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `train_export`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/9

## Scope and implementation notes
- Train DecisionTreeClassifier starting at max_depth=4; tune tree, AI thresholds and baseline threshold/duration on validation only.
- Freeze model/policies/config before test evaluation. Export node/feature indices, thresholds, children, leaf scores, contract, support ranges, version and hash.
- Record dependencies, commands and run IDs. Keep probability=null and call predictions synthetic risk scores; no farm-accuracy claims.

## Acceptance criteria
- [ ] Bundle is valid explicit JSON with integrity hash and documented support; no pickle/untrusted model loading required.
- [ ] Frozen artifacts and threshold provenance identify validation runs and leave test results unused for tuning.
- [ ] Training script reproduces the bundle from manifest/config; model size is recorded without claiming target success until measured.

## Required evidence
- Training command/log, validation report, frozen JSON bundle and provenance.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
