## Context
Specification sections 10 to 12: [docs/SankofaFresh_Spec_v2.md](https://github.com/devfrankduah/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1.5 to 2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `release`

## Dependencies
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/1
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/15
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/16
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/17
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/24

## Scope and implementation notes
- README: problem sentence, how to run and test offline, dataset table, data limits list (spec 10), tree paths, metrics, Responsible AI (spec 11), claims (spec 12) and licences.
- Claims review across the app, the README and the video.
- Submit using the format confirmed in #1, by the 08:30 ET checkpoint.

## Acceptance criteria
- [ ] AC12: SYNTHETIC_DEMO on every result, and no claims of field accuracy, food safety or income gains anywhere.
- [ ] AC13: a teammate regenerates data, retrains and runs the app from the README on a clean checkout.
- [ ] Every row in docs/ACCEPTANCE.md links its evidence or stays NOT VERIFIED as an explicit gap.

## Required evidence
- Clean-run log, the completed docs/ACCEPTANCE.md, the claims checklist and the submission confirmation.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
