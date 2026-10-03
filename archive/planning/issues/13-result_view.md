## Context
Specification sections 4, 5.5: [docs/SankofaFresh_Spec_v2.md](https://github.com/devfrankduah/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1.5 to 2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `result_view`

## Dependencies
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/12
- Blocked by https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/19

## Scope and implementation notes
- Render the band with icon and text, up to two reasons from the decision path, one action, a Play audio button when clips exist, and the SYNTHETIC_DEMO label.
- SMS draft labelled SIMULATED_NOT_SENT with a copy button. The app never sends it.
- Evidence screen reading evidence/metrics.json: model version, tree hash, file sizes, held-out metrics against the baseline and data sources. It shows "Not evaluated" when metrics are absent, never zero.

## Acceptance criteria
- [ ] AC09: every string on the result comes from the fixed message files; nothing is generated at runtime.
- [ ] AC12: SYNTHETIC_DEMO is visible on every result and on the evidence screen, with no claims of field accuracy, food safety or income gains.
- [ ] With metrics.json absent, the evidence screen shows "Not evaluated".
- [ ] Reasons describe what the tree used, not a proven cause.

## Required evidence
- Screenshots of each band, a not_sure result, the SMS draft, and the evidence screen with and without metrics.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
