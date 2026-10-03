## Context
Specification sections 7: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 1.5 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `evaluation`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/10
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/8
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/9

## Scope and implementation notes
- Run the tree and the humidity-only baseline on the same held-out farms.
- Report accuracy, macro F1, red recall, false reassurance rate (true red predicted green), abstain rate and coverage in evidence/metrics.json.
- Include the rewetted-in-dry-weeks case and the season-held-out stress set.
- Report weaker tree results honestly. All metrics are labelled as results on synthetic labels.

## Acceptance criteria
- [ ] AC10: tree and baseline are compared on the same held-out farms with every spec 7 metric.
- [ ] Test farms are not used for any tuning.
- [ ] Nothing presents the metrics as field accuracy.

## Required evidence
- evidence/metrics.json and the command that produced it.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
