## Context
Specification sections 6: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1.5 to 2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `synthetic_data`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/5
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/6

## Scope and implementation notes
- `data/gen_batches.py` and `data/generator_config.json` exactly as spec 6, every parameter carrying a `source` field (a citation or ASSUMPTION).
- Group batches into synthetic farms and split 60/20/20 by farm, never by row, plus a season-held-out stress set.
- Write a manifest with the seed and the counts per class and split.
- No "don't know" values in the training data.

## Acceptance criteria
- [ ] AC02 (data part): the same seed and config produce a byte-identical dataset.
- [ ] AC03: no farm appears in more than one split.
- [ ] Every parameter in `generator_config.json` has a `source` field.
- [ ] The dataset is labelled SYNTHETIC_DEMO and is never described as field data.

## Required evidence
- The manifest, the dataset hash from two runs with the same seed, and the leakage check output.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
