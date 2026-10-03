## Context
Specification sections 5.3, 7: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 0.5 to 1 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `bands_baseline`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2

## Scope and implementation notes
- Map class probabilities to green, amber and red.
- Apply the abstain cut (spec 5.3 rule 3, starting at 0.6 and tuned on validation only): a winning probability below the cut returns not_sure with reason_low_confidence.
- Implement the humidity-only baseline from spec 7 in Python for evaluation: red if rh14_mean is above 80 percent, otherwise green.
- No v1 hysteresis, cooldown or SQLite state.

## Acceptance criteria
- [ ] AC01: a winning probability below the abstain cut returns not_sure with a reason.
- [ ] A winning probability exactly at the cut returns the band, because the rule says below.
- [ ] The baseline returns green at rh14_mean exactly 80 and red just above it.

## Required evidence
- Table-driven unit tests covering the bands, the cut boundary and the baseline boundary.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
