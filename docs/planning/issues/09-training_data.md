## Context
Implement specification sections 8–9, 11: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `training_data`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/5
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/6

## Scope and implementation notes
- Generate reproducible independent runs and derive next-24-hour synthetic event labels from stored hidden trajectories, only for currently marketable forecast examples with complete future follow-up.
- Split runs approximately 60/20/20 before window creation; all batches in a run stay together. Record exact IDs/seeds/configuration, checksums and generation command.
- Use only shared observable features and eligible windows. Include an additional held-out-parameter stress dataset without choosing favorable runs.

## Acceptance criteria
- [ ] Run-ID intersections across splits are empty; no future/latent/scenario variables appear in feature inputs.
- [ ] Label edge cases exclude already-downgraded batches and censored forecast windows.
- [ ] Manifest gives independent run/event counts and reproducible data provenance; data remains SYNTHETIC_DEMO.

## Required evidence
- Dataset manifest, split/leakage/label tests and class/event counts per split.

## Implementation notes
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
