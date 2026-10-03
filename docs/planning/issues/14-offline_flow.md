## Context
Specification sections 3: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1.5 to 2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `offline_flow`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/11
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/13
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/4
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/8
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/5

## Scope and implementation notes
- Wire the form, features, tree, bands, messages and records together.
- Run the three demo batches end to end on a real phone: clearly safe, rewetted in dry weeks, and missing input.
- This is the 19:00 ET team checkpoint.

## Acceptance criteria
- [ ] AC01: the missing-input batch returns not_sure with a reason in the full app.
- [ ] AC06 (first pass): after one online load, a check completes in airplane mode on a real phone.
- [ ] Saved results appear in the batch list after a reload.

## Required evidence
- Screen recording of the three batches on the phone, with the phone model and browser noted.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
