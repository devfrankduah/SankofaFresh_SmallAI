## Context
Implement specification sections 6, 8: [project specification](../../blob/main/docs/SankofaFresh_Project_Specification.md). This is planned work, not verified behavior.

## Ownership and priority
- Suggested owner: role A; named assignee not yet confirmed.
- Priority: P0
- Planning estimate: 1–2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `features`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/3

## Scope and implementation notes
- Implement app/features.py shared by training/runtime with exact ordered nine features, window boundaries (t-window,t], units, maturity codes and heat-degree-hours formula.
- Require measured six-hour history without invented pre-arrival values, 58/72 valid pairs in six hours and 10/12 in one hour; stop fresh scores after two missed scheduled readings.
- Handle unknown maturity, insufficient history, stale and outside_model_support, including 10..45 C and model bundle support ranges; null fresh score/probability on abstention.

## Acceptance criteria
- [ ] Future observations cannot alter earlier feature vectors or eligibility (AC03).
- [ ] Window edges, exact coverage cutoffs, two missed readings, unknown maturity and out-of-support values are tested (AC04/AC07).
- [ ] Latent quality, scenario ID and future conditions are never read by this module.

## Required evidence
- Hand-calculated feature fixture and boundary/leakage/eligibility tests.

## Team handoff
- Claim the issue with a named owner before editing. One owner per task; pair/reviewer roles are welcome.
- Use a short branch such as `codex/<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit and notify dependent owners in the PR. Attach commands/results or mark checks not run.
- Merge owner reviews integration and evidence. Do not close because code exists alone; required acceptance evidence must be present.
- Do not expand into real sensors, accounts, cloud inference, real SMS, payments or real-world accuracy claims.
